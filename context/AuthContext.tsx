'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: { email: string } | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 1. Check if window is defined upfront
  const isClient = typeof window !== 'undefined';

  // 2. Initialize state directly from localStorage
  const [user, setUser] = useState<{ email: string } | null>(() => {
    if (isClient) {
      const token = localStorage.getItem('auth_token');
      const savedEmail = localStorage.getItem('user_email');
      if (token && savedEmail) {
        return { email: savedEmail };
      }
    }
    return null;
  });

  // 3. Since the state calculation above happens instantly during initialization,
  // we are only "loading" if we are still on the server side (pre-hydration).
  // On the client mount, this evaluates instantly, meaning no useEffect is needed!
  const [loading] = useState(!isClient);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error };
      }
      
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_email', data.email);
      setUser({ email: data.email });
      
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}