/*
# TaskFlow Podcast Studio - Seed Sample Data

## Overview
Populates the workspace with realistic sample data:
1. One workspace: "Podcast Studio Operations"
2. Three lists: Episode Pipeline, Client Brand Hub, Studio Bookings
3. Three clients: The Growth Pod, TechTalk Daily, Creator Business Show
4. Five episodes across different pipeline stages with dummy links
5. Sample studio bookings

## Notes
1. Uses fixed UUIDs to avoid collisions on re-run.
2. Idempotent via ON CONFLICT (id) DO NOTHING.
*/

-- Workspace
INSERT INTO workspaces (id, name, description)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Podcast Studio Operations', 'Video podcast production tracking workspace')
ON CONFLICT (id) DO NOTHING;

-- Lists
INSERT INTO lists (id, workspace_id, name, color, sort_order)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Episode Pipeline', '#3B82F6', 0),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Client Brand Hub', '#10B981', 1),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Studio Bookings', '#F59E0B', 2)
ON CONFLICT (id) DO NOTHING;

-- Clients
INSERT INTO clients (id, workspace_id, name, primary_hex, font_requirements, lower_third_template, notes)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'The Growth Pod', '#6366F1', 'Inter (700 / 400), Montserrat for titles', 'DaVinci: /Templates/GrowthPod_LowerThird.drp', 'Marketing-focused podcast. Brand color indigo. Lower-thirds must use animated reveal.'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'TechTalk Daily', '#0EA5E9', 'SF Pro Display (600), IBM Plex Mono for code blocks', 'DaVinci: /Templates/TechTalk_LowerThird.drp', 'Tech interview show. Clean minimal lower-thirds. Mono font for any on-screen code.'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Creator Business Show', '#F97316', 'Satoshi (900 / 500), Inter for body', 'DaVinci: /Templates/CreatorBiz_LowerThird.drp', 'Business/entrepreneurship show. Bold energetic lower-thirds with orange accent.')
ON CONFLICT (id) DO NOTHING;

-- Episodes (5 across different stages)
INSERT INTO episodes (id, list_id, client_id, title, episode_number, status, google_drive_raw_link, nas_file_path, descript_project_link, frame_io_review_link, writer_notes_doc, shorts_target, booking_date, target_release_date, notes, sort_order)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Scaling From Zero — Lenny Rachitsky',
    'EP 042',
    'booked_scheduled'::episode_status,
    'https://drive.google.com/drive/folders/growthpod-ep042-raw',
    '/NAS/PodcastStudio/GrowthPod/EP042_ScalingFromZero',
    NULL,
    NULL,
    NULL,
    5,
    '2026-08-03',
    '2026-08-12',
    'Guest: Lenny Rachitsky. 90 min recording block. CSR to confirm guest release form.',
    0
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'The Future of LLMs — Andrej Karpathy',
    'EP 117',
    'recorded_in_drive'::episode_status,
    'https://drive.google.com/drive/folders/techtalk-ep117-raw',
    NULL,
    NULL,
    NULL,
    NULL,
    5,
    '2026-07-29',
    '2026-08-09',
    'Raw footage uploaded to Drive. Awaiting ingest to NAS.',
    1
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000003',
    'Building in Public — Pieter Levels',
    'EP 028',
    'rough_cut_descript'::episode_status,
    'https://drive.google.com/drive/folders/creatorbiz-ep028-raw',
    '/NAS/PodcastStudio/CreatorBiz/EP028_BuildingInPublic',
    'https://app.descript.com/project/creatorbiz-ep028',
    NULL,
    NULL,
    7,
    '2026-07-22',
    '2026-08-02',
    'Rough cut in progress. Descript transcript ready for writer review.',
    2
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Hiring Your First PM — Shreyas Doshi',
    'EP 043',
    'scripting_clip_selection'::episode_status,
    'https://drive.google.com/drive/folders/growthpod-ep043-raw',
    '/NAS/PodcastStudio/GrowthPod/EP043_FirstPM',
    'https://app.descript.com/project/growthpod-ep043',
    NULL,
    'https://docs.google.com/document/d/growthpod-ep043-writer-notes',
    5,
    '2026-07-15',
    '2026-07-30',
    'Writer selecting 5 shorts. Notes doc has timestamped candidate clips.',
    3
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'Rust at Scale — Bryan Cantrill',
    'EP 116',
    'internal_qa_frame'::episode_status,
    'https://drive.google.com/drive/folders/techtalk-ep116-raw',
    '/NAS/PodcastStudio/TechTalk/EP116_RustAtScale',
    'https://app.descript.com/project/techtalk-ep116',
    'https://frame.io/reviews/techtalk-ep116-qa',
    'https://docs.google.com/document/d/techtalk-ep116-writer-notes',
    6,
    '2026-07-08',
    '2026-07-22',
    'Internal QA in Frame.io. Ops Manager reviewing color + audio. 2 shorts pending fix.',
    4
  )
ON CONFLICT (id) DO NOTHING;

-- Bookings
INSERT INTO bookings (id, workspace_id, client_id, episode_id, title, booking_date, start_time, end_time, status, notes)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Growth Pod EP042 — Lenny Rachitsky', '2026-08-03', '10:00', '12:00', 'confirmed', 'Studio A. 4-camera setup.'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'TechTalk EP117 — Andrej Karpathy', '2026-07-29', '14:00', '16:00', 'confirmed', 'Studio B. Remote guest via Riverside.'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'Creator Biz EP028 — Pieter Levels', '2026-07-22', '11:00', '13:00', 'completed', 'Studio A. Completed.')
ON CONFLICT (id) DO NOTHING;
