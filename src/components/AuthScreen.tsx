import { useState } from 'react';
import { Loader2, Lock, Mail, User as UserIcon, ArrowRight, Briefcase } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DEMO_USERS, DemoUser, ROLES, UserRole, ROLE_COLORS } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';

export function AuthScreen() {
  const { signIn, signUp, quickLogin } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Operations Manager');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyDemo, setBusyDemo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, name, role);
    setBusy(false);
    if (error) setError(error);
  };

  const handleQuickLogin = async (demo: DemoUser) => {
    setError(null);
    setBusyDemo(demo.email);
    const { error } = await quickLogin(demo);
    setBusyDemo(null);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen tf-bg tf-text flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: Brand */}
        <div className="hidden lg:flex flex-col gap-6 pr-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center">
              <span className="text-white dark:text-slate-900 font-bold text-lg">RH</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tf-text">RH-Studio</h1>
              <p className="text-xs tf-muted">Production Department</p>
            </div>
          </div>
          <h2 className="text-4xl font-semibold leading-tight tf-text">
            Production tracking for video podcast studios.
          </h2>
          <p className="tf-muted text-base leading-relaxed">
            From rough cut to delivery — one workspace for operations managers, writers, and video editors.
            Track episodes through a 7-stage pipeline, manage brand assets, and ship shorts on time.
            RH-Studio — Production Department.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { label: 'Pipeline stages', value: '7' },
              { label: 'Team roles', value: '3' },
              { label: 'Views', value: '4' },
              { label: 'Brand hubs', value: '3' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border tf-border p-3">
                <div className="text-2xl font-semibold tf-text">{s.value}</div>
                <div className="text-xs tf-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Auth card */}
        <div className="tf-card border tf-border rounded-2xl p-6 sm:p-8 tf-fade-in">
          <div className="flex lg:hidden items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center">
              <span className="text-white dark:text-slate-900 font-bold text-sm">RH</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tf-text">RH-Studio</h1>
              <p className="text-xs tf-muted">Production Department</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold tf-text mb-1">
            {mode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}
          </h3>
          <p className="text-sm tf-muted mb-5">
            {mode === 'signin' ? 'Welcome back. Pick a role below to explore.' : 'Join the studio workspace — pick your role.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium tf-muted mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 tf-muted" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="tf-input w-full pl-9"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium tf-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 tf-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  className="tf-input w-full pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium tf-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 tf-muted" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="tf-input w-full pl-9"
                />
              </div>
            </div>
            {mode === 'signup' && (
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
                        role === r
                          ? 'tf-text'
                          : 'tf-muted border-[var(--border)] hover:tf-text'
                      }`}
                      style={role === r ? { borderColor: ROLE_COLORS[r], backgroundColor: `${ROLE_COLORS[r]}1A`, color: ROLE_COLORS[r] } : {}}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-500 bg-red-500/10 rounded-md px-3 py-2">{error}</div>
            )}

            <button type="submit" disabled={busy} className="tf-btn tf-btn-primary w-full disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'signin' ? <ArrowRight className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
            <span className="text-xs tf-muted">Quick login as role</span>
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DEMO_USERS.map((demo) => (
              <button
                key={demo.email}
                onClick={() => handleQuickLogin(demo)}
                disabled={busyDemo !== null}
                className="flex flex-col items-center gap-2 rounded-lg border tf-border px-2 py-3 text-center hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-60"
              >
                <Avatar name={demo.name} color={demo.avatarColor} size="sm" />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium tf-text truncate">{demo.name.split(' ')[0]}</div>
                  <div className="text-[10px] tf-muted truncate leading-tight">{demo.role === 'Operations Manager' ? 'Ops Mgr' : demo.role}</div>
                </div>
                {busyDemo === demo.email && <Loader2 className="h-3.5 w-3.5 animate-spin tf-muted" />}
              </button>
            ))}
          </div>

          <p className="text-xs tf-muted text-center mt-5">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="font-medium text-blue-500 hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
