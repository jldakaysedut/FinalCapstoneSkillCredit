import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../supabaseClient';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock,
  Coins,
  Mail,
  Users,
  Wallet,
  X,
} from 'lucide-react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

const formatNumber = value => Number(value || 0).toLocaleString();

const formatDate = value => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatPeso = value => `₱${Number(value || 0).toLocaleString()}`;

const methodLabel = value => {
  if (value === 'gcash') return 'GCash';
  if (value === 'paymaya') return 'Maya';
  return 'PayMongo';
};

// Display-only: pill, dot, row accent, and icon tile colours for a top-up status.
const topupStatusTone = value => {
  if (value === 'paid') return 'bg-emerald-50 text-emerald-800';
  if (value === 'pending') return 'bg-amber-50 text-amber-800';
  return 'bg-gray-100 text-gray-600';
};
const topupDotTone = value => {
  if (value === 'paid') return 'bg-emerald-600';
  if (value === 'pending') return 'bg-amber-500';
  return 'bg-gray-400';
};
const topupAccentTone = value => {
  if (value === 'paid') return 'bg-emerald-500';
  if (value === 'pending') return 'bg-amber-400';
  return 'bg-gray-300';
};
const topupIconTone = value => {
  if (value === 'paid') return 'bg-emerald-50 text-emerald-700';
  if (value === 'pending') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-500';
};

const relationOne = value => (Array.isArray(value) ? value[0] : value) || null;

function DetailModal({ record, onClose }) {
  useEffect(() => {
    if (!record) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [record, onClose]);

  if (!record) return null;
  const item = record.item;

  return (
    <div
      className="fixed inset-0 z-[600] flex justify-end bg-gray-900/40 backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-detail-title"
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl sm:border-l sm:border-gray-100"
      >
        {/* Panel header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <h2 id="admin-detail-title" className="text-base font-semibold text-gray-900">Account details</h2>
            <p className="mt-0.5 text-xs text-gray-500">Newly created member</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className={`rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ${FOCUS_RING}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-sm font-semibold text-emerald-800">
              {(item.full_name || 'M').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Member name</p>
              <p className="break-words text-sm font-semibold text-gray-900">{item.full_name || 'New member'}</p>
            </div>
          </div>

          <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            <div className="min-w-0 p-4">
              <dt className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email
              </dt>
              <dd className="mt-1 break-all text-sm font-medium text-gray-900">
                {item.email || 'Not provided'}
              </dd>
            </div>

            <div className="p-4">
              <dt className="flex items-center gap-2 text-xs text-gray-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Joined
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(item.created_at)}</dd>
            </div>

            <div className="min-w-0 p-4">
              <dt className="text-xs text-gray-500">Record ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-gray-600">{item.id}</dd>
            </div>
          </dl>
        </div>

        {/* Panel footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-lg bg-emerald-700 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, skills: 0, sessions: 0, credits: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [topupStats, setTopupStats] = useState({ revenue: 0, credits: 0, paid: 0, pending: 0, gcash: 0, maya: 0 });
  const [recentTopups, setRecentTopups] = useState([]);
  const [topupError, setTopupError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [liveRefreshKey, setLiveRefreshKey] = useState(0);
  useRealtimeRefresh(() => setLiveRefreshKey(key => key + 1), ['user_profiles', 'skills', 'sessions', 'topup_transactions'], 'web_refresh_admin_dashboard');

  const closeDetails = useCallback(() => setSelectedRecord(null), []);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [usersResult, skillsResult, sessionsResult, creditsResult] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('skills').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('sessions').select('id', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('credits_balance'),
        ]);

        const totalCredits = creditsResult.data?.reduce(
          (sum, user) => sum + (Number(user.credits_balance) || 0),
          0,
        ) || 0;

        const { data: usersDataResult } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        const topupResult = await supabase
          .from('topup_transactions')
          .select('id, amount_php, credits_added, status, payment_method, created_at, user_profiles(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (!isMounted) return;

        const topupRows = topupResult.data || [];
        const paidRows = topupRows.filter(t => t.status === 'paid');
        const sumOf = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
        setTopupError(Boolean(topupResult.error));
        setTopupStats({
          revenue: sumOf(paidRows, 'amount_php'),
          credits: sumOf(paidRows, 'credits_added'),
          paid: paidRows.length,
          pending: topupRows.filter(t => t.status === 'pending').length,
          gcash: paidRows.filter(t => t.payment_method === 'gcash').length,
          maya: paidRows.filter(t => t.payment_method === 'paymaya').length,
        });
        setRecentTopups(topupRows.slice(0, 5));

        setStats({
          users: usersResult.count || 0,
          skills: skillsResult.count || 0,
          sessions: sessionsResult.count || 0,
          credits: totalCredits,
        });
        setRecentUsers(usersDataResult || []);
      } catch (error) {
        console.error('Unable to load admin dashboard data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => { isMounted = false; };
  }, [liveRefreshKey]);

  // ── Display-only values derived from the stats above ──
  const metrics = [
    { label: 'Total users', note: 'Registered platform members', value: stats.users, to: '/admin/users', Icon: Users, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Active skills', note: 'Published listings available to book', value: stats.skills, to: '/admin/platform', Icon: BookOpen, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Total sessions', note: 'Sessions booked across the platform', value: stats.sessions, to: '/admin/platform', Icon: Clock, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Platform credits', note: 'Combined member credit balances', value: stats.credits, to: '/admin/users', Icon: Coins, tone: 'bg-violet-50 text-violet-700' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Platform overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading the latest figures…'
              : `${formatNumber(stats.users)} ${stats.users === 1 ? 'member' : 'members'} and ${formatNumber(stats.skills)} active ${stats.skills === 1 ? 'skill' : 'skills'} on the platform.`}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 sm:self-auto"
          role="status"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          System online
        </span>
      </div>

      {/* ── ROW 1: PLATFORM METRICS + TOP-UP REVENUE / BREAKDOWN ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Platform metrics */}
        <section aria-labelledby="metrics-heading" className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 id="metrics-heading" className="text-sm font-semibold text-gray-900">Platform metrics</h2>
            <span className="text-xs text-gray-500">All-time totals</span>
          </div>
          <ul className="flex flex-1 flex-col divide-y divide-gray-100">
            {metrics.map(({ label, note, value, to, Icon, tone }) => (
              <li key={label} className="flex flex-1">
                <Link to={to} className={`group flex flex-1 flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:gap-6 ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0`}>
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{note}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:w-[40%] sm:justify-end">
                    <span className={`text-right text-2xl font-semibold leading-none tabular-nums text-gray-900 transition-opacity ${loading ? 'opacity-30' : ''}`}>
                      {loading ? '—' : formatNumber(value)}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors group-hover:border-emerald-300 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Top-up revenue + breakdown */}
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-[auto_1fr]">
          <section aria-labelledby="revenue-heading" className="rounded-2xl bg-emerald-900 p-6 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <h2 id="revenue-heading" className="text-sm font-medium text-emerald-100">Top-up revenue</h2>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-emerald-100">
                <Wallet className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            {topupError ? (
              <div role="alert" className="mt-5 rounded-xl border border-rose-300/30 bg-rose-500/15 p-3 text-xs leading-relaxed text-rose-100">
                Could not load top-up data. Make sure the admin read policy for top-ups is in place.
              </div>
            ) : (
              <>
                <p className="mt-5">
                  <span className={`text-4xl font-semibold leading-none tracking-tight tabular-nums transition-opacity ${loading ? 'opacity-30' : ''}`}>
                    {loading ? '—' : formatPeso(topupStats.revenue)}
                  </span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-emerald-100/80">Collected through PayMongo. Only paid top-ups count toward revenue.</p>
              </>
            )}
          </section>

          <section aria-labelledby="breakdown-heading" className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 id="breakdown-heading" className="text-sm font-semibold text-gray-900">Top-up breakdown</h2>
            <dl className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-gray-500"><Coins className="h-3.5 w-3.5" aria-hidden="true" /> Credits sold</dt>
                <dd className={`mt-1.5 text-2xl font-semibold leading-none tabular-nums text-gray-900 transition-opacity ${loading ? 'opacity-30' : ''}`}>
                  {loading ? '—' : formatNumber(topupStats.credits)}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-gray-500"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> Paid / pending</dt>
                <dd className={`mt-1.5 text-2xl font-semibold leading-none tabular-nums text-gray-900 transition-opacity ${loading ? 'opacity-30' : ''}`}>
                  {loading ? '—' : `${formatNumber(topupStats.paid)} / ${formatNumber(topupStats.pending)}`}
                </dd>
              </div>
            </dl>

            <div className="mt-auto space-y-3 border-t border-gray-100 pt-5">
              <p className="text-xs font-medium text-gray-900">Paid by method</p>
              {[
                { label: 'GCash', count: topupStats.gcash },
                { label: 'Maya', count: topupStats.maya },
              ].map(method => {
                const pct = topupStats.paid ? Math.round((method.count / topupStats.paid) * 100) : 0;
                return (
                  <div key={method.label}>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{method.label}</span>
                      <span className="tabular-nums">{loading ? '—' : `${formatNumber(method.count)} · ${pct}%`}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`${method.label}: ${loading ? 0 : pct}% of paid top-ups`}>
                      <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${loading ? 0 : pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── ROW 2: RECENT TOP-UPS + NEWEST ACCOUNTS ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Recent top-ups feed */}
        <section aria-labelledby="topups-heading" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div>
              <h2 id="topups-heading" className="text-sm font-semibold text-gray-900">Recent top-ups</h2>
              <p className="mt-0.5 text-xs text-gray-500">Latest credit purchases, including pending ones</p>
            </div>
            {!loading && !topupError && recentTopups.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium tabular-nums text-gray-600">{recentTopups.length} latest</span>
            )}
          </div>

          <div aria-busy={loading} className="max-h-[560px] overflow-y-auto [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin]">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500" role="status">Loading recent top-ups…</div>
            ) : topupError ? (
              <div className="p-12 text-center text-sm text-gray-500">Top-up records are not available right now.</div>
            ) : recentTopups.length === 0 ? (
              <div className="p-12 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
                  <Wallet className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-gray-900">No top-ups yet</p>
                <p className="mt-1 text-xs text-gray-500">Credit purchases will appear here as they come in.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentTopups.map(topup => {
                  const member = relationOne(topup.user_profiles);
                  return (
                    <li key={topup.id} className="relative flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:gap-4">
                      <span className={`absolute inset-y-0 left-0 w-[3px] ${topupAccentTone(topup.status)}`} aria-hidden="true" />

                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${topupIconTone(topup.status)}`}>
                        <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="max-w-full truncate text-sm font-semibold text-gray-900">{member?.full_name || 'Unknown member'}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {methodLabel(topup.payment_method)} top-up · {formatDate(topup.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-left sm:w-28 sm:text-right">
                          <p className="text-sm font-semibold tabular-nums text-gray-900">{formatPeso(topup.amount_php)}</p>
                          <p className="mt-0.5 text-xs tabular-nums text-gray-400">+{formatNumber(topup.credits_added)} credits</p>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${topupStatusTone(topup.status)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${topupDotTone(topup.status)}`} aria-hidden="true" />
                          {topup.status || 'unknown'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Newest accounts */}
        <aside aria-labelledby="accounts-heading" className="lg:col-span-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-[132px]">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="accounts-heading" className="text-sm font-semibold text-gray-900">Newest accounts</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Latest members to join</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-gray-500" role="status">Loading accounts…</div>
            ) : recentUsers.length === 0 ? (
              <div className="p-10 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-gray-900">No recent accounts</p>
                <p className="mt-1 text-xs text-gray-500">New members will appear here as they join.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentUsers.map(user => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRecord({ type: 'user', item: user })}
                      className={`group flex w-full items-center gap-3 px-6 py-3.5 text-left transition-colors hover:bg-gray-50/70 ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-sm font-semibold text-emerald-800">
                        {(user.full_name || 'M').trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{user.full_name || 'New member'}</span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">{user.email || 'Email not provided'}</span>
                        <span className="mt-0.5 block text-xs tabular-nums text-gray-400">Joined {formatDate(user.created_at)}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-emerald-700" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <DetailModal record={selectedRecord} onClose={closeDetails} />
    </div>
  );
}