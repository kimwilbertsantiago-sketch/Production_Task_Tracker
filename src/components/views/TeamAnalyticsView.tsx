import { useMemo, useState } from 'react';
import { Episode, TeamMember, STATUS_MAP, ROLE_THEMES, UserRole } from '@/lib/types';
import { Avatar, RoleBadge } from '@/components/ui/Avatar';
import { PenTool, Video, CheckCircle2, Activity, AlertCircle, Users, BarChart3, Calendar, Clock, TrendingUp } from 'lucide-react';

interface TeamAnalyticsViewProps {
  episodes: Episode[];
  teamMembers: TeamMember[];
  onEpisodeClick: (episode: Episode) => void;
}

interface MemberStats {
  member: TeamMember;
  activeEpisodes: Episode[];
  completedEpisodes: Episode[];
  activeCount: number;
  completedCount: number;
}

const QA_STATUSES = ['writer_qa', 'final_qa'];
const PIPELINE_START_INDEX = 0;
const COMPLETED_INDEX = 6;

type Timeframe = 'month' | 'quarter' | 'half' | 'all';

const TIMEFRAMES: { key: Timeframe; label: string; months: number }[] = [
  { key: 'month', label: 'This Month', months: 1 },
  { key: 'quarter', label: 'Past 3 Months', months: 3 },
  { key: 'half', label: 'Past 6 Months', months: 6 },
  { key: 'all', label: 'All Time', months: 9999 },
];

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isThisMonth(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function withinTimeframe(iso: string | null, tf: Timeframe): boolean {
  if (!iso) return false;
  if (tf === 'all') return true;
  const tfConfig = TIMEFRAMES.find((t) => t.key === tf)!;
  const cutoff = monthsAgo(tfConfig.months);
  return new Date(iso) >= cutoff;
}

function monthKey(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function turnaroundDays(ep: Episode): number | null {
  if (!ep.created_at || !ep.updated_at) return null;
  if (ep.status !== 'completed_delivered') return null;
  const start = new Date(ep.created_at).getTime();
  const end = new Date(ep.updated_at).getTime();
  if (end < start) return null;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-xl border tf-border tf-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}1A` }}>
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        <span className="text-xs font-medium tf-muted">{label}</span>
      </div>
      <div className="text-3xl font-semibold tf-text">{value}</div>
    </div>
  );
}

function WorkloadBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs tf-text">{label}</span>
        <span className="text-xs font-semibold tf-muted">{count} active</span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MiniBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="text-[10px] font-semibold tf-text">{d.value}</div>
            <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${h}%`, backgroundColor: color, minHeight: d.value > 0 ? '4px' : '0' }} />
            <div className="text-[9px] tf-muted truncate w-full text-center">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function TeamAnalyticsView({ episodes, teamMembers, onEpisodeClick }: TeamAnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('month');

  const roster = useMemo<MemberStats[]>(() => {
    return teamMembers
      .filter((m) => m.role === 'Writer' || m.role === 'Video Editor')
      .map((member) => {
        const assigned = episodes.filter(
          (e) => (member.role === 'Writer' && e.writer_assignee_id === member.id) ||
                  (member.role === 'Video Editor' && e.editor_assignee_id === member.id)
        );
        const active = assigned.filter((e) => e.status !== 'completed_delivered');
        const completed = assigned.filter((e) => e.status === 'completed_delivered' && withinTimeframe(e.updated_at, timeframe));
        return {
          member,
          activeEpisodes: active,
          completedEpisodes: completed,
          activeCount: active.length,
          completedCount: completed.length,
        };
      })
      .sort((a, b) => b.activeCount - a.activeCount);
  }, [episodes, teamMembers, timeframe]);

  const studioStats = useMemo(() => {
    const pipeline = episodes.filter((e) => e.status !== 'completed_delivered').length;
    const inQA = episodes.filter((e) => QA_STATUSES.includes(e.status)).length;
    const completedThisMonth = episodes.filter((e) => e.status === 'completed_delivered' && isThisMonth(e.updated_at)).length;
    return { pipeline, inQA, completedThisMonth };
  }, [episodes]);

  const maxActive = useMemo(() => Math.max(1, ...roster.map((r) => r.activeCount)), [roster]);

  // Historical metrics within timeframe
  const historical = useMemo(() => {
    const completedInRange = episodes.filter((e) => e.status === 'completed_delivered' && withinTimeframe(e.updated_at, timeframe));

    // Monthly completion chart
    const monthlyMap = new Map<string, number>();
    completedInRange.forEach((ep) => {
      const k = monthKey(ep.updated_at);
      if (k) monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + 1);
    });

    // Build last N months based on timeframe
    const tfConfig = TIMEFRAMES.find((t) => t.key === timeframe)!;
    const monthCount = Math.min(tfConfig.months, 6);
    const months: { label: string; value: number }[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), value: monthlyMap.get(k) ?? 0 });
    }

    // Turnaround time
    const turnarounds = completedInRange.map(turnaroundDays).filter((d): d is number => d !== null);
    const avgTurnaround = turnarounds.length > 0 ? Math.round(turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length) : 0;

    // Department breakdown
    const writerCompleted = completedInRange.filter((e) => {
      const m = teamMembers.find((tm) => tm.id === e.writer_assignee_id);
      return m && m.role === 'Writer';
    }).length;
    const editorCompleted = completedInRange.filter((e) => {
      const m = teamMembers.find((tm) => tm.id === e.editor_assignee_id);
      return m && m.role === 'Video Editor';
    }).length;

    return {
      months,
      avgTurnaround,
      totalCompleted: completedInRange.length,
      writerCompleted,
      editorCompleted,
    };
  }, [episodes, teamMembers, timeframe]);

  const writerColor = ROLE_THEMES['Writer'].hex;
  const editorColor = ROLE_THEMES['Video Editor'].hex;
  const deptMax = Math.max(1, historical.writerCompleted, historical.editorCompleted);

  return (
    <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold tf-text">Team Analytics</h2>
          <p className="text-xs tf-muted mt-0.5">Workload distribution, historical output, and studio-wide production stats.</p>
        </div>
        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 rounded-lg p-0.5 tf-bg-subtle border tf-border">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeframe === tf.key ? 'tf-card tf-text shadow-sm' : 'tf-muted hover:tf-text'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Studio Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Activity} label="Episodes in Pipeline" value={studioStats.pipeline} accent="#3B82F6" />
        <StatCard icon={AlertCircle} label="Episodes in QA Stages" value={studioStats.inQA} accent="#EF4444" />
        <StatCard icon={CheckCircle2} label="Completed This Month" value={studioStats.completedThisMonth} accent="#22C55E" />
      </div>

      {/* Historical metrics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Completed Over Time */}
        <div className="rounded-xl border tf-border tf-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 tf-muted" />
            <h3 className="text-sm font-semibold tf-text">Completed Over Time</h3>
          </div>
          <MiniBarChart data={historical.months} color="#22C55E" />
        </div>

        {/* Turnaround Time */}
        <div className="rounded-xl border tf-border tf-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 tf-muted" />
            <h3 className="text-sm font-semibold tf-text">Avg Turnaround Time</h3>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-4xl font-semibold tf-text">{historical.avgTurnaround}</span>
            <span className="text-sm tf-muted">days</span>
          </div>
          <p className="text-[11px] tf-muted">From creation to Completed & Delivered, within {TIMEFRAMES.find((t) => t.key === timeframe)!.label}.</p>
          <div className="mt-3 pt-3 border-t tf-border">
            <div className="flex items-center justify-between text-xs">
              <span className="tf-muted">Total completed in range</span>
              <span className="font-semibold tf-text">{historical.totalCompleted}</span>
            </div>
          </div>
        </div>

        {/* Department Output Breakdown */}
        <div className="rounded-xl border tf-border tf-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 tf-muted" />
            <h3 className="text-sm font-semibold tf-text">Department Output</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs tf-text flex items-center gap-1.5"><PenTool className="h-3 w-3" style={{ color: writerColor }} /> Writers</span>
                <span className="text-xs font-semibold tf-muted">{historical.writerCompleted}</span>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((historical.writerCompleted / deptMax) * 100)}%`, backgroundColor: writerColor }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs tf-text flex items-center gap-1.5"><Video className="h-3 w-3" style={{ color: editorColor }} /> Video Editors</span>
                <span className="text-xs font-semibold tf-muted">{historical.editorCompleted}</span>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((historical.editorCompleted / deptMax) * 100)}%`, backgroundColor: editorColor }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workload Distribution */}
      <div className="rounded-xl border tf-border tf-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 tf-muted" />
          <h3 className="text-sm font-semibold tf-text">Workload Distribution (Active)</h3>
        </div>
        {roster.length === 0 ? (
          <p className="text-xs tf-muted text-center py-6">No writers or video editors on the team yet.</p>
        ) : (
          <div className="space-y-4">
            {roster.map((r) => (
              <WorkloadBar
                key={r.member.id}
                label={`${r.member.name} (${r.member.role})`}
                count={r.activeCount}
                max={maxActive}
                color={ROLE_THEMES[r.member.role as UserRole].hex}
              />
            ))}
          </div>
        )}
      </div>

      {/* Team Member Roster */}
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 tf-muted" />
        <h3 className="text-sm font-semibold tf-text">Team Roster</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roster.length === 0 && (
          <div className="col-span-full text-center text-xs tf-muted py-8">
            No writers or video editors found. New sign-ups will appear here automatically.
          </div>
        )}
        {roster.map((r) => {
          const Icon = r.member.role === 'Writer' ? PenTool : Video;
          return (
            <div key={r.member.id} className="rounded-xl border tf-border tf-card p-5 tf-fade-in">
              {/* Member header */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={r.member.name} color={r.member.avatar_color} size="md" url={r.member.avatar_url ?? null} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold tf-text">{r.member.name}</div>
                  <div className="text-[11px] tf-muted truncate">{r.member.email ?? '—'}</div>
                </div>
                <RoleBadge role={r.member.role as UserRole}>
                  <Icon className="h-3 w-3" />
                  {r.member.role}
                </RoleBadge>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg tf-bg-subtle p-3 text-center">
                  <div className="text-2xl font-semibold tf-text">{r.activeCount}</div>
                  <div className="text-[10px] tf-muted mt-0.5">Active Tasks</div>
                </div>
                <div className="rounded-lg tf-bg-subtle p-3 text-center">
                  <div className="text-2xl font-semibold tf-text">{r.completedCount}</div>
                  <div className="text-[10px] tf-muted mt-0.5">Completed ({TIMEFRAMES.find((t) => t.key === timeframe)!.label})</div>
                </div>
              </div>

              {/* Active task list */}
              <div>
                <div className="text-[11px] font-medium tf-muted mb-2">Currently Assigned</div>
                {r.activeEpisodes.length === 0 ? (
                  <p className="text-[11px] tf-muted italic">No active tasks</p>
                ) : (
                  <div className="space-y-1.5">
                    {r.activeEpisodes.map((ep) => {
                      const status = STATUS_MAP[ep.status];
                      return (
                        <button
                          key={ep.id}
                          onClick={() => onEpisodeClick(ep)}
                          className="w-full flex items-center justify-between gap-2 rounded-md border tf-border px-2.5 py-2 text-left hover:bg-[var(--bg-subtle)] transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-xs tf-text truncate">{ep.title}</div>
                            {ep.episode_number && <div className="text-[10px] tf-muted">{ep.episode_number}</div>}
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium leading-none" style={{ backgroundColor: `${status.color}1A`, color: status.color }}>
                            {status.short}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
