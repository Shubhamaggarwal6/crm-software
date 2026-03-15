import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Trash2, Eye, Percent, IndianRupee } from 'lucide-react';
import { InvoiceItem, InvoiceCharge, numberToWords } from '@/types';
import ErrorDialog, { fieldErrorClass } from '@/components/ErrorDialog';

interface ItemRow {
  productId: string;
  productName: string;
  hsn: string;
  qty: number;
  unit: string;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  gstRate: number;
  // Carton/Loose
  selectedUnit: 'loose' | 'carton';
  sellingUnitType: 'loose' | 'carton' | 'both';
  piecesPerCarton: number;
  cartonUnitName: string;
  cartonSellingPrice: number;
}

const CHARGE_SUGGESTIONS = ['Freight', 'Packing', 'Loading', 'Insurance', 'Handling', 'Labour', 'Other'];

export default function CreateInvoicePage({ onBack }: { onBack: () => void }) {
  const { session, customers, products, getCurrentUser, addInvoice } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const user = getCurrentUser();

  const userCustomers = customers.filter(c => c.userId === session.userId);
  const userProducts = products.filter(p => p.userId === session.userId);

  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [ewayBill, setEwayBill] = useState('');
  const [taxTypeOverride, setTaxTypeOverride] = useState<'auto' | 'intra' | 'inter'>('auto');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ productId: '', productName: '', hsn: '', qty: 1, unit: 'Pcs', mrp: 0, sellingPrice: 0, discountPercent: 0, gstRate: 18, selectedUnit: 'loose', sellingUnitType: 'loose', piecesPerCarton: 1, cartonUnitName: 'Carton', cartonSellingPrice: 0 }]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Pending');
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [showPreview, setShowPreview] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string; details?: string[]; highlightFields?: string[] }>({ open: false, message: '' });
  const [errorFields, setErrorFields] = useState<string[]>([]);

  // ── Invoice-level Discount State ──
  const [invDiscountType, setInvDiscountType] = useState<'none' | 'before_tax' | 'after_tax'>('none');
  const [invDiscountMode, setInvDiscountMode] = useState<'flat' | 'percent'>('flat');
  const [invDiscountValue, setInvDiscountValue] = useState(0);

  // ── Other Charges State ──
  const [otherCharges, setOtherCharges] = useState<{ name: string; amount: number; withGst: boolean; gstRate: number }[]>([]);

  const selectedCustomer = userCustomers.find(c => c.id === customerId);

  const isInterState = useMemo(() => {
    if (taxTypeOverride !== 'auto') return taxTypeOverride === 'inter';
    if (!selectedCustomer || !user?.state) return false;
    return selectedCustomer.state !== user.state && !!selectedCustomer.state;
  }, [selectedCustomer, user, taxTypeOverride]);

  const autoDetectedType = useMemo(() => {
    if (!selectedCustomer || !user?.state) return 'intra';
    return selectedCustomer.state !== user.state && !!selectedCustomer.state ? 'inter' : 'intra';
  }, [selectedCustomer, user]);

  const filteredCustomers = userCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const addItem = () => setItems(prev => [...prev, { productId: '', productName: '', hsn: '', qty: 1, unit: 'Pcs', mrp: 0, sellingPrice: 0, discountPercent: 0, gstRate: 18, selectedUnit: 'loose', sellingUnitType: 'loose', piecesPerCarton: 1, cartonUnitName: 'Carton', cartonSellingPrice: 0 }]);
  const updateItem = (index: number, updates: Partial<ItemRow>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };
  const selectProduct = (index: number, productId: string) => {
    const p = userProducts.find(pr => pr.id === productId);
    if (p) {
      const sut = p.sellingUnitType || 'loose';
      const defaultUnit: 'loose' | 'carton' = sut === 'carton' ? 'carton' : 'loose';
      const price = defaultUnit === 'carton' ? (p.cartonSellingPrice || p.price) : (p.sellingPrice || p.price);
      const unitLabel = defaultUnit === 'carton' ? (p.cartonUnitName || 'Carton') : p.unit;
      updateItem(index, {
        productId: p.id, productName: p.name, hsn: p.hsn, unit: unitLabel,
        mrp: defaultUnit === 'carton' ? (p.cartonMrp || p.price) : p.price,
        sellingPrice: price, gstRate: p.gstRate,
        selectedUnit: defaultUnit, sellingUnitType: sut,
        piecesPerCarton: p.piecesPerCarton || 1,
        cartonUnitName: p.cartonUnitName || 'Carton',
        cartonSellingPrice: p.cartonSellingPrice || 0,
      });
    }
  };
  const switchItemUnit = (index: number, newUnit: 'loose' | 'carton') => {
    const item = items[index];
    const p = userProducts.find(pr => pr.id === item.productId);
    if (!p) return;
    if (newUnit === 'carton') {
      updateItem(index, {
        selectedUnit: 'carton', unit: p.cartonUnitName || 'Carton',
        sellingPrice: p.cartonSellingPrice || 0, mrp: p.cartonMrp || p.price,
      });
    } else {
      updateItem(index, {
        selectedUnit: 'loose', unit: p.unit,
        sellingPrice: p.sellingPrice || p.price, mrp: p.price,
      });
    }
  };

  // ── Calculate Totals with Discounts & Charges ──
  const calculatedItems: InvoiceItem[] = useMemo(() => {
    return items.filter(it => it.productName).map(it => {
      const taxable = it.qty * it.sellingPrice * (1 - it.discountPercent / 100);
      const discAmt = it.qty * it.sellingPrice * (it.discountPercent / 100);
      const gstAmt = taxable * it.gstRate / 100;
      const cgst = isInterState ? 0 : gstAmt / 2;
      const sgst = isInterState ? 0 : gstAmt / 2;
      const igst = isInterState ? gstAmt : 0;
      const totalLoose = it.selectedUnit === 'carton' ? it.qty * it.piecesPerCarton : it.qty;
      return {
        productId: it.productId, productName: it.productName, hsn: it.hsn,
        qty: it.qty, unit: it.unit, mrp: it.mrp, sellingPrice: it.sellingPrice,
        discount: discAmt, taxableAmount: taxable, gstRate: it.gstRate,
        cgst, sgst, igst, total: taxable + gstAmt,
        selectedUnit: it.selectedUnit,
        quantityInCartons: it.selectedUnit === 'carton' ? it.qty : 0,
        quantityInLoose: it.selectedUnit === 'loose' ? it.qty : 0,
        totalLooseUnits: totalLoose,
        unitPriceUsed: it.sellingPrice,
        cartonUnitName: it.cartonUnitName,
        piecesPerCarton: it.piecesPerCarton,
      };
    });
  }, [items, isInterState]);

  const itemSubtotal = calculatedItems.reduce((s, i) => s + i.taxableAmount, 0);
  const itemDiscount = calculatedItems.reduce((s, i) => s + i.discount, 0);

  // Invoice-level discount calculation
  const invDiscountAmount = useMemo(() => {
    if (invDiscountType === 'none' || invDiscountValue <= 0) return 0;
    if (invDiscountMode === 'flat') return invDiscountValue;
    // percent mode
    if (invDiscountType === 'before_tax') return itemSubtotal * invDiscountValue / 100;
    // after_tax: percent of (subtotal + tax)
    const itemTax = calculatedItems.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
    return (itemSubtotal + itemTax) * invDiscountValue / 100;
  }, [invDiscountType, invDiscountMode, invDiscountValue, itemSubtotal, calculatedItems]);

  const invDiscountPercent = useMemo(() => {
    if (invDiscountType === 'none' || invDiscountValue <= 0) return 0;
    if (invDiscountMode === 'percent') return invDiscountValue;
    if (itemSubtotal <= 0) return 0;
    return (invDiscountAmount / itemSubtotal) * 100;
  }, [invDiscountType, invDiscountMode, invDiscountValue, invDiscountAmount, itemSubtotal]);

  // Recalculate GST if before_tax discount
  const { subtotal, totalCgst, totalSgst, totalIgst, totalDiscount } = useMemo(() => {
    if (invDiscountType === 'before_tax' && invDiscountAmount > 0) {
      // Distribute discount proportionally across items, recalculate GST on reduced amount
      const ratio = itemSubtotal > 0 ? (itemSubtotal - invDiscountAmount) / itemSubtotal : 1;
      let cgst = 0, sgst = 0, igst = 0;
      calculatedItems.forEach(ci => {
        const adjTaxable = ci.taxableAmount * ratio;
        const gstAmt = adjTaxable * ci.gstRate / 100;
        if (isInterState) { igst += gstAmt; } else { cgst += gstAmt / 2; sgst += gstAmt / 2; }
      });
      return {
        subtotal: itemSubtotal - invDiscountAmount,
        totalCgst: cgst, totalSgst: sgst, totalIgst: igst,
        totalDiscount: itemDiscount + invDiscountAmount,
      };
    }
    return {
      subtotal: itemSubtotal,
      totalCgst: calculatedItems.reduce((s, i) => s + i.cgst, 0),
      totalSgst: calculatedItems.reduce((s, i) => s + i.sgst, 0),
      totalIgst: calculatedItems.reduce((s, i) => s + i.igst, 0),
      totalDiscount: itemDiscount + (invDiscountType === 'after_tax' ? invDiscountAmount : 0),
    };
  }, [calculatedItems, invDiscountType, invDiscountAmount, itemSubtotal, itemDiscount, isInterState]);

  // Other charges totals
  const chargesCalc: InvoiceCharge[] = useMemo(() => {
    return otherCharges.map(ch => {
      const gstAmt = ch.withGst ? ch.amount * ch.gstRate / 100 : 0;
      return { chargeName: ch.name, amount: ch.amount, withGst: ch.withGst, gstRate: ch.gstRate, gstAmount: gstAmt, totalAmount: ch.amount + gstAmt };
    });
  }, [otherCharges]);
  const chargesSubtotal = chargesCalc.reduce((s, c) => s + c.amount, 0);
  const chargesGst = chargesCalc.reduce((s, c) => s + c.gstAmount, 0);
  const chargesTotalWithGst = chargesSubtotal + chargesGst;

  const preRound = subtotal + totalCgst + totalSgst + totalIgst + chargesTotalWithGst - (invDiscountType === 'after_tax' ? invDiscountAmount : 0);
  const roundOff = Math.round(preRound) - preRound;
  const grandTotal = Math.round(preRound);

  // ── Charge helpers ──
  const addCharge = () => setOtherCharges(prev => [...prev, { name: '', amount: 0, withGst: false, gstRate: 18 }]);
  const updateCharge = (i: number, updates: Partial<typeof otherCharges[0]>) => setOtherCharges(prev => prev.map((c, idx) => idx === i ? { ...c, ...updates } : c));
  const removeCharge = (i: number) => setOtherCharges(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const errors: string[] = [];
    const fields: string[] = [];
    if (!customerId) { errors.push('Party select karein'); fields.push('customer'); }
    if (calculatedItems.length === 0) { errors.push('Kam se kam ek product add karein'); fields.push('products'); }
    if (!invoiceDate) { errors.push('Invoice date select karein'); fields.push('date'); }
    if (paymentStatus === 'Partial' && (amountPaid <= 0 || amountPaid >= grandTotal)) {
      errors.push('Partial payment amount sahi daalein (0 se zyada aur total se kam)');
      fields.push('amountPaid');
    }
    if (errors.length > 0) {
      setErrorFields(fields);
      setErrorDialog({ open: true, message: 'Invoice save nahi ho sakta. Neeche diye gaye issues fix karein:', details: errors,
        highlightFields: fields.map(f => ({ customer: 'Party', products: 'Products', date: 'Date', amountPaid: 'Amount Paid' }[f] || f)),
      });
      return;
    }
    setErrorFields([]);
    const c = selectedCustomer!;
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

    addInvoice({
      invoiceNo, userId: session.userId, date: invoiceDate,
      customerId: c.id, customerName: c.name, customerGst: c.gstNumber,
      customerPhone: c.phone, customerAddress: c.address, customerState: c.state, customerStateCode: c.stateCode,
      vehicleNo, items: calculatedItems, subtotal, totalCgst, totalSgst, totalIgst,
      totalDiscount, roundOff, grandTotal,
      status: paymentStatus, paymentMode: paymentMode as any, amountPaid: paymentStatus === 'Paid' ? grandTotal : paymentStatus === 'Partial' ? amountPaid : 0,
      createdBy: { id: session.userId, name: user?.firmName || 'Owner', role: 'user', timestamp: new Date().toISOString() },
      isInterState,
      invoiceDiscountAmount: invDiscountAmount,
      invoiceDiscountPercent: invDiscountPercent,
      invoiceDiscountType: invDiscountType,
      otherCharges: chargesCalc.length > 0 ? chargesCalc : undefined,
      otherChargesTotal: chargesTotalWithGst,
    });
    onBack();
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-display font-bold">🧾 Create Invoice</h1>
        <div className="flex gap-2">
          {!isMobile && (
            <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
              <Eye className="h-3.5 w-3.5" /> {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          )}
          <button onClick={onBack} className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent">← Back</button>
        </div>
      </div>

      <div className={`flex gap-6 ${showPreview && !isMobile ? '' : ''}`}>
        <div className={`space-y-4 ${showPreview && !isMobile ? 'flex-1' : 'w-full'}`}>
          {/* Invoice Details */}
          <div className="hero-card space-y-3">
            <h3 className="font-display font-semibold text-sm">📋 Invoice Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Invoice Date</label>
                <input type="date" value={invoiceDate} onChange={e => { setInvoiceDate(e.target.value); setErrorFields(f => f.filter(x => x !== 'date')); }} className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ${fieldErrorClass('date', errorFields)}`} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Vehicle No</label>
                <input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">E-Way Bill</label>
                <input value={ewayBill} onChange={e => setEwayBill(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Optional" />
              </div>
            </div>
          </div>

          {/* Party Selection */}
          <div className={`hero-card space-y-3 ${errorFields.includes('customer') ? 'ring-2 ring-destructive border-destructive' : ''}`}>
            <h3 className="font-display font-semibold text-sm">👤 Party {errorFields.includes('customer') && <span className="text-destructive text-xs ml-1">⚠️ Required</span>}</h3>
            <input
              value={customerSearch}
              onChange={e => { setCustomerSearch(e.target.value); setErrorFields(f => f.filter(x => x !== 'customer')); }}
              placeholder="Search party by name or phone..."
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${fieldErrorClass('customer', errorFields)}`}
            />
            {!customerId && customerSearch && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground"> · {c.phone}</span>
                    {c.gstNumber && <span className="text-muted-foreground"> · {c.gstNumber}</span>}
                  </button>
                ))}
              </div>
            )}
            {selectedCustomer && (
              <div className="flex flex-wrap gap-3 items-center p-3 rounded-md bg-accent/50">
                <div><span className="text-xs text-muted-foreground">Name:</span> <span className="font-medium">{selectedCustomer.name}</span></div>
                {selectedCustomer.gstNumber && <div><span className="text-xs text-muted-foreground">GST:</span> {selectedCustomer.gstNumber}</div>}
                {selectedCustomer.state && <div><span className="text-xs text-muted-foreground">State:</span> {selectedCustomer.state}</div>}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isInterState ? 'bg-accent text-accent-foreground' : 'bg-accent text-accent-foreground'}`}>
                  {isInterState ? '🔵 Inter-State (IGST)' : '🟢 Intra-State (CGST+SGST)'}
                </span>
                <button onClick={() => { setCustomerId(''); setCustomerSearch(''); }} className="text-xs text-destructive ml-auto">Change</button>
              </div>
            )}
            {selectedCustomer && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">Tax Type:</label>
                <select value={taxTypeOverride} onChange={e => setTaxTypeOverride(e.target.value as any)} className="rounded-md border bg-background px-2 py-1 text-xs">
                  <option value="auto">Auto-detect</option>
                  <option value="intra">Intra-State (CGST+SGST)</option>
                  <option value="inter">Inter-State (IGST)</option>
                </select>
                {taxTypeOverride !== 'auto' && taxTypeOverride !== autoDetectedType && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent text-accent-foreground">⚠️ Manual override</span>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className={`hero-card space-y-3 ${errorFields.includes('products') ? 'ring-2 ring-destructive border-destructive' : ''}`}>
            <h3 className="font-display font-semibold text-sm">📦 Items {errorFields.includes('products') && <span className="text-destructive text-xs ml-1">⚠️ Add at least 1 product</span>}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="py-1 px-2 w-6"></th><th className="py-1 px-2">Product</th><th className="py-1 px-2">HSN</th>
                  <th className="py-1 px-2 w-16">Qty</th><th className="py-1 px-2 w-20">Price</th>
                  <th className="py-1 px-2 w-16">Disc%</th><th className="py-1 px-2 w-16">GST%</th>
                  <th className="py-1 px-2 text-right">Amount</th>
                </tr></thead>
                <tbody>
                  {items.map((item, i) => {
                    const ci = calculatedItems[i];
                    return (
                      <tr key={i} className="border-b">
                        <td className="py-1 px-2">
                          <button onClick={() => removeItem(i)} className="text-destructive hover:bg-destructive/10 rounded p-0.5" disabled={items.length <= 1}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                         <td className="py-1 px-2">
                           <select value={item.productId} onChange={e => selectProduct(i, e.target.value)} className="w-full rounded border bg-background px-2 py-1 text-xs">
                             <option value="">Select product...</option>
                             {userProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                           {item.sellingUnitType === 'both' && item.productId && (
                             <div className="flex gap-1 mt-1">
                               <button type="button" onClick={() => switchItemUnit(i, 'carton')} className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${item.selectedUnit === 'carton' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                                 {item.cartonUnitName} — ₹{item.cartonSellingPrice}
                               </button>
                               <button type="button" onClick={() => switchItemUnit(i, 'loose')} className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${item.selectedUnit === 'loose' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                                 {userProducts.find(p => p.id === item.productId)?.unit || 'Pcs'} — ₹{userProducts.find(p => p.id === item.productId)?.sellingPrice || 0}
                               </button>
                             </div>
                           )}
                         </td>
                         <td className="py-1 px-2"><input value={item.hsn} onChange={e => updateItem(i, { hsn: e.target.value })} className="w-full rounded border bg-background px-2 py-1 text-xs" /></td>
                         <td className="py-1 px-2">
                           <input type="number" value={item.qty} onChange={e => updateItem(i, { qty: parseInt(e.target.value) || 0 })} className="w-full rounded border bg-background px-2 py-1 text-xs" />
                           {item.selectedUnit === 'carton' && item.piecesPerCarton > 1 && item.qty > 0 && (
                             <div className="text-[9px] text-muted-foreground mt-0.5">= {item.qty * item.piecesPerCarton} {userProducts.find(p => p.id === item.productId)?.unit || 'Pcs'}</div>
                           )}
                         </td>
                        <td className="py-1 px-2"><input type="number" value={item.sellingPrice} onChange={e => updateItem(i, { sellingPrice: parseFloat(e.target.value) || 0 })} className="w-full rounded border bg-background px-2 py-1 text-xs" /></td>
                        <td className="py-1 px-2"><input type="number" value={item.discountPercent} onChange={e => updateItem(i, { discountPercent: parseFloat(e.target.value) || 0 })} className="w-full rounded border bg-background px-2 py-1 text-xs" /></td>
                        <td className="py-1 px-2">
                          <select value={item.gstRate} onChange={e => updateItem(i, { gstRate: parseFloat(e.target.value) })} className="w-full rounded border bg-background px-2 py-1 text-xs">
                            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-xs">{ci ? fmt(ci.total) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={addItem} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Add Item</button>
          </div>

          {/* ── Discounts & Other Charges ── */}
          <div className="hero-card space-y-4">
            <h3 className="font-display font-semibold text-sm">🏷️ Discounts & Other Charges</h3>
            
            {/* Invoice-Level Discount */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground">Invoice Discount:</label>
                <div className="flex rounded-md border overflow-hidden">
                  {(['none', 'before_tax', 'after_tax'] as const).map(dt => (
                    <button key={dt} onClick={() => setInvDiscountType(dt)}
                      className={`px-3 py-1.5 text-xs transition-colors ${invDiscountType === dt ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      {dt === 'none' ? 'No Discount' : dt === 'before_tax' ? 'Before Tax' : 'After Tax'}
                    </button>
                  ))}
                </div>
              </div>

              {invDiscountType !== 'none' && (
                <div className="flex items-center gap-3 pl-4 border-l-2 border-primary/20">
                  <div className="flex rounded-md border overflow-hidden">
                    <button onClick={() => setInvDiscountMode('flat')}
                      className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${invDiscountMode === 'flat' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      <IndianRupee className="h-3 w-3" /> Flat
                    </button>
                    <button onClick={() => setInvDiscountMode('percent')}
                      className={`px-2.5 py-1.5 text-xs flex items-center gap-1 ${invDiscountMode === 'percent' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      <Percent className="h-3 w-3" /> Percent
                    </button>
                  </div>
                  <div className="relative w-32">
                    <input type="number" value={invDiscountValue} onChange={e => setInvDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" placeholder={invDiscountMode === 'flat' ? 'Amount' : '%'} />
                  </div>
                  {invDiscountValue > 0 && (
                    <div className="text-xs text-muted-foreground">
                      = {fmt(invDiscountAmount)} ({invDiscountPercent.toFixed(1)}%)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Other Charges */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Other Charges:</label>
              {otherCharges.map((ch, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 pl-4 border-l-2 border-primary/20">
                  <div className="relative">
                    <input value={ch.name} onChange={e => updateCharge(i, { name: e.target.value })}
                      list={`charge-suggestions-${i}`}
                      className="w-36 rounded-md border bg-background px-3 py-1.5 text-xs" placeholder="Charge name" />
                    <datalist id={`charge-suggestions-${i}`}>
                      {CHARGE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                    <input type="number" value={ch.amount} onChange={e => updateCharge(i, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-md border bg-background pl-6 pr-2 py-1.5 text-xs" />
                  </div>
                  <div className="flex rounded-md border overflow-hidden">
                    <button onClick={() => updateCharge(i, { withGst: false })}
                      className={`px-2 py-1 text-[10px] ${!ch.withGst ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>No GST</button>
                    <button onClick={() => updateCharge(i, { withGst: true })}
                      className={`px-2 py-1 text-[10px] ${ch.withGst ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>With GST</button>
                  </div>
                  {ch.withGst && (
                    <select value={ch.gstRate} onChange={e => updateCharge(i, { gstRate: parseFloat(e.target.value) })} className="rounded-md border bg-background px-2 py-1 text-xs w-20">
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  )}
                  {ch.withGst && ch.amount > 0 && (
                    <span className="text-[10px] text-muted-foreground">GST: {fmt(ch.amount * ch.gstRate / 100)}</span>
                  )}
                  <button onClick={() => removeCharge(i)} className="text-destructive hover:bg-destructive/10 rounded p-1"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
              <button onClick={addCharge} className="flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Add Charge</button>
            </div>
          </div>

          {/* Totals */}
          <div className="hero-card">
            <div className="max-w-sm ml-auto space-y-1.5">
              <div className="flex justify-between text-sm"><span>Item Subtotal</span><span className="font-mono">{fmt(itemSubtotal)}</span></div>
              {itemDiscount > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>Item Discount</span><span className="font-mono">-{fmt(itemDiscount)}</span></div>}
              {invDiscountType === 'before_tax' && invDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-destructive"><span>Invoice Discount (Before Tax)</span><span className="font-mono">-{fmt(invDiscountAmount)}</span></div>
              )}
              <div className="flex justify-between text-sm font-medium"><span>Taxable Amount</span><span className="font-mono">{fmt(subtotal)}</span></div>
              {!isInterState && <>
                <div className="flex justify-between text-sm"><span>CGST</span><span className="font-mono">{fmt(totalCgst)}</span></div>
                <div className="flex justify-between text-sm"><span>SGST</span><span className="font-mono">{fmt(totalSgst)}</span></div>
              </>}
              {isInterState && <div className="flex justify-between text-sm"><span>IGST</span><span className="font-mono">{fmt(totalIgst)}</span></div>}
              {invDiscountType === 'after_tax' && invDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-destructive"><span>Invoice Discount (After Tax)</span><span className="font-mono">-{fmt(invDiscountAmount)}</span></div>
              )}
              {chargesCalc.length > 0 && (
                <>
                  <div className="border-t pt-1 mt-1" />
                  {chargesCalc.map((ch, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span>{ch.chargeName}{ch.withGst ? ` (+${ch.gstRate}% GST)` : ''}</span>
                      <span className="font-mono">+{fmt(ch.totalAmount)}</span>
                    </div>
                  ))}
                </>
              )}
              {roundOff !== 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Round Off</span><span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Grand Total</span><span className="font-mono">{fmt(grandTotal)}</span></div>
              <div className="text-xs text-muted-foreground">{numberToWords(grandTotal)}</div>
            </div>
          </div>

          {/* Payment */}
          <div className="hero-card space-y-3">
            <h3 className="font-display font-semibold text-sm">💰 Payment Status</h3>
            <div className="flex gap-2">
              {(['Paid', 'Partial', 'Pending'] as const).map(s => (
                <button key={s} onClick={() => setPaymentStatus(s)}
                  className={`flex-1 rounded-md border-2 px-3 py-3 text-center text-sm font-medium transition-colors ${paymentStatus === s ? s === 'Paid' ? 'border-green-500 bg-green-50 text-green-800' : s === 'Partial' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-red-500 bg-red-50 text-red-800' : 'border-muted hover:bg-accent'}`}>
                  {s === 'Paid' ? '✅' : s === 'Partial' ? '🔶' : '⚠️'} {s}
                </button>
              ))}
            </div>
            {(paymentStatus === 'Paid' || paymentStatus === 'Partial') && (
              <div className="grid grid-cols-2 gap-3">
                {paymentStatus === 'Partial' && (
                  <div>
                    <label className="text-xs text-muted-foreground">Amount Received</label>
                    <input type="number" value={amountPaid} onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                    <div className="text-xs text-muted-foreground mt-1">Balance: {fmt(grandTotal - amountPaid)}</div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">Mode</label>
                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    {['Cash', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Bank Transfer', 'Other'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="hero-card space-y-2">
            <label className="text-xs text-muted-foreground">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Internal notes..." />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={!customerId || calculatedItems.length === 0}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              💾 Save Invoice
            </button>
            <button onClick={onBack} className="rounded-md border px-6 py-2.5 text-sm">Cancel</button>
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && !isMobile && (
          <div className="w-[400px] shrink-0 sticky top-0">
            <div className="hero-card text-xs space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="text-center border-b pb-2">
                <div className="font-display font-bold text-sm">{user?.firmName || 'Your Firm'}</div>
                {user?.gstNumber && <div className="text-muted-foreground">GSTIN: {user.gstNumber}</div>}
                <div className="text-muted-foreground">{user?.address} {user?.city} {user?.state}</div>
                <div className="font-bold mt-2 text-primary">TAX INVOICE</div>
              </div>
              {selectedCustomer && (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><div className="text-muted-foreground">Bill To:</div><div className="font-medium">{selectedCustomer.name}</div>{selectedCustomer.gstNumber && <div>GSTIN: {selectedCustomer.gstNumber}</div>}</div>
                  <div className="text-right"><div>Date: {invoiceDate}</div><div className={isInterState ? 'text-primary' : 'text-primary'}>{isInterState ? 'IGST' : 'CGST+SGST'}</div></div>
                </div>
              )}
              {calculatedItems.length > 0 && (
                <table className="w-full text-[10px] border">
                  <thead><tr className="bg-muted"><th className="p-1 text-left">Item</th><th className="p-1">Qty</th><th className="p-1">Rate</th><th className="p-1 text-right">Amt</th></tr></thead>
                  <tbody>
                    {calculatedItems.map((ci, i) => (
                      <tr key={i} className="border-t"><td className="p-1">{ci.productName}</td><td className="p-1 text-center">{ci.qty}</td><td className="p-1 text-center">{ci.sellingPrice}</td><td className="p-1 text-right">{ci.total.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="text-right space-y-0.5 border-t pt-1">
                <div>Subtotal: {fmt(subtotal)}</div>
                {invDiscountAmount > 0 && <div className="text-destructive">Discount: -{fmt(invDiscountAmount)}</div>}
                {!isInterState && <><div>CGST: {fmt(totalCgst)}</div><div>SGST: {fmt(totalSgst)}</div></>}
                {isInterState && <div>IGST: {fmt(totalIgst)}</div>}
                {chargesTotalWithGst > 0 && <div>Other Charges: +{fmt(chargesTotalWithGst)}</div>}
                <div className="font-bold text-sm border-t pt-1">Total: {fmt(grandTotal)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <ErrorDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ open: false, message: '' })}
        message={errorDialog.message}
        details={errorDialog.details}
        highlightFields={errorDialog.highlightFields}
      />
    </div>
  );
}
