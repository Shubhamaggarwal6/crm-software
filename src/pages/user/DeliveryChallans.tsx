import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Truck, FileText, Search, Eye, Download, Box, Package } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { exportToExcel } from '@/services/exportService';
import { formatStockDisplay } from '@/utils/stockDisplay';

interface ChallanItem {
  productId: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  selectedUnit: 'loose' | 'carton';
  sellingUnitType: string;
  piecesPerCarton: number;
  cartonUnitName: string;
  totalLooseUnits: number;
}

interface Challan {
  id: string;
  challanNo: string;
  challanDate: string;
  challanType: string;
  partyId: string;
  partyName: string;
  vehicleNo: string;
  driverName: string;
  deliveryAddress: string;
  includeGst: boolean;
  subtotal: number;
  taxTotal: number;
  total: number;
  status: string;
  convertedInvoiceId: string | null;
  notes: string;
  items: ChallanItem[];
}

export default function DeliveryChallansPage() {
  const { session, customers, products } = useApp();
  const userId = session.userId;
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewChallan, setViewChallan] = useState<Challan | null>(null);
  const [search, setSearch] = useState('');

  // Form state
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [challanType, setChallanType] = useState('Job Work');
  const [partyId, setPartyId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [includeGst, setIncludeGst] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ChallanItem[]>([
    { productId: '', productName: '', hsnCode: '', quantity: 1, unit: 'Pcs', rate: 0, amount: 0, gstRate: 0, gstAmount: 0, totalAmount: 0, selectedUnit: 'loose', sellingUnitType: 'loose', piecesPerCarton: 1, cartonUnitName: 'Carton', totalLooseUnits: 1 }
  ]);

  useEffect(() => { loadChallans(); }, [userId]);

  const loadChallans = async () => {
    setLoading(true);
    const { data: challanRows } = await (supabase as any).from('delivery_challans').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (!challanRows) { setLoading(false); return; }
    const { data: itemRows } = await (supabase as any).from('delivery_challan_items').select('*').eq('user_id', userId);
    const itemMap: Record<string, ChallanItem[]> = {};
    (itemRows || []).forEach((r: any) => {
      if (!itemMap[r.challan_id]) itemMap[r.challan_id] = [];
      itemMap[r.challan_id].push({
        productId: r.product_id || '', productName: r.product_name, hsnCode: r.hsn_code || '',
        quantity: r.quantity, unit: r.unit || 'Pcs', rate: r.rate || 0, amount: r.amount || 0,
        gstRate: r.gst_rate || 0, gstAmount: r.gst_amount || 0, totalAmount: r.total_amount || 0,
        selectedUnit: 'loose', sellingUnitType: 'loose', piecesPerCarton: 1, cartonUnitName: 'Carton', totalLooseUnits: r.quantity,
      });
    });
    setChallans(challanRows.map((r: any) => ({
      id: r.id, challanNo: r.challan_no, challanDate: r.challan_date,
      challanType: r.challan_type || '', partyId: r.party_id || '',
      partyName: r.party_name || '', vehicleNo: r.vehicle_no || '',
      driverName: r.driver_name || '', deliveryAddress: r.delivery_address || '',
      includeGst: r.include_gst || false, subtotal: r.subtotal || 0,
      taxTotal: r.tax_total || 0, total: r.total || 0,
      status: r.status || 'Open', convertedInvoiceId: r.converted_invoice_id,
      notes: r.notes || '', items: itemMap[r.id] || [],
    })));
    setLoading(false);
  };

  const selectedParty = customers.find(c => c.id === partyId);

  const recalcItem = (item: ChallanItem): ChallanItem => {
    const amount = item.quantity * item.rate;
    const gstAmount = includeGst ? amount * item.gstRate / 100 : 0;
    const totalLooseUnits = item.selectedUnit === 'carton' ? item.quantity * item.piecesPerCarton : item.quantity;
    return { ...item, amount, gstAmount, totalAmount: amount + gstAmount, totalLooseUnits };
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
          updated[idx].gstRate = prod.gstRate;
          updated[idx].sellingUnitType = prod.sellingUnitType || 'loose';
          updated[idx].piecesPerCarton = prod.piecesPerCarton || 1;
          updated[idx].cartonUnitName = prod.cartonUnitName || 'Carton';
          // Auto-set unit based on selling type
          if (prod.sellingUnitType === 'carton') {
            updated[idx].selectedUnit = 'carton';
            updated[idx].rate = prod.cartonSellingPrice || prod.sellingPrice || prod.price;
          } else {
            updated[idx].selectedUnit = 'loose';
            updated[idx].rate = prod.sellingPrice || prod.price;
          }
        }
      }
      if (field === 'selectedUnit') {
        const prod = products.find(p => p.id === updated[idx].productId);
        if (prod) {
          if (value === 'carton') {
            updated[idx].rate = prod.cartonSellingPrice || prod.sellingPrice || prod.price;
          } else {
            updated[idx].rate = prod.sellingPrice || prod.price;
          }
        }
      }
      updated[idx] = recalcItem(updated[idx]);
      return updated;
    });
  };

  const addItem = () => setItems(prev => [...prev, { productId: '', productName: '', hsnCode: '', quantity: 1, unit: 'Pcs', rate: 0, amount: 0, gstRate: 0, gstAmount: 0, totalAmount: 0, selectedUnit: 'loose', sellingUnitType: 'loose', piecesPerCarton: 1, cartonUnitName: 'Carton', totalLooseUnits: 1 }]);
  const removeItem = (idx: number) => items.length > 1 && setItems(prev => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxTotal = items.reduce((s, i) => s + i.gstAmount, 0);
  const total = subtotal + taxTotal;

  const resetForm = () => {
    setChallanDate(new Date().toISOString().split('T')[0]);
    setChallanType('Job Work'); setPartyId(''); setVehicleNo('');
    setDriverName(''); setDeliveryAddress(''); setIncludeGst(false); setNotes('');
    setItems([{ productId: '', productName: '', hsnCode: '', quantity: 1, unit: 'Pcs', rate: 0, amount: 0, gstRate: 0, gstAmount: 0, totalAmount: 0, selectedUnit: 'loose', sellingUnitType: 'loose', piecesPerCarton: 1, cartonUnitName: 'Carton', totalLooseUnits: 1 }]);
  };

  const saveChallan = async () => {
    if (!partyId) { toast.error('Please select a party'); return; }
    if (items.every(i => !i.productName)) { toast.error('Add at least one item'); return; }

    const year = new Date().getFullYear();
    const count = challans.filter(c => c.challanNo?.startsWith(`DC-${year}`)).length;
    const challanNo = `DC-${year}-${String(count + 1).padStart(4, '0')}`;

    const { data, error } = await (supabase as any).from('delivery_challans').insert({
      challan_no: challanNo, user_id: userId, challan_date: challanDate,
      challan_type: challanType, party_id: partyId, party_name: selectedParty?.name || '',
      vehicle_no: vehicleNo, driver_name: driverName, delivery_address: deliveryAddress,
      include_gst: includeGst, subtotal, tax_total: taxTotal, total, notes,
    }).select().single();

    if (error) { toast.error('Save failed: ' + error.message); return; }

    const validItems = items.filter(i => i.productName);
    if (validItems.length > 0) {
      await (supabase as any).from('delivery_challan_items').insert(validItems.map(i => ({
        challan_id: data.id, user_id: userId, product_id: i.productId || null,
        product_name: i.productName, hsn_code: i.hsnCode, quantity: i.quantity,
        unit: i.unit, rate: i.rate, amount: i.amount, gst_rate: i.gstRate,
        gst_amount: i.gstAmount, total_amount: i.totalAmount,
      })));
    }

    toast.success('Delivery Challan saved!');
    resetForm(); setShowForm(false); loadChallans();
  };

  const filtered = challans.filter(c =>
    c.challanNo.toLowerCase().includes(search.toLowerCase()) ||
    c.partyName.toLowerCase().includes(search.toLowerCase())
  );

  // Recalc items when GST toggle changes
  useEffect(() => {
    setItems(prev => prev.map(i => recalcItem(i)));
  }, [includeGst]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">🚚 Delivery Challans</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToExcel({ data: filtered.map(c => ({ 'Challan No': c.challanNo, Date: c.challanDate, Party: c.partyName, Type: c.challanType, Vehicle: c.vehicleNo || '', Subtotal: c.subtotal, Tax: c.taxTotal, Total: c.total, Status: c.convertedInvoiceId ? 'Invoiced' : c.status })), fileName: 'Delivery_Challans', sheetName: 'Challans' })}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" /> New Challan</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-foreground">{challans.length}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-primary">{challans.filter(c => c.status === 'Open').length}</div><div className="text-xs text-muted-foreground">Open</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-accent-foreground">{challans.filter(c => c.status === 'Delivered').length}</div><div className="text-xs text-muted-foreground">Delivered</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-muted-foreground">{challans.filter(c => c.convertedInvoiceId).length}</div><div className="text-xs text-muted-foreground">Converted</div></CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search challans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No challans found</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-foreground">{c.challanNo}</TableCell>
                  <TableCell className="text-muted-foreground">{c.challanDate}</TableCell>
                  <TableCell className="text-foreground">{c.partyName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.challanType}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">₹{c.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'Open' ? 'default' : c.status === 'Delivered' ? 'secondary' : 'outline'}>
                      {c.convertedInvoiceId ? 'Invoiced' : c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setViewChallan(c)}><Eye className="h-4 w-4" /></Button>
                      <ShareButton
                        documentType="delivery_challan"
                        documentId={c.id}
                        documentNo={c.challanNo}
                        firmName=""
                        amount={c.total}
                        userId={userId}
                        iconOnly
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewChallan} onOpenChange={() => setViewChallan(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Challan: {viewChallan?.challanNo}</DialogTitle></DialogHeader>
          {viewChallan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Party:</span> <strong className="text-foreground">{viewChallan.partyName}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> <strong className="text-foreground">{viewChallan.challanDate}</strong></div>
                <div><span className="text-muted-foreground">Type:</span> <strong className="text-foreground">{viewChallan.challanType}</strong></div>
                <div><span className="text-muted-foreground">Vehicle:</span> <strong className="text-foreground">{viewChallan.vehicleNo || '-'}</strong></div>
                <div><span className="text-muted-foreground">Driver:</span> <strong className="text-foreground">{viewChallan.driverName || '-'}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{viewChallan.status}</Badge></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewChallan.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-foreground">{item.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right text-muted-foreground">₹{item.rate}</TableCell>
                      <TableCell className="text-right text-foreground">₹{item.totalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right space-y-1 text-sm">
                <div className="text-muted-foreground">Subtotal: ₹{viewChallan.subtotal.toLocaleString()}</div>
                {viewChallan.includeGst && <div className="text-muted-foreground">Tax: ₹{viewChallan.taxTotal.toLocaleString()}</div>}
                <div className="text-lg font-bold text-foreground">Total: ₹{viewChallan.total.toLocaleString()}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Delivery Challan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={challanDate} onChange={e => setChallanDate(e.target.value)} /></div>
              <div>
                <Label>Type</Label>
                <Select value={challanType} onValueChange={setChallanType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Job Work">Job Work</SelectItem>
                    <SelectItem value="Supply">Supply</SelectItem>
                    <SelectItem value="Export">Export</SelectItem>
                    <SelectItem value="SKD/CKD">SKD/CKD</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Party</Label>
                <Select value={partyId} onValueChange={v => { setPartyId(v); const p = customers.find(c => c.id === v); if (p) setDeliveryAddress([p.address, p.city, p.state].filter(Boolean).join(', ')); }}>
                  <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Vehicle No</Label><Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="GJ01XX1234" /></div>
              <div><Label>Driver Name</Label><Input value={driverName} onChange={e => setDriverName(e.target.value)} /></div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={includeGst} onCheckedChange={setIncludeGst} />
                <Label>Include GST</Label>
              </div>
            </div>
            <div><Label>Delivery Address</Label><Textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={2} /></div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2"><Label className="text-sm font-semibold">Items</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
             <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="space-y-1 border-b border-border pb-2 last:border-0">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Select value={item.productId} onValueChange={v => updateItem(idx, 'productId', v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
                          <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2"><Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', +e.target.value)} className="text-xs" /></div>
                      <div className="col-span-2"><Input type="number" value={item.rate} onChange={e => updateItem(idx, 'rate', +e.target.value)} className="text-xs" /></div>
                      <div className="col-span-3 text-right text-sm font-medium pt-2 text-foreground">₹{item.totalAmount.toLocaleString()}</div>
                      <div className="col-span-1"><Button variant="ghost" size="sm" onClick={() => removeItem(idx)} disabled={items.length <= 1}><Trash2 className="h-3 w-3 text-destructive" /></Button></div>
                    </div>
                    {/* Unit selector for 'both' type products */}
                    {item.productId && item.sellingUnitType === 'both' && (
                      <div className="flex items-center gap-2 ml-1">
                        <span className="text-[10px] text-muted-foreground">Unit:</span>
                        <button type="button" onClick={() => updateItem(idx, 'selectedUnit', 'carton')}
                          className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${item.selectedUnit === 'carton' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Box className="h-3 w-3" /> {item.cartonUnitName}
                        </button>
                        <button type="button" onClick={() => updateItem(idx, 'selectedUnit', 'loose')}
                          className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${item.selectedUnit === 'loose' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Package className="h-3 w-3" /> {item.unit}
                        </button>
                      </div>
                    )}
                    {/* Show loose equivalent for carton selections */}
                    {item.productId && item.selectedUnit === 'carton' && item.piecesPerCarton > 1 && (
                      <div className="text-[10px] text-muted-foreground ml-1">
                        Loose: {item.quantity} {item.cartonUnitName} × {item.piecesPerCarton} = {item.totalLooseUnits} {item.unit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-right space-y-1 text-sm border-t border-border pt-3">
              <div className="text-muted-foreground">Subtotal: ₹{subtotal.toLocaleString()}</div>
              {includeGst && <div className="text-muted-foreground">Tax: ₹{taxTotal.toLocaleString()}</div>}
              <div className="text-lg font-bold text-foreground">Total: ₹{total.toLocaleString()}</div>
            </div>

            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={saveChallan}><Truck className="h-4 w-4 mr-1" />Save Challan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
