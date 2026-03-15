import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { defaultPermissions, EmployeePermissions } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const PERM_KEYS: { key: keyof EmployeePermissions; labelKey: string; emoji: string; description: string }[] = [
  { key: 'createInvoice', labelKey: 'perm.createInvoice', emoji: '🧾', description: 'Can create new invoices via chatbot or form' },
  { key: 'addCustomer', labelKey: 'perm.addCustomer', emoji: '👥', description: 'Can add and edit customers' },
  { key: 'addProduct', labelKey: 'perm.addProduct', emoji: '📦', description: 'Can add and edit products' },
  { key: 'viewReports', labelKey: 'perm.viewReports', emoji: '📊', description: 'Can view business reports' },
  { key: 'viewCustomerProfile', labelKey: 'perm.viewCustomerProfile', emoji: '👤', description: 'Can view customer profiles and ledger' },
  { key: 'editInvoiceStatus', labelKey: 'perm.editInvoiceStatus', emoji: '✏️', description: 'Can change invoice payment status' },
  { key: 'addPayment', labelKey: 'perm.addPayment', emoji: '💰', description: 'Can record payment entries' },
  { key: 'viewStock', labelKey: 'perm.viewStock', emoji: '📋', description: 'Can view stock levels and movements' },
  { key: 'viewPurchases', labelKey: 'perm.viewPurchases', emoji: '🛒', description: 'Can view purchase records' },
];

export default function EmployeesPage() {
  const { session, employees, addEmployee, updateEmployee, deleteEmployee, invoices, users } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const user = users.find(u => u.id === session.userId);
  const userEmployees = employees.filter(e => e.userId === session.userId);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [perms, setPerms] = useState<EmployeePermissions>({ ...defaultPermissions });
  const [saveMessage, setSaveMessage] = useState('');

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteMode, setDeleteMode] = useState<'deactivate' | 'delete'>('deactivate');

  useEffect(() => {
    if (editId) {
      const emp = userEmployees.find(e => e.id === editId);
      if (emp) setPerms({ ...defaultPermissions, ...(emp.permissions || {}) });
    }
  }, [editId]);

  const enabledCount = Object.values(perms).filter(Boolean).length;

  const handleAdd = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return;
    if (user && userEmployees.length >= user.maxEmployees) { alert(t('emp.maxReached')); return; }
    addEmployee({
      userId: session.userId, name: form.name, username: form.username,
      password: form.password, active: true,
      createdAt: new Date().toISOString().split('T')[0],
      permissions: { ...perms },
    });
    setShowAdd(false);
    setForm({ name: '', username: '', password: '' });
    setPerms({ ...defaultPermissions });
    setSaveMessage(`Employee added with ${enabledCount} permissions enabled`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleEditPerms = (empId: string) => {
    if (editId === empId) { setEditId(null); return; }
    setEditId(empId);
  };

  const handleSavePerms = () => {
    if (editId) {
      const permsCopy = { ...perms };
      updateEmployee(editId, { permissions: permsCopy });
      const count = Object.values(permsCopy).filter(Boolean).length;
      setSaveMessage(`Employee saved with ${count} permissions enabled`);
      setTimeout(() => setSaveMessage(''), 3000);
      setEditId(null);
    }
  };

  const handleEnableAll = () => {
    const allOn: EmployeePermissions = { ...defaultPermissions };
    PERM_KEYS.forEach(pk => { allOn[pk.key] = true; });
    setPerms(allOn);
  };

  const handleDisableAll = () => {
    setPerms({ ...defaultPermissions });
  };

  const openDeleteDialog = (emp: { id: string; name: string }) => {
    setDeleteTarget(emp);
    setDeleteConfirmText('');
    setDeleteMode('deactivate');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteMode === 'deactivate') {
      updateEmployee(deleteTarget.id, { active: false });
      setSaveMessage(`${deleteTarget.name} has been deactivated`);
    } else {
      deleteEmployee(deleteTarget.id);
      setSaveMessage(`${deleteTarget.name} has been deleted successfully`);
    }
    setTimeout(() => setSaveMessage(''), 3000);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const canDelete = deleteMode === 'deactivate' || (deleteMode === 'delete' && deleteTarget && deleteConfirmText === deleteTarget.name);

  const PermissionsGrid = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground">🔐 Employee Permissions</h4>
        <div className="flex gap-2">
          <button onClick={handleEnableAll} className="text-[10px] px-2 py-1 rounded border hover:bg-accent">Enable All</button>
          <button onClick={handleDisableAll} className="text-[10px] px-2 py-1 rounded border hover:bg-accent">Disable All</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {PERM_KEYS.map(pk => (
          <label key={pk.key} className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${perms[pk.key] ? 'bg-primary/5 border-primary/30' : 'hover:bg-accent'}`}>
            <div className="relative">
              <input type="checkbox" checked={perms[pk.key]} onChange={e => setPerms(p => ({ ...p, [pk.key]: e.target.checked }))} className="sr-only" />
              <div className={`w-10 h-5 rounded-full transition-colors ${perms[pk.key] ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${perms[pk.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{pk.emoji} {t(pk.labelKey as any)}</div>
              <div className="text-[10px] text-muted-foreground truncate">{pk.description}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">{enabledCount} of {PERM_KEYS.length} permissions enabled</div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">{t('nav.employees')}</h1>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null); setPerms({ ...defaultPermissions }); }} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"><Plus className="h-3.5 w-3.5" />{t('action.add')}</button>
      </div>
      <p className="text-xs text-muted-foreground">{userEmployees.length}/{user?.maxEmployees || 0} employees</p>

      {saveMessage && (
        <div className="rounded-md bg-green-100 text-green-800 text-sm px-4 py-2 animate-fade-in">✅ {saveMessage}</div>
      )}

      {showAdd && (
        <div className="hero-card space-y-4">
          <h3 className="font-display font-semibold text-sm">➕ New Employee</h3>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
            <div><label className="text-xs text-muted-foreground">{t('form.name')} <span className="text-destructive">*</span></label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">{t('form.username')} <span className="text-destructive">*</span></label><input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">{t('form.password')} <span className="text-destructive">*</span></label><input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
          </div>
          <PermissionsGrid />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{t('action.save')}</button>
            <button onClick={() => setShowAdd(false)} className="rounded-md border px-4 py-2 text-sm">{t('action.cancel')}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {userEmployees.map(emp => {
          const empInvoices = invoices.filter(i => i.createdBy.id === emp.id);
          const isEditing = editId === emp.id;
          const empPerms = emp.permissions || defaultPermissions;
          const empEnabledCount = Object.values(empPerms).filter(Boolean).length;

          return (
            <div key={emp.id} className="hero-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">👷 {emp.name}</div>
                  <div className="text-xs text-muted-foreground">
                    @{emp.username} · Invoices: {empInvoices.length} · Permissions: {empEnabledCount}/{PERM_KEYS.length}
                    {emp.lastActive ? ` · Last: ${new Date(emp.lastActive).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEditPerms(emp.id)} className={`text-xs px-2 py-1 rounded border hover:bg-accent ${isEditing ? 'bg-primary text-primary-foreground' : ''}`}>🔐 Permissions</button>
                  <button onClick={() => updateEmployee(emp.id, { active: !emp.active })} className={`text-xs px-2.5 py-1 rounded ${emp.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {emp.active ? '🟢 Active' : '🔴 Inactive'}
                  </button>
                  <button onClick={() => openDeleteDialog({ id: emp.id, name: emp.name })} className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {PERM_KEYS.map(pk => (
                  <span key={pk.key} className={`text-[10px] px-1.5 py-0.5 rounded ${empPerms[pk.key] ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                    {pk.emoji} {empPerms[pk.key] ? '✓' : '✗'}
                  </span>
                ))}
              </div>

              {isEditing && (
                <div className="border-t pt-3 space-y-3">
                  <PermissionsGrid />
                  <div className="flex gap-2">
                    <button onClick={handleSavePerms} className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">{t('action.save')}</button>
                    <button onClick={() => setEditId(null)} className="rounded-md border px-3 py-1.5 text-xs">{t('action.cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {userEmployees.length === 0 && (
          <div className="hero-card text-center py-8">
            <div className="text-4xl mb-2">👷</div>
            <p className="text-sm text-muted-foreground">{t('misc.noData')}</p>
            <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-primary hover:underline">{t('action.add')}</button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Employee Account
            </DialogTitle>
            <DialogDescription>
              You are about to remove the employee account for <b>{deleteTarget?.name}</b>. This action affects their access immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3 space-y-1.5 text-xs">
              <div>⚠️ The employee will <b>immediately lose access</b> to BillSaathi</div>
              <div>📋 All invoices created by this employee will remain in your records</div>
              <div>🔑 The employee's login credentials will stop working immediately</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">Choose action:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDeleteMode('deactivate')}
                  className={`p-3 rounded-md border text-left text-xs transition-colors ${deleteMode === 'deactivate' ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                >
                  <div className="font-bold">🔒 Deactivate</div>
                  <div className="text-muted-foreground mt-0.5">Block login, keep records. Safer option.</div>
                </button>
                <button
                  onClick={() => setDeleteMode('delete')}
                  className={`p-3 rounded-md border text-left text-xs transition-colors ${deleteMode === 'delete' ? 'border-destructive bg-destructive/5' : 'hover:bg-accent'}`}
                >
                  <div className="font-bold text-destructive">🗑️ Delete Permanently</div>
                  <div className="text-muted-foreground mt-0.5">Remove entirely. Cannot be undone.</div>
                </button>
              </div>
            </div>

            {deleteMode === 'delete' && (
              <div>
                <label className="text-xs text-muted-foreground">Type <b>{deleteTarget?.name}</b> to confirm deletion:</label>
                <input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTarget?.name}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <button onClick={() => setDeleteDialogOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
            <button
              onClick={handleDeleteConfirm}
              disabled={!canDelete}
              className={`rounded-md px-4 py-2 text-sm text-white transition-colors ${deleteMode === 'delete' ? 'bg-destructive hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              {deleteMode === 'deactivate' ? '🔒 Deactivate' : '🗑️ Delete Permanently'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
