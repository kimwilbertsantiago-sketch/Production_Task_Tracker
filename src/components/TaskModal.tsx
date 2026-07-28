import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Episode, Client, TeamMember, EpisodeStatus, WORKFLOW_STATUSES } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  episode: Episode | null;
  clients: Client[];
  teamMembers: TeamMember[];
  listId: string | null;
  onCreate: (payload: Partial<Episode>) => Promise<Episode | null>;
  onUpdate: (id: string, patch: Partial<Episode>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canDelete: boolean;
  deliverableTypes: string[];
  brandingSubtypes: string[];
}

const emptyForm = {
  title: '',
  episode_number: '',
  client_id: '',
  status: 'cleaning' as EpisodeStatus,
  writer_assignee_id: '',
  editor_assignee_id: '',
  google_drive_raw_link: '',
  nas_file_path: '',
  descript_project_link: '',
  frame_io_review_link: '',
  writer_notes_doc: '',
  start_date: '',
  deliverable_type: '',
  deliverable_subtype: '',
};

export function TaskModal({ open, onClose, episode, clients, teamMembers, listId, onCreate, onUpdate, onDelete, canDelete, deliverableTypes, brandingSubtypes }: TaskModalProps) {
  const isEdit = !!episode;
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (episode) {
      setForm({
        title: episode.title,
        episode_number: episode.episode_number ?? '',
        client_id: episode.client_id ?? '',
        status: episode.status,
        writer_assignee_id: episode.writer_assignee_id ?? '',
        editor_assignee_id: episode.editor_assignee_id ?? '',
        google_drive_raw_link: episode.google_drive_raw_link ?? '',
        nas_file_path: episode.nas_file_path ?? '',
        descript_project_link: episode.descript_project_link ?? '',
        frame_io_review_link: episode.frame_io_review_link ?? '',
        writer_notes_doc: episode.writer_notes_doc ?? '',
        start_date: episode.start_date ?? '',
        deliverable_type: episode.deliverable_type ?? '',
        deliverable_subtype: episode.deliverable_subtype ?? '',
      });
    } else {
      setForm({ ...emptyForm });
    }
    setError(null);
  }, [episode, open]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const writerOptions = teamMembers.filter((m) => m.role === 'Writer');
  const editorOptions = teamMembers.filter((m) => m.role === 'Video Editor');

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: Partial<Episode> = {
        title: form.title.trim(),
        episode_number: form.episode_number || null,
        client_id: form.client_id || null,
        status: form.status,
        writer_assignee_id: form.writer_assignee_id || null,
        editor_assignee_id: form.editor_assignee_id || null,
        google_drive_raw_link: form.google_drive_raw_link || null,
        nas_file_path: form.nas_file_path || null,
        descript_project_link: form.descript_project_link || null,
        frame_io_review_link: form.frame_io_review_link || null,
        writer_notes_doc: form.writer_notes_doc || null,
        start_date: form.start_date || null,
        deliverable_type: form.deliverable_type || null,
        deliverable_subtype: form.deliverable_type === 'Branding' ? (form.deliverable_subtype || null) : null,
      };
      if (isEdit && episode) {
        await onUpdate(episode.id, payload);
      } else {
        if (!listId) throw new Error('No pipeline list found');
        await onCreate({ ...payload, list_id: listId, sort_order: 0 });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || !episode) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    setBusy(true);
    try {
      await onDelete(episode.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Task' : 'New Task'}
      subtitle={isEdit ? 'Update episode details and assignees' : 'Create a new episode task in the pipeline'}
      maxWidth="max-w-xl"
      footer={
        <>
          {isEdit && canDelete && (
            <button onClick={handleDelete} disabled={busy} className="tf-btn tf-btn-ghost text-red-500 mr-auto">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <button onClick={onClose} className="tf-btn tf-btn-outline">Cancel</button>
          <button onClick={handleSave} disabled={busy} className="tf-btn tf-btn-primary disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Save changes' : 'Create task'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-xs text-red-500 bg-red-500/10 rounded-md px-3 py-2">{error}</div>}

        <div>
          <label className="block text-xs font-medium tf-muted mb-1.5">Title</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Episode title — Guest Name" className="tf-input w-full" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium tf-muted mb-1.5">Episode #</label>
            <input value={form.episode_number} onChange={(e) => set('episode_number', e.target.value)} placeholder="EP 042" className="tf-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium tf-muted mb-1.5">Start Date</label>
            <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className="tf-input w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium tf-muted mb-1.5">Client</label>
            <select value={form.client_id} onChange={(e) => set('client_id', e.target.value)} className="tf-input w-full">
              <option value="">— No client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium tf-muted mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value as EpisodeStatus)} className="tf-input w-full">
              {WORKFLOW_STATUSES.map((s, i) => <option key={s.key} value={s.key}>{i + 1}. {s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Dual assignees */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium tf-muted mb-1.5">Deliverable Type</label>
            <select value={form.deliverable_type} onChange={(e) => { set('deliverable_type', e.target.value); set('deliverable_subtype', ''); }} className="tf-input w-full">
              <option value="">— None —</option>
              {deliverableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {form.deliverable_type === 'Branding' && (
            <div>
              <label className="block text-xs font-medium tf-muted mb-1.5">Branding Sub-Type</label>
              <select value={form.deliverable_subtype} onChange={(e) => set('deliverable_subtype', e.target.value)} className="tf-input w-full">
                <option value="">— None —</option>
                {brandingSubtypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Dual assignees */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium tf-muted mb-1.5">Writer Assigned</label>
            <select value={form.writer_assignee_id} onChange={(e) => set('writer_assignee_id', e.target.value)} className="tf-input w-full">
              <option value="">— Unassigned —</option>
              {writerOptions.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium tf-muted mb-1.5">Video Editor Assigned</label>
            <select value={form.editor_assignee_id} onChange={(e) => set('editor_assignee_id', e.target.value)} className="tf-input w-full">
              <option value="">— Unassigned —</option>
              {editorOptions.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </div>
        </div>

        <div className="border-t tf-border pt-4">
          <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide mb-3">Production Links</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">Google Drive Raw Link</label>
              <input value={form.google_drive_raw_link} onChange={(e) => set('google_drive_raw_link', e.target.value)} placeholder="https://drive.google.com/..." className="tf-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">NAS File Path</label>
              <input value={form.nas_file_path} onChange={(e) => set('nas_file_path', e.target.value)} placeholder="/NAS/PodcastStudio/..." className="tf-input w-full font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">Descript Project Link</label>
              <input value={form.descript_project_link} onChange={(e) => set('descript_project_link', e.target.value)} placeholder="https://app.descript.com/..." className="tf-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">Frame.io Review Link</label>
              <input value={form.frame_io_review_link} onChange={(e) => set('frame_io_review_link', e.target.value)} placeholder="https://frame.io/..." className="tf-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">Writer Notes Doc</label>
              <input value={form.writer_notes_doc} onChange={(e) => set('writer_notes_doc', e.target.value)} placeholder="https://docs.google.com/..." className="tf-input w-full" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
