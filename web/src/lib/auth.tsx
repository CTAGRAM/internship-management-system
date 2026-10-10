import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setToken, getToken } from './api';
import type { Company, Role, Student, User } from './types';

interface AuthState {
  user: User | null;
  student: Student | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: Record<string, unknown>) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<{ user: User; student?: Student; company?: Company }>('/auth/me');
      setUser(me.user);
      setStudent(me.student ?? null);
      setCompany(me.company ?? null);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const finish = async (res: { token: string; user: User }) => {
    setToken(res.token);
    setUser(res.user);
    await refresh();
    return res.user;
  };

  const value = useMemo<AuthState>(
    () => ({
      user, student, company, loading, refresh,
      login: async (email, password) =>
        finish(await api.post<{ token: string; user: User }>('/auth/login', { email, password })),
      register: async (payload) =>
        finish(await api.post<{ token: string; user: User }>('/auth/register', payload)),
      logout: () => {
        setToken(null);
        setUser(null);
        setStudent(null);
        setCompany(null);
      },
    }),
    // `finish` closes over refresh, which is stable.
    [user, student, company, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Where each role lands after signing in. */
export const homeFor = (role: Role) =>
  role === 'student' ? '/dashboard' : role === 'recruiter' ? '/recruiter' : '/admin';
