import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import DateRangePicker, { DateRange } from '@/components/DateRangePicker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, FileText, ChevronRight } from 'lucide-react';
import * as XLSX from '@e965/xlsx';

type ReportType = 'overview' | 'sales' | 'customer-sales' | 'product-sales' | 'employee-sales' | 'gstr1' | 'gstr3b' | 'hsn-summary' | 'outstanding' | 'aging' | 'payment-collection' | 'stock-summary' | 'stock-valuation' | 'low-stock' | 'daily-sales' | 'pnl';

const REPORT_MENU: { category: string; items: { id: ReportType; label: string; emoji: string }[] }[] = [
  { category: 'Business Summary', items: [
    { id: 'overview', label: 'Business Overview', emoji: '📊' },
    { id: 'pnl', label: 'Profit & Loss', emoji: '💹' },
  ]},
  { category: 'Sales Reports', items: [
    { id: 'sales', label: 'Sales Summary', emoji: '📈' },
    { id: 'customer-sales', label: 'Customer Wise Sales', emoji: '👥' },
    { id: 'product-sales', label: 'Product Wise Sales', emoji: '📦' },
    { id: 'employee-sales', label: 'Employee Wise Sales', emoji: '👷' },
    { id: 'daily-sales', label: 'Daily Sales', emoji: '📅' },
  ]},
  { category: 'GST Reports', items: [
    { id: 'gstr1', label: 'GSTR-1 Report', emoji: '🧾' },
    { id: 'gstr3b', label: 'GSTR-3B Summary', emoji: '📋' },
    { id: 'hsn-summary', label: 'HSN Summary', emoji: '🔢' },
  ]},
  { category: 'Payment Reports', items: [
    { id: 'payment-collection', label: 'Collection Report', emoji: '💰' },
    { id: 'outstanding', label: 'Outstanding Receivables', emoji: '⚠️' },
    { id: 'aging', label: 'Aging Analysis', emoji: '📊' },
  ]},
  { category: 'Inventory Reports', items: [
    { id: 'stock-summary', label: 'Stock Summary', emoji: '📋' },
    { id: 'stock-valuation', label: 'Stock Valuation', emoji: '💎' },
    { id: 'low-stock', label: 'Low Stock Alerts', emoji: '🔴' },
  ]},
];

const COLORS = ['hsl(232, 65%, 30%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(262, 83%, 58%)', 'hsl(190, 90%, 50%)'];

export default function ReportsPage() {
  const { session, invoices, payments, purchases, products, customers, employees, creditNotes, debitNotes } = useApp();
  const { t } = useLanguage();
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [showNav, setShowNav] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];

  const ui = invoices.filter(i => i.userId === session.userId && i.date >= fromStr && i.date <= toStr);
  const up = payments.filter(p => p.userId === session.userId && p.date >= fromStr && p.date <= toStr);
  const upur = purchases.filter(p => p.userId === session.userId && p.date >= fromStr && p.date <= toStr);
  const uprod = products.filter(p => p.userId === session.userId);
  const ucust = customers.filter(c => c.userId === session.userId);
  const uemp = employees.filter(e => e.userId === session.userId);
  const allInv = invoices.filter(i => i.userId === session.userId);
  const allPay = payments.filter(p => p.userId === session.userId);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const totalRevenue = ui.reduce((s, i) => s + i.grandTotal, 0);
  const totalReceived = up.reduce((s, p) => s + p.amount, 0);
  const totalPurchases = upur.reduce((s, p) => s + p.grandTotal, 0);
  const totalTax = ui.reduce((s, i) => s + i.totalCgst + i.totalSgst + i.totalIgst, 0);
  const totalOutstanding = allInv.reduce((s, inv) => {
    const rec = allPay.filter(p => p.invoiceId === inv.id).reduce((ss, p) => ss + p.amount, 0);
    return s + Math.max(0, inv.grandTotal - rec);
  }, 0);

  // Daily sales data
  const dailySalesData = useMemo(() => {
    const days: Record<string, number> = {};
    ui.forEach(inv => { days[inv.date] = (days[inv.date] || 0) + inv.grandTotal; });
    return Object.entries(days).sort().map(([date, total]) => ({ date: date.slice(5), total }));
  }, [ui]);

  // Customer wise
  const customerData = useMemo(() => {
    const map: Record<string, { name: string; invoices: number; total: number; received: number }> = {};
    ui.forEach(inv => {
      if (!map[inv.customerId]) map[inv.customerId] = { name: inv.customerName, invoices: 0, total: 0, received: 0 };
      map[inv.customerId].invoices++;
      map[inv.customerId].total += inv.grandTotal;
    });
    up.forEach(pay => {
      if (pay.customerId && map[pay.customerId]) map[pay.customerId].received += pay.amount;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [ui, up]);

  // Product wise
  const productData = useMemo(() => {
    const map: Record<string, { name: string; hsn: string; qty: number; total: number }> = {};
    ui.forEach(inv => inv.items.forEach(item => {
      if (!map[item.productId]) map[item.productId] = { name: item.productName, hsn: item.hsn, qty: 0, total: 0 };
      map[item.productId].qty += item.qty;
      map[item.productId].total += item.total;
    }));
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [ui]);

  // GST summary
  const gstSummary = useMemo(() => {
    return ui.reduce((acc, inv) => ({
      taxable: acc.taxable + inv.subtotal, cgst: acc.cgst + inv.totalCgst,
      sgst: acc.sgst + inv.totalSgst, igst: acc.igst + inv.totalIgst,
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0 });
  }, [ui]);

  // HSN summary
  const hsnData = useMemo(() => {
    const map: Record<string, { hsn: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {};
    ui.forEach(inv => inv.items.forEach(item => {
      const k = item.hsn || 'N/A';
      if (!map[k]) map[k] = { hsn: k, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
      map[k].qty += item.qty;
      map[k].taxable += item.taxableAmount;
      map[k].cgst += item.cgst;
      map[k].sgst += item.sgst;
      map[k].igst += item.igst;
      map[k].total += item.total;
    }));
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [ui]);

  // Aging
  const agingData = useMemo(() => {
    const buckets = [{ label: '0-30 days', min: 0, max: 30 }, { label: '31-60 days', min: 31, max: 60 }, { label: '61-90 days', min: 61, max: 90 }, { label: '90+ days', min: 91, max: 9999 }];
    return buckets.map(b => {
      const now = new Date();
      const matching = allInv.filter(inv => {
        const rec = allPay.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
        if (inv.grandTotal - rec <= 0) return false;
        const age = Math.ceil((now.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
        return age >= b.min && age <= b.max;
      });
      const total = matching.reduce((s, inv) => s + inv.grandTotal - allPay.filter(p => p.invoiceId === inv.id).reduce((ss, p) => ss + p.amount, 0), 0);
      return { ...b, count: matching.length, total };
    });
  }, [allInv, allPay]);

  // Employee sales data (moved from switch to top level)
  const empData = useMemo(() => {
    const map: Record<string, { name: string; role: string; invoices: number; total: number; highest: number }> = {};
    ui.forEach(inv => {
      const k = inv.createdBy.id;
      if (!map[k]) map[k] = { name: inv.createdBy.name, role: inv.createdBy.role === 'user' ? 'Owner' : 'Employee', invoices: 0, total: 0, highest: 0 };
      map[k].invoices++;
      map[k].total += inv.grandTotal;
      if (inv.grandTotal > map[k].highest) map[k].highest = inv.grandTotal;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [ui]);

  // Payment mode data (moved from switch to top level)
  const modeData = useMemo(() => {
    return ['Cash', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Bank Transfer', 'Other'].map(mode => ({
      name: mode, value: up.filter(p => p.mode === mode).reduce((s, p) => s + p.amount, 0),
    })).filter(d => d.value > 0);
  }, [up]);

  // P&L data (moved from switch to top level)
  const pnlData = useMemo(() => {
    const netSales = totalRevenue - creditNotes.filter(c => c.userId === session.userId && c.date >= fromStr && c.date <= toStr).reduce((s, c) => s + c.netAmount, 0);
    const cogs = totalPurchases;
    const grossProfit = netSales - cogs;
    return { netSales, cogs, grossProfit };
  }, [totalRevenue, creditNotes, session.userId, fromStr, toStr, totalPurchases]);

  const exportExcel = (data: any[], name: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `${name}_${fromStr}_${toStr}.xlsx`);
  };

  const SummaryCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="hero-card text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-display font-bold ${color || 'text-primary'}`}>{value}</div>
    </div>
  );

  const renderReport = () => {
    switch (activeReport) {
      case 'overview':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <SummaryCard label="Revenue" value={fmt(totalRevenue)} />
              <SummaryCard label="Invoices" value={String(ui.length)} />
              <SummaryCard label="Customers" value={String(new Set(ui.map(i => i.customerId)).size)} />
              <SummaryCard label="Avg Invoice" value={fmt(ui.length ? totalRevenue / ui.length : 0)} />
              <SummaryCard label="Tax Collected" value={fmt(totalTax)} />
              <SummaryCard label="Outstanding" value={fmt(totalOutstanding)} color="text-destructive" />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="hero-card">
                <h3 className="font-display font-semibold mb-3">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailySalesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => [fmt(v), 'Sales']} /><Bar dataKey="total" fill="hsl(232, 65%, 30%)" radius={[4,4,0,0]} /></BarChart>
                </ResponsiveContainer>
              </div>
              <div className="hero-card">
                <h3 className="font-display font-semibold mb-3">Top 5 Customers</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={customerData.slice(0, 5)} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} /><Tooltip formatter={(v: number) => [fmt(v), 'Sales']} /><Bar dataKey="total" fill="hsl(142, 71%, 45%)" radius={[0,4,4,0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="hero-card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-semibold">Business Health</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><div className="text-xs text-muted-foreground">Collection Efficiency</div><div className="text-2xl font-bold text-green-600">{totalRevenue > 0 ? ((totalReceived / totalRevenue) * 100).toFixed(0) : 0}%</div></div>
                <div><div className="text-xs text-muted-foreground">Outstanding %</div><div className="text-2xl font-bold text-destructive">{totalRevenue > 0 ? ((totalOutstanding / totalRevenue) * 100).toFixed(0) : 0}%</div></div>
                <div><div className="text-xs text-muted-foreground">Gross Margin</div><div className="text-2xl font-bold text-primary">{totalRevenue > 0 ? (((totalRevenue - totalPurchases) / totalRevenue) * 100).toFixed(0) : 0}%</div></div>
                <div><div className="text-xs text-muted-foreground">Net Cash Flow</div><div className={`text-2xl font-bold ${totalReceived - totalPurchases >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(totalReceived - totalPurchases)}</div></div>
              </div>
            </div>
          </div>
        );

      case 'customer-sales':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard label="Customers" value={String(customerData.length)} />
              <SummaryCard label="Total Sales" value={fmt(totalRevenue)} />
              <SummaryCard label="Avg/Customer" value={fmt(customerData.length ? totalRevenue / customerData.length : 0)} />
              <SummaryCard label="Top Customer" value={customerData[0]?.name || '—'} />
            </div>
            <div className="hero-card">
              <div className="flex justify-between mb-3">
                <h3 className="font-display font-semibold">Customer Wise Sales</h3>
                <button onClick={() => exportExcel(customerData.map(c => ({ Customer: c.name, Invoices: c.invoices, Sales: c.total, Received: c.received, Outstanding: c.total - c.received })), 'Customer_Sales')} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
              </div>
              <table className="w-full text-sm table-zebra">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">#</th><th className="py-2 px-3">Customer</th><th className="py-2 px-3 text-right">Invoices</th><th className="py-2 px-3 text-right">Total Sales</th><th className="py-2 px-3 text-right">Received</th><th className="py-2 px-3 text-right">Outstanding</th></tr></thead>
                <tbody>{customerData.map((c, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="py-2 px-3">{i+1}</td><td className="py-2 px-3 font-medium">{c.name}</td><td className="py-2 px-3 text-right">{c.invoices}</td><td className="py-2 px-3 text-right font-mono">{fmt(c.total)}</td><td className="py-2 px-3 text-right text-green-600">{fmt(c.received)}</td><td className="py-2 px-3 text-right text-destructive">{fmt(c.total - c.received)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        );

      case 'product-sales':
        return (
          <div className="space-y-4">
            <div className="hero-card">
              <div className="flex justify-between mb-3">
                <h3 className="font-display font-semibold">Product Wise Sales</h3>
                <button onClick={() => exportExcel(productData.map(p => ({ Product: p.name, HSN: p.hsn, Qty: p.qty, Total: p.total })), 'Product_Sales')} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
              </div>
              <table className="w-full text-sm table-zebra">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">#</th><th className="py-2 px-3">Product</th><th className="py-2 px-3">HSN</th><th className="py-2 px-3 text-right">Qty Sold</th><th className="py-2 px-3 text-right">Total Sales</th></tr></thead>
                <tbody>{productData.map((p, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="py-2 px-3">{i+1}</td><td className="py-2 px-3 font-medium">{p.name}</td><td className="py-2 px-3 font-mono text-xs">{p.hsn}</td><td className="py-2 px-3 text-right">{p.qty}</td><td className="py-2 px-3 text-right font-mono">{fmt(p.total)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        );

      case 'employee-sales':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard label="Best Performer" value={empData[0]?.name || '—'} />
              <SummaryCard label="Total by Employees" value={fmt(empData.filter(e => e.role === 'Employee').reduce((s, e) => s + e.total, 0))} />
              <SummaryCard label="Total by Owner" value={fmt(empData.filter(e => e.role === 'Owner').reduce((s, e) => s + e.total, 0))} />
              <SummaryCard label="Emp Contribution" value={`${totalRevenue > 0 ? ((empData.filter(e => e.role === 'Employee').reduce((s, e) => s + e.total, 0) / totalRevenue) * 100).toFixed(0) : 0}%`} />
            </div>
            <div className="hero-card">
              <table className="w-full text-sm table-zebra">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">Name</th><th className="py-2 px-3">Role</th><th className="py-2 px-3 text-right">Invoices</th><th className="py-2 px-3 text-right">Total Sales</th><th className="py-2 px-3 text-right">Avg Invoice</th><th className="py-2 px-3 text-right">Highest</th></tr></thead>
                <tbody>{empData.map((e, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="py-2 px-3 font-medium">{e.role === 'Owner' ? '👑' : '👷'} {e.name}</td><td className="py-2 px-3 text-xs">{e.role}</td><td className="py-2 px-3 text-right">{e.invoices}</td><td className="py-2 px-3 text-right font-mono">{fmt(e.total)}</td><td className="py-2 px-3 text-right">{fmt(e.invoices ? e.total / e.invoices : 0)}</td><td className="py-2 px-3 text-right">{fmt(e.highest)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        );

      case 'gstr1':
      case 'gstr3b':
        const itcSummary = upur.reduce((acc, pur) => ({ cgst: acc.cgst + pur.totalCgst, sgst: acc.sgst + pur.totalSgst, igst: acc.igst + pur.totalIgst }), { cgst: 0, sgst: 0, igst: 0 });
        return (
          <div className="space-y-4">
            <div className="hero-card">
              <h3 className="font-display font-semibold mb-4">{activeReport === 'gstr1' ? 'GSTR-1 — Output Tax' : 'GSTR-3B Summary'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div><div className="text-xs text-muted-foreground">Taxable Value</div><div className="text-lg font-bold">{fmt(gstSummary.taxable)}</div></div>
                <div><div className="text-xs text-muted-foreground">CGST</div><div className="text-lg font-bold">{fmt(gstSummary.cgst)}</div></div>
                <div><div className="text-xs text-muted-foreground">SGST</div><div className="text-lg font-bold">{fmt(gstSummary.sgst)}</div></div>
                <div><div className="text-xs text-muted-foreground">IGST</div><div className="text-lg font-bold">{fmt(gstSummary.igst)}</div></div>
                <div><div className="text-xs text-muted-foreground">Total Tax</div><div className="text-lg font-bold text-primary">{fmt(gstSummary.cgst + gstSummary.sgst + gstSummary.igst)}</div></div>
              </div>
            </div>
            {activeReport === 'gstr3b' && (
              <>
                <div className="hero-card">
                  <h3 className="font-display font-semibold mb-4">ITC Summary (Input)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div><div className="text-xs text-muted-foreground">CGST ITC</div><div className="text-lg font-bold text-green-600">{fmt(itcSummary.cgst)}</div></div>
                    <div><div className="text-xs text-muted-foreground">SGST ITC</div><div className="text-lg font-bold text-green-600">{fmt(itcSummary.sgst)}</div></div>
                    <div><div className="text-xs text-muted-foreground">IGST ITC</div><div className="text-lg font-bold text-green-600">{fmt(itcSummary.igst)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Total ITC</div><div className="text-lg font-bold text-green-600">{fmt(itcSummary.cgst + itcSummary.sgst + itcSummary.igst)}</div></div>
                  </div>
                </div>
                <div className="hero-card">
                  <h3 className="font-display font-semibold mb-4">Net GST Liability</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><div className="text-xs text-muted-foreground">Output GST</div><div className="text-lg font-bold text-destructive">{fmt(gstSummary.cgst + gstSummary.sgst + gstSummary.igst)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Input ITC</div><div className="text-lg font-bold text-green-600">{fmt(itcSummary.cgst + itcSummary.sgst + itcSummary.igst)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Net Payable</div><div className="text-lg font-bold text-primary">{fmt(Math.max(0, (gstSummary.cgst + gstSummary.sgst + gstSummary.igst) - (itcSummary.cgst + itcSummary.sgst + itcSummary.igst)))}</div></div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'hsn-summary':
        return (
          <div className="space-y-4">
            <div className="hero-card">
              <div className="flex justify-between mb-3">
                <h3 className="font-display font-semibold">HSN Wise Summary</h3>
                <button onClick={() => exportExcel(hsnData.map(h => ({ HSN: h.hsn, Qty: h.qty, Taxable: h.taxable, CGST: h.cgst, SGST: h.sgst, IGST: h.igst, Total: h.total })), 'HSN_Summary')} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
              </div>
              <table className="w-full text-sm table-zebra">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">HSN</th><th className="py-2 px-3 text-right">Qty</th><th className="py-2 px-3 text-right">Taxable</th><th className="py-2 px-3 text-right">CGST</th><th className="py-2 px-3 text-right">SGST</th><th className="py-2 px-3 text-right">IGST</th><th className="py-2 px-3 text-right">Total</th></tr></thead>
                <tbody>{hsnData.map((h, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="py-2 px-3 font-mono">{h.hsn}</td><td className="py-2 px-3 text-right">{h.qty}</td><td className="py-2 px-3 text-right font-mono">{fmt(h.taxable)}</td><td className="py-2 px-3 text-right">{fmt(h.cgst)}</td><td className="py-2 px-3 text-right">{fmt(h.sgst)}</td><td className="py-2 px-3 text-right">{fmt(h.igst)}</td><td className="py-2 px-3 text-right font-bold">{fmt(h.total)}</td></tr>
                ))}</tbody>
                <tfoot><tr className="border-t-2 font-bold"><td className="py-2 px-3">Total</td><td className="py-2 px-3 text-right">{hsnData.reduce((s, h) => s + h.qty, 0)}</td><td className="py-2 px-3 text-right">{fmt(hsnData.reduce((s, h) => s + h.taxable, 0))}</td><td className="py-2 px-3 text-right">{fmt(hsnData.reduce((s, h) => s + h.cgst, 0))}</td><td className="py-2 px-3 text-right">{fmt(hsnData.reduce((s, h) => s + h.sgst, 0))}</td><td className="py-2 px-3 text-right">{fmt(hsnData.reduce((s, h) => s + h.igst, 0))}</td><td className="py-2 px-3 text-right">{fmt(hsnData.reduce((s, h) => s + h.total, 0))}</td></tr></tfoot>
              </table>
            </div>
          </div>
        );

      case 'outstanding':
      case 'aging':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <SummaryCard label="Total Outstanding" value={fmt(totalOutstanding)} color="text-destructive" />
              {agingData.map(b => <SummaryCard key={b.label} label={b.label} value={fmt(b.total)} color={b.min > 60 ? 'text-destructive' : b.min > 30 ? 'text-warning' : ''} />)}
            </div>
            <div className="hero-card">
              <h3 className="font-display font-semibold mb-3">Aging Chart</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agingData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => [fmt(v), 'Outstanding']} /><Bar dataKey="total" fill="hsl(0, 72%, 51%)" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'payment-collection':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryCard label="Total Collected" value={fmt(totalReceived)} color="text-green-600" />
              <SummaryCard label="Payments Count" value={String(up.length)} />
              <SummaryCard label="Avg Payment" value={fmt(up.length ? totalReceived / up.length : 0)} />
            </div>
            <div className="hero-card">
              <h3 className="font-display font-semibold mb-3">Payment Mode Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={modeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${fmt(value)}`}>
                  {modeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip formatter={(v: number) => [fmt(v), 'Amount']} /></PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'stock-summary':
      case 'stock-valuation':
      case 'low-stock':
        const stockData = uprod.map(p => {
          const ppc = p.piecesPerCarton || 1;
          const isCartonType = p.sellingUnitType !== 'loose' && ppc > 1;
          const cartonName = p.cartonUnitName || 'Carton';
          const fullCartons = isCartonType ? Math.floor(p.stock / ppc) : 0;
          const looseRem = isCartonType ? p.stock % ppc : 0;
          let stockDisplay = `${p.stock} ${p.unit}`;
          if (isCartonType) {
            const parts: string[] = [];
            if (fullCartons > 0) parts.push(`${fullCartons} ${cartonName}${fullCartons > 1 ? 's' : ''}`);
            if (looseRem > 0) parts.push(`${looseRem} ${p.unit}`);
            if (parts.length) stockDisplay += ` (${parts.join(' + ')})`;
          }
          return {
            name: p.name, hsn: p.hsn, category: p.category || '', unit: p.unit,
            stock: p.stock, stockDisplay, minStock: p.minStock || 0,
            unitType: p.sellingUnitType,
            purchaseValue: p.stock * (p.purchasePrice || 0),
            sellingValue: p.stock * (p.sellingPrice || p.price),
            profit: p.stock * ((p.sellingPrice || p.price) - (p.purchasePrice || 0)),
            status: p.minStock && p.stock <= p.minStock ? 'Low' : 'OK',
          };
        });
        const filteredStock = activeReport === 'low-stock' ? stockData.filter(s => s.status === 'Low') : stockData;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <SummaryCard label="Products" value={String(filteredStock.length)} />
              <SummaryCard label="Total Qty" value={String(filteredStock.reduce((s, p) => s + p.stock, 0))} />
              <SummaryCard label="Purchase Value" value={fmt(filteredStock.reduce((s, p) => s + p.purchaseValue, 0))} />
              <SummaryCard label="Selling Value" value={fmt(filteredStock.reduce((s, p) => s + p.sellingValue, 0))} />
              <SummaryCard label="Potential Profit" value={fmt(filteredStock.reduce((s, p) => s + p.profit, 0))} color="text-green-600" />
            </div>
            <div className="hero-card">
              <div className="flex justify-between mb-3">
                <h3 className="font-display font-semibold">{activeReport === 'low-stock' ? 'Low Stock Alerts' : activeReport === 'stock-valuation' ? 'Stock Valuation' : 'Stock Summary'}</h3>
                <button onClick={() => exportExcel(filteredStock.map(s => ({ ...s })), 'Stock')} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
              </div>
              <table className="w-full text-sm table-zebra">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">Product</th><th className="py-2 px-3">HSN</th><th className="py-2 px-3 text-right">Stock</th><th className="py-2 px-3 text-right">Min</th><th className="py-2 px-3 text-right">Purchase Val</th><th className="py-2 px-3 text-right">Selling Val</th><th className="py-2 px-3 text-right">Profit</th><th className="py-2 px-3">Status</th></tr></thead>
                <tbody>{filteredStock.map((p, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="py-2 px-3 font-medium">{p.name}</td><td className="py-2 px-3 font-mono text-xs">{p.hsn}</td><td className="py-2 px-3 text-right font-bold">{p.stockDisplay}</td><td className="py-2 px-3 text-right">{p.minStock}</td><td className="py-2 px-3 text-right">{fmt(p.purchaseValue)}</td><td className="py-2 px-3 text-right">{fmt(p.sellingValue)}</td><td className="py-2 px-3 text-right text-green-600">{fmt(p.profit)}</td><td className="py-2 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === 'Low' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{p.status === 'Low' ? '🔴 Low' : '🟢 OK'}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        );

      case 'daily-sales':
        return (
          <div className="space-y-4">
            <div className="hero-card">
              <h3 className="font-display font-semibold mb-3">Daily Sales Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailySalesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => [fmt(v), 'Sales']} /><Bar dataKey="total" fill="hsl(232, 65%, 30%)" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            </div>
            <div className="hero-card">
              <div className="flex justify-between mb-3">
                <h3 className="font-display font-semibold">Day by Day</h3>
                <button onClick={() => exportExcel(dailySalesData.map(d => ({ Date: d.date, Sales: d.total })), 'Daily_Sales')} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
              </div>
              <table className="w-full text-sm table-zebra">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">Date</th><th className="py-2 px-3 text-right">Invoices</th><th className="py-2 px-3 text-right">Sales Amount</th></tr></thead>
                <tbody>{dailySalesData.map((d, i) => {
                  const dayInvs = ui.filter(inv => inv.date.slice(5) === d.date);
                  return <tr key={i} className="border-b last:border-0"><td className="py-2 px-3 font-medium">{d.date}</td><td className="py-2 px-3 text-right">{dayInvs.length}</td><td className="py-2 px-3 text-right font-mono font-bold">{fmt(d.total)}</td></tr>;
                })}</tbody>
                <tfoot><tr className="border-t-2 font-bold"><td className="py-2 px-3">Total</td><td className="py-2 px-3 text-right">{ui.length}</td><td className="py-2 px-3 text-right">{fmt(totalRevenue)}</td></tr></tfoot>
              </table>
            </div>
          </div>
        );

      case 'pnl':
        return (
          <div className="space-y-4">
            <div className="hero-card">
              <h3 className="font-display font-semibold mb-4">💹 Profit & Loss Summary</h3>
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex justify-between border-b pb-2"><span className="font-medium">Total Sales</span><span className="font-mono">{fmt(totalRevenue)}</span></div>
                <div className="flex justify-between text-destructive"><span>Less: Returns (CN)</span><span className="font-mono">-{fmt(totalRevenue - pnlData.netSales)}</span></div>
                <div className="flex justify-between border-b pb-2 font-bold"><span>Net Sales</span><span className="font-mono">{fmt(pnlData.netSales)}</span></div>
                <div className="flex justify-between"><span>Less: Cost of Goods (Purchases)</span><span className="font-mono text-destructive">-{fmt(pnlData.cogs)}</span></div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Gross Profit</span><span className={pnlData.grossProfit >= 0 ? 'text-green-600' : 'text-destructive'}>{fmt(pnlData.grossProfit)}</span></div>
                <div className="text-xs text-muted-foreground">Gross Margin: {pnlData.netSales > 0 ? ((pnlData.grossProfit / pnlData.netSales) * 100).toFixed(1) : 0}%</div>
              </div>
              <div className="mt-6 p-3 rounded-md bg-accent/50 text-xs text-muted-foreground">
                ⓘ This is a simplified summary based on available data. Full P&L should be prepared by your CA with all expenses included.
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <SummaryCard label="Revenue" value={fmt(totalRevenue)} />
            <div className="hero-card">
              <h3 className="font-display font-semibold mb-3">Sales Summary</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailySalesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => [fmt(v), 'Sales']} /><Bar dataKey="total" fill="hsl(232, 65%, 30%)" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
    }
  };

  const reportInfo = REPORT_MENU.flatMap(c => c.items).find(i => i.id === activeReport);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">📈 Reports</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Report Navigation */}
      <div className="flex gap-4">
        {/* Sidebar nav */}
        <div className="hidden lg:block w-56 shrink-0 space-y-1">
          {REPORT_MENU.map(cat => (
            <div key={cat.category}>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 pt-3 pb-1">{cat.category}</div>
              {cat.items.map(item => (
                <button key={item.id} onClick={() => setActiveReport(item.id)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${activeReport === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                  <span>{item.emoji}</span> {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Mobile nav */}
        <div className="lg:hidden w-full">
          <button onClick={() => setShowNav(!showNav)} className="w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm mb-3">
            <span>{reportInfo?.emoji} {reportInfo?.label}</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${showNav ? 'rotate-90' : ''}`} />
          </button>
          {showNav && (
            <div className="hero-card space-y-1 mb-4">
              {REPORT_MENU.map(cat => (
                <div key={cat.category}>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 pt-2">{cat.category}</div>
                  {cat.items.map(item => (
                    <button key={item.id} onClick={() => { setActiveReport(item.id); setShowNav(false); }}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-md ${activeReport === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      {item.emoji} {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Content */}
        <div className="flex-1 min-w-0 lg:block hidden">
          {renderReport()}
        </div>
      </div>

      {/* Mobile report content */}
      <div className="lg:hidden">
        {renderReport()}
      </div>
    </div>
  );
}
