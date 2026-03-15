import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { BankAccount } from '@/types';
import { Plus, Edit2, Trash2, Star, Building2, Hash, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import BackupImportSection from '@/components/BackupImportSection';

interface NumberingSettings {
  prefix: string;
  startingNumber: number;
  numberFormat: 'NNNN' | 'NNN' | 'NN' | 'N';
  includeYear: boolean;
  yearFormat: 'YYYY-YY' | 'YYNN' | 'YY';
  separator: string;
}

const DEFAULT_NUMBERING: NumberingSettings = {
  prefix: 'INV', startingNumber: 1, numberFormat: 'NNNN',
  includeYear: true, yearFormat: 'YYNN', separator: '-',
};

function getFinancialYear(fmt: string): string {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  switch (fmt) {
    case 'YYYY-YY': return `${startYear}-${String(endYear).slice(-2)}`;
    case 'YYNN': return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    case 'YY': return String(startYear).slice(-2);
    default: return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
  }
}

function formatPreview(s: NumberingSettings, nextNum?: number): string {
  const num = nextNum || s.startingNumber;
  const padLen = s.numberFormat === 'NNNN' ? 4 : s.numberFormat === 'NNN' ? 3 : s.numberFormat === 'NN' ? 2 : 0;
  const formatted = padLen > 0 ? String(num).padStart(padLen, '0') : String(num);
  const parts = [s.prefix];
  if (s.includeYear) parts.push(getFinancialYear(s.yearFormat));
  parts.push(formatted);
  return parts.join(s.separator);
}

export default function SettingsPage() {
  const { getCurrentUser, updateUser, resetPassword, session, bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, setDefaultBankAccount } = useApp();
  const isMobile = useIsMobile();
  const user = getCurrentUser();
  const [pw, setPw] = useState({ old: '', new1: '', new2: '' });
  const [msg, setMsg] = useState('');
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: '', accountHolderName: '', accountNumber: '', confirmAccountNumber: '',
    ifscCode: '', branchName: '', accountType: 'Current' as BankAccount['accountType'],
    upiId: '', qrCodeLabel: '', isDefault: false, displayLabel: '',
  });
  const [bankError, setBankError] = useState('');

  // Invoice Numbering State
  const [invNum, setInvNum] = useState<NumberingSettings>({ ...DEFAULT_NUMBERING, prefix: user?.invoicePrefix || 'INV' });
  const [purNum, setPurNum] = useState<NumberingSettings>({ ...DEFAULT_NUMBERING, prefix: 'PUR' });
  const [rcptNum, setRcptNum] = useState<NumberingSettings>({ ...DEFAULT_NUMBERING, prefix: 'RCPT' });
  const [cnNum, setCnNum] = useState<NumberingSettings>({ ...DEFAULT_NUMBERING, prefix: 'CN' });
  const [dnNum, setDnNum] = useState<NumberingSettings>({ ...DEFAULT_NUMBERING, prefix: 'DN' });

  if (!user) return null;

  const userBankAccounts = bankAccounts.filter(a => a.userId === session.userId);

  const handlePwChange = () => {
    if (pw.new1 !== pw.new2) { setMsg('Match nahi kar rahe!'); return; }
    const r = resetPassword('old', { username: user.username, oldPassword: pw.old, newPassword: pw.new1 });
    setMsg(r.message);
    if (r.success) setPw({ old: '', new1: '', new2: '' });
  };

  const openAddBank = () => {
    setEditingBank(null);
    setBankForm({ bankName: '', accountHolderName: '', accountNumber: '', confirmAccountNumber: '', ifscCode: '', branchName: '', accountType: 'Current', upiId: '', qrCodeLabel: '', isDefault: userBankAccounts.length === 0, displayLabel: '' });
    setBankError('');
    setShowBankForm(true);
  };

  const openEditBank = (acc: BankAccount) => {
    setEditingBank(acc);
    setBankForm({
      bankName: acc.bankName, accountHolderName: acc.accountHolderName, accountNumber: acc.accountNumber,
      confirmAccountNumber: acc.accountNumber, ifscCode: acc.ifscCode, branchName: acc.branchName || '',
      accountType: acc.accountType, upiId: acc.upiId || '', qrCodeLabel: acc.qrCodeLabel || '',
      isDefault: acc.isDefault, displayLabel: acc.displayLabel || '',
    });
    setBankError('');
    setShowBankForm(true);
  };

  const saveBankAccount = () => {
    if (!bankForm.bankName || !bankForm.accountHolderName || !bankForm.accountNumber || !bankForm.ifscCode) {
      setBankError('Please fill all required fields'); return;
    }
    if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
      setBankError('Account numbers do not match'); return;
    }
    if (bankForm.ifscCode.length !== 11) {
      setBankError('IFSC must be 11 characters'); return;
    }
    if (editingBank) {
      updateBankAccount(editingBank.id, {
        bankName: bankForm.bankName, accountHolderName: bankForm.accountHolderName,
        accountNumber: bankForm.accountNumber, ifscCode: bankForm.ifscCode,
        branchName: bankForm.branchName || undefined, accountType: bankForm.accountType,
        upiId: bankForm.upiId || undefined, qrCodeLabel: bankForm.qrCodeLabel || undefined,
        isDefault: bankForm.isDefault, displayLabel: bankForm.displayLabel || undefined,
      });
    } else {
      addBankAccount({
        userId: session.userId, bankName: bankForm.bankName, accountHolderName: bankForm.accountHolderName,
        accountNumber: bankForm.accountNumber, ifscCode: bankForm.ifscCode,
        branchName: bankForm.branchName || undefined, accountType: bankForm.accountType,
        upiId: bankForm.upiId || undefined, qrCodeLabel: bankForm.qrCodeLabel || undefined,
        isDefault: bankForm.isDefault || userBankAccounts.length === 0,
        displayLabel: bankForm.displayLabel || undefined,
      });
    }
    setShowBankForm(false);
  };

  const handleDeleteBank = (acc: BankAccount) => {
    if (acc.isDefault && userBankAccounts.length > 1) {
      if (!confirm('This is your default account. Delete anyway?')) return;
    }
    if (userBankAccounts.length === 1) {
      alert('Cannot delete the only bank account'); return;
    }
    if (confirm('Delete this bank account?')) {
      deleteBankAccount(acc.id);
      if (acc.isDefault) {
        const remaining = userBankAccounts.filter(a => a.id !== acc.id);
        if (remaining.length > 0) setDefaultBankAccount(remaining[0].id);
      }
    }
  };

  const maskAccount = (num: string) => 'XXXX' + num.slice(-4);

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <h1 className="text-xl md:text-2xl font-display font-bold">Settings</h1>

      {/* Firm Details */}
      <div className="hero-card space-y-3">
        <h3 className="font-display font-semibold text-sm">Firm Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'firmName', label: 'Firm Name' }, { key: 'gstNumber', label: 'GST' },
            { key: 'address', label: 'Address' }, { key: 'city', label: 'City' },
            { key: 'state', label: 'State' }, { key: 'stateCode', label: 'State Code' },
            { key: 'invoicePrefix', label: 'Invoice Prefix' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground">{f.label}</label>
              <input value={(user as any)[f.key] || ''} onChange={e => updateUser(user.id, { [f.key]: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={user.showStockToEmployees || false} onChange={e => updateUser(user.id, { showStockToEmployees: e.target.checked })} />
          Employees ko stock dikhao
        </label>
      </div>

      {/* Invoice Numbering */}
      <div className="hero-card space-y-4">
        <h3 className="font-display font-semibold text-sm flex items-center gap-1.5"><Hash className="h-4 w-4" /> Invoice Numbering</h3>
        <p className="text-xs text-muted-foreground">These settings apply to all new invoices. Existing invoices keep their original numbers.</p>
        
        {[
          { label: 'Invoice', state: invNum, setter: setInvNum },
          { label: 'Purchase', state: purNum, setter: setPurNum },
          { label: 'Receipt', state: rcptNum, setter: setRcptNum },
          { label: 'Credit Note', state: cnNum, setter: setCnNum },
          { label: 'Debit Note', state: dnNum, setter: setDnNum },
        ].map(({ label, state, setter }) => (
          <div key={label} className="rounded-md border p-3 space-y-3">
            <div className="font-display font-semibold text-xs">{label} Numbers</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Prefix</label>
                <input value={state.prefix} onChange={e => setter(p => ({ ...p, prefix: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Starting Number</label>
                <input type="number" value={state.startingNumber} onChange={e => setter(p => ({ ...p, startingNumber: parseInt(e.target.value) || 1 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Format</label>
                <select value={state.numberFormat} onChange={e => setter(p => ({ ...p, numberFormat: e.target.value as any }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="NNNN">0001 (4 digits)</option>
                  <option value="NNN">001 (3 digits)</option>
                  <option value="NN">01 (2 digits)</option>
                  <option value="N">1 (plain)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Separator</label>
                <input value={state.separator} onChange={e => setter(p => ({ ...p, separator: e.target.value.slice(0, 1) }))} maxLength={1} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={state.includeYear} onChange={e => setter(p => ({ ...p, includeYear: e.target.checked }))} /> Include FY</label>
              </div>
              {state.includeYear && (
                <div>
                  <label className="text-xs text-muted-foreground">Year Format</label>
                  <select value={state.yearFormat} onChange={e => setter(p => ({ ...p, yearFormat: e.target.value as any }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="YYNN">2526 (short)</option>
                    <option value="YYYY-YY">2025-26 (full)</option>
                    <option value="YY">25 (start only)</option>
                  </select>
                </div>
              )}
            </div>
            {/* Live Preview */}
            <div className="rounded-md bg-accent/50 border border-primary/20 p-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground">Next {label} Number Preview</div>
                <div className="font-display font-bold text-lg text-primary">{formatPreview(state)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bank Accounts */}
      <div className="hero-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Bank Accounts</h3>
          <button onClick={openAddBank} className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground flex items-center gap-1"><Plus className="h-3 w-3" /> Add Account</button>
        </div>

        {userBankAccounts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No bank accounts added yet</p>
            <button onClick={openAddBank} className="mt-2 text-primary text-xs hover:underline">Add your first bank account</button>
          </div>
        ) : (
          <div className="grid gap-3">
            {userBankAccounts.map(acc => (
              <div key={acc.id} className={cn("rounded-lg border p-3 transition-all", acc.isDefault && "border-primary/50 bg-accent/30")}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm">{acc.displayLabel || acc.bankName}</span>
                      {acc.isDefault && <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"><Star className="h-2.5 w-2.5" /> Default</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{acc.bankName} · {maskAccount(acc.accountNumber)}</div>
                    <div className="text-xs text-muted-foreground">{acc.accountHolderName} · IFSC: {acc.ifscCode}</div>
                    {acc.branchName && <div className="text-xs text-muted-foreground">Branch: {acc.branchName}</div>}
                    <div className="text-xs text-muted-foreground">{acc.accountType}{acc.upiId ? ` · UPI: ${acc.upiId}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!acc.isDefault && <button onClick={() => setDefaultBankAccount(acc.id)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-primary" title="Set as default"><Star className="h-3.5 w-3.5" /></button>}
                    <button onClick={() => openEditBank(acc)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeleteBank(acc)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bank Account Form Modal */}
        {showBankForm && (
          <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg border shadow-xl w-full max-w-md p-5 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
              <h3 className="font-display font-bold text-lg">{editingBank ? 'Edit' : 'Add'} Bank Account</h3>
              {bankError && <div className="rounded-md bg-destructive/10 text-destructive text-xs p-2">{bankError}</div>}
              <div className="space-y-3">
                <div><label className="text-xs text-muted-foreground">Bank Name <span className="text-destructive">*</span></label><input value={bankForm.bankName} onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Account Holder Name <span className="text-destructive">*</span></label><input value={bankForm.accountHolderName} onChange={e => setBankForm(p => ({ ...p, accountHolderName: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Account Number <span className="text-destructive">*</span></label><input value={bankForm.accountNumber} onChange={e => setBankForm(p => ({ ...p, accountNumber: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Confirm Account Number <span className="text-destructive">*</span></label><input value={bankForm.confirmAccountNumber} onChange={e => setBankForm(p => ({ ...p, confirmAccountNumber: e.target.value }))} className={cn("mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm", bankForm.confirmAccountNumber && bankForm.confirmAccountNumber !== bankForm.accountNumber && "border-destructive")} /></div>
                <div><label className="text-xs text-muted-foreground">IFSC Code <span className="text-destructive">*</span></label><input value={bankForm.ifscCode} onChange={e => setBankForm(p => ({ ...p, ifscCode: e.target.value.toUpperCase() }))} maxLength={11} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />{bankForm.ifscCode && bankForm.ifscCode.length !== 11 && <span className="text-xs text-destructive">Must be 11 characters</span>}</div>
                <div><label className="text-xs text-muted-foreground">Branch Name</label><input value={bankForm.branchName} onChange={e => setBankForm(p => ({ ...p, branchName: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Account Type</label>
                  <select value={bankForm.accountType} onChange={e => setBankForm(p => ({ ...p, accountType: e.target.value as any }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="Current">Current</option><option value="Savings">Savings</option><option value="OD Account">OD Account</option>
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">UPI ID (Optional)</label><input value={bankForm.upiId} onChange={e => setBankForm(p => ({ ...p, upiId: e.target.value }))} placeholder="name@bank" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Display Label (Short name)</label><input value={bankForm.displayLabel} onChange={e => setBankForm(p => ({ ...p, displayLabel: e.target.value }))} placeholder="e.g. SBI Main" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bankForm.isDefault} onChange={e => setBankForm(p => ({ ...p, isDefault: e.target.checked }))} /> Set as Default</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveBankAccount} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Save</button>
                <button onClick={() => setShowBankForm(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password */}
      <div className="hero-card space-y-3">
        <h3 className="font-display font-semibold text-sm">Password Badlein</h3>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
          <div><label className="text-xs text-muted-foreground">Purana</label><input type="password" value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground">Naya</label><input type="password" value={pw.new1} onChange={e => setPw(p => ({ ...p, new1: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground">Confirm</label><input type="password" value={pw.new2} onChange={e => setPw(p => ({ ...p, new2: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
        </div>
        {msg && <p className="text-sm text-primary">{msg}</p>}
        <button onClick={handlePwChange} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Badlein</button>
      </div>

      {/* Terms */}
      <div className="hero-card space-y-3">
        <h3 className="font-display font-semibold text-sm">Terms & Conditions</h3>
        <textarea value={user.termsAndConditions || ''} onChange={e => updateUser(user.id, { termsAndConditions: e.target.value })} rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>

      {/* Backup & Import */}
      <BackupImportSection />
    </div>
  );
}