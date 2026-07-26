/*
# TaskFlow v2 — Pipeline restructure, team members, brand hub enhancements

## Overview
This migration restructures the episode pipeline from 10 stages to 7, adds a
team_members table for assignee selection, and enhances the clients table with
richer brand fields (multiple colors, separate fonts, logo, asset paths).

## Changes

### 1. Episode Status Enum Restructure
- Removes 3 statuses: booked_scheduled, recorded_in_drive, ingested_to_nas.
- Keeps 7 statuses: rough_cut_descript, scripting_clip_selection, shorts_teaser_edit,
  internal_qa_frame, client_review, revisions_required, completed_delivered.
- Creates a new enum type `episode_status_v2` with the 7 values, migrates the
  `episodes.status` column to it (mapping removed statuses to rough_cut_descript),
  drops the old type, and renames the new one back to `episode_status`.
- Updates the column DEFAULT to 'rough_cut_descript'.
- No data is lost: existing episodes keep their status (or move to rough_cut_descript
  if they were in a removed stage).

### 2. New Table: team_members
- `team_members` — directory of studio team members for assignee selection.
- Columns: id, workspace_id (FK), name, role, email, avatar_color, created_at.
- role is one of: 'Operations Manager', 'Writer', 'Video Editor'.
- RLS enabled, authenticated CRUD (shared team data).

### 3. Clients Table Enhancements
- Adds columns: colors (jsonb), header_font (text), subtitle_font (text),
  body_font (text), asset_drive_path (text), template_path (text).
- Keeps existing primary_hex, font_requirements, lower_third_template for backward compat.
- `colors` stores an array of {label, hex} objects (e.g. Primary, Secondary, Background, Accent).

### 4. Episodes Table
- Adds `created_by` uuid column (tracks task creator, nullable, no FK to avoid auth coupling).

## Security
- RLS enabled on team_members (authenticated CRUD, shared team data).
- All existing policies preserved.

## Notes
1. The enum swap is safe: we create a new type, migrate with USING + CASE, drop old, rename.
2. Existing episodes in removed statuses map to 'rough_cut_descript'.
3. team_members is seeded with the 3 demo roles + a few extra members for assignee richness.
*/

-- ============================================================
-- 1. EPISODE STATUS ENUM RESTRUCTURE
-- ============================================================
DO $$ BEGIN
  CREATE TYPE episode_status_v2 AS ENUM (
    'rough_cut_descript',
    'scripting_clip_selection',
    'shorts_teaser_edit',
    'internal_qa_frame',
    'client_review',
    'revisions_required',
    'completed_delivered'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Migrate the column: map removed statuses to rough_cut_descript
ALTER TABLE episodes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE episodes ALTER COLUMN status TYPE episode_status_v2 USING (
  CASE
    WHEN status::text IN ('booked_scheduled', 'recorded_in_drive', 'ingested_to_nas')
      THEN 'rough_cut_descript'::episode_status_v2
    ELSE status::text::episode_status_v2
  END
);
ALTER TABLE episodes ALTER COLUMN status SET DEFAULT 'rough_cut_descript'::episode_status_v2;

-- Swap types
DROP TYPE episode_status;
ALTER TYPE episode_status_v2 RENAME TO episode_status;

-- ============================================================
-- 2. TEAM MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Operations Manager', 'Writer', 'Video Editor')),
  email text,
  avatar_color text NOT NULL DEFAULT '#64748B',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_team_members" ON team_members;
CREATE POLICY "auth_select_team_members" ON team_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_team_members" ON team_members;
CREATE POLICY "auth_insert_team_members" ON team_members FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_team_members" ON team_members;
CREATE POLICY "auth_update_team_members" ON team_members FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_team_members" ON team_members;
CREATE POLICY "auth_delete_team_members" ON team_members FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 3. CLIENTS TABLE ENHANCEMENTS
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS colors jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS header_font text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subtitle_font text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS body_font text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS asset_drive_path text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS template_path text;

-- ============================================================
-- 4. EPISODES TABLE — created_by
-- ============================================================
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS created_by uuid;

-- ============================================================
-- 5. SEED TEAM MEMBERS
-- ============================================================
INSERT INTO team_members (id, workspace_id, name, role, email, avatar_color)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Marcus Cole', 'Operations Manager', 'marcus@taskflow.studio', '#EC4899'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Alex Rivera', 'Writer', 'alex@taskflow.studio', '#F59E0B'),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Devin Park', 'Video Editor', 'devin@taskflow.studio', '#10B981'),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Jordan Lee', 'Writer', 'jordan@taskflow.studio', '#8B5CF6'),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Sam Chen', 'Video Editor', 'sam@taskflow.studio', '#0EA5E9')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. UPDATE EXISTING EPISODES — assign assignees
-- ============================================================
UPDATE episodes SET assignee_id = 'f0000000-0000-0000-0000-000000000003' WHERE id = 'e0000000-0000-0000-0000-000000000001' AND assignee_id IS NULL;
UPDATE episodes SET assignee_id = 'f0000000-0000-0000-0000-000000000003' WHERE id = 'e0000000-0000-0000-0000-000000000002' AND assignee_id IS NULL;
UPDATE episodes SET assignee_id = 'f0000000-0000-0000-0000-000000000003' WHERE id = 'e0000000-0000-0000-0000-000000000003' AND assignee_id IS NULL;
UPDATE episodes SET assignee_id = 'f0000000-0000-0000-0000-000000000002' WHERE id = 'e0000000-0000-0000-0000-000000000004' AND assignee_id IS NULL;
UPDATE episodes SET assignee_id = 'f0000000-0000-0000-0000-000000000001' WHERE id = 'e0000000-0000-0000-0000-000000000005' AND assignee_id IS NULL;

-- ============================================================
-- 7. UPDATE CLIENTS WITH NEW BRAND FIELDS
-- ============================================================
UPDATE clients SET
  colors = '[{"label":"Primary","hex":"#6366F1"},{"label":"Secondary","hex":"#A5B4FC"},{"label":"Background","hex":"#0F172A"},{"label":"Accent","hex":"#F59E0B"}]'::jsonb,
  header_font = 'Montserrat',
  subtitle_font = 'Inter',
  body_font = 'Inter',
  asset_drive_path = '/Drive/GrowthPod/BrandAssets',
  template_path = 'DaVinci: /Templates/GrowthPod_LowerThird.drp'
WHERE id = 'c0000000-0000-0000-0000-000000000001';

UPDATE clients SET
  colors = '[{"label":"Primary","hex":"#0EA5E9"},{"label":"Secondary","hex":"#38BDF8"},{"label":"Background","hex":"#0C1322"},{"label":"Accent","hex":"#22D3EE"}]'::jsonb,
  header_font = 'SF Pro Display',
  subtitle_font = 'Inter',
  body_font = 'IBM Plex Mono',
  asset_drive_path = '/Drive/TechTalk/BrandAssets',
  template_path = 'DaVinci: /Templates/TechTalk_LowerThird.drp'
WHERE id = 'c0000000-0000-0000-0000-000000000002';

UPDATE clients SET
  colors = '[{"label":"Primary","hex":"#F97316"},{"label":"Secondary","hex":"#FB923C"},{"label":"Background","hex":"#1A120B"},{"label":"Accent","hex":"#FACC15"}]'::jsonb,
  header_font = 'Satoshi',
  subtitle_font = 'Satoshi',
  body_font = 'Inter',
  asset_drive_path = '/Drive/CreatorBiz/BrandAssets',
  template_path = 'DaVinci: /Templates/CreatorBiz_LowerThird.drp'
WHERE id = 'c0000000-0000-0000-0000-000000000003';
