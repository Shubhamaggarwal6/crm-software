import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Search, Eye, FileText, ArrowRight, Download, Copy } from 'lucide-react';
import { exportToExcel } from '@/services/exportService';
import ShareButton from '@/components/ShareButton';

interface QuotationItem {
  productId: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  discountAmount: number;
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
}

interface Quotation {
  id: string;
  quotationNo: string;
  quotationDate: string;
  validUntil: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerGst: string;
  customerState: string;
  isInterState: boolean;
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  discountAmount: number;
  roundOff: number;
  total: number;
  notes: string;
  terms: string;
  status: string;
  convertedInvoiceId: string | null;
  items: QuotationItem[];
}

const emptyItem = (): QuotationItem => ({
  productId: '', productName: '', hsnCode: '', quantity: 1, unit: 'Pcs',
  mrp: 0, sellingPrice: 0, discountPercent: 0, discountAmount: 0,
  gstRate: 0, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount: 0,
});

export default function QuotationsPage({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { session, customers, products, addInvoice, getCurrentUser } = useApp();
  const userId = session.userId;

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<QuotationItem[]>([emptyItem()]);
  const [isInterState, setIsInterState] = useState(false);

  const userCustomers = useMemo(() => customers.filter(c => c.userId === userId), [customers, userId]);

  useEffect(() => { loadQuotations(); }, [userId]);

  const loadQuotations = async () => {
    setLoading(true);
    const { data: rows } = await (supabase as any).from('quotations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (!rows) { setLoading(false); return; }

    const ids = rows.map((r: any) => r.id);
    const { data: allItems } = ids.length > 0
      ? await (supabase as any).from('quotation_items').select('*').in('quotation_id', ids)
      : { data: [] };

    const itemMap: Record<string, QuotationItem[]> = {};
    (allItems || []).forEach((r: any) => {
      if (!itemMap[r.quotation_id]) itemMap[r.quotation_id] = [];
      itemMap[r.quotation_id].push({
        productId: r.product_id || '', productName: r.product_name,
        hsnCode: r.hsn_code || '', quantity: r.quantity, unit: r.unit || 'Pcs',
        mrp: r.mrp || 0, sellingPrice: r.selling_price || 0,
        discountPercent: r.discount_percent || 0, discountAmount: r.discount_amount || 0,
        gstRate: r.gst_rate || 0, taxableAmount: r.taxable_amount || 0,
        cgst: r.cgst_amount || 0, sgst: r.sgst_amount || 0,
        igst: r.igst_amount || 0, totalAmount: r.total_amount || 0,
      });
    });

    setQuotations(rows.map((r: any) => ({
      id: r.id, quotationNo: r.quotation_no, quotationDate: r.quotation_date,
      validUntil: r.valid_until, customerId: r.customer_id,
      customerName: r.customer_name, customerPhone: r.customer_phone || '',
      customerGst: r.customer_gst || '', customerState: r.customer_state || '',
      isInterState: r.is_inter_state || false,
      subtotal: r.subtotal || 0, cgstTotal: r.cgst_total || 0,
      sgstTotal: r.sgst_total || 0, igstTotal: r.igst_total || 0,
      discountAmount: r.discount_amount || 0, roundOff: r.round_off || 0,
      total: r.total || 0, notes: r.notes || '', terms: r.terms || '',
      status: r.status || 'Draft', convertedInvoiceId: r.converted_invoice_id,
      items: itemMap[r.id] || [],
    })));
    setLoading(false);
  };

  const selectCustomer = (cId: string) => {
    const c = userCustomers.find(c => c.id === cId);
    if (c) {
      setCustomerId(c.id);
      setCustomerName(c.name);
      const user = getCurrentUser();
      const ownerState = user?.state || '';
      setIsInterState(!!c.state && c.state !== ownerState);
    }
  };

  const recalcItem = (item: QuotationItem): QuotationItem => {
    const baseAmount = item.sellingPrice * item.quantity;
    const discountAmt = item.discountPercent > 0 ? baseAmount * item.discountPercent / 100 : 0;
    const taxable = baseAmount - discountAmt;
    const gstAmt = taxable * item.gstRate / 100;
    return {
      ...item,
      discountAmount: discountAmt,
      taxableAmount: taxable,
      cgst: isInterState ? 0 : gstAmt / 2,
      sgst: isInterState ? 0 : gstAmt / 2,
      igst: isInterState ? gstAmt : 0,
      totalAmount: taxable + gstAmt,
    };
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          updated[idx].productName = prod.name;
          updated[idx].hsnCode = prod.hsn;
          updated[idx].unit = prod.unit;
          updated[idx].mrp = prod.price || 0;
          updated[idx].sellingPrice = prod.sellingPrice || prod.price;
          updated[idx].gstRate = prod.gstRate;
        }
      }
      updated[idx] = recalcItem(updated[idx]);
      return updated;
    });
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => items.length > 1 && setItems(prev => prev.filter((_, i) => i !== idx));

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.taxableAmount, 0);
    const cgst = items.reduce((s, i) => s + i.cgst, 0);
    const sgst = items.reduce((s, i) => s + i.sgst, 0);
    const igst = items.reduce((s, i) => s + i.igst, 0);
    const discount = items.reduce((s, i) => s + i.discountAmount, 0);
    const rawTotal = subtotal + cgst + sgst + igst;
    const roundOff = Math.round(rawTotal) - rawTotal;
    return { subtotal, cgst, sgst, igst, discount, roundOff, total: Math.round(rawTotal) };
  }, [items]);

  const saveQuotation = async () => {
    if (!customerName.trim()) { toast.error('Select a customer'); return; }
    if (!items.some(i => i.productName)) { toast.error('Add at least one item'); return; }

    const qNo = `QT-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(4, '0')}`;
    const customer = userCustomers.find(c => c.id === customerId);

    const { data: qt, error } = await (supabase as any).from('quotations').insert({
      user_id: userId, quotation_no: qNo, quotation_date: quotationDate,
      valid_until: validUntil || null,
      customer_id: customerId || null, customer_name: customerName,
      customer_phone: customer?.phone || '', customer_gst: customer?.gstNumber || '',
      customer_state: customer?.state || '', customer_state_code: customer?.stateCode || '',
      is_inter_state: isInterState, place_of_supply: customer?.state || '',
      subtotal: totals.subtotal, cgst_total: totals.cgst, sgst_total: totals.sgst,
      igst_total: totals.igst, discount_amount: totals.discount,
      round_off: totals.roundOff, total: totals.total,
      notes, terms, status: 'Draft',
    }).select().single();

    if (error) { toast.error('Save failed: ' + error.message); return; }

    const itemRows = items.filter(i => i.productName).map(i => ({
      quotation_id: qt.id, user_id: userId, product_id: i.productId || null,
      product_name: i.productName, hsn_code: i.hsnCode, quantity: i.quantity,
      unit: i.unit, mrp: i.mrp, selling_price: i.sellingPrice,
      discount_percent: i.discountPercent, discount_amount: i.discountAmount,
      gst_rate: i.gstRate, taxable_amount: i.taxableAmount,
      cgst_amount: i.cgst, sgst_amount: i.sgst, igst_amount: i.igst,
      total_amount: i.totalAmount,
    }));

    await (supabase as any).from('quotation_items').insert(itemRows);
    toast.success('Quotation saved! ✅');
    resetForm();
    setShowForm(false);
    loadQuotations();
  };

  const resetForm = () => {
    setCustomerId(''); setCustomerName(''); setQuotationDate(new Date().toISOString().split('T')[0]);
    setValidUntil(''); setNotes(''); setTerms(''); setIsInterState(false);
    setItems([emptyItem()]);
  };

  const convertToInvoice = async (q: Quotation) => {
    if (q.convertedInvoiceId) { toast.error('Already converted to invoice'); return; }

    const user = getCurrentUser();
    const prefix = user?.invoicePrefix || 'INV';
    const { data: seqData } = await supabase.rpc('get_next_sequence', {
      p_user_id: userId, p_type: 'invoice',
      p_fy: new Date().getMonth() >= 3 ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
    });
    const invoiceNo = `${prefix}-${String(seqData || 1).padStart(4, '0')}`;

    addInvoice({
      invoiceNo, userId,
      customerName: q.customerName, customerId: q.customerId || '',
      customerPhone: q.customerPhone, customerAddress: '',
      customerGst: q.customerGst, customerState: q.customerState,
      customerStateCode: '', isInterState: q.isInterState,
      date: new Date().toISOString().split('T')[0],
      items: q.items.map(i => ({
        productId: i.productId, productName: i.productName,
        hsn: i.hsnCode, qty: i.quantity, unit: i.unit,
        mrp: i.mrp, sellingPrice: i.sellingPrice,
        discount: i.discountAmount, discountPercent: i.discountPercent,
        gstRate: i.gstRate, taxableAmount: i.taxableAmount,
        cgst: i.cgst, sgst: i.sgst, igst: i.igst, total: i.totalAmount,
      })),
      subtotal: q.subtotal, totalCgst: q.cgstTotal, totalSgst: q.sgstTotal,
      totalIgst: q.igstTotal, totalDiscount: q.discountAmount,
      roundOff: q.roundOff, grandTotal: q.total, status: 'Pending' as const,
      createdBy: { id: userId, name: getCurrentUser()?.firmName || '', role: 'user' as const, timestamp: new Date().toISOString() },
    });

    await (supabase as any).from('quotations').update({
      status: 'Converted', converted_invoice_id: invoiceNo,
    }).eq('id', q.id);

    toast.success(`Invoice ${invoiceNo} created from quotation!`);
    loadQuotations();
    if (onNavigate) onNavigate('invoices');
  };

  const deleteQuotation = async (id: string) => {
    if (!confirm('Delete this quotation?')) return;
    await (supabase as any).from('quotation_items').delete().eq('quotation_id', id);
    await (supabase as any).from('quotations').delete().eq('id', id);
    toast.success('Deleted');
    loadQuotations();
  };

  const updateStatus = async (id: string, status: string) => {
    await (supabase as any).from('quotations').update({ status }).eq('id', id);
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    if (viewQuotation?.id === id) setViewQuotation(prev => prev ? { ...prev, status } : null);
    toast.success(`Status updated to ${status}`);
  };

  const filtered = quotations.filter(q =>
    q.quotationNo.toLowerCase().includes(search.toLowerCase()) ||
    q.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'Draft': return 'secondary';
      case 'Sent': return 'default';
      case 'Accepted': return 'default';
      case 'Rejected': return 'destructive';
      case 'Converted': return 'outline';
      case 'Expired': return 'destructive';
      default: return 'secondary';
    }
  };

  // View detail dialog
  if (viewQuotation) {
    const q = viewQuotation;
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewQuotation(null)} className="text-sm text-primary hover:underline">← Back to Quotations</button>
          <div className="flex gap-2">
            <ShareButton
              documentType="quotation"
              documentId={q.id}
              documentNo={q.quotationNo}
              firmName=""
              amount={q.total}
              userId={userId}
            />
            {q.status !== 'Converted' && (
              <Button size="sm" onClick={() => convertToInvoice(q)}>
                <ArrowRight className="h-4 w-4 mr-1" /> Convert to Invoice
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-foreground">{q.quotationNo}</h2>
                <p className="text-sm text-muted-foreground">Date: {q.quotationDate}</p>
                {q.validUntil && <p className="text-sm text-muted-foreground">Valid Until: {q.validUntil}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusColor(q.status)}>{q.status}</Badge>
                {q.convertedInvoiceId && <span className="text-xs text-muted-foreground">→ {q.convertedInvoiceId}</span>}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Customer</h3>
              <p className="font-medium text-foreground">{q.customerName}</p>
              {q.customerPhone && <p className="text-sm text-muted-foreground">{q.customerPhone}</p>}
              {q.customerGst && <p className="text-xs text-muted-foreground">GST: {q.customerGst}</p>}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">GST%</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{item.hsnCode}</TableCell>
                    <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                    <TableCell className="text-right">₹{item.sellingPrice}</TableCell>
                    <TableCell className="text-right">{item.gstRate}%</TableCell>
                    <TableCell className="text-right font-medium">₹{item.totalAmount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{q.subtotal.toLocaleString()}</span></div>
                {q.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-₹{q.discountAmount.toLocaleString()}</span></div>}
                {q.isInterState ? (
                  <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>₹{q.igstTotal.toLocaleString()}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>₹{q.cgstTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>₹{q.sgstTotal.toLocaleString()}</span></div>
                  </>
                )}
                {q.roundOff !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">Round Off</span><span>₹{q.roundOff.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>₹{q.total.toLocaleString()}</span></div>
              </div>
            </div>

            {q.notes && <div className="border-t pt-3"><h3 className="text-xs font-semibold text-muted-foreground">Notes</h3><p className="text-sm">{q.notes}</p></div>}
            {q.terms && <div><h3 className="text-xs font-semibold text-muted-foreground">Terms</h3><p className="text-sm">{q.terms}</p></div>}

            {q.status !== 'Converted' && (
              <div className="flex gap-2 border-t pt-3">
                {q.status === 'Draft' && <Button size="sm" variant="outline" onClick={() => updateStatus(q.id, 'Sent')}>Mark as Sent</Button>}
                {(q.status === 'Sent' || q.status === 'Draft') && <Button size="sm" variant="outline" onClick={() => updateStatus(q.id, 'Accepted')}>Mark Accepted</Button>}
                {(q.status === 'Sent' || q.status === 'Draft') && <Button size="sm" variant="outline" onClick={() => updateStatus(q.id, 'Rejected')}>Mark Rejected</Button>}
                <Button size="sm" variant="destructive" onClick={() => { deleteQuotation(q.id); setViewQuotation(null); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create form
  if (showForm) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">📝 New Quotation</h1>
          <Button variant="ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</Button>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={selectCustomer}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {userCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={quotationDate} onChange={e => setQuotationDate(e.target.value)} />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm font-semibold">Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Product</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-24">Rate</TableHead>
                      <TableHead className="w-20">Disc%</TableHead>
                      <TableHead className="w-20">GST%</TableHead>
                      <TableHead className="text-right w-24">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select value={item.productId} onValueChange={v => updateItem(idx, 'productId', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {products.filter(p => p.userId === userId).map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" className="h-8 text-xs w-16" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Input type="number" className="h-8 text-xs w-20" value={item.sellingPrice} onChange={e => updateItem(idx, 'sellingPrice', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Input type="number" className="h-8 text-xs w-16" value={item.discountPercent} onChange={e => updateItem(idx, 'discountPercent', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Input type="number" className="h-8 text-xs w-16" value={item.gstRate} onChange={e => updateItem(idx, 'gstRate', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell className="text-right font-medium text-sm">₹{item.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          {items.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{totals.subtotal.toLocaleString()}</span></div>
                {totals.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-₹{totals.discount.toLocaleString()}</span></div>}
                {isInterState ? (
                  <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>₹{totals.igst.toLocaleString()}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>₹{totals.cgst.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>₹{totals.sgst.toLocaleString()}</span></div>
                  </>
                )}
                {totals.roundOff !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">Round Off</span><span>₹{totals.roundOff.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>₹{totals.total.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} /></div>
              <div><Label>Terms & Conditions</Label><Textarea value={terms} onChange={e => setTerms(e.target.value)} placeholder="Payment terms..." rows={2} /></div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveQuotation}>Save Quotation</Button>
              <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">📋 Quotations / Estimates</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToExcel({ data: filtered.map(q => ({ 'Quotation No': q.quotationNo, Date: q.quotationDate, Customer: q.customerName, 'Valid Until': q.validUntil || '', Total: q.total, Status: q.status })), fileName: 'Quotations', sheetName: 'Quotations' })}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> New Quotation</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-foreground">{quotations.length}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-primary">{quotations.filter(q => q.status === 'Draft' || q.status === 'Sent').length}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-success">{quotations.filter(q => q.status === 'Accepted').length}</div><div className="text-xs text-muted-foreground">Accepted</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-muted-foreground">{quotations.filter(q => q.status === 'Converted').length}</div><div className="text-xs text-muted-foreground">Converted</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No quotations found. Create your first one!</TableCell></TableRow>
              ) : filtered.map(q => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setViewQuotation(q)}>
                  <TableCell className="font-medium text-primary">{q.quotationNo}</TableCell>
                  <TableCell className="text-muted-foreground">{q.quotationDate}</TableCell>
                  <TableCell className="text-foreground">{q.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{q.validUntil || '—'}</TableCell>
                  <TableCell className="text-right font-medium">₹{q.total.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={statusColor(q.status)}>{q.status}{q.convertedInvoiceId ? ` → ${q.convertedInvoiceId}` : ''}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => setViewQuotation(q)}><Eye className="h-4 w-4" /></Button>
                      <ShareButton
                        documentType="quotation"
                        documentId={q.id}
                        documentNo={q.quotationNo}
                        firmName=""
                        amount={q.total}
                        userId={userId}
                        iconOnly
                      />
                      {q.status !== 'Converted' && (
                        <Button variant="ghost" size="sm" onClick={() => convertToInvoice(q)} title="Convert to Invoice"><ArrowRight className="h-4 w-4 text-primary" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
