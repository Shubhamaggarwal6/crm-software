import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchAdminStats } from '@/services/dataService';

interface OwnerData {
  id: string;
  firmName: string;
  plan: string;
  subStart: string | null;
  subEnd: string | null;
  active: boolean;
  maxEmployees: number;
  employeeCount: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
}

interface AdminStats {
  totalOwners: number;
  activeOwners: number;
  expiringThisWeek: number;
  expired: number;
  totalInvoices: number;
  totalRevenue: number;
  owners: OwnerData[];
}

function getSubStatus(subEnd: string | null, active: boolean) {
  if (!active) return { status: 'expired', label: 'Blocked' };
  if (!subEnd) return { status: 'active', label: 'Active' };
  const end = new Date(subEnd);
  const now = new Date();
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: 'expired', label: 'Expired' };
  if (daysLeft <= 7) return { status: 'critical', label: `${daysLeft}d left` };
  return { status: 'active', label: `${daysLeft}d left` };
}

export default function AdminDashboard() {
  const { supabaseToken } = useAuth();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseToken) return;
    setLoading(true);
    fetchAdminStats(supabaseToken)
      .then(data => { setStats(data); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [supabaseToken]);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  if (error) return <div className="text-destructive text-center py-10">{error}</div>;
  if (!stats) return null;

  const expiringOwners = stats.owners.filter(o => {
    const s = getSubStatus(o.subEnd, o.active);
    return s.status === 'critical';
  });
  const expiredOwners = stats.owners.filter(o => {
    const s = getSubStatus(o.subEnd, o.active);
    return s.status === 'expired';
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-display font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Users', value: stats.totalOwners, color: 'text-primary' },
          { label: 'Active', value: stats.activeOwners, color: 'text-success' },
          { label: 'Expiring', value: stats.expiringThisWeek, color: 'text-destructive' },
          { label: 'Expired', value: stats.expired, color: 'text-expired' },
          { label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="hero-card">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-lg md:text-2xl font-display font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {(expiringOwners.length > 0 || expiredOwners.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {expiringOwners.length > 0 && (
            <div className="hero-card border-destructive/30">
              <h3 className="font-display font-semibold text-sm text-destructive mb-2">🔴 Expiring Soon</h3>
              {expiringOwners.map(u => {
                const sub = getSubStatus(u.subEnd, u.active);
                return (
                  <div key={u.id} className="flex justify-between text-sm p-1.5 rounded bg-destructive/5 mb-1">
                    <span>{u.firmName}</span><span className="text-destructive">{sub.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          {expiredOwners.length > 0 && (
            <div className="hero-card border-expired/30">
              <h3 className="font-display font-semibold text-sm text-expired mb-2">⛔ Expired / Blocked</h3>
              {expiredOwners.map(u => (
                <div key={u.id} className="flex justify-between text-sm p-1.5 rounded bg-muted mb-1">
                  <span>{u.firmName}</span><span className="status-chip-expired">{getSubStatus(u.subEnd, u.active).label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users list */}
      {isMobile ? (
        <div className="space-y-2">
          {stats.owners.map(u => {
            const sub = getSubStatus(u.subEnd, u.active);
            return (
              <div key={u.id} className="mobile-card">
                <div className="flex justify-between items-start">
                  <div><div className="font-medium text-sm">{u.firmName}</div><div className="text-xs text-muted-foreground">{u.email} · {u.plan}</div></div>
                  <span className={`status-chip-${sub.status}`}>{sub.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">Emp: {u.employeeCount}/{u.maxEmployees} · {u.subEnd || 'No end date'}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="hero-card overflow-x-auto">
          <h3 className="font-display font-semibold text-sm mb-3">Sab Users</h3>
          <table className="w-full text-sm table-zebra">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">Firm</th><th className="py-2 px-3">Plan</th><th className="py-2 px-3">Emp</th><th className="py-2 px-3">Subscription</th><th className="py-2 px-3">Status</th></tr></thead>
            <tbody>
              {stats.owners.map(u => {
                const sub = getSubStatus(u.subEnd, u.active);
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2.5 px-3"><div className="font-medium">{u.firmName}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                    <td className="py-2.5 px-3">{u.plan}</td>
                    <td className="py-2.5 px-3">{u.employeeCount}/{u.maxEmployees}</td>
                    <td className="py-2.5 px-3 text-xs font-mono">{u.subStart || '—'} → {u.subEnd || '—'}</td>
                    <td className="py-2.5 px-3"><span className={`status-chip-${sub.status}`}>{sub.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
