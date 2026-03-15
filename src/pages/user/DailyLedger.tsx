import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import DateRangePicker, { DateRange } from '@/components/DateRangePicker';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import { supabase } from '@/integrations/supabase/client';

interface DayData {
  date: string;
  dayName: string;
  invoicesCount: number;
  salesAmount: number;
  paymentsReceived: number;
  purchasesAmount: number;
  expensesAmount: number;
  salaryAmount: number;
  netForDay: number;
  transactions: Transaction[];
}

interface Transaction {
  time: string;
  type: 'invoice' | 'payment' | 'purchase' | 'credit_note' | 'debit_note' | 'expense' | 'salary';
  refNo: string;
  partyName: string;
  subText?: string;
  debit: number;
  credit: number;
}

interface ExpenseRow {
  id: string;
  expense_date: string;
  category_name: string;
  vendor_name: string | null;
  total_amount: number;
  payment_mode: string | null;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DailyLedgerPage() {
  const { session, invoices, payments, purchases, creditNotes, debitNotes } = useApp();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [viewMode, setViewMode] = useState<'collapsed' | 'full'>('collapsed');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  const userInvoices = invoices.filter(i => i.userId === session.userId);
  const userPayments = payments.filter(p => p.userId === session.userId);
  const userPurchases = purchases.filter(p => p.userId === session.userId);
  const userCreditNotes = creditNotes.filter(c => c.userId === session.userId);
  const userDebitNotes = debitNotes.filter(d => d.userId === session.userId);

  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];

  // Fetch expenses from DB
  useEffect(() => {
    if (!session.userId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('expenses')
        .select('id, expense_date, category_name, vendor_name, total_amount, payment_mode')
        .eq('user_id', session.userId)
        .gte('expense_date', fromStr)
        .lte('expense_date', toStr);
      setExpenses(data || []);
    })();
  }, [session.userId, fromStr, toStr]);

  const dailyData = useMemo<DayData[]>(() => {
    const days: Record<string, DayData> = {};

    const ensureDay = (dateStr: string) => {
      if (!days[dateStr]) {
        const d = new Date(dateStr);
        days[dateStr] = {
          date: dateStr, dayName: DAYS_OF_WEEK[d.getDay()],
          invoicesCount: 0, salesAmount: 0, paymentsReceived: 0,
          purchasesAmount: 0, expensesAmount: 0, salaryAmount: 0, netForDay: 0,
          transactions: [],
        };
      }
      return days[dateStr];
    };

    userInvoices.filter(i => i.date >= fromStr && i.date <= toStr).forEach(inv => {
      const day = ensureDay(inv.date);
      day.invoicesCount++;
      day.salesAmount += inv.grandTotal;
      day.transactions.push({ time: inv.date, type: 'invoice', refNo: inv.invoiceNo, partyName: inv.customerName, debit: inv.grandTotal, credit: 0 });
    });

    userPayments.filter(p => p.date >= fromStr && p.date <= toStr).forEach(pay => {
      const day = ensureDay(pay.date);
      day.paymentsReceived += pay.amount;
      const partyName = pay.invoiceNo ? `Payment — ${pay.invoiceNo}` : 'General Payment';
      day.transactions.push({ time: pay.date, type: 'payment', refNo: pay.receiptNo, partyName, subText: pay.mode, debit: 0, credit: pay.amount });
    });

    userPurchases.filter(p => p.date >= fromStr && p.date <= toStr).forEach(pur => {
      const day = ensureDay(pur.date);
      day.purchasesAmount += pur.grandTotal;
      day.transactions.push({ time: pur.date, type: 'purchase', refNo: pur.purchaseNo, partyName: pur.supplierName, debit: 0, credit: pur.grandTotal });
    });

    userCreditNotes.filter(c => c.date >= fromStr && c.date <= toStr).forEach(cn => {
      const day = ensureDay(cn.date);
      day.transactions.push({ time: cn.date, type: 'credit_note', refNo: cn.creditNoteNo, partyName: cn.customerName, debit: 0, credit: cn.netAmount });
    });

    userDebitNotes.filter(d => d.date >= fromStr && d.date <= toStr).forEach(dn => {
      const day = ensureDay(dn.date);
      const name = dn.customerName || dn.supplierName || '';
      day.transactions.push({ time: dn.date, type: 'debit_note', refNo: dn.debitNoteNo, partyName: name, debit: dn.netAmount, credit: 0 });
    });

    // Expenses
    expenses.forEach(exp => {
      const day = ensureDay(exp.expense_date);
      day.expensesAmount += exp.total_amount;
      day.transactions.push({
        time: exp.expense_date, type: 'expense', refNo: exp.id.slice(0, 8),
        partyName: exp.category_name,
        subText: exp.vendor_name || undefined,
        debit: exp.total_amount, credit: 0,
      });
    });

    Object.values(days).forEach(d => {
      d.netForDay = d.paymentsReceived - d.purchasesAmount - d.expensesAmount - d.salaryAmount;
    });

    return Object.values(days).sort((a, b) => b.date.localeCompare(a.date));
  }, [userInvoices, userPayments, userPurchases, userCreditNotes, userDebitNotes, expenses, fromStr, toStr]);

  const totalSales = dailyData.reduce((s, d) => s + d.salesAmount, 0);
  const totalPayments = dailyData.reduce((s, d) => s + d.paymentsReceived, 0);
  const totalPurchases = dailyData.reduce((s, d) => s + d.purchasesAmount, 0);
  const totalExpenses = dailyData.reduce((s, d) => s + d.expensesAmount, 0);
  const netCashFlow = totalPayments - totalPurchases - totalExpenses;

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const typeRowBg = (type: string) => {
    const m: Record<string, string> = {
      invoice: 'bg-blue-50/50', payment: 'bg-green-50/50', purchase: 'bg-orange-50/50',
      credit_note: 'bg-teal-50/50', debit_note: 'bg-red-50/50',
      expense: 'bg-amber-50/50', salary: 'bg-purple-50/50',
    };
    return m[type] || '';
  };

  const typeBadge = (type: string) => {
    const m: Record<string, { label: string; cls: string }> = {
      invoice: { label: '🧾 Sale', cls: 'bg-blue-100 text-blue-800' },
      payment: { label: '💰 Receipt', cls: 'bg-green-100 text-green-800' },
      purchase: { label: '🛒 Purchase', cls: 'bg-orange-100 text-orange-800' },
      credit_note: { label: '📄 Credit Note', cls: 'bg-teal-100 text-teal-800' },
      debit_note: { label: '📋 Debit Note', cls: 'bg-red-100 text-red-800' },
      expense: { label: '💸 Expense', cls: 'bg-amber-100 text-amber-800' },
      salary: { label: '👤 Salary', cls: 'bg-purple-100 text-purple-800' },
    };
    const t = m[type] || { label: type, cls: 'bg-muted text-muted-foreground' };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.cls}`}>{t.label}</span>;
  };

  const handleExport = () => {
    const data = dailyData.flatMap(d => d.transactions.map(t => ({
      Date: d.date, Day: d.dayName, Type: t.type, 'Ref No': t.refNo, Party: t.partyName,
      Debit: t.debit || '', Credit: t.credit || '',
    })));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Ledger');
    XLSX.writeFile(wb, `Daily_Ledger_${fromStr}_to_${toStr}.xlsx`);
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">📒 Daily Ledger</h1>
        <button onClick={handleExport} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Export</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="flex gap-1">
          <button onClick={() => setViewMode('collapsed')} className={`text-xs px-3 py-1.5 rounded-md ${viewMode === 'collapsed' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}>Day View</button>
          <button onClick={() => setViewMode('full')} className={`text-xs px-3 py-1.5 rounded-md ${viewMode === 'full' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}>Full View</button>
        </div>
      </div>

      {/* Summary Cards — now includes Expenses */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="hero-card text-center"><div className="text-xs text-muted-foreground">Total Sales</div><div className="text-lg font-display font-bold text-primary">{fmt(totalSales)}</div></div>
        <div className="hero-card text-center"><div className="text-xs text-muted-foreground">Payments Received</div><div className="text-lg font-display font-bold text-green-600">{fmt(totalPayments)}</div></div>
        <div className="hero-card text-center"><div className="text-xs text-muted-foreground">Purchases</div><div className="text-lg font-display font-bold text-orange-600">{fmt(totalPurchases)}</div></div>
        <div className="hero-card text-center"><div className="text-xs text-muted-foreground">Expenses</div><div className="text-lg font-display font-bold text-amber-600">{fmt(totalExpenses)}</div></div>
        <div className="hero-card text-center"><div className="text-xs text-muted-foreground">Net Cash Flow</div><div className={`text-lg font-display font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(netCashFlow)}</div></div>
      </div>

      {viewMode === 'collapsed' ? (
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="py-2 px-3 w-8"></th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Day</th>
              <th className="py-2 px-3 text-right">Invoices</th><th className="py-2 px-3 text-right">Sales</th>
              <th className="py-2 px-3 text-right">Payments</th><th className="py-2 px-3 text-right">Purchases</th>
              <th className="py-2 px-3 text-right">Expenses</th>
              <th className="py-2 px-3 text-right">Net</th>
            </tr></thead>
            <tbody>
              {dailyData.map(d => (
                <>
                  <tr key={d.date} onClick={() => toggleDate(d.date)}
                    className={`border-b cursor-pointer hover:bg-accent/50 transition-colors ${d.netForDay > 0 ? 'bg-green-50/30' : d.netForDay < 0 ? 'bg-red-50/30' : ''}`}>
                    <td className="py-2 px-3">{expandedDates.has(d.date) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</td>
                    <td className="py-2 px-3 font-medium">{d.date}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{d.dayName}</td>
                    <td className="py-2 px-3 text-right">{d.invoicesCount}</td>
                    <td className="py-2 px-3 text-right text-primary font-medium">{fmt(d.salesAmount)}</td>
                    <td className="py-2 px-3 text-right text-green-600 font-medium">{fmt(d.paymentsReceived)}</td>
                    <td className="py-2 px-3 text-right text-orange-600 font-medium">{fmt(d.purchasesAmount)}</td>
                    <td className="py-2 px-3 text-right text-amber-600 font-medium">{fmt(d.expensesAmount)}</td>
                    <td className={`py-2 px-3 text-right font-bold ${d.netForDay >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(d.netForDay)}</td>
                  </tr>
                  {expandedDates.has(d.date) && d.transactions.map((t, i) => (
                    <tr key={`${d.date}-${i}`} className={`border-b ${typeRowBg(t.type)}`}>
                      <td></td>
                      <td className="py-1.5 px-3 pl-8">{typeBadge(t.type)}</td>
                      <td className="py-1.5 px-3 text-xs text-primary font-medium">{t.refNo}</td>
                      <td colSpan={2} className="py-1.5 px-3 text-xs">
                        <div>{t.partyName}</div>
                        {t.subText && <div className="text-[10px] text-muted-foreground">{t.subText}</div>}
                      </td>
                      <td className="py-1.5 px-3 text-right text-xs text-green-700 font-medium">{t.credit ? fmt(t.credit) : ''}</td>
                      <td className="py-1.5 px-3 text-right text-xs text-red-700 font-medium">{t.debit ? fmt(t.debit) : ''}</td>
                      <td colSpan={2}></td>
                    </tr>
                  ))}
                </>
              ))}
              {dailyData.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No transactions for this period</td></tr>
              )}
            </tbody>
            {dailyData.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td></td><td className="py-2 px-3" colSpan={2}>Grand Total</td>
                  <td className="py-2 px-3 text-right">{dailyData.reduce((s, d) => s + d.invoicesCount, 0)}</td>
                  <td className="py-2 px-3 text-right text-primary">{fmt(totalSales)}</td>
                  <td className="py-2 px-3 text-right text-green-600">{fmt(totalPayments)}</td>
                  <td className="py-2 px-3 text-right text-orange-600">{fmt(totalPurchases)}</td>
                  <td className="py-2 px-3 text-right text-amber-600">{fmt(totalExpenses)}</td>
                  <td className={`py-2 px-3 text-right ${netCashFlow >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(netCashFlow)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        /* Full Transaction View */
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="py-2 px-3">Date</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Ref No</th>
              <th className="py-2 px-3">Party / Description</th><th className="py-2 px-3 text-right">Debit</th>
              <th className="py-2 px-3 text-right">Credit</th>
            </tr></thead>
            <tbody>
              {dailyData.flatMap(d => d.transactions).sort((a, b) => a.time.localeCompare(b.time)).map((t, i) => (
                <tr key={i} className={`border-b last:border-0 ${typeRowBg(t.type)}`}>
                  <td className="py-2 px-3 text-xs">{t.time}</td>
                  <td className="py-2 px-3">{typeBadge(t.type)}</td>
                  <td className="py-2 px-3 text-xs text-primary font-medium">{t.refNo}</td>
                  <td className="py-2 px-3 text-xs">
                    <div>{t.partyName}</div>
                    {t.subText && <div className="text-[10px] text-muted-foreground">{t.subText}</div>}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-red-700">{t.debit ? fmt(t.debit) : ''}</td>
                  <td className="py-2 px-3 text-right font-medium text-green-700">{t.credit ? fmt(t.credit) : ''}</td>
                </tr>
              ))}
              {dailyData.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No transactions for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
