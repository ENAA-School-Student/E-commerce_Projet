import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { auth as authApi, users as usersApi, onSessionExpired, setAccessToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // The HttpOnly refresh cookie is the only stored credential, so a reload restores the session by
  // trading it for a new access token. Nothing script-readable is persisted, so there is no XSS token to steal.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await authApi.bootstrap().catch(() => null);
      try {
        const res = await authApi.refresh();
        if (cancelled) return;
        setAccessToken(res.data.token);
        setUser(res.data.user);
      } catch {
        if (!cancelled) setAccessToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    onSessionExpired(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setAccessToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) => {
    const res = await authApi.register(data);
    setAccessToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await usersApi.me();
    setUser(res.data);
  }, []);

  const logout = useCallback(async () => {
    // Exempt from CSRF server-side: it only clears the caller's own cookie, so it can never fail for
    // token reasons — and a failed call would leave the refresh cookie live.
    await authApi.logout().catch(() => null);
    setAccessToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.roles?.includes('ROLE_ADMIN') ?? false;

  return (
    <AuthContext.Provider value={{ user, login, register, refreshUser, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
