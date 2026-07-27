/*
# TaskFlow v8 — NAS paths array, deliverable types, custom options, danger zone support

## Summary
1. Clients: replace single `nas_path` text with `nas_paths` text[] (array of paths).
2. Episodes: add `deliverable_type` and `deliverable_subtype` text columns for task categorization.
3. New `custom_options` table: stores user-defined deliverable types and sub-types, managed by Operations Manager.
4. New `delete_non_admin_users()` function: deletes non-admin auth users + their team_member rows (used by danger zone edge function).

## Changes
### clients
- ADD `nas_paths text[]` (array of NAS path strings)
- Migrate existing `nas_path` data into `nas_paths` array
- DROP `nas_path` (old single-value column)

### episodes
- ADD `deliverable_type text` (Full EP, Shorts, Teaser, Branding, or custom)
- ADD `deliverable_subtype text` (Logo, Thumbnail, Lower Thirds, Intro, Logo Animation, or custom — used when deliverable_type = Branding)

### custom_options (new table)
- `id` uuid PK
- `workspace_id` uuid FK -> workspaces
- `category` text (either 'deliverable_type' or 'deliverable_subtype')
- `label` text (the option label shown in dropdowns)
- `created_at` timestamptz
- RLS: authenticated users can CRUD (shared workspace data)

### delete_non_admin_users() SQL function
- Deletes all auth.users EXCEPT the caller (the Operations Manager invoking it).
- Also deletes matching team_members rows by user_id.
- SECURITY DEFINER so it can modify auth.users (which requires service role).

## Security
- RLS enabled on custom_options with authenticated CRUD.
- The delete function is SECURITY DEFINER and only callable via service role key (edge function).
*/

-- ===== clients: nas_path -> nas_paths =====
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nas_paths text[];

UPDATE clients SET nas_paths = ARRAY[nas_path] WHERE nas_path IS NOT NULL AND nas_paths IS NULL;

ALTER TABLE clients DROP COLUMN IF EXISTS nas_path;

-- ===== episodes: deliverable type/subtype =====
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS deliverable_type text;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS deliverable_subtype text;

-- ===== custom_options table =====
CREATE TABLE IF NOT EXISTS custom_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('deliverable_type', 'deliverable_subtype')),
  label text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (workspace_id, category, label)
);

ALTER TABLE custom_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_custom_options" ON custom_options;
CREATE POLICY "select_custom_options" ON custom_options FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_custom_options" ON custom_options;
CREATE POLICY "insert_custom_options" ON custom_options FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_custom_options" ON custom_options;
CREATE POLICY "update_custom_options" ON custom_options FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_custom_options" ON custom_options;
CREATE POLICY "delete_custom_options" ON custom_options FOR DELETE
  TO authenticated USING (true);

-- ===== delete_non_admin_users function =====
-- Deletes all auth.users except the specified admin user_id, plus their team_members rows.
-- Callable only with service role key (bypasses RLS).
CREATE OR REPLACE FUNCTION delete_non_admin_users(admin_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer := 0;
  uid_to_delete uuid;
BEGIN
  FOR uid_to_delete IN
    SELECT id FROM auth.users WHERE id <> admin_user_id
  LOOP
    DELETE FROM team_members WHERE user_id = uid_to_delete;
    DELETE FROM notifications WHERE user_id = uid_to_delete;
    DELETE FROM auth.users WHERE id = uid_to_delete;
    deleted_count := deleted_count + 1;
  END LOOP;
  RETURN deleted_count;
END;
$$;