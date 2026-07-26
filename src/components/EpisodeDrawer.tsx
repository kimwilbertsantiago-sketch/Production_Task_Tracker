import { useEffect, useState } from 'react';
import { X, Link as LinkIcon, FolderTree, FileText, Clapperboard, Film, Copy, Check, Calendar, User, Trash2 } from 'lucide-react';
import { Episode, Client, TeamMember, Comment, EpisodeStatus, WORKFLOW_STATUSES, STATUS_MAP } from '@/lib/types';
import { Badge, Avatar } from '@/components/ui/Avatar';
import { CommentsSection } from '@/components/CommentsSection';

interface EpisodeDrawerProps {
  episode: Episode | null;
  clients: Client[];
  teamMembers: TeamMember[];
  comments: Comment[];
  currentMemberId: string | null;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Episode>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddComment: (episodeId: string, authorId: string | null, body: string) => Promise<Comment | null>;
  onMention: (mentionedMember: TeamMember, episodeId: string) => void;
}

function LinkField({ label, value, placeholder, onChange, icon: Icon, canEdit }: {
  label: string;
  value: string | null;
  placeholder: string;
  onChange: (v: string) => void;
  icon: typeof LinkIcon;
  canEdit: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      <input
        type="url"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={!canEdit}
        className="tf-input w-full disabled:opacity-70"
      />
      {value && (
        <a href={value} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline mt-1 inline-block">
          Open link →
        </a>
      )}
    </div>
  );
}

function CopyField({ label, value, placeholder, onChange, icon: Icon, canEdit }: {
  label: string;
  value: string | null;
  placeholder: string;
  onChange: (v: string) => void;
  icon: typeof LinkIcon;
  canEdit: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={!canEdit}
          className="tf-input flex-1 font-mono text-xs disabled:opacity-70"
        />
        <button onClick={copy} disabled={!value} className="tf-btn tf-btn-outline px-2.5 disabled:opacity-40" title="Copy to clipboard">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function EpisodeDrawer({
  episode, clients, teamMembers, comments, currentMemberId, canEdit, canDelete, onClose, onUpdate, onDelete, onAddComment, onMention,
}: EpisodeDrawerProps) {
  const [local, setLocal] = useState<Episode | null>(episode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(episode);
  }, [episode]);

  if (!local) return null;

  const patch = (p: Partial<Episode>) => setLocal((prev) => (prev ? { ...prev, ...p } : prev));

  const save = async (p: Partial<Episode>) => {
    if (!local) return;
    setSaving(true);
    try {
      await onUpdate(local.id, p);
    } finally {
      setSaving(false);
    }
  };

  const client = clients.find((c) => c.id === local.client_id) ?? null;
  const statusInfo = STATUS_MAP[local.status];
  const writerAssignee = teamMembers.find((m) => m.id === local.writer_assignee_id);
  const editorAssignee = teamMembers.find((m) => m.id === local.editor_assignee_id);

  const writerOptions = teamMembers.filter((m) => m.role === 'Writer' || m.role === 'Operations Manager');
  const editorOptions = teamMembers.filter((m) => m.role === 'Video Editor' || m.role === 'Operations Manager');

  const handleDelete = async () => {
    if (!canDelete || !local) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    await onDelete(local.id);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 tf-fade-in" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] tf-card border-l tf-border z-50 flex flex-col tf-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b tf-border">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge color={statusInfo.color}>{statusInfo.short}</Badge>
              {client && <Badge color={client.primary_hex ?? undefined}>{client.name}</Badge>}
            </div>
            <h2 className="text-base font-semibold tf-text">{local.title}</h2>
            {local.episode_number && <p className="text-xs tf-muted mt-0.5">{local.episode_number}</p>}
          </div>
          <button onClick={onClose} className="tf-btn tf-btn-ghost p-2 -mr-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
              <Clapperboard className="h-3.5 w-3.5" />
              Workflow Status
            </label>
            <select
              value={local.status}
              onChange={(e) => { patch({ status: e.target.value as EpisodeStatus }); save({ status: e.target.value as EpisodeStatus }); }}
              className="tf-input w-full"
            >
              {WORKFLOW_STATUSES.map((s, i) => (
                <option key={s.key} value={s.key}>
                  {i + 1}. {s.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] tf-muted mt-1">Owner: {statusInfo.owner}</p>
          </div>

          {/* Client — all roles can edit */}
          {canEdit && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
                <User className="h-3.5 w-3.5" />
                Client / Brand
              </label>
              <select
                value={local.client_id ?? ''}
                onChange={(e) => {
                  const v = e.target.value || null;
                  patch({ client_id: v });
                  save({ client_id: v });
                }}
                className="tf-input w-full"
              >
                <option value="">— No client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dual assignees — all roles can edit */}
          {canEdit ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
                  <User className="h-3.5 w-3.5" />
                  Writer Assigned
                </label>
                <select
                  value={local.writer_assignee_id ?? ''}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    patch({ writer_assignee_id: v });
                    save({ writer_assignee_id: v });
                  }}
                  className="tf-input w-full"
                >
                  <option value="">— Unassigned —</option>
                  {writerOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
                  <User className="h-3.5 w-3.5" />
                  Video Editor Assigned
                </label>
                <select
                  value={local.editor_assignee_id ?? ''}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    patch({ editor_assignee_id: v });
                    save({ editor_assignee_id: v });
                  }}
                  className="tf-input w-full"
                >
                  <option value="">— Unassigned —</option>
                  {editorOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
                  <User className="h-3.5 w-3.5" />
                  Writer Assigned
                </label>
                {writerAssignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar name={writerAssignee.name} color={writerAssignee.avatar_color} size="sm" />
                    <div>
                      <div className="text-xs tf-text">{writerAssignee.name}</div>
                      <div className="text-[10px] tf-muted">{writerAssignee.role}</div>
                    </div>
                  </div>
                ) : <span className="text-xs tf-muted">Unassigned</span>}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
                  <User className="h-3.5 w-3.5" />
                  Video Editor Assigned
                </label>
                {editorAssignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar name={editorAssignee.name} color={editorAssignee.avatar_color} size="sm" />
                    <div>
                      <div className="text-xs tf-text">{editorAssignee.name}</div>
                      <div className="text-[10px] tf-muted">{editorAssignee.role}</div>
                    </div>
                  </div>
                ) : <span className="text-xs tf-muted">Unassigned</span>}
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Start Date
            </label>
            <input
              type="date"
              value={local.start_date ?? ''}
              onChange={(e) => { patch({ start_date: e.target.value || null }); save({ start_date: e.target.value || null }); }}
              disabled={!canEdit}
              className="tf-input w-full disabled:opacity-70"
            />
          </div>

          {/* Production Links */}
          <div className="border-t tf-border pt-4">
            <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide mb-3">Production Links</h3>
            <div className="space-y-4">
              <LinkField label="Google Drive Raw Link" value={local.google_drive_raw_link} placeholder="https://drive.google.com/..." onChange={(v) => patch({ google_drive_raw_link: v })} icon={LinkIcon} canEdit={canEdit} />
              <button onClick={() => save({ google_drive_raw_link: local.google_drive_raw_link })} className="text-[11px] text-blue-500 hover:underline -mt-2">Save Drive link</button>

              <CopyField label="NAS File Path" value={local.nas_file_path} placeholder="/NAS/PodcastStudio/..." onChange={(v) => patch({ nas_file_path: v })} icon={FolderTree} canEdit={canEdit} />
              <button onClick={() => save({ nas_file_path: local.nas_file_path })} className="text-[11px] text-blue-500 hover:underline -mt-2">Save NAS path</button>

              <LinkField label="Descript Project Link" value={local.descript_project_link} placeholder="https://app.descript.com/..." onChange={(v) => patch({ descript_project_link: v })} icon={Clapperboard} canEdit={canEdit} />
              <button onClick={() => save({ descript_project_link: local.descript_project_link })} className="text-[11px] text-blue-500 hover:underline -mt-2">Save Descript link</button>

              <LinkField label="Frame.io Review Link" value={local.frame_io_review_link} placeholder="https://frame.io/..." onChange={(v) => patch({ frame_io_review_link: v })} icon={Film} canEdit={canEdit} />
              <button onClick={() => save({ frame_io_review_link: local.frame_io_review_link })} className="text-[11px] text-blue-500 hover:underline -mt-2">Save Frame.io link</button>

              <LinkField label="Writer Notes Doc" value={local.writer_notes_doc} placeholder="https://docs.google.com/..." onChange={(v) => patch({ writer_notes_doc: v })} icon={FileText} canEdit={canEdit} />
              <button onClick={() => save({ writer_notes_doc: local.writer_notes_doc })} className="text-[11px] text-blue-500 hover:underline -mt-2">Save Writer notes</button>
            </div>
          </div>

          {/* Comments */}
          <div className="border-t tf-border pt-4">
            <CommentsSection
              episodeId={local.id}
              comments={comments}
              teamMembers={teamMembers}
              currentMemberId={currentMemberId}
              canComment={true}
              onAddComment={onAddComment}
              onMention={onMention}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t tf-border flex items-center justify-between">
          <span className="text-[11px] tf-muted">
            {saving ? 'Saving...' : 'All changes saved automatically'}
          </span>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button onClick={handleDelete} className="tf-btn tf-btn-ghost text-red-500">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button onClick={onClose} className="tf-btn tf-btn-outline">Done</button>
          </div>
        </div>
      </aside>
    </>
  );
}
