/**
 * Mapping functions between Supabase (snake_case) DB rows and frontend (camelCase) types.
 */
import type { Customer, Product, Invoice, InvoiceItem, Payment, Employee, Supplier, Purchase, PurchaseItem, CreditNote, DebitNote, BankAccount } from '@/types';

// ── Customers ──
export function dbToCustomer(r: any): Customer {
  return {
    id: r.id, userId: r.user_id, name: r.name, phone: r.phone || '',
    altPhone: r.alternate_phone, email: r.email, gstNumber: r.gst_number,
    pan: r.pan_number, address: r.street, area: r.area, city: r.city,
    pin: r.pin_code, state: r.state, stateCode: r.state_code,
    type: r.customer_type, openingBalance: r.opening_balance,
    creditLimit: r.credit_limit, paymentTerms: r.payment_terms,
    customerSince: r.customer_since, notes: r.notes,
    tags: r.tags ? r.tags.join(', ') : '', createdAt: r.created_at,
  };
}
export function customerToDb(c: Omit<Customer, 'id'> & { id?: string }) {
  return {
    ...(c.id ? { id: c.id } : {}),
    user_id: c.userId, name: c.name, phone: c.phone || null,
    alternate_phone: c.altPhone || null, email: c.email || null,
    gst_number: c.gstNumber || null, pan_number: c.pan || null,
    street: c.address || null, area: c.area || null, city: c.city || null,
    pin_code: c.pin || null, state: c.state || null, state_code: c.stateCode || null,
    customer_type: c.type || 'Retail', opening_balance: c.openingBalance || 0,
    credit_limit: c.creditLimit || 0, payment_terms: c.paymentTerms || null,
    customer_since: c.customerSince || null, notes: c.notes || null,
    tags: c.tags ? c.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
  };
}

// ── Products ──
export function dbToProduct(r: any): Product {
  return {
    id: r.id, userId: r.user_id, name: r.name, hsn: r.hsn_code || '',
    category: r.category, brand: r.brand, description: r.description,
    barcode: r.barcode, price: r.mrp || 0, sellingPrice: r.selling_price || 0,
    purchasePrice: r.purchase_price || 0, gstRate: r.gst_rate ?? 18,
    cess: r.cess_rate || 0, unit: r.unit || 'Pcs', stock: r.current_stock || 0,
    minStock: r.min_stock_level || 0, storageLocation: r.storage_location,
    sellingUnitType: r.selling_unit_type || 'loose',
    cartonUnitName: r.carton_unit_name || 'Carton',
    piecesPerCarton: r.pieces_per_carton || 1,
    cartonMrp: r.carton_mrp || 0,
    cartonSellingPrice: r.carton_selling_price || 0,
    cartonPurchasePrice: r.carton_purchase_price || 0,
    cartonBarcode: r.carton_barcode,
  };
}
export function productToDb(p: Omit<Product, 'id'> & { id?: string }) {
  return {
    ...(p.id ? { id: p.id } : {}),
    user_id: p.userId, name: p.name, hsn_code: p.hsn || null,
    category: p.category || null, brand: p.brand || null,
    description: p.description || null, barcode: p.barcode || null,
    mrp: p.price || 0, selling_price: p.sellingPrice || 0,
    purchase_price: p.purchasePrice || 0, gst_rate: p.gstRate ?? 18,
    cess_rate: p.cess || 0, unit: p.unit || 'Pcs',
    current_stock: p.stock || 0, min_stock_level: p.minStock || 0,
    storage_location: p.storageLocation || null,
    selling_unit_type: p.sellingUnitType || 'loose',
    carton_unit_name: p.cartonUnitName || 'Carton',
    pieces_per_carton: p.piecesPerCarton || 1,
    carton_mrp: p.cartonMrp || 0,
    carton_selling_price: p.cartonSellingPrice || 0,
    carton_purchase_price: p.cartonPurchasePrice || 0,
    carton_barcode: p.cartonBarcode || null,
  };
}

// ── Invoice Items ──
export function dbToInvoiceItem(r: any): InvoiceItem {
  return {
    productId: r.product_id || '', productName: r.product_name,
    hsn: r.hsn_code || '', qty: r.quantity, unit: r.unit || 'Pcs',
    mrp: r.mrp || 0, sellingPrice: r.selling_price || 0,
    discount: r.discount_amount || 0, taxableAmount: r.taxable_amount || 0,
    gstRate: r.gst_rate || 0, cgst: r.cgst_amount || 0,
    sgst: r.sgst_amount || 0, igst: r.igst_amount || 0, total: r.total_amount || 0,
    selectedUnit: r.selected_unit || 'loose',
    quantityInCartons: r.quantity_in_cartons || 0,
    quantityInLoose: r.quantity_in_loose || 0,
    totalLooseUnits: r.total_loose_units || 0,
    unitPriceUsed: r.unit_price_used || 0,
    cartonUnitName: r.carton_unit_name,
    piecesPerCarton: r.pieces_per_carton || 1,
  };
}
export function invoiceItemToDb(item: InvoiceItem, invoiceId: string, userId: string) {
  return {
    invoice_id: invoiceId, user_id: userId,
    product_id: item.productId || null, product_name: item.productName,
    hsn_code: item.hsn || null, quantity: item.qty, unit: item.unit || 'Pcs',
    mrp: item.mrp || 0, selling_price: item.sellingPrice || 0,
    discount_amount: item.discount || 0, discount_percent: item.sellingPrice > 0 ? ((item.mrp - item.sellingPrice) / item.mrp * 100) : 0,
    taxable_amount: item.taxableAmount || 0, gst_rate: item.gstRate || 0,
    cgst_amount: item.cgst || 0, sgst_amount: item.sgst || 0,
    igst_amount: item.igst || 0, total_amount: item.total || 0,
    selected_unit: item.selectedUnit || 'loose',
    quantity_in_cartons: item.quantityInCartons || 0,
    quantity_in_loose: item.quantityInLoose || 0,
    total_loose_units: item.totalLooseUnits || 0,
    unit_price_used: item.unitPriceUsed || 0,
    carton_unit_name: item.cartonUnitName || null,
    pieces_per_carton: item.piecesPerCarton || 1,
  };
}

// ── Invoices ──
export function dbToInvoice(r: any, items: InvoiceItem[]): Invoice {
  return {
    id: r.id, invoiceNo: r.id, userId: r.user_id, date: r.invoice_date,
    customerId: r.customer_id || '', customerName: r.customer_name,
    customerGst: r.customer_gst, customerPhone: r.customer_phone,
    customerAddress: r.customer_address, customerState: r.customer_state,
    customerStateCode: r.customer_state_code, vehicleNo: r.vehicle_no,
    items, subtotal: r.subtotal || 0,
    totalCgst: r.cgst_total || 0, totalSgst: r.sgst_total || 0,
    totalIgst: r.igst_total || 0, totalDiscount: r.discount_amount || 0,
    roundOff: r.round_off || 0, grandTotal: r.total || 0,
    status: (r.payment_status === 'Unpaid' ? 'Pending' : r.payment_status) as any,
    amountPaid: r.amount_received || 0,
    createdBy: {
      id: r.created_by_id || r.user_id,
      name: r.created_by_name || '',
      role: (r.created_by_role || 'user') as any,
      timestamp: r.created_at || '',
    },
    isInterState: r.is_inter_state || false,
    invoiceDiscountAmount: r.invoice_discount_amount || 0,
    invoiceDiscountPercent: r.invoice_discount_percent || 0,
    invoiceDiscountType: r.invoice_discount_type || 'none',
    otherChargesTotal: r.other_charges_total || 0,
  };
}
export function invoiceToDb(inv: Omit<Invoice, 'id'> & { id?: string }) {
  return {
    id: inv.id || inv.invoiceNo, user_id: inv.userId,
    invoice_date: inv.date, customer_id: inv.customerId || null,
    customer_name: inv.customerName, customer_gst: inv.customerGst || null,
    customer_phone: inv.customerPhone || null,
    customer_address: inv.customerAddress || null,
    customer_state: inv.customerState || null,
    customer_state_code: inv.customerStateCode || null,
    vehicle_no: inv.vehicleNo || null,
    subtotal: inv.subtotal || 0, cgst_total: inv.totalCgst || 0,
    sgst_total: inv.totalSgst || 0, igst_total: inv.totalIgst || 0,
    discount_amount: inv.totalDiscount || 0, round_off: inv.roundOff || 0,
    total: inv.grandTotal || 0,
    payment_status: inv.status === 'Pending' ? 'Unpaid' : inv.status,
    amount_received: inv.amountPaid || 0,
    balance_due: (inv.grandTotal || 0) - (inv.amountPaid || 0),
    is_inter_state: inv.isInterState || false,
    created_by_id: inv.createdBy?.id || null,
    created_by_name: inv.createdBy?.name || null,
    created_by_role: inv.createdBy?.role || null,
    invoice_discount_amount: inv.invoiceDiscountAmount || 0,
    invoice_discount_percent: inv.invoiceDiscountPercent || 0,
    invoice_discount_type: inv.invoiceDiscountType || 'none',
    invoice_discount_before_tax: inv.invoiceDiscountType === 'before_tax',
    other_charges_total: inv.otherChargesTotal || 0,
  };
}

// ── Payments ──
export function dbToPayment(r: any): Payment {
  return {
    id: r.id, receiptNo: r.receipt_no, userId: r.user_id,
    customerId: r.customer_id, supplierId: r.supplier_id,
    invoiceId: r.invoice_id, amount: r.amount, date: r.payment_date,
    mode: r.payment_mode as any, reference: r.reference_number,
    utrNumber: r.utr_number, chequeNo: r.cheque_number,
    chequeDate: r.cheque_date, bankName: r.bank_name,
    receivedBy: r.received_by, note: r.notes,
  };
}
export function paymentToDb(p: Omit<Payment, 'id'> & { id?: string }) {
  return {
    ...(p.id ? { id: p.id } : {}),
    receipt_no: p.receiptNo, user_id: p.userId,
    customer_id: p.customerId || null, supplier_id: p.supplierId || null,
    invoice_id: p.invoiceId || null, amount: p.amount,
    payment_date: p.date, payment_mode: p.mode,
    reference_number: p.reference || null, utr_number: p.utrNumber || null,
    cheque_number: p.chequeNo || null, cheque_date: p.chequeDate || null,
    bank_name: p.bankName || null, received_by: p.receivedBy || null,
    notes: p.note || null,
  };
}

// ── Employees ──
export function dbToEmployee(r: any): Employee {
  const perms = typeof r.permissions === 'object' ? r.permissions : {};
  return {
    id: r.id, userId: r.owner_id, name: r.name,
    username: r.username, password: '', active: r.active ?? true,
    createdAt: r.created_at, permissions: {
      createInvoice: perms.createInvoice ?? false,
      addCustomer: perms.addCustomer ?? false,
      addProduct: perms.addProduct ?? false,
      viewReports: perms.viewReports ?? false,
      viewCustomerProfile: perms.viewCustomerProfile ?? false,
      editInvoiceStatus: perms.editInvoiceStatus ?? false,
      addPayment: perms.addPayment ?? false,
      viewStock: perms.viewStock ?? false,
      viewPurchases: perms.viewPurchases ?? false,
    },
  };
}

// ── Suppliers ──
export function dbToSupplier(r: any): Supplier {
  return {
    id: r.id, userId: r.user_id, name: r.name, phone: r.phone || '',
    altPhone: r.alternate_phone, email: r.email, gstNumber: r.gst_number,
    pan: r.pan_number, supplierCode: r.supplier_code,
    address: r.street, city: r.city, pin: r.pin_code,
    state: r.state, stateCode: r.state_code,
    bankName: r.bank_name, accountNumber: r.account_number,
    ifsc: r.ifsc_code, branch: r.branch,
    openingBalance: r.opening_balance, paymentTerms: r.payment_terms,
    supplierSince: r.supplier_since, category: r.category,
    notes: r.notes, createdAt: r.created_at,
  };
}
export function supplierToDb(s: Omit<Supplier, 'id'> & { id?: string }) {
  return {
    ...(s.id ? { id: s.id } : {}),
    user_id: s.userId, name: s.name, phone: s.phone || null,
    alternate_phone: s.altPhone || null, email: s.email || null,
    gst_number: s.gstNumber || null, pan_number: s.pan || null,
    supplier_code: s.supplierCode || null, street: s.address || null,
    city: s.city || null, pin_code: s.pin || null,
    state: s.state || null, state_code: s.stateCode || null,
    bank_name: s.bankName || null, account_number: s.accountNumber || null,
    ifsc_code: s.ifsc || null, branch: s.branch || null,
    opening_balance: s.openingBalance || 0,
    payment_terms: s.paymentTerms || null,
    supplier_since: s.supplierSince || null,
    category: s.category || null, notes: s.notes || null,
  };
}

// ── Purchase Items ──
export function dbToPurchaseItem(r: any): PurchaseItem {
  return {
    productId: r.product_id || '', productName: r.product_name,
    hsn: r.hsn_code || '', qty: r.quantity, unit: r.unit || 'Pcs',
    purchaseRate: r.purchase_rate || 0, discount: r.discount_percent || 0,
    taxableAmount: r.taxable_amount || 0, gstRate: r.gst_rate || 0,
    cgst: r.cgst_amount || 0, sgst: r.sgst_amount || 0,
    igst: r.igst_amount || 0, total: r.total_amount || 0,
    selectedUnit: r.selected_unit || 'loose',
    quantityInCartons: r.quantity_in_cartons || 0,
    quantityInLoose: r.quantity_in_loose || 0,
    totalLooseUnits: r.total_loose_units || 0,
    unitPriceUsed: r.unit_price_used || 0,
    cartonUnitName: r.carton_unit_name,
    piecesPerCarton: r.pieces_per_carton || 1,
  };
}
export function purchaseItemToDb(item: PurchaseItem, purchaseId: string, userId: string) {
  return {
    purchase_id: purchaseId, user_id: userId,
    product_id: item.productId || null, product_name: item.productName,
    hsn_code: item.hsn || null, quantity: item.qty, unit: item.unit || 'Pcs',
    purchase_rate: item.purchaseRate || 0, discount_percent: item.discount || 0,
    taxable_amount: item.taxableAmount || 0, gst_rate: item.gstRate || 0,
    cgst_amount: item.cgst || 0, sgst_amount: item.sgst || 0,
    igst_amount: item.igst || 0, total_amount: item.total || 0,
    selected_unit: item.selectedUnit || 'loose',
    quantity_in_cartons: item.quantityInCartons || 0,
    quantity_in_loose: item.quantityInLoose || 0,
    total_loose_units: item.totalLooseUnits || 0,
    unit_price_used: item.unitPriceUsed || 0,
    carton_unit_name: item.cartonUnitName || null,
    pieces_per_carton: item.piecesPerCarton || 1,
  };
}

// ── Purchases ──
export function dbToPurchase(r: any, items: PurchaseItem[]): Purchase {
  return {
    id: r.id, purchaseNo: r.purchase_no, userId: r.user_id,
    supplierId: r.supplier_id || '', supplierName: r.supplier_name || '',
    supplierGst: r.supplier_gst, supplierInvoiceNo: r.supplier_invoice_no || '',
    date: r.invoice_date, dueDate: r.due_date,
    placeOfSupply: r.place_of_supply, items,
    subtotal: r.subtotal || 0, totalCgst: r.cgst_total || 0,
    totalSgst: r.sgst_total || 0, totalIgst: r.igst_total || 0,
    totalDiscount: r.discount_total || 0, roundOff: 0,
    grandTotal: r.total || 0, amountPaid: r.amount_paid || 0,
    status: (r.payment_status === 'Unpaid' ? 'Unpaid' : r.payment_status) as any,
    isInterState: r.is_inter_state || false,
    notes: r.notes, createdAt: r.created_at,
  };
}
export function purchaseToDb(p: Omit<Purchase, 'id'> & { id?: string }) {
  return {
    ...(p.id ? { id: p.id } : {}),
    purchase_no: p.purchaseNo, user_id: p.userId,
    supplier_id: p.supplierId || null, supplier_name: p.supplierName || null,
    supplier_gst: p.supplierGst || null,
    supplier_invoice_no: p.supplierInvoiceNo || null,
    invoice_date: p.date, due_date: p.dueDate || null,
    place_of_supply: p.placeOfSupply || null,
    subtotal: p.subtotal || 0, cgst_total: p.totalCgst || 0,
    sgst_total: p.totalSgst || 0, igst_total: p.totalIgst || 0,
    discount_total: p.totalDiscount || 0, total: p.grandTotal || 0,
    amount_paid: p.amountPaid || 0, balance_due: (p.grandTotal || 0) - (p.amountPaid || 0),
    payment_status: p.status, is_inter_state: p.isInterState || false,
    notes: p.notes || null,
  };
}

// ── Credit Notes ──
export function dbToCreditNote(r: any, items: InvoiceItem[]): CreditNote {
  return {
    id: r.id, creditNoteNo: r.credit_note_no, userId: r.user_id,
    invoiceId: r.invoice_id || '', invoiceNo: r.invoice_no || '',
    customerId: r.customer_id || '', customerName: r.customer_name || '',
    date: r.credit_note_date, reason: r.reason as any,
    items, subtotal: r.subtotal || 0,
    totalCgst: r.cgst_total || 0, totalSgst: r.sgst_total || 0,
    totalIgst: r.igst_total || 0, netAmount: r.total || 0,
    goodsReturned: r.restock || false, notes: r.notes,
    status: r.status as any, createdAt: r.created_at,
  };
}
export function creditNoteToDb(cn: Omit<CreditNote, 'id'> & { id?: string }) {
  return {
    ...(cn.id ? { id: cn.id } : {}),
    credit_note_no: cn.creditNoteNo, user_id: cn.userId,
    invoice_id: cn.invoiceId || null, invoice_no: cn.invoiceNo || null,
    customer_id: cn.customerId || null, customer_name: cn.customerName || null,
    credit_note_date: cn.date, reason: cn.reason || null,
    subtotal: cn.subtotal || 0, cgst_total: cn.totalCgst || 0,
    sgst_total: cn.totalSgst || 0, igst_total: cn.totalIgst || 0,
    total: cn.netAmount || 0, restock: cn.goodsReturned || false,
    notes: cn.notes || null, status: cn.status || 'Pending',
  };
}

// ── Credit Note Items (reuse InvoiceItem shape) ──
export function dbToCreditNoteItem(r: any): InvoiceItem {
  return {
    productId: r.product_id || '', productName: r.product_name || '',
    hsn: r.hsn_code || '', qty: r.quantity || 0, unit: r.unit || 'Pcs',
    mrp: 0, sellingPrice: r.rate || 0, discount: 0,
    taxableAmount: r.taxable_amount || 0, gstRate: r.gst_rate || 0,
    cgst: r.cgst_amount || 0, sgst: r.sgst_amount || 0,
    igst: r.igst_amount || 0, total: r.total_amount || 0,
  };
}
export function creditNoteItemToDb(item: InvoiceItem, creditNoteId: string, userId: string) {
  return {
    credit_note_id: creditNoteId, user_id: userId,
    product_id: item.productId || null, product_name: item.productName,
    hsn_code: item.hsn || null, quantity: item.qty, unit: item.unit || 'Pcs',
    rate: item.sellingPrice || 0, taxable_amount: item.taxableAmount || 0,
    gst_rate: item.gstRate || 0, cgst_amount: item.cgst || 0,
    sgst_amount: item.sgst || 0, igst_amount: item.igst || 0,
    total_amount: item.total || 0,
  };
}

// ── Debit Notes ──
export function dbToDebitNote(r: any): DebitNote {
  return {
    id: r.id, debitNoteNo: r.debit_note_no, userId: r.user_id,
    type: r.debit_note_type as any || 'customer',
    customerId: r.customer_id, customerName: r.customer_name,
    supplierId: r.supplier_id, supplierName: r.supplier_name,
    invoiceNo: r.reference_invoice, date: r.debit_note_date,
    reason: r.reason as any, description: r.description,
    amount: r.amount || 0, gstRate: r.gst_rate || 0,
    cgst: r.cgst_total || 0, sgst: r.sgst_total || 0,
    igst: r.igst_total || 0, netAmount: r.total || 0,
    notes: r.notes, status: r.status as any,
    createdAt: r.created_at,
  };
}
export function debitNoteToDb(dn: Omit<DebitNote, 'id'> & { id?: string }) {
  return {
    ...(dn.id ? { id: dn.id } : {}),
    debit_note_no: dn.debitNoteNo, user_id: dn.userId,
    debit_note_type: dn.type || null,
    customer_id: dn.customerId || null, customer_name: dn.customerName || null,
    supplier_id: dn.supplierId || null, supplier_name: dn.supplierName || null,
    reference_invoice: dn.invoiceNo || null, debit_note_date: dn.date,
    reason: dn.reason || null, description: dn.description || null,
    amount: dn.amount || 0, gst_rate: dn.gstRate || 0,
    cgst_total: dn.cgst || 0, sgst_total: dn.sgst || 0,
    igst_total: dn.igst || 0, total: dn.netAmount || 0,
    notes: dn.notes || null, status: dn.status || 'Pending',
  };
}

// ── Bank Accounts ──
export function dbToBankAccount(r: any): BankAccount {
  return {
    id: r.id, userId: r.user_id, bankName: r.bank_name,
    accountHolderName: r.account_holder, accountNumber: r.account_number,
    ifscCode: r.ifsc_code, branchName: r.branch,
    accountType: (r.account_type || 'Current') as any,
    upiId: r.upi_id, isDefault: r.is_default || false,
    displayLabel: r.display_label,
  };
}
export function bankAccountToDb(a: Omit<BankAccount, 'id'> & { id?: string }) {
  return {
    ...(a.id ? { id: a.id } : {}),
    user_id: a.userId, bank_name: a.bankName,
    account_holder: a.accountHolderName, account_number: a.accountNumber,
    ifsc_code: a.ifscCode, branch: a.branchName || null,
    account_type: a.accountType || 'Current',
    upi_id: a.upiId || null, is_default: a.isDefault || false,
    display_label: a.displayLabel || null,
  };
}
