import { Episode, Client, Booking, ListRow, TeamMember, BrandColor } from '@/lib/types';

const FALLBACK_COLORS: BrandColor[] = [
  { label: 'Primary', hex: '#3B82F6' },
  { label: 'Secondary', hex: '#93C5FD' },
  { label: 'Background', hex: '#0F172A' },
  { label: 'Accent', hex: '#F59E0B' },
];

// Completely cleared sample data arrays
const FALLBACK_TEAM: TeamMember[] = [];
const FALLBACK_CLIENTS: Client[] = [];
const FALLBACK_EPISODES: Episode[] = [];
const FALLBACK_BOOKINGS: Booking[] = [];

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