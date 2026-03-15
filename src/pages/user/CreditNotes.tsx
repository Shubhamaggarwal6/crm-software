import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search, Download } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { exportToExcel } from '@/services/exportService';
import { CreditNote, InvoiceItem } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function CreditNotesPage() {
  const { session, creditNotes, invoices, addCreditNote, updateCreditNote } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const userCNs = creditNotes.filter(cn => cn.userId === session.userId);
  const userInvoices = invoices.filter(i => i.userId === session.userId);
  const filtered = userCNs.filter(cn => cn.creditNoteNo.toLowerCase().includes(search.toLowerCase()) || cn.customerName.toLowerCase().includes(search.toLowerCase()));

  const thisMonth = userCNs.filter(cn => cn.date.startsWith(new Date().toISOString().slice(0, 7)));
  const totalCredited = thisMonth.reduce((s, cn) => s + cn.netAmount, 0);
  const adjustedCount = userCNs.filter(cn => cn.status === 'Adjusted').length;
  const pendingCount = userCNs.filter(cn => cn.status === 'Pending').length;

  // Form state
  const [form, setForm] = useState({ invoiceId: '', date: new Date(), reason: 'Goods Returned' as CreditNote['reason'], goodsReturned: true, notes: '' });
  const [selectedItems, setSelectedItems] = useState<{ item: InvoiceItem; returnQty: number; selected: boolean }[]>([]);

  const selectedInv = userInvoices.find(i => i.id === form.invoiceId);

  const handleInvoiceSelect = (invId: string) => {
    const inv = userInvoices.find(i => i.id === invId);
    if (inv) {
      setForm(f => ({ ...f, invoiceId: invId }));
      setSelectedItems(inv.items.map(item => ({ item, returnQty: item.qty, selected: false })));
    }
  };

  const handleSave = () => {
    if (!selectedInv) return;
    const items: InvoiceItem[] = selectedItems.filter(s => s.selected).map(s => ({
      ...s.item, qty: s.returnQty,
      taxableAmount: (s.item.sellingPrice - (s.item.discount / s.item.qty)) * s.returnQty,
      cgst: s.item.cgst * (s.returnQty / s.item.qty),
      sgst: s.item.sgst * (s.returnQty / s.item.qty),
      igst: s.item.igst * (s.returnQty / s.item.qty),
      total: s.item.total * (s.returnQty / s.item.qty),
      discount: s.item.discount * (s.returnQty / s.item.qty),
    }));
    if (items.length === 0) return;
    const subtotal = items.reduce((s, i) => s + i.taxableAmount, 0);
    const cnCount = userCNs.length;
    const fy = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    addCreditNote({
      creditNoteNo: `CN-${fy}-${String(cnCount + 1).padStart(4, '0')}`,
      userId: session.userId, invoiceId: selectedInv.id, invoiceNo: selectedInv.invoiceNo,
      customerId: selectedInv.customerId, customerName: selectedInv.customerName,
      date: format(form.date, 'yyyy-MM-dd'), reason: form.reason, items,
      subtotal, totalCgst: items.reduce((s, i) => s + i.cgst, 0),
      totalSgst: items.reduce((s, i) => s + i.sgst, 0),
      totalIgst: items.reduce((s, i) => s + i.igst, 0),
      netAmount: items.reduce((s, i) => s + i.total, 0),
      goodsReturned: form.goodsReturned, notes: form.notes, status: 'Pending',
      createdAt: new Date().toISOString().split('T')[0],
    });
    setShowAdd(false);
    setForm({ invoiceId: '', date: new Date(), reason: 'Goods Returned', goodsReturned: true, notes: '' });
    setSelectedItems([]);
  };

  if (showAdd) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold">➕ {t('cn.new')}</h1>
          <button onClick={() => setShowAdd(false)} className="text-sm text-muted-foreground">{t('action.cancel')}</button>
        </div>
        <div className="hero-card space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Reference Invoice <span className="text-destructive">*</span></label>
              <select value={form.invoiceId} onChange={e => handleInvoiceSelect(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Select Invoice</option>
                {userInvoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNo} - {i.customerName} (₹{i.grandTotal})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('form.date')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between">
                    {format(form.date, 'dd MMM yyyy')} <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={form.date} onSelect={d => d && setForm(f => ({ ...f, date: d }))} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('form.reason')}</label>
              <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value as any }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {['Goods Returned', 'Price Correction', 'Discount Granted', 'Tax Correction', 'Other'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.goodsReturned} onChange={e => setForm(f => ({ ...f, goodsReturned: e.target.checked }))} /> Return to stock
          </label>
        </div>
        {selectedItems.length > 0 && (
          <div className="hero-card space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">📦 Select Items to Credit</h4>
            {selectedItems.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border rounded">
                <input type="checkbox" checked={s.selected} onChange={e => { const n = [...selectedItems]; n[i] = { ...s, selected: e.target.checked }; setSelectedItems(n); }} />
                <div className="flex-1"><div className="text-sm font-medium">{s.item.productName}</div><div className="text-xs text-muted-foreground">Original: {s.item.qty} {s.item.unit} × ₹{s.item.sellingPrice}</div></div>
                <div><label className="text-[10px] text-muted-foreground">Return Qty</label><input type="number" value={s.returnQty} min={1} max={s.item.qty} onChange={e => { const n = [...selectedItems]; n[i] = { ...s, returnQty: parseInt(e.target.value) || 1 }; setSelectedItems(n); }} className="w-20 rounded border bg-background px-2 py-1 text-sm" /></div>
              </div>
            ))}
            <div className="text-right font-display font-bold text-lg">
              Credit: ₹{selectedItems.filter(s => s.selected).reduce((sum, s) => sum + (s.item.total * (s.returnQty / s.item.qty)), 0).toFixed(0)}
            </div>
          </div>
        )}
        <div><label className="text-xs text-muted-foreground">{t('form.notes')}</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="rounded-md bg-primary px-6 py-2.5 text-sm text-primary-foreground font-medium">{t('action.save')}</button>
          <button onClick={() => setShowAdd(false)} className="rounded-md border px-6 py-2.5 text-sm">{t('action.cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">{t('cn.title')}</h1>
        <div className="flex gap-2">
          <button onClick={() => exportToExcel({ data: filtered.map(cn => ({ 'CN No': cn.creditNoteNo, Date: cn.date, Customer: cn.customerName, Invoice: cn.invoiceNo, Reason: cn.reason, Amount: cn.netAmount, Status: cn.status })), fileName: 'Credit_Notes', sheetName: 'Credit Notes' })} className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"><Plus className="h-3.5 w-3.5" />{t('cn.new')}</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="hero-card"><div className="text-xs text-muted-foreground">This Month</div><div className="text-lg font-display font-bold mt-1">{thisMonth.length}</div></div>
        <div className="hero-card"><div className="text-xs text-muted-foreground">Total Credited</div><div className="text-lg font-display font-bold mt-1 text-secondary">₹{totalCredited.toFixed(0)}</div></div>
        <div className="hero-card"><div className="text-xs text-muted-foreground">Adjusted</div><div className="text-lg font-display font-bold mt-1 text-success">{adjustedCount}</div></div>
        <div className="hero-card"><div className="text-xs text-muted-foreground">{t('status.pending')}</div><div className="text-lg font-display font-bold mt-1 text-warning">{pendingCount}</div></div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('action.search')} className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
      </div>
      {filtered.length === 0 ? (
        <div className="hero-card text-center py-8"><div className="text-4xl mb-2">📄</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p><button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-primary hover:underline">{t('cn.new')}</button></div>
      ) : (
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm table-zebra">
             <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">CN No</th><th className="py-2 px-3">{t('form.date')}</th><th className="py-2 px-3">Customer</th><th className="py-2 px-3">Invoice</th><th className="py-2 px-3">{t('form.reason')}</th><th className="py-2 px-3">{t('form.amount')}</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Share</th></tr></thead>
            <tbody>
              {filtered.map(cn => (
                <tr key={cn.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="py-2.5 px-3 font-medium text-primary">{cn.creditNoteNo}</td>
                  <td className="py-2.5 px-3">{cn.date}</td>
                  <td className="py-2.5 px-3">{cn.customerName}</td>
                  <td className="py-2.5 px-3 text-xs">{cn.invoiceNo}</td>
                  <td className="py-2.5 px-3 text-xs">{cn.reason}</td>
                  <td className="py-2.5 px-3 font-mono">₹{cn.netAmount.toFixed(0)}</td>
                  <td className="py-2.5 px-3"><span className={`status-chip-${cn.status.toLowerCase()}`}>{cn.status}</span></td>
                  <td className="py-2.5 px-3">
                    <ShareButton documentType="credit_note" documentId={cn.id} documentNo={cn.creditNoteNo} firmName="" amount={cn.netAmount} userId={session.userId} iconOnly />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
