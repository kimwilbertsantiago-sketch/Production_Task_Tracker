import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Episode, Client, Booking, ListRow, EpisodeStatus, TeamMember, Comment, Notification, NotificationType } from '@/lib/types';
import { FALLBACK_DATA } from '@/lib/fallbackData';

interface WorkspaceData {
  lists: ListRow[];
  clients: Client[];
  episodes: Episode[];
  bookings: Booking[];
  teamMembers: TeamMember[];
  comments: Comment[];
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  refresh: () => void;
  refreshComments: (episodeId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updateEpisode: (id: string, patch: Partial<Episode>) => Promise<void>;
  updateEpisodeStatus: (id: string, status: EpisodeStatus, sortOrder?: number) => Promise<void>;
  createEpisode: (payload: Partial<Episode>) => Promise<Episode | null>;
  deleteEpisode: (id: string) => Promise<void>;
  createClient: (payload: Partial<Client>) => Promise<Client | null>;
  updateClient: (id: string, patch: Partial<Client>) => Promise<void>;
  addComment: (episodeId: string, authorId: string | null, body: string) => Promise<Comment | null>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  createNotification: (payload: { userId: string; episodeId?: string | null; type: NotificationType; message: string; actorName?: string | null }) => Promise<void>;
}

export function useWorkspaceData(currentUserId?: string): WorkspaceData {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listsRes, clientsRes, episodesRes, bookingsRes, membersRes, commentsRes] = await Promise.all([
        supabase.from('lists').select('*').order('sort_order'),
        supabase.from('clients').select('*').order('name'),
        supabase.from('episodes').select('*, client:clients(*), writer_assignee:team_members!episodes_writer_assignee_id_fkey(*), editor_assignee:team_members!episodes_editor_assignee_id_fkey(*)').order('sort_order'),
        supabase.from('bookings').select('*, client:clients(*)').order('booking_date'),
        supabase.from('team_members').select('*').order('name'),
        supabase.from('comments').select('*, author:team_members(*)').order('created_at', { ascending: false }),
      ]);

      const firstError = listsRes.error || clientsRes.error || episodesRes.error || bookingsRes.error || membersRes.error || commentsRes.error;
      if (firstError) throw firstError;

      setLists((listsRes.data as ListRow[]) ?? []);
      setClients((clientsRes.data as Client[]) ?? []);
      setEpisodes((episodesRes.data as Episode[]) ?? []);
      setBookings((bookingsRes.data as Booking[]) ?? []);
      setTeamMembers((membersRes.data as TeamMember[]) ?? []);
      setComments((commentsRes.data as Comment[]) ?? []);
      setUsingFallback(false);
    } catch (err) {
      console.warn('[useWorkspaceData] Database fetch failed, using fallback seed data:', err);
      setLists(FALLBACK_DATA.lists);
      setClients(FALLBACK_DATA.clients);
      setEpisodes(FALLBACK_DATA.episodes);
      setBookings(FALLBACK_DATA.bookings);
      setTeamMembers(FALLBACK_DATA.teamMembers);
      setComments([]);
      setNotifications([]);
      setUsingFallback(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { data, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (notifError) throw notifError;
      setNotifications((data as Notification[]) ?? []);
    } catch (err) {
      console.warn('[useWorkspaceData] fetchNotifications failed:', err);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const refreshComments = useCallback(async (episodeId: string) => {
    if (usingFallback) return;
    try {
      const { data, error: commentsError } = await supabase
        .from('comments')
        .select('*, author:team_members(*)')
        .eq('episode_id', episodeId)
        .order('created_at', { ascending: false });
      if (commentsError) throw commentsError;
      setComments((prev) => {
        const others = prev.filter((c) => c.episode_id !== episodeId);
        return [...(data as Comment[] ?? []), ...others];
      });
    } catch (err) {
      console.warn('[useWorkspaceData] refreshComments failed:', err);
    }
  }, [usingFallback]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const updateEpisode = useCallback(async (id: string, patch: Partial<Episode>) => {
    setEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    if (usingFallback) return;
    try {
      const { error: updateError } = await supabase.from('episodes').update(patch).eq('id', id);
      if (updateError) throw updateError;
    } catch (err) {
      console.warn('[useWorkspaceData] updateEpisode failed:', err);
    }
  }, [usingFallback]);

  const updateEpisodeStatus = useCallback(async (id: string, status: EpisodeStatus, sortOrder?: number) => {
    const patch: Partial<Episode> = { status };
    if (sortOrder !== undefined) patch.sort_order = sortOrder;
    await updateEpisode(id, patch);
  }, [updateEpisode]);

  const createEpisode = useCallback(async (payload: Partial<Episode>): Promise<Episode | null> => {
    if (usingFallback) {
      const newEp: Episode = {
        id: `fb-ep-${Date.now()}`,
        list_id: payload.list_id ?? '',
        client_id: payload.client_id ?? null,
        client: null,
        title: payload.title ?? 'Untitled',
        episode_number: payload.episode_number ?? null,
        status: payload.status ?? 'cleaning',
        assignee_id: null,
        writer_assignee_id: payload.writer_assignee_id ?? null,
        editor_assignee_id: payload.editor_assignee_id ?? null,
        writer_assignee: null,
        editor_assignee: null,
        google_drive_raw_link: payload.google_drive_raw_link ?? null,
        nas_file_path: payload.nas_file_path ?? null,
        descript_project_link: payload.descript_project_link ?? null,
        frame_io_review_link: payload.frame_io_review_link ?? null,
        writer_notes_doc: payload.writer_notes_doc ?? null,
        shorts_target: 5,
        booking_date: null,
        start_date: payload.start_date ?? null,
        target_release_date: null,
        notes: payload.notes ?? null,
        sort_order: payload.sort_order ?? 0,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setEpisodes((prev) => [...prev, newEp]);
      return newEp;
    }
    try {
      const { data, error: createError } = await supabase
        .from('episodes')
        .insert(payload)
        .select('*, client:clients(*), writer_assignee:team_members!episodes_writer_assignee_id_fkey(*), editor_assignee:team_members!episodes_editor_assignee_id_fkey(*)')
        .single();
      if (createError) throw createError;
      if (data) setEpisodes((prev) => [...prev, data as Episode]);
      return data as Episode | null;
    } catch (err) {
      console.warn('[useWorkspaceData] createEpisode failed:', err);
      throw err;
    }
  }, [usingFallback]);

  const deleteEpisode = useCallback(async (id: string) => {
    setEpisodes((prev) => prev.filter((e) => e.id !== id));
    if (usingFallback) return;
    try {
      const { error: deleteError } = await supabase.from('episodes').delete().eq('id', id);
      if (deleteError) throw deleteError;
    } catch (err) {
      console.warn('[useWorkspaceData] deleteEpisode failed:', err);
    }
  }, [usingFallback]);

  const createClient = useCallback(async (payload: Partial<Client>): Promise<Client | null> => {
    if (usingFallback) {
      const newClient: Client = {
        id: `fb-cl-${Date.now()}`,
        workspace_id: payload.workspace_id ?? '',
        name: payload.name ?? 'Untitled',
        primary_hex: payload.primary_hex ?? '#64748B',
        font_requirements: null,
        lower_third_template: payload.template_path ?? null,
        logo_url: payload.logo_url ?? null,
        notes: payload.notes ?? null,
        colors: payload.colors ?? [],
        header_font: payload.header_font ?? null,
        subtitle_font: payload.subtitle_font ?? null,
        body_font: payload.body_font ?? null,
        asset_drive_path: payload.asset_drive_path ?? null,
        template_path: payload.template_path ?? null,
        created_at: new Date().toISOString(),
      };
      setClients((prev) => [...prev, newClient]);
      return newClient;
    }
    try {
      const { data, error: createError } = await supabase.from('clients').insert(payload).select('*').single();
      if (createError) throw createError;
      if (data) setClients((prev) => [...prev, data as Client]);
      return data as Client | null;
    } catch (err) {
      console.warn('[useWorkspaceData] createClient failed:', err);
      throw err;
    }
  }, [usingFallback]);

  const updateClient = useCallback(async (id: string, patch: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if (usingFallback) return;
    try {
      const { error: updateError } = await supabase.from('clients').update(patch).eq('id', id);
      if (updateError) throw updateError;
    } catch (err) {
      console.warn('[useWorkspaceData] updateClient failed:', err);
    }
  }, [usingFallback]);

  const addComment = useCallback(async (episodeId: string, authorId: string | null, body: string): Promise<Comment | null> => {
    if (usingFallback) {
      const newComment: Comment = {
        id: `fb-cm-${Date.now()}`,
        episode_id: episodeId,
        author_id: authorId,
        author: teamMembers.find((m) => m.id === authorId) ?? null,
        body,
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [newComment, ...prev]);
      return newComment;
    }
    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({ episode_id: episodeId, author_id: authorId, body })
        .select('*, author:team_members(*)')
        .single();
      if (insertError) throw insertError;
      if (data) {
        setComments((prev) => [data as Comment, ...prev]);
      }
      return data as Comment | null;
    } catch (err) {
      console.warn('[useWorkspaceData] addComment failed:', err);
      throw err;
    }
  }, [usingFallback, teamMembers]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (usingFallback) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } catch (err) {
      console.warn('[useWorkspaceData] markNotificationRead failed:', err);
    }
  }, [usingFallback]);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (usingFallback || !currentUserId) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', currentUserId).eq('read', false);
    } catch (err) {
      console.warn('[useWorkspaceData] markAllNotificationsRead failed:', err);
    }
  }, [usingFallback, currentUserId]);

  const createNotification = useCallback(async (payload: { userId: string; episodeId?: string | null; type: NotificationType; message: string; actorName?: string | null }) => {
    if (usingFallback) return;
    try {
      await supabase.from('notifications').insert({
        user_id: payload.userId,
        episode_id: payload.episodeId ?? null,
        type: payload.type,
        message: payload.message,
        actor_name: payload.actorName ?? null,
      });
      if (payload.userId === currentUserId) {
        await fetchNotifications();
      }
    } catch (err) {
      console.warn('[useWorkspaceData] createNotification failed:', err);
    }
  }, [usingFallback, currentUserId, fetchNotifications]);

  return {
    lists,
    clients,
    episodes,
    bookings,
    teamMembers,
    comments,
    notifications,
    loading,
    error,
    usingFallback,
    refresh: fetchAll,
    refreshComments,
    refreshNotifications,
    updateEpisode,
    updateEpisodeStatus,
    createEpisode,
    deleteEpisode,
    createClient,
    updateClient,
    addComment,
    markNotificationRead,
    markAllNotificationsRead,
    createNotification,
  };
}
