import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext, type AuthContextType } from '@/hooks/useAuth';
import type { AppSessionData, OwnerSession, EmployeeSession, AdminSession } from '@/services/authService';
import { loginOwner, loginEmployee, logoutOwner } from '@/services/authService';

const EMPLOYEE_SESSION_KEY = 'billsaathi_employee_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSessionData>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);

  // Restore employee session from localStorage
  const restoreEmployeeSession = useCallback(() => {
    try {
      const stored = localStorage.getItem(EMPLOYEE_SESSION_KEY);
      if (stored) {
        const emp: EmployeeSession = JSON.parse(stored);
        // Check if subscription is still valid
        if (emp.ownerSubEnd) {
          const subEnd = new Date(emp.ownerSubEnd);
          if (subEnd < new Date()) {
            localStorage.removeItem(EMPLOYEE_SESSION_KEY);
            return null;
          }
        }
        return emp;
      }
    } catch {
      localStorage.removeItem(EMPLOYEE_SESSION_KEY);
    }
    return null;
  }, []);

  // Resolve session from Supabase user (called outside onAuthStateChange to avoid deadlock)
  const resolveSession = useCallback(async (supaSession: any) => {
    if (!supaSession?.user) return null;
    setSupabaseToken(supaSession.access_token);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', supaSession.user.id).single();
    if (!profile) return null;

    if (profile.role === 'super_admin') {
      return { type: 'super_admin' as const, userId: supaSession.user.id, email: supaSession.user.email! };
    } else if (profile.role === 'owner') {
      const { data: ownerProfile } = await supabase.from('owner_profiles').select('*').eq('id', supaSession.user.id).single();
      if (ownerProfile && ownerProfile.active) {
        return { type: 'owner' as const, userId: supaSession.user.id, email: supaSession.user.email!, profile, ownerProfile };
      } else {
        await supabase.auth.signOut();
        return null;
      }
    }
    return null;
  }, []);

  // Initialize: listen for Supabase auth changes + check employee session
  useEffect(() => {
    let mounted = true;

    // First restore session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      if (initialSession?.user) {
        const resolved = await resolveSession(initialSession);
        if (mounted) {
          setSession(resolved);
          setLoading(false);
        }
      } else {
        const empSession = restoreEmployeeSession();
        if (mounted) {
          setSession(empSession);
          setLoading(false);
        }
      }
    });

    // Then listen for subsequent changes (don't await inside callback!)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, supaSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setSupabaseToken(null);
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION') return; // handled by getSession above

      if (supaSession?.user) {
        // Use setTimeout to avoid deadlock in onAuthStateChange
        setTimeout(() => {
          resolveSession(supaSession).then(resolved => {
            if (mounted) {
              setSession(resolved);
              setLoading(false);
            }
          });
        }, 0);
      } else {
        const empSession = restoreEmployeeSession();
        if (empSession) setSession(empSession);
        else setSession(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [restoreEmployeeSession, resolveSession]);

  const login: AuthContextType['login'] = useCallback(async (type, credentials) => {
    if (type === 'owner') {
      const result = await loginOwner(credentials.email!, credentials.password);
      if (!result.success) return { success: false, error: result.error };
      // Session will be set by onAuthStateChange listener
      return { success: true, warning: (result as any).warning };
    } else {
      const result = await loginEmployee(credentials.username!, credentials.password);
      if (!result.success) return { success: false, error: result.error };
      // Store employee session in localStorage
      localStorage.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify(result.session));
      setSession(result.session!);
      return { success: true };
    }
  }, []);

  const logout = useCallback(async () => {
    if (session?.type === 'employee') {
      localStorage.removeItem(EMPLOYEE_SESSION_KEY);
      setSession(null);
    } else {
      await logoutOwner();
      // onAuthStateChange will handle setting session to null
    }
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (!session || session.type === 'employee') return;
    const userId = session.userId;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (session.type === 'owner') {
      const { data: ownerProfile } = await supabase.from('owner_profiles').select('*').eq('id', userId).single();
      setSession({ type: 'owner', userId, email: session.email, profile, ownerProfile });
    }
  }, [session]);

  // Derived values
  const role: AuthContextType['role'] = session
    ? session.type === 'super_admin' ? 'super_admin'
    : session.type === 'owner' ? 'owner'
    : 'employee'
    : null;

  const effectiveUserId = session
    ? session.type === 'employee' ? session.ownerId : session.userId
    : '';

  const isEmployee = session?.type === 'employee';
  const employeeId = session?.type === 'employee' ? session.employeeId : null;
  const permissions = session?.type === 'employee' ? session.permissions : null;
  const firmName = session?.type === 'owner'
    ? session.ownerProfile?.firm_name || ''
    : session?.type === 'employee'
    ? session.ownerFirmName || ''
    : '';

  return (
    <AuthContext.Provider value={{
      session, loading, effectiveUserId, role, permissions, isEmployee, employeeId,
      firmName, supabaseToken, login, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
