import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search, Download } from 'lucide-react';
import { INDIAN_STATES } from '@/types';
import { exportToExcel } from '@/services/exportService';

export default function SuppliersPage() {
  const { session, suppliers, purchases, payments, addSupplier, updateSupplier } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', gstNumber: '', address: '', city: '', pin: '', state: '', stateCode: '', category: '', bankName: '', accountNumber: '', ifsc: '', notes: '' });

  const userSuppliers = suppliers.filter(s => s.userId === session.userId);
  const filtered = userSuppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || '').includes(search));

  const getSupplierStats = (supId: string) => {
    const supPurchases = purchases.filter(p => p.userId === session.userId && p.supplierId === supId);
    const totalPurchased = supPurchases.reduce((s, p) => s + p.grandTotal, 0);
    const totalPaid = supPurchases.reduce((s, p) => s + p.amountPaid, 0);
    return { totalPurchased, totalPaid, outstanding: totalPurchased - totalPaid, count: supPurchases.length, lastDate: supPurchases.length > 0 ? supPurchases[supPurchases.length - 1].date : '' };
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addSupplier({ userId: session.userId, ...form, createdAt: new Date().toISOString().split('T')[0] });
    setShowAdd(false); setForm({ name: '', phone: '', gstNumber: '', address: '', city: '', pin: '', state: '', stateCode: '', category: '', bankName: '', accountNumber: '', ifsc: '', notes: '' });
  };

  const selectedSup = selectedId ? userSuppliers.find(s => s.id === selectedId) : null;

  if (selectedSup) {
    const stats = getSupplierStats(selectedSup.id);
    const supPurchases = purchases.filter(p => p.userId === session.userId && p.supplierId === selectedSup.id);
    const supPayments = payments.filter(p => p.userId === session.userId && p.supplierId === selectedSup.id);

    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setSelectedId(null)} className="text-sm text-primary hover:underline">{t('action.back')}</button>
        <div className="hero-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold text-lg">{selectedSup.name.charAt(0)}</div>
            <div>
              <h2 className="font-display font-bold text-lg">{selectedSup.name}</h2>
              <div className="text-xs text-muted-foreground">{selectedSup.phone}{selectedSup.gstNumber ? ` · GST: ${selectedSup.gstNumber}` : ''}</div>
              {selectedSup.address && <div className="text-xs text-muted-foreground">{selectedSup.address}, {selectedSup.city}</div>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="hero-card"><div className="text-xs text-muted-foreground">{t('supplier.totalPurchased')}</div><div className="text-lg font-display font-bold mt-1">₹{stats.totalPurchased.toLocaleString('en-IN')}</div></div>
          <div className="hero-card"><div className="text-xs text-muted-foreground">{t('purchase.amountPaid')}</div><div className="text-lg font-display font-bold mt-1 text-success">₹{stats.totalPaid.toLocaleString('en-IN')}</div></div>
          <div className="hero-card"><div className="text-xs text-muted-foreground">{t('misc.outstanding')}</div><div className={`text-lg font-display font-bold mt-1 ${stats.outstanding > 0 ? 'text-destructive' : 'text-success'}`}>{stats.outstanding > 0 ? `₹${stats.outstanding.toLocaleString('en-IN')}` : t('misc.clear')}</div></div>
          <div className="hero-card"><div className="text-xs text-muted-foreground">{t('purchase.title')}</div><div className="text-lg font-display font-bold mt-1">{stats.count}</div></div>
        </div>
        <h3 className="font-display font-semibold text-sm">{t('purchase.title')}</h3>
        <div className="space-y-2">
          {supPurchases.length === 0 ? <div className="hero-card text-center py-6"><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div> :
            supPurchases.map(p => (
              <div key={p.id} className="hero-card flex justify-between items-center">
                <div><div className="font-medium text-sm">{p.purchaseNo}</div><div className="text-xs text-muted-foreground">{p.date} · {p.supplierInvoiceNo}</div></div>
                <div className="text-right"><div className="font-mono text-sm">₹{p.grandTotal.toLocaleString('en-IN')}</div><span className={`status-chip-${p.status.toLowerCase()}`}>{p.status}</span></div>
              </div>
            ))
          }
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">{t('supplier.title')}</h1>
        <div className="flex gap-2">
          <button onClick={() => exportToExcel({ data: filtered.map(s => { const stats = getSupplierStats(s.id); return { Name: s.name, Phone: s.phone || '', GST: s.gstNumber || '', City: s.city || '', State: s.state || '', 'Total Purchased': stats.totalPurchased, Outstanding: stats.outstanding }; }), fileName: 'Suppliers', sheetName: 'Suppliers' })} className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"><Plus className="h-3.5 w-3.5" />{t('supplier.new')}</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('action.search')} className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
      </div>

      {showAdd && (
        <div className="hero-card space-y-4">
          <h3 className="font-display font-semibold text-sm">➕ {t('supplier.new')}</h3>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">📋 Basic Info</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">{t('form.name')} <span className="text-destructive">*</span></label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('form.phone')}</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('form.gst')}</label><input value={form.gstNumber} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('form.category')}</label><input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">📍 Address</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2"><label className="text-xs text-muted-foreground">{t('form.address')}</label><input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">{t('form.city')}</label><input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              <div>
                <label className="text-xs text-muted-foreground">{t('form.state')}</label>
                <select value={form.state} onChange={e => { const s = INDIAN_STATES.find(st => st.name === e.target.value); setForm(p => ({ ...p, state: e.target.value, stateCode: s?.code || '' })); }} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">Select</option>
                  {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">🏦 Bank Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">Bank Name</label><input value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">A/C No</label><input value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">IFSC</label><input value={form.ifsc} onChange={e => setForm(p => ({ ...p, ifsc: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{t('action.save')}</button>
            <button onClick={() => setShowAdd(false)} className="rounded-md border px-4 py-2 text-sm">{t('action.cancel')}</button>
          </div>
        </div>
      )}

      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(s => {
            const stats = getSupplierStats(s.id);
            return (
              <button key={s.id} onClick={() => setSelectedId(s.id)} className="mobile-card w-full text-left">
                <div className="flex justify-between items-center">
                  <div><div className="font-medium text-sm">{s.name}</div><div className="text-xs text-muted-foreground">{s.phone}{s.category ? ` · ${s.category}` : ''}</div></div>
                  <div className={`text-sm font-medium ${stats.outstanding > 0 ? 'text-destructive' : 'text-success'}`}>{stats.outstanding > 0 ? `₹${stats.outstanding.toLocaleString('en-IN')}` : '✅'}</div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="hero-card text-center py-8"><div className="text-4xl mb-2">🏭</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div>}
        </div>
      ) : (
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">{t('form.name')}</th><th className="py-2 px-3">{t('form.phone')}</th><th className="py-2 px-3">{t('form.gst')}</th><th className="py-2 px-3">{t('supplier.totalPurchased')}</th><th className="py-2 px-3">{t('misc.outstanding')}</th></tr></thead>
            <tbody>
              {filtered.map(s => {
                const stats = getSupplierStats(s.id);
                return (
                  <tr key={s.id} onClick={() => setSelectedId(s.id)} className="border-b last:border-0 cursor-pointer hover:bg-accent/50">
                    <td className="py-2.5 px-3 font-medium">{s.name}{s.category && <span className="text-xs text-muted-foreground ml-1">({s.category})</span>}</td>
                    <td className="py-2.5 px-3">{s.phone}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{s.gstNumber || '—'}</td>
                    <td className="py-2.5 px-3 font-mono">₹{stats.totalPurchased.toLocaleString('en-IN')}</td>
                    <td className={`py-2.5 px-3 font-medium ${stats.outstanding > 0 ? 'text-destructive' : 'text-success'}`}>{stats.outstanding > 0 ? `₹${stats.outstanding.toLocaleString('en-IN')}` : '✅'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8"><div className="text-4xl mb-2">🏭</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div>}
        </div>
      )}
    </div>
  );
}
