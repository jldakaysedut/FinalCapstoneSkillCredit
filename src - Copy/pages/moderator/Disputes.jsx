import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { RefreshCw, Search, X, ArrowRight, Scale, Wallet, AlertTriangle, Check } from 'lucide-react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

// One column template shared by the header row and every case row (desktop),
// so all columns line up exactly.
const ROW_GRID = 'lg:grid lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.4fr)_96px_minmax(0,1.2fr)_104px_128px] lg:items-center lg:gap-6';

// Display-only: the full resolution note lives in "View Record", so the row
// only needs to say who was favored, e.g. "[RESOLVED - FAVOR LEARNER on 10/31/2026 ...]" -> "Learner".
const getVerdict = (details) => {
  const match = /\[RESOLVED\s*[-–—]\s*FAVOR\s+([^\]]*?)(?:\s+on\s|\])/i.exec(details || '');
  if (!match) return null;
  return match[1].trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

export default function Disputes() {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'my_claims' | 'resolved' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // 1. Kunin ang lahat ng session dispute reports
      const { data: reportsData, error: reportsErr } = await supabase
        .from('reports')
        .select(`
          id, reference_id, reference_type, reason, details, status, created_at, assigned_to,
          reporter_id, reported_user_id,
          reporter:user_profiles!reports_reporter_id_fkey(id, full_name, avatar_url),
          reported:user_profiles!reports_reported_user_id_fkey(id, full_name, avatar_url),
          assignee:user_profiles!reports_assigned_to_fkey(id, full_name)
        `)
        .eq('reference_type', 'session')
        .order('created_at', { ascending: false });

      if (reportsErr) throw reportsErr;

      // 2. Kunin ang matching session telemetry para sa credits at skill name
      const sessionIds = (reportsData || []).map(r => r.reference_id).filter(Boolean);
      let sessionMap = {};

      if (sessionIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select(`
            id, credit_amount, student_id, instructor_id, scheduled_date, scheduled_time,
            skill:skills(title)
          `)
          .in('id', sessionIds);

        (sessionsData || []).forEach(s => {
          sessionMap[s.id] = s;
        });
      }

      // 3. I-combine ang reports at session info
      const enriched = (reportsData || []).map(report => ({
        ...report,
        session: sessionMap[report.reference_id] || null
      }));

      setDisputes(enriched);
    } catch (err) {
      console.error('Failed to load escrow disputes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  useRealtimeRefresh(fetchDisputes, ['reports', 'sessions'], 'web_refresh_disputes');

  // Telemetry Calculations
  const metrics = useMemo(() => {
    const pendingList = disputes.filter(d => d.status === 'pending');
    const totalEscrow = pendingList.reduce(
      (acc, d) => acc + Number(d.session?.credit_amount || 0),
      0
    );
    const myClaims = disputes.filter(
      d => d.status === 'pending' && d.assigned_to === currentUserId
    ).length;
    const resolvedCount = disputes.filter(d => d.status === 'resolved').length;

    return {
      pendingCount: pendingList.length,
      escrowLocked: totalEscrow,
      myClaimsCount: myClaims,
      resolvedCount
    };
  }, [disputes, currentUserId]);

  // Tab & Search Filtering
  const filteredDisputes = useMemo(() => {
    return disputes.filter(item => {
      if (activeTab === 'pending' && item.status !== 'pending') return false;
      if (activeTab === 'my_claims' && (item.status !== 'pending' || item.assigned_to !== currentUserId)) return false;
      if (activeTab === 'resolved' && item.status !== 'resolved') return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const skillMatch = item.session?.skill?.title?.toLowerCase().includes(q);
        const reporterMatch = item.reporter?.full_name?.toLowerCase().includes(q);
        const reportedMatch = item.reported?.full_name?.toLowerCase().includes(q);
        const reasonMatch = item.reason?.toLowerCase().includes(q);
        const idMatch = item.id.toLowerCase().includes(q);

        return skillMatch || reporterMatch || reportedMatch || reasonMatch || idMatch;
      }

      return true;
    });
  }, [disputes, activeTab, searchQuery, currentUserId]);

  // ── Display-only: the four filter tabs ──
  const tabs = [
    { id: 'pending', label: 'Pending', hint: 'Action required', count: metrics.pendingCount },
    { id: 'my_claims', label: 'My claims', hint: 'In your review', count: metrics.myClaimsCount },
    { id: 'resolved', label: 'Resolved', hint: 'Closed', count: metrics.resolvedCount },
    { id: 'all', label: 'All cases', hint: 'Everything', count: disputes.length },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dispute & escrow adjudication</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Review contested sessions, inspect dialogue logs, and release held escrow balances.
          </p>
        </div>
        <button
          onClick={fetchDisputes}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:self-auto ${FOCUS_RING}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh queue
        </button>
      </div>

      {/* ── ESCROW + STAT TABS (counts double as the queue filter) ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.25fr_repeat(4,minmax(0,1fr))]">
        <div className="col-span-2 rounded-2xl bg-emerald-900 p-4 text-white shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-emerald-100">Escrow locked</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-emerald-100">
              <Wallet className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-semibold leading-none tabular-nums transition-opacity ${loading ? 'opacity-30' : ''}`}>{metrics.escrowLocked}</span>
            <span className="text-xs font-semibold text-emerald-200">Credits</span>
          </p>
          <p className="mt-1.5 text-xs text-emerald-100/80">Held in pending disputes</p>
        </div>

        <div role="group" aria-label="Filter the queue" className="contents">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`rounded-2xl border p-4 text-left transition-colors ${FOCUS_RING} ${
                  isActive
                    ? 'border-emerald-600 bg-emerald-50 shadow-sm ring-1 ring-emerald-600'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className={`block text-[13px] font-medium ${isActive ? 'text-emerald-900' : 'text-gray-600'}`}>{tab.label}</span>
                <span className={`mt-2 block text-2xl font-semibold leading-none tabular-nums transition-opacity ${isActive ? 'text-emerald-900' : 'text-gray-900'} ${loading ? 'opacity-30' : ''}`}>{tab.count}</span>
                <span className={`mt-1.5 block text-xs ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>{tab.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SEARCH ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:max-w-md">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by skill, user, reason, or ID"
            aria-label="Search disputes"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="rounded p-0.5 text-gray-300 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        {!loading && (
          <p className="text-xs text-gray-500" role="status">
            Showing <span className="font-semibold tabular-nums text-gray-900">{filteredDisputes.length}</span> of <span className="tabular-nums">{disputes.length}</span> cases
          </p>
        )}
      </div>

      {/* ── CASES ── */}
      <section aria-label="Dispute cases" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <ul aria-busy="true" className="divide-y divide-gray-100" role="status">
            {[0, 1, 2, 3].map(i => (
              <li key={i} className="flex animate-pulse items-center gap-4 px-6 py-5">
                <span className="h-12 w-12 rounded-xl bg-gray-100" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-1/3 rounded bg-gray-100" />
                  <span className="block h-3 w-1/5 rounded bg-gray-100" />
                </span>
              </li>
            ))}
          </ul>
        ) : filteredDisputes.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
              <Scale className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-gray-900">No disputes found</p>
            <p className="mt-1 text-xs text-gray-500">
              {searchQuery
                ? 'No cases matched your filter criteria.'
                : 'There are no active disputes in this queue.'}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={`mt-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 ${FOCUS_RING}`}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Column headers (desktop) */}
            <div aria-hidden="true" className={`hidden border-b border-gray-200 bg-gray-50 px-6 py-3 text-xs font-semibold text-gray-500 ${ROW_GRID}`}>
              <span>Case</span>
              <span>Parties</span>
              <span>Escrow</span>
              <span>Assignment</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {filteredDisputes.map(item => {
                const isParticipant = Boolean(
                  currentUserId && item.session && (
                    currentUserId === item.session.student_id || currentUserId === item.session.instructor_id
                  )
                );
                const isMine = item.assigned_to === currentUserId;
                const isPending = item.status === 'pending';
                const verdict = getVerdict(item.details);

                return (
                  <li key={item.id} className={`relative flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 ${isParticipant ? 'bg-rose-50/30' : ''} ${ROW_GRID}`}>
                    <span
                      className={`absolute inset-y-0 left-0 w-[3px] ${isParticipant ? 'bg-rose-500' : isPending ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      aria-hidden="true"
                    />

                    {/* Case & reason */}
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <Scale className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {item.session?.skill?.title || 'Contested Booking'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-block rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700">
                            {item.reason}
                          </span>
                          <span className="text-xs tabular-nums text-gray-400">#{item.id.slice(0, 8)}</span>
                        </div>
                        {verdict ? (
                          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Resolved in favor of {verdict}
                          </p>
                        ) : (
                          <p className="mt-1.5 line-clamp-1 max-w-md text-xs italic text-gray-500">
                            "{item.details}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Meta cells: labelled on mobile, columns on desktop */}
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:contents">
                      <div className="min-w-0">
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Parties</dt>
                        <dd className="space-y-0.5">
                          <p className="truncate text-[13px] text-gray-800">
                            <span className="mr-1.5 text-xs text-gray-400">Filer</span>
                            <span className="font-medium">{item.reporter?.full_name || 'Complainant'}</span>
                          </p>
                          <p className="truncate text-[13px] text-gray-800">
                            <span className="mr-1.5 text-xs text-gray-400">Target</span>
                            <span className="font-medium">{item.reported?.full_name || 'Instructor'}</span>
                          </p>
                          <p className="text-xs tabular-nums text-gray-400">
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </dd>
                      </div>

                      <div>
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Escrow</dt>
                        <dd>
                          <p className="text-sm font-semibold tabular-nums text-gray-900">{item.session?.credit_amount ?? 0}</p>
                          <p className="mt-0.5 text-xs text-gray-500">Credits</p>
                        </dd>
                      </div>

                      <div className="min-w-0">
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Assignment</dt>
                        <dd>
                          {isParticipant ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800">
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Conflict (You)
                            </span>
                          ) : item.assigned_to ? (
                            isMine ? (
                              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Assigned to You
                              </span>
                            ) : (
                              <span className="block truncate text-[13px] font-medium text-gray-700">
                                {item.assignee?.full_name || 'Staff Member'}
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Unassigned
                            </span>
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Status</dt>
                        <dd>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            isPending ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-600'}`} aria-hidden="true" />
                            {item.status}
                          </span>
                        </dd>
                      </div>
                    </dl>

                    {/* Action */}
                    <Link
                      to={`/moderator/disputes/${item.id}`}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${FOCUS_RING} ${
                        isPending
                          ? 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {isPending ? 'Review Case' : 'View Record'} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

    </div>
  );
}