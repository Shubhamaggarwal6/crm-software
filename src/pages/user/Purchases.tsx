import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search, Download } from 'lucide-react';
import { Supplier, Purchase, INDIAN_STATES, PurchaseItem } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as XLSX from '@e965/xlsx';

export default function PurchasesPage() {
  const { session, purchases, suppliers, products, addPurchase, addSupplier, addPayment, updatePurchase, getCurrentUser } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const user = getCurrentUser();

  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, date: new Date(), mode: 'Bank Transfer' as any, reference: '' });

  const userPurchases = purchases.filter(p => p.userId === session.userId);
  const userSuppliers = suppliers.filter(s => s.userId === session.userId);
  const userProducts = products.filter(p => p.userId === session.userId);

  let filtered = userPurchases;
  if (search) filtered = filtered.filter(p => p.purchaseNo.toLowerCase().includes(search.toLowerCase()) || p.supplierName.toLowerCase().includes(search.toLowerCase()));
  if (statusFilter !== 'All') filtered = filtered.filter(p => p.status === statusFilter);

  const thisMonthTotal = userPurchases.filter(p => p.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, p) => s + p.grandTotal, 0);
  const totalGstPaid = userPurchases.reduce((s, p) => s + p.totalCgst + p.totalSgst + p.totalIgst, 0);
  const totalPaid = userPurchases.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = userPurchases.reduce((s, p) => s + (p.grandTotal - p.amountPaid), 0);

  // Add purchase form state
  const [purForm, setPurForm] = useState({
    supplierId: '', supplierInvoiceNo: '', date: new Date(), dueDate: undefined as Date | undefined,
    items: [{ productId: '', productName: '', hsn: '', qty: 1, unit: 'Pcs', purchaseRate: 0, discount: 0, gstRate: 18 }] as any[],
    notes: '', amountPaid: 0, paymentMode: 'Bank Transfer' as any,
  });
  const [newSupForm, setNewSupForm] = useState({ name: '', phone: '', gstNumber: '', state: '', stateCode: '' });
  const [showNewSup, setShowNewSup] = useState(false);

  const selectedSup = userSuppliers.find(s => s.id === purForm.supplierId);
  const isInterState = selectedSup?.stateCode && user?.stateCode && selectedSup.stateCode !== user.stateCode;

  const calcItemTotal = (item: any) => {
    const taxable = (item.purchaseRate - item.discount) * item.qty;
    const gstAmt = taxable * (item.gstRate / 100);
    return { taxable, cgst: isInterState ? 0 : gstAmt / 2, sgst: isInterState ? 0 : gstAmt / 2, igst: isInterState ? gstAmt : 0, total: taxable + gstAmt };
  };

  const purSubtotal = purForm.items.reduce((s, i) => s + calcItemTotal(i).taxable, 0);
  const purGrandTotal = purForm.items.reduce((s, i) => s + calcItemTotal(i).total, 0);

  const handleAddItem = () => {
    setPurForm(p => ({ ...p, items: [...p.items, { productId: '', productName: '', hsn: '', qty: 1, unit: 'Pcs', purchaseRate: 0, discount: 0, gstRate: 18 }] }));
  };

  const handleSavePurchase = () => {
    if (!purForm.supplierId || purForm.items.length === 0) return;
    const sup = userSuppliers.find(s => s.id === purForm.supplierId)!;
    const purCount = userPurchases.length;
    const items: PurchaseItem[] = purForm.items.map(i => {
      const calc = calcItemTotal(i);
      return { productId: i.productId, productName: i.productName, hsn: i.hsn, qty: i.qty, unit: i.unit, purchaseRate: i.purchaseRate, discount: i.discount * i.qty, taxableAmount: calc.taxable, gstRate: i.gstRate, cgst: calc.cgst, sgst: calc.sgst, igst: calc.igst, total: calc.total };
    });
    const grandTotal = Math.round(purGrandTotal);
    const status = purForm.amountPaid >= grandTotal ? 'Paid' : purForm.amountPaid > 0 ? 'Partial' : 'Unpaid';
    addPurchase({
      purchaseNo: `PUR-${new Date().getFullYear()}-${String(purCount + 1).padStart(4, '0')}`,
      userId: session.userId, supplierId: sup.id, supplierName: sup.name, supplierGst: sup.gstNumber,
      supplierInvoiceNo: purForm.supplierInvoiceNo, date: format(purForm.date, 'yyyy-MM-dd'),
      dueDate: purForm.dueDate ? format(purForm.dueDate, 'yyyy-MM-dd') : undefined,
      items, subtotal: purSubtotal, totalCgst: items.reduce((s, i) => s + i.cgst, 0), totalSgst: items.reduce((s, i) => s + i.sgst, 0),
      totalIgst: items.reduce((s, i) => s + i.igst, 0), totalDiscount: items.reduce((s, i) => s + i.discount, 0),
      roundOff: 0, grandTotal, amountPaid: purForm.amountPaid, status: status as any, isInterState: !!isInterState,
      notes: purForm.notes, createdAt: new Date().toISOString().split('T')[0],
    });
    if (purForm.amountPaid > 0) {
      addPayment({ receiptNo: `RCPT-${Date.now()}`, userId: session.userId, supplierId: sup.id, purchaseNo: `PUR-${new Date().getFullYear()}-${String(purCount + 1).padStart(4, '0')}`, amount: purForm.amountPaid, date: format(purForm.date, 'yyyy-MM-dd'), mode: purForm.paymentMode });
    }
    setShowAdd(false);
    setPurForm({ supplierId: '', supplierInvoiceNo: '', date: new Date(), dueDate: undefined, items: [{ productId: '', productName: '', hsn: '', qty: 1, unit: 'Pcs', purchaseRate: 0, discount: 0, gstRate: 18 }], notes: '', amountPaid: 0, paymentMode: 'Bank Transfer' });
  };

  const handleAddPaymentToPurchase = (purId: string) => {
    const pur = userPurchases.find(p => p.id === purId);
    if (!pur) return;
    const newPaid = pur.amountPaid + payForm.amount;
    const newStatus = newPaid >= pur.grandTotal ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
    updatePurchase(purId, { amountPaid: newPaid, status: newStatus as any });
    addPayment({ receiptNo: `RCPT-${Date.now()}`, userId: session.userId, supplierId: pur.supplierId, purchaseNo: pur.purchaseNo, amount: payForm.amount, date: format(payForm.date, 'yyyy-MM-dd'), mode: payForm.mode, reference: payForm.reference });
    setShowPayment(null);
    setPayForm({ amount: 0, date: new Date(), mode: 'Bank Transfer', reference: '' });
  };

  const handleAddNewSupplier = () => {
    if (!newSupForm.name.trim()) return;
    addSupplier({ userId: session.userId, ...newSupForm, createdAt: new Date().toISOString().split('T')[0] });
    setShowNewSup(false);
    setNewSupForm({ name: '', phone: '', gstNumber: '', state: '', stateCode: '' });
  };

  const selectedPurchase = selectedId ? userPurchases.find(p => p.id === selectedId) : null;

  if (selectedPurchase) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setSelectedId(null)} className="text-sm text-primary hover:underline">{t('action.back')}</button>
        <div className="hero-card">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-display font-bold">{selectedPurchase.purchaseNo}</h2>
              <div className="text-xs text-muted-foreground">{selectedPurchase.supplierName} · {selectedPurchase.date}</div>
              {selectedPurchase.supplierGst && <div className="text-xs text-muted-foreground">GST: {selectedPurchase.supplierGst}</div>}
            </div>
            <span className={`status-chip-${selectedPurchase.status.toLowerCase()}`}>{selectedPurchase.status}</span>
          </div>
        </div>
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b text-muted-foreground"><th className="py-1.5 px-2 text-left">Product</th><th className="py-1.5 px-2">HSN</th><th className="py-1.5 px-2">Qty</th><th className="py-1.5 px-2">Rate</th><th className="py-1.5 px-2">Taxable</th><th className="py-1.5 px-2">GST</th><th className="py-1.5 px-2 text-right">Total</th></tr></thead>
            <tbody>{selectedPurchase.items.map((item, i) => (
              <tr key={i} className="border-b last:border-0"><td className="py-1.5 px-2">{item.productName}</td><td className="py-1.5 px-2 text-center font-mono">{item.hsn}</td><td className="py-1.5 px-2 text-center">{item.qty}</td><td className="py-1.5 px-2 text-center">₹{item.purchaseRate}</td><td className="py-1.5 px-2 text-center">₹{item.taxableAmount}</td><td className="py-1.5 px-2 text-center">{item.gstRate}%</td><td className="py-1.5 px-2 text-right font-medium">₹{item.total.toFixed(0)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="hero-card max-w-xs ml-auto space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{selectedPurchase.subtotal.toLocaleString('en-IN')}</span></div>
          {selectedPurchase.totalCgst > 0 && <div className="flex justify-between"><span>CGST</span><span>₹{selectedPurchase.totalCgst.toFixed(2)}</span></div>}
          {selectedPurchase.totalSgst > 0 && <div className="flex justify-between"><span>SGST</span><span>₹{selectedPurchase.totalSgst.toFixed(2)}</span></div>}
          {selectedPurchase.totalIgst > 0 && <div className="flex justify-between"><span>IGST</span><span>₹{selectedPurchase.totalIgst.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>{t('misc.grandTotal')}</span><span>₹{selectedPurchase.grandTotal.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between text-success"><span>{t('purchase.amountPaid')}</span><span>₹{selectedPurchase.amountPaid.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between text-destructive"><span>{t('form.balance')}</span><span>₹{(selectedPurchase.grandTotal - selectedPurchase.amountPaid).toLocaleString('en-IN')}</span></div>
        </div>
        {selectedPurchase.status !== 'Paid' && (
          <button onClick={() => setShowPayment(selectedPurchase.id)} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">💰 Add Payment</button>
        )}
        {showPayment === selectedPurchase.id && (
          <div className="hero-card space-y-3">
            <h4 className="font-display font-semibold text-sm">Add Payment</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">{t('form.amount')}</label><input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Mode</label>
                <select value={payForm.mode} onChange={e => setPayForm(p => ({ ...p, mode: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {['Cash', 'UPI', 'Bank Transfer', 'RTGS', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Reference</label><input value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAddPaymentToPurchase(selectedPurchase.id)} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{t('action.save')}</button>
              <button onClick={() => setShowPayment(null)} className="rounded-md border px-4 py-2 text-sm">{t('action.cancel')}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ADD PURCHASE FORM
  if (showAdd) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold">➕ {t('purchase.new')}</h1>
          <button onClick={() => setShowAdd(false)} className="text-sm text-muted-foreground hover:text-foreground">{t('action.cancel')}</button>
        </div>

        {/* Supplier */}
        <div className="hero-card space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground">🏭 Supplier</h4>
          <div className="flex gap-2">
            <select value={purForm.supplierId} onChange={e => setPurForm(p => ({ ...p, supplierId: e.target.value }))} className="flex-1 rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Select Supplier</option>
              {userSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.gstNumber ? `(${s.gstNumber})` : ''}</option>)}
            </select>
            <button onClick={() => setShowNewSup(true)} className="rounded-md border px-3 py-2 text-xs hover:bg-accent">+ New</button>
          </div>
          {showNewSup && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border-t pt-2">
              <input placeholder="Supplier Name *" value={newSupForm.name} onChange={e => setNewSupForm(p => ({ ...p, name: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm" />
              <input placeholder="Phone" value={newSupForm.phone} onChange={e => setNewSupForm(p => ({ ...p, phone: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm" />
              <input placeholder="GSTIN" value={newSupForm.gstNumber} onChange={e => setNewSupForm(p => ({ ...p, gstNumber: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm" />
              <select value={newSupForm.state} onChange={e => { const s = INDIAN_STATES.find(st => st.name === e.target.value); setNewSupForm(p => ({ ...p, state: e.target.value, stateCode: s?.code || '' })); }} className="rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">State</option>
                {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
              </select>
              <button onClick={handleAddNewSupplier} className="rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground">{t('action.save')}</button>
              <button onClick={() => setShowNewSup(false)} className="rounded-md border px-3 py-2 text-xs">{t('action.cancel')}</button>
            </div>
          )}
          {selectedSup && <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{selectedSup.name} · {selectedSup.gstNumber || 'No GST'} · {selectedSup.state || ''} {isInterState ? '🔴 Inter-State' : '🟢 Intra-State'}</div>}
        </div>

        {/* Invoice Details */}
        <div className="hero-card space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground">📄 Invoice Details</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground">Supplier Invoice No <span className="text-destructive">*</span></label><input value={purForm.supplierInvoiceNo} onChange={e => setPurForm(p => ({ ...p, supplierInvoiceNo: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            <div>
              <label className="text-xs text-muted-foreground">{t('form.date')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between">
                    {format(purForm.date, 'dd MMM yyyy')} <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={purForm.date} onSelect={d => d && setPurForm(p => ({ ...p, date: d }))} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn("mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between", !purForm.dueDate && "text-muted-foreground")}>
                    {purForm.dueDate ? format(purForm.dueDate, 'dd MMM yyyy') : 'Select'} <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={purForm.dueDate} onSelect={d => setPurForm(p => ({ ...p, dueDate: d || undefined }))} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="hero-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground">📦 Items</h4>
            <button onClick={handleAddItem} className="text-xs text-primary hover:underline">+ Add Item</button>
          </div>
          {purForm.items.map((item, idx) => {
            const prod = userProducts.find(p => p.id === item.productId);
            const showUnitToggle = prod && (prod.sellingUnitType === 'both' || prod.sellingUnitType === 'carton');
            const selectedUnit = item.selectedUnit || 'loose';
            const ppc = prod?.piecesPerCarton || 1;

            return (
            <div key={idx} className="p-2 border rounded space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
              <div className="md:col-span-2">
                <label className="text-[10px] text-muted-foreground">Product</label>
                <select value={item.productId} onChange={e => {
                  const p2 = userProducts.find(p => p.id === e.target.value);
                  const newItems = [...purForm.items];
                  const autoUnit = p2?.sellingUnitType === 'carton' ? 'carton' : 'loose';
                  const rate = autoUnit === 'carton' ? (p2?.cartonPurchasePrice || 0) : (p2?.purchasePrice || p2?.price || 0);
                  newItems[idx] = { ...item, productId: e.target.value, productName: p2?.name || '', hsn: p2?.hsn || '', unit: p2?.unit || 'Pcs', purchaseRate: rate, gstRate: p2?.gstRate || 18, selectedUnit: autoUnit };
                  setPurForm(p => ({ ...p, items: newItems }));
                }} className="w-full rounded border bg-background px-2 py-1.5 text-sm">
                  <option value="">Select</option>
                  {userProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Unit toggle for carton/both products */}
              {showUnitToggle && prod.sellingUnitType === 'both' && (
                <div>
                  <label className="text-[10px] text-muted-foreground">Unit</label>
                  <div className="flex gap-1 mt-1">
                    <button type="button" onClick={() => {
                      const n = [...purForm.items];
                      n[idx] = { ...item, selectedUnit: 'carton', purchaseRate: prod.cartonPurchasePrice || 0 };
                      setPurForm(p => ({ ...p, items: n }));
                    }} className={`flex-1 text-[10px] px-2 py-1.5 rounded border transition-colors ${selectedUnit === 'carton' ? 'bg-blue-100 border-blue-400 text-blue-800 font-bold' : 'hover:bg-accent'}`}>
                      📦 {prod.cartonUnitName || 'Carton'}
                    </button>
                    <button type="button" onClick={() => {
                      const n = [...purForm.items];
                      n[idx] = { ...item, selectedUnit: 'loose', purchaseRate: prod.purchasePrice || prod.price || 0 };
                      setPurForm(p => ({ ...p, items: n }));
                    }} className={`flex-1 text-[10px] px-2 py-1.5 rounded border transition-colors ${selectedUnit === 'loose' ? 'bg-green-100 border-green-400 text-green-800 font-bold' : 'hover:bg-accent'}`}>
                      🔹 {prod.unit}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] text-muted-foreground">Qty {selectedUnit === 'carton' ? `(${prod?.cartonUnitName || 'Ctns'})` : ''}</label>
                <input type="number" value={item.qty} onChange={e => { const n = [...purForm.items]; n[idx] = { ...item, qty: parseInt(e.target.value) || 1 }; setPurForm(p => ({ ...p, items: n })); }} className="w-full rounded border bg-background px-2 py-1.5 text-sm" />
              </div>
              <div><label className="text-[10px] text-muted-foreground">Rate ₹{selectedUnit === 'carton' ? `/${prod?.cartonUnitName || 'Ctn'}` : ''}</label><input type="number" value={item.purchaseRate} onChange={e => { const n = [...purForm.items]; n[idx] = { ...item, purchaseRate: parseFloat(e.target.value) || 0 }; setPurForm(p => ({ ...p, items: n })); }} className="w-full rounded border bg-background px-2 py-1.5 text-sm" /></div>
              <div><label className="text-[10px] text-muted-foreground">GST%</label>
                <select value={item.gstRate} onChange={e => { const n = [...purForm.items]; n[idx] = { ...item, gstRate: parseFloat(e.target.value) }; setPurForm(p => ({ ...p, items: n })); }} className="w-full rounded border bg-background px-2 py-1.5 text-sm">
                  {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-mono font-medium text-sm">₹{calcItemTotal(item).total.toFixed(0)}</div>
              </div>
              {purForm.items.length > 1 && <button onClick={() => setPurForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="text-destructive text-xs">✕</button>}
              </div>
              {/* Carton info line */}
              {showUnitToggle && selectedUnit === 'carton' && ppc > 1 && (
                <div className="text-[10px] text-muted-foreground bg-blue-50 rounded px-2 py-1">
                  📦 {item.qty} {prod?.cartonUnitName || 'Cartons'} × {ppc} {prod?.unit} = <b>{item.qty * ppc} {prod?.unit}</b> (stock addition) · Per {prod?.unit} cost: ₹{(item.purchaseRate / ppc).toFixed(2)}
                </div>
              )}
            </div>
            );
          })}
          <div className="text-right font-display font-bold text-lg">Grand Total: ₹{Math.round(purGrandTotal).toLocaleString('en-IN')}</div>
        </div>

        {/* Payment */}
        <div className="hero-card space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground">💰 Payment</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground">{t('purchase.amountPaid')}</label><input type="number" value={purForm.amountPaid} onChange={e => setPurForm(p => ({ ...p, amountPaid: parseFloat(e.target.value) || 0 }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">Mode</label>
              <select value={purForm.paymentMode} onChange={e => setPurForm(p => ({ ...p, paymentMode: e.target.value }))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {['Cash', 'UPI', 'Bank Transfer', 'RTGS', 'Cheque'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{t('form.balance')}: ₹{Math.max(0, Math.round(purGrandTotal) - purForm.amountPaid).toLocaleString('en-IN')}</div>
        </div>

        <div><label className="text-xs text-muted-foreground">{t('form.notes')}</label><textarea value={purForm.notes} onChange={e => setPurForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" /></div>

        <div className="flex gap-2">
          <button onClick={handleSavePurchase} className="rounded-md bg-primary px-6 py-2.5 text-sm text-primary-foreground font-medium">{t('action.save')}</button>
          <button onClick={() => setShowAdd(false)} className="rounded-md border px-6 py-2.5 text-sm">{t('action.cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold">{t('purchase.title')}</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"><Plus className="h-3.5 w-3.5" />{t('purchase.new')}</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="hero-card"><div className="text-xs text-muted-foreground">{t('purchase.totalThisMonth')}</div><div className="text-lg font-display font-bold mt-1">₹{thisMonthTotal.toLocaleString('en-IN')}</div></div>
        <div className="hero-card"><div className="text-xs text-muted-foreground">{t('purchase.gstPaid')}</div><div className="text-lg font-display font-bold mt-1 text-secondary">₹{totalGstPaid.toFixed(0)}</div></div>
        <div className="hero-card"><div className="text-xs text-muted-foreground">{t('purchase.amountPaid')}</div><div className="text-lg font-display font-bold mt-1 text-success">₹{totalPaid.toLocaleString('en-IN')}</div></div>
        <div className="hero-card"><div className="text-xs text-muted-foreground">{t('purchase.outstanding')}</div><div className="text-lg font-display font-bold mt-1 text-destructive">₹{totalOutstanding.toLocaleString('en-IN')}</div></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('action.search')} className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="All">{t('misc.allStatus')}</option>
          <option value="Paid">{t('status.paid')}</option>
          <option value="Partial">{t('status.partial')}</option>
          <option value="Unpaid">{t('status.unpaid')}</option>
        </select>
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelectedId(p.id)} className="mobile-card w-full text-left">
              <div className="flex justify-between items-start">
                <div><div className="font-medium text-sm">{p.purchaseNo}</div><div className="text-xs text-muted-foreground">{p.date} · {p.supplierName}</div></div>
                <span className={`status-chip-${p.status.toLowerCase()}`}>{p.status}</span>
              </div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{p.items.length} items</span><span className="font-mono font-bold">₹{p.grandTotal.toLocaleString('en-IN')}</span></div>
            </button>
          ))}
          {filtered.length === 0 && <div className="hero-card text-center py-8"><div className="text-4xl mb-2">🛒</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div>}
        </div>
      ) : (
        <div className="hero-card overflow-x-auto">
          <table className="w-full text-sm table-zebra">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="py-2 px-3">Purchase No</th><th className="py-2 px-3">{t('form.date')}</th><th className="py-2 px-3">Supplier</th>
              <th className="py-2 px-3">Items</th><th className="py-2 px-3">{t('misc.total')}</th><th className="py-2 px-3">Status</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => setSelectedId(p.id)} className="border-b last:border-0 cursor-pointer hover:bg-accent/50">
                  <td className="py-2.5 px-3 font-medium text-primary">{p.purchaseNo}</td>
                  <td className="py-2.5 px-3">{p.date}</td>
                  <td className="py-2.5 px-3">{p.supplierName}</td>
                  <td className="py-2.5 px-3">{p.items.length}</td>
                  <td className="py-2.5 px-3 font-mono">₹{p.grandTotal.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3"><span className={`status-chip-${p.status.toLowerCase()}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8"><div className="text-4xl mb-2">🛒</div><p className="text-sm text-muted-foreground">{t('misc.noData')}</p></div>}
        </div>
      )}
    </div>
  );
}
