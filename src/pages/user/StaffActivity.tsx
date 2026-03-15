import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Search, Filter, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  module: string;
  description: string;
  referenceId?: string;
  referenceNumber?: string;
  createdAt: string;
}

const MODULE_COLORS: Record<string, string> = {
  invoice: 'bg-accent text-accent-foreground',
  payment: 'bg-accent text-accent-foreground',
  customer: 'bg-accent text-accent-foreground',
  product: 'bg-accent text-accent-foreground',
  purchase: 'bg-accent text-accent-foreground',
  employee: 'bg-accent text-accent-foreground',
  settings: 'bg-muted text-muted-foreground',
  expense: 'bg-destructive/10 text-destructive',
  auth: 'bg-secondary/10 text-secondary',
};

const ACTION_EMOJIS: Record<string, string> = {
  create: '➕', update: '✏️', delete: '🗑️', login: '🔑', logout: '👋',
  status_change: '🔄', export: '📤', print: '🖨️',
};

export default function StaffActivityPage() {
  const { session } = useApp();
  const userId = session.userId;

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchLogs(); }, [userId]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setLogs((data || []).map((r: any) => ({
        id: r.id,
        actorId: r.actor_id,
        actorName: r.actor_name,
        actorRole: r.actor_role,
        actionType: r.action_type,
        module: r.module,
        description: r.description,
        referenceId: r.reference_id,
        referenceNumber: r.reference_number,
        createdAt: r.created_at,
      })));
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  const modules = [...new Set(logs.map(l => l.module))].sort();

  const filtered = logs.filter(l => {
    if (moduleFilter !== 'all' && l.module !== moduleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.description.toLowerCase().includes(q) && !l.actorName.toLowerCase().includes(q) && !(l.referenceNumber || '').toLowerCase().includes(q)) return false;
    }
    if (dateFrom && l.createdAt < dateFrom) return false;
    if (dateTo && l.createdAt < dateTo) return false;
    return true;
  });

  // Group by date
  const grouped: Record<string, ActivityLog[]> = {};
  filtered.forEach(l => {
    const day = l.createdAt?.split('T')[0] || 'unknown';
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(l);
  });

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Staff Activity
        </h1>
        <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search activity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border rounded-md text-sm bg-background"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          className="border rounded-md px-2 py-2 text-sm bg-background"
        >
          <option value="all">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded-md px-2 py-2 text-sm bg-background" placeholder="From" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded-md px-2 py-2 text-sm bg-background" placeholder="To" />
      </div>

      {/* Activity Timeline */}
      {Object.keys(grouped).length === 0 ? (
        <div className="hero-card text-center text-muted-foreground py-8">
          No activity logs found. Actions will appear here as staff uses the system.
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background z-10 py-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{items.length}</span>
            </div>
            <div className="space-y-1.5 ml-2 border-l-2 border-muted pl-4">
              {items.map(log => {
                const moduleClass = MODULE_COLORS[log.module] || 'bg-muted text-muted-foreground';
                const emoji = ACTION_EMOJIS[log.actionType] || '📌';
                const time = log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={log.id} className="hero-card py-2 px-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-0.5">
                        <div className="text-sm">
                          <span className="mr-1">{emoji}</span>
                          <span className="font-medium">{log.actorName}</span>
                          <span className="text-muted-foreground"> — {log.description}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${moduleClass}`}>{log.module}</span>
                          <span className="text-[10px] text-muted-foreground">{log.actorRole}</span>
                          {log.referenceNumber && <span className="text-[10px] font-mono text-muted-foreground">#{log.referenceNumber}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
