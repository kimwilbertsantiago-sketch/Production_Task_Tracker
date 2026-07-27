import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Episode, Client, TeamMember, CustomOption, DEFAULT_DELIVERABLE_TYPES, DEFAULT_BRANDING_SUBTYPES } from '@/lib/types';
import { Download, FileSpreadsheet, FileJson, Loader2, Plus, Trash2, AlertTriangle, Package, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StudioSettingsModalProps {
  open: boolean;
  onClose: () => void;
  episodes: Episode[];
  clients: Client[];
  teamMembers: TeamMember[];
  customOptions: CustomOption[];
  onCreateCustomOption: (category: CustomOption['category'], label: string) => Promise<void>;
  onDeleteCustomOption: (id: string) => Promise<void>;
  onPurgeAllTasksAndClients: () => Promise<void>;
  onResetEverything: () => Promise<void>;
  isOpsManager: boolean;
  currentUserId?: string;
}

type DangerAction = 'delete_tasks' | 'delete_users' | 'reset_all';

const DANGER_CONFIRMATIONS: Record<DangerAction, string> = {
  delete_tasks: 'DELETE TASKS',
  delete_users: 'DELETE USERS',
  reset_all: 'RESET ALL',
};

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportTasksCsv(episodes: Episode[], clients: Client[], teamMembers: TeamMember[]) {
  const header = ['Title', 'Episode Number', 'Client', 'Status', 'Writer', 'Video Editor', 'Start Date', 'NAS Path', 'Drive Link', 'Frame.io Link'];
  const rows = episodes.map((ep) => {
    const client = clients.find((c) => c.id === ep.client_id);
    const writer = teamMembers.find((m) => m.id === ep.writer_assignee_id);
    const editor = teamMembers.find((m) => m.id === ep.editor_assignee_id);
    return [
      escapeCsv(ep.title),
      escapeCsv(ep.episode_number),
      escapeCsv(client?.name),
      escapeCsv(ep.status),
      escapeCsv(writer?.name),
      escapeCsv(editor?.name),
      escapeCsv(ep.start_date),
      escapeCsv(ep.nas_file_path),
      escapeCsv(ep.google_drive_raw_link),
      escapeCsv(ep.frame_io_review_link),
    ].join(',');
  });
  const csv = [header.join(','), ...rows].join('\n');
  downloadFile(`taskflow-tasks-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
}

function exportFullJson(episodes: Episode[], clients: Client[], teamMembers: TeamMember[]) {
  const backup = {
    exportedAt: new Date().toISOString(),
    tasks: episodes.map((e) => ({
      title: e.title,
      episode_number: e.episode_number,
      status: e.status,
      start_date: e.start_date,
      writer_assignee_id: e.writer_assignee_id,
      editor_assignee_id: e.editor_assignee_id,
      client_id: e.client_id,
      google_drive_raw_link: e.google_drive_raw_link,
      nas_file_path: e.nas_file_path,
      descript_project_link: e.descript_project_link,
      frame_io_review_link: e.frame_io_review_link,
      writer_notes_doc: e.writer_notes_doc,
    })),
    clients: clients.map((c) => ({
      name: c.name,
      primary_hex: c.primary_hex,
      header_font: c.header_font,
      subtitle_font: c.subtitle_font,
      body_font: c.body_font,
      nas_paths: c.nas_paths,
      notes: c.notes,
    })),
    team_members: teamMembers.map((m) => ({
      name: m.name,
      role: m.role,
      email: m.email,
      avatar_color: m.avatar_color,
    })),
  };
  downloadFile(`taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

export function StudioSettingsModal({
  open, onClose, episodes, clients, teamMembers, customOptions,
  onCreateCustomOption, onDeleteCustomOption, onPurgeAllTasksAndClients, onResetEverything,
  isOpsManager, currentUserId,
}: StudioSettingsModalProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newSubtypeLabel, setNewSubtypeLabel] = useState('');
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [dangerInput, setDangerInput] = useState('');
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerResult, setDangerResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDangerAction(null);
      setDangerInput('');
      setDangerResult(null);
    }
  }, [open]);

  const deliverableTypeOptions = [
    ...DEFAULT_DELIVERABLE_TYPES,
    ...customOptions.filter((o) => o.category === 'deliverable_type').map((o) => o.label),
  ];
  const brandingSubtypeOptions = [
    ...DEFAULT_BRANDING_SUBTYPES,
    ...customOptions.filter((o) => o.category === 'deliverable_subtype').map((o) => o.label),
  ];

  const handleExportCsv = () => {
    setBusy('csv');
    try { exportTasksCsv(episodes, clients, teamMembers); } finally { setBusy(null); }
  };

  const handleExportJson = () => {
    setBusy('json');
    try { exportFullJson(episodes, clients, teamMembers); } finally { setBusy(null); }
  };

  const handleAddType = async () => {
    if (!newTypeLabel.trim()) return;
    setBusy('addType');
    try {
      await onCreateCustomOption('deliverable_type', newTypeLabel);
      setNewTypeLabel('');
    } finally { setBusy(null); }
  };

  const handleAddSubtype = async () => {
    if (!newSubtypeLabel.trim()) return;
    setBusy('addSubtype');
    try {
      await onCreateCustomOption('deliverable_subtype', newSubtypeLabel);
      setNewSubtypeLabel('');
    } finally { setBusy(null); }
  };

  const handleDeleteOption = async (id: string) => {
    await onDeleteCustomOption(id);
  };

  const handleDeleteNonAdminUsers = async () => {
    setDangerBusy(true);
    setDangerResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No session');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/danger-zone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: 'delete_non_admin_users' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setDangerResult(`Deleted ${data.deleted ?? 0} non-admin user(s).`);
    } catch (err) {
      setDangerResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDangerBusy(false);
    }
  };

  const executeDangerAction = async () => {
    if (dangerInput !== DANGER_CONFIRMATIONS[dangerAction!]) return;
    setDangerBusy(true);
    setDangerResult(null);
    try {
      if (dangerAction === 'delete_tasks') {
        await onPurgeAllTasksAndClients();
        setDangerResult('All tasks, episodes, and client brands have been deleted.');
      } else if (dangerAction === 'delete_users') {
        await handleDeleteNonAdminUsers();
      } else if (dangerAction === 'reset_all') {
        await onResetEverything();
        await handleDeleteNonAdminUsers();
        setDangerResult('Full database wipe complete. All tasks, clients, and non-admin users deleted.');
      }
    } catch (err) {
      setDangerResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDangerBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Studio Settings"
      subtitle="Export data, manage deliverable options, and danger zone controls"
      maxWidth="max-w-lg"
      footer={<button onClick={onClose} className="tf-btn tf-btn-outline">Close</button>}
    >
      <div className="space-y-5">
        {/* Export section */}
        <div>
          <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide mb-3">Data Export</h3>
          <div className="space-y-2">
            <div className="rounded-lg border tf-border p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium tf-text">Export Tasks to CSV</div>
                <div className="text-[10px] tf-muted">All episodes with client, status, assignees</div>
              </div>
              <button onClick={handleExportCsv} disabled={busy !== null} className="tf-btn tf-btn-primary text-xs disabled:opacity-60">
                {busy === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export
              </button>
            </div>
            <div className="rounded-lg border tf-border p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileJson className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium tf-text">Export Full Backup (JSON)</div>
                <div className="text-[10px] tf-muted">Complete backup of tasks, clients, team</div>
              </div>
              <button onClick={handleExportJson} disabled={busy !== null} className="tf-btn tf-btn-primary text-xs disabled:opacity-60">
                {busy === 'json' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Custom deliverable options */}
        {isOpsManager && (
          <div className="border-t tf-border pt-4">
            <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Deliverable Options
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium tf-muted mb-1.5 block">Deliverable Types</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {deliverableTypeOptions.map((label) => {
                    const isCustom = !DEFAULT_DELIVERABLE_TYPES.includes(label);
                    const opt = customOptions.find((o) => o.category === 'deliverable_type' && o.label === label);
                    return (
                      <span key={label} className="inline-flex items-center gap-1 text-[10px] tf-text tf-bg-subtle rounded-md px-2 py-1">
                        {label}
                        {isCustom && opt && (
                          <button onClick={() => handleDeleteOption(opt.id)} className="text-red-500 hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    placeholder="Add custom type…"
                    className="tf-input flex-1 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
                  />
                  <button onClick={handleAddType} disabled={busy === 'addType'} className="tf-btn tf-btn-outline text-xs shrink-0">
                    {busy === 'addType' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium tf-muted mb-1.5 block">Branding Sub-Types</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {brandingSubtypeOptions.map((label) => {
                    const isCustom = !DEFAULT_BRANDING_SUBTYPES.includes(label);
                    const opt = customOptions.find((o) => o.category === 'deliverable_subtype' && o.label === label);
                    return (
                      <span key={label} className="inline-flex items-center gap-1 text-[10px] tf-text tf-bg-subtle rounded-md px-2 py-1">
                        {label}
                        {isCustom && opt && (
                          <button onClick={() => handleDeleteOption(opt.id)} className="text-red-500 hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newSubtypeLabel}
                    onChange={(e) => setNewSubtypeLabel(e.target.value)}
                    placeholder="Add custom sub-type…"
                    className="tf-input flex-1 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtype()}
                  />
                  <button onClick={handleAddSubtype} disabled={busy === 'addSubtype'} className="tf-btn tf-btn-outline text-xs shrink-0">
                    {busy === 'addSubtype' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger zone */}
        {isOpsManager && (
          <div className="border-t tf-border pt-4">
            <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Danger Zone
            </h3>
            <div className="space-y-2">
              <div className="rounded-lg border border-red-500/30 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium tf-text">Delete All Clients & Tasks</div>
                  <div className="text-[10px] tf-muted">Purge all tasks, episodes, and client brands</div>
                </div>
                <button onClick={() => { setDangerAction('delete_tasks'); setDangerInput(''); setDangerResult(null); }} className="tf-btn bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 text-xs shrink-0">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
              <div className="rounded-lg border border-red-500/30 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium tf-text">Delete All Non-Admin Users</div>
                  <div className="text-[10px] tf-muted">Remove all team member accounts except yours</div>
                </div>
                <button onClick={() => { setDangerAction('delete_users'); setDangerInput(''); setDangerResult(null); }} className="tf-btn bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 text-xs shrink-0">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
              <div className="rounded-lg border border-red-500/30 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium tf-text">Reset Everything</div>
                  <div className="text-[10px] tf-muted">Full database wipe — tasks, clients, and non-admin users</div>
                </div>
                <button onClick={() => { setDangerAction('reset_all'); setDangerInput(''); setDangerResult(null); }} className="tf-btn bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 text-xs shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danger confirmation modal */}
      {dangerAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => !dangerBusy && setDangerAction(null)}>
          <div className="tf-card border border-red-500/30 rounded-2xl p-6 max-w-sm w-full tf-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tf-text">Confirm destructive action</h3>
                <p className="text-[10px] tf-muted">
                  {dangerAction === 'delete_tasks' && 'Delete all tasks, episodes, and client brands.'}
                  {dangerAction === 'delete_users' && 'Delete all non-admin user accounts.'}
                  {dangerAction === 'reset_all' && 'Full database wipe — tasks, clients, and non-admin users.'}
                </p>
              </div>
            </div>
            <p className="text-xs tf-muted mb-3">
              Type <span className="font-mono font-bold text-red-500">{DANGER_CONFIRMATIONS[dangerAction]}</span> to confirm. This cannot be undone.
            </p>
            <input
              value={dangerInput}
              onChange={(e) => setDangerInput(e.target.value)}
              placeholder={DANGER_CONFIRMATIONS[dangerAction]}
              className="tf-input w-full font-mono text-xs mb-3"
              disabled={dangerBusy}
              autoFocus
            />
            {dangerResult && (
              <div className="text-xs tf-text tf-bg-subtle rounded-md p-2 mb-3">{dangerResult}</div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDangerAction(null)} disabled={dangerBusy} className="tf-btn tf-btn-outline text-xs">Cancel</button>
              <button
                onClick={executeDangerAction}
                disabled={dangerInput !== DANGER_CONFIRMATIONS[dangerAction] || dangerBusy}
                className="tf-btn bg-red-500 hover:bg-red-600 text-white border-red-500 text-xs disabled:opacity-40"
              >
                {dangerBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
