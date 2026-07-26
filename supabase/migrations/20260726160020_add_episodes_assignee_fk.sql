/*
# Add foreign key: episodes.assignee_id -> team_members.id

## Overview
The frontend queries episodes with a nested join `assignee:team_members(*)`,
which requires a foreign key relationship between `episodes.assignee_id` and
`team_members.id`. Without it, Supabase/PostgREST cannot resolve the join and
the query errors out — causing "Failed to load workspace data".

## Changes
- Adds FK constraint `episodes_assignee_id_fkey` linking
  `episodes.assignee_id` -> `team_members.id` with `ON DELETE SET NULL`
  (deleting a team member unassigns their tasks rather than failing).
- Idempotent: guarded by a NOT EXISTS check.

## Notes
1. Existing rows with assignee_id values that exist in team_members remain valid.
2. The seed data assigned valid team_member IDs, so no rows are affected.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'episodes_assignee_id_fkey' AND table_name = 'episodes'
  ) THEN
    ALTER TABLE episodes
      ADD CONSTRAINT episodes_assignee_id_fkey
      FOREIGN KEY (assignee_id) REFERENCES team_members(id) ON DELETE SET NULL;
  END IF;
END $$;
