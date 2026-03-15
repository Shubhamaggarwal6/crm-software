import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search, Upload, Download, Info } from 'lucide-react';
import { INDIAN_STATES } from '@/types';
import { getStateFromGST, detectTaxType } from '@/constants/indianStates';
import * as XLSX from '@e965/xlsx';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomerProfile from '@/components/CustomerProfile';

export default function CustomersPage({ viewOnly = false }: { viewOnly?: boolean }) {
  const { session, customers, addCustomer, invoices, payments, getCurrentUser } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<'manual' | 'excel'>('manual');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', altPhone: '', email: '', gstNumber: '', pan: '',
    address: '', area: '', city: '', pin: '', state: '', stateCode: '',
    type: 'Retail', openingBalance: 0, creditLimit: 0, paymentTerms: '',
    customerSince: new Date().toISOString().split('T')[0], notes: '', tags: '',
  });
  const [customerSinceDate, setCustomerSinceDate] = useState<Date | undefined>(new Date());
  const [gstAutoDetected, setGstAutoDetected] = useState(false);
  const owner = getCurrentUser();
  const userCustomers = customers.filter(c => c.userId === session.userId);
  const filtered = userCustomers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const handleAdd = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    addCustomer({
      userId: session.userId, ...form,
      openingBalance: form.openingBalance || undefined,
      creditLimit: form.creditLimit || undefined,
      customerSince: customerSinceDate ? format(customerSinceDate, 'yyyy-MM-dd') : undefined,
      createdAt: new Date().toISOString().split('T')[0],
    });
    setShowAdd(false);
    setForm({ name: '', phone: '', altPhone: '', email: '', gstNumber: '', pan: '', address: '', area: '', city: '', pin: '', state: '', stateCode: '', type: 'Retail', openingBalance: 0, creditLimit: 0, paymentTerms: '', customerSince: '', notes: '', tags: '' });
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      rows.forEach(row => {
        addCustomer({ userId: session.userId, name: row.Name || '', phone: String(row.Phone || ''), gstNumber: row.GST || '', address: row.Address || '', state: row.State || '', stateCode: row.StateCode || '', type: row.Type || 'Retail', createdAt: new Date().toISOString().split('T')[0] });
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const template = [{ Name: 'John Doe', Phone: '9876543210', GST: '07AABCU1234R1ZA', PAN: '', Address: '123 Street', City: 'Delhi', State: 'Delhi', StateCode: '07', Type: 'Retail' }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parties');
    XLSX.writeFile(wb, 'Party_Template.xlsx');
  };

  const getOutstanding = (custId: string) => {
    const total = invoices.filter(i => i.userId === session.userId && i.customerId === custId).reduce((s, i) => s + i.grandTotal, 0);
    const paid = payments.filter(p => p.userId === session.userId && p.customerId === custId).reduce((s, p) => s + p.amount, 0);
    return total - paid;
  };

  const selectedCustomer = selectedId ? userCustomers.find(c => c.id === selectedId) : null;

  if (selectedCustomer) {
    return <CustomerProfile customer={selectedCustomer} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">{t('nav.parties') || 'Parties'}</h1>
        {!viewOnly && (
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
            <Plus className="h-3.5 w-3.5" />{isMobile ? t('action.add') : 'Add Party'}
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('action.search')} className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
      </div>

      {showAdd && !viewOnly && (
        <div className="hero-card space-y-4">
          <div className="flex gap-2 border-b pb-2">
            <button onClick={() => setAddTab('manual')} className={`px-3 py-1.5 text-xs rounded-md ${addTab === 'manual' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>✏️ Manual</button>
            <button onClick={() => setAddTab('excel')} className={`px-3 py-1.5 text-xs rounded-md ${addTab === 'excel' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>📊 Excel</button>
          </div>

          {addTab === 'manual' ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">📋 Basic Info</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground">{t('form.name')} <span className="text-destructive">*</span></label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('form.phone')} <span className="text-destructive">*</span></label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">Alt Phone</label><input value={form.altPhone} onChange={e => setForm(p => ({ ...p, altPhone: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('form.email')}</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                      <option>Retail</option><option>Wholesale</option><option>Distributor</option><option>Dealer</option><option>Other</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">{t('form.gst')}</label><input value={form.gstNumber} onChange={e => {
                    const val = e.target.value.toUpperCase();
                    setForm(p => ({ ...p, gstNumber: val }));
                    if (val.length >= 2) {
                      const stateInfo = getStateFromGST(val);
                      if (stateInfo) {
                        setForm(p => ({ ...p, gstNumber: val, state: stateInfo.stateName, stateCode: stateInfo.stateCode }));
                        setGstAutoDetected(true);
                      }
                    } else { setGstAutoDetected(false); }
                  }} maxLength={15} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  {gstAutoDetected && form.gstNumber.length >= 2 && (
                    <div className="col-span-2 md:col-span-3">
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-md px-2 py-1">
                        <Info className="h-3 w-3" /> State auto-detected from GST number
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">📋 Additional</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground">{t('form.pan')}</label><input value={form.pan} onChange={e => setForm(p => ({ ...p, pan: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">📍 Address</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2"><label className="text-xs text-muted-foreground">{t('form.address')}</label><input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('form.city')}</label><input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">{t('form.pin')}</label><input value={form.pin} onChange={e => setForm(p => ({ ...p, pin: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('form.state')}</label>
                    <select value={form.state} onChange={e => { const s = INDIAN_STATES.find(st => st.name === e.target.value); setForm(p => ({ ...p, state: e.target.value, stateCode: s?.code || '' })); }} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                      <option value="">Select</option>
                      {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                  {/* Tax Type Badge */}
                  {form.state && owner?.state && (
                    <div className="col-span-2 md:col-span-3">
                      {(() => {
                        const taxType = detectTaxType(form.state, owner.state);
                        return taxType === 'intra'
                          ? <div className="inline-flex items-center gap-1 rounded-md bg-green-50 text-green-700 text-xs px-2.5 py-1.5 font-medium border border-green-200">✅ Intra-State — CGST + SGST will apply</div>
                          : <div className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 text-xs px-2.5 py-1.5 font-medium border border-blue-200">🔄 Inter-State — IGST will apply</div>;
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">💰 Financial</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground">{t('form.openingBalance')}</label><input type="number" value={form.openingBalance} onChange={e => setForm(p => ({ ...p, openingBalance: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-muted-foreground">Credit Limit</label><input type="number" value={form.creditLimit} onChange={e => setForm(p => ({ ...p, creditLimit: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
                  <div>
                    <label className="text-xs text-muted-foreground">Party Since</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={cn("mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between", !customerSinceDate && "text-muted-foreground")}>
                          {customerSinceDate ? format(customerSinceDate, 'dd MMM yyyy') : 'Select'}
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customerSinceDate} onSelect={setCustomerSinceDate} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t('form.notes')}</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{t('action.save')}</button>
                <button onClick={() => setShowAdd(false)} className="rounded-md border px-4 py-2 text-sm">{t('action.cancel')}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={handleDownloadTemplate} className="btn-excel text-xs"><Download className="h-3.5 w-3.5" /> {t('action.downloadTemplate')}</button>
              <div className="border-2 border-dashed rounded-md p-8 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drag & Drop or</p>
                <label className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground cursor-pointer">
                  Browse Files
                  <input type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(c => {
            const out = getOutstanding(c.id);
            return (
              <button key={c.id} onClick={() => setSelectedId(c.id)} className="mobile-card w-full text-left">
                <div className="flex justify-between items-center">
                  <div><div className="font-medium text-sm">{c.name}</div><div className="text-xs text-muted-foreground">{c.phone}</div></div>
                  <div className={`text-sm font-medium ${out > 0 ? 'text-destructive' : 'text-green-600'}`}>{out > 0 ? `₹${out.toLocaleString('en-IN')}` : '✅'}</div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="hero-card text-center py-8"><div className="text-4xl mb-2">👥</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div>}
        </div>
      ) : (
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 px-3">{t('form.name')}</th><th className="py-2 px-3">{t('form.phone')}</th><th className="py-2 px-3">{t('form.gst')}</th><th className="py-2 px-3">{t('misc.outstanding')}</th><th className="py-2 px-3">Action</th></tr></thead>
            <tbody>
              {filtered.map(c => {
                const out = getOutstanding(c.id);
                return (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)} className="border-b last:border-0 cursor-pointer hover:bg-accent/50">
                    <td className="py-2.5 px-3 font-medium">{c.name}</td>
                    <td className="py-2.5 px-3">{c.phone}</td>
                    <td className="py-2.5 px-3 text-xs font-mono">{c.gstNumber || '—'}</td>
                    <td className={`py-2.5 px-3 font-medium ${out > 0 ? 'text-destructive' : 'text-green-600'}`}>{out > 0 ? `₹${out.toLocaleString('en-IN')}` : '✅'}</td>
                    <td className="py-2.5 px-3"><span className="text-xs text-primary">Profile →</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8"><div className="text-4xl mb-2">👥</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div>}
        </div>
      )}
    </div>
  );
}
