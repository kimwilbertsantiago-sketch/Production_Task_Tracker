import { useState, useMemo } from 'react';
import { Client, Episode } from '@/lib/types';
import { Palette, Type, FolderTree, FileText, Film, Plus, Pencil, ExternalLink, Search, X, ChevronRight, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Avatar';

interface BrandHubViewProps {
  clients: Client[];
  episodes: Episode[];
  canEdit: boolean;
  canDelete: boolean;
  onAddBrand: () => void;
  onEditBrand: (client: Client) => void;
  onDeleteBrand: (client: Client) => void;
}

type SortKey = 'name' | 'active';

const selectClass = "tf-input text-xs py-1.5 pr-7 cursor-pointer";

function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value as SortKey)} className={selectClass}>
        <option value="name">Sort: A–Z</option>
        <option value="active">Sort: Active episodes</option>
      </select>
      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 tf-muted pointer-events-none rotate-90" />
    </div>
  );
}

export function BrandHubView({ clients, episodes, canEdit, canDelete, onAddBrand, onEditBrand, onDeleteBrand }: BrandHubViewProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  const hasFilters = !!search;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = clients.filter((c) => {
      if (!q) return true;
      const haystack = [
        c.name ?? '',
        c.header_font ?? '',
        c.subtitle_font ?? '',
        c.body_font ?? '',
        c.notes ?? '',
        c.asset_drive_path ?? '',
        c.template_path ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
    return [...list].sort((a, b) => {
      if (sort === 'active') {
        const aActive = episodes.filter((e) => e.client_id === a.id && e.status !== 'completed_delivered').length;
        const bActive = episodes.filter((e) => e.client_id === b.id && e.status !== 'completed_delivered').length;
        if (aActive !== bActive) return bActive - aActive;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [clients, episodes, search, sort]);

  return (
    <div className="py-4 sm:py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold tf-text">Client Brand Hub</h2>
          <p className="text-xs tf-muted mt-0.5">Brand colors, fonts, and DaVinci lower-third templates for every client.</p>
        </div>
        {canEdit && (
          <button onClick={onAddBrand} className="tf-btn tf-btn-primary">
            <Plus className="h-4 w-4" />
            Add Client Brand
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 tf-muted pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, font, or notes..."
            className="tf-input w-full pl-8 text-xs py-1.5"
          />
        </div>
        <SortSelect value={sort} onChange={setSort} />
        {hasFilters && (
          <button onClick={() => setSearch('')} className="tf-btn tf-btn-ghost text-xs px-2 py-1.5 text-blue-500 hover:text-blue-600" title="Clear search">
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((client) => {
          const clientEpisodes = episodes.filter((e) => e.client_id === client.id);
          const activeCount = clientEpisodes.filter((e) => e.status !== 'completed_delivered').length;
          const colors = client.colors ?? (client.primary_hex ? [{ label: 'Primary', hex: client.primary_hex }] : []);
          return (
            <div key={client.id} className="rounded-xl border tf-border tf-card overflow-hidden tf-fade-in flex flex-col">
              {/* Logo header */}
              <div
                className="h-20 flex items-center justify-center relative"
                style={{ backgroundColor: (colors.find((c) => c.label.toLowerCase() === 'background')?.hex) ?? '#0F172A' }}
              >
                {client.logo_url ? (
                  <img src={client.logo_url} alt={client.name} className="h-12 max-w-[80%] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span className="text-lg font-semibold text-white">{client.name}</span>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {canEdit && (
                    <button
                      onClick={() => onEditBrand(client)}
                      className="tf-btn tf-btn-ghost p-1.5 bg-black/30 hover:bg-black/50 rounded-lg"
                    >
                      <Pencil className="h-3.5 w-3.5 text-white" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setConfirmDelete(client)}
                      className="tf-btn tf-btn-ghost p-1.5 bg-black/30 hover:bg-red-500/80 rounded-lg"
                      title="Delete brand"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold tf-text">{client.name}</h3>
                    <p className="text-[11px] tf-muted mt-0.5">
                      {clientEpisodes.length} episodes · {activeCount} active
                    </p>
                  </div>
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${(colors[0]?.hex) ?? '#64748B'}1A` }}
                  >
                    <Palette className="h-4 w-4" style={{ color: (colors[0]?.hex) ?? '#64748B' }} />
                  </div>
                </div>

                {/* Color swatches */}
                {colors.length > 0 && (
                  <div className="mb-4">
                    <label className="text-[11px] font-medium tf-muted mb-2 block">Color Scheme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {colors.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md border tf-border shrink-0" style={{ backgroundColor: c.hex }} />
                          <div className="min-w-0">
                            <div className="text-[10px] tf-text truncate">{c.label}</div>
                            <div className="text-[9px] tf-muted font-mono truncate">{c.hex.toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Typography */}
                {(client.header_font || client.subtitle_font || client.body_font) && (
                  <div className="mb-4">
                    <label className="flex items-center gap-1.5 text-[11px] font-medium tf-muted mb-1.5">
                      <Type className="h-3.5 w-3.5" />
                      Typography
                    </label>
                    <div className="space-y-1">
                      {client.header_font && <div className="text-[11px] tf-text"><span className="tf-muted">Header:</span> {client.header_font}</div>}
                      {client.subtitle_font && <div className="text-[11px] tf-text"><span className="tf-muted">Subtitle:</span> {client.subtitle_font}</div>}
                      {client.body_font && <div className="text-[11px] tf-text"><span className="tf-muted">Body:</span> {client.body_font}</div>}
                    </div>
                  </div>
                )}

                {/* Asset paths */}
                <div className="mb-4">
                  <label className="flex items-center gap-1.5 text-[11px] font-medium tf-muted mb-1.5">
                    <FolderTree className="h-3.5 w-3.5" />
                    Asset Paths
                  </label>
                  <div className="space-y-1">
                    {client.asset_drive_path && (
                      <code className="block text-[10px] font-mono tf-text tf-bg-subtle rounded-md px-2 py-1 break-all">
                        {client.asset_drive_path}
                      </code>
                    )}
                    {client.template_path && (
                      <code className="block text-[10px] font-mono tf-text tf-bg-subtle rounded-md px-2 py-1 break-all">
                        {client.template_path}
                      </code>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {client.notes && (
                  <div className="mb-4">
                    <label className="flex items-center gap-1.5 text-[11px] font-medium tf-muted mb-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Brand Notes
                    </label>
                    <p className="text-xs tf-muted leading-relaxed">{client.notes}</p>
                  </div>
                )}

                {/* Recent episodes */}
                {clientEpisodes.length > 0 && (
                  <div className="mt-auto pt-4 border-t tf-border">
                    <label className="flex items-center gap-1.5 text-[11px] font-medium tf-muted mb-2">
                      <Film className="h-3.5 w-3.5" />
                      Recent Episodes
                    </label>
                    <div className="space-y-1.5">
                      {clientEpisodes.slice(0, 3).map((ep) => (
                        <div key={ep.id} className="flex items-center justify-between text-[11px]">
                          <span className="tf-text truncate">{ep.title}</span>
                          <span className="tf-muted shrink-0 ml-2">{ep.episode_number ?? ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-xs tf-muted py-12">
            No clients match your search.
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDelete(null)}>
          <div className="tf-card border tf-border rounded-2xl p-6 max-w-sm w-full tf-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-sm font-semibold tf-text">Delete brand?</h3>
            </div>
            <p className="text-xs tf-muted mb-5">
              Are you sure you want to delete <span className="font-semibold tf-text">{confirmDelete.name}</span>? This will permanently remove the brand from the Brand Hub. Episodes assigned to this client will keep their data but lose the brand reference.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="tf-btn tf-btn-outline">Cancel</button>
              <button
                onClick={() => { onDeleteBrand(confirmDelete); setConfirmDelete(null); }}
                className="tf-btn bg-red-500 hover:bg-red-600 text-white border-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Delete brand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
