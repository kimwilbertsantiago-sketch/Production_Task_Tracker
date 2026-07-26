import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { UserRole, ROLES, ROLE_THEMES } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Loader2, Upload, Link as LinkIcon, User as UserIcon, Briefcase } from 'lucide-react';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Writer');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setRole(profile.role);
      setAvatarUrl(profile.avatarUrl ?? '');
    }
    setError(null);
  }, [profile, open]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await updateProfile({
      name: name.trim(),
      role,
      avatarUrl: avatarUrl || null,
    });
    setBusy(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      subtitle="Update your name, profile picture, and role"
      maxWidth="max-w-md"
      footer={
        <>
          <button onClick={onClose} className="tf-btn tf-btn-outline">Cancel</button>
          <button onClick={handleSave} disabled={busy} className="tf-btn tf-btn-primary disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-xs text-red-500 bg-red-500/10 rounded-md px-3 py-2">{error}</div>}

        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <Avatar name={name || 'U'} color={profile?.avatarColor ?? '#64748B'} size="lg" url={avatarUrl || null} />
          <div className="flex-1">
            <label className="block text-xs font-medium tf-muted mb-1.5">Profile Picture</label>
            <div className="flex items-center gap-2">
              <label className="tf-btn tf-btn-outline cursor-pointer text-xs">
                <Upload className="h-3.5 w-3.5" />
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>
              <button onClick={() => setAvatarUrl('')} className="tf-btn tf-btn-ghost text-xs text-red-500">
                Remove
              </button>
            </div>
          </div>
        </div>

        {/* Image URL */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
            <LinkIcon className="h-3.5 w-3.5" />
            Or paste an image URL
          </label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="tf-input w-full"
          />
        </div>

        {/* Full name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
            <UserIcon className="h-3.5 w-3.5" />
            Full Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="tf-input w-full"
          />
        </div>

        {/* Role */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium tf-muted mb-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Role
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                  role === r ? ROLE_THEMES[r].badge : 'tf-muted border-[var(--border)] hover:tf-text'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
