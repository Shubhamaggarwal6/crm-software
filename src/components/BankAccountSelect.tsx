import { useApp } from '@/context/AppContext';
import { BankAccount, PaymentModeExtended } from '@/types';
import { Banknote, Smartphone, Building2, Landmark, Zap, CreditCard, AlertCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const PAYMENT_MODES: { mode: PaymentModeExtended; icon: React.ReactNode; label: string; desc: string }[] = [
  { mode: 'Cash', icon: <Banknote className="h-5 w-5" />, label: 'Cash', desc: 'Instant' },
  { mode: 'UPI', icon: <Smartphone className="h-5 w-5" />, label: 'UPI', desc: 'Any UPI app' },
  { mode: 'NEFT', icon: <Building2 className="h-5 w-5" />, label: 'NEFT', desc: '2-4 hours' },
  { mode: 'RTGS', icon: <Landmark className="h-5 w-5" />, label: 'RTGS', desc: 'Above ₹2L' },
  { mode: 'IMPS', icon: <Zap className="h-5 w-5" />, label: 'IMPS', desc: 'Instant' },
  { mode: 'Cheque', icon: <CreditCard className="h-5 w-5" />, label: 'Cheque', desc: 'Bank cheque' },
];

interface PaymentFieldsState {
  mode: PaymentModeExtended | null;
  bankAccountId: string;
  ref: string;
  bankName: string;
  chequeNo: string;
  chequeDate: Date | undefined;
  chequeBranch: string;
  receivedBy: string;
  utrNumber: string;
}

interface Props {
  state: PaymentFieldsState;
  onChange: (updates: Partial<PaymentFieldsState>) => void;
}

/** Filter bank accounts based on payment mode */
function filterAccountsByMode(accounts: BankAccount[], mode: PaymentModeExtended | null): BankAccount[] {
  if (!mode || mode === 'Cash') return [];
  if (mode === 'UPI') return accounts.filter(a => a.upiId && a.upiId.trim() !== '');
  // NEFT, RTGS, IMPS, Cheque — all standard bank accounts
  return accounts;
}

export function PaymentModeSection({ state, onChange }: Props) {
  const { session, bankAccounts } = useApp();
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try { navigate = useNavigate(); } catch {}
  
  const userAccounts = bankAccounts.filter(a => a.userId === session.userId);
  const filteredAccounts = filterAccountsByMode(userAccounts, state.mode);
  const defaultAccount = filteredAccounts.find(a => a.isDefault) || filteredAccounts[0];
  const showBankDropdown = state.mode && state.mode !== 'Cash' && filteredAccounts.length > 0;
  const selectedAccount = userAccounts.find(a => a.id === state.bankAccountId);

  const noUpiAccounts = state.mode === 'UPI' && filteredAccounts.length === 0 && userAccounts.length > 0;
  const noBankAccounts = state.mode && state.mode !== 'Cash' && userAccounts.length === 0;

  const maskAccount = (num: string) => 'XXXX' + num.slice(-4);

  const handleModeChange = (mode: PaymentModeExtended) => {
    const updates: Partial<PaymentFieldsState> = { mode, ref: '', bankName: '', chequeNo: '', chequeDate: undefined, chequeBranch: '', receivedBy: '', utrNumber: '' };
    if (mode !== 'Cash') {
      const modeAccounts = filterAccountsByMode(userAccounts, mode);
      const def = modeAccounts.find(a => a.isDefault) || modeAccounts[0];
      updates.bankAccountId = def?.id || '';
    } else {
      updates.bankAccountId = '';
    }
    onChange(updates);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground font-medium">Payment Mode <span className="text-destructive">*</span></label>
      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_MODES.map(pm => (
          <button key={pm.mode} onClick={() => handleModeChange(pm.mode)} type="button"
            className={cn('rounded-md border p-3 text-center transition-all hover:shadow-md', state.mode === pm.mode ? 'border-primary bg-accent ring-2 ring-primary/20' : 'hover:border-primary/30')}>
            <div className="flex justify-center mb-1 text-primary">{pm.icon}</div>
            <div className="font-medium text-xs">{pm.label}</div>
            <div className="text-[10px] text-muted-foreground">{pm.desc}</div>
          </button>
        ))}
      </div>

      {/* No bank accounts warning */}
      {noBankAccounts && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-destructive font-medium">No bank accounts found</p>
            <button onClick={() => navigate?.('/settings')} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add bank account in Settings
            </button>
          </div>
        </div>
      )}

      {/* No UPI accounts warning */}
      {noUpiAccounts && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-700 font-medium">No UPI-enabled accounts found</p>
            <button onClick={() => navigate?.('/settings')} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add UPI ID to a bank account
            </button>
          </div>
        </div>
      )}

      {/* Bank Account Dropdown — filtered by mode */}
      {showBankDropdown && (
        <div>
          <label className="text-xs text-muted-foreground">Bank Account</label>
          <select value={state.bankAccountId} onChange={e => onChange({ bankAccountId: e.target.value })}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">Select account...</option>
            {filteredAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.displayLabel || acc.bankName} — {acc.bankName} — {maskAccount(acc.accountNumber)}{acc.isDefault ? ' ⭐' : ''}
              </option>
            ))}
          </select>
          {selectedAccount?.upiId && state.mode === 'UPI' && (
            <div className="text-xs text-muted-foreground mt-1">UPI ID: {selectedAccount.upiId}</div>
          )}
        </div>
      )}

      {/* Mode-specific fields */}
      {state.mode === 'UPI' && (
        <div><label className="text-xs text-muted-foreground">UPI Transaction ID</label>
          <input value={state.ref} onChange={e => onChange({ ref: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
      )}
      {(state.mode === 'NEFT' || state.mode === 'RTGS') && (
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">{state.mode === 'RTGS' ? 'UTR Number' : 'Bank Ref No'}</label>
            <input value={state.ref} onChange={e => onChange({ ref: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div><label className="text-xs text-muted-foreground">Transfer Date</label>
            <Popover><PopoverTrigger asChild><button className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between">
              {state.chequeDate ? format(state.chequeDate, 'dd MMM yy') : 'Select'}<CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={state.chequeDate} onSelect={d => onChange({ chequeDate: d })} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
          </div>
        </div>
      )}
      {state.mode === 'IMPS' && (
        <div><label className="text-xs text-muted-foreground">IMPS Ref No</label>
          <input value={state.ref} onChange={e => onChange({ ref: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
      )}
      {state.mode === 'Cheque' && (
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Cheque No</label><input value={state.chequeNo} onChange={e => onChange({ chequeNo: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground">Cheque Date</label>
            <Popover><PopoverTrigger asChild><button className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-left">{state.chequeDate ? format(state.chequeDate, 'dd MMM yy') : 'Select'}</button></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={state.chequeDate} onSelect={d => onChange({ chequeDate: d })} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
          </div>
          <div><label className="text-xs text-muted-foreground">Drawee Bank</label><input value={state.bankName} onChange={e => onChange({ bankName: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
        </div>
      )}
      {state.mode === 'Cash' && (
        <div><label className="text-xs text-muted-foreground">Received By</label>
          <input value={state.receivedBy} onChange={e => onChange({ receivedBy: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
      )}
    </div>
  );
}

export function getModeIcon(mode: string) {
  switch (mode) {
    case 'Cash': return <Banknote className="h-3.5 w-3.5" />;
    case 'UPI': return <Smartphone className="h-3.5 w-3.5" />;
    case 'Cheque': return <CreditCard className="h-3.5 w-3.5" />;
    case 'IMPS': return <Zap className="h-3.5 w-3.5" />;
    case 'RTGS': return <Landmark className="h-3.5 w-3.5" />;
    default: return <Building2 className="h-3.5 w-3.5" />;
  }
}

export type { PaymentFieldsState };
export { PAYMENT_MODES, filterAccountsByMode };
