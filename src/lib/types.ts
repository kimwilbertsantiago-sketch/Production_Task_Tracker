export type EpisodeStatus =
  | 'cleaning'
  | 'proofread_cutting'
  | 'instructions_shorts_teaser'
  | 'editing_shorts_teaser'
  | 'writer_qa'
  | 'final_qa'
  | 'completed_delivered';

export type UserRole = 'Operations Manager' | 'Writer' | 'Video Editor';

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ListRow {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface TeamMember {
  id: string;
  workspace_id: string;
  name: string;
  role: UserRole;
  email: string | null;
  avatar_color: string;
  avatar_url: string | null;
  user_id: string | null;
  created_at: string;
}

export interface BrandColor {
  label: string;
  hex: string;
}

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  primary_hex: string | null;
  font_requirements: string | null;
  lower_third_template: string | null;
  logo_url: string | null;
  notes: string | null;
  colors: BrandColor[] | null;
  header_font: string | null;
  subtitle_font: string | null;
  body_font: string | null;
  asset_drive_path: string | null;
  template_path: string | null;
  created_at: string;
}

export interface Episode {
  id: string;
  list_id: string;
  client_id: string | null;
  client?: Client | null;
  title: string;
  episode_number: string | null;
  status: EpisodeStatus;
  assignee_id: string | null;
  writer_assignee_id: string | null;
  editor_assignee_id: string | null;
  writer_assignee?: TeamMember | null;
  editor_assignee?: TeamMember | null;
  google_drive_raw_link: string | null;
  nas_file_path: string | null;
  descript_project_link: string | null;
  frame_io_review_link: string | null;
  writer_notes_doc: string | null;
  shorts_target: number;
  booking_date: string | null;
  start_date: string | null;
  target_release_date: string | null;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  workspace_id: string;
  client_id: string | null;
  client?: Client | null;
  episode_id: string | null;
  title: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  episode_id: string;
  author_id: string | null;
  author?: TeamMember | null;
  body: string;
  created_at: string;
}

export type NotificationType =
  | 'assigned_writer'
  | 'assigned_editor'
  | 'status_changed'
  | 'task_updated'
  | 'mentioned';

export interface Notification {
  id: string;
  user_id: string;
  episode_id: string | null;
  type: NotificationType;
  message: string;
  actor_name: string | null;
  read: boolean;
  created_at: string;
}

export interface WorkflowStatus {
  key: EpisodeStatus;
  label: string;
  short: string;
  owner: string;
  color: string;
}

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  { key: 'cleaning', label: 'Cleaning', short: 'Cleaning', owner: 'Editor', color: '#10B981' },
  { key: 'proofread_cutting', label: 'Proofread & Cutting', short: 'Proofread', owner: 'Writer', color: '#F59E0B' },
  { key: 'instructions_shorts_teaser', label: 'Instructions (Shorts & Teaser)', short: 'Instructions', owner: 'Writer', color: '#F97316' },
  { key: 'editing_shorts_teaser', label: 'Editing (Shorts & Teaser)', short: 'Editing', owner: 'Editor', color: '#FB923C' },
  { key: 'writer_qa', label: 'Writer QA', short: 'Writer QA', owner: 'Writer', color: '#EC4899' },
  { key: 'final_qa', label: 'Final QA', short: 'Final QA', owner: 'Ops Manager', color: '#EF4444' },
  { key: 'completed_delivered', label: 'Completed & Delivered', short: 'Delivered', owner: 'Ops Manager', color: '#22C55E' },
];

export const STATUS_MAP: Record<EpisodeStatus, WorkflowStatus> = WORKFLOW_STATUSES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s }),
  {} as Record<EpisodeStatus, WorkflowStatus>
);

export const ROLES: UserRole[] = ['Operations Manager', 'Writer', 'Video Editor'];

export const ROLE_COLORS: Record<UserRole, string> = {
  'Operations Manager': '#6366F1',
  'Writer': '#F59E0B',
  'Video Editor': '#10B981',
};

export interface RoleTheme {
  badge: string;
  bar: string;
  hex: string;
}

export const ROLE_THEMES: Record<UserRole, RoleTheme> = {
  'Operations Manager': {
    badge: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    bar: 'bg-indigo-500',
    hex: '#6366F1',
  },
  'Writer': {
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    bar: 'bg-amber-500',
    hex: '#F59E0B',
  },
  'Video Editor': {
    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    bar: 'bg-emerald-500',
    hex: '#10B981',
  },
};

export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  defaultView: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

export const DEMO_USERS: DemoUser[] = [
  { email: 'marcus@taskflow.studio', password: 'taskflow123', name: 'Marcus Cole', role: 'Operations Manager', defaultView: 'kanban', avatarColor: '#6366F1' },
  { email: 'alex@taskflow.studio', password: 'taskflow123', name: 'Alex Rivera', role: 'Writer', defaultView: 'kanban', avatarColor: '#F59E0B' },
  { email: 'devin@taskflow.studio', password: 'taskflow123', name: 'Devin Park', role: 'Video Editor', defaultView: 'table', avatarColor: '#10B981' },
];
