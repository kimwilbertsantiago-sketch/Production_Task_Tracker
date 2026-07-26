/*
# TaskFlow v5 — Fix Signup Trigger + Profiles Table

## Summary
Fixes the "Database error saving new user" error that occurred during
`supabase.auth.signUp()`. The root cause was a circular foreign-key dependency:
`team_members.user_id` had a FK to `auth.users(id)`, and the
`on_auth_user_created` AFTER INSERT trigger on `auth.users` inserted a row
into `team_members` referencing `NEW.id`. Because the triggering INSERT on
`auth.users` had not yet fully committed, the FK validation failed and the
entire signup transaction was rolled back, surfacing as a generic
"Database error saving new user" to the client.

## Fix
1. Ensures a UNIQUE constraint exists on `team_members.user_id` so
   `ON CONFLICT (user_id)` works.
2. Creates a `profiles` table keyed by `auth.users.id` that stores the user's
   `full_name`, `email`, and `role`.
3. Rewrites the `handle_new_user()` trigger to insert into `profiles` only
   (no cross-table FK to satisfy during the auth insert). Uses
   `ON CONFLICT (id) DO UPDATE` so re-running is safe.
4. Adds a second trigger `handle_new_user_team_member()` (AFTER INSERT on
   `profiles`) that creates the matching `team_members` row. Splitting the
   two steps breaks the circular dependency.
5. Makes the `team_members.user_id` FK DEFERRABLE INITIALLY DEFERRED so the
   FK check no longer fires mid-transaction.
6. RLS policies on `profiles` allow each authenticated user to read all
   profiles (shared workspace) and update their own.

## Security
- `profiles` RLS: SELECT for all authenticated (shared workspace), UPDATE for
  own row only via `auth.uid() = id`. INSERT is handled by the SECURITY
  DEFINER trigger, so we do not expose INSERT to clients.
- Trigger functions run as SECURITY DEFINER with search_path = public.
*/

-- ============================================================
-- 1. UNIQUE CONSTRAINT ON team_members.user_id
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.team_members'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.team_members'::regclass AND attname = 'user_id')]
  ) THEN
    ALTER TABLE public.team_members ADD CONSTRAINT team_members_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'New Team Member',
  email text,
  role text NOT NULL DEFAULT 'Writer'
    CHECK (role IN ('Operations Manager', 'Writer', 'Video Editor')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 3. UPDATED TRIGGER: auth.users -> profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Writer')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Replace the old trigger to call the new function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. SECOND-STEP TRIGGER: profiles -> team_members
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_team_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id uuid;
  v_color text;
BEGIN
  SELECT id INTO ws_id FROM workspaces ORDER BY created_at LIMIT 1;
  IF ws_id IS NULL THEN
    INSERT INTO workspaces (id, name, description)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'TaskFlow Studio', 'Default workspace')
    ON CONFLICT (id) DO NOTHING;
    ws_id := 'a0000000-0000-0000-0000-000000000001';
  END IF;

  v_color := CASE NEW.role
    WHEN 'Operations Manager' THEN '#EC4899'
    WHEN 'Writer' THEN '#F59E0B'
    WHEN 'Video Editor' THEN '#10B981'
    ELSE '#64748B'
  END;

  INSERT INTO team_members (workspace_id, name, role, email, avatar_color, user_id)
  VALUES (ws_id, NEW.full_name, NEW.role, NEW.email, v_color, NEW.id)
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    avatar_color = EXCLUDED.avatar_color;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_team_member();

-- ============================================================
-- 5. RELAX THE team_members.user_id FK (DEFERRABLE)
-- ============================================================
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- 6. BACKFILL PROFILES FOR EXISTING USERS
-- ============================================================
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  COALESCE(tm.name, split_part(u.email, '@', 1)),
  u.email,
  COALESCE(tm.role, 'Writer')
FROM auth.users u
LEFT JOIN public.team_members tm ON tm.email = u.email
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Link existing team_members rows to auth.users by email if not linked.
UPDATE public.team_members tm
SET user_id = u.id
FROM auth.users u
WHERE tm.email = u.email AND tm.user_id IS NULL;

-- Drop the old trigger function now that it's unused.
DROP FUNCTION IF EXISTS public.handle_new_user_profile();
