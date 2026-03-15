import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Banknote, UserCog, Calendar, IndianRupee, FileText, Trash2, Download } from 'lucide-react';
import { exportToExcel } from '@/services/exportService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SalaryStructure {
  id: string;
  employeeId: string;
  salaryType: string;
  basicAmount: number;
  allowances: { name: string; amount: number }[];
  grossSalary: number;
  effectiveFrom: string;
}

interface SalaryPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  monthYear: string;
  grossSalary: number;
  advanceDeduction: number;
  otherDeduction: number;
  netPaid: number;
  paymentDate: string;
  paymentMode: string;
  bankAccountId?: string;
  referenceNumber?: string;
  notes?: string;
}

export default function SalaryManagementPage() {
  const { session, employees, bankAccounts } = useApp();
  const isMobile = useIsMobile();
  const userId = session.userId;
  const userEmployees = employees.filter(e => e.userId === userId);

  const [tab, setTab] = useState<'structures' | 'payments'>('payments');
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showStructureDialog, setShowStructureDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Structure form
  const [sForm, setSForm] = useState({
    employeeId: '', salaryType: 'Monthly', basicAmount: 0,
    allowances: [] as { name: string; amount: number }[],
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  // Payment form
  const [pForm, setPForm] = useState({
    employeeId: '', monthYear: new Date().toISOString().slice(0, 7),
    advanceDeduction: 0, otherDeduction: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Bank Transfer', bankAccountId: '', referenceNumber: '', notes: '',
  });

  const userBanks = bankAccounts.filter(a => a.userId === userId);

  useEffect(() => { fetchData(); }, [userId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        supabase.from('salary_structures').select('*').eq('user_id', userId),
        supabase.from('salary_payments').select('*').eq('user_id', userId).order('payment_date', { ascending: false }),
      ]);
      if (sRes.data) setStructures(sRes.data.map((r: any) => ({
        id: r.id, employeeId: r.employee_id, salaryType: r.salary_type,
        basicAmount: r.basic_amount, allowances: r.allowances || [],
        grossSalary: r.gross_salary, effectiveFrom: r.effective_from,
      })));
      if (pRes.data) setPayments(pRes.data.map((r: any) => ({
        id: r.id, employeeId: r.employee_id, employeeName: r.employee_name || '',
        monthYear: r.month_year, grossSalary: r.gross_salary || 0,
        advanceDeduction: r.advance_deduction || 0, otherDeduction: r.other_deduction || 0,
        netPaid: r.net_paid, paymentDate: r.payment_date,
        paymentMode: r.payment_mode || '', bankAccountId: r.bank_account_id,
        referenceNumber: r.reference_number, notes: r.notes,
      })));
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  function getEmployeeStructure(empId: string) {
    return structures.filter(s => s.employeeId === empId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  }

  const grossForSelected = useMemo(() => {
    if (!pForm.employeeId) return 0;
    const s = getEmployeeStructure(pForm.employeeId);
    return s?.grossSalary || 0;
  }, [pForm.employeeId, structures]);

  const netPayable = grossForSelected - pForm.advanceDeduction - pForm.otherDeduction;

  // Save structure
  async function saveStructure() {
    if (!sForm.employeeId) { toast.error('Select employee'); return; }
    const gross = sForm.basicAmount + sForm.allowances.reduce((s, a) => s + a.amount, 0);
    try {
      const { error } = await supabase.from('salary_structures').insert({
        user_id: userId, employee_id: sForm.employeeId, salary_type: sForm.salaryType,
        basic_amount: sForm.basicAmount, allowances: sForm.allowances,
        gross_salary: gross, effective_from: sForm.effectiveFrom,
      });
      if (error) throw error;
      toast.success('Salary structure saved');
      setShowStructureDialog(false);
      setSForm({ employeeId: '', salaryType: 'Monthly', basicAmount: 0, allowances: [], effectiveFrom: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  }

  // Pay salary
  async function paySalary() {
    if (!pForm.employeeId) { toast.error('Select employee'); return; }
    if (netPayable <= 0) { toast.error('Net payable must be > 0'); return; }
    const emp = userEmployees.find(e => e.id === pForm.employeeId);
    try {
      const { error } = await supabase.from('salary_payments').insert({
        user_id: userId, employee_id: pForm.employeeId, employee_name: emp?.name || '',
        month_year: pForm.monthYear, gross_salary: grossForSelected,
        advance_deduction: pForm.advanceDeduction, other_deduction: pForm.otherDeduction,
        net_paid: netPayable, payment_date: pForm.paymentDate,
        payment_mode: pForm.paymentMode,
        bank_account_id: pForm.bankAccountId || null,
        reference_number: pForm.referenceNumber || null, notes: pForm.notes || null,
      });
      if (error) throw error;
      toast.success('Salary paid ✅');
      setShowPaymentDialog(false);
      setPForm({ employeeId: '', monthYear: new Date().toISOString().slice(0, 7), advanceDeduction: 0, otherDeduction: 0, paymentDate: new Date().toISOString().split('T')[0], paymentMode: 'Bank Transfer', bankAccountId: '', referenceNumber: '', notes: '' });
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deletePayment(id: string) {
    if (!confirm('Delete this salary payment?')) return;
    const { error } = await supabase.from('salary_payments').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); fetchData(); }
  }

  async function deleteStructure(id: string) {
    if (!confirm('Delete this salary structure?')) return;
    const { error } = await supabase.from('salary_structures').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); fetchData(); }
  }

  const totalPaidThisMonth = payments
    .filter(p => p.monthYear === new Date().toISOString().slice(0, 7))
    .reduce((s, p) => s + p.netPaid, 0);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" /> Salary Management
        </h1>
        <Button variant="outline" size="sm" onClick={() => exportToExcel({ data: payments.map(p => ({ Employee: p.employeeName, Month: p.monthYear, Gross: p.grossSalary, 'Advance Deduction': p.advanceDeduction, 'Other Deduction': p.otherDeduction, 'Net Paid': p.netPaid, Date: p.paymentDate, Mode: p.paymentMode })), fileName: 'Salary_Payments', sheetName: 'Payments' })}>
          <Download className="h-4 w-4 mr-1" /> Excel
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="hero-card">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><UserCog className="h-3 w-3" />Employees</div>
          <div className="text-lg font-display font-bold mt-1">{userEmployees.length}</div>
        </div>
        <div className="hero-card">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" />Structures Set</div>
          <div className="text-lg font-display font-bold mt-1">{structures.length}</div>
        </div>
        <div className="hero-card col-span-2 md:col-span-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" />Paid This Month</div>
          <div className="text-lg font-display font-bold mt-1 text-primary">₹{totalPaidThisMonth.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setTab('payments')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === 'payments' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            💰 Payments
          </button>
          <button onClick={() => setTab('structures')} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === 'structures' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            📋 Structures
          </button>
        </div>
        <div className="flex gap-2">
          {tab === 'structures' && (
            <Button size="sm" onClick={() => setShowStructureDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Set Structure
            </Button>
          )}
          {tab === 'payments' && (
            <Button size="sm" onClick={() => setShowPaymentDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Pay Salary
            </Button>
          )}
        </div>
      </div>

      {/* Payments Tab */}
      {tab === 'payments' && (
        <div className="space-y-2">
          {payments.length === 0 ? (
            <div className="hero-card text-center text-muted-foreground py-8">No salary payments yet. Click "Pay Salary" to get started.</div>
          ) : payments.map(p => (
            <div key={p.id} className="hero-card flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-medium text-sm">{p.employeeName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span><Calendar className="h-3 w-3 inline mr-0.5" />{p.monthYear}</span>
                  <span>•</span>
                  <span>{p.paymentMode}</span>
                  {p.referenceNumber && <span className="font-mono">#{p.referenceNumber}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-display font-bold text-primary">₹{p.netPaid.toLocaleString('en-IN')}</div>
                  {(p.advanceDeduction > 0 || p.otherDeduction > 0) && (
                    <div className="text-[10px] text-muted-foreground">
                      Gross ₹{p.grossSalary.toLocaleString('en-IN')} − Ded ₹{(p.advanceDeduction + p.otherDeduction).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
                <button onClick={() => deletePayment(p.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Structures Tab */}
      {tab === 'structures' && (
        <div className="space-y-2">
          {structures.length === 0 ? (
            <div className="hero-card text-center text-muted-foreground py-8">No salary structures defined yet.</div>
          ) : structures.map(s => {
            const emp = userEmployees.find(e => e.id === s.employeeId);
            return (
              <div key={s.id} className="hero-card flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">{emp?.name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.salaryType} • Basic ₹{s.basicAmount.toLocaleString('en-IN')}
                    {s.allowances.length > 0 && ` + ${s.allowances.length} allowances`}
                    <span className="ml-2">From: {s.effectiveFrom}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-display font-bold text-primary">₹{s.grossSalary.toLocaleString('en-IN')}</div>
                  <button onClick={() => deleteStructure(s.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Structure Dialog */}
      <Dialog open={showStructureDialog} onOpenChange={setShowStructureDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Set Salary Structure</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Employee *</label>
              <select value={sForm.employeeId} onChange={e => setSForm({ ...sForm, employeeId: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background">
                <option value="">Select</option>
                {userEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select value={sForm.salaryType} onChange={e => setSForm({ ...sForm, salaryType: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background">
                  <option>Monthly</option><option>Weekly</option><option>Daily</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Effective From</label>
                <input type="date" value={sForm.effectiveFrom} onChange={e => setSForm({ ...sForm, effectiveFrom: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Basic Amount (₹)</label>
              <input type="number" value={sForm.basicAmount || ''} onChange={e => setSForm({ ...sForm, basicAmount: +e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background" />
            </div>

            {/* Allowances */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">Allowances</label>
                <button onClick={() => setSForm({ ...sForm, allowances: [...sForm.allowances, { name: '', amount: 0 }] })} className="text-xs text-primary hover:underline">+ Add</button>
              </div>
              {sForm.allowances.map((a, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <input placeholder="Name" value={a.name} onChange={e => { const al = [...sForm.allowances]; al[i].name = e.target.value; setSForm({ ...sForm, allowances: al }); }} className="flex-1 border rounded-md p-1.5 text-sm bg-background" />
                  <input type="number" placeholder="₹" value={a.amount || ''} onChange={e => { const al = [...sForm.allowances]; al[i].amount = +e.target.value; setSForm({ ...sForm, allowances: al }); }} className="w-24 border rounded-md p-1.5 text-sm bg-background" />
                  <button onClick={() => setSForm({ ...sForm, allowances: sForm.allowances.filter((_, j) => j !== i) })} className="text-destructive text-xs">✕</button>
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-md p-2 text-sm">
              <span className="text-muted-foreground">Gross: </span>
              <span className="font-bold">₹{(sForm.basicAmount + sForm.allowances.reduce((s, a) => s + a.amount, 0)).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStructureDialog(false)}>Cancel</Button>
            <Button onClick={saveStructure}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pay Salary</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Employee *</label>
              <select value={pForm.employeeId} onChange={e => setPForm({ ...pForm, employeeId: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background">
                <option value="">Select</option>
                {userEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Month</label>
                <input type="month" value={pForm.monthYear} onChange={e => setPForm({ ...pForm, monthYear: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Payment Date</label>
                <input type="date" value={pForm.paymentDate} onChange={e => setPForm({ ...pForm, paymentDate: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background" />
              </div>
            </div>

            {grossForSelected > 0 && (
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                Gross Salary: <span className="font-bold">₹{grossForSelected.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Advance Deduction (₹)</label>
                <input type="number" value={pForm.advanceDeduction || ''} onChange={e => setPForm({ ...pForm, advanceDeduction: +e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Other Deduction (₹)</label>
                <input type="number" value={pForm.otherDeduction || ''} onChange={e => setPForm({ ...pForm, otherDeduction: +e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Payment Mode</label>
                <select value={pForm.paymentMode} onChange={e => setPForm({ ...pForm, paymentMode: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background">
                  <option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Bank Account</label>
                <select value={pForm.bankAccountId} onChange={e => setPForm({ ...pForm, bankAccountId: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background">
                  <option value="">None</option>
                  {userBanks.map(b => <option key={b.id} value={b.id}>{b.displayLabel || b.bankName}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Reference / UTR</label>
              <input value={pForm.referenceNumber} onChange={e => setPForm({ ...pForm, referenceNumber: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <input value={pForm.notes} onChange={e => setPForm({ ...pForm, notes: e.target.value })} className="w-full border rounded-md p-2 text-sm bg-background" />
            </div>

            <div className="bg-primary/10 rounded-md p-3 text-center">
              <div className="text-xs text-muted-foreground">Net Payable</div>
              <div className="text-xl font-display font-bold text-primary">₹{Math.max(0, netPayable).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={paySalary}>Pay ₹{Math.max(0, netPayable).toLocaleString('en-IN')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
