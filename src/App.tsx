import { useState, useMemo } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth, canManageTasks, canDeleteTasks } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { Header, ViewKey } from '@/components/Header';
import { KanbanBoard } from '@/components/views/KanbanBoard';
import { TableView } from '@/components/views/TableView';
import { CalendarView } from '@/components/views/CalendarView';
import { BrandHubView } from '@/components/views/BrandHubView';
import { TeamAnalyticsView } from '@/components/views/TeamAnalyticsView';
import { EpisodeDrawer } from '@/components/EpisodeDrawer';
import { TaskModal } from '@/components/TaskModal';
import { BrandModal } from '@/components/BrandModal';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { EditProfileModal } from '@/components/EditProfileModal';
import { StudioSettingsModal } from '@/components/StudioSettingsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { Episode, Client, EpisodeStatus, TeamMember, NotificationType, Notification } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

function Workspace() {
  const { profile, user, isDemoUser } = useAuth();
  const canEdit = true;
  const canDelete = canDeleteTasks(profile?.role);
  const isOpsManager = profile?.role === 'Operations Manager';
  const currentUserId = user?.id ?? undefined;
  const [view, setView] = useState<ViewKey>((profile?.defaultView as ViewKey) ?? 'kanban');
  const [drawerEpisode, setDrawerEpisode] = useState<Episode | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [detailsEpisode, setDetailsEpisode] = useState<Episode | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const {
    lists, clients, episodes, bookings, teamMembers, comments, notifications,
    loading, error, usingFallback,
    updateEpisode, updateEpisodeStatus, createEpisode, deleteEpisode,
    createClient, updateClient, deleteClient,
    addComment, markNotificationRead, markAllNotificationsRead, createNotification,
  } = useWorkspaceData(currentUserId, isDemoUser);

  const pipelineListId = lists.find((l) => l.name === 'Episode Pipeline')?.id ?? null;
  const workspaceId = lists[0]?.workspace_id ?? null;
  const pipelineEpisodes = pipelineListId
    ? episodes.filter((e) => e.list_id === pipelineListId)
    : episodes;

  // Match current logged-in user to a team member for comment authorship
  const currentMemberId = useMemo(() => {
    if (!profile) return null;
    const byEmail = teamMembers.find((m) => m.email?.toLowerCase() === profile.email.toLowerCase());
    if (byEmail) return byEmail.id;
    const byName = teamMembers.find((m) => m.name.toLowerCase() === profile.name.toLowerCase());
    return byName?.id ?? null;
  }, [profile, teamMembers]);

  const actorName = profile?.name ?? 'Someone';

  const notifyAssignee = (episode: Episode, prev: Episode | null) => {
    const epNum = episode.episode_number ?? episode.title;
    // Writer assignee
    if (episode.writer_assignee_id && episode.writer_assignee_id !== prev?.writer_assignee_id) {
      const member = teamMembers.find((m) => m.id === episode.writer_assignee_id);
      if (member?.user_id && member.user_id !== currentUserId) {
        createNotification({
          userId: member.user_id,
          episodeId: episode.id,
          type: 'assigned_writer',
          message: `${actorName} assigned you as Writer on ${epNum}`,
          actorName,
        });
      }
    }
    // Editor assignee
    if (episode.editor_assignee_id && episode.editor_assignee_id !== prev?.editor_assignee_id) {
      const member = teamMembers.find((m) => m.id === episode.editor_assignee_id);
      if (member?.user_id && member.user_id !== currentUserId) {
        createNotification({
          userId: member.user_id,
          episodeId: episode.id,
          type: 'assigned_editor',
          message: `${actorName} assigned you as Video Editor on ${epNum}`,
          actorName,
        });
      }
    }
  };

  const handleUpdate = async (id: string, patch: Partial<Episode>) => {
    const prev = episodes.find((e) => e.id === id) ?? null;
    await updateEpisode(id, patch);
    setDrawerEpisode((p) => (p && p.id === id ? { ...p, ...patch } : p));
    if (prev) {
      const updated = { ...prev, ...patch };
      notifyAssignee(updated, prev);
      if (patch.status && patch.status !== prev.status) {
        // Notify both assignees of status change
        const epNum = updated.episode_number ?? updated.title;
        const msg = `${actorName} moved ${epNum} to ${patch.status.replace(/_/g, ' ')}`;
        [updated.writer_assignee_id, updated.editor_assignee_id].forEach((aid) => {
          if (!aid) return;
          const member = teamMembers.find((m) => m.id === aid);
          if (member?.user_id && member.user_id !== currentUserId) {
            createNotification({
              userId: member.user_id,
              episodeId: id,
              type: 'status_changed',
              message: msg,
              actorName,
            });
          }
        });
      }
    }
  };

  const handleStatusChange = async (id: string, status: EpisodeStatus, sortOrder?: number) => {
    await handleUpdate(id, { status, ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}) });
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    await deleteEpisode(id);
    setDrawerEpisode(null);
  };

  const handleCreateEpisode = async (payload: Partial<Episode>) => {
    const ep = await createEpisode(payload);
    if (ep) notifyAssignee(ep, null);
    return ep;
  };

  const handleAddComment = async (episodeId: string, authorId: string | null, body: string) => {
    const comment = await addComment(episodeId, authorId, body);
    return comment;
  };

  const handleMention = (mentionedMember: TeamMember, episodeId: string) => {
    if (mentionedMember.user_id && mentionedMember.user_id !== currentUserId) {
      const ep = episodes.find((e) => e.id === episodeId);
      const epNum = ep?.episode_number ?? ep?.title ?? 'a task';
      createNotification({
        userId: mentionedMember.user_id,
        episodeId,
        type: 'mentioned',
        message: `${actorName} tagged you in a comment on ${epNum}`,
        actorName,
      });
    }
  };

  const openAddTask = () => {
    setEditingEpisode(null);
    setTaskModalOpen(true);
  };

  const openEditTask = (episode: Episode) => {
    setEditingEpisode(episode);
    setTaskModalOpen(true);
    setDrawerEpisode(null);
    setDetailsEpisode(null);
  };

  const openAddBrand = () => {
    setEditingClient(null);
    setBrandModalOpen(true);
  };

  const openEditBrand = (client: Client) => {
    setEditingClient(client);
    setBrandModalOpen(true);
  };

  const handleDeleteBrand = async (client: Client) => {
    await deleteClient(client.id);
  };

  const openDetails = (episode: Episode) => {
    setDetailsEpisode(episode);
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.episode_id) return;
    const ep = episodes.find((e) => e.id === n.episode_id);
    if (ep) setDrawerEpisode(ep);
  };

  if (loading) {
    return (
      <div className="min-h-screen tf-bg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin tf-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen tf-bg flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-sm font-semibold tf-text mb-1">Couldn't load workspace</h2>
          <p className="text-xs tf-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tf-bg tf-text flex flex-col">
      <Header
        view={view}
        onViewChange={setView}
        canAddTask={canDelete}
        onAddTask={openAddTask}
        notifications={notifications}
        onMarkNotificationRead={markNotificationRead}
        onMarkAllNotificationsRead={markAllNotificationsRead}
        showAnalytics={isOpsManager}
        onNotificationClick={handleNotificationClick}
        onEditProfile={() => setProfileModalOpen(true)}
        onStudioSettings={() => setSettingsModalOpen(true)}
      />
      {usingFallback && isDemoUser && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            Demo mode — showing sample workspace data. Changes won't be saved.
          </span>
        </div>
      )}
      <main className="flex-1 overflow-hidden">
        <div className={`mx-auto w-full h-full ${view === 'kanban' ? 'max-w-[100vw] px-0 sm:px-0 lg:px-0' : view === 'table' ? 'max-w-[90rem] px-4 sm:px-6 lg:px-8' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
          {view === 'kanban' && (
            <KanbanBoard
              episodes={pipelineEpisodes}
              clients={clients}
              teamMembers={teamMembers}
              canEdit={canEdit}
              onStatusChange={handleStatusChange}
              onEpisodeClick={setDrawerEpisode}
              onEditEpisode={openEditTask}
            />
          )}
          {view === 'table' && (
            <TableView
              episodes={pipelineEpisodes}
              clients={clients}
              teamMembers={teamMembers}
              canEdit={canEdit}
              onUpdate={handleUpdate}
              onEpisodeClick={setDrawerEpisode}
              onEditEpisode={openEditTask}
            />
          )}
          {view === 'calendar' && (
            <CalendarView
              episodes={pipelineEpisodes}
              bookings={bookings}
              clients={clients}
              teamMembers={teamMembers}
              onEpisodeClick={openDetails}
            />
          )}
          {view === 'brands' && (
            <BrandHubView
              clients={clients}
              episodes={episodes}
              canEdit={canEdit}
              canDelete={canDelete}
              onAddBrand={openAddBrand}
              onEditBrand={openEditBrand}
              onDeleteBrand={handleDeleteBrand}
            />
          )}
          {view === 'analytics' && isOpsManager && (
            <TeamAnalyticsView
              episodes={episodes}
              teamMembers={teamMembers}
              onEpisodeClick={setDrawerEpisode}
            />
          )}
        </div>
      </main>

      {/* Episode drawer */}
      <EpisodeDrawer
        episode={drawerEpisode}
        clients={clients}
        teamMembers={teamMembers}
        comments={comments}
        currentMemberId={currentMemberId}
        canEdit={canEdit}
        canDelete={canDelete}
        onClose={() => setDrawerEpisode(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAddComment={handleAddComment}
        onMention={handleMention}
      />

      {/* Task create/edit modal */}
      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        episode={editingEpisode}
        clients={clients}
        teamMembers={teamMembers}
        listId={pipelineListId}
        onCreate={handleCreateEpisode}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        canDelete={canDelete}
      />

      {/* Brand create/edit modal */}
      <BrandModal
        open={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        client={editingClient}
        workspaceId={workspaceId}
        onCreate={createClient}
        onUpdate={updateClient}
      />

      {/* Calendar task details modal */}
      <TaskDetailsModal
        open={!!detailsEpisode}
        onClose={() => setDetailsEpisode(null)}
        episode={detailsEpisode}
        clients={clients}
        teamMembers={teamMembers}
        comments={comments}
        currentMemberId={currentMemberId}
        canEdit={canEdit}
        onUpdateStatus={updateEpisodeStatus}
        onEdit={openEditTask}
        onAddComment={handleAddComment}
        onMention={handleMention}
      />

      <EditProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <StudioSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        episodes={episodes}
        clients={clients}
        teamMembers={teamMembers}
      />
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen tf-bg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin tf-muted" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  return <Workspace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppInner />
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
