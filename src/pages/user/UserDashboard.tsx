import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { getSubscriptionStatus } from '@/types';
import {
  TrendingUp, Clock, FileText, IndianRupee, AlertTriangle, Building2,
  ShoppingBag, Wallet, BarChart3, Sun, Moon, CloudSun, RefreshCw,
  Users, Package, AlertCircle, Truck, Receipt, Banknote,
  Plus, CreditCard, Shield, Trophy, ChevronRight, Zap
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';

// ─── Animated Counter Hook ───
function useCountUp(target: number, duration = 1500) {
  const [val, setVal] = useState(0);
  const frame = useRef<number>();
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setVal(Math.round(eased * target));
      if (progress < 1) frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [target, duration]);
  return val;
}

// ─── Party Avatar Color ───
const AVATAR_COLORS = ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#00838f', '#c62828', '#283593', '#f9a825'];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const DONUT_COLORS = ['#f9a825', '#1565c0', '#283593', '#6a1b9a', '#00838f', '#e65100'];

export default function UserDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { session, getCurrentUser, invoices, products, payments, bankAccounts, customers, refreshData } = useApp();
  const { t, formatCurrency } = useLanguage();
  const isMobile = useIsMobile();
  const user = getCurrentUser();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const sub = user ? getSubscriptionStatus(user.subscriptionEnd) : { status: 'active' as const, daysLeft: 0, color: '', label: '' };
  const userInvoices = invoices.filter(i => i.userId === session.userId);
  const userPayments = payments.filter(p => p.userId === session.userId);
  const userProducts = products.filter(p => p.userId === session.userId);
  const userCustomers = customers.filter(c => c.userId === session.userId);
  const userBanks = bankAccounts.filter(a => a.userId === session.userId);
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  // ─── Greeting ───
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dash.goodMorning') : hour < 17 ? t('dash.goodAfternoon') : t('dash.goodEvening');
  const GreetIcon = hour < 12 ? Sun : hour < 17 ? CloudSun : Moon;

  // ─── Today's metrics ───
  const todayInvoices = userInvoices.filter(i => i.date === today);
  const todaySales = todayInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const todayCollection = userPayments.filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);

  const totalOutstanding = userInvoices.reduce((s, inv) => {
    const received = userPayments.filter(p => p.invoiceId === inv.id).reduce((ss, p) => ss + p.amount, 0);
    return s + Math.max(0, inv.grandTotal - received);
  }, 0);

  const monthlyRevenue = userInvoices.filter(i => i.date.startsWith(thisMonth)).reduce((s, i) => s + i.grandTotal, 0);
  const monthInvoiceCount = userInvoices.filter(i => i.date.startsWith(thisMonth)).length;

  const pendingCount = userInvoices.filter(inv => {
    const received = userPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
    return inv.grandTotal - received > 0;
  }).length;

  const pendingParties = new Set(
    userInvoices.filter(inv => {
      const received = userPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
      return inv.grandTotal - received > 0;
    }).map(inv => inv.customerId || inv.customerName)
  ).size;

  const lowStockProducts = userProducts.filter(p => p.minStock && p.stock <= p.minStock);

  // Animated values
  const animSales = useCountUp(todaySales);
  const animReceived = useCountUp(todayCollection);
  const animOutstanding = useCountUp(totalOutstanding);
  const animMonthly = useCountUp(monthlyRevenue);

  // ─── Yesterday comparison ───
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = yesterday.toISOString().split('T')[0];
  const yestSales = userInvoices.filter(i => i.date === yestStr).reduce((s, i) => s + i.grandTotal, 0);
  const yestCollection = userPayments.filter(p => p.date === yestStr).reduce((s, p) => s + p.amount, 0);
  const salesPctChange = yestSales > 0 ? Math.round(((todaySales - yestSales) / yestSales) * 100) : todaySales > 0 ? 100 : 0;
  const collPctChange = yestCollection > 0 ? Math.round(((todayCollection - yestCollection) / yestCollection) * 100) : todayCollection > 0 ? 100 : 0;

  // Last month comparison
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);
  const lastMonthRev = userInvoices.filter(i => i.date.startsWith(lastMonthKey)).reduce((s, i) => s + i.grandTotal, 0);
  const monthPctChange = lastMonthRev > 0 ? Math.round(((monthlyRevenue - lastMonthRev) / lastMonthRev) * 100) : monthlyRevenue > 0 ? 100 : 0;

  // ─── Charts ───
  const revenueTrend = useMemo(() => {
    const months: { month: string; revenue: number; collections: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const monthInv = userInvoices.filter(inv => inv.date.startsWith(key));
      const monthPay = userPayments.filter(p => p.date.startsWith(key));
      months.push({
        month: label,
        revenue: Math.round(monthInv.reduce((s, i) => s + i.grandTotal, 0)),
        collections: Math.round(monthPay.reduce((s, p) => s + p.amount, 0)),
      });
    }
    return months;
  }, [userInvoices, userPayments]);

  const paymentModes = useMemo(() => {
    const map: Record<string, number> = {};
    userPayments.filter(p => p.date.startsWith(thisMonth)).forEach(p => {
      map[p.mode || 'Other'] = (map[p.mode || 'Other'] || 0) + p.amount;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).map(([name, value]) => ({
      name, value: Math.round(value), pct: total > 0 ? Math.round((value / total) * 100) : 0,
    })).sort((a, b) => b.value - a.value);
  }, [userPayments, thisMonth]);

  const paymentModeTotal = paymentModes.reduce((s, m) => s + m.value, 0);

  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; total: number }> = {};
    userInvoices.filter(i => i.date.startsWith(thisMonth)).forEach(inv => {
      const key = inv.customerId || inv.customerName;
      if (!map[key]) map[key] = { name: inv.customerName, total: 0 };
      map[key].total += inv.grandTotal;
    });
    const sorted = Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
    const max = sorted[0]?.total || 1;
    return sorted.map(c => ({ ...c, pct: Math.round((c.total / max) * 100) }));
  }, [userInvoices, thisMonth]);

  // ─── Refresh ───
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshData(); } catch { }
    setLastUpdated(new Date());
    setRefreshing(false);
  }, [refreshData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => { handleRefresh(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  const minutesAgo = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
  const lastUpdatedText = minutesAgo === 0 ? t('dash.justNow') : `${minutesAgo}${t('dash.minutesAgo')}`;

  if (!user) return null;

  const fmtK = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`;
  const fmt = (v: number) => formatCurrency(v);
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fyStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  const ComparisonChip = ({ pct, label }: { pct: number; label?: string }) => (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-2 py-0.5 ${pct >= 0 ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
      {pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}% {label || t('dash.vsYesterday')}
    </span>
  );

  const RANK_COLORS = ['#f9a825', '#90a4ae', '#8d6e63', '#1565c0', '#1565c0'];

  return (
    <div className="space-y-4 pb-8">
      {/* ═══ WELCOME BANNER ═══ */}
      <div className="relative overflow-hidden rounded-xl p-5 md:p-6" style={{ background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 50%, #00897b 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -right-5 top-10 w-24 h-24 rounded-full opacity-5" style={{ background: 'white' }} />
        <div className="absolute right-20 -bottom-8 w-32 h-32 rounded-full opacity-5" style={{ background: 'white' }} />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <GreetIcon className="h-4 w-4" /> {greeting}
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-white">{user.firmName}</h1>
            <p className="text-white/60 text-xs mt-1">{t('dash.businessSummary')}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <div className="rounded-lg bg-white/15 backdrop-blur px-3 py-1.5 text-white text-xs font-medium">{dateStr}</div>
            <div className="text-white/60 text-[10px]">FY {fyStart}-{String(fyStart + 1).slice(-2)}</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span></span>
                <span className="text-white/50 text-[10px]">Live • {lastUpdatedText}</span>
              </div>
              <button onClick={handleRefresh} disabled={refreshing} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                <RefreshCw className={`h-3 w-3 text-white/60 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 4 GRADIENT METRIC CARDS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Today's Sales */}
        <div className="relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default group" style={{ background: 'linear-gradient(135deg, #e65100, #f57c00)' }}>
          <ShoppingBag className="absolute -right-2 -bottom-2 h-16 w-16 text-white opacity-[0.12]" />
          <div className="relative">
            <div className="text-white/80 text-[10px] uppercase tracking-wider font-medium">{t('dash.todaySales')}</div>
            <div className="text-white text-xl md:text-2xl font-display font-bold mt-1">{fmt(animSales)}</div>
            {salesPctChange !== 0 && <ComparisonChip pct={salesPctChange} />}
            <div className="text-white/60 text-[10px] mt-2">{todayInvoices.length} {t('dash.invoicesToday')}</div>
          </div>
        </div>

        {/* Total Received */}
        <div className="relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default" style={{ background: 'linear-gradient(135deg, #1b5e20, #2e7d32, #43a047)' }}>
          <Wallet className="absolute -right-2 -bottom-2 h-16 w-16 text-white opacity-[0.12]" />
          <div className="relative">
            <div className="text-white/80 text-[10px] uppercase tracking-wider font-medium">{t('dash.totalReceived')}</div>
            <div className="text-white text-xl md:text-2xl font-display font-bold mt-1">{fmt(animReceived)}</div>
            {collPctChange !== 0 && <ComparisonChip pct={collPctChange} />}
            <div className="text-white/60 text-[10px] mt-2">{userPayments.filter(p => p.date === today).length} {t('dash.paymentsToday')}</div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default" style={{ background: 'linear-gradient(135deg, #b71c1c, #c62828, #e53935)' }}>
          <AlertTriangle className="absolute -right-2 -bottom-2 h-16 w-16 text-white opacity-[0.12]" />
          <div className="relative">
            <div className="text-white/80 text-[10px] uppercase tracking-wider font-medium">{t('dash.outstanding')}</div>
            <div className="text-white text-xl md:text-2xl font-display font-bold mt-1">{fmt(animOutstanding)}</div>
            <div className="text-white/60 text-[10px] mt-1">{pendingCount} {t('dash.pendingInvoices')}</div>
            <div className="text-white/60 text-[10px]">{pendingParties} {t('dash.partiesWithDues')}</div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default" style={{ background: 'linear-gradient(135deg, #4a148c, #6a1b9a, #7b1fa2)' }}>
          <BarChart3 className="absolute -right-2 -bottom-2 h-16 w-16 text-white opacity-[0.12]" />
          <div className="relative">
            <div className="text-white/80 text-[10px] uppercase tracking-wider font-medium">{t('dash.monthRevenue')}</div>
            <div className="text-white text-xl md:text-2xl font-display font-bold mt-1">{fmt(animMonthly)}</div>
            {monthPctChange !== 0 && <ComparisonChip pct={monthPctChange} label={t('dash.vsLastMonth')} />}
            <div className="text-white/60 text-[10px] mt-2">{monthInvoiceCount} {t('dash.totalInvoices')}</div>
          </div>
        </div>
      </div>

      {/* ═══ SECONDARY METRIC PILLS ═══ */}
      <div className={`flex gap-2 ${isMobile ? 'overflow-x-auto pb-2 -mx-3 px-3 scrollbar-none' : 'grid grid-cols-6'}`}>
        {[
          { icon: Users, label: t('dash.totalParties'), value: userCustomers.length, color: '#1565c0' },
          { icon: Package, label: t('dash.totalProducts'), value: userProducts.length, color: '#283593' },
          { icon: AlertCircle, label: t('dash.lowStockItems'), value: lowStockProducts.length, color: '#c62828', onClick: () => onNavigate?.('low-stock') },
          { icon: Truck, label: t('dash.todayPurchases'), value: '—', color: '#e65100' },
          { icon: Receipt, label: t('dash.todayExpenses'), value: '—', color: '#f9a825' },
          { icon: Banknote, label: t('dash.cashInHand'), value: '—', color: '#2e7d32' },
        ].map((pill, i) => (
          <div
            key={i}
            onClick={pill.onClick}
            className={`flex items-center gap-2.5 rounded-lg border bg-card p-3 transition-all hover:shadow-md ${isMobile ? 'min-w-[140px] shrink-0' : ''} ${pill.onClick ? 'cursor-pointer' : ''}`}
            style={{ borderLeftWidth: 3, borderLeftColor: pill.color }}
          >
            <pill.icon className="h-4 w-4 shrink-0" style={{ color: pill.color }} />
            <div>
              <div className="text-[10px] text-muted-foreground whitespace-nowrap">{pill.label}</div>
              <div className="font-display font-bold text-sm">{typeof pill.value === 'number' ? pill.value : pill.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ CHARTS ═══ */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Revenue Trend — Area Chart */}
        <div className="rounded-xl border bg-card p-4 shadow-sm" style={{ borderTopWidth: 3, borderTopColor: '#1565c0' }}>
          <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5" style={{ color: '#1a237e' }}>
            <TrendingUp className="h-4 w-4" /> {t('dash.salesVsCollection')}
          </h3>
          {revenueTrend.some(m => m.revenue > 0 || m.collections > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueTrend} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={50} />
                <Tooltip formatter={(v: number, name: string) => [fmt(v), name === 'revenue' ? t('dash.sales') : t('dash.collections')]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Legend formatter={(v) => v === 'revenue' ? t('dash.sales') : t('dash.collections')} />
                <Bar dataKey="revenue" fill="#1565c0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collections" fill="#2e7d32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">{t('dash.noRevenueData')}</p>
          )}
        </div>

        {/* Payment Mode Donut */}
        <div className="rounded-xl border bg-card p-4 shadow-sm" style={{ borderTopWidth: 3, borderTopColor: '#2e7d32' }}>
          <h3 className="font-display font-semibold text-sm mb-3" style={{ color: '#1a237e' }}>💳 {t('dash.paymentModeChart')}</h3>
          {paymentModes.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={paymentModes} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={38} paddingAngle={2}>
                      {paymentModes.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground">Total</div>
                    <div className="font-display font-bold text-xs">{fmtK(paymentModeTotal)}</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {paymentModes.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-muted-foreground flex-1">{m.name}</span>
                    <span className="font-mono font-medium">{fmtK(m.value)}</span>
                    <span className="text-muted-foreground text-[10px]">{m.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">{t('dash.noPaymentsMonth')}</p>
          )}
        </div>
      </div>

      {/* ═══ BOTTOM 3-COL: Recent Invoices + Quick Actions/Low Stock ═══ */}
      <div className="grid md:grid-cols-3 gap-3">
        {/* Recent Invoices (2 cols) */}
        <div className="md:col-span-2 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm" style={{ color: '#1a237e' }}>{t('dash.recentInvoices')}</h3>
            <button onClick={() => onNavigate?.('invoices')} className="text-xs text-primary hover:underline flex items-center gap-0.5">{t('dash.viewAll')} <ChevronRight className="h-3 w-3" /></button>
          </div>
          {userInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('dash.noInvoicesYet')}</p>
          ) : (
            <div className="space-y-1">
              {userInvoices.slice(-8).reverse().map(inv => {
                const received = userPayments.filter(p => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
                const status = (inv.grandTotal - received) <= 0 ? 'paid' : received > 0 ? 'partial' : 'unpaid';
                const statusStyles = { paid: 'bg-green-500 text-white', partial: 'bg-amber-500 text-white', unpaid: 'bg-red-500 text-white' };
                const borderColor = { paid: '#2e7d32', partial: '#f9a825', unpaid: '#c62828' };
                const avatarBg = getAvatarColor(inv.customerName);
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer" style={{ borderLeft: `2px solid ${borderColor[status]}` }} onClick={() => onNavigate?.('invoices')}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: avatarBg }}>
                      {inv.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{inv.customerName}</div>
                      <div className="text-[10px] text-muted-foreground">{inv.invoiceNo} • {inv.date}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm">{fmt(inv.grandTotal)}</div>
                      <span className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusStyles[status]}`}>
                        {status === 'paid' ? t('invoice.paid') : status === 'partial' ? t('invoice.partial') : t('invoice.unpaid')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions + Low Stock */}
        <div className="space-y-3">
          {/* Quick Actions */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="font-display font-semibold text-sm mb-3" style={{ color: '#1a237e' }}>⚡ {t('dash.quickActions')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t('dash.createInvoice'), icon: FileText, grad: 'linear-gradient(135deg, #1565c0, #283593)', tab: 'chatbot' },
                { label: t('dash.addPayment'), icon: Wallet, grad: 'linear-gradient(135deg, #2e7d32, #00897b)', tab: 'payments' },
                { label: t('dash.addPurchase'), icon: Truck, grad: 'linear-gradient(135deg, #e65100, #f57c00)', tab: 'purchases' },
                { label: t('dash.addExpense'), icon: Receipt, grad: 'linear-gradient(135deg, #6a1b9a, #ab47bc)', tab: 'expenses' },
              ].map(a => (
                <button key={a.label} onClick={() => onNavigate?.(a.tab)} className="flex flex-col items-center gap-1.5 rounded-lg p-3 text-white transition-all hover:scale-[1.03] hover:shadow-lg" style={{ background: a.grad }}>
                  <a.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Low Stock */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm" style={{ color: '#1a237e' }}>⚠️ {t('dash.lowStock')}</h3>
              {lowStockProducts.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{lowStockProducts.length}</span>
              )}
            </div>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-xs text-muted-foreground">{t('dash.allStockHealthy')}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockProducts.slice(0, 5).map(p => {
                  const pct = p.minStock ? Math.min((p.stock / p.minStock) * 100, 100) : 0;
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between text-xs">
                        <span className="truncate flex-1">{p.name}</span>
                        <span className="font-bold text-destructive ml-2">{p.stock}</span>
                        <span className="text-muted-foreground ml-1">/ {p.minStock}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 bg-red-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {lowStockProducts.length > 5 && (
                  <button onClick={() => onNavigate?.('low-stock')} className="text-[10px] text-primary hover:underline">View all {lowStockProducts.length} items →</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TOP PARTIES ═══ */}
      {topCustomers.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm" style={{ borderTopWidth: 3, borderTopColor: '#f9a825' }}>
          <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5" style={{ color: '#1a237e' }}>
            <Trophy className="h-4 w-4 text-amber-500" /> {t('dash.topParties')}
          </h3>
          <div className="space-y-2.5">
            {topCustomers.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: RANK_COLORS[i] }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${c.pct}%`, backgroundColor: RANK_COLORS[i] }} />
                  </div>
                </div>
                <span className="font-mono font-bold text-sm shrink-0">{fmtK(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SUBSCRIPTION STATUS ═══ */}
      {(() => {
        const subGrad = sub.status === 'critical'
          ? 'linear-gradient(135deg, #b71c1c, #c62828)'
          : sub.status === 'warning'
          ? 'linear-gradient(135deg, #f57f17, #ff8f00)'
          : 'linear-gradient(135deg, #1b5e20, #2e7d32)';
        const SubIcon = sub.status === 'critical' ? AlertTriangle : sub.status === 'warning' ? AlertTriangle : Shield;
        return (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: subGrad }}>
            <SubIcon className={`h-6 w-6 text-white shrink-0 ${sub.status === 'critical' ? 'animate-pulse' : ''}`} />
            <div className="flex-1">
              <div className="text-white font-display font-semibold text-sm">
                {sub.status === 'critical' ? t('dash.subscriptionExpiring').replace('{days}', String(sub.daysLeft)) : sub.status === 'warning' ? `${t('dash.subscriptionExpiringSoon')} — ${sub.daysLeft} ${t('dash.daysRemaining')}` : `${t('dash.subscriptionActive')} — ${user.plan}`}
              </div>
              <div className="text-white/60 text-[10px]">{t('dash.expires')}: {user.subscriptionEnd} {sub.status !== 'critical' && sub.status !== 'warning' ? `• ${sub.daysLeft} ${t('dash.daysRemaining')}` : ''}</div>
            </div>
            {(sub.status === 'critical' || sub.status === 'warning') && (
              <button className="rounded-md border border-white/50 px-3 py-1.5 text-white text-xs font-medium hover:bg-white/10 transition-colors">{t('dash.renewNow')}</button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
