-- BillSaathi Multi-Tenant SaaS Database Schema
-- Run this in order after creating a fresh Supabase project

-- ============================================
-- TABLE: profiles
-- ============================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'owner', 'employee')),
  full_name text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLE: owner_profiles
-- ============================================
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

-- ============================================
-- TABLE: employees
-- ============================================
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

-- ============================================
-- TABLE: bank_accounts
-- ============================================
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

-- ============================================
-- TABLE: customers
-- ============================================
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

-- ============================================
-- TABLE: products
-- ============================================
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

-- ============================================
-- TABLE: suppliers
-- ============================================
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

-- ============================================
-- TABLE: invoices
-- ============================================
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

-- ============================================
-- TABLE: invoice_items
-- ============================================
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

-- ============================================
-- TABLE: payments
-- ============================================
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

-- ============================================
-- TABLE: purchases
-- ============================================
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

-- ============================================
-- TABLE: purchase_items
-- ============================================
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

-- ============================================
-- TABLE: credit_notes
-- ============================================
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

-- ============================================
-- TABLE: credit_note_items
-- ============================================
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

-- ============================================
-- TABLE: debit_notes
-- ============================================
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

-- ============================================
-- TABLE: settings
-- ============================================
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

-- ============================================
-- TABLE: sequence_counters
-- ============================================
CREATE TABLE public.sequence_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  counter_type text NOT NULL,
  current_value integer DEFAULT 0,
  financial_year text NOT NULL,
  UNIQUE(user_id, counter_type, financial_year)
);

-- ============================================
-- TABLE: stock_movements
-- ============================================
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

-- ============================================
-- TABLE: admin_settings
-- ============================================
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_key text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.admin_settings (master_key) VALUES ('BILLSAATHI2024');
