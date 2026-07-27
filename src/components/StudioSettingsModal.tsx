import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Episode, Client, TeamMember } from '@/lib/types';
import { Download, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';

interface StudioSettingsModalProps {
  open: boolean;
  onClose: () => void;
  episodes: Episode[];
  clients: Client[];
  teamMembers: TeamMember[];
}

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
      nas_path: c.nas_path,
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

export function StudioSettingsModal({ open, onClose, episodes, clients, teamMembers }: StudioSettingsModalProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const handleExportCsv = () => {
    setBusy('csv');
    try {
      exportTasksCsv(episodes, clients, teamMembers);
    } finally {
      setBusy(null);
    }
  };

  const handleExportJson = () => {
    setBusy('json');
    try {
      exportFullJson(episodes, clients, teamMembers);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Studio Settings & Export"
      subtitle="Export studio data for backup and reporting"
      maxWidth="max-w-md"
      footer={
        <button onClick={onClose} className="tf-btn tf-btn-outline">Close</button>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg border tf-border p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium tf-text">Export Tasks to CSV</div>
            <div className="text-[11px] tf-muted">All episodes with client, status, assignees, and dates</div>
          </div>
          <button onClick={handleExportCsv} disabled={busy !== null} className="tf-btn tf-btn-primary text-xs disabled:opacity-60">
            {busy === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </button>
        </div>

        <div className="rounded-lg border tf-border p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <FileJson className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium tf-text">Export Full Backup (JSON)</div>
            <div className="text-[11px] tf-muted">Complete backup of tasks, clients, and team profiles</div>
          </div>
          <button onClick={handleExportJson} disabled={busy !== null} className="tf-btn tf-btn-primary text-xs disabled:opacity-60">
            {busy === 'json' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export
          </button>
        </div>
      </div>
    </Modal>
  );
}
