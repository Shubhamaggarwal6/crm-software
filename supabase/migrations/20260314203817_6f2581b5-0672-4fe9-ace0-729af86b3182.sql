
-- Step 1: Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'owner', 'employee')),
  full_name text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create owner_profiles table
CREATE TABLE public.owner_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  firm_name text NOT NULL,
  gst_number text,
  address text,
  city text,
  state text,
  state_code text,
  pin_code text,
  plan text DEFAULT 'Basic' CHECK (plan IN ('Basic', 'Pro', 'Enterprise')),
  max_employees integer DEFAULT 2,
  sub_start date,
  sub_end date,
  active boolean DEFAULT true,
  invoice_prefix text DEFAULT 'INV',
  show_stock_to_employees boolean DEFAULT false,
  terms_and_conditions text,
  created_by_admin uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create employees table
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  phone text,
  email text,
  active boolean DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{"createInvoice":false,"addCustomer":false,"addProduct":false,"viewReports":false,"viewCustomerProfile":false,"editInvoiceStatus":false,"addPayment":false,"viewStock":false,"viewPurchases":false}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_label text,
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  account_number text NOT NULL,
  ifsc_code text NOT NULL,
  branch text,
  account_type text DEFAULT 'Current',
  upi_id text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Step 5: Create customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  alternate_phone text,
  email text,
  gst_number text,
  pan_number text,
  customer_type text DEFAULT 'Retail',
  street text,
  area text,
  city text,
  pin_code text,
  state text,
  state_code text,
  opening_balance numeric DEFAULT 0,
  credit_limit numeric DEFAULT 0,
  payment_terms text,
  customer_since date DEFAULT current_date,
  notes text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 6: Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  hsn_code text,
  category text,
  brand text,
  description text,
  unit text DEFAULT 'Pcs',
  barcode text,
  mrp numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  purchase_price numeric DEFAULT 0,
  gst_rate numeric DEFAULT 18,
  cess_rate numeric DEFAULT 0,
  current_stock numeric DEFAULT 0,
  min_stock_level numeric DEFAULT 0,
  storage_location text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 7: Create suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  alternate_phone text,
  email text,
  gst_number text,
  pan_number text,
  supplier_code text,
  street text,
  city text,
  pin_code text,
  state text,
  state_code text,
  bank_name text,
  account_number text,
  ifsc_code text,
  branch text,
  opening_balance numeric DEFAULT 0,
  payment_terms text,
  supplier_since date,
  category text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Step 8: Create invoices table
CREATE TABLE public.invoices (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_date date NOT NULL DEFAULT current_date,
  customer_id uuid REFERENCES public.customers(id),
  customer_name text NOT NULL,
  customer_gst text,
  customer_state text,
  customer_state_code text,
  customer_address text,
  customer_phone text,
  vehicle_no text,
  eway_bill text,
  supply_type text,
  place_of_supply text,
  subtotal numeric DEFAULT 0,
  cgst_total numeric DEFAULT 0,
  sgst_total numeric DEFAULT 0,
  igst_total numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  round_off numeric DEFAULT 0,
  total numeric DEFAULT 0,
  amount_received numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  payment_status text DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Partial', 'Unpaid', 'Cancelled')),
  notes text,
  is_inter_state boolean DEFAULT false,
  created_by_id uuid REFERENCES public.profiles(id),
  created_by_employee_id uuid REFERENCES public.employees(id),
  created_by_name text,
  created_by_role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 9: Create invoice_items table
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  hsn_code text,
  quantity numeric NOT NULL,
  unit text,
  mrp numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  taxable_amount numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  igst_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0
);

-- Step 10: Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  invoice_id text REFERENCES public.invoices(id),
  purchase_id uuid,
  receipt_no text NOT NULL,
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL,
  payment_mode text NOT NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  bank_account_label text,
  bank_name text,
  reference_number text,
  cheque_number text,
  cheque_date date,
  drawee_bank text,
  utr_number text,
  transfer_date date,
  received_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Step 11: Create purchases table
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_no text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id),
  supplier_name text,
  supplier_gst text,
  supplier_invoice_no text,
  invoice_date date NOT NULL,
  due_date date,
  place_of_supply text,
  supply_type text,
  is_inter_state boolean DEFAULT false,
  subtotal numeric DEFAULT 0,
  cgst_total numeric DEFAULT 0,
  sgst_total numeric DEFAULT 0,
  igst_total numeric DEFAULT 0,
  discount_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  payment_status text DEFAULT 'Unpaid',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Step 12: Create purchase_items table
CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  hsn_code text,
  quantity numeric NOT NULL,
  unit text,
  purchase_rate numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  taxable_amount numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  igst_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0
);

-- Step 13: Create credit_notes table
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_no text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  invoice_id text REFERENCES public.invoices(id),
  invoice_no text,
  customer_name text,
  credit_note_date date NOT NULL,
  reason text,
  subtotal numeric DEFAULT 0,
  cgst_total numeric DEFAULT 0,
  sgst_total numeric DEFAULT 0,
  igst_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  restock boolean DEFAULT false,
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

-- Step 14: Create credit_note_items table
CREATE TABLE public.credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text,
  hsn_code text,
  quantity numeric,
  unit text,
  rate numeric,
  taxable_amount numeric,
  gst_rate numeric,
  cgst_amount numeric,
  sgst_amount numeric,
  igst_amount numeric,
  total_amount numeric
);

-- Step 15: Create debit_notes table
CREATE TABLE public.debit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_no text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  debit_note_type text CHECK (debit_note_type IN ('customer', 'supplier')),
  customer_id uuid REFERENCES public.customers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  customer_name text,
  supplier_name text,
  reference_invoice text,
  debit_note_date date NOT NULL,
  reason text,
  description text,
  amount numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  cgst_total numeric DEFAULT 0,
  sgst_total numeric DEFAULT 0,
  igst_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

-- Step 16: Create settings table
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_prefix text DEFAULT 'INV',
  financial_year_start text DEFAULT 'April',
  default_terms text,
  show_bank_on_invoice boolean DEFAULT true,
  show_terms_on_invoice boolean DEFAULT true,
  show_stock_to_employees boolean DEFAULT false,
  invoice_copy_label text DEFAULT 'Original',
  show_eway_field boolean DEFAULT false,
  logo_url text,
  signature_url text,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 17: Create sequence_counters table
CREATE TABLE public.sequence_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  counter_type text NOT NULL,
  current_value integer DEFAULT 0,
  financial_year text NOT NULL,
  UNIQUE(user_id, counter_type, financial_year)
);

-- Step 18: Create stock_movements table
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return', 'opening')),
  quantity numeric NOT NULL,
  reference_id text,
  reference_type text,
  balance_after numeric,
  movement_date date DEFAULT current_date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Step 19: Create admin_settings table
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_key text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Step 20: Insert default admin settings
INSERT INTO public.admin_settings (master_key) VALUES ('BILLSAATHI2024');

-- Step 21: Create security definer function to check roles (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'super_admin'
  )
$$;

-- Step 22: Create function to get owner_id for employees
CREATE OR REPLACE FUNCTION public.get_owner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM public.employees WHERE id = _user_id LIMIT 1
$$;

-- Step 23: Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'owner'), NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 24: Enable RLS on all tables
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

-- Step 25: RLS for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admin can view all profiles" ON public.profiles FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin can manage all profiles" ON public.profiles FOR ALL USING (public.is_super_admin(auth.uid()));

-- Step 26: RLS for owner_profiles
CREATE POLICY "Owner can view own firm" ON public.owner_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owner can update own firm" ON public.owner_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Owner can insert own firm" ON public.owner_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Super admin can manage all owner profiles" ON public.owner_profiles FOR ALL USING (public.is_super_admin(auth.uid()));

-- Step 27: RLS for employees
CREATE POLICY "Owner can manage own employees" ON public.employees FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Super admin can view all employees" ON public.employees FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Step 28: RLS for business data tables (pattern: owner sees own, super_admin sees all)
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

-- settings
CREATE POLICY "Owner select settings" ON public.settings FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert settings" ON public.settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update settings" ON public.settings FOR UPDATE USING (user_id = auth.uid());

-- sequence_counters
CREATE POLICY "Owner select sequence_counters" ON public.sequence_counters FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner insert sequence_counters" ON public.sequence_counters FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update sequence_counters" ON public.sequence_counters FOR UPDATE USING (user_id = auth.uid());

-- stock_movements
CREATE POLICY "Owner select stock_movements" ON public.stock_movements FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (user_id = auth.uid());

-- admin_settings (super admin only)
CREATE POLICY "Super admin can manage admin_settings" ON public.admin_settings FOR ALL USING (public.is_super_admin(auth.uid()));

-- Step 29: Create get_next_sequence function
CREATE OR REPLACE FUNCTION public.get_next_sequence(p_user_id uuid, p_type text, p_fy text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val integer;
BEGIN
  INSERT INTO sequence_counters (user_id, counter_type, financial_year, current_value)
  VALUES (p_user_id, p_type, p_fy, 1)
  ON CONFLICT (user_id, counter_type, financial_year)
  DO UPDATE SET current_value = sequence_counters.current_value + 1
  RETURNING current_value INTO next_val;
  RETURN next_val;
END;
$$;
