import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me().then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  // Fired by the Axios interceptor when a protected call returns 401 (expired or invalid token)
  useEffect(() => {
    const onExpired = () => { setUser((u) => { if (u) toast.info('Your session expired. Please sign in again.'); return null; }); };
    window.addEventListener('edusync:unauthorized', onExpired);
    return () => window.removeEventListener('edusync:unauthorized', onExpired);
  }, [toast]);

  const login = useCallback(async (body) => { const d = await authApi.login(body); setUser(d.user); return d.user; }, []);
  const register = useCallback(async (body) => { const d = await authApi.register(body); setUser(d.user); return d.user; }, []);
  const logout = useCallback(async () => { try { await authApi.logout(); } finally { setUser(null); } }, []);

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
