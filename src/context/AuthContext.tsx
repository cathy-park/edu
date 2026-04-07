'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type UserSession = 'guest' | { email: string; name: string } | null;

interface AuthContextType {
  user: UserSession;
  isLoading: boolean;
  loginAsGuest: () => void;
  mockLoginWithGoogle: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedSession = localStorage.getItem('edu_auth_session');
    if (savedSession) {
      try {
        setUser(JSON.parse(savedSession));
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const loginAsGuest = () => {
    const session: UserSession = 'guest';
    setUser(session);
    localStorage.setItem('edu_auth_session', JSON.stringify(session));
  };

  const mockLoginWithGoogle = () => {
    const session: UserSession = { 
      email: 'admin@edu-manager.com', 
      name: '관리자' 
    };
    setUser(session);
    localStorage.setItem('edu_auth_session', JSON.stringify(session));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('edu_auth_session');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginAsGuest, mockLoginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
