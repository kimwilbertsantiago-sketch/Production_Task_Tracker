import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Episode, Client, TeamMember, Comment, EpisodeStatus, WORKFLOW_STATUSES, STATUS_MAP } from '@/lib/types';
import { ExternalLink, Copy, Check, FolderTree, Link as LinkIcon, Clapperboard, Film, FileText, Calendar, User, Pencil, Package, Save } from 'lucide-react';
import { Badge, Avatar } from '@/components/ui/Avatar';
import { CommentsSection } from '@/components/CommentsSection';

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  episode: Episode | null;
  clients: Client[];
  teamMembers: TeamMember[];
  comments: Comment[];
  currentMemberId: string | null;
  canEdit: boolean;
  onUpdateStatus: (id: string, status: EpisodeStatus) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Episode>) => Promise<void>;
  onEdit: (episode: Episode) => void;
  onAddComment: (episodeId: string, authorId: string | null, body: string) => Promise<Comment | null>;
  onMention: (mentionedMember: TeamMember, episodeId: string) => void;
  deliverableTypes: string[];
  brandingSubtypes: string[];
}

function LinkRow({ icon: Icon, label, value }: { icon: typeof LinkIcon; label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border tf-border px-3 py-2">
      <Icon className="h-4 w-4 tf-muted shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] tf-muted">{label}</div>
        <div className="text-xs tf-text truncate font-mono">{value}</div>
      </div>
      <button onClick={copy} className="tf-btn tf-btn-ghost p-1.5 shrink-0" title="Copy">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {value.startsWith('http') && (
        <a href={value} target="_blank" rel="noreferrer" className="tf-btn tf-btn-ghost p-1.5 shrink-0" title="Open">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

export function TaskDetailsModal({
  open, onClose, episode, clients, teamMembers, comments, currentMemberId, canEdit,
  onUpdateStatus, onUpdate, onEdit, onAddComment, onMention, deliverableTypes, brandingSubtypes,
}: TaskDetailsModalProps) {
  const [status, setStatus] = useState<EpisodeStatus>('cleaning');
  const [saving, setSaving] = useState(false);
  const [deliverableType, setDeliverableType] = useState<string>('');
  const [deliverableSubtype, setDeliverableSubtype] = useState<string>('');
  const [deliverableSaving, setDeliverableSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editEpNum, setEditEpNum] = useState('');
  const [headerSaving, setHeaderSaving] = useState(false);

  useEffect(() => {
    if (episode) {
      setStatus(episode.status);
      setDeliverableType(episode.deliverable_type ?? '');
      setDeliverableSubtype(episode.deliverable_subtype ?? '');
      setEditTitle(episode.title);
      setEditEpNum(episode.episode_number ?? '');
    }
  }, [episode]);

  if (!episode) return null;

  const client = clients.find((c) => c.id === episode.client_id);
  const writerAssignee = teamMembers.find((m) => m.id === episode.writer_assignee_id);
  const editorAssignee = teamMembers.find((m) => m.id === episode.editor_assignee_id);
  const statusInfo = STATUS_MAP[episode.status];

  const handleStatusChange = async (newStatus: EpisodeStatus) => {
    setStatus(newStatus);
    setSaving(true);
    try {
      await onUpdateStatus(episode.id, newStatus);
    } finally {
      setSaving(false);
    }
  };

  const handleDeliverableTypeChange = async (value: string) => {
    setDeliverableType(value);
    if (!canEdit) return;
    const newSubtype = value === 'Branding' ? deliverableSubtype : '';
    if (value !== 'Branding') setDeliverableSubtype('');
    setDeliverableSaving(true);
    try {
      await onUpdate(episode.id, { deliverable_type: value || null, deliverable_subtype: newSubtype || null });
    } finally {
      setDeliverableSaving(false);
    }
  };

  const handleDeliverableSubtypeChange = async (value: string) => {
    setDeliverableSubtype(value);
    if (!canEdit) return;
    setDeliverableSaving(true);
    try {
      await onUpdate(episode.id, { deliverable_subtype: value || null });
    } finally {
      setDeliverableSaving(false);
    }
  };

  const saveHeader = async () => {
    if (!episode) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;
    const changed = trimmedTitle !== episode.title || (editEpNum.trim() || null) !== (episode.episode_number ?? null);
    if (!changed) return;
    setHeaderSaving(true);
    try {
      await onUpdate(episode.id, {
        title: trimmedTitle,
        episode_number: editEpNum.trim() || null,
      });
    } finally {
      setHeaderSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        canEdit ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveHeader}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            placeholder="Episode title"
            className="tf-input w-full !bg-transparent !border-transparent hover:!border tf-border focus:!border tf-border px-1 -mx-1 text-sm font-semibold tf-text"
          />
        ) : episode.title
      }
      subtitle={
        canEdit ? (
          <div className="flex items-center gap-2">
            <input
              value={editEpNum}
              onChange={(e) => setEditEpNum(e.target.value)}
              onBlur={saveHeader}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              placeholder="EP #"
              className="tf-input !bg-transparent !border-transparent hover:!border tf-border focus:!border tf-border px-1 -mx-1 w-20 text-[11px] tf-muted"
            />
            {headerSaving && <span className="text-[10px] tf-muted">saving...</span>}
          </div>
        ) : (episode.episode_number ?? '')
      }
      maxWidth="max-w-lg"
      footer={
        canEdit ? (
          <button onClick={() => onEdit(episode)} className="tf-btn tf-btn-primary">
            <Pencil className="h-4 w-4" />
            Edit Task
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
          {client && <Badge color={client.primary_hex ?? undefined}>{client.name}</Badge>}
        </div>

        {/* Status dropdown */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
            <Clapperboard className="h-3.5 w-3.5" />
            Workflow Status {saving && <span className="text-[10px]">saving...</span>}
          </label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as EpisodeStatus)}
            disabled={!canEdit}
            className="tf-input w-full disabled:opacity-70"
          >
            {WORKFLOW_STATUSES.map((s, i) => (
              <option key={s.key} value={s.key}>{i + 1}. {s.label}</option>
            ))}
          </select>
        </div>

        {/* Deliverable type & sub-type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
              <Package className="h-3.5 w-3.5" />
              Deliverable Type {deliverableSaving && <span className="text-[10px]">saving...</span>}
            </label>
            <select
              value={deliverableType}
              onChange={(e) => handleDeliverableTypeChange(e.target.value)}
              disabled={!canEdit}
              className="tf-input w-full disabled:opacity-70"
            >
              <option value="">— None —</option>
              {deliverableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {deliverableType === 'Branding' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
                <Package className="h-3.5 w-3.5" />
                Branding Sub-Type
              </label>
              <select
                value={deliverableSubtype}
                onChange={(e) => handleDeliverableSubtypeChange(e.target.value)}
                disabled={!canEdit}
                className="tf-input w-full disabled:opacity-70"
              >
                <option value="">— None —</option>
                {brandingSubtypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Assignees */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border tf-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] tf-muted mb-1">
              <User className="h-3 w-3" /> Writer Assigned
            </div>
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
          <div className="rounded-lg border tf-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] tf-muted mb-1">
              <User className="h-3 w-3" /> Video Editor Assigned
            </div>
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

        {/* Start date */}
        {episode.start_date && (
          <div className="rounded-lg border tf-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] tf-muted mb-1">
              <Calendar className="h-3 w-3" /> Start Date
            </div>
            <div className="text-xs tf-text">
              {new Date(episode.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="border-t tf-border pt-4">
          <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide mb-3">Production Links</h3>
          <div className="space-y-2">
            <LinkRow icon={LinkIcon} label="Google Drive Raw" value={episode.google_drive_raw_link} />
            <LinkRow icon={FolderTree} label="NAS File Path" value={episode.nas_file_path} />
            <LinkRow icon={Clapperboard} label="Descript Project" value={episode.descript_project_link} />
            <LinkRow icon={Film} label="Frame.io Review" value={episode.frame_io_review_link} />
            <LinkRow icon={FileText} label="Writer Notes Doc" value={episode.writer_notes_doc} />
          </div>
        </div>

        {/* Comments */}
        <div className="border-t tf-border pt-4">
          <CommentsSection
            episodeId={episode.id}
            comments={comments}
            teamMembers={teamMembers}
            currentMemberId={currentMemberId}
            canComment={true}
            onAddComment={onAddComment}
            onMention={onMention}
          />
        </div>
      </div>
    </Modal>
  );
}
