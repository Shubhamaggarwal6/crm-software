import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Plus, Search, Download } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { exportToExcel } from '@/services/exportService';
import { DebitNote } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function DebitNotesPage() {
  const { session, debitNotes, customers, suppliers, addDebitNote } = useApp();
  const { t } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const userDNs = debitNotes.filter(dn => dn.userId === session.userId);
  const filtered = userDNs.filter(dn => dn.debitNoteNo.toLowerCase().includes(search.toLowerCase()) || (dn.customerName || dn.supplierName || '').toLowerCase().includes(search.toLowerCase()));
  const userCustomers = customers.filter(c => c.userId === session.userId);
  const userSuppliers = suppliers.filter(s => s.userId === session.userId);

  const [form, setForm] = useState({
    type: 'customer' as DebitNote['type'], customerId: '', supplierId: '', invoiceNo: '', supplierRefNo: '',
    date: new Date(), reason: 'Price Increase' as DebitNote['reason'], description: '', amount: 0,
    gstRate: 18, isInterState: false, notes: '',
  });

  const handleSave = () => {
    const gstAmt = form.amount * (form.gstRate / 100);
    const dnCount = userDNs.length;
    const fy = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const customer = userCustomers.find(c => c.id === form.customerId);
    const supplier = userSuppliers.find(s => s.id === form.supplierId);
    addDebitNote({
      debitNoteNo: `DN-${fy}-${String(dnCount + 1).padStart(4, '0')}`,
      userId: session.userId, type: form.type,
      customerId: form.type === 'customer' ? form.customerId : undefined,
      customerName: form.type === 'customer' ? customer?.name : undefined,
      supplierId: form.type === 'supplier' ? form.supplierId : undefined,
      supplierName: form.type === 'supplier' ? supplier?.name : undefined,
      invoiceNo: form.invoiceNo || undefined, supplierRefNo: form.supplierRefNo || undefined,
      date: format(form.date, 'yyyy-MM-dd'), reason: form.reason, description: form.description,
      amount: form.amount, gstRate: form.gstRate,
      cgst: form.isInterState ? 0 : gstAmt / 2, sgst: form.isInterState ? 0 : gstAmt / 2,
      igst: form.isInterState ? gstAmt : 0, netAmount: form.amount + gstAmt,
      notes: form.notes, status: 'Pending', createdAt: new Date().toISOString().split('T')[0],
    });
    setShowAdd(false);
    setForm({ type: 'customer', customerId: '', supplierId: '', invoiceNo: '', supplierRefNo: '', date: new Date(), reason: 'Price Increase', description: '', amount: 0, gstRate: 18, isInterState: false, notes: '' });
  };

  if (showAdd) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold">➕ {t('dn.new')}</h1>
          <button onClick={() => setShowAdd(false)} className="text-sm text-muted-foreground">{t('action.cancel')}</button>
        </div>
        <div className="hero-card space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setForm(f => ({ ...f, type: 'customer' }))} className={`px-4 py-2 rounded-md text-sm ${form.type === 'customer' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}>👤 Issue to Customer</button>
            <button onClick={() => setForm(f => ({ ...f, type: 'supplier' }))} className={`px-4 py-2 rounded-md text-sm ${form.type === 'supplier' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}>🏭 From Supplier</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {form.type === 'customer' ? (
              <div>
                <label className="text-xs text-muted-foreground">Customer <span className="text-destructive">*</span></label>
                <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">Select</option>
                  {userCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs text-muted-foreground">Supplier <span className="text-destructive">*</span></label>
                <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">Select</option>
                  {userSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
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
                {['Price Increase', 'Short Supply', 'Additional Charges', 'Interest on Late Payment', 'Other'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">{t('form.amount')} ₹ <span className="text-destructive">*</span></label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            <div>
              <label className="text-xs text-muted-foreground">GST %</label>
              <select value={form.gstRate} onChange={e => setForm(f => ({ ...f, gstRate: parseFloat(e.target.value) }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
          <div className="text-right font-display font-bold text-lg">
            Net: ₹{(form.amount + form.amount * (form.gstRate / 100)).toFixed(0)}
          </div>
        </div>
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
        <h1 className="text-xl md:text-2xl font-display font-bold">{t('dn.title')}</h1>
        <div className="flex gap-2">
          <button onClick={() => exportToExcel({ data: filtered.map(dn => ({ 'DN No': dn.debitNoteNo, Date: dn.date, Type: dn.type, Party: dn.customerName || dn.supplierName, Reason: dn.reason, Amount: dn.amount, GST: dn.cgst + dn.sgst + dn.igst, Total: dn.netAmount, Status: dn.status })), fileName: 'Debit_Notes', sheetName: 'Debit Notes' })} className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Excel</button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"><Plus className="h-3.5 w-3.5" />{t('dn.new')}</button>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('action.search')} className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
      </div>
      {filtered.length === 0 ? (
        <div className="hero-card text-center py-8"><div className="text-4xl mb-2">📋</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p><button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-primary hover:underline">{t('dn.new')}</button></div>
      ) : (
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm table-zebra">
             <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">DN No</th><th className="py-2 px-3">{t('form.date')}</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Party</th><th className="py-2 px-3">{t('form.reason')}</th><th className="py-2 px-3">{t('form.amount')}</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Share</th></tr></thead>
            <tbody>
              {filtered.map(dn => (
                <tr key={dn.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="py-2.5 px-3 font-medium text-primary">{dn.debitNoteNo}</td>
                  <td className="py-2.5 px-3">{dn.date}</td>
                  <td className="py-2.5 px-3 text-xs">{dn.type === 'customer' ? '👤 Customer' : '🏭 Supplier'}</td>
                  <td className="py-2.5 px-3">{dn.customerName || dn.supplierName}</td>
                  <td className="py-2.5 px-3 text-xs">{dn.reason}</td>
                  <td className="py-2.5 px-3 font-mono">₹{dn.netAmount.toFixed(0)}</td>
                  <td className="py-2.5 px-3"><span className={`status-chip-${dn.status.toLowerCase()}`}>{dn.status}</span></td>
                  <td className="py-2.5 px-3">
                    <ShareButton documentType="debit_note" documentId={dn.id} documentNo={dn.debitNoteNo} firmName="" amount={dn.netAmount} userId={session.userId} iconOnly />
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
