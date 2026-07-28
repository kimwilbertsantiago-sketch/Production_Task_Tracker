import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Client, BrandColor } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Trash2, X, Upload, FileText } from 'lucide-react';

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
  logo_url: '' as string | null,
  brand_book_url: '' as string | null,
  colors: DEFAULT_COLORS as BrandColor[],
  header_font: '',
  subtitle_font: '',
  body_font: '',
  nas_paths: [] as string[],
  notes: '',
};

async function uploadFile(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? '';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('brand-assets').upload(fileName, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('brand-assets').getPublicUrl(fileName);
  return data.publicUrl;
}

export function BrandModal({ open, onClose, client, workspaceId, onCreate, onUpdate }: BrandModalProps) {
  const isEdit = !!client;
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        logo_url: client.logo_url ?? '',
        brand_book_url: client.brand_book_url ?? '',
        colors: client.colors ?? DEFAULT_COLORS,
        header_font: client.header_font ?? '',
        subtitle_font: client.subtitle_font ?? '',
        body_font: client.body_font ?? '',
        nas_paths: client.nas_paths ?? [],
        notes: client.notes ?? '',
      });
    } else {
      setForm({ ...emptyForm });
    }
    setError(null);
  }, [client, open]);

  const set = (k: keyof typeof form, v: string | BrandColor[] | string[] | null) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadFile(file, 'logos');
      if (url) {
        set('logo_url', url);
      } else {
        setError('Failed to upload logo. Please try again.');
      }
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }
    setPdfUploading(true);
    try {
      const url = await uploadFile(file, 'brand-books');
      if (url) {
        set('brand_book_url', url);
      } else {
        setError('Failed to upload brand book. Please try again.');
      }
    } finally {
      setPdfUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

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

  const addNasPath = () => setForm((f) => ({ ...f, nas_paths: [...f.nas_paths, ''] }));
  const updateNasPath = (i: number, value: string) => setForm((f) => ({ ...f, nas_paths: f.nas_paths.map((p, idx) => idx === i ? value : p) }));
  const removeNasPath = (i: number) => setForm((f) => ({ ...f, nas_paths: f.nas_paths.filter((_, idx) => idx !== i) }));

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
        brand_book_url: form.brand_book_url || null,
        colors: form.colors,
        header_font: form.header_font || null,
        subtitle_font: form.subtitle_font || null,
        body_font: form.body_font || null,
        nas_paths: form.nas_paths.filter((p) => p.trim()),
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

        {/* Logo upload */}
        <div>
          <label className="block text-xs font-medium tf-muted mb-1.5">Client Logo</label>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          <div className="flex items-center gap-3">
            {form.logo_url && (
              <div className="h-14 w-14 rounded-lg border tf-border tf-bg-subtle flex items-center justify-center overflow-hidden shrink-0">
                <img src={form.logo_url} alt="Logo preview" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="tf-btn tf-btn-outline text-xs"
            >
              {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {form.logo_url ? 'Replace logo' : 'Upload logo'}
            </button>
            {form.logo_url && (
              <button type="button" onClick={() => set('logo_url', null)} className="tf-btn tf-btn-ghost text-xs text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          <p className="text-[10px] tf-muted mt-1.5">Upload an image file (PNG, JPG, SVG). It will be stored and displayed on the brand card.</p>
        </div>

        {/* Brand book PDF upload */}
        <div>
          <label className="block text-xs font-medium tf-muted mb-1.5">Brand Book (PDF)</label>
          <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
          <div className="flex items-center gap-3">
            {form.brand_book_url && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border tf-border tf-bg-subtle">
                <FileText className="h-4 w-4 text-red-500" />
                <span className="text-[11px] tf-text truncate max-w-[160px]">Brand book uploaded</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={pdfUploading}
              className="tf-btn tf-btn-outline text-xs"
            >
              {pdfUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {form.brand_book_url ? 'Replace PDF' : 'Upload PDF'}
            </button>
            {form.brand_book_url && (
              <button type="button" onClick={() => set('brand_book_url', null)} className="tf-btn tf-btn-ghost text-xs text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          <p className="text-[10px] tf-muted mt-1.5">Upload a PDF brand book or style guide. Users can view it directly from the brand card.</p>
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

        {/* NAS paths */}
        <div className="border-t tf-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold tf-muted uppercase tracking-wide">Asset Storage</h3>
            <button onClick={addNasPath} className="tf-btn tf-btn-ghost text-xs py-1">
              <Plus className="h-3.5 w-3.5" /> Add NAS Path
            </button>
          </div>
          <div className="space-y-2">
            {form.nas_paths.length === 0 && (
              <p className="text-[11px] tf-muted italic">No NAS paths added yet. Click "Add NAS Path" to add one.</p>
            )}
            {form.nas_paths.map((path, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={path}
                  onChange={(e) => updateNasPath(i, e.target.value)}
                  placeholder="/NAS/PodcastStudio/Client/BrandAssets"
                  className="tf-input w-full font-mono text-xs"
                />
                <button onClick={() => removeNasPath(i)} className="tf-btn tf-btn-ghost p-2 text-red-500 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
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
