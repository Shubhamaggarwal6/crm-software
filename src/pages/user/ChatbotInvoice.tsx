import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatMessage, ChatOption, Customer, Product, InvoiceItem, Invoice, Payment, PaymentMode } from '@/types';
import { Send, Trash2, ArrowLeft, RotateCcw, Minus, Plus, ShoppingBag, Banknote, Smartphone, Building2, Zap, FileText, Calendar, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import ErrorDialog from '@/components/ErrorDialog';
import { downloadInvoicePDF } from '@/services/invoicePdfGenerator';
import ShareButton from '@/components/ShareButton';

type Step = 'start' | 'select-customer' | 'new-customer-name' | 'new-customer-phone' | 'new-customer-gst' | 'new-customer-address' | 'confirm-customer' | 'vehicle' | 'select-product' | 'select-unit' | 'enter-selling-price' | 'enter-discount' | 'enter-qty' | 'more-products' | 'invoice-discount' | 'inv-discount-value' | 'inv-discount-timing' | 'other-charges' | 'charge-name' | 'charge-amount' | 'charge-gst' | 'more-charges' | 'payment-mode' | 'payment-ref' | 'payment-bank' | 'payment-full-or-partial' | 'payment-amount' | 'payment-due-date' | 'review' | 'edit-menu' | 'done';

let msgId = 0;
function createMsg(sender: 'bot' | 'user', text: string, options?: ChatOption[]): ChatMessage {
  return { id: `m${++msgId}`, sender, text, options };
}

const STEP_LABELS = ['Customer', 'Vehicle', 'Products', 'Discount', 'Payment', 'Review'];

function getStepIndex(step: Step): number {
  if (['start', 'select-customer', 'new-customer-name', 'new-customer-phone', 'new-customer-gst', 'new-customer-address', 'confirm-customer'].includes(step)) return 0;
  if (step === 'vehicle') return 1;
  if (['select-product', 'select-unit', 'enter-selling-price', 'enter-discount', 'enter-qty', 'more-products'].includes(step)) return 2;
  if (['invoice-discount', 'inv-discount-value', 'inv-discount-timing', 'other-charges', 'charge-name', 'charge-amount', 'charge-gst', 'more-charges'].includes(step)) return 3;
  if (['payment-mode', 'payment-ref', 'payment-bank', 'payment-full-or-partial', 'payment-amount', 'payment-due-date'].includes(step)) return 4;
  return 5;
}

const PAYMENT_MODES = [
  { mode: 'Cash', icon: '💵', label: 'Cash', desc: 'Instant cash payment', IconComp: Banknote },
  { mode: 'UPI', icon: '📱', label: 'UPI', desc: 'GPay, PhonePe, Paytm', IconComp: Smartphone },
  { mode: 'NEFT', icon: '🏦', label: 'NEFT', desc: '2-4 hours transfer', IconComp: Building2 },
  { mode: 'RTGS', icon: '🏛️', label: 'RTGS', desc: 'Above ₹2 lakh instant', IconComp: Building2 },
  { mode: 'IMPS', icon: '⚡', label: 'IMPS', desc: 'Instant bank transfer', IconComp: Zap },
  { mode: 'Credit', icon: '📅', label: 'Credit / Due', desc: 'Payment later', IconComp: Calendar },
] as const;

export default function ChatbotInvoice() {
  const { session, customers, products, addCustomer, addInvoice, addPayment, getNextReceiptNo, getCurrentUser, getCurrentEmployee, invoices, payments, bankAccounts } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const user = getCurrentUser();

  const [messages, setMessages] = useState<ChatMessage[]>([createMsg('bot', t('chat.greeting'), [{ label: t('chat.newCustomer'), value: 'new' }, { label: t('chat.existingCustomer'), value: 'existing' }])]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState<Step>('start');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [typing, setTyping] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCust, setNewCust] = useState({ name: '', phone: '', gst: '', address: '' });
  const [vehicleNo, setVehicleNo] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [currentSellingPrice, setCurrentSellingPrice] = useState(0);
  const [currentDiscount, setCurrentDiscount] = useState(0);
  const [currentSelectedUnit, setCurrentSelectedUnit] = useState<'loose' | 'carton'>('loose');
  const [paymentMode, setPaymentMode] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentBankId, setPaymentBankId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState<any>(null);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string; details?: string[]; highlightFields?: string[] }>({ open: false, message: '' });

  // Discount & charges state for chatbot
  const [chatInvDiscountType, setChatInvDiscountType] = useState<'none' | 'before_tax' | 'after_tax'>('none');
  const [chatInvDiscountAmount, setChatInvDiscountAmount] = useState(0);
  const [chatOtherCharges, setChatOtherCharges] = useState<{ name: string; amount: number; withGst: boolean; gstRate: number }[]>([]);
  const [currentCharge, setCurrentCharge] = useState({ name: '', amount: 0, withGst: false, gstRate: 18 });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userBanks = bankAccounts.filter(a => a.userId === session.userId);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { if (!['review', 'edit-menu', 'done', 'payment-mode', 'payment-full-or-partial'].includes(step)) inputRef.current?.focus(); }, [step]);

  const userCustomers = customers.filter(c => c.userId === session.userId);
  const userProducts = products.filter(p => p.userId === session.userId);

  const addMsg = (sender: 'bot' | 'user', text: string, options?: ChatOption[]) => {
    if (sender === 'bot') {
      setTyping(true);
      setTimeout(() => { setTyping(false); setMessages(prev => [...prev, createMsg(sender, text, options)]); }, 600);
    } else {
      setMessages(prev => [...prev, createMsg(sender, text, options)]);
    }
  };

  const handleOptionClick = (value: string) => {
    if (step === 'start') {
      addMsg('user', value === 'new' ? t('chat.newCustomer') : t('chat.existingCustomer'));
      if (value === 'new') { setStep('new-customer-name'); addMsg('bot', t('chat.customerName')); }
      else { setStep('select-customer'); addMsg('bot', t('chat.customerName')); }
    } else if (step === 'select-unit') {
      // Unit selection for 'both' type products
      addMsg('user', value === 'carton' ? `📦 ${currentProduct?.cartonUnitName || 'Carton'} selected` : `🔹 ${currentProduct?.unit || 'Pcs'} selected`);
      setCurrentSelectedUnit(value as 'loose' | 'carton');
      if (value === 'carton') {
        setCurrentSellingPrice(currentProduct?.cartonSellingPrice || currentProduct?.price || 0);
        setStep('enter-selling-price');
        addMsg('bot', `Rate: ₹${currentProduct?.cartonSellingPrice}/${currentProduct?.cartonUnitName || 'Carton'}. Change karein ya Enter karein:`);
      } else {
        setCurrentSellingPrice(currentProduct?.price || 0);
        setStep('enter-selling-price');
        addMsg('bot', `Rate: ₹${currentProduct?.price}/${currentProduct?.unit}. Change karein ya Enter karein:`);
      }
    } else if (step === 'more-products') {
      addMsg('user', value === 'yes' ? t('chat.yesMore') : t('chat.noCreateInvoice'));
      if (value === 'yes') { setStep('select-product'); addMsg('bot', t('chat.productName')); }
      else {
        // Go to discount step instead of payment
        setStep('invoice-discount');
        addMsg('bot', '🏷️ Koi invoice-level discount dena hai?', [
          { label: 'No Discount', value: 'none' },
          { label: 'Add Discount', value: 'add' },
        ]);
      }
    } else if (step === 'invoice-discount') {
      addMsg('user', value === 'none' ? 'No Discount' : 'Add Discount');
      if (value === 'none') {
        setChatInvDiscountType('none');
        setStep('other-charges');
        addMsg('bot', '📦 Koi extra charges add karne hain jaise freight ya packing?', [
          { label: 'No Extra Charges', value: 'none' },
          { label: 'Add Charges', value: 'add' },
        ]);
      } else {
        addMsg('bot', 'Discount amount enter karein (₹):');
        setStep('inv-discount-value');
      }
    } else if (step === 'inv-discount-timing') {
      addMsg('user', value);
      setChatInvDiscountType(value as any);
      setStep('other-charges');
      addMsg('bot', '📦 Koi extra charges add karne hain jaise freight ya packing?', [
        { label: 'No Extra Charges', value: 'none' },
        { label: 'Add Charges', value: 'add' },
      ]);
    } else if (step === 'other-charges') {
      addMsg('user', value === 'none' ? 'No Extra Charges' : 'Add Charges');
      if (value === 'none') { setStep('payment-mode'); }
      else { addMsg('bot', 'Charge ka naam likhein (e.g. Freight, Packing, Loading):'); setStep('charge-name'); }
    } else if (step === 'charge-gst') {
      addMsg('user', value === 'no' ? 'Without GST' : 'With GST');
      setCurrentCharge(prev => ({ ...prev, withGst: value === 'yes', gstRate: value === 'yes' ? 18 : 0 }));
      const ch = { ...currentCharge, withGst: value === 'yes', gstRate: value === 'yes' ? 18 : 0 };
      const gstAmt = ch.withGst ? ch.amount * ch.gstRate / 100 : 0;
      setChatOtherCharges(prev => [...prev, ch]);
      addMsg('bot', `✅ ${ch.name}: ₹${ch.amount}${ch.withGst ? ` + GST ₹${gstAmt.toFixed(0)}` : ''}\nAur charges add karein?`, [
        { label: 'Add More', value: 'add' },
        { label: 'Done', value: 'none' },
      ]);
      setStep('more-charges');
    } else if (step === 'more-charges') {
      addMsg('user', value === 'add' ? 'Add More' : 'Done');
      if (value === 'add') { addMsg('bot', 'Charge ka naam likhein:'); setStep('charge-name'); }
      else { setStep('payment-mode'); }
    } else if (step === 'confirm-customer') {
      addMsg('user', value === 'yes' ? t('chat.yes') : t('chat.no'));
      if (value === 'yes') { setStep('vehicle'); addMsg('bot', t('chat.vehicleNo')); }
      else { setSelectedCustomer(null); setStep('select-customer'); addMsg('bot', t('chat.customerName')); }
    }
  };

  const handleInput = (value: string) => {
    const v = value.trim();
    switch (step) {
      case 'select-customer': {
        addMsg('user', v);
        const found = userCustomers.find(c => c.name.toLowerCase() === v.toLowerCase() || c.phone === v);
        if (found) {
          setSelectedCustomer(found); setStep('confirm-customer');
          addMsg('bot', `${t('chat.correct')} ${found.name}, ${found.phone}${found.gstNumber ? ', GST: ' + found.gstNumber : ''}`,
            [{ label: t('chat.yes'), value: 'yes' }, { label: t('chat.no'), value: 'no' }]);
        } else addMsg('bot', 'Not found. Try again:');
        break;
      }
      case 'new-customer-name': addMsg('user', v); setNewCust(p => ({ ...p, name: v })); setStep('new-customer-phone'); addMsg('bot', t('chat.phoneNumber')); break;
      case 'new-customer-phone': addMsg('user', v); setNewCust(p => ({ ...p, phone: v })); setStep('new-customer-gst'); addMsg('bot', t('chat.gstNumber')); break;
      case 'new-customer-gst': addMsg('user', v || '(skip)'); setNewCust(p => ({ ...p, gst: v })); setStep('new-customer-address'); addMsg('bot', 'Address? (Enter = skip)'); break;
      case 'new-customer-address': {
        addMsg('user', v || '(skip)');
        const nc = { ...newCust, address: v };
        addCustomer({ userId: session.userId, name: nc.name, phone: nc.phone, gstNumber: nc.gst || undefined, address: nc.address || undefined, createdAt: new Date().toISOString().split('T')[0] });
        setSelectedCustomer({ id: 'temp', userId: session.userId, name: nc.name, phone: nc.phone, gstNumber: nc.gst, address: nc.address, createdAt: '' } as Customer);
        setStep('vehicle'); addMsg('bot', `✅ "${nc.name}" added! ${t('chat.vehicleNo')}`);
        break;
      }
      case 'vehicle': addMsg('user', v || '(skip)'); setVehicleNo(v); setStep('select-product'); addMsg('bot', t('chat.productName')); break;
      case 'select-product': {
        addMsg('user', v);
        const found = userProducts.find(p => p.name.toLowerCase() === v.toLowerCase() || p.hsn === v);
        if (found) {
          setCurrentProduct(found);
          if (found.sellingUnitType === 'both') {
            // Show unit selection step
            setStep('select-unit');
            const ppc = found.piecesPerCarton || 1;
            addMsg('bot', `${found.name} selected! 📦 Carton ya Loose mein bechna hai?`, [
              { label: `📦 ${found.cartonUnitName || 'Carton'} — ₹${found.cartonSellingPrice}/${found.cartonUnitName || 'Ctn'} (${ppc} ${found.unit}/Ctn)`, value: 'carton' },
              { label: `🔹 ${found.unit} — ₹${found.price}/${found.unit}`, value: 'loose' },
            ]);
          } else if (found.sellingUnitType === 'carton') {
            setCurrentSelectedUnit('carton');
            setCurrentSellingPrice(found.cartonSellingPrice || found.price);
            setStep('enter-selling-price');
            addMsg('bot', `${found.name} — ₹${found.cartonSellingPrice || found.price}/${found.cartonUnitName || 'Carton'} (${found.piecesPerCarton || 1} ${found.unit}/Ctn), Stock: ${found.stock} ${found.unit}\nSelling price enter karein (Enter = current):`);
          } else {
            setCurrentSelectedUnit('loose');
            setCurrentSellingPrice(found.price);
            setStep('enter-selling-price');
            addMsg('bot', `${found.name} — MRP: ₹${found.price}/${found.unit}, Stock: ${found.stock}\n${t('chat.sellingPrice')}`);
          }
        } else {
          const matches = userProducts.filter(p => p.name.toLowerCase().includes(v.toLowerCase()) || p.hsn.includes(v)).slice(0, 5);
          if (matches.length > 0) {
            setSuggestions(matches);
            addMsg('bot', `"${v}" exact match nahi mila. Ye dekho matching products 👇 Click karein ya doosra naam likhein.`);
          } else {
            addMsg('bot', `"${v}" nahi mila. Koi aur product name ya HSN try karein.`);
          }
        }
        break;
      }
      case 'enter-selling-price': {
        const defaultPrice = currentSelectedUnit === 'carton' ? (currentProduct?.cartonSellingPrice || currentProduct?.price || 0) : (currentProduct?.price || 0);
        const sp = v ? parseFloat(v) : defaultPrice;
        addMsg('user', `₹${sp}`); setCurrentSellingPrice(sp); setStep('enter-discount'); addMsg('bot', t('chat.discount')); break;
      }
      case 'enter-discount': { const disc = v ? parseFloat(v) : 0; addMsg('user', disc > 0 ? `₹${disc}` : 'No discount'); setCurrentDiscount(disc); setStep('enter-qty');
        const qtyLabel = currentSelectedUnit === 'carton' ? `Kitne ${currentProduct?.cartonUnitName || 'Carton'} chahiye?` : t('chat.quantity');
        addMsg('bot', qtyLabel); break;
      }
      case 'enter-qty': {
        const qty = parseInt(v) || 1;
        addMsg('user', `${qty}`);
        if (currentProduct) {
          const ep = currentSellingPrice - currentDiscount;
          const taxable = ep * qty;
          const isInter = selectedCustomer?.stateCode && user?.stateCode && selectedCustomer.stateCode !== user.stateCode;
          const gstAmt = taxable * (currentProduct.gstRate / 100);
          const ppc = currentProduct.piecesPerCarton || 1;
          const looseQty = currentSelectedUnit === 'carton' ? qty * ppc : qty;
          const unitLabel = currentSelectedUnit === 'carton' ? (currentProduct.cartonUnitName || 'Carton') : currentProduct.unit;
          const item: InvoiceItem = {
            productId: currentProduct.id, productName: currentProduct.name, hsn: currentProduct.hsn,
            qty, unit: unitLabel, mrp: currentProduct.price, sellingPrice: currentSellingPrice,
            discount: currentDiscount * qty, taxableAmount: taxable, gstRate: currentProduct.gstRate,
            cgst: isInter ? 0 : gstAmt / 2, sgst: isInter ? 0 : gstAmt / 2, igst: isInter ? gstAmt : 0,
            total: taxable + gstAmt,
            selectedUnit: currentSelectedUnit,
            piecesPerCarton: ppc,
            cartonUnitName: currentProduct.cartonUnitName || 'Carton',
            quantityInCartons: currentSelectedUnit === 'carton' ? qty : 0,
            quantityInLoose: currentSelectedUnit === 'loose' ? qty : 0,
            totalLooseUnits: looseQty,
            unitPriceUsed: currentSellingPrice,
          };
          setInvoiceItems(prev => [...prev, item]);
          const summary = currentSelectedUnit === 'carton' && ppc > 1
            ? `✅ ${currentProduct.name} — ${qty} ${unitLabel}${qty > 1 ? 's' : ''} (${looseQty} ${currentProduct.unit}) = ₹${item.total.toFixed(0)}`
            : `✅ ${currentProduct.name} x${qty} = ₹${item.total.toFixed(0)}`;
          addMsg('bot', `${summary}\n${t('chat.moreProducts')}`,
            [{ label: t('chat.yesMore'), value: 'yes' }, { label: t('chat.noCreateInvoice'), value: 'no' }]);
          setStep('more-products');
          setCurrentProduct(null); setCurrentDiscount(0); setCurrentSelectedUnit('loose');
        }
        break;
      }
      case 'payment-ref': {
        addMsg('user', v || '(skip)');
        setPaymentRef(v);
        // If mode needs bank selection
        if (['UPI', 'NEFT', 'RTGS', 'IMPS'].includes(paymentMode || '')) {
          if (userBanks.length === 1) {
            setPaymentBankId(userBanks[0].id);
            setStep('payment-full-or-partial');
          } else if (userBanks.length > 1) {
            setStep('payment-bank');
            addMsg('bot', 'Kis account mein aaya payment?');
          } else {
            setStep('payment-full-or-partial');
          }
        } else {
          setStep('payment-full-or-partial');
        }
        break;
      }
      case 'payment-amount': {
        const amt = parseFloat(v) || 0;
        setAmountPaid(amt);
        addMsg('user', `₹${amt}`);
        addMsg('bot', `Partial payment ₹${amt.toLocaleString('en-IN')} noted. Balance: ₹${(grandTotal - amt).toLocaleString('en-IN')}`);
        setStep('review');
        break;
      }
      case 'payment-due-date': {
        addMsg('user', v || '(skip)');
        setDueDate(v);
        setStep('review');
        break;
      }
      case 'inv-discount-value': {
        const amt = parseFloat(v) || 0;
        addMsg('user', `₹${amt}`);
        setChatInvDiscountAmount(amt);
        addMsg('bot', 'Discount kab apply karein?', undefined);
        setStep('inv-discount-timing');
        // Show options via handleOptionClick
        setTimeout(() => addMsg('bot', 'Before Tax ya After Tax?', [
          { label: 'Before Tax', value: 'before_tax' },
          { label: 'After Tax', value: 'after_tax' },
        ]), 100);
        break;
      }
      case 'charge-name': {
        addMsg('user', v);
        setCurrentCharge(prev => ({ ...prev, name: v }));
        addMsg('bot', `"${v}" ka amount enter karein (₹):`);
        setStep('charge-amount');
        break;
      }
      case 'charge-amount': {
        const amt = parseFloat(v) || 0;
        addMsg('user', `₹${amt}`);
        setCurrentCharge(prev => ({ ...prev, amount: amt }));
        addMsg('bot', 'Is charge pe GST lagega?', [
          { label: 'Without GST', value: 'no' },
          { label: 'With GST (18%)', value: 'yes' },
        ]);
        setStep('charge-gst');
        break;
      }
      // Removed new product flow cases
    }
    setInput(''); setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); handleInput(input); } };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (step === 'select-customer' && val.length >= 1) {
      setSuggestions(userCustomers.filter(c => c.name.toLowerCase().includes(val.toLowerCase()) || c.phone.includes(val)).slice(0, 5));
    } else if (step === 'select-product' && val.length >= 1) {
      setSuggestions(userProducts.filter(p => p.name.toLowerCase().includes(val.toLowerCase()) || p.hsn.includes(val)).slice(0, 5));
    } else setSuggestions([]);
  };

  const handleSuggestionClick = (item: any) => {
    if (step === 'select-customer') {
      setSelectedCustomer(item); setInput(''); setSuggestions([]);
      addMsg('user', item.name); setStep('confirm-customer');
      addMsg('bot', `${t('chat.correct')} ${item.name}, ${item.phone}${item.gstNumber ? ', GST: ' + item.gstNumber : ''}`,
        [{ label: t('chat.yes'), value: 'yes' }, { label: t('chat.no'), value: 'no' }]);
    } else if (step === 'select-product') {
      setCurrentProduct(item); setInput(''); setSuggestions([]);
      addMsg('user', item.name);
      if (item.sellingUnitType === 'both') {
        setStep('select-unit');
        const ppc = item.piecesPerCarton || 1;
        addMsg('bot', `${item.name} selected! 📦 Carton ya Loose?`, [
          { label: `📦 ${item.cartonUnitName || 'Carton'} — ₹${item.cartonSellingPrice}/${item.cartonUnitName || 'Ctn'} (${ppc} ${item.unit}/Ctn)`, value: 'carton' },
          { label: `🔹 ${item.unit} — ₹${item.price}/${item.unit}`, value: 'loose' },
        ]);
      } else if (item.sellingUnitType === 'carton') {
        setCurrentSelectedUnit('carton');
        setCurrentSellingPrice(item.cartonSellingPrice || item.price);
        setStep('enter-selling-price');
        addMsg('bot', `${item.name} — ₹${item.cartonSellingPrice || item.price}/${item.cartonUnitName || 'Carton'}\nSelling price enter karein (Enter = current):`);
      } else {
        setCurrentSelectedUnit('loose');
        setCurrentSellingPrice(item.price);
        setStep('enter-selling-price');
        addMsg('bot', `${item.name} — MRP: ₹${item.price}/${item.unit}, Stock: ${item.stock}\n${t('chat.sellingPrice')}`);
      }
    }
  };

  const handlePaymentModeSelect = (mode: string) => {
    setPaymentMode(mode);
    addMsg('user', mode);

    if (mode === 'Credit') {
      // Credit/Due — ask for due date
      setAmountPaid(0);
      addMsg('bot', 'Due date set karein (optional). Enter date or skip:');
      setStep('payment-due-date');
    } else if (mode === 'Cash') {
      addMsg('bot', 'Cash payment noted. Koi reference chahiye? (Enter = skip)');
      setStep('payment-ref');
    } else if (mode === 'UPI') {
      addMsg('bot', 'UPI Transaction ID enter karein (optional, Enter = skip):');
      setStep('payment-ref');
    } else if (mode === 'NEFT') {
      addMsg('bot', 'UTR Number enter karein (optional, Enter = skip):');
      setStep('payment-ref');
    } else if (mode === 'RTGS') {
      addMsg('bot', 'UTR Number enter karein (required for RTGS):');
      setStep('payment-ref');
    } else if (mode === 'IMPS') {
      addMsg('bot', 'IMPS Reference Number enter karein (optional, Enter = skip):');
      setStep('payment-ref');
    }
  };

  const handleBankSelect = (bankId: string) => {
    setPaymentBankId(bankId);
    const bank = userBanks.find(b => b.id === bankId);
    addMsg('user', bank?.displayLabel || bank?.bankName || 'Bank selected');
    setStep('payment-full-or-partial');
  };

  const handleFullOrPartial = (type: 'full' | 'partial') => {
    if (type === 'full') {
      setAmountPaid(grandTotal);
      addMsg('user', 'Full Payment');
      addMsg('bot', `✅ Full payment of ₹${grandTotal.toLocaleString('en-IN')} received. Invoice will be marked as Paid.`);
      setStep('review');
    } else {
      addMsg('user', 'Partial Payment');
      addMsg('bot', `Kitna amount mila? (Invoice total: ₹${grandTotal.toLocaleString('en-IN')})`);
      setStep('payment-amount');
    }
  };

  const confirmInvoice = () => {
    // Validation with user-friendly errors
    const errors: string[] = [];
    const fields: string[] = [];
    if (!selectedCustomer) { errors.push('Customer select nahi hua hai'); fields.push('Customer'); }
    if (invoiceItems.length === 0) { errors.push('Koi product add nahi kiya hai'); fields.push('Products'); }
    if (!user) { errors.push('Aapki profile load nahi hui. Page refresh karein'); fields.push('Profile'); }
    
    if (errors.length > 0) {
      setErrorDialog({
        open: true,
        message: 'Invoice save nahi ho sakta. Neeche diye gaye issues fix karein:',
        details: errors,
        highlightFields: fields,
      });
      return;
    }
    const subtotal = invoiceItems.reduce((s, i) => s + i.taxableAmount, 0);
    const totalCgst = invoiceItems.reduce((s, i) => s + i.cgst, 0);
    const totalSgst = invoiceItems.reduce((s, i) => s + i.sgst, 0);
    const totalIgst = invoiceItems.reduce((s, i) => s + i.igst, 0);
    const totalDiscount = invoiceItems.reduce((s, i) => s + i.discount, 0);
    const raw = subtotal + totalCgst + totalSgst + totalIgst;
    const rounded = Math.round(raw);
    const roundOff = +(rounded - raw).toFixed(2);
    const userInvCount = invoices.filter(i => i.userId === session.userId).length;
    const invoiceNo = `${user.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${String(userInvCount + 1).padStart(4, '0')}`;
    const emp = getCurrentEmployee ? getCurrentEmployee() : undefined;
    
    const finalStatus: 'Paid' | 'Partial' | 'Pending' = 
      paymentMode === 'Credit' ? 'Pending' : 
      amountPaid >= rounded ? 'Paid' : 
      amountPaid > 0 ? 'Partial' : 'Pending';

    const invId = `inv-${Date.now()}`;
    
    const invoiceData = {
      invoiceNo, userId: session.userId, date: new Date().toISOString().split('T')[0],
      customerId: selectedCustomer.id, customerName: selectedCustomer.name,
      customerGst: selectedCustomer.gstNumber, customerPhone: selectedCustomer.phone,
      customerAddress: selectedCustomer.address, customerState: selectedCustomer.state,
      customerStateCode: selectedCustomer.stateCode, vehicleNo,
      items: invoiceItems, subtotal, totalCgst, totalSgst, totalIgst, totalDiscount,
      roundOff, grandTotal: rounded, status: finalStatus,
      paymentMode: paymentMode && paymentMode !== 'Credit' ? paymentMode as PaymentMode : undefined,
      amountPaid: amountPaid || undefined,
      createdBy: { id: session.employeeId || session.userId, name: session.role === 'employee' && emp ? emp.name : user.firmName, role: session.role as any, timestamp: new Date().toISOString() },
      isInterState: totalIgst > 0,
    };
    
    addInvoice(invoiceData);
    setLastCreatedInvoice(invoiceData);

    // Auto-create payment record if amount received > 0
    if (amountPaid > 0 && paymentMode && paymentMode !== 'Credit') {
      const receiptNo = getNextReceiptNo();
      const selectedBank = userBanks.find(b => b.id === paymentBankId);
      addPayment({
        receiptNo, userId: session.userId, customerId: selectedCustomer.id,
        invoiceNo, amount: amountPaid, date: new Date().toISOString().split('T')[0],
        mode: paymentMode as any,
        bankName: selectedBank?.bankName,
        reference: paymentRef || undefined,
        utrNumber: ['NEFT', 'RTGS'].includes(paymentMode) ? paymentRef : undefined,
        upiTransactionId: paymentMode === 'UPI' ? paymentRef : undefined,
        impsRefNo: paymentMode === 'IMPS' ? paymentRef : undefined,
      });
    }

    setStep('done');
  };

  const resetChat = () => {
    msgId = 0;
    setMessages([createMsg('bot', t('chat.greeting'), [{ label: t('chat.newCustomer'), value: 'new' }, { label: t('chat.existingCustomer'), value: 'existing' }])]);
    setStep('start'); setSelectedCustomer(null); setInvoiceItems([]); setVehicleNo('');
    setNewCust({ name: '', phone: '', gst: '', address: '' }); setInput(''); setSuggestions([]);
    setPaymentMode(null); setAmountPaid(0); setPaymentRef(''); setPaymentBankId(''); setDueDate(''); setLastCreatedInvoice(null); setCurrentSelectedUnit('loose');
  };

  const grandTotal = Math.round(invoiceItems.reduce((s, i) => s + i.total, 0));
  const subtotal = invoiceItems.reduce((s, i) => s + i.taxableAmount, 0);
  const totalGst = invoiceItems.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
  const currentStepIdx = getStepIndex(step);

  const getPlaceholder = () => {
    switch (step) {
      case 'select-customer': return '🔍 Customer name or phone...';
      case 'new-customer-gst': case 'new-customer-address': case 'vehicle': return 'Type or Enter = skip';
      case 'enter-qty': return currentSelectedUnit === 'carton' ? `🔢 ${currentProduct?.cartonUnitName || 'Cartons'}...` : '🔢 Quantity...';
      case 'enter-selling-price': return '💰 Selling price ₹ (Enter=current)';
      case 'enter-discount': return '🏷️ Discount ₹ (Enter=0)';
      case 'select-product': return '📦 Product name or HSN...';
      case 'payment-amount': return '💵 Amount received ₹...';
      case 'payment-ref': return '🔗 Reference / Transaction ID...';
      case 'payment-due-date': return '📅 YYYY-MM-DD or Enter = skip';
      default: return '✍️ Type here...';
    }
  };

  const showChat = !['review', 'edit-menu', 'done', 'payment-mode', 'payment-full-or-partial', 'payment-bank', 'invoice-discount', 'inv-discount-timing', 'charge-gst', 'more-charges', 'other-charges', 'select-unit'].includes(step);
  const showInput = showChat && !['start', 'more-products', 'confirm-customer'].includes(step);

  // Live Invoice Panel
  const InvoicePanel = () => (
    <div className={cn(
      "bg-card border rounded-lg shadow-sm overflow-hidden",
      isMobile ? "mb-3" : "w-64 shrink-0"
    )}>
      <div className="bg-gradient-to-r from-primary to-secondary p-3">
        <h3 className="text-xs font-display font-bold text-primary-foreground flex items-center gap-1.5">📋 Invoice in Progress</h3>
        {selectedCustomer && (
          <div className="text-[11px] text-primary-foreground/80 mt-1">{selectedCustomer.name} · {selectedCustomer.phone}</div>
        )}
      </div>
      <div className="p-3">
        {invoiceItems.length > 0 ? (
          <div className="space-y-1.5">
            {invoiceItems.map((item, i) => {
              const isCarton = item.selectedUnit === 'carton' && (item.piecesPerCarton || 1) > 1;
              const looseTotal = isCarton ? item.qty * (item.piecesPerCarton || 1) : item.qty;
              return (
              <div key={i} className="flex justify-between items-center text-xs group">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.productName}</div>
                  <div className="text-muted-foreground">
                    {isCarton 
                      ? `${item.qty} ${item.cartonUnitName || 'Ctn'}${item.qty > 1 ? 's' : ''} (${looseTotal} ${item.unit}) × ₹${item.sellingPrice}`
                      : `${item.qty} × ₹${item.sellingPrice}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono font-bold">₹{item.total.toFixed(0)}</span>
                  <button onClick={() => setInvoiceItems(p => p.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              );
            })}
            <div className="border-t pt-2 mt-2 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-mono">₹{subtotal.toFixed(0)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>GST</span><span className="font-mono">₹{totalGst.toFixed(0)}</span></div>
              <div className="flex justify-between font-display font-bold text-base border-t pt-1 mt-1"><span>Total</span><span className="text-primary">₹{grandTotal.toLocaleString('en-IN')}</span></div>
              {paymentMode && (
                <div className="flex justify-between text-xs border-t pt-1 mt-1">
                  <span className="text-muted-foreground">Payment</span>
                  <span className={cn("font-medium", paymentMode === 'Credit' ? 'text-destructive' : 'text-green-600')}>
                    {paymentMode === 'Credit' ? '⏳ Due' : amountPaid >= grandTotal ? `✅ ${paymentMode}` : `⚡ Partial ${paymentMode}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <ShoppingBag className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
            <div className="text-xs">Add products to see invoice total</div>
          </div>
        )}
      </div>
    </div>
  );

  // PAYMENT MODE PANEL — 6 cards with icons
  if (step === 'payment-mode') {
    return (
      <div className={`animate-fade-in ${isMobile ? 'pb-16' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-display font-bold">💰 Payment kaise karenge?</h1>
          <button onClick={resetChat} className="text-xs text-destructive hover:underline">🗑️ Cancel</button>
        </div>
        <div className="text-sm mb-4 text-muted-foreground">{t('misc.grandTotal')}: <b className="text-foreground text-lg">₹{grandTotal.toLocaleString('en-IN')}</b></div>
        
        {/* Tax type info chip */}
        {invoiceItems.some(i => i.igst > 0) ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium mb-4">🔵 IGST Applied (Inter-State)</div>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-medium mb-4">🟢 CGST + SGST Applied (Intra-State)</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg">
          {PAYMENT_MODES.map(pm => (
            <button key={pm.mode} onClick={() => handlePaymentModeSelect(pm.mode)} className="hero-card text-center hover:border-primary/30 hover:shadow-md transition-all py-6 group">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{pm.icon}</div>
              <div className="font-display font-bold text-sm">{pm.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{pm.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // BANK SELECTION PANEL
  if (step === 'payment-bank') {
    return (
      <div className={`animate-fade-in ${isMobile ? 'pb-16' : ''}`}>
        <h1 className="text-xl font-display font-bold mb-4">🏦 Kis account mein aaya payment?</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
          {userBanks.map(bank => (
            <button key={bank.id} onClick={() => handleBankSelect(bank.id)}
              className={cn("hero-card text-left hover:border-primary/30 hover:shadow-md transition-all p-4", bank.isDefault && 'border-primary/30')}>
              <div className="font-display font-bold text-sm">{bank.displayLabel || bank.bankName}</div>
              <div className="text-xs text-muted-foreground">{bank.bankName} · XXXX{bank.accountNumber.slice(-4)}</div>
              {bank.isDefault && <span className="text-[10px] text-primary">⭐ Default</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // FULL OR PARTIAL PANEL
  if (step === 'payment-full-or-partial') {
    return (
      <div className={`animate-fade-in ${isMobile ? 'pb-16' : ''}`}>
        <h1 className="text-xl font-display font-bold mb-4">💰 Full payment mila ya partial?</h1>
        <div className="text-sm mb-4 text-muted-foreground">Invoice Total: <b className="text-foreground text-lg">₹{grandTotal.toLocaleString('en-IN')}</b></div>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button onClick={() => handleFullOrPartial('full')} className="hero-card text-center hover:border-green-500/30 hover:shadow-md transition-all py-8 group">
            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">✅</div>
            <div className="font-display font-bold text-sm">Full Payment</div>
            <div className="text-xs text-green-600 mt-1">₹{grandTotal.toLocaleString('en-IN')} received</div>
          </button>
          <button onClick={() => handleFullOrPartial('partial')} className="hero-card text-center hover:border-amber-500/30 hover:shadow-md transition-all py-8 group">
            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
            <div className="font-display font-bold text-sm">Partial Payment</div>
            <div className="text-xs text-amber-600 mt-1">Part amount received</div>
          </button>
        </div>
      </div>
    );
  }

  // REVIEW PANEL
  if (step === 'review') {
    const finalStatus = paymentMode === 'Credit' ? 'Pending' : amountPaid >= grandTotal ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Pending';
    return (
      <div className={`animate-fade-in ${isMobile ? 'pb-16' : ''}`}>
        <h1 className="text-xl font-display font-bold mb-4">📋 Invoice Review</h1>
        <div className="hero-card space-y-4 max-w-2xl" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'0.5\' fill=\'%23ddd\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'40\' height=\'40\' fill=\'url(%23p)\'/%3E%3C/svg%3E")' }}>
          {user && (
            <div className="text-center border-b pb-3">
              <div className="font-display font-bold text-lg">{user.firmName}</div>
              <div className="text-xs text-muted-foreground">{user.address}{user.city ? `, ${user.city}` : ''} | GSTIN: {user.gstNumber}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground font-semibold">Bill To</div><div className="font-bold">{selectedCustomer?.name}</div><div className="text-xs text-muted-foreground">{selectedCustomer?.phone}{selectedCustomer?.gstNumber ? ` | GST: ${selectedCustomer.gstNumber}` : ''}</div></div>
            <div className="text-right"><div className="text-xs text-muted-foreground font-semibold">Details</div><div className="text-xs">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>{vehicleNo && <div className="text-xs">🚗 {vehicleNo}</div>}</div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-muted/50 text-muted-foreground"><th className="py-1.5 px-2 text-left">#</th><th className="py-1.5 px-2 text-left">Product</th><th className="py-1.5 px-2 text-center">Qty</th><th className="py-1.5 px-2 text-right">Rate</th><th className="py-1.5 px-2 text-right">GST</th><th className="py-1.5 px-2 text-right">Amount</th><th className="py-1.5 px-2"></th></tr></thead>
              <tbody>
                {invoiceItems.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 px-2">{i + 1}</td>
                    <td className="py-1.5 px-2 font-medium">{item.productName}<div className="text-muted-foreground">HSN: {item.hsn}</div></td>
                    <td className="py-1.5 px-2 text-center">{item.qty} {item.unit}</td>
                    <td className="py-1.5 px-2 text-right font-mono">₹{item.sellingPrice}{item.discount > 0 ? <div className="text-green-600">-₹{item.discount}</div> : null}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{item.gstRate}%<div className="text-muted-foreground">₹{(item.cgst + item.sgst + item.igst).toFixed(0)}</div></td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold">₹{item.total.toFixed(0)}</td>
                    <td className="py-1.5 px-2"><button onClick={() => setInvoiceItems(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive"><Trash2 className="h-3 w-3" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">₹{subtotal.toFixed(0)}</span></div>
            {invoiceItems.some(i => i.cgst > 0) && <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-mono">₹{invoiceItems.reduce((s, i) => s + i.cgst, 0).toFixed(0)}</span></div>}
            {invoiceItems.some(i => i.sgst > 0) && <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-mono">₹{invoiceItems.reduce((s, i) => s + i.sgst, 0).toFixed(0)}</span></div>}
            {invoiceItems.some(i => i.igst > 0) && <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-mono">₹{invoiceItems.reduce((s, i) => s + i.igst, 0).toFixed(0)}</span></div>}
            <div className="flex justify-between text-xl font-display font-bold border-t pt-2"><span>Grand Total</span><span className="text-primary">₹{grandTotal.toLocaleString('en-IN')}</span></div>
          </div>

          {/* Payment Summary */}
          <div className={cn("rounded-md p-3 border text-sm", 
            finalStatus === 'Paid' ? 'bg-green-50 border-green-200' : 
            finalStatus === 'Partial' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
          )}>
            <div className="font-display font-bold text-sm mb-1">
              {finalStatus === 'Paid' && '✅ Payment Received in Full'}
              {finalStatus === 'Partial' && '⚡ Partial Payment'}
              {finalStatus === 'Pending' && '⏳ Payment Due (Credit)'}
            </div>
            {paymentMode && paymentMode !== 'Credit' && (
              <div className="text-xs space-y-0.5">
                <div>Mode: {paymentMode} {paymentRef && `· Ref: ${paymentRef}`}</div>
                {amountPaid > 0 && amountPaid < grandTotal && (
                  <>
                    <div className="text-green-600">Received: ₹{amountPaid.toLocaleString('en-IN')}</div>
                    <div className="text-destructive">Balance: ₹{(grandTotal - amountPaid).toLocaleString('en-IN')}</div>
                  </>
                )}
              </div>
            )}
            {paymentMode === 'Credit' && dueDate && <div className="text-xs">Due Date: {dueDate}</div>}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={confirmInvoice} className="rounded-md bg-green-600 px-6 py-2.5 text-sm text-white font-medium hover:bg-green-700 transition-colors shadow-md">✅ Confirm & Save</button>
            <button onClick={() => setStep('edit-menu')} className="rounded-md border-2 px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">✏️ Edit Something</button>
            <button onClick={resetChat} className="rounded-md border border-destructive/30 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10">🗑️ Discard</button>
          </div>
        </div>
      </div>
    );
  }

  // EDIT MENU
  if (step === 'edit-menu') {
    return (
      <div className={`animate-fade-in ${isMobile ? 'pb-16' : ''}`}>
        <h1 className="text-xl font-display font-bold mb-4">✏️ {t('action.edit')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
          <button onClick={() => { setSelectedCustomer(null); setStep('select-customer'); addMsg('bot', t('chat.customerName')); }} className="hero-card text-left hover:border-primary/30 hover:shadow-md transition-all">
            <div className="font-medium">👤 Customer</div><div className="text-xs text-muted-foreground">{selectedCustomer?.name}</div>
          </button>
          <button onClick={() => { setStep('vehicle'); addMsg('bot', t('chat.vehicleNo')); }} className="hero-card text-left hover:border-primary/30 hover:shadow-md transition-all">
            <div className="font-medium">🚗 Vehicle</div><div className="text-xs text-muted-foreground">{vehicleNo || 'None'}</div>
          </button>
          <button onClick={() => { setStep('select-product'); addMsg('bot', t('chat.productName')); }} className="hero-card text-left hover:border-primary/30 hover:shadow-md transition-all">
            <div className="font-medium">📦 Add Product</div>
          </button>
          <button onClick={() => setStep('payment-mode')} className="hero-card text-left hover:border-primary/30 hover:shadow-md transition-all">
            <div className="font-medium">💰 Payment Mode</div><div className="text-xs text-muted-foreground">{paymentMode || 'Not set'}</div>
          </button>
          {invoiceItems.length > 0 && (
            <div className="hero-card space-y-2 md:col-span-2">
              <div className="font-medium">🗑️ Remove Items</div>
              {invoiceItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span>{item.productName} x{item.qty}</span>
                  <button onClick={() => setInvoiceItems(prev => prev.filter((_, idx) => idx !== i))} className="text-xs text-destructive hover:underline">{t('action.delete')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setStep('review')} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"><ArrowLeft className="h-3.5 w-3.5 inline mr-1" />{t('action.back')}</button>
          <button onClick={resetChat} className="rounded-md border border-destructive/30 px-4 py-2 text-sm text-destructive">Clear All</button>
        </div>
      </div>
    );
  }

  // DONE
  if (step === 'done') {
    const finalStatus = paymentMode === 'Credit' ? 'Pending' : amountPaid >= grandTotal ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Pending';
    
    const handleDownloadPDF = () => {
      if (!lastCreatedInvoice || !user) return;
      downloadInvoicePDF({ invoice: lastCreatedInvoice, user, payments, bankAccounts });
    };
    
    return (
      <div className={`animate-fade-in text-center py-12 ${isMobile ? 'pb-20' : ''}`}>
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-2xl font-display font-bold mb-2">{t('chat.invoiceCreated')}</h2>
        <p className="text-muted-foreground mb-2">{t('misc.grandTotal')}: <span className="text-primary font-display font-bold text-xl">₹{grandTotal.toLocaleString('en-IN')}</span></p>
        <div className="text-sm text-muted-foreground mb-4">
          {finalStatus === 'Paid' && <span className="text-green-600 font-medium">✅ Payment: {paymentMode} — Full payment recorded</span>}
          {finalStatus === 'Partial' && <span className="text-amber-600 font-medium">⚡ Partial: ₹{amountPaid.toLocaleString('en-IN')} via {paymentMode}</span>}
          {finalStatus === 'Pending' && <span className="text-destructive font-medium">⏳ Payment pending{dueDate ? ` — Due: ${dueDate}` : ''}</span>}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={handleDownloadPDF} className="rounded-md border-2 border-primary px-6 py-3 text-sm text-primary font-display font-bold hover:bg-primary/10 transition-colors flex items-center gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </button>
          {lastCreatedInvoice && (
            <ShareButton
              documentType="invoice"
              documentId={lastCreatedInvoice.id}
              documentNo={lastCreatedInvoice.invoiceNo}
              firmName={user?.firmName || ''}
              amount={lastCreatedInvoice.grandTotal}
              userId={session.userId}
              onDownloadPdf={handleDownloadPDF}
            />
          )}
          <button onClick={resetChat} className="rounded-md bg-gradient-to-r from-primary to-secondary px-8 py-3 text-sm text-primary-foreground font-display font-bold shadow-lg hover:shadow-xl transition-shadow">📋 {t('chat.newInvoice')}</button>
        </div>
      </div>
    );
  }

  // CHAT VIEW
  return (
    <div className={`flex flex-col ${isMobile ? 'h-[calc(100vh-6.5rem)]' : 'h-[calc(100vh-2rem)]'} animate-fade-in`}>
      <div className="bg-gradient-to-r from-primary via-secondary to-primary rounded-t-lg p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
              <span className="text-xl">🤖</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-display font-bold text-primary-foreground">BillSaathi AI</h1>
            <div className="text-[10px] text-primary-foreground/70">
              {selectedCustomer ? `Creating invoice for ${selectedCustomer.name}` : step === 'start' ? 'Ready to create invoice' : 'Setting up...'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full transition-all", i <= currentStepIdx ? 'bg-primary-foreground scale-110' : 'bg-primary-foreground/30')} />
              {!isMobile && <span className={cn("text-[9px]", i <= currentStepIdx ? 'text-primary-foreground' : 'text-primary-foreground/30')}>{label}</span>}
            </div>
          ))}
          <button onClick={resetChat} className="ml-2 p-1.5 rounded-md hover:bg-primary-foreground/20 text-primary-foreground transition-colors"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className={`flex-1 flex ${isMobile ? 'flex-col' : 'gap-0'} min-h-0`}>
        {!isMobile && (selectedCustomer || invoiceItems.length > 0) && (
          <div className="mt-2 mr-3"><InvoicePanel /></div>
        )}
        {isMobile && (selectedCustomer || invoiceItems.length > 0) && (
          <div className="mt-2">
            <button onClick={() => setSummaryOpen(!summaryOpen)} className="w-full text-left text-xs font-display font-bold p-2 bg-accent rounded-md flex justify-between items-center">
              <span>📋 Invoice: {invoiceItems.length} items · ₹{grandTotal.toLocaleString('en-IN')}</span>
              <span>{summaryOpen ? '▲' : '▼'}</span>
            </button>
            {summaryOpen && <InvoicePanel />}
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 bg-muted/30 rounded-b-lg" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <div className="flex-1 overflow-y-auto space-y-3 pb-4 px-3 pt-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {msg.sender === 'bot' ? (
                  <div className="flex items-start gap-2 max-w-[85%] md:max-w-[75%]">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1 shadow-sm"><span className="text-sm">🤖</span></div>
                    <div>
                      <div className="text-[10px] text-primary font-semibold mb-0.5">BillSaathi AI</div>
                      <div className="bg-card border-l-3 border-primary rounded-lg rounded-tl-none p-3 shadow-sm" style={{ borderLeftWidth: '3px' }}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        {msg.options && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {msg.options.map(opt => (
                              <button key={opt.value} onClick={() => handleOptionClick(opt.value)}
                                className={cn("px-4 py-2 rounded-lg border-2 text-xs font-display font-bold transition-all hover:shadow-md",
                                  opt.value === 'yes' || opt.value === 'new' ? 'border-green-500/50 text-green-700 hover:bg-green-50 hover:border-green-500' : 'border-primary/30 text-primary hover:bg-accent hover:border-primary'
                                )}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] md:max-w-[75%]">
                    <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg rounded-tr-none p-3 shadow-sm">
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="flex items-start gap-2 animate-fade-in">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shadow-sm"><span className="text-sm">🤖</span></div>
                <div className="bg-card border-l-3 border-primary rounded-lg rounded-tl-none p-3 shadow-sm" style={{ borderLeftWidth: '3px' }}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="px-3 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestions.map((item: any) => (
                  <button key={item.id} onClick={() => handleSuggestionClick(item)} className="shrink-0 bg-card border rounded-lg px-3 py-2 text-left hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="text-xs font-medium">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground">{item.phone || item.hsn || ''}{item.stock !== undefined ? ` · Stock: ${item.stock}` : ''}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showInput && (
            <div className="p-3 border-t bg-card">
              <div className="flex gap-2">
                <input ref={inputRef} value={input} onChange={e => handleInputChange(e.target.value)} onKeyDown={handleKeyDown} placeholder={getPlaceholder()} className="flex-1 rounded-lg border-2 border-primary/20 bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors" />
                <button onClick={() => handleInput(input)} className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2.5 text-primary-foreground shadow-sm hover:shadow-md transition-shadow"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ErrorDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ open: false, message: '' })}
        message={errorDialog.message}
        details={errorDialog.details}
        highlightFields={errorDialog.highlightFields}
      />
    </div>
  );
}
