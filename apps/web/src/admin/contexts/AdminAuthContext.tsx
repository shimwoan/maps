import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@monorepo/shared/src/lib/supabase';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  password: string | null;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_AUTH_KEY = 'admin_auth_token';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 저장된 인증 정보 확인
    const stored = sessionStorage.getItem(ADMIN_AUTH_KEY);
    if (stored) {
      setPassword(stored);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (inputPassword: string): Promise<boolean> => {
    try {
      // Edge Function을 통해 비밀번호 검증
      const { data, error } = await supabase.functions.invoke('admin-stats', {
        headers: {
          'x-admin-password': inputPassword,
        },
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data) {
        sessionStorage.setItem(ADMIN_AUTH_KEY, inputPassword);
        setPassword(inputPassword);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setPassword(null);
    setIsAuthenticated(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, password, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
