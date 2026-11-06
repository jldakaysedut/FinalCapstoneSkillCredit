import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../supabaseClient';

// Small inline icon set keeps the moderator UI consistent without adding dependencies.
function ModeratorIcon({ name, size = 16, className = '' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" /></>,
    close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    report: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    scale: <><path d="m16 16 3-8 3 8a5 5 0 0 1-6 0ZM2 16l3-8 3 8a5 5 0 0 1-6 0Z" /><path d="M7 21h10M12 3v18M5 8h14l-2-4H7Z" /></>,
    wallet: <><path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" /><path d="M16 14h.01" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  };
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      {paths[name] || paths.report}
    </svg>
  );
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

export default function ModDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [stats, setStats] = useState({
    pendingDisputes: 0,
    escrowLocked: 0,
    pendingReports: 0,
    resolvedTotal: 0,
    myClaims: 0,
    pendingSkills: 0
  });
  const [recentQueue, setRecentQueue] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // 1. Fetch Session Disputes (reference_type = 'session')
      const { data: sessionReports, error: repErr } = await supabase
        .from('reports')
        .select('id, reference_id, status, assigned_to')
        .eq('reference_type', 'session');

      if (repErr) throw repErr;

      const pendingDisputesList = (sessionReports || []).filter(r => r.status === 'pending');
      const pendingDisputesCount = pendingDisputesList.length;

      // 2. Compute Real Escrow Amount from Pending Sessions
      let totalEscrow = 0;
      const sessionIds = pendingDisputesList.map(r => r.reference_id).filter(Boolean);
      if (sessionIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('credit_amount')
          .in('id', sessionIds);

        totalEscrow = (sessionsData || []).reduce(
          (acc, item) => acc + Number(item.credit_amount || 0),
          0
        );
      }

      // 3. Fetch User Behavioral Reports (reference_type != 'session')
      const { count: pendingReportsCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .neq('reference_type', 'session')
        .eq('status', 'pending');

      // 4. Fetch All-Time Resolved Count
      const { count: resolvedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      // 5. Fetch Pending Skills Count
      const { count: pendingSkillsCount } = await supabase
        .from('skills')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 6. My Active Claims
      const myClaimedCount = (sessionReports || []).filter(
        r => r.status === 'pending' && r.assigned_to === user?.id
      ).length;

      setStats({
        pendingDisputes: pendingDisputesCount,
        escrowLocked: totalEscrow,
        pendingReports: pendingReportsCount || 0,
        resolvedTotal: resolvedCount || 0,
        myClaims: myClaimedCount,
        pendingSkills: pendingSkillsCount || 0
      });

      // 7. Fetch Recent Incoming Tickets (Cluster by reference_id, Limit 8)
      const { data: recentData } = await supabase
        .from('reports')
        .select(`
          id, reference_id, reference_type, reason, details, status, created_at, assigned_to,
          reporter:user_profiles!reports_reporter_id_fkey(full_name),
          reported:user_profiles!reports_reported_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      // Report Clustering Logic
      const recentClusters = {};
      (recentData || []).forEach(report => {
        const key = report.reference_id || report.id;
        if (!recentClusters[key]) {
          recentClusters[key] = { ...report, report_count: 1 };
        } else {
          recentClusters[key].report_count += 1;
          if (report.status === 'pending' && recentClusters[key].status !== 'pending') {
            recentClusters[key].status = 'pending';
          }
        }
      });

      setRecentQueue(Object.values(recentClusters).slice(0, 20));

    } catch (err) {
      console.error('Failed to load moderator dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useRealtimeRefresh(fetchDashboardData, ['skills', 'reports', 'sessions'], 'web_refresh_moddashboard');

  // ── Display-only values derived from the stats above ──
  const queues = [
    { label: 'Skill approvals', note: 'Listings awaiting quality review', count: stats.pendingSkills, to: '/moderator/approvals', icon: 'search', tone: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-600' },
    { label: 'Disputes & escrow', note: 'Session cases awaiting a ruling', count: stats.pendingDisputes, to: '/moderator/disputes', icon: 'scale', tone: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
    { label: 'User reports', note: 'Conduct and profile flags', count: stats.pendingReports, to: '/moderator/reports', icon: 'alert', tone: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
  ];
  const totalOpen = queues.reduce((sum, q) => sum + q.count, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Moderation overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading the latest figures…'
              : totalOpen === 0
                ? 'Nothing is waiting for review right now.'
                : `${totalOpen} ${totalOpen === 1 ? 'item needs' : 'items need'} review across your queues.`}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:self-auto ${FOCUS_RING}`}
        >
          <ModeratorIcon name="refresh" size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── ROW 1: WORK QUEUES + ESCROW / WORKLOAD ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Work queues */}
        <section aria-labelledby="queues-heading" className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 id="queues-heading" className="text-sm font-semibold text-gray-900">Work queues</h2>
            <span className="text-xs text-gray-500">Share of open items</span>
          </div>
          <ul className="flex flex-1 flex-col divide-y divide-gray-100">
            {queues.map(({ label, note, count, to, icon, tone, bar }) => {
              const pct = totalOpen > 0 ? Math.round((count / totalOpen) * 100) : 0;
              return (
                <li key={to} className="flex flex-1">
                  <Link to={to} className={`group flex flex-1 flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:gap-6 ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0`}>
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                        <ModeratorIcon name={icon} size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{note}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 sm:w-[46%]">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`${pct}% of open items`}>
                        <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`w-12 text-right text-2xl font-semibold leading-none tabular-nums text-gray-900 transition-opacity ${loading ? 'opacity-30' : ''}`}>{count}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors group-hover:border-emerald-300 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                        <ModeratorIcon name="arrow" size={14} />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Escrow + workload */}
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-[auto_1fr]">
          <section aria-labelledby="escrow-heading" className="rounded-2xl bg-emerald-900 p-6 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <h2 id="escrow-heading" className="text-sm font-medium text-emerald-100">Escrow held in disputes</h2>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-emerald-100">
                <ModeratorIcon name="wallet" size={16} />
              </span>
            </div>
            <p className="mt-5 flex items-baseline gap-2">
              <span className={`text-4xl font-semibold leading-none tracking-tight tabular-nums transition-opacity ${loading ? 'opacity-30' : ''}`}>{stats.escrowLocked}</span>
              <span className="text-sm font-semibold text-emerald-200">CR</span>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-emerald-100/80">Locked across sessions with an open dispute. Released only when a ruling is recorded.</p>
          </section>

          <section aria-labelledby="workload-heading" className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 id="workload-heading" className="text-sm font-semibold text-gray-900">Workload</h2>
            <dl className="mt-auto grid grid-cols-2 gap-4 pt-4">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-gray-500"><ModeratorIcon name="users" size={13} /> Claimed by you</dt>
                <dd className={`mt-1.5 text-2xl font-semibold leading-none tabular-nums text-gray-900 transition-opacity ${loading ? 'opacity-30' : ''}`}>{stats.myClaims}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-gray-500"><ModeratorIcon name="check" size={13} /> Resolved total</dt>
                <dd className={`mt-1.5 text-2xl font-semibold leading-none tabular-nums text-gray-900 transition-opacity ${loading ? 'opacity-30' : ''}`}>{stats.resolvedTotal}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* ── ROW 2: INTAKE FEED + PROTOCOL ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Intake feed */}
        <section aria-labelledby="intake-heading" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div>
              <h2 id="intake-heading" className="text-sm font-semibold text-gray-900">Recent intake</h2>
              <p className="mt-0.5 text-xs text-gray-500">Latest submissions, grouped by case</p>
            </div>
            {!loading && recentQueue.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium tabular-nums text-gray-600">{recentQueue.length} cases</span>
            )}
          </div>

          <div aria-busy={loading} className="max-h-[560px] overflow-y-auto [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin]">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500" role="status">Loading the intake queue…</div>
            ) : recentQueue.length === 0 ? (
              <div className="p-12 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
                  <ModeratorIcon name="report" size={20} />
                </span>
                <p className="mt-3 text-sm font-semibold text-gray-900">The queue is clear</p>
                <p className="mt-1 text-xs text-gray-500">New reports and disputes will appear here as they come in.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentQueue.map((item) => {
                  const isDispute = item.reference_type === 'session';
                  const isPending = item.status === 'pending';
                  return (
                    <li key={item.id} className="relative flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:gap-4">
                      <span className={`absolute inset-y-0 left-0 w-[3px] ${isPending ? 'bg-amber-400' : 'bg-emerald-500'}`} aria-hidden="true" />

                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDispute ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                        <ModeratorIcon name={isDispute ? 'scale' : 'alert'} size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="max-w-full truncate text-sm font-semibold text-gray-900">{item.reason}</p>
                          {item.report_count > 1 && (
                            <span
                              className="shrink-0 rounded-full bg-rose-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-rose-700 ring-1 ring-inset ring-rose-100"
                              title={`${item.report_count} users reported this`}
                            >
                              {item.report_count}x
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {isDispute ? 'Dispute' : 'Report'} from {item.report_count > 1 ? 'multiple users' : (item.reporter?.full_name || 'Anonymous')} against {item.reported?.full_name || 'User'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-left sm:w-28 sm:text-right">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${isPending ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-600'}`} aria-hidden="true" />
                            {item.status}
                          </span>
                          <p className="mt-1 text-xs tabular-nums text-gray-400">
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Link
                          to={isDispute ? `/moderator/disputes/${item.id}` : `/moderator/reports/${item.id}`}
                          className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white sm:w-[116px] shadow-sm transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}
                        >
                          Open case <ModeratorIcon name="arrow" size={13} />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Protocol */}
        <aside aria-labelledby="protocol-heading" className="lg:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-[132px]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ModeratorIcon name="shield" size={16} />
              </span>
              <h2 id="protocol-heading" className="text-sm font-semibold text-gray-900">Adjudication protocol</h2>
            </div>
            <ul className="mt-5 space-y-4 text-[13px] leading-relaxed text-gray-600">
              <li>
                <p className="font-semibold text-gray-900">Inspect independently</p>
                <p className="mt-0.5">Review the chat history and attendance record before you rule.</p>
              </li>
              <li className="border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-900">Avoid conflicts</p>
                <p className="mt-0.5">Never claim or resolve a dispute that your own account is part of.</p>
              </li>
              <li className="border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-900">Rulings are final</p>
                <p className="mt-0.5">Escrow refunds and payouts are permanent once executed.</p>
              </li>
            </ul>
          </div>
        </aside>
      </div>

    </div>
  );
}