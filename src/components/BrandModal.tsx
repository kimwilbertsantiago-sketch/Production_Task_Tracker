import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Client, BrandColor } from '@/lib/types';
import { Loader2, Plus, Trash2, X } from 'lucide-react';

interface BrandModalProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  workspaceId: string | null;
  onCreate: (payload: Partial<Client>) => Promise<Client | null>;
  onUpdate: (id: string, patch: Partial<Client>) => Promise<void>;
}

const DEFAULT_COLORS: BrandColor[] = [
  { label: 'Primary', hex: '#3B82F6' },
  { label: 'Secondary', hex: '#93C5FD' },
  { label: 'Background', hex: '#0F172A' },
  { label: 'Accent', hex: '#F59E0B' },
];

const emptyForm = {
  name: '',
  logo_url: '',
  colors: DEFAULT_COLORS as BrandColor[],
  header_font: '',
  subtitle_font: '',
  body_font: '',
  asset_drive_path: '',
  template_path: '',
  notes: '',
};

export function BrandModal({ open, onClose, client, workspaceId, onCreate, onUpdate }: BrandModalProps) {
  const isEdit = !!client;
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        logo_url: client.logo_url ?? '',
        colors: client.colors ?? DEFAULT_COLORS,
        header_font: client.header_font ?? '',
        subtitle_font: client.subtitle_font ?? '',
        body_font: client.body_font ?? '',
        asset_drive_path: client.asset_drive_path ?? '',
        template_path: client.template_path ?? '',
        notes: client.notes ?? '',
      });
    } else {
      setForm({ ...emptyForm });
    }
    setError(null);
  }, [client, open]);

  const set = (k: keyof typeof form, v: string | BrandColor[]) => setForm((f) => ({ ...f, [k]: v }));

  const updateColor = (i: number, field: keyof BrandColor, value: string) => {
    setForm((f) => {
      const colors = [...f.colors];
      colors[i] = { ...colors[i], [field]: value };
      return { ...f, colors };
    });
  };

  const addColor = () => {
    setForm((f) => ({ ...f, colors: [...f.colors, { label: 'New', hex: '#64748B' }] }));
  };

  const removeColor = (i: number) => {
    setForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Client name is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const primaryHex = form.colors.find((c) => c.label.toLowerCase() === 'primary')?.hex ?? form.colors[0]?.hex ?? '#64748B';
      const payload: Partial<Client> = {
        name: form.name.trim(),
        logo_url: form.logo_url || null,
        colors: form.colors,
        header_font: form.header_font || null,
        subtitle_font: form.subtitle_font || null,
        body_font: form.body_font || null,
        asset_drive_path: form.asset_drive_path || null,
        template_path: form.template_path || null,
        notes: form.notes || null,
        primary_hex: primaryHex,
      };
      if (isEdit && client) {
        await onUpdate(client.id, payload);
      } else {
        if (!workspaceId) throw new Error('No workspace found');
        await onCreate({ ...payload, workspace_id: workspaceId });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Brand' : 'New Client Brand'}
      subtitle={isEdit ? 'Update brand assets and guidelines' : 'Add a new client to the Brand Hub'}
      maxWidth="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="tf-btn tf-btn-outline">Cancel</button>
          <button onClick={handleSave} disabled={busy} className="tf-btn tf-btn-primary disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Save changes' : 'Add brand'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-xs text-red-500 bg-red-500/10 rounded-md px-3 py-2">{error}</div>}

        <div>
          <label className="block text-xs font-medium tf-muted mb-1.5">Client Name</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. The Growth Pod" className="tf-input w-full" />
        </div>

        <div>
          <label className="block text-xs font-medium tf-muted mb-1.5">Logo URL</label>
          <input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://... (link to client logo image)" className="tf-input w-full" />
          {form.logo_url && (
            <div className="mt-2 flex items-center gap-2 p-2 rounded-lg border tf-border tf-bg-subtle">
              <img src={form.logo_url} alt="Logo preview" className="h-10 w-10 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-[11px] tf-muted">Logo preview</span>
            </div>
          )}
        </div>

        {/* Colors */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium tf-muted">Color Scheme</label>
            <button onClick={addColor} className="tf-btn tf-btn-ghost text-xs py-1">
              <Plus className="h-3.5 w-3.5" /> Add color
            </button>
          </div>
          <div className="space-y-2">
            {form.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => updateColor(i, 'hex', e.target.value)}
                  className="h-9 w-9 rounded-lg border tf-border cursor-pointer shrink-0"
                />
                <input
                  value={c.label}
                  onChange={(e) => updateColor(i, 'label', e.target.value)}
                  placeholder="Label (e.g. Primary)"
                  className="tf-input flex-1"
                />
                <input
                  value={c.hex}
                  onChange={(e) => updateColor(i, 'hex', e.target.value)}
                  className="tf-input w-28 font-mono text-xs"
                />
                <button onClick={() => removeColor(i)} className="tf-btn tf-btn-ghost p-2 text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="border-t tf-border pt-4">
          <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide mb-3">Typography</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">Header Font</label>
              <input value={form.header_font} onChange={(e) => set('header_font', e.target.value)} placeholder="Montserrat" className="tf-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">Subtitle Font</label>
              <input value={form.subtitle_font} onChange={(e) => set('subtitle_font', e.target.value)} placeholder="Inter" className="tf-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">Body Font</label>
              <input value={form.body_font} onChange={(e) => set('body_font', e.target.value)} placeholder="Inter" className="tf-input w-full" />
            </div>
          </div>
        </div>

        {/* Asset paths */}
        <div className="border-t tf-border pt-4">
          <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide mb-3">Asset Paths</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">Asset Drive Path</label>
              <input value={form.asset_drive_path} onChange={(e) => set('asset_drive_path', e.target.value)} placeholder="/Drive/Client/BrandAssets" className="tf-input w-full font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium tf-muted mb-1">DaVinci Template Path</label>
              <input value={form.template_path} onChange={(e) => set('template_path', e.target.value)} placeholder="DaVinci: /Templates/Client_LowerThird.drp" className="tf-input w-full font-mono text-xs" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium tf-muted mb-1.5">Brand Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Brand guidelines, style notes..." className="tf-input w-full resize-none" />
        </div>
      </div>
    </Modal>
  );
}
