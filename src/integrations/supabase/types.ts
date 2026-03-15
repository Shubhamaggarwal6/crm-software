export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          actor_id: string
          actor_name: string
          actor_role: string
          created_at: string | null
          description: string
          id: string
          module: string
          new_value: Json | null
          old_value: Json | null
          owner_id: string
          reference_id: string | null
          reference_number: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_name: string
          actor_role: string
          created_at?: string | null
          description: string
          id?: string
          module: string
          new_value?: Json | null
          old_value?: Json | null
          owner_id: string
          reference_id?: string | null
          reference_number?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_name?: string
          actor_role?: string
          created_at?: string | null
          description?: string
          id?: string
          module?: string
          new_value?: Json | null
          old_value?: Json | null
          owner_id?: string
          reference_id?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          id: string
          master_key: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          master_key: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          master_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder: string
          account_number: string
          account_type: string | null
          bank_name: string
          branch: string | null
          created_at: string | null
          display_label: string | null
          id: string
          ifsc_code: string
          is_default: boolean | null
          opening_balance: number | null
          opening_balance_date: string | null
          upi_id: string | null
          user_id: string
        }
        Insert: {
          account_holder: string
          account_number: string
          account_type?: string | null
          bank_name: string
          branch?: string | null
          created_at?: string | null
          display_label?: string | null
          id?: string
          ifsc_code: string
          is_default?: boolean | null
          opening_balance?: number | null
          opening_balance_date?: string | null
          upi_id?: string | null
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string
          branch?: string | null
          created_at?: string | null
          display_label?: string | null
          id?: string
          ifsc_code?: string
          is_default?: boolean | null
          opening_balance?: number | null
          opening_balance_date?: string | null
          upi_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_ledger_entries: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string | null
          description: string
          entry_date: string
          entry_type: string
          id: string
          is_manual: boolean | null
          is_reconciled: boolean | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          running_balance: number | null
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string | null
          description: string
          entry_date: string
          entry_type: string
          id?: string
          is_manual?: boolean | null
          is_reconciled?: boolean | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          running_balance?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string | null
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          is_manual?: boolean | null
          is_reconciled?: boolean | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          running_balance?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_ledger_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_items: {
        Row: {
          cgst_amount: number | null
          credit_note_id: string
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          rate: number | null
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          unit: string | null
          user_id: string
        }
        Insert: {
          cgst_amount?: number | null
          credit_note_id: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          rate?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          user_id: string
        }
        Update: {
          cgst_amount?: number | null
          credit_note_id?: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          rate?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          cgst_total: number | null
          created_at: string | null
          credit_note_date: string
          credit_note_no: string
          customer_id: string | null
          customer_name: string | null
          id: string
          igst_total: number | null
          invoice_id: string | null
          invoice_no: string | null
          notes: string | null
          reason: string | null
          restock: boolean | null
          sgst_total: number | null
          status: string | null
          subtotal: number | null
          total: number | null
          user_id: string
        }
        Insert: {
          cgst_total?: number | null
          created_at?: string | null
          credit_note_date: string
          credit_note_no: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          igst_total?: number | null
          invoice_id?: string | null
          invoice_no?: string | null
          notes?: string | null
          reason?: string | null
          restock?: boolean | null
          sgst_total?: number | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          user_id: string
        }
        Update: {
          cgst_total?: number | null
          created_at?: string | null
          credit_note_date?: string
          credit_note_no?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          igst_total?: number | null
          invoice_id?: string | null
          invoice_no?: string | null
          notes?: string | null
          reason?: string | null
          restock?: boolean | null
          sgst_total?: number | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          alternate_phone: string | null
          area: string | null
          city: string | null
          created_at: string | null
          credit_limit: number | null
          customer_since: string | null
          customer_type: string | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          notes: string | null
          opening_balance: number | null
          pan_number: string | null
          party_type: string[] | null
          payment_terms: string | null
          phone: string | null
          pin_code: string | null
          state: string | null
          state_code: string | null
          street: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alternate_phone?: string | null
          area?: string | null
          city?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_since?: string | null
          customer_type?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number | null
          pan_number?: string | null
          party_type?: string[] | null
          payment_terms?: string | null
          phone?: string | null
          pin_code?: string | null
          state?: string | null
          state_code?: string | null
          street?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alternate_phone?: string | null
          area?: string | null
          city?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_since?: string | null
          customer_type?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number | null
          pan_number?: string | null
          party_type?: string[] | null
          payment_terms?: string | null
          phone?: string | null
          pin_code?: string | null
          state?: string | null
          state_code?: string | null
          street?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_notes: {
        Row: {
          amount: number | null
          cgst_total: number | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          debit_note_date: string
          debit_note_no: string
          debit_note_type: string | null
          description: string | null
          gst_rate: number | null
          id: string
          igst_total: number | null
          notes: string | null
          reason: string | null
          reference_invoice: string | null
          sgst_total: number | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          total: number | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          cgst_total?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          debit_note_date: string
          debit_note_no: string
          debit_note_type?: string | null
          description?: string | null
          gst_rate?: number | null
          id?: string
          igst_total?: number | null
          notes?: string | null
          reason?: string | null
          reference_invoice?: string | null
          sgst_total?: number | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total?: number | null
          user_id: string
        }
        Update: {
          amount?: number | null
          cgst_total?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          debit_note_date?: string
          debit_note_no?: string
          debit_note_type?: string | null
          description?: string | null
          gst_rate?: number | null
          id?: string
          igst_total?: number | null
          notes?: string | null
          reason?: string | null
          reference_invoice?: string | null
          sgst_total?: number | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challan_items: {
        Row: {
          amount: number | null
          challan_id: string
          gst_amount: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          rate: number | null
          total_amount: number | null
          unit: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          challan_id: string
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          rate?: number | null
          total_amount?: number | null
          unit?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          challan_id?: string
          gst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number | null
          total_amount?: number | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challan_items_challan_id_fkey"
            columns: ["challan_id"]
            isOneToOne: false
            referencedRelation: "delivery_challans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challan_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challans: {
        Row: {
          challan_date: string
          challan_no: string
          challan_type: string | null
          converted_invoice_id: string | null
          created_at: string | null
          delivery_address: string | null
          driver_name: string | null
          id: string
          include_gst: boolean | null
          notes: string | null
          party_id: string | null
          party_name: string | null
          status: string | null
          subtotal: number | null
          tax_total: number | null
          total: number | null
          user_id: string
          vehicle_no: string | null
        }
        Insert: {
          challan_date: string
          challan_no: string
          challan_type?: string | null
          converted_invoice_id?: string | null
          created_at?: string | null
          delivery_address?: string | null
          driver_name?: string | null
          id?: string
          include_gst?: boolean | null
          notes?: string | null
          party_id?: string | null
          party_name?: string | null
          status?: string | null
          subtotal?: number | null
          tax_total?: number | null
          total?: number | null
          user_id: string
          vehicle_no?: string | null
        }
        Update: {
          challan_date?: string
          challan_no?: string
          challan_type?: string | null
          converted_invoice_id?: string | null
          created_at?: string | null
          delivery_address?: string | null
          driver_name?: string | null
          id?: string
          include_gst?: boolean | null
          notes?: string | null
          party_id?: string | null
          party_name?: string | null
          status?: string | null
          subtotal?: number | null
          tax_total?: number | null
          total?: number | null
          user_id?: string
          vehicle_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challans_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          owner_id: string
          password_hash: string
          permissions: Json
          phone: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          owner_id: string
          password_hash: string
          permissions?: Json
          phone?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          owner_id?: string
          password_hash?: string
          permissions?: Json
          phone?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          default_gst_rate: number | null
          description: string | null
          id: string
          is_gst_applicable: boolean | null
          is_system_category: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          default_gst_rate?: number | null
          description?: string | null
          id?: string
          is_gst_applicable?: boolean | null
          is_system_category?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          default_gst_rate?: number | null
          description?: string | null
          id?: string
          is_gst_applicable?: boolean | null
          is_system_category?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          bill_number: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          description: string | null
          expense_date: string
          gst_amount: number | null
          gst_rate: number | null
          id: string
          is_recurring: boolean | null
          payment_mode: string | null
          recurring_frequency: string | null
          reference_number: string | null
          total_amount: number
          user_id: string
          vendor_id: string | null
          vendor_name: string | null
          with_gst: boolean | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bill_number?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          description?: string | null
          expense_date: string
          gst_amount?: number | null
          gst_rate?: number | null
          id?: string
          is_recurring?: boolean | null
          payment_mode?: string | null
          recurring_frequency?: string | null
          reference_number?: string | null
          total_amount: number
          user_id: string
          vendor_id?: string | null
          vendor_name?: string | null
          with_gst?: boolean | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bill_number?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          gst_amount?: number | null
          gst_rate?: number | null
          id?: string
          is_recurring?: boolean | null
          payment_mode?: string | null
          recurring_frequency?: string | null
          reference_number?: string | null
          total_amount?: number
          user_id?: string
          vendor_id?: string | null
          vendor_name?: string | null
          with_gst?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string | null
          error_details: Json | null
          failed_rows: number | null
          file_name: string | null
          id: string
          import_type: string
          status: string | null
          successful_rows: number | null
          total_rows: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          failed_rows?: number | null
          file_name?: string | null
          id?: string
          import_type: string
          status?: string | null
          successful_rows?: number | null
          total_rows?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          failed_rows?: number | null
          file_name?: string | null
          id?: string
          import_type?: string
          status?: string | null
          successful_rows?: number | null
          total_rows?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_charges: {
        Row: {
          amount: number
          applied_before_tax: boolean | null
          charge_name: string
          gst_amount: number | null
          gst_rate: number | null
          id: string
          invoice_id: string
          total_amount: number
          user_id: string
          with_gst: boolean | null
        }
        Insert: {
          amount: number
          applied_before_tax?: boolean | null
          charge_name: string
          gst_amount?: number | null
          gst_rate?: number | null
          id?: string
          invoice_id: string
          total_amount: number
          user_id: string
          with_gst?: boolean | null
        }
        Update: {
          amount?: number
          applied_before_tax?: boolean | null
          charge_name?: string
          gst_amount?: number | null
          gst_rate?: number | null
          id?: string
          invoice_id?: string
          total_amount?: number
          user_id?: string
          with_gst?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_charges_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_charges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          carton_unit_name: string | null
          cgst_amount: number | null
          discount_amount: number | null
          discount_percent: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          invoice_id: string
          mrp: number | null
          pieces_per_carton: number | null
          product_id: string | null
          product_name: string
          quantity: number
          quantity_in_cartons: number | null
          quantity_in_loose: number | null
          selected_unit: string | null
          selling_price: number | null
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          total_loose_units: number | null
          unit: string | null
          unit_price_used: number | null
          user_id: string
        }
        Insert: {
          carton_unit_name?: string | null
          cgst_amount?: number | null
          discount_amount?: number | null
          discount_percent?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id: string
          mrp?: number | null
          pieces_per_carton?: number | null
          product_id?: string | null
          product_name: string
          quantity: number
          quantity_in_cartons?: number | null
          quantity_in_loose?: number | null
          selected_unit?: string | null
          selling_price?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          total_loose_units?: number | null
          unit?: string | null
          unit_price_used?: number | null
          user_id: string
        }
        Update: {
          carton_unit_name?: string | null
          cgst_amount?: number | null
          discount_amount?: number | null
          discount_percent?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id?: string
          mrp?: number | null
          pieces_per_carton?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          quantity_in_cartons?: number | null
          quantity_in_loose?: number | null
          selected_unit?: string | null
          selling_price?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          total_loose_units?: number | null
          unit?: string | null
          unit_price_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_received: number | null
          balance_due: number | null
          cgst_total: number | null
          created_at: string | null
          created_by_employee_id: string | null
          created_by_id: string | null
          created_by_name: string | null
          created_by_role: string | null
          customer_address: string | null
          customer_gst: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_state: string | null
          customer_state_code: string | null
          discount_amount: number | null
          eway_bill: string | null
          id: string
          igst_total: number | null
          invoice_date: string
          invoice_discount_amount: number | null
          invoice_discount_before_tax: boolean | null
          invoice_discount_percent: number | null
          invoice_discount_type: string | null
          is_inter_state: boolean | null
          notes: string | null
          other_charges_total: number | null
          payment_status: string | null
          place_of_supply: string | null
          round_off: number | null
          sgst_total: number | null
          subtotal: number | null
          supply_type: string | null
          total: number | null
          updated_at: string | null
          user_id: string
          vehicle_no: string | null
        }
        Insert: {
          amount_received?: number | null
          balance_due?: number | null
          cgst_total?: number | null
          created_at?: string | null
          created_by_employee_id?: string | null
          created_by_id?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          customer_address?: string | null
          customer_gst?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_state_code?: string | null
          discount_amount?: number | null
          eway_bill?: string | null
          id: string
          igst_total?: number | null
          invoice_date?: string
          invoice_discount_amount?: number | null
          invoice_discount_before_tax?: boolean | null
          invoice_discount_percent?: number | null
          invoice_discount_type?: string | null
          is_inter_state?: boolean | null
          notes?: string | null
          other_charges_total?: number | null
          payment_status?: string | null
          place_of_supply?: string | null
          round_off?: number | null
          sgst_total?: number | null
          subtotal?: number | null
          supply_type?: string | null
          total?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_no?: string | null
        }
        Update: {
          amount_received?: number | null
          balance_due?: number | null
          cgst_total?: number | null
          created_at?: string | null
          created_by_employee_id?: string | null
          created_by_id?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          customer_address?: string | null
          customer_gst?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_state_code?: string | null
          discount_amount?: number | null
          eway_bill?: string | null
          id?: string
          igst_total?: number | null
          invoice_date?: string
          invoice_discount_amount?: number | null
          invoice_discount_before_tax?: boolean | null
          invoice_discount_percent?: number | null
          invoice_discount_type?: string | null
          is_inter_state?: boolean | null
          notes?: string | null
          other_charges_total?: number | null
          payment_status?: string | null
          place_of_supply?: string | null
          round_off?: number | null
          sgst_total?: number | null
          subtotal?: number | null
          supply_type?: string | null
          total?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          active: boolean | null
          address: string | null
          city: string | null
          created_at: string | null
          created_by_admin: string | null
          firm_name: string
          gst_number: string | null
          id: string
          invoice_prefix: string | null
          max_employees: number | null
          pin_code: string | null
          plan: string | null
          show_stock_to_employees: boolean | null
          state: string | null
          state_code: string | null
          sub_end: string | null
          sub_start: string | null
          terms_and_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          created_by_admin?: string | null
          firm_name: string
          gst_number?: string | null
          id: string
          invoice_prefix?: string | null
          max_employees?: number | null
          pin_code?: string | null
          plan?: string | null
          show_stock_to_employees?: boolean | null
          state?: string | null
          state_code?: string | null
          sub_end?: string | null
          sub_start?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          created_by_admin?: string | null
          firm_name?: string
          gst_number?: string | null
          id?: string
          invoice_prefix?: string | null
          max_employees?: number | null
          pin_code?: string | null
          plan?: string | null
          show_stock_to_employees?: boolean | null
          state?: string | null
          state_code?: string | null
          sub_end?: string | null
          sub_start?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_profiles_created_by_admin_fkey"
            columns: ["created_by_admin"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          access_level: string | null
          active: boolean | null
          created_at: string | null
          id: string
          owner_id: string
          role_label: string | null
        }
        Insert: {
          access_level?: string | null
          active?: boolean | null
          created_at?: string | null
          id: string
          owner_id: string
          role_label?: string | null
        }
        Update: {
          access_level?: string | null
          active?: boolean | null
          created_at?: string | null
          id?: string
          owner_id?: string
          role_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          bank_account_label: string | null
          bank_name: string | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string | null
          customer_id: string | null
          drawee_bank: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_mode: string
          purchase_id: string | null
          receipt_no: string
          received_by: string | null
          reference_number: string | null
          supplier_id: string | null
          transfer_date: string | null
          user_id: string
          utr_number: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bank_account_label?: string | null
          bank_name?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string | null
          customer_id?: string | null
          drawee_bank?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_mode: string
          purchase_id?: string | null
          receipt_no: string
          received_by?: string | null
          reference_number?: string | null
          supplier_id?: string | null
          transfer_date?: string | null
          user_id: string
          utr_number?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bank_account_label?: string | null
          bank_name?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string | null
          customer_id?: string | null
          drawee_bank?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_mode?: string
          purchase_id?: string | null
          receipt_no?: string
          received_by?: string | null
          reference_number?: string | null
          supplier_id?: string | null
          transfer_date?: string | null
          user_id?: string
          utr_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          brand: string | null
          carton_barcode: string | null
          carton_mrp: number | null
          carton_purchase_price: number | null
          carton_selling_price: number | null
          carton_unit_name: string | null
          category: string | null
          cess_rate: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          min_stock_level: number | null
          mrp: number | null
          name: string
          pieces_per_carton: number | null
          purchase_price: number | null
          selling_price: number | null
          selling_unit_type: string
          storage_location: string | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          brand?: string | null
          carton_barcode?: string | null
          carton_mrp?: number | null
          carton_purchase_price?: number | null
          carton_selling_price?: number | null
          carton_unit_name?: string | null
          category?: string | null
          cess_rate?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          min_stock_level?: number | null
          mrp?: number | null
          name: string
          pieces_per_carton?: number | null
          purchase_price?: number | null
          selling_price?: number | null
          selling_unit_type?: string
          storage_location?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          brand?: string | null
          carton_barcode?: string | null
          carton_mrp?: number | null
          carton_purchase_price?: number | null
          carton_selling_price?: number | null
          carton_unit_name?: string | null
          category?: string | null
          cess_rate?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          min_stock_level?: number | null
          mrp?: number | null
          name?: string
          pieces_per_carton?: number | null
          purchase_price?: number | null
          selling_price?: number | null
          selling_unit_type?: string
          storage_location?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          carton_unit_name: string | null
          cgst_amount: number | null
          discount_percent: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          pieces_per_carton: number | null
          product_id: string | null
          product_name: string
          purchase_id: string
          purchase_rate: number | null
          quantity: number
          quantity_in_cartons: number | null
          quantity_in_loose: number | null
          selected_unit: string | null
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          total_loose_units: number | null
          unit: string | null
          unit_price_used: number | null
          user_id: string
        }
        Insert: {
          carton_unit_name?: string | null
          cgst_amount?: number | null
          discount_percent?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          pieces_per_carton?: number | null
          product_id?: string | null
          product_name: string
          purchase_id: string
          purchase_rate?: number | null
          quantity: number
          quantity_in_cartons?: number | null
          quantity_in_loose?: number | null
          selected_unit?: string | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          total_loose_units?: number | null
          unit?: string | null
          unit_price_used?: number | null
          user_id: string
        }
        Update: {
          carton_unit_name?: string | null
          cgst_amount?: number | null
          discount_percent?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          pieces_per_carton?: number | null
          product_id?: string | null
          product_name?: string
          purchase_id?: string
          purchase_rate?: number | null
          quantity?: number
          quantity_in_cartons?: number | null
          quantity_in_loose?: number | null
          selected_unit?: string | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          total_loose_units?: number | null
          unit?: string | null
          unit_price_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          cgst_amount: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          product_id: string | null
          product_name: string
          quantity: number
          rate: number | null
          return_id: string
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          unit: string | null
          user_id: string
        }
        Insert: {
          cgst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name: string
          quantity: number
          rate?: number | null
          return_id: string
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          user_id: string
        }
        Update: {
          cgst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number | null
          return_id?: string
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          created_at: string | null
          debit_note_id: string | null
          id: string
          notes: string | null
          original_purchase_id: string | null
          reason: string | null
          return_date: string
          return_no: string
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          tax_total: number | null
          total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          debit_note_id?: string | null
          id?: string
          notes?: string | null
          original_purchase_id?: string | null
          reason?: string | null
          return_date: string
          return_no: string
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax_total?: number | null
          total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          debit_note_id?: string | null
          id?: string
          notes?: string | null
          original_purchase_id?: string | null
          reason?: string | null
          return_date?: string
          return_no?: string
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax_total?: number | null
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_original_purchase_id_fkey"
            columns: ["original_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: number | null
          balance_due: number | null
          cgst_total: number | null
          created_at: string | null
          discount_total: number | null
          due_date: string | null
          id: string
          igst_total: number | null
          invoice_date: string
          is_inter_state: boolean | null
          notes: string | null
          payment_status: string | null
          place_of_supply: string | null
          purchase_no: string
          sgst_total: number | null
          subtotal: number | null
          supplier_gst: string | null
          supplier_id: string | null
          supplier_invoice_no: string | null
          supplier_name: string | null
          supply_type: string | null
          total: number | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number | null
          cgst_total?: number | null
          created_at?: string | null
          discount_total?: number | null
          due_date?: string | null
          id?: string
          igst_total?: number | null
          invoice_date: string
          is_inter_state?: boolean | null
          notes?: string | null
          payment_status?: string | null
          place_of_supply?: string | null
          purchase_no: string
          sgst_total?: number | null
          subtotal?: number | null
          supplier_gst?: string | null
          supplier_id?: string | null
          supplier_invoice_no?: string | null
          supplier_name?: string | null
          supply_type?: string | null
          total?: number | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number | null
          cgst_total?: number | null
          created_at?: string | null
          discount_total?: number | null
          due_date?: string | null
          id?: string
          igst_total?: number | null
          invoice_date?: string
          is_inter_state?: boolean | null
          notes?: string | null
          payment_status?: string | null
          place_of_supply?: string | null
          purchase_no?: string
          sgst_total?: number | null
          subtotal?: number | null
          supplier_gst?: string | null
          supplier_id?: string | null
          supplier_invoice_no?: string | null
          supplier_name?: string | null
          supply_type?: string | null
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          carton_unit_name: string | null
          cgst_amount: number | null
          discount_amount: number | null
          discount_percent: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          mrp: number | null
          pieces_per_carton: number | null
          product_id: string | null
          product_name: string
          quantity: number
          quantity_in_cartons: number | null
          quantity_in_loose: number | null
          quotation_id: string
          selected_unit: string | null
          selling_price: number | null
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          total_loose_units: number | null
          unit: string | null
          unit_price_used: number | null
          user_id: string
        }
        Insert: {
          carton_unit_name?: string | null
          cgst_amount?: number | null
          discount_amount?: number | null
          discount_percent?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          mrp?: number | null
          pieces_per_carton?: number | null
          product_id?: string | null
          product_name: string
          quantity: number
          quantity_in_cartons?: number | null
          quantity_in_loose?: number | null
          quotation_id: string
          selected_unit?: string | null
          selling_price?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          total_loose_units?: number | null
          unit?: string | null
          unit_price_used?: number | null
          user_id: string
        }
        Update: {
          carton_unit_name?: string | null
          cgst_amount?: number | null
          discount_amount?: number | null
          discount_percent?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          mrp?: number | null
          pieces_per_carton?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          quantity_in_cartons?: number | null
          quantity_in_loose?: number | null
          quotation_id?: string
          selected_unit?: string | null
          selling_price?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          total_loose_units?: number | null
          unit?: string | null
          unit_price_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          cgst_total: number | null
          converted_invoice_id: string | null
          created_at: string | null
          customer_address: string | null
          customer_gst: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_state: string | null
          customer_state_code: string | null
          discount_amount: number | null
          id: string
          igst_total: number | null
          is_inter_state: boolean | null
          notes: string | null
          place_of_supply: string | null
          quotation_date: string
          quotation_no: string
          round_off: number | null
          sgst_total: number | null
          status: string | null
          subtotal: number | null
          terms: string | null
          total: number | null
          updated_at: string | null
          user_id: string
          valid_until: string | null
        }
        Insert: {
          cgst_total?: number | null
          converted_invoice_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_gst?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_state_code?: string | null
          discount_amount?: number | null
          id?: string
          igst_total?: number | null
          is_inter_state?: boolean | null
          notes?: string | null
          place_of_supply?: string | null
          quotation_date?: string
          quotation_no: string
          round_off?: number | null
          sgst_total?: number | null
          status?: string | null
          subtotal?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string | null
          user_id: string
          valid_until?: string | null
        }
        Update: {
          cgst_total?: number | null
          converted_invoice_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_gst?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_state_code?: string | null
          discount_amount?: number | null
          id?: string
          igst_total?: number | null
          is_inter_state?: boolean | null
          notes?: string | null
          place_of_supply?: string | null
          quotation_date?: string
          quotation_no?: string
          round_off?: number | null
          sgst_total?: number | null
          status?: string | null
          subtotal?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string | null
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          advance_deduction: number | null
          bank_account_id: string | null
          created_at: string | null
          employee_id: string
          employee_name: string | null
          gross_salary: number | null
          id: string
          month_year: string
          net_paid: number
          notes: string | null
          other_deduction: number | null
          payment_date: string
          payment_mode: string | null
          reference_number: string | null
          user_id: string
        }
        Insert: {
          advance_deduction?: number | null
          bank_account_id?: string | null
          created_at?: string | null
          employee_id: string
          employee_name?: string | null
          gross_salary?: number | null
          id?: string
          month_year: string
          net_paid: number
          notes?: string | null
          other_deduction?: number | null
          payment_date: string
          payment_mode?: string | null
          reference_number?: string | null
          user_id: string
        }
        Update: {
          advance_deduction?: number | null
          bank_account_id?: string | null
          created_at?: string | null
          employee_id?: string
          employee_name?: string | null
          gross_salary?: number | null
          id?: string
          month_year?: string
          net_paid?: number
          notes?: string | null
          other_deduction?: number | null
          payment_date?: string
          payment_mode?: string | null
          reference_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_structures: {
        Row: {
          allowances: Json | null
          basic_amount: number
          created_at: string | null
          effective_from: string
          employee_id: string
          gross_salary: number
          id: string
          salary_type: string
          user_id: string
        }
        Insert: {
          allowances?: Json | null
          basic_amount: number
          created_at?: string | null
          effective_from: string
          employee_id: string
          gross_salary: number
          id?: string
          salary_type: string
          user_id: string
        }
        Update: {
          allowances?: Json | null
          basic_amount?: number
          created_at?: string | null
          effective_from?: string
          employee_id?: string
          gross_salary?: number
          id?: string
          salary_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_structures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          cgst_amount: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          product_id: string | null
          product_name: string
          quantity: number
          rate: number | null
          return_id: string
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          unit: string | null
          user_id: string
        }
        Insert: {
          cgst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name: string
          quantity: number
          rate?: number | null
          return_id: string
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          user_id: string
        }
        Update: {
          cgst_amount?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number | null
          return_id?: string
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          created_at: string | null
          credit_note_id: string | null
          id: string
          notes: string | null
          original_invoice_id: string | null
          party_id: string | null
          party_name: string | null
          reason: string | null
          restock: boolean | null
          return_date: string
          return_no: string
          subtotal: number | null
          tax_total: number | null
          total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credit_note_id?: string | null
          id?: string
          notes?: string | null
          original_invoice_id?: string | null
          party_id?: string | null
          party_name?: string | null
          reason?: string | null
          restock?: boolean | null
          return_date: string
          return_no: string
          subtotal?: number | null
          tax_total?: number | null
          total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credit_note_id?: string | null
          id?: string
          notes?: string | null
          original_invoice_id?: string | null
          party_id?: string | null
          party_name?: string | null
          reason?: string | null
          restock?: boolean | null
          return_date?: string
          return_no?: string
          subtotal?: number | null
          tax_total?: number | null
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_counters: {
        Row: {
          counter_type: string
          current_value: number | null
          financial_year: string
          id: string
          user_id: string
        }
        Insert: {
          counter_type: string
          current_value?: number | null
          financial_year: string
          id?: string
          user_id: string
        }
        Update: {
          counter_type?: string
          current_value?: number | null
          financial_year?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          default_terms: string | null
          financial_year_start: string | null
          id: string
          invoice_copy_label: string | null
          invoice_prefix: string | null
          language: string | null
          logo_url: string | null
          qr_type: string | null
          qr_value: string | null
          show_bank_on_invoice: boolean | null
          show_eway_field: boolean | null
          show_qr_on_invoice: boolean | null
          show_stock_to_employees: boolean | null
          show_terms_on_invoice: boolean | null
          signature_1_label: string | null
          signature_1_url: string | null
          signature_2_label: string | null
          signature_2_url: string | null
          signature_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_terms?: string | null
          financial_year_start?: string | null
          id?: string
          invoice_copy_label?: string | null
          invoice_prefix?: string | null
          language?: string | null
          logo_url?: string | null
          qr_type?: string | null
          qr_value?: string | null
          show_bank_on_invoice?: boolean | null
          show_eway_field?: boolean | null
          show_qr_on_invoice?: boolean | null
          show_stock_to_employees?: boolean | null
          show_terms_on_invoice?: boolean | null
          signature_1_label?: string | null
          signature_1_url?: string | null
          signature_2_label?: string | null
          signature_2_url?: string | null
          signature_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_terms?: string | null
          financial_year_start?: string | null
          id?: string
          invoice_copy_label?: string | null
          invoice_prefix?: string | null
          language?: string | null
          logo_url?: string | null
          qr_type?: string | null
          qr_value?: string | null
          show_bank_on_invoice?: boolean | null
          show_eway_field?: boolean | null
          show_qr_on_invoice?: boolean | null
          show_stock_to_employees?: boolean | null
          show_terms_on_invoice?: boolean | null
          signature_1_label?: string | null
          signature_1_url?: string | null
          signature_2_label?: string | null
          signature_2_url?: string | null
          signature_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      share_tokens: {
        Row: {
          created_at: string | null
          document_id: string
          document_type: string
          expires_at: string
          id: string
          token: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          document_type: string
          expires_at?: string
          id?: string
          token?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          document_type?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "share_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          balance_after: number | null
          created_at: string | null
          id: string
          movement_date: string | null
          movement_type: string | null
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          created_at?: string | null
          id?: string
          movement_date?: string | null
          movement_type?: string | null
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number | null
          created_at?: string | null
          id?: string
          movement_date?: string | null
          movement_type?: string | null
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_number: string | null
          alternate_phone: string | null
          bank_name: string | null
          branch: string | null
          category: string | null
          city: string | null
          created_at: string | null
          email: string | null
          gst_number: string | null
          id: string
          ifsc_code: string | null
          name: string
          notes: string | null
          opening_balance: number | null
          pan_number: string | null
          payment_terms: string | null
          phone: string | null
          pin_code: string | null
          state: string | null
          state_code: string | null
          street: string | null
          supplier_code: string | null
          supplier_since: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          alternate_phone?: string | null
          bank_name?: string | null
          branch?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          name: string
          notes?: string | null
          opening_balance?: number | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          pin_code?: string | null
          state?: string | null
          state_code?: string | null
          street?: string | null
          supplier_code?: string | null
          supplier_since?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          alternate_phone?: string | null
          bank_name?: string | null
          branch?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          ifsc_code?: string | null
          name?: string
          notes?: string | null
          opening_balance?: number | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          pin_code?: string | null
          state?: string | null
          state_code?: string | null
          street?: string | null
          supplier_code?: string | null
          supplier_since?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_mode: string | null
          person_id: string | null
          person_name: string
          person_type: string
          purpose: string | null
          reference_number: string | null
          user_id: string
          withdrawal_date: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_mode?: string | null
          person_id?: string | null
          person_name: string
          person_type: string
          purpose?: string | null
          reference_number?: string | null
          user_id: string
          withdrawal_date: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_mode?: string | null
          person_id?: string | null
          person_name?: string
          person_type?: string
          purpose?: string | null
          reference_number?: string | null
          user_id?: string
          withdrawal_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_sequence: {
        Args: { p_fy: string; p_type: string; p_user_id: string }
        Returns: number
      }
      get_owner_id: { Args: { _user_id: string }; Returns: string }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
