import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isDispo: boolean;
  isLager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const mapSupabaseUser = (raw: any): User => {
    const metaRole = (raw?.user_metadata?.role || '').toString().toUpperCase() as UserRole;
    let role = Object.values(UserRole).includes(metaRole) ? metaRole : UserRole.DISPO;

    // Hard-assign admin for specific accounts if metadata is missing
    const adminEmails = ['benedikt.niewels@werny.de', 'benedikt.niewels@gmail.com'];
    if (adminEmails.includes((raw.email || '').toLowerCase())) {
      role = UserRole.ADMIN;
    }

    return {
      id: raw.id,
      email: raw.email,
      username: raw.email?.split('@')[0] || 'user',
      role,
      isActive: true,
      lastLogin: raw.last_sign_in_at || undefined,
    };
  };

  const login = async (email: string, password: string) => {
    if (!supabase) return false;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      console.warn('Supabase login failed', error);
      return false;
    }
    setUser(mapSupabaseUser(data.session.user));
    return true;
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  // Keep session in sync
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(mapSupabaseUser(data.session.user));
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    login,
    logout,
    isAdmin: user?.role === UserRole.ADMIN,
    isDispo: user?.role === UserRole.DISPO || user?.role === UserRole.ADMIN,
    isLager: user?.role === UserRole.LAGER || user?.role === UserRole.ADMIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
