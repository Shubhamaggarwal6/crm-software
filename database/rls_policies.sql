-- BillSaathi Row Level Security Policies
-- Run AFTER schema.sql and functions.sql

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES
-- ============================================
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admin can view all profiles" ON public.profiles FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin can manage all profiles" ON public.profiles FOR ALL USING (public.is_super_admin(auth.uid()));

-- ============================================
-- OWNER_PROFILES
-- ============================================
CREATE POLICY "Owner can view own firm" ON public.owner_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owner can update own firm" ON public.owner_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Owner can insert own firm" ON public.owner_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Super admin can manage all owner profiles" ON public.owner_profiles FOR ALL USING (public.is_super_admin(auth.uid()));

-- ============================================
-- EMPLOYEES
-- ============================================
CREATE POLICY "Owner can manage own employees" ON public.employees FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Super admin can view all employees" ON public.employees FOR SELECT USING (public.is_super_admin(auth.uid()));

-- ============================================
-- BUSINESS DATA TABLES (owner sees own, super_admin sees all)
-- Pattern repeated for: bank_accounts, customers, products, invoices,
-- invoice_items, payments, suppliers, purchases, purchase_items,
-- credit_notes, credit_note_items, debit_notes
-- ============================================

-- bank_accounts
CREATE POLICY "Owner select bank_accounts" ON public.bank_accounts FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert bank_accounts" ON public.bank_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update bank_accounts" ON public.bank_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete bank_accounts" ON public.bank_accounts FOR DELETE USING (user_id = auth.uid());

-- customers
CREATE POLICY "Owner select customers" ON public.customers FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert customers" ON public.customers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update customers" ON public.customers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete customers" ON public.customers FOR DELETE USING (user_id = auth.uid());

-- products
CREATE POLICY "Owner select products" ON public.products FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert products" ON public.products FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update products" ON public.products FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete products" ON public.products FOR DELETE USING (user_id = auth.uid());

-- invoices
CREATE POLICY "Owner select invoices" ON public.invoices FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert invoices" ON public.invoices FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update invoices" ON public.invoices FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete invoices" ON public.invoices FOR DELETE USING (user_id = auth.uid());

-- invoice_items
CREATE POLICY "Owner select invoice_items" ON public.invoice_items FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update invoice_items" ON public.invoice_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete invoice_items" ON public.invoice_items FOR DELETE USING (user_id = auth.uid());

-- payments
CREATE POLICY "Owner select payments" ON public.payments FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert payments" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update payments" ON public.payments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete payments" ON public.payments FOR DELETE USING (user_id = auth.uid());

-- suppliers
CREATE POLICY "Owner select suppliers" ON public.suppliers FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update suppliers" ON public.suppliers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete suppliers" ON public.suppliers FOR DELETE USING (user_id = auth.uid());

-- purchases
CREATE POLICY "Owner select purchases" ON public.purchases FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert purchases" ON public.purchases FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update purchases" ON public.purchases FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete purchases" ON public.purchases FOR DELETE USING (user_id = auth.uid());

-- purchase_items
CREATE POLICY "Owner select purchase_items" ON public.purchase_items FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert purchase_items" ON public.purchase_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update purchase_items" ON public.purchase_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete purchase_items" ON public.purchase_items FOR DELETE USING (user_id = auth.uid());

-- credit_notes
CREATE POLICY "Owner select credit_notes" ON public.credit_notes FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert credit_notes" ON public.credit_notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update credit_notes" ON public.credit_notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete credit_notes" ON public.credit_notes FOR DELETE USING (user_id = auth.uid());

-- credit_note_items
CREATE POLICY "Owner select credit_note_items" ON public.credit_note_items FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert credit_note_items" ON public.credit_note_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update credit_note_items" ON public.credit_note_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete credit_note_items" ON public.credit_note_items FOR DELETE USING (user_id = auth.uid());

-- debit_notes
CREATE POLICY "Owner select debit_notes" ON public.debit_notes FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert debit_notes" ON public.debit_notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update debit_notes" ON public.debit_notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete debit_notes" ON public.debit_notes FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- SETTINGS (no delete policy)
-- ============================================
CREATE POLICY "Owner select settings" ON public.settings FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert settings" ON public.settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update settings" ON public.settings FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- SEQUENCE_COUNTERS (no delete policy)
-- ============================================
CREATE POLICY "Owner select sequence_counters" ON public.sequence_counters FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner insert sequence_counters" ON public.sequence_counters FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update sequence_counters" ON public.sequence_counters FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- STOCK_MOVEMENTS (insert and select only)
-- ============================================
CREATE POLICY "Owner select stock_movements" ON public.stock_movements FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- ADMIN_SETTINGS (super admin only)
-- ============================================
CREATE POLICY "Super admin can manage admin_settings" ON public.admin_settings FOR ALL USING (public.is_super_admin(auth.uid()));
