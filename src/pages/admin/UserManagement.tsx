import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAdminStats, createOwnerViaAdmin } from '@/services/dataService';
import { supabase } from '@/integrations/supabase/client';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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

export default function UserManagement() {
  const { supabaseToken } = useAuth();
  const [owners, setOwners] = useState<OwnerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [renewUserId, setRenewUserId] = useState<string | null>(null);
  const [renewDuration, setRenewDuration] = useState('30');
  const [renewCustomDate, setRenewCustomDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', firmName: '', gstNumber: '',
    plan: 'Basic', maxEmployees: 2, duration: '365', customEnd: '',
  });

  const loadData = useCallback(async () => {
    if (!supabaseToken) return;
    try {
      const data = await fetchAdminStats(supabaseToken);
      setOwners(data.owners || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [supabaseToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async () => {
    if (!supabaseToken) return;
    setSubmitting(true);
    try {
      const start = new Date().toISOString().split('T')[0];
      let end: string;
      if (form.duration === 'custom') {
        end = form.customEnd;
      } else {
        const d = new Date(); d.setDate(d.getDate() + parseInt(form.duration));
        end = d.toISOString().split('T')[0];
      }
      await createOwnerViaAdmin(supabaseToken, {
        email: form.email, password: form.password, fullName: form.fullName,
        phone: form.phone, firmName: form.firmName, gstNumber: form.gstNumber,
        plan: form.plan, maxEmployees: form.maxEmployees, subStart: start, subEnd: end,
      });
      toast.success('Owner created successfully!');
      setShowAdd(false);
      setForm({ fullName: '', email: '', password: '', phone: '', firmName: '', gstNumber: '', plan: 'Basic', maxEmployees: 2, duration: '365', customEnd: '' });
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSubmitting(false);
  };

  const handleRenew = async (userId: string) => {
    const owner = owners.find(o => o.id === userId);
    if (!owner) return;
    let newEnd: string;
    if (renewDuration === 'custom') {
      newEnd = renewCustomDate;
    } else {
      const base = owner.subEnd ? new Date(owner.subEnd) : new Date();
      if (base < new Date()) base.setTime(new Date().getTime());
      base.setDate(base.getDate() + parseInt(renewDuration));
      newEnd = base.toISOString().split('T')[0];
    }
    const { error } = await supabase.from('owner_profiles').update({ sub_end: newEnd }).eq('id', userId);
    if (error) { toast.error('Renew failed'); return; }
    toast.success('Subscription renewed!');
    setRenewUserId(null);
    await loadData();
  };

  const toggleActive = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase.from('owner_profiles').update({ active: !currentActive }).eq('id', userId);
    if (error) { toast.error('Update failed'); return; }
    toast.success(!currentActive ? 'User activated' : 'User blocked');
    await loadData();
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">User Management</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Naya User
        </button>
      </div>

      {showAdd && (
        <div className="hero-card space-y-4">
          <h3 className="font-display font-semibold">Naya Owner Banayein</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'fullName', label: 'Full Name', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'password', label: 'Password', type: 'text' },
              { key: 'phone', label: 'Phone', type: 'text' },
              { key: 'firmName', label: 'Firm Name', type: 'text' },
              { key: 'gstNumber', label: 'GST Number', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Plan</label>
              <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="Basic">Basic</option><option value="Pro">Pro</option><option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max Employees</label>
              <input type="number" value={form.maxEmployees} onChange={e => setForm(p => ({ ...p, maxEmployees: parseInt(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subscription Duration</label>
              <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="30">1 Month</option><option value="90">3 Months</option><option value="180">6 Months</option><option value="365">1 Year</option><option value="custom">Custom</option>
              </select>
            </div>
            {form.duration === 'custom' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                <input type="date" value={form.customEnd} onChange={e => setForm(p => ({ ...p, customEnd: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submitting ? 'Creating...' : 'User Banayein'}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="hero-card overflow-x-auto">
        <table className="w-full text-sm table-zebra">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 px-3">Firm</th><th className="py-2 px-3">Plan</th><th className="py-2 px-3">Emp</th>
              <th className="py-2 px-3">Start → End</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Active</th><th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {owners.map(u => {
              const sub = getSubStatus(u.subEnd, u.active);
              return (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2.5 px-3"><div className="font-medium">{u.firmName}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                  <td className="py-2.5 px-3">{u.plan}</td>
                  <td className="py-2.5 px-3">{u.employeeCount}/{u.maxEmployees}</td>
                  <td className="py-2.5 px-3 text-xs font-mono">{u.subStart || '—'} → {u.subEnd || '—'}</td>
                  <td className="py-2.5 px-3"><span className={`status-chip-${sub.status}`}>{sub.label}</span></td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => toggleActive(u.id, u.active)} className={`text-xs px-2 py-1 rounded ${u.active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {u.active ? 'Active' : 'Blocked'}
                    </button>
                  </td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => setRenewUserId(renewUserId === u.id ? null : u.id)} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors">
                      <RefreshCw className="h-3 w-3" /> Renew
                    </button>
                    {renewUserId === u.id && (
                      <div className="mt-2 p-3 rounded border bg-background space-y-2">
                        <select value={renewDuration} onChange={e => setRenewDuration(e.target.value)} className="w-full rounded border bg-background px-2 py-1 text-xs">
                          <option value="30">+1 Month</option><option value="90">+3 Months</option><option value="180">+6 Months</option><option value="365">+1 Year</option><option value="custom">Custom Date</option>
                        </select>
                        {renewDuration === 'custom' && (
                          <input type="date" value={renewCustomDate} onChange={e => setRenewCustomDate(e.target.value)} className="w-full rounded border bg-background px-2 py-1 text-xs" />
                        )}
                        <button onClick={() => handleRenew(u.id)} className="w-full rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Renew Karein</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
