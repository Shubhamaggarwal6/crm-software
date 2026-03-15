import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Shield, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Partner {
  id: string;
  ownerId: string;
  active: boolean;
  accessLevel: string;
  roleLabel: string;
  createdAt: string;
  // joined profile data
  fullName?: string;
  email?: string;
  phone?: string;
}

const ACCESS_LEVELS = [
  { value: 'full', label: 'Full Access', desc: 'Can manage everything except subscription & account deletion' },
  { value: 'view_only', label: 'View Only', desc: 'Can view all data but cannot create/edit/delete' },
  { value: 'sales', label: 'Sales Only', desc: 'Can manage invoices, customers, payments' },
  { value: 'inventory', label: 'Inventory Only', desc: 'Can manage products, purchases, suppliers' },
];

export default function PartnersPage() {
  const { session } = useApp();
  const isMobile = useIsMobile();
  const userId = session.userId;

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({ email: '', roleLabel: '', accessLevel: 'full' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPartners(); }, [userId]);

  async function fetchPartners() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', userId);
      if (error) throw error;

      // Fetch profile info for each partner
      const partnerList: Partner[] = [];
      for (const p of (data || [])) {
        let profile: any = null;
        const { data: pData } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', p.id)
          .single();
        profile = pData;

        partnerList.push({
          id: p.id,
          ownerId: p.owner_id,
          active: p.active ?? true,
          accessLevel: p.access_level || 'full',
          roleLabel: p.role_label || 'Partner',
          createdAt: p.created_at || '',
          fullName: profile?.full_name || '',
          email: profile?.email || '',
          phone: profile?.phone || '',
        });
      }
      setPartners(partnerList);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  async function addPartner() {
    if (!form.email.trim()) { toast.error('Enter partner email'); return; }
    setSaving(true);
    try {
      // Find the user by email in profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', form.email.trim().toLowerCase());
      if (pErr) throw pErr;
      if (!profiles || profiles.length === 0) {
        toast.error('No user found with this email. They must sign up first.');
        setSaving(false);
        return;
      }
      const target = profiles[0];
      if (target.id === userId) {
        toast.error('Cannot add yourself as a partner');
        setSaving(false);
        return;
      }
      // Check if already a partner
      const existing = partners.find(p => p.id === target.id);
      if (existing) {
        toast.error('This user is already a partner');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('partners').insert({
        id: target.id,
        owner_id: userId,
        role_label: form.roleLabel || 'Partner',
        access_level: form.accessLevel,
        active: true,
      });
      if (error) throw error;
      toast.success('Partner added ✅');
      setShowAddDialog(false);
      setForm({ email: '', roleLabel: '', accessLevel: 'full' });
      fetchPartners();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function toggleActive(partnerId: string, current: boolean) {
    const { error } = await supabase.from('partners').update({ active: !current }).eq('id', partnerId);
    if (error) toast.error(error.message);
    else { toast.success(current ? 'Partner deactivated' : 'Partner activated'); fetchPartners(); }
  }

  async function removePartner(partnerId: string) {
    if (!confirm('Remove this partner? They will lose access.')) return;
    const { error } = await supabase.from('partners').delete().eq('id', partnerId);
    if (error) toast.error(error.message);
    else { toast.success('Partner removed'); fetchPartners(); }
  }

  async function updateAccess(partnerId: string, level: string) {
    const { error } = await supabase.from('partners').update({ access_level: level }).eq('id', partnerId);
    if (error) toast.error(error.message);
    else { toast.success('Access updated'); fetchPartners(); }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" /> Partners
        </h1>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add Partner
        </Button>
      </div>

      <div className="hero-card">
        <p className="text-sm text-muted-foreground">
          Partners are secondary administrators who can access your business data. They must have an existing account.
          Partners cannot delete your account or change your subscription.
        </p>
      </div>

      {partners.length === 0 ? (
        <div className="hero-card text-center text-muted-foreground py-8">
          No partners added yet. Click "Add Partner" to invite someone.
        </div>
      ) : (
        <div className="space-y-2">
          {partners.map(p => {
            const accessInfo = ACCESS_LEVELS.find(a => a.value === p.accessLevel);
            return (
              <div key={p.id} className="hero-card">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {p.fullName || p.email || 'Unknown'}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {p.email && <span>{p.email}</span>}
                      {p.phone && <span>• {p.phone}</span>}
                      <span>• Role: {p.roleLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(p.id, p.active)} title={p.active ? 'Deactivate' : 'Activate'}>
                      {p.active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <button onClick={() => removePartner(p.id)} className="text-destructive/60 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={p.accessLevel}
                    onChange={e => updateAccess(p.id, e.target.value)}
                    className="text-xs border rounded-md px-2 py-1 bg-background"
                  >
                    {ACCESS_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  <span className="text-[11px] text-muted-foreground">{accessInfo?.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Partner Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Partner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Partner's Email *</label>
              <input
                type="email"
                placeholder="partner@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded-md p-2 text-sm bg-background"
              />
              <p className="text-[11px] text-muted-foreground mt-1">The partner must already have a BillSaathi account</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role Label</label>
              <input
                placeholder="e.g. Co-Owner, Manager, Accountant"
                value={form.roleLabel}
                onChange={e => setForm({ ...form, roleLabel: e.target.value })}
                className="w-full border rounded-md p-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Access Level</label>
              <div className="space-y-1.5 mt-1">
                {ACCESS_LEVELS.map(a => (
                  <label key={a.value} className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors ${form.accessLevel === a.value ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <input
                      type="radio"
                      name="access"
                      value={a.value}
                      checked={form.accessLevel === a.value}
                      onChange={() => setForm({ ...form, accessLevel: a.value })}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{a.label}</div>
                      <div className="text-[11px] text-muted-foreground">{a.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={addPartner} disabled={saving}>{saving ? 'Adding...' : 'Add Partner'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
