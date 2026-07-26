import { Episode, Client, Booking, ListRow, TeamMember, BrandColor } from '@/lib/types';

const FALLBACK_COLORS: BrandColor[] = [
  { label: 'Primary', hex: '#3B82F6' },
  { label: 'Secondary', hex: '#93C5FD' },
  { label: 'Background', hex: '#0F172A' },
  { label: 'Accent', hex: '#F59E0B' },
];

const FALLBACK_TEAM: TeamMember[] = [
  { id: 'fb-tm-1', workspace_id: 'fb-ws', name: 'Marcus Cole', role: 'Operations Manager', email: 'marcus@taskflow.studio', avatar_color: '#6366F1', avatar_url: null, user_id: null, created_at: new Date().toISOString() },
  { id: 'fb-tm-2', workspace_id: 'fb-ws', name: 'Alex Rivera', role: 'Writer', email: 'alex@taskflow.studio', avatar_color: '#F59E0B', avatar_url: null, user_id: null, created_at: new Date().toISOString() },
  { id: 'fb-tm-3', workspace_id: 'fb-ws', name: 'Devin Park', role: 'Video Editor', email: 'devin@taskflow.studio', avatar_color: '#10B981', avatar_url: null, user_id: null, created_at: new Date().toISOString() },
];

const FALLBACK_CLIENTS: Client[] = [
  {
    id: 'fb-cl-1', workspace_id: 'fb-ws', name: 'The Growth Pod',
    primary_hex: '#6366F1', font_requirements: 'Inter (700 / 400), Montserrat for titles',
    lower_third_template: 'DaVinci: /Templates/GrowthPod_LowerThird.drp',
    logo_url: null,
    notes: 'Marketing-focused podcast. Brand color indigo.',
    colors: [
      { label: 'Primary', hex: '#6366F1' },
      { label: 'Secondary', hex: '#A5B4FC' },
      { label: 'Background', hex: '#0F172A' },
      { label: 'Accent', hex: '#F59E0B' },
    ],
    header_font: 'Montserrat', subtitle_font: 'Inter', body_font: 'Inter',
    asset_drive_path: '/Drive/GrowthPod/BrandAssets',
    template_path: 'DaVinci: /Templates/GrowthPod_LowerThird.drp',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fb-cl-2', workspace_id: 'fb-ws', name: 'TechTalk Daily',
    primary_hex: '#0EA5E9', font_requirements: 'SF Pro Display (600), IBM Plex Mono for code',
    lower_third_template: 'DaVinci: /Templates/TechTalk_LowerThird.drp',
    logo_url: null,
    notes: 'Tech interview show. Clean minimal lower-thirds.',
    colors: [
      { label: 'Primary', hex: '#0EA5E9' },
      { label: 'Secondary', hex: '#38BDF8' },
      { label: 'Background', hex: '#0C1322' },
      { label: 'Accent', hex: '#22D3EE' },
    ],
    header_font: 'SF Pro Display', subtitle_font: 'Inter', body_font: 'IBM Plex Mono',
    asset_drive_path: '/Drive/TechTalk/BrandAssets',
    template_path: 'DaVinci: /Templates/TechTalk_LowerThird.drp',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fb-cl-3', workspace_id: 'fb-ws', name: 'Creator Business Show',
    primary_hex: '#F97316', font_requirements: 'Satoshi (900 / 500), Inter for body',
    lower_third_template: 'DaVinci: /Templates/CreatorBiz_LowerThird.drp',
    logo_url: null,
    notes: 'Business/entrepreneurship show. Bold energetic lower-thirds.',
    colors: [
      { label: 'Primary', hex: '#F97316' },
      { label: 'Secondary', hex: '#FB923C' },
      { label: 'Background', hex: '#1A120B' },
      { label: 'Accent', hex: '#FACC15' },
    ],
    header_font: 'Satoshi', subtitle_font: 'Satoshi', body_font: 'Inter',
    asset_drive_path: '/Drive/CreatorBiz/BrandAssets',
    template_path: 'DaVinci: /Templates/CreatorBiz_LowerThird.drp',
    created_at: new Date().toISOString(),
  },
];

const FALLBACK_EPISODES: Episode[] = [
  {
    id: 'fb-ep-1', list_id: 'fb-list-1', client_id: 'fb-cl-1', client: FALLBACK_CLIENTS[0],
    title: 'Scaling From Zero — Lenny Rachitsky', episode_number: 'EP 042',
    status: 'cleaning', assignee_id: null,
    writer_assignee_id: 'fb-tm-2', editor_assignee_id: 'fb-tm-3',
    writer_assignee: FALLBACK_TEAM[1], editor_assignee: FALLBACK_TEAM[2],
    google_drive_raw_link: 'https://drive.google.com/drive/folders/growthpod-ep042-raw',
    nas_file_path: '/NAS/PodcastStudio/GrowthPod/EP042_ScalingFromZero',
    descript_project_link: null, frame_io_review_link: null, writer_notes_doc: null,
    shorts_target: 5, booking_date: null, start_date: '2026-08-03', target_release_date: null,
    notes: 'Guest: Lenny Rachitsky. 90 min recording block.',
    sort_order: 0, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'fb-ep-2', list_id: 'fb-list-1', client_id: 'fb-cl-2', client: FALLBACK_CLIENTS[1],
    title: 'The Future of LLMs — Andrej Karpathy', episode_number: 'EP 117',
    status: 'proofread_cutting', assignee_id: null,
    writer_assignee_id: 'fb-tm-2', editor_assignee_id: 'fb-tm-3',
    writer_assignee: FALLBACK_TEAM[1], editor_assignee: FALLBACK_TEAM[2],
    google_drive_raw_link: 'https://drive.google.com/drive/folders/techtalk-ep117-raw',
    nas_file_path: null, descript_project_link: null, frame_io_review_link: null, writer_notes_doc: null,
    shorts_target: 5, booking_date: null, start_date: '2026-07-29', target_release_date: null,
    notes: 'Raw footage uploaded to Drive.',
    sort_order: 1, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'fb-ep-3', list_id: 'fb-list-1', client_id: 'fb-cl-3', client: FALLBACK_CLIENTS[2],
    title: 'Building in Public — Pieter Levels', episode_number: 'EP 028',
    status: 'instructions_shorts_teaser', assignee_id: null,
    writer_assignee_id: 'fb-tm-2', editor_assignee_id: 'fb-tm-3',
    writer_assignee: FALLBACK_TEAM[1], editor_assignee: FALLBACK_TEAM[2],
    google_drive_raw_link: 'https://drive.google.com/drive/folders/creatorbiz-ep028-raw',
    nas_file_path: '/NAS/PodcastStudio/CreatorBiz/EP028_BuildingInPublic',
    descript_project_link: 'https://app.descript.com/project/creatorbiz-ep028',
    frame_io_review_link: null, writer_notes_doc: null,
    shorts_target: 7, booking_date: null, start_date: '2026-07-22', target_release_date: null,
    notes: 'Rough cut in progress.',
    sort_order: 2, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'fb-ep-4', list_id: 'fb-list-1', client_id: 'fb-cl-1', client: FALLBACK_CLIENTS[0],
    title: 'Hiring Your First PM — Shreyas Doshi', episode_number: 'EP 043',
    status: 'cleaning', assignee_id: null,
    writer_assignee_id: 'fb-tm-2', editor_assignee_id: null,
    writer_assignee: FALLBACK_TEAM[1], editor_assignee: null,
    google_drive_raw_link: 'https://drive.google.com/drive/folders/growthpod-ep043-raw',
    nas_file_path: '/NAS/PodcastStudio/GrowthPod/EP043_FirstPM',
    descript_project_link: 'https://app.descript.com/project/growthpod-ep043',
    frame_io_review_link: null,
    writer_notes_doc: 'https://docs.google.com/document/d/growthpod-ep043-writer-notes',
    shorts_target: 5, booking_date: null, start_date: '2026-07-15', target_release_date: null,
    notes: 'Writer selecting clips.',
    sort_order: 3, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'fb-ep-5', list_id: 'fb-list-1', client_id: 'fb-cl-2', client: FALLBACK_CLIENTS[1],
    title: 'Rust at Scale — Bryan Cantrill', episode_number: 'EP 116',
    status: 'writer_qa', assignee_id: null,
    writer_assignee_id: 'fb-tm-1', editor_assignee_id: 'fb-tm-3',
    writer_assignee: FALLBACK_TEAM[0], editor_assignee: FALLBACK_TEAM[2],
    google_drive_raw_link: 'https://drive.google.com/drive/folders/techtalk-ep116-raw',
    nas_file_path: '/NAS/PodcastStudio/TechTalk/EP116_RustAtScale',
    descript_project_link: 'https://app.descript.com/project/techtalk-ep116',
    frame_io_review_link: 'https://frame.io/reviews/techtalk-ep116-qa',
    writer_notes_doc: 'https://docs.google.com/document/d/techtalk-ep116-writer-notes',
    shorts_target: 6, booking_date: null, start_date: '2026-07-08', target_release_date: null,
    notes: 'Writer QA in progress.',
    sort_order: 4, created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

const FALLBACK_BOOKINGS: Booking[] = [
  { id: 'fb-bk-1', workspace_id: 'fb-ws', client_id: 'fb-cl-1', client: FALLBACK_CLIENTS[0], episode_id: 'fb-ep-1', title: 'Growth Pod EP042 — Lenny Rachitsky', booking_date: '2026-08-03', start_time: '10:00', end_time: '12:00', status: 'confirmed', notes: 'Studio A.', created_at: new Date().toISOString() },
  { id: 'fb-bk-2', workspace_id: 'fb-ws', client_id: 'fb-cl-2', client: FALLBACK_CLIENTS[1], episode_id: 'fb-ep-2', title: 'TechTalk EP117 — Andrej Karpathy', booking_date: '2026-07-29', start_time: '14:00', end_time: '16:00', status: 'confirmed', notes: 'Studio B.', created_at: new Date().toISOString() },
];

const FALLBACK_LISTS: ListRow[] = [
  { id: 'fb-list-1', workspace_id: 'fb-ws', name: 'Episode Pipeline', color: '#3B82F6', sort_order: 0, created_at: new Date().toISOString() },
  { id: 'fb-list-2', workspace_id: 'fb-ws', name: 'Client Brand Hub', color: '#10B981', sort_order: 1, created_at: new Date().toISOString() },
  { id: 'fb-list-3', workspace_id: 'fb-ws', name: 'Studio Bookings', color: '#F59E0B', sort_order: 2, created_at: new Date().toISOString() },
];

export const FALLBACK_DATA = {
  lists: FALLBACK_LISTS,
  clients: FALLBACK_CLIENTS,
  episodes: FALLBACK_EPISODES,
  bookings: FALLBACK_BOOKINGS,
  teamMembers: FALLBACK_TEAM,
};

export { FALLBACK_COLORS };
