import { useCallback, useEffect, useState } from 'react';
import supabase from '../../supabaseClient';
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Clock,
  Coins,
  Mail,
  Users,
  Wallet,
  X,
} from 'lucide-react';

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

const topupStatusTone = value => {
  if (value === 'paid') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (value === 'pending') return 'bg-amber-50 text-amber-800 ring-amber-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const relationOne = value => (Array.isArray(value) ? value[0] : value) || null;

function StatCard({ title, value, icon: Icon, tone }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
            {title}
          </p>
          <p className="mt-2 break-words text-2xl font-bold leading-none tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">Platform snapshot</p>
    </article>
  );
}

function PanelHeader({ icon: Icon, title, description, count, tone = 'text-slate-500' }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {count !== undefined && (
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {count}
        </span>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-4 sm:p-5" aria-label="Loading dashboard data">
      {[1, 2, 3].map(item => (
        <div key={item} className="h-[62px] animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-detail-title"
        className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-lg sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              New account
            </p>
            <h2 id="admin-detail-title" className="mt-1 text-lg font-bold tracking-tight text-slate-950">
              Account details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-2xl border p-4 border-emerald-100 bg-emerald-50/70">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Member name
            </p>
            <p className="mt-2 break-words text-base font-semibold leading-relaxed text-slate-900">
              {item.full_name || 'New member'}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-slate-200 p-3">
              <dt className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <Mail className="h-3.5 w-3.5" /> Email
              </dt>
              <dd className="mt-1 break-all text-sm font-medium text-slate-900">
                {item.email || 'Not provided'}
              </dd>
            </div>
            
            <div className="rounded-xl border border-slate-200 p-3">
              <dt className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" /> Joined
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(item.created_at)}</dd>
            </div>
            
            <div className="min-w-0 rounded-xl border border-slate-200 p-3 sm:col-span-2">
              <dt className="text-[11px] font-semibold text-slate-500">Record ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-700">{item.id}</dd>
            </div>
          </dl>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto"
            >
              Close details
            </button>
          </div>
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
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Platform overview</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Monitor platform activity and high-level system metrics.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
          </span>
          System online
        </div>
      </header>

      <section aria-label="Platform metrics" className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard title="Total users" value={loading ? '—' : formatNumber(stats.users)} icon={Users} tone="bg-blue-50 text-blue-700" />
        <StatCard title="Active skills" value={loading ? '—' : formatNumber(stats.skills)} icon={BookOpen} tone="bg-emerald-50 text-emerald-700" />
        <StatCard title="Total sessions" value={loading ? '—' : formatNumber(stats.sessions)} icon={Clock} tone="bg-amber-50 text-amber-700" />
        <StatCard title="Platform credits" value={loading ? '—' : formatNumber(stats.credits)} icon={Coins} tone="bg-violet-50 text-violet-700" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <PanelHeader icon={Users} title="Newest accounts" description="The latest members to join the platform" count={loading ? '…' : recentUsers.length} />
          {loading ? (
            <LoadingRows />
          ) : recentUsers.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">No recent accounts to show.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentUsers.map(user => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRecord({ type: 'user', item: user })}
                    className="group flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 sm:px-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">
                      {(user.full_name || 'M').trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{user.full_name || 'New member'}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{user.email || 'Email not provided'}</span>
                    </span>
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Joined</span>
                      <span className="mt-1 block text-xs font-medium text-slate-600">{formatDate(user.created_at)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-3 text-[11px] font-medium text-slate-400 sm:px-5">
            Showing the 5 most recently created accounts
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200/80 bg-slate-950 p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">Top-up overview</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Credit purchases made through PayMongo.</p>
            </div>
          </div>

          {topupError ? (
            <div role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200">
              Could not load top-up data. Make sure the admin read policy for top-ups is in place.
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total top-up revenue</p>
                  <p className="mt-2 text-2xl font-bold">{loading ? '—' : formatPeso(topupStats.revenue)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credits sold</p>
                  <p className="mt-2 text-xl font-bold">{loading ? '—' : formatNumber(topupStats.credits)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid / Pending</p>
                  <p className="mt-2 text-xl font-bold">
                    {loading ? '—' : `${formatNumber(topupStats.paid)} / ${formatNumber(topupStats.pending)}`}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-xl bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid by method</p>
                {[
                  { label: 'GCash', count: topupStats.gcash },
                  { label: 'Maya', count: topupStats.maya },
                ].map(method => {
                  const pct = topupStats.paid ? Math.round((method.count / topupStats.paid) * 100) : 0;
                  return (
                    <div key={method.label}>
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>{method.label}</span>
                        <span>{loading ? '—' : `${formatNumber(method.count)} · ${pct}%`}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${loading ? 0 : pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <p>Only paid top-ups count toward revenue and credits sold.</p>
          </div>
        </aside>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <PanelHeader
          icon={Wallet}
          title="Recent top-ups"
          description="The latest credit purchases on the platform"
          count={loading ? '…' : recentTopups.length}
          tone="text-emerald-700"
        />
        {loading ? (
          <LoadingRows />
        ) : topupError ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">Top-up records are not available right now.</div>
        ) : recentTopups.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">No top-ups yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentTopups.map(topup => {
              const member = relationOne(topup.user_profiles);
              return (
                <li key={topup.id} className="flex min-h-[68px] items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">
                    {(member?.full_name || 'M').trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{member?.full_name || 'Unknown member'}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {methodLabel(topup.payment_method)} · {formatDate(topup.created_at)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="block text-sm font-bold text-slate-800">{formatPeso(topup.amount_php)}</span>
                    <span className="mt-1 block text-xs font-medium text-slate-500">+{formatNumber(topup.credits_added)} credits</span>
                  </span>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${topupStatusTone(topup.status)}`}>
                    {topup.status || 'unknown'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-slate-100 px-4 py-3 text-[11px] font-medium text-slate-400 sm:px-5">
          Showing the 5 most recent top-ups, including pending ones
        </div>
      </section>

      <DetailModal record={selectedRecord} onClose={closeDetails} />
    </div>
  );
}