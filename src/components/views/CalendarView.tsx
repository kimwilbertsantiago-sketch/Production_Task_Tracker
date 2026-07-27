import { useState, useMemo } from 'react';
import { Episode, Booking, Client, TeamMember, STATUS_MAP } from '@/lib/types';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalIcon } from 'lucide-react';

interface CalendarViewProps {
  episodes: Episode[];
  bookings: Booking[];
  clients: Client[];
  teamMembers: TeamMember[];
  onEpisodeClick: (episode: Episode) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({ episodes, bookings, clients, onEpisodeClick }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startDay; i++) {
      cells.push({ date: new Date(year, month, -startDay + i + 1), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return cells;
  }, [cursor]);

  // Episodes grouped by start_date (replaces target_release_date)
  const episodesByDate = useMemo(() => {
    const map = new Map<string, Episode[]>();
    episodes.forEach((e) => {
      if (!e.start_date) return;
      if (!map.has(e.start_date)) map.set(e.start_date, []);
      map.get(e.start_date)!.push(e);
    });
    return map;
  }, [episodes]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const key = b.booking_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return map;
  }, [bookings]);

  const today = new Date();
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  const fmtKey = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="py-4 sm:py-6 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold tf-text">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="tf-btn tf-btn-ghost p-2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="tf-btn tf-btn-outline text-xs">
            Today
          </button>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="tf-btn tf-btn-ghost p-2">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 rounded-xl border tf-border tf-card overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 border-b tf-border tf-bg-subtle">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-[11px] font-semibold tf-muted uppercase tracking-wide text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1">
          {days.map((cell, i) => {
            const key = fmtKey(cell.date);
            const dayEpisodes = episodesByDate.get(key) ?? [];
            const dayBookings = bookingsByDate.get(key) ?? [];
            return (
              <div
                key={i}
                className={`min-h-[110px] border-b border-r tf-border p-1.5 flex flex-col gap-1 ${cell.inMonth ? 'tf-card' : 'tf-bg-subtle opacity-60'}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-medium ${
                      isToday(cell.date) ? 'bg-blue-500 text-white rounded-full h-5 w-5 flex items-center justify-center' : 'tf-muted'
                    }`}
                  >
                    {cell.date.getDate()}
                  </span>
                </div>
                {/* Task cards (by start_date) */}
                {dayEpisodes.map((ep) => {
                  const client = clients.find((c) => c.id === ep.client_id);
                  const status = STATUS_MAP[ep.status];
                  return (
                    <button
                      key={ep.id}
                      onClick={() => onEpisodeClick(ep)}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] tf-text cursor-pointer hover:opacity-80 transition-opacity truncate text-left w-full"
                      style={{ backgroundColor: `${status.color}1A`, borderLeft: `2px solid ${status.color}` }}
                      title={`${ep.title} — ${status.label}`}
                    >
                      <CalIcon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{client?.name ?? 'Task'} · {ep.episode_number ?? ep.title}</span>
                    </button>
                  );
                })}
                {/* Bookings */}
                {dayBookings.map((b) => {
                  const client = clients.find((c) => c.id === b.client_id);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] tf-text truncate"
                      style={{ backgroundColor: `${b.status === 'completed' ? '#22C55E' : '#F59E0B'}1A`, borderLeft: `2px solid ${b.status === 'completed' ? '#22C55E' : '#F59E0B'}` }}
                      title={b.title}
                    >
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{b.start_time ? `${b.start_time.slice(0, 5)} ` : ''}{client?.name ?? b.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
