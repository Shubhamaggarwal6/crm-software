import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  allowFuture?: boolean;
  className?: string;
}

const QUICK_RANGES = [
  { label: 'Today', getRange: () => { const d = new Date(); d.setHours(0,0,0,0); return { from: d, to: new Date(d) }; } },
  { label: 'Yesterday', getRange: () => { const d = new Date(); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); return { from: d, to: new Date(d) }; } },
  { label: 'This Week', getRange: () => { const d = new Date(); d.setHours(0,0,0,0); const day = d.getDay(); const s = new Date(d); s.setDate(s.getDate() - (day === 0 ? 6 : day - 1)); return { from: s, to: new Date() }; } },
  { label: 'Last Week', getRange: () => { const d = new Date(); d.setHours(0,0,0,0); const day = d.getDay(); const e = new Date(d); e.setDate(e.getDate() - (day === 0 ? 7 : day)); const s = new Date(e); s.setDate(s.getDate() - 6); return { from: s, to: e }; } },
  { label: 'This Month', getRange: () => { const d = new Date(); return { from: new Date(d.getFullYear(), d.getMonth(), 1), to: d }; } },
  { label: 'Last Month', getRange: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth()-1, 1); const e = new Date(d.getFullYear(), d.getMonth(), 0); return { from: s, to: e }; } },
  { label: 'This Quarter', getRange: () => { const d = new Date(); const q = Math.floor(d.getMonth()/3); return { from: new Date(d.getFullYear(), q*3, 1), to: d }; } },
  { label: 'Last Quarter', getRange: () => { const d = new Date(); const q = Math.floor(d.getMonth()/3) - 1; const yr = q < 0 ? d.getFullYear()-1 : d.getFullYear(); const qn = q < 0 ? 3 : q; return { from: new Date(yr, qn*3, 1), to: new Date(yr, qn*3+3, 0) }; } },
  { label: 'This FY', getRange: () => { const d = new Date(); const yr = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear()-1; return { from: new Date(yr, 3, 1), to: d }; } },
  { label: 'Last FY', getRange: () => { const d = new Date(); const yr = d.getMonth() >= 3 ? d.getFullYear()-1 : d.getFullYear()-2; return { from: new Date(yr, 3, 1), to: new Date(yr+1, 2, 31) }; } },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(d: Date, from: Date, to: Date) {
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export default function DateRangePicker({ value, onChange, allowFuture = false, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value.from.getMonth());
  const [viewYear, setViewYear] = useState(value.from.getFullYear());
  const [selecting, setSelecting] = useState<'from' | 'to' | null>(null);
  const [tempFrom, setTempFrom] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const today = new Date(); today.setHours(0,0,0,0);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handleDayClick = (day: number) => {
    const clicked = new Date(viewYear, viewMonth, day);
    clicked.setHours(0,0,0,0);
    if (!allowFuture && clicked > today) return;

    if (!selecting || selecting === 'from') {
      setTempFrom(clicked);
      setSelecting('to');
    } else {
      if (tempFrom) {
        const from = tempFrom <= clicked ? tempFrom : clicked;
        const to = tempFrom <= clicked ? clicked : tempFrom;
        onChange({ from, to });
        setSelecting(null);
        setTempFrom(null);
        setOpen(false);
      }
    }
  };

  const handleQuick = (getRange: () => DateRange) => {
    onChange(getRange());
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const displayLabel = isSameDay(value.from, value.to) && isSameDay(value.from, today)
    ? 'Today'
    : `${formatDate(value.from)} — ${formatDate(value.to)}`;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => { setOpen(!open); setViewMonth(value.from.getMonth()); setViewYear(value.from.getFullYear()); }}
        className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent transition-colors"
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-card rounded-lg border shadow-lg p-4 flex gap-4 animate-fade-in" style={{ minWidth: 520 }}>
          {/* Quick selections */}
          <div className="flex flex-col gap-1 border-r pr-3 min-w-[120px]">
            <span className="text-xs font-medium text-muted-foreground mb-1">Quick Select</span>
            {QUICK_RANGES.map(q => (
              <button key={q.label} onClick={() => handleQuick(q.getRange)}
                className="text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors">
                {q.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-medium">{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-0">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(viewYear, viewMonth, day);
                date.setHours(0,0,0,0);
                const disabled = !allowFuture && date > today;
                const isStart = isSameDay(date, tempFrom || value.from);
                const isEnd = !tempFrom && isSameDay(date, value.to);
                const inRange = !tempFrom && isInRange(date, value.from, value.to);
                const isToday = isSameDay(date, today);

                return (
                  <button
                    key={day}
                    disabled={disabled}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'h-8 w-8 mx-auto text-xs rounded-md transition-colors',
                      disabled && 'opacity-30 cursor-not-allowed',
                      !disabled && 'hover:bg-accent cursor-pointer',
                      (isStart || isEnd) && 'bg-primary text-primary-foreground',
                      inRange && !isStart && !isEnd && 'bg-primary/10',
                      isToday && !isStart && !isEnd && 'ring-1 ring-primary',
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {selecting === 'to' && tempFrom && (
              <p className="text-xs text-muted-foreground mt-2">Click end date to complete range</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
