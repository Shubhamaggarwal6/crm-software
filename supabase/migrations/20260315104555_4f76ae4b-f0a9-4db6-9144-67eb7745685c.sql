
-- Add carton/loose columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_unit_type text NOT NULL DEFAULT 'loose';
ALTER TABLE products ADD COLUMN IF NOT EXISTS carton_unit_name text DEFAULT 'Carton';
ALTER TABLE products ADD COLUMN IF NOT EXISTS pieces_per_carton numeric DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS carton_mrp numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS carton_selling_price numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS carton_purchase_price numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS carton_barcode text;

-- Add carton/loose columns to invoice_items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS selected_unit text DEFAULT 'loose';
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS quantity_in_cartons numeric DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS quantity_in_loose numeric DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS total_loose_units numeric DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit_price_used numeric DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS carton_unit_name text;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS pieces_per_carton numeric DEFAULT 1;

-- Add carton/loose columns to purchase_items
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS selected_unit text DEFAULT 'loose';
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS quantity_in_cartons numeric DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS quantity_in_loose numeric DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS total_loose_units numeric DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS unit_price_used numeric DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS carton_unit_name text;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS pieces_per_carton numeric DEFAULT 1;

-- Add same columns to quotation_items for consistency
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS selected_unit text DEFAULT 'loose';
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS quantity_in_cartons numeric DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS quantity_in_loose numeric DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS total_loose_units numeric DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit_price_used numeric DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS carton_unit_name text;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS pieces_per_carton numeric DEFAULT 1;
