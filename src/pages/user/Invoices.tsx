import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search, Eye, Download, Banknote, Plus, Printer } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import InvoiceStatusChip from '@/components/InvoiceStatusChip';
import { Payment } from '@/types';
import * as XLSX from '@e965/xlsx';

export default function InvoicesPage({ viewOnly = false, onNavigate }: { viewOnly?: boolean; onNavigate?: (tab: string) => void }) {
  const { session, invoices, payments, employees, getCurrentUser, addPayment, getNextReceiptNo, bankAccounts, getInvoiceStatus } = useApp();
  const isMobile = useIsMobile();
  const user = getCurrentUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [creatorFilter, setCreatorFilter] = useState('All');
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [quickPayInvId, setQuickPayInvId] = useState<string | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState(0);
  const [quickPayMode, setQuickPayMode] = useState<string>('Cash');
  const [quickPayBankId, setQuickPayBankId] = useState('');

  const userInvoices = invoices.filter(i => i.userId === session.userId);
  const userPayments = payments.filter(p => p.userId === session.userId);
  const userEmployees = employees.filter(e => e.userId === session.userId);
  const userBanks = bankAccounts.filter(a => a.userId === session.userId);

  let filtered = userInvoices;
  if (search) filtered = filtered.filter(i => i.invoiceNo.toLowerCase().includes(search.toLowerCase()) || i.customerName.toLowerCase().includes(search.toLowerCase()));
  if (statusFilter !== 'All') {
    filtered = filtered.filter(i => {
      const { status } = getInvoiceStatus(i.id);
      return status === statusFilter || (statusFilter === 'Pending' && status === 'Pending');
    });
  }
  if (creatorFilter !== 'All') filtered = filtered.filter(i => i.createdBy.id === creatorFilter);
  if (fromDate) filtered = filtered.filter(i => i.date >= fromDate);
  if (toDate) filtered = filtered.filter(i => i.date <= toDate);

  const totalAmount = filtered.reduce((s, i) => s + i.grandTotal, 0);
  const paidAmount = filtered.reduce((s, i) => {
    const { received } = getInvoiceStatus(i.id);
    return s + Math.min(received, i.grandTotal);
  }, 0);
  const pendingAmount = totalAmount - paidAmount;

  const selectedInv = selectedInvId ? userInvoices.find(i => i.id === selectedInvId) : null;

  const handleExportExcel = () => {
    const data = filtered.map(inv => {
      const { status, received, balance } = getInvoiceStatus(inv.id);
      return {
        'Invoice No': inv.invoiceNo, Date: inv.date, Customer: inv.customerName,
        GSTIN: inv.customerGst || '', Total: inv.grandTotal, Received: received, Balance: balance, Status: status,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `Invoices_${fromDate || 'all'}_to_${toDate || 'all'}.xlsx`);
  };

  const openQuickPay = (invId: string) => {
    const inv = userInvoices.find(i => i.id === invId);
    if (!inv) return;
    const { balance } = getInvoiceStatus(invId);
    setQuickPayInvId(invId);
    setQuickPayAmount(balance);
    setQuickPayMode('Cash');
    const def = userBanks.find(a => a.isDefault);
    setQuickPayBankId(def?.id || '');
  };

  const saveQuickPay = () => {
    if (!quickPayInvId || !quickPayAmount) return;
    const inv = userInvoices.find(i => i.id === quickPayInvId);
    if (!inv) return;
    const receiptNo = getNextReceiptNo();
    addPayment({
      receiptNo, userId: session.userId, customerId: inv.customerId, invoiceId: inv.id,
      invoiceNo: inv.invoiceNo, amount: quickPayAmount, date: new Date().toISOString().split('T')[0],
      mode: quickPayMode as any, bankName: userBanks.find(a => a.id === quickPayBankId)?.bankName,
    });
    setQuickPayInvId(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">Invoices</h1>
        <div className="flex items-center gap-2">
          {!viewOnly && (
            <button onClick={() => onNavigate?.('create-invoice')} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Create Invoice
            </button>
          )}
          <button onClick={handleExportExcel} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
        </div>
      </div>
      {viewOnly && <div className="rounded-md bg-accent p-2 text-sm">👁️ Admin View — Sirf dekhne ka mode</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
        </div>
        {!isMobile && (
          <>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
          </>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Unpaid</option>
          <option value="Partial">Partial</option>
        </select>
        {!isMobile && (
          <select value={creatorFilter} onChange={e => setCreatorFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="All">All Creators</option>
            <option value={session.userId}>👑 {user?.firmName || 'Owner'}</option>
            {userEmployees.map(emp => <option key={emp.id} value={emp.id}>👷 {emp.name}</option>)}
          </select>
        )}
      </div>

      {/* Invoice list */}
      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(inv => {
            const { status, balance } = getInvoiceStatus(inv.id);
            return (
              <div key={inv.id} className="mobile-card">
                <div className="flex justify-between items-start" onClick={() => setSelectedInvId(inv.id)}>
                  <div><div className="font-medium text-sm">{inv.invoiceNo}</div><div className="text-xs text-muted-foreground">{inv.date}</div></div>
                  <InvoiceStatusChip invoice={inv} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>{inv.customerName}</span>
                  <span className="font-mono font-bold">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                {(status === 'Pending' || status === 'Partial') && !viewOnly && (
                  <button onClick={() => openQuickPay(inv.id)} className="mt-1 w-full rounded-md bg-primary/10 text-primary text-xs py-1.5 font-medium">💰 Receive Payment</button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="py-2 px-3">Invoice No</th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Customer</th>
              <th className="py-2 px-3 text-right">Total</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Banaya</th>
              {!viewOnly && <th className="py-2 px-3">Actions</th>}
            </tr></thead>
            <tbody>
              {filtered.map(inv => {
                const { status, balance } = getInvoiceStatus(inv.id);
                return (
                  <tr key={inv.id} className="border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-primary" onClick={() => setSelectedInvId(inv.id)}>{inv.invoiceNo}</td>
                    <td className="py-2.5 px-3" onClick={() => setSelectedInvId(inv.id)}>{inv.date}</td>
                    <td className="py-2.5 px-3" onClick={() => setSelectedInvId(inv.id)}>{inv.customerName}</td>
                    <td className="py-2.5 px-3 font-mono text-right" onClick={() => setSelectedInvId(inv.id)}>₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3" onClick={() => setSelectedInvId(inv.id)}><InvoiceStatusChip invoice={inv} /></td>
                    <td className="py-2.5 px-3 text-xs" onClick={() => setSelectedInvId(inv.id)}>{inv.createdBy.role === 'user' ? '👑' : '👷'} {inv.createdBy.name}</td>
                    {!viewOnly && (
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedInvId(inv.id)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent transition-colors">
                            <Eye className="h-3 w-3" />
                          </button>
                          <ShareButton
                            documentType="invoice"
                            documentId={inv.id}
                            documentNo={inv.invoiceNo}
                            firmName={user?.firmName || ''}
                            amount={inv.grandTotal}
                            userId={session.userId}
                            iconOnly
                          />
                          {(status === 'Pending' || status === 'Partial') && (
                            <button onClick={() => openQuickPay(inv.id)} className={`rounded-md text-xs px-2.5 py-1 font-medium transition-colors ${status === 'Partial' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}`}>
                              💰 Pay
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t pt-3 mt-2 flex flex-wrap gap-4 text-sm">
            <span>{filtered.length} invoices</span>
            <span>Total: <b>₹{totalAmount.toLocaleString('en-IN')}</b></span>
            <span className="text-green-600">Received: ₹{paidAmount.toLocaleString('en-IN')}</span>
            <span className="text-destructive">Outstanding: ₹{pendingAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {/* Quick Pay Modal */}
      {quickPayInvId && (() => {
        const inv = userInvoices.find(i => i.id === quickPayInvId);
        if (!inv) return null;
        const { balance, received } = getInvoiceStatus(quickPayInvId);
        return (
          <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg border shadow-xl w-full max-w-md p-5 space-y-4 animate-fade-in">
              <h3 className="font-display font-bold">💰 Receive Payment</h3>
              <div className="text-sm"><span className="text-muted-foreground">Invoice:</span> <b>{inv.invoiceNo}</b> — {inv.customerName}</div>
              <div className="text-sm"><span className="text-muted-foreground">Balance Due:</span> <b className="text-destructive">₹{balance.toLocaleString('en-IN')}</b></div>
              <div>
                <label className="text-xs text-muted-foreground">Amount</label>
                <input type="number" value={quickPayAmount} onChange={e => setQuickPayAmount(parseFloat(e.target.value) || 0)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                {quickPayAmount > 0 && quickPayAmount < balance && (
                  <div className="mt-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2">⚠️ Partial payment. Remaining: ₹{(balance - quickPayAmount).toLocaleString('en-IN')}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Payment Mode</label>
                <select value={quickPayMode} onChange={e => setQuickPayMode(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {['Cash', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Bank Transfer', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {quickPayMode !== 'Cash' && userBanks.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground">Bank Account</label>
                  <select value={quickPayBankId} onChange={e => setQuickPayBankId(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {userBanks.map(a => <option key={a.id} value={a.id}>{a.displayLabel || a.bankName} — XXXX{a.accountNumber.slice(-4)}{a.isDefault ? ' ⭐' : ''}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={saveQuickPay} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Save Payment</button>
                <button onClick={() => setQuickPayInvId(null)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {selectedInv && <InvoiceTemplate invoice={selectedInv} onClose={() => setSelectedInvId(null)} viewOnly={viewOnly} />}
    </div>
  );
}
