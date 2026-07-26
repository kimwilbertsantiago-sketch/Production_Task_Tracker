/*# TaskFlow v6 — Add avatar_url to profiles and team_members

Adds an `avatar_url` column to both `profiles` and `team_members` so users can
upload or link a profile picture. Nullable text column — no data loss.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS avatar_url text;
