import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { getSubscriptionStatus } from '@/types';
import {
  LayoutDashboard, MessageSquare, Users, Package, FileText, UserCog, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, BarChart3, Menu, ShoppingCart,
  Factory, FileDown, FileMinus, Globe, Wallet, BookOpen, ClipboardList,
  Truck, RotateCcw, Receipt, Calculator, DollarSign, Boxes, AlertTriangle,
  UserPlus, Activity, Banknote
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Language } from '@/types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const LANG_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: 'EN' },
  { value: 'hi', label: 'हिंदी', flag: 'हिं' },
  { value: 'gu', label: 'ગુજરાતી', flag: 'ગુ' },
  { value: 'hinglish', label: 'Hinglish', flag: 'HI' },
];

interface NavItem {
  id: string;
  label: string;
  icon: any;
  emoji: string;
  comingSoon?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: any;
  emoji: string;
  items: NavItem[];
  directLink?: boolean;
}

const STORAGE_KEY = 'billsaathi-sidebar-sections';

function getSavedSections(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function saveSectionState(state: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function AppSidebar({ activeTab, setActiveTab, collapsed, setCollapsed }: SidebarProps) {
  const { session, getCurrentUser, getCurrentEmployee, logout, users, employees } = useApp();
  const { t, lang, setLang } = useLanguage();
  const isMobile = useIsMobile();
  const user = getCurrentUser();
  const employee = getCurrentEmployee();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Build sections based on role
  const adminSections: NavSection[] = [
    { id: 'admin', label: t('nav.admin'), icon: LayoutDashboard, emoji: '👑', items: [
      { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, emoji: '📊' },
      { id: 'users', label: t('nav.users'), icon: Users, emoji: '👥' },
      { id: 'user-invoices', label: t('nav.invoices'), icon: FileText, emoji: '🧾' },
    ]},
  ];

  const userSections: NavSection[] = [
    { id: 'overview', label: t('nav.overview'), icon: LayoutDashboard, emoji: '📊', items: [
      { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, emoji: '📊' },
      { id: 'chatbot', label: t('nav.invoice'), icon: MessageSquare, emoji: '🤖' },
    ]},
    { id: 'sales', label: t('nav.sales'), icon: ShoppingCart, emoji: '🛒', items: [
      { id: 'invoices', label: t('nav.invoices'), icon: FileText, emoji: '🧾' },
      { id: 'quotations', label: t('nav.quotations'), icon: ClipboardList, emoji: '📋' },
      { id: 'customers', label: t('nav.parties'), icon: Users, emoji: '👥' },
      { id: 'delivery-challan', label: t('nav.deliveryChallan'), icon: Truck, emoji: '🚚' },
      { id: 'sales-return', label: t('nav.salesReturn'), icon: RotateCcw, emoji: '↩️' },
    ]},
    { id: 'purchase', label: t('nav.purchase'), icon: Truck, emoji: '🚚', items: [
      { id: 'purchases', label: t('nav.purchases'), icon: ShoppingCart, emoji: '🛒' },
      { id: 'suppliers', label: t('nav.suppliers'), icon: Factory, emoji: '🏭' },
      { id: 'purchase-return', label: t('nav.purchaseReturn'), icon: RotateCcw, emoji: '↩️' },
    ]},
    { id: 'inventory', label: t('nav.inventory'), icon: Boxes, emoji: '📦', items: [
      { id: 'products', label: t('nav.products'), icon: Package, emoji: '📦' },
      { id: 'stock-ledger', label: t('nav.stockLedger'), icon: ClipboardList, emoji: '📋' },
      { id: 'low-stock', label: t('nav.lowStockAlerts'), icon: AlertTriangle, emoji: '⚠️' },
    ]},
    { id: 'accounting', label: t('nav.accounting'), icon: Calculator, emoji: '🧮', items: [
      { id: 'payments', label: t('nav.payments'), icon: Wallet, emoji: '💰' },
      { id: 'expenses', label: t('nav.expenses'), icon: DollarSign, emoji: '💸' },
      { id: 'bank-ledger', label: t('nav.bankLedger'), icon: Banknote, emoji: '🏦' },
      { id: 'daily-ledger', label: t('nav.dailyLedger'), icon: BookOpen, emoji: '📒' },
      { id: 'credit-notes', label: t('nav.creditNotes'), icon: FileDown, emoji: '📄' },
      { id: 'debit-notes', label: t('nav.debitNotes'), icon: FileMinus, emoji: '📋' },
      { id: 'payment-receipt', label: t('nav.paymentReceipt'), icon: Receipt, emoji: '🧾' },
    ]},
    { id: 'staff', label: t('nav.staff'), icon: UserCog, emoji: '👷', items: [
      { id: 'employees', label: t('nav.employees'), icon: UserCog, emoji: '👷' },
      { id: 'partners', label: t('nav.partners'), icon: UserPlus, emoji: '🤝' },
      { id: 'salary', label: t('nav.salaryManagement'), icon: Banknote, emoji: '💵' },
      { id: 'staff-activity', label: t('nav.activityLog'), icon: Activity, emoji: '📝' },
    ]},
    { id: 'reports', label: t('nav.reports'), icon: BarChart3, emoji: '📈', items: [
      { id: 'reports', label: t('nav.allReports'), icon: BarChart3, emoji: '📈' },
    ]},
    { id: 'settings-section', label: t('nav.settings'), icon: Settings, emoji: '⚙️', directLink: true, items: [
      { id: 'settings', label: t('nav.settings'), icon: Settings, emoji: '⚙️' },
    ]},
  ];

  const empPerms = employee?.permissions;
  const employeeSections: NavSection[] = [
    { id: 'work', label: t('nav.work'), icon: LayoutDashboard, emoji: '💼', items: [
      ...(empPerms?.createInvoice !== false ? [{ id: 'chatbot', label: t('nav.invoice'), icon: MessageSquare, emoji: '🤖' }] : []),
      ...(empPerms?.addCustomer !== false ? [{ id: 'customers', label: t('nav.parties'), icon: Users, emoji: '👥' }] : []),
      ...(empPerms?.addProduct !== false || empPerms?.viewStock ? [{ id: 'products', label: t('nav.products'), icon: Package, emoji: '📦' }] : []),
      ...(empPerms?.viewPurchases ? [{ id: 'purchases', label: t('nav.purchases'), icon: ShoppingCart, emoji: '🛒' }] : []),
      ...(empPerms?.addPayment ? [{ id: 'payments', label: t('nav.payments'), icon: Wallet, emoji: '💰' }] : []),
      ...(empPerms?.viewReports ? [{ id: 'reports', label: t('nav.reports'), icon: BarChart3, emoji: '📈' }] : []),
    ]},
  ];

  const sections = session.role === 'admin' ? adminSections : session.role === 'user' ? userSections : employeeSections;

  // Find which section contains the active tab
  const findActiveSection = useCallback(() => {
    for (const s of sections) {
      if (s.items.some(i => i.id === activeTab)) return s.id;
    }
    return sections[0]?.id || '';
  }, [activeTab, sections]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const saved = getSavedSections();
    const activeSec = '';
    // Open the section containing active tab by default
    return { ...saved };
  });

  // Ensure active section is always open
  useEffect(() => {
    const activeSec = findActiveSection();
    if (activeSec && !openSections[activeSec]) {
      setOpenSections(prev => {
        const next = { ...prev, [activeSec]: true };
        saveSectionState(next);
        return next;
      });
    }
  }, [activeTab, findActiveSection]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      saveSectionState(next);
      return next;
    });
  };

  const parentUser = session.role === 'employee' ? users.find(u => u.id === session.userId) : undefined;
  let subInfo: ReturnType<typeof getSubscriptionStatus> | null = null;
  if (session.role === 'user' && user) subInfo = getSubscriptionStatus(user.subscriptionEnd);
  if (session.role === 'employee' && parentUser) subInfo = getSubscriptionStatus(parentUser.subscriptionEnd);

  const currentName = session.role === 'admin' ? 'Super Admin' : session.role === 'user' ? (user?.firmName || '') : (employee?.name || '');
  const roleLabel = session.role === 'admin' ? '👑 Admin' : session.role === 'user' ? '🏢 Owner' : '👷 Employee';

  // ── MOBILE ──
  if (isMobile) {
    // Flat list for bottom nav (first 4 important items)
    const allItems = sections.flatMap(s => s.items.filter(i => !i.comingSoon));
    const primaryLinks = allItems.slice(0, 4);

    return (
      <>
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-sidebar text-sidebar-foreground px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileDrawerOpen(true)} className="p-1">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display font-bold text-sm">🧾 BillSaathi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {LANG_OPTIONS.map(l => (
                <button key={l.value} onClick={() => setLang(l.value)} className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${lang === l.value ? 'bg-primary text-primary-foreground' : 'bg-sidebar-accent/50 text-sidebar-foreground/70'}`}>{l.flag}</button>
              ))}
            </div>
            {subInfo && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: subInfo.color + '22', color: subInfo.color }}>{subInfo.status === 'expired' ? '⛔' : subInfo.label}</span>}
            <button onClick={logout} className="text-sidebar-muted hover:text-sidebar-foreground"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="bottom-nav">
          {primaryLinks.map(link => (
            <button key={link.id} onClick={() => { setActiveTab(link.id); setMobileDrawerOpen(false); }} className={`bottom-nav-item ${activeTab === link.id ? 'active' : ''}`}>
              <span className="text-base">{link.emoji}</span>
              <span className="text-[10px] leading-tight">{link.label}</span>
            </button>
          ))}
          <button onClick={() => setMobileDrawerOpen(true)} className={`bottom-nav-item ${mobileDrawerOpen ? 'active' : ''}`}>
            <Menu className="h-5 w-5" />
            <span className="text-[10px] leading-tight">{t('nav.more')}</span>
          </button>
        </div>

        {/* Full-screen drawer */}
        {mobileDrawerOpen && (
          <>
            <div className="fixed inset-0 bg-foreground/50 z-50" onClick={() => setMobileDrawerOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground overflow-y-auto animate-fade-in">
              <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
                <span className="font-display font-bold text-lg">🧾 BillSaathi</span>
                <button onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded hover:bg-sidebar-accent">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 border-b border-sidebar-border">
                <div className="text-xs text-sidebar-muted">
                  <div className="font-medium text-sidebar-foreground truncate">{currentName}</div>
                  <div>{roleLabel}</div>
                </div>
              </div>

              <nav className="py-2">
                {sections.map(section => (
                  <div key={section.id}>
                    <button
                      onClick={() => {
                        if (section.directLink) {
                          setActiveTab(section.items[0].id);
                          setMobileDrawerOpen(false);
                        } else {
                          toggleSection(section.id);
                        }
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{section.emoji}</span>
                        <span>{section.label}</span>
                      </div>
                      {!section.directLink && (
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openSections[section.id] ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    {!section.directLink && openSections[section.id] && (
                      <div className="pb-1">
                        {section.items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (!item.comingSoon) {
                                setActiveTab(item.id);
                                setMobileDrawerOpen(false);
                              }
                            }}
                            disabled={item.comingSoon}
                            className={`w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm transition-colors ${
                              item.comingSoon ? 'text-sidebar-muted/50 cursor-not-allowed' :
                              activeTab === item.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' :
                              'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                            }`}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                            {item.comingSoon && <span className="ml-auto text-[10px] bg-sidebar-accent/50 text-sidebar-muted px-1.5 py-0.5 rounded">Soon</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>

              <div className="border-t border-sidebar-border p-3 space-y-2">
                <div className="text-[10px] text-sidebar-muted mb-1">{t('nav.language')}</div>
                <div className="flex gap-1">
                  {LANG_OPTIONS.map(l => (
                    <button key={l.value} onClick={() => setLang(l.value)} className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${lang === l.value ? 'bg-primary text-primary-foreground' : 'bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-accent'}`}>{l.flag}</button>
                  ))}
                </div>
                <button onClick={() => { logout(); setMobileDrawerOpen(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-sidebar-accent transition-colors text-sidebar-muted hover:text-sidebar-foreground">
                  <LogOut className="h-3.5 w-3.5" />{t('nav.logout')}
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ── DESKTOP ──
  return (
    <div className={`h-screen flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} shrink-0`}>
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {!collapsed && <span className="font-display font-bold text-lg">🧾 BillSaathi</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-sidebar-accent transition-colors">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-2 border-b border-sidebar-border">
          <div className="text-[10px] text-sidebar-muted mb-1">{t('nav.language')}</div>
          <div className="flex gap-1">
            {LANG_OPTIONS.map(l => (
              <button
                key={l.value}
                onClick={() => setLang(l.value)}
                className={`flex-1 text-[10px] py-1 rounded font-medium transition-colors ${
                  lang === l.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-accent'
                }`}
              >
                {l.flag}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map(section => {
          if (collapsed) {
            // In collapsed mode, show only icons of items
            return section.items.filter(i => !i.comingSoon).map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-full flex items-center justify-center py-2.5 transition-colors ${
                  activeTab === item.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' :
                  'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
              </button>
            ));
          }

          return (
            <div key={section.id} className="mb-0.5">
              <button
                onClick={() => {
                  if (section.directLink) {
                    setActiveTab(section.items[0].id);
                  } else {
                    toggleSection(section.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  section.directLink && activeTab === section.items[0]?.id
                    ? 'text-sidebar-accent-foreground bg-sidebar-accent'
                    : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <section.icon className="h-3.5 w-3.5" />
                  <span>{section.label}</span>
                </div>
                {!section.directLink && (
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${openSections[section.id] ? 'rotate-180' : ''}`} />
                )}
              </button>
              {!section.directLink && openSections[section.id] && (
                <div className="pb-1">
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => !item.comingSoon && setActiveTab(item.id)}
                      disabled={item.comingSoon}
                      className={`w-full flex items-center gap-3 pl-8 pr-4 py-2 text-sm transition-colors ${
                        item.comingSoon ? 'text-sidebar-muted/40 cursor-not-allowed' :
                        activeTab === item.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' :
                        'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.comingSoon && <span className="ml-auto text-[9px] bg-sidebar-accent/50 text-sidebar-muted px-1 py-0.5 rounded">Soon</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {subInfo && (
          <div className={`rounded px-2 py-1.5 text-xs ${collapsed ? 'text-center' : ''}`} style={{ backgroundColor: subInfo.color + '22', color: subInfo.color }}>
            {collapsed ? (subInfo.status === 'expired' ? '⛔' : subInfo.daysLeft <= 7 ? '🔴' : subInfo.daysLeft <= 30 ? '🟡' : '🟢') : subInfo.label}
          </div>
        )}
        {!collapsed && (
          <div className="text-xs text-sidebar-muted">
            <div className="font-medium text-sidebar-foreground truncate">{currentName}</div>
            <div>{roleLabel}</div>
          </div>
        )}
        <button onClick={logout} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-sidebar-accent transition-colors text-sidebar-muted hover:text-sidebar-foreground">
          <LogOut className="h-3.5 w-3.5" />{!collapsed && t('nav.logout')}
        </button>
      </div>
    </div>
  );
}
