import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Wallet, Search, Plus, Eye, Printer, Trash2, Banknote, Smartphone, Building2, Zap, FileText, Download, IndianRupee, TrendingUp, CreditCard, BarChart3, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as XLSX from '@e965/xlsx';
import { filterAccountsByMode } from '@/components/BankAccountSelect';



const MODE_ICONS: Record<string, React.ReactNode> = {
  Cash: <Banknote className="h-4 w-4" />,
  UPI: <Smartphone className="h-4 w-4" />,
  NEFT: <Building2 className="h-4 w-4" />,
  RTGS: <Building2 className="h-4 w-4" />,
  IMPS: <Zap className="h-4 w-4" />,
  Cheque: <FileText className="h-4 w-4" />,
};

export default function PaymentsPage() {
  const { session, payments, invoices, customers, bankAccounts, addPayment, deletePayment, getNextReceiptNo } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<'all' | 'receive' | 'history' | 'bank-summary'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [bankFilter, setBankFilter] = useState('All');

  // Receive payment form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState('Cash');
  const [payBankId, setPayBankId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payReceivedBy, setPayReceivedBy] = useState('');
  const [payUtr, setPayUtr] = useState('');
  const [payChequeNo, setPayChequeNo] = useState('');
  const [payChequeDate, setPayChequeDate] = useState('');
  const [payDraweeBank, setPayDraweeBank] = useState('');

  const userPayments = payments.filter(p => p.userId === session.userId);
  const userInvoices = invoices.filter(i => i.userId === session.userId);
  const userCustomers = customers.filter(c => c.userId === session.userId);
  const userBanks = bankAccounts.filter(a => a.userId === session.userId);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  const todayTotal = useMemo(() => userPayments.filter(p => p.date === today).reduce((s, p) => s + p.amount, 0), [userPayments, today]);
  const monthTotal = useMemo(() => userPayments.filter(p => p.date.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0), [userPayments, thisMonth]);
  const outstanding = useMemo(() => {
    return userInvoices.reduce((s, inv) => {
      const received = userPayments.filter(p => p.invoiceId === inv.id).reduce((ss, p) => ss + p.amount, 0);
      return s + Math.max(0, inv.grandTotal - received);
    }, 0);
  }, [userInvoices, userPayments]);
  const mostUsedMode = useMemo(() => {
    const counts: Record<string, number> = {};
    userPayments.filter(p => p.date.startsWith(thisMonth)).forEach(p => { counts[p.mode] = (counts[p.mode] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  }, [userPayments, thisMonth]);

  let filtered = userPayments;
  if (search) filtered = filtered.filter(p => p.receiptNo.toLowerCase().includes(search.toLowerCase()) || userCustomers.find(c => c.id === p.customerId)?.name.toLowerCase().includes(search.toLowerCase()));
  if (modeFilter !== 'All') filtered = filtered.filter(p => p.mode === modeFilter);
  if (bankFilter !== 'All') filtered = filtered.filter(p => p.bankName === bankFilter);
  if (dateFrom) filtered = filtered.filter(p => p.date >= dateFrom);
  if (dateTo) filtered = filtered.filter(p => p.date <= dateTo);
  filtered = filtered.sort((a, b) => b.date.localeCompare(a.date));

  const selectedCustomer = userCustomers.find(c => c.id === selectedCustomerId);
  const pendingInvoices = selectedCustomerId ? userInvoices.filter(inv => {
    const received = userPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
    return inv.customerId === selectedCustomerId && (inv.grandTotal - received) > 0;
  }) : [];

  const handleSavePayment = () => {
    if (!selectedCustomerId || !payAmount) return;
    const bank = userBanks.find(a => a.id === payBankId);
    const receiptNo = getNextReceiptNo();
    // If invoices selected, distribute payment
    if (selectedInvoiceIds.length > 0) {
      let remaining = payAmount;
      for (const invId of selectedInvoiceIds) {
        if (remaining <= 0) break;
        const inv = userInvoices.find(i => i.id === invId);
        if (!inv) continue;
        const alreadyPaid = userPayments.filter(p => p.invoiceId === invId).reduce((s, p) => s + p.amount, 0);
        const balance = inv.grandTotal - alreadyPaid;
        const applied = Math.min(remaining, balance);
        addPayment({
          receiptNo, userId: session.userId, customerId: selectedCustomerId, invoiceId: invId,
          invoiceNo: inv.invoiceNo, amount: applied, date: today,
          mode: payMode as any, bankName: bank?.bankName,
          reference: payRef || payUtr || payChequeNo || undefined,
          utrNumber: payUtr || undefined, chequeNo: payChequeNo || undefined,
          chequeDate: payChequeDate || undefined, chequeBranch: payDraweeBank || undefined,
          receivedBy: payReceivedBy || undefined, note: payNotes || undefined,
        });
        remaining -= applied;
      }
    } else {
      addPayment({
        receiptNo, userId: session.userId, customerId: selectedCustomerId,
        amount: payAmount, date: today, mode: payMode as any, bankName: bank?.bankName,
        reference: payRef || payUtr || payChequeNo || undefined,
        utrNumber: payUtr || undefined, chequeNo: payChequeNo || undefined,
        chequeDate: payChequeDate || undefined, chequeBranch: payDraweeBank || undefined,
        receivedBy: payReceivedBy || undefined, note: payNotes || undefined,
      });
    }
    // Reset form
    setSelectedCustomerId(''); setSelectedInvoiceIds([]); setPayAmount(0); setPayMode('Cash');
    setPayRef(''); setPayNotes(''); setPayReceivedBy(''); setPayUtr(''); setPayChequeNo('');
    setPayChequeDate(''); setPayDraweeBank('');
    setActiveTab('all');
  };

  const handleExport = () => {
    const data = filtered.map(p => ({
      'Receipt No': p.receiptNo, Date: p.date,
      'Party': userCustomers.find(c => c.id === p.customerId)?.name || '',
      Amount: p.amount, Mode: p.mode, Bank: p.bankName || '',
      Reference: p.reference || p.utrNumber || p.chequeNo || '',
      Invoice: p.invoiceNo || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `Payments_${today}.xlsx`);
  };

  const handleDeletePayment = (id: string) => {
    if (confirm('Delete this payment? This will reverse invoice status updates.')) {
      deletePayment(id);
    }
  };

  const bankSummary = useMemo(() => {
    const map: Record<string, { label: string; bankName: string; lastFour: string; monthTotal: number; yearTotal: number; monthCount: number }> = {};
    userPayments.forEach(p => {
      if (!p.bankName) return;
      const key = p.bankName;
      if (!map[key]) map[key] = { label: key, bankName: p.bankName, lastFour: '', monthTotal: 0, yearTotal: 0, monthCount: 0 };
      if (p.date.startsWith(thisMonth)) { map[key].monthTotal += p.amount; map[key].monthCount++; }
      map[key].yearTotal += p.amount;
    });
    return Object.values(map);
  }, [userPayments, thisMonth]);

  const tabs = [
    { id: 'all' as const, label: 'All Payments', icon: Wallet },
    { id: 'receive' as const, label: 'Receive Payment', icon: Plus },
    { id: 'history' as const, label: 'History', icon: BarChart3 },
    { id: 'bank-summary' as const, label: 'Bank Summary', icon: Building2 },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2"><Wallet className="h-5 w-5" /> Payments</h1>
        <button onClick={() => setActiveTab('receive')} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Receive Payment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md whitespace-nowrap transition-colors",
              activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground")}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {(activeTab === 'all' || activeTab === 'history') && (
        <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-4")}>
          <div className="hero-card"><div className="text-xs text-muted-foreground">Today's Collection</div><div className="text-lg font-display font-bold text-green-600">₹{todayTotal.toLocaleString('en-IN')}</div></div>
          <div className="hero-card"><div className="text-xs text-muted-foreground">This Month</div><div className="text-lg font-display font-bold">₹{monthTotal.toLocaleString('en-IN')}</div></div>
          <div className="hero-card"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-lg font-display font-bold text-destructive">₹{outstanding.toLocaleString('en-IN')}</div></div>
          <div className="hero-card"><div className="text-xs text-muted-foreground">Most Used Mode</div><div className="text-lg font-display font-bold flex items-center gap-1">{MODE_ICONS[mostUsedMode]} {mostUsedMode}</div></div>
        </div>
      )}

      {/* ALL PAYMENTS TAB */}
      {activeTab === 'all' && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipt or party..." className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
            </div>
            {!isMobile && (
              <>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
              </>
            )}
            <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="All">All Modes</option>
              {['Cash', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Bank Transfer', 'Other'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {isMobile ? (
            <div className="space-y-2">
              {filtered.map(p => (
                <div key={p.id} className="mobile-card">
                  <div className="flex justify-between items-start">
                    <div><div className="font-medium text-sm">{p.receiptNo}</div><div className="text-xs text-muted-foreground">{p.date}</div></div>
                    <span className="text-sm font-bold text-green-600">₹{p.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{userCustomers.find(c => c.id === p.customerId)?.name || '—'}</span>
                    <span className="flex items-center gap-1">{MODE_ICONS[p.mode]} {p.mode}</span>
                  </div>
                  {p.invoiceNo && <div className="text-xs text-primary">Against: {p.invoiceNo}</div>}
                </div>
              ))}
              {filtered.length === 0 && <div className="hero-card text-center py-8"><Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm text-muted-foreground">No payments found</p></div>}
            </div>
          ) : (
            <div className="hero-card overflow-x-auto">
              <table className="w-full text-sm table-zebra">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3">Receipt No</th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Party</th>
                  <th className="py-2 px-3 text-right">Amount</th><th className="py-2 px-3">Mode</th><th className="py-2 px-3">Bank</th>
                  <th className="py-2 px-3">Reference</th><th className="py-2 px-3">Invoice</th><th className="py-2 px-3">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-primary">{p.receiptNo}</td>
                      <td className="py-2.5 px-3">{p.date}</td>
                      <td className="py-2.5 px-3">{userCustomers.find(c => c.id === p.customerId)?.name || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-green-600">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3"><span className="flex items-center gap-1">{MODE_ICONS[p.mode]} {p.mode}</span></td>
                      <td className="py-2.5 px-3 text-xs">{p.bankName || '—'}</td>
                      <td className="py-2.5 px-3 text-xs font-mono">{p.reference || p.utrNumber || p.chequeNo || '—'}</td>
                      <td className="py-2.5 px-3 text-xs">{p.invoiceNo || <span className="text-muted-foreground">General</span>}</td>
                      <td className="py-2.5 px-3">
                        <button onClick={() => handleDeletePayment(p.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 0 && (
                <div className="border-t pt-3 mt-2 flex gap-4 text-sm">
                  <span>{filtered.length} payments</span>
                  <span className="font-bold text-green-600">Total: ₹{filtered.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {filtered.length === 0 && <div className="text-center py-8"><Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm text-muted-foreground">No payments found</p></div>}
            </div>
          )}
        </>
      )}

      {/* RECEIVE PAYMENT TAB */}
      {activeTab === 'receive' && (
        <div className="max-w-2xl space-y-4">
          {/* Customer Selection */}
          <div className="hero-card space-y-3">
            <h3 className="font-display font-semibold text-sm">👤 Select Customer</h3>
            <select value={selectedCustomerId} onChange={e => { setSelectedCustomerId(e.target.value); setSelectedInvoiceIds([]); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Choose customer...</option>
              {userCustomers.map(c => {
                const custOut = userInvoices.filter(i => i.customerId === c.id).reduce((s, i) => s + i.grandTotal, 0) - userPayments.filter(p => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
                return <option key={c.id} value={c.id}>{c.name} — {c.phone}{custOut > 0 ? ` — ₹${custOut.toLocaleString('en-IN')} due` : ''}</option>;
              })}
            </select>

            {selectedCustomer && (
              <div className="rounded-md border bg-accent/30 p-3">
                <div className="font-display font-bold text-sm">{selectedCustomer.name}</div>
                <div className="text-xs text-muted-foreground">{selectedCustomer.phone} {selectedCustomer.gstNumber ? `· ${selectedCustomer.gstNumber}` : ''}</div>
                {(() => {
                  const custOut = userInvoices.filter(i => i.customerId === selectedCustomerId).reduce((s, i) => s + i.grandTotal, 0) - userPayments.filter(p => p.customerId === selectedCustomerId).reduce((s, p) => s + p.amount, 0);
                  return <div className={cn("text-sm font-bold mt-1", custOut > 0 ? "text-destructive" : "text-green-600")}>{custOut > 0 ? `Outstanding: ₹${custOut.toLocaleString('en-IN')}` : '✅ All Clear'}</div>;
                })()}
              </div>
            )}
          </div>

          {/* Pending Invoices */}
          {pendingInvoices.length > 0 && (
            <div className="hero-card space-y-3">
              <h3 className="font-display font-semibold text-sm">🧾 Pending Invoices</h3>
              <div className="space-y-1">
                {pendingInvoices.map(inv => {
                  const received = userPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
                  const balance = inv.grandTotal - received;
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  return (
                    <label key={inv.id} className={cn("flex items-center gap-3 rounded-md border p-2.5 cursor-pointer transition-colors", isSelected && "border-primary/50 bg-accent/30")}>
                      <input type="checkbox" checked={isSelected}
                        onChange={e => {
                          const newIds = e.target.checked ? [...selectedInvoiceIds, inv.id] : selectedInvoiceIds.filter(id => id !== inv.id);
                          setSelectedInvoiceIds(newIds);
                          // Auto-fill amount from selected invoices
                          const total = newIds.reduce((s, id) => {
                            const i = userInvoices.find(x => x.id === id);
                            if (!i) return s;
                            return s + i.grandTotal - userPayments.filter(p => p.invoiceId === id).reduce((ss, p) => ss + p.amount, 0);
                          }, 0);
                          setPayAmount(Math.max(0, total));
                        }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{inv.invoiceNo} <span className="text-muted-foreground">· {inv.date}</span></div>
                        <div className="text-xs text-muted-foreground">Total: ₹{inv.grandTotal.toLocaleString('en-IN')} · Received: ₹{received.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="text-sm font-bold text-destructive">₹{balance.toLocaleString('en-IN')}</div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Details */}
          {selectedCustomerId && (
            <div className="hero-card space-y-3">
              <h3 className="font-display font-semibold text-sm">💰 Payment Details</h3>
              <div>
                <label className="text-xs text-muted-foreground">Amount <span className="text-destructive">*</span></label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background pl-8 pr-3 py-3 text-lg font-bold" />
                </div>
              </div>

              {/* Payment Mode Cards */}
              <div>
                <label className="text-xs text-muted-foreground">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['Cash', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Bank Transfer', 'Other'].map(mode => (
                    <button key={mode} onClick={() => {
                      setPayMode(mode);
                      if (mode !== 'Cash') {
                        const modeAccounts = filterAccountsByMode(userBanks, mode as any);
                        const def = modeAccounts.find(a => a.isDefault) || modeAccounts[0];
                        setPayBankId(def?.id || '');
                      } else {
                        setPayBankId('');
                      }
                    }}
                      className={cn("flex flex-col items-center gap-1 p-3 rounded-md border transition-all",
                        payMode === mode ? "border-primary bg-accent text-primary" : "hover:bg-accent/50")}>
                      {MODE_ICONS[mode]}
                      <span className="text-xs font-medium">{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* No UPI accounts warning */}
              {payMode === 'UPI' && filterAccountsByMode(userBanks, 'UPI').length === 0 && userBanks.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                  No UPI-enabled accounts. Add UPI ID in Settings.
                </div>
              )}

              {/* Bank Account — filtered by mode */}
              {payMode !== 'Cash' && (() => {
                const modeAccounts = filterAccountsByMode(userBanks, payMode as any);
                return modeAccounts.length > 0 ? (
                  <div>
                    <label className="text-xs text-muted-foreground">Bank Account</label>
                    <select value={payBankId} onChange={e => setPayBankId(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                      {modeAccounts.map(a => <option key={a.id} value={a.id}>{a.displayLabel || a.bankName} — XXXX{a.accountNumber.slice(-4)}{a.isDefault ? ' ⭐' : ''}</option>)}
                    </select>
                  </div>
                ) : null;
              })()}

              {/* Mode-specific fields */}
              {payMode === 'Cash' && (
                <div><label className="text-xs text-muted-foreground">Received By</label><input value={payReceivedBy} onChange={e => setPayReceivedBy(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Name (optional)" /></div>
              )}
              {payMode === 'UPI' && (
                <div><label className="text-xs text-muted-foreground">UPI Transaction ID</label><input value={payRef} onChange={e => setPayRef(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              )}
              {(payMode === 'NEFT' || payMode === 'RTGS') && (
                <div><label className="text-xs text-muted-foreground">UTR Number</label><input value={payUtr} onChange={e => setPayUtr(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              )}
              {payMode === 'IMPS' && (
                <div><label className="text-xs text-muted-foreground">IMPS Reference</label><input value={payRef} onChange={e => setPayRef(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              )}
              {payMode === 'Cheque' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Cheque No</label><input value={payChequeNo} onChange={e => setPayChequeNo(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">Cheque Date</label><input type="date" value={payChequeDate} onChange={e => setPayChequeDate(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div className="col-span-2"><label className="text-xs text-muted-foreground">Drawee Bank</label><input value={payDraweeBank} onChange={e => setPayDraweeBank(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                </div>
              )}

              <div><label className="text-xs text-muted-foreground">Notes</label><textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>

              {/* Preview */}
              {payAmount > 0 && (
                <div className="rounded-md border bg-accent/30 p-3 space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Payment Preview</div>
                  <div className="text-sm"><b>{selectedCustomer?.name}</b> · ₹{payAmount.toLocaleString('en-IN')} · {payMode}</div>
                  {selectedInvoiceIds.length > 0 && <div className="text-xs text-muted-foreground">Against {selectedInvoiceIds.length} invoice(s)</div>}
                </div>
              )}

              <button onClick={handleSavePayment} disabled={!payAmount || !selectedCustomerId}
                className="w-full rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
                💰 Save Payment
              </button>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Export Excel</button>
          </div>
          <div className="hero-card overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="py-2 px-3">Receipt</th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3 text-right">Amount</th><th className="py-2 px-3">Mode</th><th className="py-2 px-3">Bank</th><th className="py-2 px-3">Invoice</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2.5 px-3 font-medium">{p.receiptNo}</td>
                    <td className="py-2.5 px-3">{p.date}</td>
                    <td className="py-2.5 px-3">{userCustomers.find(c => c.id === p.customerId)?.name || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-green-600">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 flex items-center gap-1">{MODE_ICONS[p.mode]} {p.mode}</td>
                    <td className="py-2.5 px-3 text-xs">{p.bankName || '—'}</td>
                    <td className="py-2.5 px-3 text-xs">{p.invoiceNo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No payment history</div>}
          </div>
        </div>
      )}

      {/* BANK SUMMARY TAB */}
      {activeTab === 'bank-summary' && (
        <div className="space-y-4">
          {bankSummary.length === 0 ? (
            <div className="hero-card text-center py-8"><Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm text-muted-foreground">No bank payments recorded yet</p></div>
          ) : (
            <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-2")}>
              {bankSummary.map(b => (
                <div key={b.label} className="hero-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-display font-bold text-sm">{b.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">This Month:</span> <b className="text-green-600">₹{b.monthTotal.toLocaleString('en-IN')}</b></div>
                    <div><span className="text-muted-foreground">This Year:</span> <b>₹{b.yearTotal.toLocaleString('en-IN')}</b></div>
                    <div><span className="text-muted-foreground">Transactions:</span> <b>{b.monthCount}</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
