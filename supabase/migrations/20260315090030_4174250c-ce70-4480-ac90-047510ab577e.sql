
-- Add new columns to settings table for signatures and QR
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS signature_1_url text,
  ADD COLUMN IF NOT EXISTS signature_1_label text,
  ADD COLUMN IF NOT EXISTS signature_2_url text,
  ADD COLUMN IF NOT EXISTS signature_2_label text,
  ADD COLUMN IF NOT EXISTS qr_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS qr_value text,
  ADD COLUMN IF NOT EXISTS show_qr_on_invoice boolean DEFAULT false;

-- Add invoice-level discount columns to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_discount_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_discount_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS invoice_discount_before_tax boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS other_charges_total numeric DEFAULT 0;

-- Add party_type to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS party_type text[] DEFAULT ARRAY['Customer'];

-- Partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY REFERENCES public.profiles(id),
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  role_label text,
  access_level text DEFAULT 'full',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages partners" ON public.partners FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Partner views self" ON public.partners FOR SELECT USING (id = auth.uid());

-- Delivery Challans
CREATE TABLE IF NOT EXISTS public.delivery_challans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_no text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  party_id uuid REFERENCES public.customers(id),
  party_name text,
  challan_date date NOT NULL,
  challan_type text,
  vehicle_no text,
  driver_name text,
  delivery_address text,
  include_gst boolean DEFAULT false,
  subtotal numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  status text DEFAULT 'Open',
  converted_invoice_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.delivery_challans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select delivery_challans" ON public.delivery_challans FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert delivery_challans" ON public.delivery_challans FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update delivery_challans" ON public.delivery_challans FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete delivery_challans" ON public.delivery_challans FOR DELETE USING (user_id = auth.uid());

-- Delivery Challan Items
CREATE TABLE IF NOT EXISTS public.delivery_challan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_id uuid NOT NULL REFERENCES public.delivery_challans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  hsn_code text,
  quantity numeric NOT NULL,
  unit text,
  rate numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0
);
ALTER TABLE public.delivery_challan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select dc_items" ON public.delivery_challan_items FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert dc_items" ON public.delivery_challan_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update dc_items" ON public.delivery_challan_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete dc_items" ON public.delivery_challan_items FOR DELETE USING (user_id = auth.uid());

-- Sales Returns
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  original_invoice_id text REFERENCES public.invoices(id),
  party_id uuid REFERENCES public.customers(id),
  party_name text,
  return_date date NOT NULL,
  reason text,
  subtotal numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  credit_note_id uuid,
  restock boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select sales_returns" ON public.sales_returns FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert sales_returns" ON public.sales_returns FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update sales_returns" ON public.sales_returns FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete sales_returns" ON public.sales_returns FOR DELETE USING (user_id = auth.uid());

-- Sales Return Items
CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  hsn_code text,
  quantity numeric NOT NULL,
  unit text,
  rate numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  igst_amount numeric DEFAULT 0,
  taxable_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0
);
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select sr_items" ON public.sales_return_items FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert sr_items" ON public.sales_return_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update sr_items" ON public.sales_return_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete sr_items" ON public.sales_return_items FOR DELETE USING (user_id = auth.uid());

-- Purchase Returns
CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  original_purchase_id uuid REFERENCES public.purchases(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  supplier_name text,
  return_date date NOT NULL,
  reason text,
  subtotal numeric DEFAULT 0,
  tax_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  debit_note_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select purchase_returns" ON public.purchase_returns FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert purchase_returns" ON public.purchase_returns FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update purchase_returns" ON public.purchase_returns FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete purchase_returns" ON public.purchase_returns FOR DELETE USING (user_id = auth.uid());

-- Purchase Return Items
CREATE TABLE IF NOT EXISTS public.purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  hsn_code text,
  quantity numeric NOT NULL,
  unit text,
  rate numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  igst_amount numeric DEFAULT 0,
  taxable_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0
);
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select pr_items" ON public.purchase_return_items FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert pr_items" ON public.purchase_return_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update pr_items" ON public.purchase_return_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete pr_items" ON public.purchase_return_items FOR DELETE USING (user_id = auth.uid());

-- Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  description text,
  is_gst_applicable boolean DEFAULT false,
  default_gst_rate numeric DEFAULT 18,
  is_system_category boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select expense_categories" ON public.expense_categories FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert expense_categories" ON public.expense_categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update expense_categories" ON public.expense_categories FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete expense_categories" ON public.expense_categories FOR DELETE USING (user_id = auth.uid());

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  expense_date date NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id),
  category_name text,
  vendor_name text,
  vendor_id uuid REFERENCES public.customers(id),
  amount numeric NOT NULL,
  with_gst boolean DEFAULT false,
  gst_rate numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  payment_mode text,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  reference_number text,
  bill_number text,
  description text,
  is_recurring boolean DEFAULT false,
  recurring_frequency text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select expenses" ON public.expenses FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert expenses" ON public.expenses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update expenses" ON public.expenses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete expenses" ON public.expenses FOR DELETE USING (user_id = auth.uid());

-- Salary Structures
CREATE TABLE IF NOT EXISTS public.salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  salary_type text NOT NULL,
  basic_amount numeric NOT NULL,
  allowances jsonb DEFAULT '[]',
  gross_salary numeric NOT NULL,
  effective_from date NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select salary_structures" ON public.salary_structures FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert salary_structures" ON public.salary_structures FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update salary_structures" ON public.salary_structures FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete salary_structures" ON public.salary_structures FOR DELETE USING (user_id = auth.uid());

-- Salary Payments
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  employee_name text,
  month_year text NOT NULL,
  gross_salary numeric,
  advance_deduction numeric DEFAULT 0,
  other_deduction numeric DEFAULT 0,
  net_paid numeric NOT NULL,
  payment_date date NOT NULL,
  payment_mode text,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select salary_payments" ON public.salary_payments FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert salary_payments" ON public.salary_payments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update salary_payments" ON public.salary_payments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete salary_payments" ON public.salary_payments FOR DELETE USING (user_id = auth.uid());

-- Withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  person_id uuid REFERENCES public.profiles(id),
  person_name text NOT NULL,
  person_type text NOT NULL,
  withdrawal_date date NOT NULL,
  amount numeric NOT NULL,
  purpose text,
  payment_mode text,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select withdrawals" ON public.withdrawals FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update withdrawals" ON public.withdrawals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete withdrawals" ON public.withdrawals FOR DELETE USING (user_id = auth.uid());

-- Bank Ledger Entries
CREATE TABLE IF NOT EXISTS public.bank_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  entry_date date NOT NULL,
  entry_type text NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL,
  reference_id text,
  reference_type text,
  reference_number text,
  is_reconciled boolean DEFAULT false,
  is_manual boolean DEFAULT false,
  running_balance numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bank_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select bank_ledger_entries" ON public.bank_ledger_entries FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert bank_ledger_entries" ON public.bank_ledger_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update bank_ledger_entries" ON public.bank_ledger_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete bank_ledger_entries" ON public.bank_ledger_entries FOR DELETE USING (user_id = auth.uid());

-- Invoice Charges
CREATE TABLE IF NOT EXISTS public.invoice_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  charge_name text NOT NULL,
  amount numeric NOT NULL,
  with_gst boolean DEFAULT false,
  gst_rate numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  applied_before_tax boolean DEFAULT false
);
ALTER TABLE public.invoice_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select invoice_charges" ON public.invoice_charges FOR SELECT USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert invoice_charges" ON public.invoice_charges FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update invoice_charges" ON public.invoice_charges FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete invoice_charges" ON public.invoice_charges FOR DELETE USING (user_id = auth.uid());

-- Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  actor_id text NOT NULL,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action_type text NOT NULL,
  module text NOT NULL,
  reference_id text,
  reference_number text,
  description text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select activity_logs" ON public.activity_logs FOR SELECT USING (owner_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "Owner insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Add opening_balance to bank_accounts
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance_date date;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_ledger_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
