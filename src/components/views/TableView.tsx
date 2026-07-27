import { useState, useMemo } from 'react';
import { Episode, Client, EpisodeStatus, TeamMember, WORKFLOW_STATUSES, STATUS_MAP } from '@/lib/types';
import { Copy, Check, ExternalLink, ChevronRight, Pencil, Search, X } from 'lucide-react';
import { Badge, Avatar } from '@/components/ui/Avatar';

interface TableViewProps {
  episodes: Episode[];
  clients: Client[];
  teamMembers: TeamMember[];
  canEdit: boolean;
  onUpdate: (id: string, patch: Partial<Episode>) => Promise<void>;
  onEpisodeClick: (episode: Episode) => void;
  onEditEpisode: (episode: Episode) => void;
}

function CopyCell({ value, onSave, canEdit }: { value: string | null; onSave: (v: string) => void; canEdit: boolean }) {
  const [val, setVal] = useState(value ?? '');
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="flex items-center gap-1 min-w-0">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => onSave(val)}
        onClick={(e) => e.stopPropagation()}
        placeholder="—"
        disabled={!canEdit}
        className="tf-input flex-1 min-w-0 font-mono text-[11px] py-1 disabled:opacity-70"
      />
      <button onClick={copy} className="shrink-0 tf-muted hover:tf-text p-1" title="Copy">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function LinkCell({ value, onSave, canEdit }: { value: string | null; onSave: (v: string) => void; canEdit: boolean }) {
  const [val, setVal] = useState(value ?? '');
  return (
    <div className="flex items-center gap-1 min-w-0">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => onSave(val)}
        onClick={(e) => e.stopPropagation()}
        placeholder="—"
        disabled={!canEdit}
        className="tf-input flex-1 min-w-0 text-[11px] py-1 disabled:opacity-70"
      />
      {val && (
        <a href={val} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 tf-muted hover:tf-text p-1" title="Open">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

const selectClass = "tf-input text-xs py-1.5 pr-7 cursor-pointer appearance-none";

function FilterSelect({ value, onChange, options, allLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; allLabel: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 tf-muted pointer-events-none rotate-90" />
    </div>
  );
}

export function TableView({ episodes, clients, teamMembers, canEdit, onUpdate, onEpisodeClick, onEditEpisode }: TableViewProps) {
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWriter, setFilterWriter] = useState('');
  const [filterEditor, setFilterEditor] = useState('');

  const hasFilters = !!(search || filterClient || filterStatus || filterWriter || filterEditor);

  const clearFilters = () => {
    setSearch('');
    setFilterClient('');
    setFilterStatus('');
    setFilterWriter('');
    setFilterEditor('');
  };

  const writerOptions = useMemo(() => teamMembers.filter((m) => m.role === 'Writer' || m.role === 'Operations Manager'), [teamMembers]);
  const editorOptions = useMemo(() => teamMembers.filter((m) => m.role === 'Video Editor' || m.role === 'Operations Manager'), [teamMembers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return episodes.filter((ep) => {
      if (filterClient && ep.client_id !== filterClient) return false;
      if (filterStatus && ep.status !== filterStatus) return false;
      if (filterWriter && ep.writer_assignee_id !== filterWriter) return false;
      if (filterEditor && ep.editor_assignee_id !== filterEditor) return false;
      if (q) {
        const client = clients.find((c) => c.id === ep.client_id);
        const haystack = [
          ep.title ?? '',
          ep.episode_number ?? '',
          client?.name ?? '',
          ep.nas_file_path ?? '',
          ep.google_drive_raw_link ?? '',
          ep.frame_io_review_link ?? '',
          ep.descript_project_link ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [episodes, clients, search, filterClient, filterStatus, filterWriter, filterEditor]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const sa = WORKFLOW_STATUSES.findIndex((s) => s.key === a.status);
    const sb = WORKFLOW_STATUSES.findIndex((s) => s.key === b.status);
    return sa - sb;
  }), [filtered]);

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const statusOptions = WORKFLOW_STATUSES.map((s) => ({ value: s.key, label: s.label }));
  const writerOpts = writerOptions.map((m) => ({ value: m.id, label: m.name }));
  const editorOpts = editorOptions.map((m) => ({ value: m.id, label: m.name }));

  return (
    <div className="py-4 sm:py-6">
      {/* Search & Filter Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 tf-muted pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, episode #, client, links..."
            className="tf-input w-full pl-8 text-xs py-1.5"
          />
        </div>
        <FilterSelect value={filterClient} onChange={setFilterClient} options={clientOptions} allLabel="All Clients" />
        <FilterSelect value={filterStatus} onChange={setFilterStatus} options={statusOptions} allLabel="All Statuses" />
        <FilterSelect value={filterWriter} onChange={setFilterWriter} options={writerOpts} allLabel="All Writers" />
        <FilterSelect value={filterEditor} onChange={setFilterEditor} options={editorOpts} allLabel="All Editors" />
        {hasFilters && (
          <button onClick={clearFilters} className="tf-btn tf-btn-ghost text-xs px-2 py-1.5 text-blue-500 hover:text-blue-600" title="Clear all filters">
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="rounded-xl border tf-border tf-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b tf-border tf-bg-subtle">
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5">Episode</th>
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5">Client</th>
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5">Status</th>
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5">Writer</th>
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5">Editor</th>
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5 min-w-[200px]">NAS Path</th>
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5 min-w-[200px]">Frame.io Link</th>
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5 min-w-[200px]">Drive Link</th>
                <th className="text-left text-[11px] font-semibold tf-muted uppercase tracking-wide px-3 py-2.5">Start Date</th>
                {canEdit && <th className="w-8"></th>}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ep) => {
                const client = clients.find((c) => c.id === ep.client_id);
                const status = STATUS_MAP[ep.status];
                const writerAssignee = teamMembers.find((m) => m.id === ep.writer_assignee_id);
                const editorAssignee = teamMembers.find((m) => m.id === ep.editor_assignee_id);
                return (
                  <tr
                    key={ep.id}
                    onClick={() => onEpisodeClick(ep)}
                    className="border-b tf-border last:border-0 hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors group"
                  >
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-medium tf-text">{ep.title}</div>
                      {ep.episode_number && <div className="text-[10px] tf-muted">{ep.episode_number}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      {client ? <Badge color={client.primary_hex ?? undefined}>{client.name}</Badge> : <span className="text-[11px] tf-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge color={status.color}>{status.short}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {writerAssignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={writerAssignee.name} color={writerAssignee.avatar_color} size="sm" />
                          <span className="text-[11px] tf-text">{writerAssignee.name.split(' ')[0]}</span>
                        </div>
                      ) : <span className="text-[11px] tf-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {editorAssignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={editorAssignee.name} color={editorAssignee.avatar_color} size="sm" />
                          <span className="text-[11px] tf-text">{editorAssignee.name.split(' ')[0]}</span>
                        </div>
                      ) : <span className="text-[11px] tf-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <CopyCell value={ep.nas_file_path} onSave={(v) => onUpdate(ep.id, { nas_file_path: v || null })} canEdit={canEdit} />
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <LinkCell value={ep.frame_io_review_link} onSave={(v) => onUpdate(ep.id, { frame_io_review_link: v || null })} canEdit={canEdit} />
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <LinkCell value={ep.google_drive_raw_link} onSave={(v) => onUpdate(ep.id, { google_drive_raw_link: v || null })} canEdit={canEdit} />
                    </td>
                    <td className="px-3 py-2.5 text-[11px] tf-muted">
                      {ep.start_date ? new Date(ep.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    {canEdit && (
                      <td className="px-2">
                        <button onClick={(e) => { e.stopPropagation(); onEditEpisode(ep); }} className="tf-btn tf-btn-ghost p-1">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                    <td className="px-2">
                      <ChevronRight className="h-4 w-4 tf-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 11 : 10} className="px-3 py-8 text-center text-xs tf-muted">
                    No tasks match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
