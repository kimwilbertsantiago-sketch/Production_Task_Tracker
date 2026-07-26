import { useState } from 'react';
import { Episode, Client, EpisodeStatus, TeamMember, WORKFLOW_STATUSES, STATUS_MAP } from '@/lib/types';
import { Badge, Avatar } from '@/components/ui/Avatar';
import { Calendar, FolderTree, Link as LinkIcon, Pencil, PenTool, Video } from 'lucide-react';

interface KanbanBoardProps {
  episodes: Episode[];
  clients: Client[];
  teamMembers: TeamMember[];
  canEdit: boolean;
  onStatusChange: (id: string, status: EpisodeStatus, sortOrder?: number) => Promise<void>;
  onEpisodeClick: (episode: Episode) => void;
  onEditEpisode: (episode: Episode) => void;
}

export function KanbanBoard({ episodes, clients, teamMembers, canEdit, onStatusChange, onEpisodeClick, onEditEpisode }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<EpisodeStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: EpisodeStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== status) setDragOver(status);
  };

  const handleDrop = async (e: React.DragEvent, status: EpisodeStatus) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragId) return;
    const dragged = episodes.find((ep) => ep.id === dragId);
    if (dragged && dragged.status !== status) {
      const sameCol = episodes.filter((ep) => ep.status === status);
      const newOrder = sameCol.length;
      await onStatusChange(dragId, status, newOrder);
    }
    setDragId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOver(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto p-4 sm:p-6 h-full" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      {WORKFLOW_STATUSES.map((status, idx) => {
        const colEpisodes = episodes
          .filter((e) => e.status === status.key)
          .sort((a, b) => a.sort_order - b.sort_order);
        const isOver = dragOver === status.key;
        return (
          <div
            key={status.key}
            onDragOver={(e) => handleDragOver(e, status.key)}
            onDrop={(e) => handleDrop(e, status.key)}
            className={`flex flex-col w-[280px] shrink-0 rounded-xl border tf-border tf-card transition-colors ${isOver ? 'drag-over-column' : ''}`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-3 border-b tf-border">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono tf-muted">{String(idx + 1).padStart(2, '0')}</span>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                <span className="text-xs font-semibold tf-text truncate">{status.short}</span>
                <span className="text-[10px] tf-muted shrink-0">{status.owner}</span>
              </div>
              <span className="text-[11px] font-medium tf-muted bg-[var(--bg-subtle)] rounded-md px-1.5 py-0.5">
                {colEpisodes.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
              {colEpisodes.map((ep) => {
                const client = clients.find((c) => c.id === ep.client_id);
                const writerAssignee = teamMembers.find((m) => m.id === ep.writer_assignee_id);
                const editorAssignee = teamMembers.find((m) => m.id === ep.editor_assignee_id);
                return (
                  <div
                    key={ep.id}
                    draggable={canEdit}
                    onDragStart={(e) => handleDragStart(e, ep.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onEpisodeClick(ep)}
                    className={`group rounded-lg border tf-border p-3 cursor-pointer hover:border-blue-400 transition-all tf-bg ${dragId === ep.id ? 'dragging-card' : ''} ${!canEdit ? 'cursor-default' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-semibold tf-text leading-snug line-clamp-2">{ep.title}</h4>
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditEpisode(ep); }}
                          className="opacity-0 group-hover:opacity-100 tf-btn tf-btn-ghost p-1 -mt-1 -mr-1"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {ep.episode_number && <p className="text-[10px] tf-muted mb-2">{ep.episode_number}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {client && <Badge color={client.primary_hex ?? undefined}>{client.name}</Badge>}
                    </div>
                    {/* Assignees */}
                    {(writerAssignee || editorAssignee) && (
                      <div className="flex items-center gap-2 mb-2">
                        {writerAssignee && (
                          <div className="flex items-center gap-1" title={`Writer: ${writerAssignee.name}`}>
                            <PenTool className="h-3 w-3 tf-muted" />
                            <Avatar name={writerAssignee.name} color={writerAssignee.avatar_color} size="sm" />
                          </div>
                        )}
                        {editorAssignee && (
                          <div className="flex items-center gap-1" title={`Editor: ${editorAssignee.name}`}>
                            <Video className="h-3 w-3 tf-muted" />
                            <Avatar name={editorAssignee.name} color={editorAssignee.avatar_color} size="sm" />
                          </div>
                        )}
                      </div>
                    )}
                    {/* Link indicators */}
                    <div className="flex items-center gap-2.5 text-[10px] tf-muted">
                      {ep.google_drive_raw_link && <span title="Drive link" className="flex items-center gap-0.5"><LinkIcon className="h-3 w-3" /></span>}
                      {ep.nas_file_path && <span title="NAS path" className="flex items-center gap-0.5"><FolderTree className="h-3 w-3" /></span>}
                      {ep.frame_io_review_link && <span title="Frame.io link" className="flex items-center gap-0.5"><Video className="h-3 w-3" /></span>}
                    </div>
                    {/* Start date */}
                    {ep.start_date && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t tf-border text-[10px] tf-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(ep.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {colEpisodes.length === 0 && (
                <div className="text-center text-[11px] tf-muted py-6 border border-dashed tf-border rounded-lg">
                  {canEdit ? 'Drop here' : 'No tasks'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
