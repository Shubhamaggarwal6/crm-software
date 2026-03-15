import { supabase } from '@/integrations/supabase/client';

interface LedgerEntryInput {
  userId: string;
  bankAccountId: string;
  entryDate: string;
  entryType: 'credit' | 'debit';
  description: string;
  amount: number;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
}

/**
 * Create a bank ledger entry automatically when a payment is recorded.
 * Calculates running balance from previous entries.
 */
export async function createBankLedgerEntry(entry: LedgerEntryInput) {
  if (!entry.bankAccountId || !entry.amount || entry.amount <= 0) return;

  // Get the latest running balance for this account
  const { data: lastEntry } = await (supabase as any)
    .from('bank_ledger_entries')
    .select('running_balance')
    .eq('bank_account_id', entry.bankAccountId)
    .eq('user_id', entry.userId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const prevBalance = lastEntry?.running_balance || 0;
  const newBalance = entry.entryType === 'credit'
    ? prevBalance + entry.amount
    : prevBalance - entry.amount;

  const { error } = await (supabase as any).from('bank_ledger_entries').insert({
    user_id: entry.userId,
    bank_account_id: entry.bankAccountId,
    entry_date: entry.entryDate,
    entry_type: entry.entryType,
    description: entry.description,
    amount: entry.amount,
    running_balance: newBalance,
    reference_type: entry.referenceType || null,
    reference_id: entry.referenceId || null,
    reference_number: entry.referenceNumber || null,
    is_manual: false,
    is_reconciled: false,
  });

  if (error) console.error('Bank ledger entry failed:', error);
  return { error };
}

/** Create ledger entry for payment received from a customer */
export async function createPaymentReceivedLedger(opts: {
  userId: string;
  bankAccountId: string;
  paymentDate: string;
  paymentId: string;
  receiptNo: string;
  amount: number;
  partyName: string;
  invoiceNo?: string;
}) {
  const desc = opts.invoiceNo
    ? `Received from ${opts.partyName} for ${opts.invoiceNo}`
    : `Received from ${opts.partyName}`;

  return createBankLedgerEntry({
    userId: opts.userId,
    bankAccountId: opts.bankAccountId,
    entryDate: opts.paymentDate,
    entryType: 'credit',
    description: desc,
    amount: opts.amount,
    referenceType: 'payment',
    referenceId: opts.paymentId,
    referenceNumber: opts.receiptNo,
  });
}

/** Create ledger entry for payment made to a supplier */
export async function createSupplierPaymentLedger(opts: {
  userId: string;
  bankAccountId: string;
  paymentDate: string;
  paymentId: string;
  receiptNo: string;
  amount: number;
  supplierName: string;
  purchaseNo?: string;
}) {
  const desc = opts.purchaseNo
    ? `Paid to ${opts.supplierName} for ${opts.purchaseNo}`
    : `Paid to ${opts.supplierName}`;

  return createBankLedgerEntry({
    userId: opts.userId,
    bankAccountId: opts.bankAccountId,
    entryDate: opts.paymentDate,
    entryType: 'debit',
    description: desc,
    amount: opts.amount,
    referenceType: 'payment',
    referenceId: opts.paymentId,
    referenceNumber: opts.receiptNo,
  });
}

/** Create ledger entry for an expense payment */
export async function createExpenseLedger(opts: {
  userId: string;
  bankAccountId: string;
  expenseDate: string;
  expenseId: string;
  amount: number;
  categoryName: string;
  vendorName?: string;
}) {
  const desc = opts.vendorName
    ? `${opts.categoryName} at ${opts.vendorName}`
    : `Expense: ${opts.categoryName}`;

  return createBankLedgerEntry({
    userId: opts.userId,
    bankAccountId: opts.bankAccountId,
    entryDate: opts.expenseDate,
    entryType: 'debit',
    description: desc,
    amount: opts.amount,
    referenceType: 'expense',
    referenceId: opts.expenseId,
  });
}

/** Create ledger entry for salary payment */
export async function createSalaryLedger(opts: {
  userId: string;
  bankAccountId: string;
  paymentDate: string;
  paymentId: string;
  amount: number;
  employeeName: string;
  monthYear: string;
}) {
  return createBankLedgerEntry({
    userId: opts.userId,
    bankAccountId: opts.bankAccountId,
    entryDate: opts.paymentDate,
    entryType: 'debit',
    description: `Salary paid to ${opts.employeeName} for ${opts.monthYear}`,
    amount: opts.amount,
    referenceType: 'salary',
    referenceId: opts.paymentId,
  });
}
