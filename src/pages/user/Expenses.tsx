import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, DollarSign, TrendingUp, Filter, Trash2, Edit2, Download } from 'lucide-react';
import { exportToExcel } from '@/services/exportService';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { createExpenseLedger } from '@/services/bankLedgerService';

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isGstApplicable: boolean;
  defaultGstRate: number;
  active: boolean;
}

interface Expense {
  id: string;
  date: string;
  categoryName: string;
  categoryId?: string;
  vendorName?: string;
  description?: string;
  amount: number;
  withGst: boolean;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  paymentMode?: string;
  billNumber?: string;
  referenceNumber?: string;
}

const DEFAULT_CATEGORIES = [
  'Rent', 'Electricity', 'Internet/Phone', 'Stationery', 'Transport',
  'Salary', 'Maintenance', 'Packaging', 'Marketing', 'Insurance', 'Other'
];

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'NEFT', 'RTGS'];

export default function ExpensesPage() {
  const { session, bankAccounts } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    categoryName: '',
    vendorName: '',
    description: '',
    amount: '',
    withGst: false,
    gstRate: '18',
    paymentMode: 'Cash',
    billNumber: '',
    referenceNumber: '',
  });

  // Category form
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    isGstApplicable: false,
    defaultGstRate: '18',
  });

  const uid = session.userId;

  const loadData = useCallback(async () => {
    if (!uid) return;
    const [expRes, catRes] = await Promise.all([
      (supabase as any).from('expenses').select('*').eq('user_id', uid).order('expense_date', { ascending: false }),
      (supabase as any).from('expense_categories').select('*').eq('user_id', uid).eq('active', true),
    ]);
    setExpenses((expRes.data || []).map((r: any) => ({
      id: r.id, date: r.expense_date, categoryName: r.category_name || '',
      categoryId: r.category_id, vendorName: r.vendor_name, description: r.description,
      amount: r.amount, withGst: r.with_gst || false, gstRate: r.gst_rate || 0,
      gstAmount: r.gst_amount || 0, totalAmount: r.total_amount,
      paymentMode: r.payment_mode, billNumber: r.bill_number, referenceNumber: r.reference_number,
    })));
    setCategories((catRes.data || []).map((r: any) => ({
      id: r.id, name: r.name, description: r.description,
      isGstApplicable: r.is_gst_applicable || false,
      defaultGstRate: r.default_gst_rate || 18, active: r.active,
    })));
    setLoading(false);
  }, [uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddCategory = async () => {
    if (!catForm.name.trim()) { toast.error('Category name required'); return; }
    const { error } = await (supabase as any).from('expense_categories').insert({
      user_id: uid, name: catForm.name.trim(), description: catForm.description || null,
      is_gst_applicable: catForm.isGstApplicable,
      default_gst_rate: catForm.isGstApplicable ? parseFloat(catForm.defaultGstRate) : 0,
    });
    if (error) { toast.error('Category save failed'); return; }
    toast.success('Category added!');
    setCatForm({ name: '', description: '', isGstApplicable: false, defaultGstRate: '18' });
    setCatDialogOpen(false);
    loadData();
  };

  const handleAddExpense = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Valid amount required'); return; }
    if (!form.categoryName && !form.categoryId) { toast.error('Select a category'); return; }

    const gstRate = form.withGst ? parseFloat(form.gstRate) : 0;
    const gstAmount = form.withGst ? (amount * gstRate) / 100 : 0;
    const totalAmount = amount + gstAmount;

    const catName = form.categoryName || categories.find(c => c.id === form.categoryId)?.name || '';

    const { data: inserted, error } = await (supabase as any).from('expenses').insert({
      user_id: uid, expense_date: form.date,
      category_id: form.categoryId || null, category_name: catName,
      vendor_name: form.vendorName || null, description: form.description || null,
      amount, with_gst: form.withGst, gst_rate: gstRate, gst_amount: gstAmount,
      total_amount: totalAmount, payment_mode: form.paymentMode,
      bill_number: form.billNumber || null, reference_number: form.referenceNumber || null,
    }).select().single();
    if (error) { toast.error('Expense save failed: ' + error.message); return; }
    
    // Auto-create bank ledger entry for non-cash expense payments
    if (form.paymentMode !== 'Cash' && inserted) {
      const defaultBank = bankAccounts.find(a => a.userId === uid && a.isDefault) || bankAccounts.find(a => a.userId === uid);
      if (defaultBank) {
        await createExpenseLedger({
          userId: uid, bankAccountId: defaultBank.id,
          expenseDate: form.date, expenseId: inserted.id,
          amount: totalAmount, categoryName: catName,
          vendorName: form.vendorName || undefined,
        });
      }
    }
    
    toast.success('Expense added!');
    setForm({
      date: new Date().toISOString().split('T')[0], categoryId: '', categoryName: '',
      vendorName: '', description: '', amount: '', withGst: false, gstRate: '18',
      paymentMode: 'Cash', billNumber: '', referenceNumber: '',
    });
    setDialogOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('expenses').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success('Expense deleted');
  };

  const allCategoryNames = [...new Set([
    ...DEFAULT_CATEGORIES,
    ...categories.map(c => c.name),
  ])];

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.categoryName.toLowerCase().includes(search.toLowerCase()) ||
      (e.vendorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || e.categoryName === filterCategory;
    return matchSearch && matchCat;
  });

  const totalExpenses = filtered.reduce((s, e) => s + e.totalAmount, 0);
  const totalGst = filtered.reduce((s, e) => s + e.gstAmount, 0);
  const thisMonth = filtered.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
  const monthTotal = thisMonth.reduce((s, e) => s + e.totalAmount, 0);

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">💸 Expenses</h1>
          <p className="text-sm text-muted-foreground">Track all business expenses with GST</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToExcel({ data: filtered.map(e => ({ Date: e.date, Category: e.categoryName, Vendor: e.vendorName || '', Description: e.description || '', Amount: e.amount, GST: e.gstAmount, Total: e.totalAmount, Mode: e.paymentMode })), fileName: 'Expenses', sheetName: 'Expenses' })}><Download className="h-4 w-4 mr-1" /> Excel</Button>
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Expense Category</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Category Name *</Label><Input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Office Rent" /></div>
                <div><Label>Description</Label><Input value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="flex items-center gap-3">
                  <Switch checked={catForm.isGstApplicable} onCheckedChange={v => setCatForm(p => ({ ...p, isGstApplicable: v }))} />
                  <Label>GST Applicable (ITC)</Label>
                </div>
                {catForm.isGstApplicable && (
                  <div><Label>Default GST Rate (%)</Label><Input type="number" value={catForm.defaultGstRate} onChange={e => setCatForm(p => ({ ...p, defaultGstRate: e.target.value }))} /></div>
                )}
                <Button onClick={handleAddCategory} className="w-full">Save Category</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
                  <div>
                    <Label>Category *</Label>
                    <Select value={form.categoryName} onValueChange={v => {
                      const cat = categories.find(c => c.name === v);
                      setForm(p => ({
                        ...p, categoryName: v, categoryId: cat?.id || '',
                        withGst: cat?.isGstApplicable || false,
                        gstRate: cat?.defaultGstRate?.toString() || '18',
                      }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {allCategoryNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Vendor / Payee</Label><Input value={form.vendorName} onChange={e => setForm(p => ({ ...p, vendorName: e.target.value }))} placeholder="e.g. Landlord name" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" /></div>
                  <div>
                    <Label>Payment Mode</Label>
                    <Select value={form.paymentMode} onValueChange={v => setForm(p => ({ ...p, paymentMode: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.withGst} onCheckedChange={v => setForm(p => ({ ...p, withGst: v }))} />
                  <Label>With GST (for ITC claim)</Label>
                </div>
                {form.withGst && (
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>GST Rate %</Label><Input type="number" value={form.gstRate} onChange={e => setForm(p => ({ ...p, gstRate: e.target.value }))} /></div>
                    <div><Label>GST Amount</Label><Input readOnly value={fmt(parseFloat(form.amount || '0') * parseFloat(form.gstRate || '0') / 100)} /></div>
                    <div><Label>Total</Label><Input readOnly value={fmt(parseFloat(form.amount || '0') * (1 + parseFloat(form.gstRate || '0') / 100))} /></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Bill No.</Label><Input value={form.billNumber} onChange={e => setForm(p => ({ ...p, billNumber: e.target.value }))} /></div>
                  <div><Label>Reference No.</Label><Input value={form.referenceNumber} onChange={e => setForm(p => ({ ...p, referenceNumber: e.target.value }))} /></div>
                </div>
                <Button onClick={handleAddExpense} className="w-full">Save Expense</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><DollarSign className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-lg font-bold">{fmt(totalExpenses)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">This Month</p><p className="text-lg font-bold">{fmt(monthTotal)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/20"><Filter className="h-5 w-5 text-accent-foreground" /></div>
          <div><p className="text-xs text-muted-foreground">GST (ITC)</p><p className="text-lg font-bold">{fmt(totalGst)}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategoryNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No expenses found. Add your first expense!</TableCell></TableRow>
                ) : filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</TableCell>
                    <TableCell><span className="px-2 py-0.5 rounded-full text-xs bg-muted">{e.categoryName}</span></TableCell>
                    <TableCell>{e.vendorName || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{e.description || '—'}</TableCell>
                    <TableCell className="text-right">{fmt(e.amount)}</TableCell>
                    <TableCell className="text-right">{e.gstAmount > 0 ? fmt(e.gstAmount) : '—'}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(e.totalAmount)}</TableCell>
                    <TableCell>{e.paymentMode || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
