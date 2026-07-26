/*
# TaskFlow v4 — Updated Workflow Statuses + Auto-Profile on Signup

## Summary
Updates the pipeline workflow from the previous 7-status sequence to a new
7-status sequence that combines the two separate Shorts/Teaser instruction
stages into one and inserts a new "Editing (Shorts & Teaser)" stage directly
after it. Also adds a database trigger that automatically creates a
`team_members` row whenever a new user registers via Supabase Auth, so newly
signed-up users immediately appear in the Writer/Video Editor assignee
dropdowns.

## 1. Status Enum Changes
- Creates `episode_status_v4` with the new 7 values in order:
  1. `cleaning`
  2. `proofread_cutting`
  3. `instructions_shorts_teaser`  (combines old `editing_instructions_shorts`
     and `editing_instructions_teaser`)
  4. `editing_shorts_teaser`       (new stage inserted after Instructions)
  5. `writer_qa`
  6. `final_qa`
  7. `completed_delivered`
- Migrates the `episodes.status` column from the current `episode_status` type
  to `episode_status_v4`, mapping any old instruction statuses
  (`editing_instructions_shorts`, `editing_instructions_teaser`) to the new
  unified `instructions_shorts_teaser`. All other statuses map by name.
- Drops the old `episode_status` type and renames `episode_status_v4` back to
  `episode_status`.
- Updates the column default to `cleaning`.

## 2. Auto-Profile on Signup
- Adds a `user_id` column to `team_members` (nullable, unique) linking a team
  member to their `auth.users` account.
- Creates a trigger function `handle_new_user_profile()` that inserts a
  `team_members` row using the new user's email, name, role, and avatar color
  from their signup metadata (`raw_user_meta_data`).
- Attaches the trigger to `auth.users` so it fires `AFTER INSERT` for every
  new signup. Newly registered accounts now appear in assignee dropdowns
  immediately with no manual step.
- RLS policies on `team_members` already allow authenticated CRUD, so no
  policy changes are needed.

## 3. Security
- No RLS policy changes. `team_members` remains readable/writable by all
  authenticated users (shared workspace model).
- The trigger runs with `SECURITY DEFINER` so it can insert into
  `team_members` even though the new user's own session is what triggered it.

## Important Notes
1. This migration is idempotent — re-running is safe.
2. Existing tasks with old instruction statuses are automatically remapped;
   no data is lost.
3. The trigger only fires for genuinely new signups (AFTER INSERT on
   auth.users), not for existing users.
*/

-- ============================================================
-- 1. NEW STATUS ENUM (v4)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE episode_status_v4 AS ENUM (
    'cleaning',
    'proofread_cutting',
    'instructions_shorts_teaser',
    'editing_shorts_teaser',
    'writer_qa',
    'final_qa',
    'completed_delivered'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Migrate the episodes.status column to the new enum, mapping old statuses.
ALTER TABLE episodes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE episodes ALTER COLUMN status TYPE episode_status_v4 USING (
  CASE
    WHEN status::text = 'editing_instructions_shorts' THEN 'instructions_shorts_teaser'::episode_status_v4
    WHEN status::text = 'editing_instructions_teaser' THEN 'instructions_shorts_teaser'::episode_status_v4
    WHEN status::text = 'cleaning' THEN 'cleaning'::episode_status_v4
    WHEN status::text = 'proofread_cutting' THEN 'proofread_cutting'::episode_status_v4
    WHEN status::text = 'writer_qa' THEN 'writer_qa'::episode_status_v4
    WHEN status::text = 'final_qa' THEN 'final_qa'::episode_status_v4
    WHEN status::text = 'completed_delivered' THEN 'completed_delivered'::episode_status_v4
    ELSE 'cleaning'::episode_status_v4
  END
);

ALTER TABLE episodes ALTER COLUMN status SET DEFAULT 'cleaning'::episode_status_v4;

-- Swap the type name back to the canonical name.
DROP TYPE IF EXISTS episode_status;
ALTER TYPE episode_status_v4 RENAME TO episode_status;

-- ============================================================
-- 2. AUTO-PROFILE ON SIGNUP
-- ============================================================
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;

-- Trigger function: create a team_members row for each new auth user.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id uuid;
  v_name text;
  v_role text;
  v_color text;
BEGIN
  v_name := NEW.raw_user_meta_data->>'name';
  v_role := NEW.raw_user_meta_data->>'role';
  v_color := NEW.raw_user_meta_data->>'avatarColor';

  IF v_name IS NULL THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;
  IF v_role IS NULL OR v_role NOT IN ('Operations Manager', 'Writer', 'Video Editor') THEN
    v_role := 'Operations Manager';
  END IF;
  IF v_color IS NULL THEN
    v_color := '#64748B';
  END IF;

  -- Use the first workspace (shared single-workspace app).
  SELECT id INTO ws_id FROM workspaces ORDER BY created_at LIMIT 1;
  IF ws_id IS NULL THEN
    -- Fallback: create a default workspace if none exists.
    INSERT INTO workspaces (id, name, description)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'TaskFlow Studio', 'Default workspace')
    ON CONFLICT (id) DO NOTHING;
    ws_id := 'a0000000-0000-0000-0000-000000000001';
  END IF;

  INSERT INTO team_members (workspace_id, name, role, email, avatar_color, user_id)
  VALUES (ws_id, v_name, v_role, NEW.email, v_color, NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
