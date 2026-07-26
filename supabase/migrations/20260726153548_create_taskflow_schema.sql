/*
# TaskFlow Podcast Studio - Core Schema

## Overview
Creates the full data model for a video podcast production tracking workspace:
workspaces, lists, episodes (tasks), clients (brand hub), and bookings.

## New Tables
1. `workspaces` - top-level workspace container (single workspace "Podcast Studio Operations")
   - id, name, description, created_at
2. `lists` - pipeline lists within a workspace (Episode Pipeline, Client Brand Hub, Studio Bookings)
   - id, workspace_id (FK), name, color, sort_order, created_at
3. `clients` - client/brand records for the Brand Hub
   - id, workspace_id (FK), name, primary_hex, font_requirements, lower_third_template, logo_url, notes, created_at
4. `episodes` - the main task/episode records moving through the sequential workflow
   - id, list_id (FK to lists), client_id (FK to clients, nullable), title, episode_number, status (enum), assignee_id, google_drive_raw_link, nas_file_path, descript_project_link, frame_io_review_link, writer_notes_doc, shorts_target, booking_date, target_release_date, notes, sort_order, created_at, updated_at
5. `bookings` - studio booking slots
   - id, workspace_id (FK), client_id (FK, nullable), title, booking_date, start_time, end_time, status, notes, created_at

## Workflow Status Enum
`episode_status` enum with the 10 sequential statuses from Booked/Scheduled through Completed & Delivered.

## Security (RLS)
This app uses Supabase Auth. All tables are owner-scoped to the workspace, but for this
team-based production app the workspace data is intentionally shared among authenticated
team members. Therefore policies use `TO authenticated` with `USING (true)` for SELECT
(shared team data) and permissive INSERT/UPDATE/DELETE for authenticated users. This is
a team workspace, not per-user isolated data — all signed-in team members see all data.

## Notes
1. Workspaces are shared team spaces; any authenticated user can read/write all rows.
2. Episodes reference a list and optionally a client.
3. updated_at auto-maintained via trigger.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_workspaces" ON workspaces;
CREATE POLICY "auth_select_workspaces" ON workspaces FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_workspaces" ON workspaces;
CREATE POLICY "auth_insert_workspaces" ON workspaces FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_workspaces" ON workspaces;
CREATE POLICY "auth_update_workspaces" ON workspaces FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_workspaces" ON workspaces;
CREATE POLICY "auth_delete_workspaces" ON workspaces FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- LISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_lists" ON lists;
CREATE POLICY "auth_select_lists" ON lists FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_lists" ON lists;
CREATE POLICY "auth_insert_lists" ON lists FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_lists" ON lists;
CREATE POLICY "auth_update_lists" ON lists FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_lists" ON lists;
CREATE POLICY "auth_delete_lists" ON lists FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- EPISODE STATUS ENUM
-- ============================================================
DO $$ BEGIN
  CREATE TYPE episode_status AS ENUM (
    'booked_scheduled',
    'recorded_in_drive',
    'ingested_to_nas',
    'rough_cut_descript',
    'scripting_clip_selection',
    'shorts_teaser_edit',
    'internal_qa_frame',
    'client_review',
    'revisions_required',
    'completed_delivered'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- CLIENTS (Brand Hub)
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  primary_hex text,
  font_requirements text,
  lower_third_template text,
  logo_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_clients" ON clients;
CREATE POLICY "auth_select_clients" ON clients FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_clients" ON clients;
CREATE POLICY "auth_insert_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_clients" ON clients;
CREATE POLICY "auth_update_clients" ON clients FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_clients" ON clients;
CREATE POLICY "auth_delete_clients" ON clients FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- EPISODES (Tasks)
-- ============================================================
CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  episode_number text,
  status episode_status NOT NULL DEFAULT 'booked_scheduled',
  assignee_id uuid,
  google_drive_raw_link text,
  nas_file_path text,
  descript_project_link text,
  frame_io_review_link text,
  writer_notes_doc text,
  shorts_target int NOT NULL DEFAULT 5,
  booking_date date,
  target_release_date date,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_episodes" ON episodes;
CREATE POLICY "auth_select_episodes" ON episodes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_episodes" ON episodes;
CREATE POLICY "auth_insert_episodes" ON episodes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_episodes" ON episodes;
CREATE POLICY "auth_update_episodes" ON episodes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_episodes" ON episodes;
CREATE POLICY "auth_delete_episodes" ON episodes FOR DELETE
  TO authenticated USING (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_episodes_list_id ON episodes(list_id);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_client_id ON episodes(client_id);

-- ============================================================
-- BOOKINGS (Studio Bookings)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL,
  title text NOT NULL,
  booking_date date NOT NULL,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_bookings" ON bookings;
CREATE POLICY "auth_select_bookings" ON bookings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_bookings" ON bookings;
CREATE POLICY "auth_insert_bookings" ON bookings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_bookings" ON bookings;
CREATE POLICY "auth_update_bookings" ON bookings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_bookings" ON bookings;
CREATE POLICY "auth_delete_bookings" ON bookings FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- updated_at trigger for episodes
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS episodes_updated_at ON episodes;
CREATE TRIGGER episodes_updated_at BEFORE UPDATE ON episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
