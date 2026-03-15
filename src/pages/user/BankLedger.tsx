import { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Search, Banknote, ArrowUpRight, ArrowDownRight, CheckCircle2, Filter, Download } from 'lucide-react';
import { exportToExcel } from '@/services/exportService';

interface LedgerEntry {
  id: string;
  bankAccountId: string;
  entryDate: string;
  entryType: 'credit' | 'debit';
  description: string;
  amount: number;
  runningBalance: number;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  isManual: boolean;
  isReconciled: boolean;
}

export default function BankLedgerPage() {
  const { session, bankAccounts } = useApp();
  const userId = session.userId;
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState<'credit' | 'debit'>('credit');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState('');

  // Auto-select default or first bank account
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedAccountId) {
      const defaultAcc = bankAccounts.find(a => a.isDefault) || bankAccounts[0];
      setSelectedAccountId(defaultAcc.id);
    }
  }, [bankAccounts, selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) loadEntries();
  }, [selectedAccountId]);

  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('bank_ledger_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('bank_account_id', selectedAccountId)
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) { console.error(error); setLoading(false); return; }

    setEntries((data || []).map((r: any) => ({
      id: r.id, bankAccountId: r.bank_account_id, entryDate: r.entry_date,
      entryType: r.entry_type as 'credit' | 'debit', description: r.description,
      amount: r.amount, runningBalance: r.running_balance || 0,
      referenceType: r.reference_type, referenceId: r.reference_id,
      referenceNumber: r.reference_number, isManual: r.is_manual || false,
      isReconciled: r.is_reconciled || false,
    })));
    setLoading(false);
  };

  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);

  // Calculate running balance
  const entriesWithBalance = useMemo(() => {
    const openingBalance = 0; // Could come from bank_accounts.opening_balance
    let balance = openingBalance;
    return entries.map(e => {
      if (e.entryType === 'credit') balance += e.amount;
      else balance -= e.amount;
      return { ...e, runningBalance: balance };
    });
  }, [entries]);

  const currentBalance = entriesWithBalance.length > 0
    ? entriesWithBalance[entriesWithBalance.length - 1].runningBalance
    : 0;

  const totalCredits = entries.filter(e => e.entryType === 'credit').reduce((s, e) => s + e.amount, 0);
  const totalDebits = entries.filter(e => e.entryType === 'debit').reduce((s, e) => s + e.amount, 0);
  const reconciledCount = entries.filter(e => e.isReconciled).length;

  const saveEntry = async () => {
    if (!description.trim()) { toast.error('Enter a description'); return; }
    if (amount <= 0) { toast.error('Enter a valid amount'); return; }

    const { error } = await (supabase as any).from('bank_ledger_entries').insert({
      bank_account_id: selectedAccountId, user_id: userId,
      entry_date: entryDate, entry_type: entryType,
      description: description.trim(), amount,
      reference_number: referenceNumber || null,
      is_manual: true, is_reconciled: false,
      running_balance: entryType === 'credit' ? currentBalance + amount : currentBalance - amount,
    });

    if (error) { toast.error('Save failed: ' + error.message); return; }
    toast.success('Entry added!');
    setShowAddEntry(false); setDescription(''); setAmount(0); setReferenceNumber('');
    loadEntries();
  };

  const toggleReconcile = async (entryId: string, current: boolean) => {
    await (supabase as any).from('bank_ledger_entries').update({ is_reconciled: !current }).eq('id', entryId);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, isReconciled: !current } : e));
  };

  const filtered = entriesWithBalance
    .filter(e => filterType === 'all' || e.entryType === filterType)
    .filter(e =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.referenceNumber || '').toLowerCase().includes(search.toLowerCase())
    )
    .reverse(); // Most recent first

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">🏦 Bank Ledger</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToExcel({ data: filtered.map(e => ({ Date: e.entryDate, Type: e.entryType, Description: e.description, Amount: e.amount, Balance: e.runningBalance, Reference: e.referenceNumber || '', Reconciled: e.isReconciled ? 'Yes' : 'No' })), fileName: `Bank_Ledger_${selectedAccountId?.slice(0, 8)}`, sheetName: 'Ledger' })} disabled={!selectedAccountId}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button onClick={() => { setShowAddEntry(true); setEntryDate(new Date().toISOString().split('T')[0]); setEntryType('credit'); setAmount(0); setDescription(''); setReferenceNumber(''); }} disabled={!selectedAccountId}>
            <Plus className="h-4 w-4 mr-1" /> Manual Entry
          </Button>
        </div>
      </div>

      {/* Account Selector */}
      {bankAccounts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No bank accounts found. Add one in Settings first.</CardContent></Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {bankAccounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedAccountId === acc.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-card-foreground border-border hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  <span>{acc.displayLabel || acc.bankName}</span>
                </div>
                <div className="text-[10px] opacity-70">A/C: ****{acc.accountNumber.slice(-4)}</div>
              </button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-foreground">₹{currentBalance.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Current Balance</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <ArrowDownRight className="h-4 w-4 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">₹{totalCredits.toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total Credits</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">₹{totalDebits.toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total Debits</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold text-primary">{reconciledCount}/{entries.length}</span>
                </div>
                <div className="text-xs text-muted-foreground">Reconciled</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1">
              {(['all', 'credit', 'debit'] as const).map(t => (
                <Button
                  key={t}
                  variant={filterType === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(t)}
                >
                  {t === 'all' ? 'All' : t === 'credit' ? '↓ Credits' : '↑ Debits'}
                </Button>
              ))}
            </div>
          </div>

          {/* Ledger Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">✓</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead className="text-right text-green-600">Credit</TableHead>
                    <TableHead className="text-right text-red-600">Debit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No entries found</TableCell></TableRow>
                  ) : filtered.map(e => (
                    <TableRow key={e.id} className={e.isReconciled ? 'opacity-70' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={e.isReconciled}
                          onCheckedChange={() => toggleReconcile(e.id, e.isReconciled)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{e.entryDate}</TableCell>
                      <TableCell className="text-foreground">
                        <div>{e.description}</div>
                        {e.isManual && <Badge variant="outline" className="text-[10px] mt-0.5">Manual</Badge>}
                        {e.referenceType && <Badge variant="secondary" className="text-[10px] mt-0.5 ml-1">{e.referenceType}</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{e.referenceNumber || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {e.entryType === 'credit' ? `₹${e.amount.toLocaleString()}` : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {e.entryType === 'debit' ? `₹${e.amount.toLocaleString()}` : ''}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        ₹{e.runningBalance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Manual Entry Dialog */}
      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Manual Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-2 bg-muted rounded text-sm text-muted-foreground">
              Account: <strong className="text-foreground">{selectedAccount?.displayLabel || selectedAccount?.bankName}</strong>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={entryType} onValueChange={v => setEntryType(v as 'credit' | 'debit')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (Money In)</SelectItem>
                    <SelectItem value="debit">Debit (Money Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="e.g., Loan repayment, Interest received" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹)</Label>
                <Input type="number" value={amount || ''} onChange={e => setAmount(+e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Reference No.</Label>
                <Input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddEntry(false)}>Cancel</Button>
              <Button onClick={saveEntry}>
                {entryType === 'credit' ? <ArrowDownRight className="h-4 w-4 mr-1" /> : <ArrowUpRight className="h-4 w-4 mr-1" />}
                Save Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
