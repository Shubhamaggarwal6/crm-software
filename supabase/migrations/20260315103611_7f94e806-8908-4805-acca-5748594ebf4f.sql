
-- Quotations table
CREATE TABLE public.quotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  quotation_no text NOT NULL,
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  customer_id uuid REFERENCES public.customers(id),
  customer_name text NOT NULL,
  customer_phone text,
  customer_address text,
  customer_gst text,
  customer_state text,
  customer_state_code text,
  is_inter_state boolean DEFAULT false,
  place_of_supply text,
  subtotal numeric DEFAULT 0,
  cgst_total numeric DEFAULT 0,
  sgst_total numeric DEFAULT 0,
  igst_total numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  round_off numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  terms text,
  status text DEFAULT 'Draft',
  converted_invoice_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quotation items table
CREATE TABLE public.quotation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  hsn_code text,
  quantity numeric NOT NULL,
  unit text DEFAULT 'Pcs',
  mrp numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  gst_rate numeric DEFAULT 0,
  taxable_amount numeric DEFAULT 0,
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  igst_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotations
CREATE POLICY "Owner select quotations" ON public.quotations FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert quotations" ON public.quotations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update quotations" ON public.quotations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete quotations" ON public.quotations FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for quotation_items
CREATE POLICY "Owner select quotation_items" ON public.quotation_items FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Owner insert quotation_items" ON public.quotation_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update quotation_items" ON public.quotation_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete quotation_items" ON public.quotation_items FOR DELETE USING (user_id = auth.uid());
