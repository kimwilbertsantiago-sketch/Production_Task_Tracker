import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DEMO_USERS, DemoUser, UserRole, ROLES, isDemoEmail } from '@/lib/types';

const VALID_ROLES = new Set<string>(ROLES);
const STALE_ROLE_VALUES = ['CSR', 'csr', 'Editor'];
const STALE_STATUS_PREFIXES = ['booked', 'recorded', 'ingested', 'rough_cut', 'scripting', 'shorts_teaser', 'internal_qa', 'client_review', 'revisions'];

function isStaleRole(role: unknown): boolean {
  if (typeof role !== 'string') return true;
  if (STALE_ROLE_VALUES.includes(role)) return true;
  return !VALID_ROLES.has(role as UserRole);
}

function clearStaleStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('taskflow')) {
        const val = localStorage.getItem(key) ?? '';
        const lower = val.toLowerCase();
        if (STALE_STATUS_PREFIXES.some((p) => lower.includes(p)) || lower.includes('"csr"')) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // localStorage may be unavailable; ignore
  }
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: DemoUser | null;
  isDemoUser: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  quickLogin: (demoUser: DemoUser) => Promise<{ error: string | null }>;
  updateProfile: (patch: { name?: string; role?: UserRole; avatarUrl?: string | null }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function matchDemoUser(email: string): DemoUser | null {
  return DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

function deriveProfileFromMeta(user: User | null): DemoUser | null {
  if (!user) return null;
  const demo = matchDemoUser(user.email ?? '');
  if (demo) return demo;
  const meta = user.user_metadata ?? {};
  const name = (meta.name as string) || (user.email?.split('@')[0] ?? 'User');
  const role = isStaleRole(meta.role) ? 'Operations Manager' : (meta.role as UserRole);
  return {
    email: user.email ?? '',
    password: '',
    name,
    role,
    defaultView: (meta.defaultView as string) ?? 'kanban',
    avatarColor: (meta.avatarColor as string) ?? '#64748B',
    avatarUrl: (meta.avatarUrl as string | null) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DemoUser | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearStaleStorage();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setProfile(deriveProfileFromMeta(data.session?.user ?? null));
      setIsDemoUser(isDemoEmail(data.session?.user?.email));
      setLoading(false);
    }).catch(() => {
      clearStaleStorage();
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setProfile(deriveProfileFromMeta(newSession?.user ?? null));
        setIsDemoUser(isDemoEmail(newSession?.user?.email));
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, defaultView: 'kanban', avatarColor: '#64748B' } },
    });
    if (error) return { error: error.message };
    // If signup succeeded and returned a session, the user is logged in.
    // The role is now stored in user_metadata and will be read by deriveProfileFromMeta.
    if (data.user) {
      setSession(data.session);
      setUser(data.user);
      setProfile(deriveProfileFromMeta(data.user));
      setIsDemoUser(isDemoEmail(data.user.email));
    }
    return { error: null };
  };

  const quickLogin = async (demoUser: DemoUser) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: demoUser.email,
      password: demoUser.password,
    });
    if (error) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: demoUser.email,
        password: demoUser.password,
        options: { data: { name: demoUser.name, role: demoUser.role, defaultView: demoUser.defaultView, avatarColor: demoUser.avatarColor } },
      });
      if (signUpError) return { error: signUpError.message };
      if (data.user) {
        setSession(data.session);
        setUser(data.user);
        setProfile(deriveProfileFromMeta(data.user));
        setIsDemoUser(isDemoEmail(data.user.email));
      }
      const { error: retryError } = await supabase.auth.signInWithPassword({
        email: demoUser.email,
        password: demoUser.password,
      });
      return { error: retryError?.message ?? null };
    }
    return { error: null };
  };

  const updateProfile = async (patch: { name?: string; role?: UserRole; avatarUrl?: string | null }) => {
    if (!user) return { error: 'Not signed in' };
    const metaUpdate: Record<string, string | null> = {};
    if (patch.name !== undefined) metaUpdate.name = patch.name;
    if (patch.role !== undefined) metaUpdate.role = patch.role;
    if (patch.avatarUrl !== undefined) metaUpdate.avatarUrl = patch.avatarUrl;
    try {
      const { error: userMetaError } = await supabase.auth.updateUser({ data: metaUpdate });
      if (userMetaError) return { error: userMetaError.message };
      const profileUpdate: Record<string, string | null> = {};
      if (patch.name !== undefined) profileUpdate.full_name = patch.name;
      if (patch.role !== undefined) profileUpdate.role = patch.role;
      if (patch.avatarUrl !== undefined) profileUpdate.avatar_url = patch.avatarUrl;
      const { error: profileError } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
      if (profileError) return { error: profileError.message };
      if (patch.name !== undefined || patch.avatarUrl !== undefined) {
        const tmUpdate: Record<string, string | null> = {};
        if (patch.name !== undefined) tmUpdate.name = patch.name;
        if (patch.avatarUrl !== undefined) tmUpdate.avatar_url = patch.avatarUrl;
        if (patch.role !== undefined) tmUpdate.role = patch.role;
        await supabase.from('team_members').update(tmUpdate).eq('user_id', user.id);
      }
      const { data: refreshed } = await supabase.auth.getUser();
      const updatedUser = refreshed.user;
      if (updatedUser) {
        setUser(updatedUser);
        setProfile(deriveProfileFromMeta(updatedUser));
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update profile' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsDemoUser(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isDemoUser, loading, signIn, signUp, signOut, quickLogin, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function canManageTasks(role: UserRole | undefined | null): boolean {
  return role === 'Operations Manager';
}

export function canDeleteTasks(role: UserRole | undefined | null): boolean {
  return role === 'Operations Manager';
}
