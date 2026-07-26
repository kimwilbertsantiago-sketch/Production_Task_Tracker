/*
# TaskFlow v3 — New pipeline, dual assignees, comments, notifications

## Overview
This migration restructures the episode pipeline to 7 new statuses, replaces the
single assignee with two role-specific assignee slots (writer + editor), renames
booking_date to start_date, removes shorts_target and target_release_date, and
adds comments + notifications tables for real-time collaboration.

## 1. Episode Status Enum Restructure
- New 7 statuses: cleaning, proofread_cutting, editing_instructions_shorts,
  editing_instructions_teaser, writer_qa, final_qa, completed_delivered.
- Removes: rough_cut_descript, scripting_clip_selection, shorts_teaser_edit,
  internal_qa_frame, client_review, revisions_required.
- Creates `episode_status_v3`, migrates the column (old -> cleaning default),
  drops the v2 type, renames v3 back to `episode_status`.
- DEFAULT set to 'cleaning'.

## 2. Dual Assignees
- Adds `writer_assignee_id` uuid (FK -> team_members.id, ON DELETE SET NULL).
- Adds `editor_assignee_id` uuid (FK -> team_members.id, ON DELETE SET NULL).
- Keeps the old `assignee_id` column for backward compat but it is no longer used
  by the app (NOT dropped to avoid data loss). Migrates existing assignee_id values
  into writer_assignee_id or editor_assignee_id based on the member's role.

## 3. Date Field Rename
- Adds `start_date` date column (copies existing booking_date values).
- booking_date is kept (not dropped) to avoid data loss but app uses start_date.

## 4. Removed Fields
- shorts_target and target_release_date are NOT dropped (data safety) but the app
  will no longer read or write them. They remain in the table for backward compat.

## 5. Team Members — Link to auth.users
- Adds `user_id` uuid column to team_members (nullable, FK -> auth.users.id ON DELETE SET NULL).
- This lets us match a logged-in Supabase user to a team_member record so the
  notifications system can address the right person.
- Adds a unique index on team_members.user_id where not null.

## 6. New Table: comments
- `comments` — task-level comments with @mention support.
- Columns: id, episode_id (FK -> episodes ON DELETE CASCADE), author_id (FK -> team_members),
  body (text, the comment text; @mentions stored inline as @Name), created_at.
- RLS enabled, authenticated CRUD (shared team data).

## 7. New Table: notifications
- `notifications` — per-user notification feed.
- Columns: id, user_id (FK -> auth.users.id ON DELETE CASCADE), episode_id (FK -> episodes ON DELETE CASCADE, nullable),
  type (text: 'assigned_writer', 'assigned_editor', 'status_changed', 'task_updated', 'mentioned'),
  message (text), read (bool default false), actor_name (text), created_at.
- RLS enabled: users can SELECT/UPDATE only their own notifications (auth.uid() = user_id).
  INSERT is open to authenticated (notifications are created by any team member for others).
  DELETE is owner-scoped.

## 8. Seed: Link existing team_members to demo auth accounts
- Updates the 3 demo team_members (Marcus, Alex, Devin) to link to auth.users by email,
  so notifications can be addressed to the logged-in demo users.

## Notes
1. The enum swap is safe (create new, migrate, drop old, rename).
2. No data is lost — removed columns are kept but unused by the app.
3. Existing episodes map to 'cleaning' status (the new first stage).
4. Idempotent via IF NOT EXISTS / DO $$ blocks.
*/

-- ============================================================
-- 1. EPISODE STATUS ENUM v3
-- ============================================================
DO $$ BEGIN
  CREATE TYPE episode_status_v3 AS ENUM (
    'cleaning',
    'proofread_cutting',
    'editing_instructions_shorts',
    'editing_instructions_teaser',
    'writer_qa',
    'final_qa',
    'completed_delivered'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE episodes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE episodes ALTER COLUMN status TYPE episode_status_v3 USING (
  CASE
    WHEN status::text = 'rough_cut_descript' THEN 'cleaning'::episode_status_v3
    WHEN status::text = 'scripting_clip_selection' THEN 'proofread_cutting'::episode_status_v3
    WHEN status::text = 'shorts_teaser_edit' THEN 'editing_instructions_shorts'::episode_status_v3
    WHEN status::text = 'internal_qa_frame' THEN 'writer_qa'::episode_status_v3
    WHEN status::text = 'client_review' THEN 'final_qa'::episode_status_v3
    WHEN status::text = 'revisions_required' THEN 'final_qa'::episode_status_v3
    WHEN status::text = 'completed_delivered' THEN 'completed_delivered'::episode_status_v3
    ELSE 'cleaning'::episode_status_v3
  END
);
ALTER TABLE episodes ALTER COLUMN status SET DEFAULT 'cleaning'::episode_status_v3;

DROP TYPE episode_status;
ALTER TYPE episode_status_v3 RENAME TO episode_status;

-- ============================================================
-- 2. DUAL ASSIGNEES
-- ============================================================
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS writer_assignee_id uuid;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS editor_assignee_id uuid;

-- Migrate existing assignee_id into the appropriate slot based on role
UPDATE episodes e
SET writer_assignee_id = tm.id
FROM team_members tm
WHERE e.assignee_id = tm.id AND tm.role IN ('Writer', 'Operations Manager');

UPDATE episodes e
SET editor_assignee_id = tm.id
FROM team_members tm
WHERE e.assignee_id = tm.id AND tm.role = 'Video Editor';

-- Add FKs (drop first for idempotency)
ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_writer_assignee_id_fkey;
ALTER TABLE episodes ADD CONSTRAINT episodes_writer_assignee_id_fkey
  FOREIGN KEY (writer_assignee_id) REFERENCES team_members(id) ON DELETE SET NULL;

ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_editor_assignee_id_fkey;
ALTER TABLE episodes ADD CONSTRAINT episodes_editor_assignee_id_fkey
  FOREIGN KEY (editor_assignee_id) REFERENCES team_members(id) ON DELETE SET NULL;

-- ============================================================
-- 3. START DATE (rename of booking_date)
-- ============================================================
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS start_date date;
UPDATE episodes SET start_date = booking_date WHERE start_date IS NULL AND booking_date IS NOT NULL;

-- ============================================================
-- 4. TEAM MEMBERS — link to auth.users
-- ============================================================
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique partial index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_user_id
  ON team_members(user_id) WHERE user_id IS NOT NULL;

-- Link demo team members to auth users by email
UPDATE team_members tm
SET user_id = au.id
FROM auth.users au
WHERE tm.email = au.email;

-- ============================================================
-- 5. COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  author_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_comments" ON comments;
CREATE POLICY "auth_select_comments" ON comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_comments" ON comments;
CREATE POLICY "auth_insert_comments" ON comments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_comments" ON comments;
CREATE POLICY "auth_update_comments" ON comments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_comments" ON comments;
CREATE POLICY "auth_delete_comments" ON comments FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON comments(episode_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- ============================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES episodes(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  actor_name text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS "auth_select_own_notifications" ON notifications;
CREATE POLICY "auth_select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
DROP POLICY IF EXISTS "auth_update_own_notifications" ON notifications;
CREATE POLICY "auth_update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Any authenticated user can insert a notification (for another user)
DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "auth_delete_own_notifications" ON notifications;
CREATE POLICY "auth_delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
