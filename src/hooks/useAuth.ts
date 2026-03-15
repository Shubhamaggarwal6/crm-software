import { createContext, useContext } from 'react';
import type { AppSessionData } from '@/services/authService';

export interface AuthContextType {
  session: AppSessionData;
  loading: boolean;
  effectiveUserId: string;
  role: 'super_admin' | 'owner' | 'employee' | null;
  permissions: any;
  isEmployee: boolean;
  employeeId: string | null;
  firmName: string;
  supabaseToken: string | null;
  login: (type: 'owner' | 'employee', credentials: { email?: string; username?: string; password: string }) => Promise<{ success: boolean; error?: string; warning?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
