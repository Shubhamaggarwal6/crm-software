import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Customer, Invoice, Payment, LedgerEntry, numberToWords } from '@/types';
import { format, isWithinInterval, startOfMonth, endOfMonth, subMonths, startOfQuarter, startOfYear } from 'date-fns';
import { ArrowLeft, Check, Download, Printer, Trash2, CalendarIcon, Banknote } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PaymentModeSection, getModeIcon, type PaymentFieldsState } from '@/components/BankAccountSelect';
import jsPDF from 'jspdf';
import * as XLSX from '@e965/xlsx';

type TabId = 'overview' | 'invoices' | 'payments' | 'ledger' | 'add-payment';

interface Props {
  customer: Customer;
  onBack: () => void;
}

export default function CustomerProfile({ customer, onBack }: Props) {
  const { session, invoices, payments, creditNotes, debitNotes, addPayment, deletePayment, getNextReceiptNo, getCurrentUser, bankAccounts } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const user = getCurrentUser();

  const [tab, setTab] = useState<TabId>('overview');
  const [dateRange, setDateRange] = useState<'month' | 'last-month' | 'quarter' | 'year' | 'all' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [showReceipt, setShowReceipt] = useState<Payment | null>(null);

  // Payment form
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payFields, setPayFields] = useState<PaymentFieldsState>({
    mode: null, bankAccountId: '', ref: '', bankName: '', chequeNo: '', chequeDate: undefined, chequeBranch: '', receivedBy: '', utrNumber: '',
  });

  const custInvoices = useMemo(() => invoices.filter(i => i.userId === session.userId && i.customerId === customer.id), [invoices, session.userId, customer.id]);
  const custPayments = useMemo(() => payments.filter(p => p.userId === session.userId && p.customerId === customer.id), [payments, session.userId, customer.id]);
  const custCreditNotes = useMemo(() => creditNotes.filter(cn => cn.userId === session.userId && cn.customerId === customer.id), [creditNotes, session.userId, customer.id]);
  const custDebitNotes = useMemo(() => debitNotes.filter(dn => dn.userId === session.userId && dn.type === 'customer' && dn.customerId === customer.id), [debitNotes, session.userId, customer.id]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month': { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
      case 'quarter': return { start: startOfQuarter(now), end: now };
      case 'year': return { start: startOfYear(now), end: now };
      case 'custom': return fromDate && toDate ? { start: fromDate, end: toDate } : null;
      default: return null;
    }
  };

  const filterByDate = <T extends { date: string }>(items: T[]) => {
    const range = getDateFilter();
    if (!range) return items;
    return items.filter(i => { const d = new Date(i.date); return isWithinInterval(d, { start: range.start, end: range.end }); });
  };

  const filteredInvoices = filterByDate(custInvoices);
  const filteredPayments = filterByDate(custPayments);

  const totalBilled = filteredInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalReceived = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const outstanding = totalBilled - totalReceived + (customer.openingBalance || 0) - custCreditNotes.reduce((s, cn) => s + cn.netAmount, 0) + custDebitNotes.reduce((s, dn) => s + dn.netAmount, 0);
  const lastDate = [...custInvoices.map(i => i.date), ...custPayments.map(p => p.date)].sort().pop();

  const pendingInvoices = custInvoices.filter(i => i.status === 'Pending' || i.status === 'Partial');

  // Ledger
  const ledgerEntries = useMemo(() => {
    const entries: LedgerEntry[] = [];
    let balance = customer.openingBalance || 0;
    entries.push({ date: '', description: 'Opening Balance', debit: balance > 0 ? balance : 0, credit: balance < 0 ? Math.abs(balance) : 0, balance });
    const allEvents = [
      ...custInvoices.map(i => ({ date: i.date, type: 'invoice' as const, data: i })),
      ...custPayments.map(p => ({ date: p.date, type: 'payment' as const, data: p })),
      ...custCreditNotes.map(cn => ({ date: cn.date, type: 'credit' as const, data: cn })),
      ...custDebitNotes.map(dn => ({ date: dn.date, type: 'debit' as const, data: dn })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    const range = getDateFilter();
    const filtered = range ? allEvents.filter(e => { const d = new Date(e.date); return isWithinInterval(d, { start: range.start, end: range.end }); }) : allEvents;
    filtered.forEach(e => {
      if (e.type === 'invoice') { const inv = e.data as Invoice; balance += inv.grandTotal; entries.push({ date: inv.date, description: `Invoice ${inv.invoiceNo}`, debit: inv.grandTotal, credit: 0, balance }); }
      else if (e.type === 'payment') { const pay = e.data as Payment; balance -= pay.amount; entries.push({ date: pay.date, description: `Payment Received (${pay.mode})${pay.receiptNo ? ' - ' + pay.receiptNo : ''}`, debit: 0, credit: pay.amount, balance }); }
      else if (e.type === 'credit') { const cn = e.data as any; balance -= cn.netAmount; entries.push({ date: cn.date, description: `Credit Note ${cn.creditNoteNo}`, debit: 0, credit: cn.netAmount, balance }); }
      else { const dn = e.data as any; balance += dn.netAmount; entries.push({ date: dn.date, description: `Debit Note ${dn.debitNoteNo}`, debit: dn.netAmount, credit: 0, balance }); }
    });
    entries.push({ date: '', description: 'Closing Balance', debit: 0, credit: 0, balance });
    return entries;
  }, [custInvoices, custPayments, custCreditNotes, custDebitNotes, customer.openingBalance, dateRange, fromDate, toDate]);

  const handleSavePayment = () => {
    if (!payAmount || !payFields.mode) return;
    const receiptNo = getNextReceiptNo();
    const bankAcc = bankAccounts.find(a => a.id === payFields.bankAccountId);
    const newPayment: Omit<Payment, 'id'> = {
      receiptNo, userId: session.userId, customerId: customer.id,
      invoiceId: payInvoiceId || undefined, invoiceNo: payInvoiceId ? custInvoices.find(i => i.id === payInvoiceId)?.invoiceNo : undefined,
      amount: payAmount, date: format(payDate, 'yyyy-MM-dd'), mode: payFields.mode,
      reference: payFields.ref || undefined, note: payNote || undefined,
      bankName: payFields.bankName || bankAcc?.bankName || undefined,
      receivedBy: payFields.receivedBy || undefined,
      upiTransactionId: payFields.mode === 'UPI' ? payFields.ref : undefined,
      bankRefNo: payFields.mode === 'NEFT' ? payFields.ref : undefined,
      utrNumber: payFields.mode === 'RTGS' ? payFields.ref : undefined,
      impsRefNo: payFields.mode === 'IMPS' ? payFields.ref : undefined,
      chequeNo: payFields.chequeNo || undefined,
      chequeDate: payFields.chequeDate ? format(payFields.chequeDate, 'yyyy-MM-dd') : undefined,
      chequeBranch: payFields.chequeBranch || undefined,
    };
    addPayment(newPayment);
    setShowReceipt({ ...newPayment, id: 'temp' } as Payment);
    setPayAmount(0); setPayFields({ mode: null, bankAccountId: '', ref: '', bankName: '', chequeNo: '', chequeDate: undefined, chequeBranch: '', receivedBy: '', utrNumber: '' });
    setPayInvoiceId(''); setPayNote('');
  };

  const downloadLedgerPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(`Ledger Statement - ${customer.name}`, 14, 20);
    doc.setFontSize(10); doc.text(`Phone: ${customer.phone}${customer.gstNumber ? ' | GST: ' + customer.gstNumber : ''}`, 14, 28);
    let y = 40; doc.setFontSize(8);
    doc.text('Date', 14, y); doc.text('Description', 40, y); doc.text('Debit', 120, y); doc.text('Credit', 145, y); doc.text('Balance', 170, y); y += 6;
    ledgerEntries.forEach(e => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(e.date || '-', 14, y); doc.text(e.description.substring(0, 40), 40, y);
      doc.text(e.debit ? `₹${e.debit.toLocaleString('en-IN')}` : '', 120, y);
      doc.text(e.credit ? `₹${e.credit.toLocaleString('en-IN')}` : '', 145, y);
      doc.text(`₹${e.balance.toLocaleString('en-IN')}`, 170, y); y += 5;
    });
    doc.save(`Ledger_${customer.name}.pdf`);
  };

  const downloadLedgerExcel = () => {
    const data = ledgerEntries.map(e => ({ Date: e.date || '-', Description: e.description, Debit: e.debit || '', Credit: e.credit || '', Balance: e.balance }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger'); XLSX.writeFile(wb, `Ledger_${customer.name}.xlsx`);
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' }, { id: 'invoices', label: 'Invoices', icon: '🧾' },
    { id: 'payments', label: 'Payments', icon: '💰' }, { id: 'ledger', label: 'Ledger', icon: '📒' },
    { id: 'add-payment', label: 'Add Payment', icon: '➕' },
  ];

  const DateFilterBar = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {(['month', 'last-month', 'quarter', 'year', 'all'] as const).map(r => (
        <button key={r} onClick={() => setDateRange(r)} className={cn('px-3 py-1.5 text-xs rounded-md border transition-colors', dateRange === r ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
          {r === 'month' ? 'This Month' : r === 'last-month' ? 'Last Month' : r === 'quarter' ? 'This Quarter' : r === 'year' ? 'This Year' : 'All Time'}
        </button>
      ))}
      <button onClick={() => setDateRange('custom')} className={cn('px-3 py-1.5 text-xs rounded-md border', dateRange === 'custom' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>Custom</button>
      {dateRange === 'custom' && (
        <div className="flex gap-2 items-center">
          <Popover><PopoverTrigger asChild><button className="px-3 py-1.5 text-xs rounded-md border flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{fromDate ? format(fromDate, 'dd MMM yy') : 'From'}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fromDate} onSelect={setFromDate} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
          <Popover><PopoverTrigger asChild><button className="px-3 py-1.5 text-xs rounded-md border flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{toDate ? format(toDate, 'dd MMM yy') : 'To'}</button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={toDate} onSelect={setToDate} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
        </div>
      )}
    </div>
  );

  // Receipt Modal
  if (showReceipt) {
    const bankAcc = bankAccounts.find(a => a.id === payFields.bankAccountId);
    return (
      <div className="animate-fade-in space-y-4">
        <div className="hero-card max-w-xl mx-auto print:shadow-none" id="receipt">
          <div className="text-center border-b pb-3 mb-4">
            {user && <><div className="font-display font-bold text-lg">{user.firmName}</div><div className="text-xs text-muted-foreground">{user.address}{user.city ? `, ${user.city}` : ''}</div><div className="text-xs text-muted-foreground">GSTIN: {user.gstNumber} | Ph: {user.phone}</div></>}
            <div className="text-xl font-display font-bold mt-3 text-primary">PAYMENT RECEIPT</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><div className="text-xs text-muted-foreground">Receipt No</div><div className="font-mono font-bold">{showReceipt.receiptNo}</div></div>
            <div className="text-right"><div className="text-xs text-muted-foreground">Date</div><div>{showReceipt.date}</div></div>
          </div>
          <div className="bg-muted/50 rounded-md p-3 mb-4">
            <div className="text-xs text-muted-foreground mb-1">Received From</div>
            <div className="font-bold">{customer.name}</div>
            <div className="text-xs text-muted-foreground">{customer.phone}{customer.gstNumber ? ` | GST: ${customer.gstNumber}` : ''}</div>
          </div>
          <div className="text-center py-6 border rounded-md mb-4">
            <div className="text-xs text-muted-foreground mb-1">Amount Received</div>
            <div className="text-3xl font-display font-bold text-primary">₹{showReceipt.amount.toLocaleString('en-IN')}</div>
            <div className="text-xs text-muted-foreground mt-1">{numberToWords(showReceipt.amount)}</div>
            <div className="flex items-center justify-center gap-1 mt-2 text-sm">{getModeIcon(showReceipt.mode)} {showReceipt.mode}</div>
            {bankAcc && <div className="text-xs text-muted-foreground mt-1">Credited to: {bankAcc.bankName} A/C XXXX{bankAcc.accountNumber.slice(-4)}</div>}
            {showReceipt.upiTransactionId && <div className="text-xs text-muted-foreground">UPI ID: {showReceipt.upiTransactionId}</div>}
            {showReceipt.utrNumber && <div className="text-xs text-muted-foreground">UTR: {showReceipt.utrNumber}</div>}
            {showReceipt.chequeNo && <div className="text-xs text-muted-foreground">Cheque: {showReceipt.chequeNo}{showReceipt.chequeDate ? ` dated ${showReceipt.chequeDate}` : ''}</div>}
            {showReceipt.receivedBy && <div className="text-xs text-muted-foreground">Received by: {showReceipt.receivedBy}</div>}
          </div>
          {showReceipt.invoiceNo && (
            <div className="text-sm bg-accent/50 rounded-md p-3 mb-4"><div className="text-xs text-muted-foreground">Against Invoice</div><div className="font-mono font-bold">{showReceipt.invoiceNo}</div></div>
          )}
          <div className="text-center text-xs text-muted-foreground border-t pt-3">Thank you for your payment</div>
          <div className="text-right text-xs mt-6 text-muted-foreground">Authorised Signatory</div>
        </div>
        <div className="flex justify-center gap-2 no-print">
          <button onClick={() => window.print()} className="btn-print"><Printer className="h-3.5 w-3.5" /> Print</button>
          <button onClick={() => setShowReceipt(null)} className="rounded-md border px-4 py-2 text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> {t('action.back')}</button>

      {/* Profile Header */}
      <div className="hero-card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">{customer.name.charAt(0)}</div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-lg">{customer.name}</h2>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
              <span>{customer.phone}</span>
              {customer.gstNumber && <span className="font-mono">GST: {customer.gstNumber}</span>}
              {customer.city && <span>{customer.city}{customer.state ? `, ${customer.state}` : ''}</span>}
              {customer.type && <span className="status-chip-active">{customer.type}</span>}
              {customer.customerSince && <span>Since {customer.customerSince}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="hero-card"><div className="text-xs text-muted-foreground">Total Billed</div><div className="text-lg font-display font-bold mt-1">₹{totalBilled.toLocaleString('en-IN')}</div></div>
        <div className="hero-card"><div className="text-xs text-muted-foreground">Total Received</div><div className="text-lg font-display font-bold mt-1 text-green-600">₹{totalReceived.toLocaleString('en-IN')}</div></div>
        <div className={cn("hero-card", outstanding > 0 ? "border-destructive/30" : "border-green-500/30")}>
          <div className="text-xs text-muted-foreground">Outstanding</div>
          <div className={cn("text-lg font-display font-bold mt-1", outstanding > 0 ? 'text-destructive' : 'text-green-600')}>
            {outstanding > 0 ? `₹${outstanding.toLocaleString('en-IN')}` : <span className="flex items-center gap-1"><Check className="h-4 w-4" /> All Clear</span>}
          </div>
        </div>
        <div className="hero-card"><div className="text-xs text-muted-foreground">Last Transaction</div><div className="text-sm font-display font-bold mt-1">{lastDate || 'N/A'}</div></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors', tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-sm">Recent Invoices</h3>
          {custInvoices.slice(-5).reverse().map(inv => (
            <div key={inv.id} className="hero-card flex justify-between items-center">
              <div><div className="font-medium text-sm">{inv.invoiceNo}</div><div className="text-xs text-muted-foreground">{inv.date}</div></div>
              <div className="text-right">
                <div className="font-mono text-sm">₹{inv.grandTotal.toLocaleString('en-IN')}</div>
                <InvoiceStatusChip invoice={inv} payments={custPayments} />
              </div>
            </div>
          ))}
          {custInvoices.length === 0 && <div className="hero-card text-center py-6 text-muted-foreground text-sm">No invoices yet</div>}
          <h3 className="font-display font-semibold text-sm mt-4">Recent Payments</h3>
          {custPayments.slice(-5).reverse().map(pay => (
            <div key={pay.id} className="hero-card flex justify-between items-center">
              <div><div className="font-medium text-sm flex items-center gap-1">{getModeIcon(pay.mode)} {pay.mode}</div><div className="text-xs text-muted-foreground">{pay.date}{pay.receiptNo ? ` · ${pay.receiptNo}` : ''}</div></div>
              <div className="font-mono text-sm text-green-600">+₹{pay.amount.toLocaleString('en-IN')}</div>
            </div>
          ))}
          {custPayments.length === 0 && <div className="hero-card text-center py-6 text-muted-foreground text-sm">No payments yet</div>}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="space-y-3">
          <DateFilterBar />
          <div className="hero-card overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead><tr className="border-b text-left text-muted-foreground text-xs">
                <th className="py-2 px-3">Invoice No</th><th className="py-2 px-3">Date</th><th className="py-2 px-3 text-center">Items</th>
                <th className="py-2 px-3 text-right">Total</th><th className="py-2 px-3 text-right">Received</th><th className="py-2 px-3 text-right">Balance</th>
                <th className="py-2 px-3">Status</th><th className="py-2 px-3">Created By</th>
              </tr></thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const received = custPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
                  const balance = inv.grandTotal - received;
                  return (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-accent/50">
                      <td className="py-2 px-3 font-mono font-medium">{inv.invoiceNo}</td>
                      <td className="py-2 px-3">{inv.date}</td>
                      <td className="py-2 px-3 text-center">{inv.items.length}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right font-mono text-green-600">{received > 0 ? `₹${received.toLocaleString('en-IN')}` : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono text-destructive">{balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '-'}</td>
                      <td className="py-2 px-3"><InvoiceStatusChip invoice={inv} payments={custPayments} /></td>
                      <td className="py-2 px-3 text-xs">{inv.createdBy.role === 'employee' ? `👷 ${inv.createdBy.name}` : `👑 ${inv.createdBy.name}`}</td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredInvoices.length > 0 && (
                <tfoot><tr className="font-bold border-t bg-muted/50">
                  <td className="py-2 px-3" colSpan={3}>Total</td>
                  <td className="py-2 px-3 text-right font-mono">₹{filteredInvoices.reduce((s, i) => s + i.grandTotal, 0).toLocaleString('en-IN')}</td>
                  <td className="py-2 px-3 text-right font-mono text-green-600">₹{filteredInvoices.reduce((s, i) => s + custPayments.filter(p => p.invoiceId === i.id).reduce((ss, p) => ss + p.amount, 0), 0).toLocaleString('en-IN')}</td>
                  <td className="py-2 px-3 text-right font-mono text-destructive">₹{filteredInvoices.reduce((s, i) => s + i.grandTotal - custPayments.filter(p => p.invoiceId === i.id).reduce((ss, p) => ss + p.amount, 0), 0).toLocaleString('en-IN')}</td>
                  <td colSpan={2}></td>
                </tr></tfoot>
              )}
            </table>
          </div>
          {filteredInvoices.length === 0 && <div className="hero-card text-center py-6"><div className="text-3xl mb-2">🧾</div><p className="text-sm text-muted-foreground">No invoices in this period</p></div>}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="hero-card"><div className="text-xs text-muted-foreground">Total Payments</div><div className="font-display font-bold">{custPayments.length} · ₹{custPayments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}</div></div>
            <div className="hero-card"><div className="text-xs text-muted-foreground">This Month</div><div className="font-display font-bold">{custPayments.filter(p => new Date(p.date) >= startOfMonth(new Date())).length}</div></div>
            <div className="hero-card"><div className="text-xs text-muted-foreground">Top Mode</div><div className="font-display font-bold text-sm">{custPayments.length > 0 ? (() => { const modes = custPayments.map(p => p.mode); return modes.sort((a, b) => modes.filter(v => v === b).length - modes.filter(v => v === a).length)[0]; })() : 'N/A'}</div></div>
          </div>
          <div className="hero-card overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead><tr className="border-b text-left text-muted-foreground text-xs">
                <th className="py-2 px-3">Receipt No</th><th className="py-2 px-3">Date</th><th className="py-2 px-3 text-right">Amount</th>
                <th className="py-2 px-3">Mode</th><th className="py-2 px-3">Bank</th><th className="py-2 px-3">Reference</th><th className="py-2 px-3">Against</th><th className="py-2 px-3">Actions</th>
              </tr></thead>
              <tbody>
                {custPayments.map(pay => (
                  <tr key={pay.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="py-2 px-3 font-mono text-xs">{pay.receiptNo}</td>
                    <td className="py-2 px-3">{pay.date}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-green-600">₹{pay.amount.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3"><span className="flex items-center gap-1">{getModeIcon(pay.mode)} {pay.mode}</span></td>
                    <td className="py-2 px-3 text-xs">{pay.bankName ? `${pay.bankName}` : '-'}</td>
                    <td className="py-2 px-3 text-xs font-mono">{pay.reference || pay.upiTransactionId || pay.utrNumber || pay.chequeNo || '-'}</td>
                    <td className="py-2 px-3 text-xs">{pay.invoiceNo || '-'}</td>
                    <td className="py-2 px-3 flex gap-1">
                      <button onClick={() => setShowReceipt(pay)} className="text-xs text-primary hover:underline">View</button>
                      <button onClick={() => { if (confirm('Delete this payment?')) deletePayment(pay.id); }} className="text-xs text-destructive hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {custPayments.length === 0 && <div className="hero-card text-center py-6"><div className="text-3xl mb-2">💰</div><p className="text-sm text-muted-foreground">No payments recorded</p><button onClick={() => setTab('add-payment')} className="mt-2 rounded-md bg-primary px-4 py-2 text-xs text-primary-foreground">Record Payment</button></div>}
        </div>
      )}

      {tab === 'ledger' && (
        <div className="space-y-3">
          <DateFilterBar />
          <div className="hero-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground text-xs">
                <th className="py-2 px-3">Date</th><th className="py-2 px-3">Description</th><th className="py-2 px-3 text-right">Debit</th><th className="py-2 px-3 text-right">Credit</th><th className="py-2 px-3 text-right">Balance</th>
              </tr></thead>
              <tbody>
                {ledgerEntries.map((entry, i) => {
                  const isFirst = i === 0; const isLast = i === ledgerEntries.length - 1;
                  const isInvoice = entry.description.includes('Invoice');
                  const isPayment = entry.description.includes('Payment');
                  const isCredit = entry.description.includes('Credit Note');
                  const isDebit = entry.description.includes('Debit Note');
                  return (
                    <tr key={i} className={cn('border-b last:border-0',
                      (isFirst || isLast) && 'font-bold bg-muted/50',
                      isInvoice && 'bg-red-50/50', isPayment && 'bg-green-50/50',
                      isCredit && 'bg-blue-50/50', isDebit && 'bg-orange-50/50'
                    )}>
                      <td className="py-2 px-3 text-xs">{entry.date || '-'}</td>
                      <td className="py-2 px-3">
                        {entry.description}
                        {isPayment && <div className="text-[10px] text-muted-foreground">{entry.description.match(/\(([^)]+)\)/)?.[1]}</div>}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-destructive">{entry.debit ? `₹${entry.debit.toLocaleString('en-IN')}` : ''}</td>
                      <td className="py-2 px-3 text-right font-mono text-green-600">{entry.credit ? `₹${entry.credit.toLocaleString('en-IN')}` : ''}</td>
                      <td className={cn("py-2 px-3 text-right font-mono font-bold", entry.balance > 0 ? 'text-destructive' : 'text-green-600')}>₹{entry.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadLedgerPDF} className="btn-pdf"><Download className="h-3.5 w-3.5" /> PDF</button>
            <button onClick={downloadLedgerExcel} className="btn-excel"><Download className="h-3.5 w-3.5" /> Excel</button>
          </div>
        </div>
      )}

      {tab === 'add-payment' && (
        <div className="hero-card max-w-xl space-y-5">
          <h3 className="font-display font-bold">Record Payment</h3>
          {/* Amount */}
          <div>
            <label className="text-xs text-muted-foreground">Payment Amount <span className="text-destructive">*</span></label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-display font-bold text-muted-foreground">₹</span>
              <input type="number" value={payAmount || ''} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                className="text-2xl font-display font-bold w-full border-b-2 border-primary bg-transparent py-2 focus:outline-none" placeholder="0" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Outstanding: ₹{outstanding.toLocaleString('en-IN')}</div>
            {payAmount > 0 && payAmount < outstanding && (
              <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2">
                ⚠️ Partial payment. Balance remaining: ₹{(outstanding - payAmount).toLocaleString('en-IN')}
              </div>
            )}
          </div>
          {/* Date */}
          <div>
            <label className="text-xs text-muted-foreground">Payment Date</label>
            <Popover><PopoverTrigger asChild>
              <button className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between">
                {format(payDate, 'dd MMM yyyy')}<CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={payDate} onSelect={d => d && setPayDate(d)} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
          </div>
          {/* Payment Mode + Bank Account */}
          <PaymentModeSection state={payFields} onChange={updates => setPayFields(p => ({ ...p, ...updates }))} />
          {/* Against Invoice */}
          <div>
            <label className="text-xs text-muted-foreground">Against Invoice (Optional)</label>
            <select value={payInvoiceId} onChange={e => setPayInvoiceId(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">General payment (no specific invoice)</option>
              {pendingInvoices.map(inv => {
                const invReceived = custPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
                return <option key={inv.id} value={inv.id}>{inv.invoiceNo} — ₹{inv.grandTotal.toLocaleString('en-IN')} (Pending: ₹{(inv.grandTotal - invReceived).toLocaleString('en-IN')})</option>;
              })}
            </select>
          </div>
          {/* Notes */}
          <div><label className="text-xs text-muted-foreground">Notes</label><textarea value={payNote} onChange={e => setPayNote(e.target.value)} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
          {/* Preview */}
          {payAmount > 0 && payFields.mode && (
            <div className="rounded-md border bg-accent/30 p-3 space-y-1 text-sm">
              <div className="font-display font-bold text-xs text-muted-foreground mb-1">Payment Preview</div>
              <div className="flex justify-between"><span>Customer</span><span className="font-bold">{customer.name}</span></div>
              <div className="flex justify-between"><span>Amount</span><span className="font-display font-bold text-primary text-lg">₹{payAmount.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Mode</span><span className="flex items-center gap-1">{getModeIcon(payFields.mode)} {payFields.mode}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{format(payDate, 'dd MMM yyyy')}</span></div>
              {payFields.ref && <div className="flex justify-between"><span>Reference</span><span className="font-mono text-xs">{payFields.ref}</span></div>}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSavePayment} disabled={!payAmount || !payFields.mode}
              className="rounded-md bg-primary px-6 py-2.5 text-sm text-primary-foreground font-medium disabled:opacity-50">Save Payment</button>
            <button onClick={() => setTab('overview')} className="rounded-md border px-4 py-2.5 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Invoice Status Chip Component
function InvoiceStatusChip({ invoice, payments }: { invoice: Invoice; payments: Payment[] }) {
  const received = payments.filter(p => p.invoiceId === invoice.id).reduce((s, p) => s + p.amount, 0);
  const balance = invoice.grandTotal - received;
  const status = balance <= 0 ? 'Paid' : received > 0 ? 'Partial' : (invoice.status === 'Paid' ? 'Paid' : 'Pending');

  if (status === 'Paid') return <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">✅ PAID</span>;
  if (status === 'Partial') return (
    <span className="inline-flex flex-col items-end">
      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">🔶 PARTIAL</span>
      <span className="text-[9px] text-muted-foreground">Rcvd ₹{received.toLocaleString('en-IN')} Left ₹{balance.toLocaleString('en-IN')}</span>
    </span>
  );
  return <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">⚠️ UNPAID</span>;
}