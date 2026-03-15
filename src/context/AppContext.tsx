import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { User, Employee, Customer, Product, Invoice, InvoiceItem, Payment, Supplier, Purchase, CreditNote, DebitNote, AppSession, Role, BankAccount, defaultPermissions } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createPaymentReceivedLedger, createSupplierPaymentLedger } from '@/services/bankLedgerService';
import {
  dbToCustomer, customerToDb,
  dbToProduct, productToDb,
  dbToInvoice, dbToInvoiceItem, invoiceToDb, invoiceItemToDb,
  dbToPayment, paymentToDb,
  dbToEmployee,
  dbToSupplier, supplierToDb,
  dbToPurchase, dbToPurchaseItem, purchaseToDb, purchaseItemToDb,
  dbToCreditNote, dbToCreditNoteItem, creditNoteToDb, creditNoteItemToDb,
  dbToDebitNote, debitNoteToDb,
  dbToBankAccount, bankAccountToDb,
} from '@/services/dbMappers';

interface AppContextType {
  session: AppSession;
  users: User[];
  employees: Employee[];
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  suppliers: Supplier[];
  purchases: Purchase[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  bankAccounts: BankAccount[];
  loading: boolean;
  logout: () => void;
  getCurrentUser: () => User | undefined;
  getCurrentEmployee: () => Employee | undefined;
  getOwnerUserId: () => string;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  renewSubscription: (userId: string, newEndDate: string) => void;
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addCustomer: (cust: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addInvoice: (inv: Omit<Invoice, 'id'>) => void;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => void;
  deleteInvoice: (id: string) => void;
  addPayment: (pay: Omit<Payment, 'id'>) => void;
  deletePayment: (id: string) => void;
  getNextReceiptNo: () => string;
  addSupplier: (sup: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  addPurchase: (pur: Omit<Purchase, 'id'>) => void;
  updatePurchase: (id: string, updates: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void;
  addCreditNote: (cn: Omit<CreditNote, 'id'>) => void;
  updateCreditNote: (id: string, updates: Partial<CreditNote>) => void;
  addDebitNote: (dn: Omit<DebitNote, 'id'>) => void;
  updateDebitNote: (id: string, updates: Partial<DebitNote>) => void;
  resetPassword: (method: 'master' | 'old', params: { username: string; masterKey?: string; oldPassword?: string; newPassword: string }) => { success: boolean; message: string };
  addBankAccount: (acc: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  setDefaultBankAccount: (id: string) => void;
  getInvoiceStatus: (invoiceId: string) => { status: 'Paid' | 'Partial' | 'Pending'; received: number; balance: number };
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const session: AppSession = (() => {
    if (!auth.session) return { loggedIn: false, role: 'user' as Role, userId: '' };
    if (auth.role === 'super_admin') return { loggedIn: true, role: 'admin' as Role, userId: auth.effectiveUserId };
    if (auth.role === 'employee') return { loggedIn: true, role: 'employee' as Role, userId: auth.effectiveUserId, employeeId: auth.employeeId || undefined };
    return { loggedIn: true, role: 'user' as Role, userId: auth.effectiveUserId };
  })();

  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Build User object from auth session
  useEffect(() => {
    if (!session.loggedIn || !session.userId || !auth.session) return;
    const s = auth.session;
    let newUser: User;
    if (s.type === 'owner') {
      const op = s.ownerProfile || {} as any;
      const pr = s.profile || {} as any;
      newUser = {
        id: session.userId, username: pr.email || s.email || '', password: '',
        firmName: op.firm_name || 'My Business', gstNumber: op.gst_number || '',
        email: s.email || pr.email || '', phone: pr.phone || '',
        address: op.address || '', city: op.city || '', state: op.state || '',
        stateCode: op.state_code || '', pin: op.pin_code || '',
        plan: (op.plan || 'Basic') as any, maxEmployees: op.max_employees || 5,
        subscriptionStart: op.sub_start || new Date().toISOString().split('T')[0],
        subscriptionEnd: op.sub_end || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        active: op.active !== false, invoicePrefix: op.invoice_prefix || 'INV',
        showStockToEmployees: op.show_stock_to_employees || false,
        termsAndConditions: op.terms_and_conditions || '',
      };
    } else if (s.type === 'super_admin') {
      newUser = {
        id: session.userId, username: s.email, password: '', firmName: 'Admin',
        gstNumber: '', email: s.email, phone: '', plan: 'Enterprise' as any,
        maxEmployees: 0, subscriptionStart: '', subscriptionEnd: '', active: true,
      };
    } else return;
    setUsers([newUser]);
  }, [session.loggedIn, session.userId, auth.session]);

  // ─── Load all data from Supabase ───
  const loadData = useCallback(async () => {
    if (!session.loggedIn || !session.userId) { setLoading(false); return; }
    const uid = session.userId;
    try {
      const [custRes, prodRes, invRes, invItemsRes, payRes, empRes, supRes, purRes, purItemsRes, cnRes, cnItemsRes, dnRes, bankRes] = await Promise.all([
        (supabase as any).from('customers').select('*').eq('user_id', uid),
        (supabase as any).from('products').select('*').eq('user_id', uid),
        (supabase as any).from('invoices').select('*').eq('user_id', uid),
        (supabase as any).from('invoice_items').select('*').eq('user_id', uid),
        (supabase as any).from('payments').select('*').eq('user_id', uid),
        (supabase as any).from('employees').select('*').eq('owner_id', uid),
        (supabase as any).from('suppliers').select('*').eq('user_id', uid),
        (supabase as any).from('purchases').select('*').eq('user_id', uid),
        (supabase as any).from('purchase_items').select('*').eq('user_id', uid),
        (supabase as any).from('credit_notes').select('*').eq('user_id', uid),
        (supabase as any).from('credit_note_items').select('*').eq('user_id', uid),
        (supabase as any).from('debit_notes').select('*').eq('user_id', uid),
        (supabase as any).from('bank_accounts').select('*').eq('user_id', uid),
      ]);

      setCustomers((custRes.data || []).map(dbToCustomer));
      setProducts((prodRes.data || []).map(dbToProduct));
      setPayments((payRes.data || []).map(dbToPayment));
      setEmployees((empRes.data || []).map(dbToEmployee));
      setSuppliers((supRes.data || []).map(dbToSupplier));
      setDebitNotes((dnRes.data || []).map(dbToDebitNote));
      setBankAccounts((bankRes.data || []).map(dbToBankAccount));

      // Group invoice items by invoice_id
      const invItemsMap: Record<string, InvoiceItem[]> = {};
      (invItemsRes.data || []).forEach((r: any) => {
        if (!invItemsMap[r.invoice_id]) invItemsMap[r.invoice_id] = [];
        invItemsMap[r.invoice_id].push(dbToInvoiceItem(r));
      });
      setInvoices((invRes.data || []).map((r: any) => dbToInvoice(r, invItemsMap[r.id] || [])));

      // Group purchase items
      const purItemsMap: Record<string, any[]> = {};
      (purItemsRes.data || []).forEach((r: any) => {
        if (!purItemsMap[r.purchase_id]) purItemsMap[r.purchase_id] = [];
        purItemsMap[r.purchase_id].push(dbToPurchaseItem(r));
      });
      setPurchases((purRes.data || []).map((r: any) => dbToPurchase(r, purItemsMap[r.id] || [])));

      // Group credit note items
      const cnItemsMap: Record<string, InvoiceItem[]> = {};
      (cnItemsRes.data || []).forEach((r: any) => {
        if (!cnItemsMap[r.credit_note_id]) cnItemsMap[r.credit_note_id] = [];
        cnItemsMap[r.credit_note_id].push(dbToCreditNoteItem(r));
      });
      setCreditNotes((cnRes.data || []).map((r: any) => dbToCreditNote(r, cnItemsMap[r.id] || [])));

    } catch (err: any) {
      console.error('Failed to load data:', err);
      toast.error('Data load karne mein problem hui. Refresh karein.');
    } finally {
      setLoading(false);
      loadedRef.current = true;
    }
  }, [session.loggedIn, session.userId]);

  useEffect(() => {
    if (session.loggedIn && session.userId && !loadedRef.current) {
      loadData();
    }
    if (!session.loggedIn) {
      loadedRef.current = false;
      setLoading(true);
    }
  }, [session.loggedIn, session.userId, loadData]);

  const refreshData = useCallback(async () => { loadedRef.current = false; await loadData(); }, [loadData]);

  const logout = useCallback(() => { loadedRef.current = false; auth.logout(); }, [auth]);
  const getCurrentUser = useCallback(() => users.find(u => u.id === session.userId), [users, session]);
  const getCurrentEmployee = useCallback(() => employees.find(e => e.id === session.employeeId), [employees, session]);
  const getOwnerUserId = useCallback(() => session.userId, [session]);

  // ─── User CRUD (admin only, updates owner_profiles) ───
  const addUser = useCallback((user: Omit<User, 'id'>) => setUsers(prev => [...prev, { ...user, id: crypto.randomUUID() }]), []);
  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    // Persist to owner_profiles
    const dbUpdates: any = {};
    if (updates.firmName !== undefined) dbUpdates.firm_name = updates.firmName;
    if (updates.gstNumber !== undefined) dbUpdates.gst_number = updates.gstNumber;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.stateCode !== undefined) dbUpdates.state_code = updates.stateCode;
    if (updates.pin !== undefined) dbUpdates.pin_code = updates.pin;
    if (updates.invoicePrefix !== undefined) dbUpdates.invoice_prefix = updates.invoicePrefix;
    if (updates.termsAndConditions !== undefined) dbUpdates.terms_and_conditions = updates.termsAndConditions;
    if (updates.showStockToEmployees !== undefined) dbUpdates.show_stock_to_employees = updates.showStockToEmployees;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await (supabase as any).from('owner_profiles').update(dbUpdates).eq('id', id);
      if (error) console.error('updateUser error:', error);
    }
  }, []);
  const renewSubscription = useCallback(async (userId: string, newEndDate: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscriptionEnd: newEndDate } : u));
    await (supabase as any).from('owner_profiles').update({ sub_end: newEndDate }).eq('id', userId);
  }, []);

  // ─── Employee CRUD ───
  const addEmployee = useCallback(async (emp: Omit<Employee, 'id'>) => {
    const { data, error } = await (supabase as any).from('employees').insert({
      owner_id: emp.userId, name: emp.name, username: emp.username,
      password_hash: emp.password, active: emp.active ?? true,
      permissions: emp.permissions,
    }).select().single();
    if (error) { toast.error('Employee add nahi ho paya: ' + error.message); return; }
    setEmployees(prev => [...prev, dbToEmployee(data)]);
  }, []);
  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;
    if (updates.password !== undefined) dbUpdates.password_hash = updates.password;
    const { error } = await (supabase as any).from('employees').update(dbUpdates).eq('id', id);
    if (error) { toast.error('Employee update nahi hua: ' + error.message); return; }
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);
  const deleteEmployee = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from('employees').delete().eq('id', id);
    if (error) { toast.error('Employee delete nahi hua: ' + error.message); return; }
    setEmployees(prev => prev.filter(e => e.id !== id));
  }, []);

  // ─── Customer CRUD ───
  const addCustomer = useCallback(async (cust: Omit<Customer, 'id'>) => {
    const row = customerToDb(cust as any);
    const { data, error } = await (supabase as any).from('customers').insert(row).select().single();
    if (error) { toast.error('Customer add nahi ho paya: ' + error.message); return; }
    setCustomers(prev => [...prev, dbToCustomer(data)]);
  }, []);
  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.altPhone !== undefined) dbUpdates.alternate_phone = updates.altPhone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.gstNumber !== undefined) dbUpdates.gst_number = updates.gstNumber;
    if (updates.pan !== undefined) dbUpdates.pan_number = updates.pan;
    if (updates.address !== undefined) dbUpdates.street = updates.address;
    if (updates.area !== undefined) dbUpdates.area = updates.area;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.pin !== undefined) dbUpdates.pin_code = updates.pin;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.stateCode !== undefined) dbUpdates.state_code = updates.stateCode;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    const { error } = await (supabase as any).from('customers').update(dbUpdates).eq('id', id);
    if (error) { toast.error('Customer update nahi hua: ' + error.message); return; }
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // ─── Product CRUD ───
  const addProduct = useCallback(async (prod: Omit<Product, 'id'>) => {
    const row = productToDb(prod as any);
    const { data, error } = await (supabase as any).from('products').insert(row).select().single();
    if (error) { toast.error('Product add nahi ho paya: ' + error.message); return; }
    setProducts(prev => [...prev, dbToProduct(data)]);
  }, []);
  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.hsn !== undefined) dbUpdates.hsn_code = updates.hsn;
    if (updates.price !== undefined) dbUpdates.mrp = updates.price;
    if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.gstRate !== undefined) dbUpdates.gst_rate = updates.gstRate;
    if (updates.stock !== undefined) dbUpdates.current_stock = updates.stock;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.minStock !== undefined) dbUpdates.min_stock_level = updates.minStock;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
    if (updates.storageLocation !== undefined) dbUpdates.storage_location = updates.storageLocation;
    // Carton/Loose fields
    if (updates.sellingUnitType !== undefined) dbUpdates.selling_unit_type = updates.sellingUnitType;
    if (updates.cartonUnitName !== undefined) dbUpdates.carton_unit_name = updates.cartonUnitName;
    if (updates.piecesPerCarton !== undefined) dbUpdates.pieces_per_carton = updates.piecesPerCarton;
    if (updates.cartonMrp !== undefined) dbUpdates.carton_mrp = updates.cartonMrp;
    if (updates.cartonSellingPrice !== undefined) dbUpdates.carton_selling_price = updates.cartonSellingPrice;
    if (updates.cartonPurchasePrice !== undefined) dbUpdates.carton_purchase_price = updates.cartonPurchasePrice;
    if (updates.cartonBarcode !== undefined) dbUpdates.carton_barcode = updates.cartonBarcode;
    const { error } = await (supabase as any).from('products').update(dbUpdates).eq('id', id);
    if (error) { toast.error('Product update nahi hua: ' + error.message); return; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);
  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from('products').delete().eq('id', id);
    if (error) { toast.error('Product delete nahi hua: ' + error.message); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  // ─── Invoice CRUD ───
  const addInvoice = useCallback(async (inv: Omit<Invoice, 'id'>) => {
    const invId = inv.invoiceNo || crypto.randomUUID();
    const invWithId = { ...inv, id: invId };
    const invRow = invoiceToDb(invWithId);
    const { error: invErr } = await (supabase as any).from('invoices').insert(invRow);
    if (invErr) { toast.error('Invoice save nahi ho payi: ' + invErr.message); return; }
    // Save items
    if (inv.items.length > 0) {
      const itemRows = inv.items.map(item => invoiceItemToDb(item, invId, inv.userId));
      const { error: itemErr } = await (supabase as any).from('invoice_items').insert(itemRows);
      if (itemErr) console.error('Invoice items save error:', itemErr);
    }
    // Save other charges if present
    if (inv.otherCharges && inv.otherCharges.length > 0) {
      const chargeRows = inv.otherCharges.map(ch => ({
        invoice_id: invId, user_id: inv.userId,
        charge_name: ch.chargeName, amount: ch.amount,
        with_gst: ch.withGst, gst_rate: ch.gstRate,
        gst_amount: ch.gstAmount, total_amount: ch.totalAmount,
      }));
      const { error: chErr } = await (supabase as any).from('invoice_charges').insert(chargeRows);
      if (chErr) console.error('Invoice charges save error:', chErr);
    }
    // Update product stock
    for (const item of inv.items) {
      if (item.productId) {
        await (supabase as any).from('products').update({
          current_stock: (supabase as any).rpc ? undefined : undefined
        }).eq('id', item.productId);
        // Decrement stock
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.qty);
          await (supabase as any).from('products').update({ current_stock: newStock }).eq('id', item.productId);
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, stock: newStock } : p));
        }
      }
    }
    const newInv: Invoice = { ...inv, id: invId };
    setInvoices(prev => [...prev, newInv]);
    toast.success('Invoice saved successfully!');
  }, [products]);

  const updateInvoiceStatus = useCallback(async (id: string, status: Invoice['status']) => {
    const paymentStatus = status === 'Pending' ? 'Unpaid' : status;
    const { error } = await (supabase as any).from('invoices').update({ payment_status: paymentStatus }).eq('id', id);
    if (error) { toast.error('Status update nahi hua'); return; }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    await (supabase as any).from('invoice_items').delete().eq('invoice_id', id);
    const { error } = await (supabase as any).from('invoices').delete().eq('id', id);
    if (error) { toast.error('Invoice delete nahi hui'); return; }
    setPayments(prev => prev.filter(p => p.invoiceId !== id));
    setInvoices(prev => prev.filter(i => i.id !== id));
  }, []);

  // ─── Payment CRUD ───
  const addPayment = useCallback(async (pay: Omit<Payment, 'id'>) => {
    const row = paymentToDb(pay as any);
    const { data, error } = await (supabase as any).from('payments').insert(row).select().single();
    if (error) { toast.error('Payment save nahi ho payi: ' + error.message); return; }
    const newPay = dbToPayment(data);
    setPayments(prev => [...prev, newPay]);
    // Update invoice payment status
    if (pay.invoiceId) {
      const inv = invoices.find(i => i.id === pay.invoiceId);
      if (inv) {
        const totalPaid = (inv.amountPaid || 0) + pay.amount;
        const newStatus = totalPaid >= inv.grandTotal ? 'Paid' : 'Partial';
        await (supabase as any).from('invoices').update({
          amount_received: totalPaid,
          balance_due: inv.grandTotal - totalPaid,
          payment_status: newStatus,
        }).eq('id', pay.invoiceId);
        setInvoices(prev => prev.map(i => i.id === pay.invoiceId ? { ...i, amountPaid: totalPaid, status: newStatus as any } : i));
      }
    }
    // Auto-create bank ledger entry for non-cash payments
    if (pay.mode !== 'Cash') {
      // Find bank account id from the payment row
      const bankAccId = (row as any).bank_account_id;
      if (bankAccId) {
        const partyName = pay.customerId
          ? customers.find(c => c.id === pay.customerId)?.name || 'Customer'
          : pay.supplierId
          ? suppliers.find(s => s.id === pay.supplierId)?.name || 'Supplier'
          : 'Party';
        
        if (pay.supplierId) {
          await createSupplierPaymentLedger({
            userId: pay.userId, bankAccountId: bankAccId,
            paymentDate: pay.date, paymentId: newPay.id,
            receiptNo: pay.receiptNo, amount: pay.amount,
            supplierName: partyName, purchaseNo: pay.purchaseNo,
          });
        } else {
          await createPaymentReceivedLedger({
            userId: pay.userId, bankAccountId: bankAccId,
            paymentDate: pay.date, paymentId: newPay.id,
            receiptNo: pay.receiptNo, amount: pay.amount,
            partyName, invoiceNo: pay.invoiceNo,
          });
        }
      }
    }
  }, [invoices, customers, suppliers]);

  const deletePayment = useCallback(async (id: string) => {
    const pay = payments.find(p => p.id === id);
    const { error } = await (supabase as any).from('payments').delete().eq('id', id);
    if (error) { toast.error('Payment delete nahi hui'); return; }
    if (pay?.invoiceId) {
      const inv = invoices.find(i => i.id === pay.invoiceId);
      if (inv) {
        const totalPaid = Math.max(0, (inv.amountPaid || 0) - pay.amount);
        const newStatus = totalPaid <= 0 ? 'Unpaid' : totalPaid >= inv.grandTotal ? 'Paid' : 'Partial';
        await (supabase as any).from('invoices').update({
          amount_received: totalPaid,
          balance_due: inv.grandTotal - totalPaid,
          payment_status: newStatus === 'Unpaid' ? 'Unpaid' : newStatus,
        }).eq('id', pay.invoiceId);
        setInvoices(prev => prev.map(i => i.id === pay.invoiceId ? {
          ...i, amountPaid: totalPaid,
          status: (newStatus === 'Unpaid' ? 'Pending' : newStatus) as any,
        } : i));
      }
    }
    setPayments(prev => prev.filter(p => p.id !== id));
  }, [payments, invoices]);

  const getNextReceiptNo = useCallback(() => {
    const year = new Date().getFullYear();
    const count = payments.filter(p => p.receiptNo?.startsWith(`RCPT-${year}`)).length;
    return `RCPT-${year}-${String(count + 1).padStart(4, '0')}`;
  }, [payments]);

  const getInvoiceStatus = useCallback((invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return { status: 'Pending' as const, received: 0, balance: 0 };
    const paymentsTotal = payments.filter(p => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0);
    const balance = inv.grandTotal - paymentsTotal;
    const status: 'Paid' | 'Partial' | 'Pending' = balance <= 0 ? 'Paid' : paymentsTotal > 0 ? 'Partial' : 'Pending';
    return { status, received: paymentsTotal, balance: Math.max(0, balance) };
  }, [invoices, payments]);

  // ─── Supplier CRUD ───
  const addSupplier = useCallback(async (sup: Omit<Supplier, 'id'>) => {
    const row = supplierToDb(sup as any);
    const { data, error } = await (supabase as any).from('suppliers').insert(row).select().single();
    if (error) { toast.error('Supplier add nahi ho paya: ' + error.message); return; }
    setSuppliers(prev => [...prev, dbToSupplier(data)]);
  }, []);
  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.gstNumber !== undefined) dbUpdates.gst_number = updates.gstNumber;
    if (updates.address !== undefined) dbUpdates.street = updates.address;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.stateCode !== undefined) dbUpdates.state_code = updates.stateCode;
    const { error } = await (supabase as any).from('suppliers').update(dbUpdates).eq('id', id);
    if (error) { toast.error('Supplier update nahi hua'); return; }
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  // ─── Purchase CRUD ───
  const addPurchase = useCallback(async (pur: Omit<Purchase, 'id'>) => {
    const purId = crypto.randomUUID();
    const purRow = purchaseToDb({ ...pur, id: purId });
    const { error: purErr } = await (supabase as any).from('purchases').insert(purRow);
    if (purErr) { toast.error('Purchase save nahi ho payi: ' + purErr.message); return; }
    if (pur.items.length > 0) {
      const itemRows = pur.items.map(item => purchaseItemToDb(item, purId, pur.userId));
      await (supabase as any).from('purchase_items').insert(itemRows);
    }
    // Update product stock (increase)
    for (const item of pur.items) {
      if (item.productId) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const newStock = prod.stock + item.qty;
          await (supabase as any).from('products').update({ current_stock: newStock }).eq('id', item.productId);
          setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, stock: newStock } : p));
        }
      }
    }
    setPurchases(prev => [...prev, { ...pur, id: purId }]);
  }, [products]);

  const updatePurchase = useCallback(async (id: string, updates: Partial<Purchase>) => {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.payment_status = updates.status;
    if (updates.amountPaid !== undefined) dbUpdates.amount_paid = updates.amountPaid;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (Object.keys(dbUpdates).length) {
      await (supabase as any).from('purchases').update(dbUpdates).eq('id', id);
    }
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deletePurchase = useCallback(async (id: string) => {
    await (supabase as any).from('purchase_items').delete().eq('purchase_id', id);
    await (supabase as any).from('purchases').delete().eq('id', id);
    setPurchases(prev => prev.filter(p => p.id !== id));
  }, []);

  // ─── Credit Note CRUD ───
  const addCreditNote = useCallback(async (cn: Omit<CreditNote, 'id'>) => {
    const cnId = crypto.randomUUID();
    const cnRow = creditNoteToDb({ ...cn, id: cnId });
    const { error: cnErr } = await (supabase as any).from('credit_notes').insert(cnRow);
    if (cnErr) { toast.error('Credit Note save nahi ho payi: ' + cnErr.message); return; }
    if (cn.items.length > 0) {
      const itemRows = cn.items.map(item => creditNoteItemToDb(item, cnId, cn.userId));
      await (supabase as any).from('credit_note_items').insert(itemRows);
    }
    if (cn.goodsReturned) {
      for (const item of cn.items) {
        if (item.productId) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            const newStock = prod.stock + item.qty;
            await (supabase as any).from('products').update({ current_stock: newStock }).eq('id', item.productId);
            setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, stock: newStock } : p));
          }
        }
      }
    }
    setCreditNotes(prev => [...prev, { ...cn, id: cnId }]);
  }, [products]);

  const updateCreditNote = useCallback(async (id: string, updates: Partial<CreditNote>) => {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (Object.keys(dbUpdates).length) {
      await (supabase as any).from('credit_notes').update(dbUpdates).eq('id', id);
    }
    setCreditNotes(prev => prev.map(cn => cn.id === id ? { ...cn, ...updates } : cn));
  }, []);

  // ─── Debit Note CRUD ───
  const addDebitNote = useCallback(async (dn: Omit<DebitNote, 'id'>) => {
    const row = debitNoteToDb(dn as any);
    const { data, error } = await (supabase as any).from('debit_notes').insert(row).select().single();
    if (error) { toast.error('Debit Note save nahi ho payi: ' + error.message); return; }
    setDebitNotes(prev => [...prev, dbToDebitNote(data)]);
  }, []);

  const updateDebitNote = useCallback(async (id: string, updates: Partial<DebitNote>) => {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (Object.keys(dbUpdates).length) {
      await (supabase as any).from('debit_notes').update(dbUpdates).eq('id', id);
    }
    setDebitNotes(prev => prev.map(dn => dn.id === id ? { ...dn, ...updates } : dn));
  }, []);

  // ─── Bank Account CRUD ───
  const addBankAccount = useCallback(async (acc: Omit<BankAccount, 'id'>) => {
    if (acc.isDefault) {
      await (supabase as any).from('bank_accounts').update({ is_default: false }).eq('user_id', acc.userId);
    }
    const row = bankAccountToDb(acc as any);
    const { data, error } = await (supabase as any).from('bank_accounts').insert(row).select().single();
    if (error) { toast.error('Bank account add nahi ho paya: ' + error.message); return; }
    setBankAccounts(prev => {
      const updated = acc.isDefault ? prev.map(a => a.userId === acc.userId ? { ...a, isDefault: false } : a) : prev;
      return [...updated, dbToBankAccount(data)];
    });
  }, []);

  const updateBankAccount = useCallback(async (id: string, updates: Partial<BankAccount>) => {
    const dbUpdates: any = {};
    if (updates.bankName !== undefined) dbUpdates.bank_name = updates.bankName;
    if (updates.accountHolderName !== undefined) dbUpdates.account_holder = updates.accountHolderName;
    if (updates.accountNumber !== undefined) dbUpdates.account_number = updates.accountNumber;
    if (updates.ifscCode !== undefined) dbUpdates.ifsc_code = updates.ifscCode;
    if (updates.branchName !== undefined) dbUpdates.branch = updates.branchName;
    if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType;
    if (updates.upiId !== undefined) dbUpdates.upi_id = updates.upiId;
    if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;
    if (updates.displayLabel !== undefined) dbUpdates.display_label = updates.displayLabel;
    const { error } = await (supabase as any).from('bank_accounts').update(dbUpdates).eq('id', id);
    if (error) { toast.error('Bank account update nahi hua'); return; }
    setBankAccounts(prev => {
      let result = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      if (updates.isDefault) {
        const acc = result.find(a => a.id === id);
        if (acc) result = result.map(a => a.userId === acc.userId && a.id !== id ? { ...a, isDefault: false } : a);
      }
      return result;
    });
  }, []);

  const deleteBankAccount = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from('bank_accounts').delete().eq('id', id);
    if (error) { toast.error('Bank account delete nahi hua'); return; }
    setBankAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  const setDefaultBankAccount = useCallback(async (id: string) => {
    const acc = bankAccounts.find(a => a.id === id);
    if (!acc) return;
    await (supabase as any).from('bank_accounts').update({ is_default: false }).eq('user_id', acc.userId);
    await (supabase as any).from('bank_accounts').update({ is_default: true }).eq('id', id);
    setBankAccounts(prev => prev.map(a => a.userId === acc.userId ? { ...a, isDefault: a.id === id } : a));
  }, [bankAccounts]);

  // ─── Password reset (no-op for Supabase auth) ───
  const resetPassword = useCallback((_method: 'master' | 'old', _params: any) => {
    return { success: false, message: 'Password reset is handled via email.' };
  }, []);

  return (
    <AppContext.Provider value={{
      session, users, employees, customers, products, invoices, payments, suppliers, purchases, creditNotes, debitNotes, bankAccounts, loading,
      logout, getCurrentUser, getCurrentEmployee, getOwnerUserId,
      addUser, updateUser, renewSubscription,
      addEmployee, updateEmployee, deleteEmployee,
      addCustomer, updateCustomer,
      addProduct, updateProduct, deleteProduct,
      addInvoice, updateInvoiceStatus, deleteInvoice,
      addPayment, deletePayment, getNextReceiptNo, getInvoiceStatus,
      addSupplier, updateSupplier,
      addPurchase, updatePurchase, deletePurchase,
      addCreditNote, updateCreditNote,
      addDebitNote, updateDebitNote,
      resetPassword,
      addBankAccount, updateBankAccount, deleteBankAccount, setDefaultBankAccount,
      refreshData,
    }}>
      {children}
    </AppContext.Provider>
  );
}
