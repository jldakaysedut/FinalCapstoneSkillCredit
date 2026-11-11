import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import {
  Star, GraduationCap, Coins, Users, Trophy,
  TrendingUp, Award, ChevronRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// LEADERBOARD V1 — Sessions-style clean header
// Header: small uppercase label + big bold h1 + pill toggle on right
// Matches My Sessions page header exactly.
// ─────────────────────────────────────────────────────────────────

const CATEGORY_TABS = [
  { key: 'ratings',  label: 'Top Rated',    icon: Star,          color: 'text-amber-600',   active: 'bg-gray-900 text-white border-gray-900'   },
  { key: 'sessions', label: 'Most Sessions', icon: GraduationCap, color: 'text-sky-600',     active: 'bg-gray-900 text-white border-gray-900'   },
  { key: 'credits',  label: 'Credits',       icon: Coins,         color: 'text-emerald-600', active: 'bg-gray-900 text-white border-gray-900'   },
];

const MEDALS = {
  1: { label: 'Champion',  bg: 'from-amber-400 to-yellow-300',  ring: 'ring-amber-300',  text: 'text-amber-900',  badge: 'bg-amber-100 border-amber-300 text-amber-800'  },
  2: { label: 'Runner-up', bg: 'from-gray-400 to-gray-300',     ring: 'ring-gray-300',   text: 'text-gray-700',   badge: 'bg-gray-100 border-gray-300 text-gray-600'    },
  3: { label: '3rd Place', bg: 'from-orange-400 to-amber-300',  ring: 'ring-orange-300', text: 'text-orange-900', badge: 'bg-orange-50 border-orange-300 text-orange-700' },
};

export default function Leaderboard() {
  const navigate = useNavigate();
  const [loading,      setLoading]      = useState(true);
  const [categoryTab,  setCategoryTab]  = useState('ratings');
  const [profiles,     setProfiles]     = useState([]);
  const [statsSummary, setStatsSummary] = useState({ totalUsers: 0, topRating: '0.0', totalSessionsCompleted: 0, totalCreditsCirculating: 0 });

  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let disposed = false;
    let requesting = false;
    const loadGlobalLeaderboard = async (initial = false) => {
      if (disposed || requesting) return;
      requesting = true;
      if (initial) setLoading(true);
      try {
        // The Edge Function validates the signed-in user, then computes
        // platform-wide aggregates securely. No personal/RLS-filtered session
        // rows or service-role credentials are exposed to the browser.
        const { data, error } = await supabase.functions.invoke('skillcredit-leaderboard', { body: {} });
        if (error) throw error;
        if (!data || !Array.isArray(data.profiles) || !data.statsSummary ||
            !Number.isFinite(Number(data.statsSummary.totalUsers)) ||
            !Number.isFinite(Number(data.statsSummary.totalSessionsCompleted))) {
          throw new Error('Unexpected leaderboard response');
        }
        if (!disposed) {
          setProfiles(data.profiles);
          setStatsSummary(data.statsSummary);
          setLoadError('');
        }
      } catch (error) {
        console.error('Could not load global leaderboard:', error);
        if (!disposed) setLoadError('Global leaderboard is unavailable. Please try again.');
      } finally {
        requesting = false;
        if (!disposed) setLoading(false);
      }
    };

    loadGlobalLeaderboard(true);
    // Poll global totals rather than relying on the user's RLS-limited
    // session realtime events. Also refresh on tab focus/visibility changes.
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') loadGlobalLeaderboard();
    }, 45_000);
    const onFocus = () => loadGlobalLeaderboard();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadGlobalLeaderboard();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [retryKey]);

  const sorted = useMemo(() => {
    const list = [...profiles];
    if (categoryTab === 'ratings')  list.sort((a, b) => b.avgRating - a.avgRating || b.totalReviews - a.totalReviews || a.id.localeCompare(b.id));
    if (categoryTab === 'sessions') list.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted || b.avgRating - a.avgRating || a.id.localeCompare(b.id));
    if (categoryTab === 'credits')  list.sort((a, b) => b.creditsBalance - a.creditsBalance || a.id.localeCompare(b.id));
    return list;
  }, [profiles, categoryTab]);

  const getPrimaryScore = (user) => {
    if (categoryTab === 'ratings')  return user.avgRating > 0 ? user.avgRating : '—';
    if (categoryTab === 'sessions') return user.sessionsCompleted;
    return `${user.creditsBalance} CR`;
  };
  const getPrimarySub = () => {
    if (categoryTab === 'ratings')  return 'avg rating';
    if (categoryTab === 'sessions') return 'sessions taught';
    return 'wallet balance';
  };

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading leaderboard" className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-[1000px] animate-pulse px-3 py-4 min-[360px]:px-4 lg:px-8 lg:py-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <div className="space-y-2"><div className="h-3 w-32 rounded bg-emerald-100" /><div className="h-7 w-48 rounded bg-gray-200" /></div>
          <div className="flex max-w-full gap-1 overflow-hidden rounded-full border border-gray-200 bg-white p-1"><div className="h-8 w-24 rounded-full bg-gray-200" /><div className="h-8 w-24 rounded-full bg-gray-100" /><div className="h-8 w-20 rounded-full bg-gray-100" /></div>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2 lg:mb-8 lg:grid-cols-4 lg:gap-3 lg:p-3">
          {[0, 1, 2, 3].map(item => <div key={item} className="flex items-center gap-2 px-3 py-2"><div className="h-4 w-4 rounded bg-gray-200" /><div className="space-y-1.5"><div className="h-2.5 w-20 rounded bg-gray-200" /><div className="h-4 w-12 rounded bg-gray-300" /></div></div>)}
        </div>
        <div className="mb-6 lg:mb-10">
          <div className="mb-4 flex items-center gap-3"><div className="h-4 w-4 rounded bg-amber-100" /><div className="h-3 w-24 rounded bg-gray-200" /><div className="h-px flex-1 bg-gray-200" /></div>
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-4 lg:flex-row lg:items-center lg:gap-5 lg:rounded-3xl lg:px-7 lg:py-7">
            <div className="h-14 w-14 shrink-0 rounded-xl bg-emerald-100 lg:h-20 lg:w-20 lg:rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-3"><div className="flex gap-2"><div className="h-5 w-20 rounded-full bg-amber-100" /><div className="h-5 w-16 rounded-full bg-emerald-100" /></div><div className="h-5 w-44 rounded bg-gray-200" /><div className="h-3 w-full max-w-md rounded bg-gray-100" /><div className="flex flex-wrap gap-2"><div className="h-8 w-24 rounded-xl bg-amber-50" /><div className="h-8 w-28 rounded-xl bg-sky-50" /><div className="h-8 w-24 rounded-xl bg-emerald-50" /></div></div>
            <div className="space-y-2 sm:text-right"><div className="h-9 w-16 rounded bg-gray-200" /><div className="h-3 w-20 rounded bg-gray-100" /></div>
          </div>
        </div>
        <div className="mb-6 lg:mb-10">
          <div className="mb-4 flex items-center gap-3"><div className="h-4 w-4 rounded bg-gray-200" /><div className="h-3 w-24 rounded bg-gray-200" /><div className="h-px flex-1 bg-gray-200" /></div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4">{[0, 1].map(item => <div key={item} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"><div className="flex items-center gap-3"><div className="h-12 w-12 rounded-xl bg-emerald-100" /><div className="space-y-2"><div className="h-4 w-28 rounded bg-gray-200" /><div className="h-3 w-20 rounded bg-gray-100" /></div></div><div className="h-3 w-full rounded bg-gray-100" /><div className="flex gap-2 border-t border-gray-100 pt-3"><div className="h-5 w-12 rounded bg-amber-50" /><div className="h-5 w-12 rounded bg-sky-50" /><div className="h-5 w-12 rounded bg-emerald-50" /></div></div>)}</div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-2 lg:mb-10 lg:grid-cols-2 lg:gap-3">{[0, 1, 2, 3].map(item => <div key={item} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"><div className="h-10 w-10 rounded-full bg-emerald-100" /><div className="flex-1 space-y-2"><div className="h-3.5 w-32 rounded bg-gray-200" /><div className="h-3 w-20 rounded bg-gray-100" /><div className="h-2.5 w-36 rounded bg-gray-100" /></div><div className="h-6 w-12 rounded bg-gray-100" /></div>)}</div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">{[0, 1, 2, 3].map(item => <div key={item} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3"><div className="h-3 w-6 rounded bg-gray-100" /><div className="h-8 w-8 rounded-full bg-emerald-100" /><div className="h-3.5 w-36 rounded bg-gray-200" /><div className="ml-auto h-3 w-20 rounded bg-gray-100" /></div>)}</div>
      </div>
    </div>
  );
  const champion  = sorted[0]  ? { user: sorted[0],  rank: 1 } : null;
  const top2to3   = sorted.slice(1, 3).map((u, i) => ({ user: u, rank: i + 2 }));
  const top4to10  = sorted.slice(3, 10).map((u, i) => ({ user: u, rank: i + 4 }));
  const community = sorted.slice(10).map((u, i) => ({ user: u, rank: i + 11 }));

  return (
    <div className="min-h-screen" style={{ background: '#faf9f6' }}>
      <div className="max-w-[1000px] mx-auto min-w-0 px-3 py-3 min-[360px]:px-4 lg:px-8 lg:py-5">

        {/* ══ PAGE HEADER — Sessions style ══ */}
        <div className="mb-4 lg:mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Community Rankings</p>
          <div className="flex min-w-0 flex-col items-stretch gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-0">
            <h1 className="text-[20px] font-bold text-gray-900 tracking-tight lg:text-[22px]">Hall of Fame 🏆</h1>
            {/* Category pill toggle — same pattern as Sessions role filter */}
            <div className="flex w-full min-w-0 bg-white border border-gray-200 rounded-full p-1 shadow-sm lg:w-auto">
              {CATEGORY_TABS.map(tab => (
                <button key={tab.key} onClick={() => setCategoryTab(tab.key)}
                  className={`min-w-0 flex-1 whitespace-nowrap px-2 py-1.5 rounded-full text-[10px] font-bold transition lg:flex-none lg:px-4 lg:text-[11px] ${
                    categoryTab === tab.key ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-900'
                  }`}>{tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ STAT STRIP — same kanban-pill style, sits below header ══ */}
        {(!loadError || profiles.length > 0) && <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2 lg:mb-8 lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-2 lg:p-3">
          {[
            { icon: Users,         label: 'Members',         value: statsSummary.totalUsers,                color: 'text-gray-700'    },
            { icon: Star,          label: 'Top Rating',      value: statsSummary.topRating,                 color: 'text-amber-600'   },
            { icon: GraduationCap, label: 'Sessions Done',   value: statsSummary.totalSessionsCompleted,    color: 'text-sky-600'     },
            { icon: Coins,         label: 'Credits in Flow', value: statsSummary.totalCreditsCirculating,   color: 'text-emerald-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-0.5 rounded-lg bg-white px-2 py-2 lg:flex lg:items-center lg:gap-2 lg:rounded-none lg:bg-transparent lg:px-3 lg:py-1">
              <Icon className={`w-4 h-4 shrink-0 ${color}`} />
              <span className="min-w-0 truncate text-[9px] font-semibold uppercase tracking-wide text-gray-400 lg:text-[10px] lg:tracking-widest">{label}</span>
              <span className={`col-span-2 min-w-0 break-words text-[16px] font-bold lg:ml-1 lg:text-[17px] ${color}`}>{value}</span>
            </div>
          ))}
        </div>}

        {loadError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
            <span>{loadError}{profiles.length > 0 ? ' Displayed results may be outdated.' : ''}</span>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-100">Retry</button>
          </div>
        )}
        {loadError && profiles.length === 0 ? null : sorted.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-3 py-12 text-center shadow-sm lg:py-20">
            <Trophy className="w-10 h-10 text-gray-300 mb-4" />
            <p className="text-[18px] font-bold text-gray-900 mb-1">No members yet</p>
            <p className="text-[12px] text-gray-400">Check back after some sessions are completed.</p>
          </div>
        ) : (
          <div className="space-y-6 lg:space-y-10">

            {/* ══ #1 CHAMPION SPOTLIGHT ══ */}
            {champion && (() => {
              const { user, rank } = champion;
              const medal = MEDALS[rank];
              return (
                <div>
                  <div className="mb-2 flex min-w-0 items-center gap-2 lg:mb-4 lg:gap-3">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Champion</p>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer lg:rounded-3xl"
                    onClick={() => navigate(`/user/${user.id}`)}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${medal.bg} opacity-[0.08] pointer-events-none`} />
                    <div className="pointer-events-none absolute right-4 top-3 select-none text-[46px] font-bold leading-none text-gray-900/[0.04] lg:right-6 lg:top-4 lg:text-[72px]">#1</div>
                    <div className="relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-3 py-3 lg:flex lg:flex-row lg:items-center lg:gap-6 lg:px-7 lg:py-7">
                      <div className={`h-14 w-14 overflow-hidden rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg border-2 border-white ring-2 shrink-0 lg:h-20 lg:w-20 lg:rounded-2xl lg:text-2xl lg:border-4 lg:ring-4 ${medal.ring} shadow-lg shrink-0`}>
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${medal.badge}`}>{medal.label}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-100">{user.role || 'Member'}</span>
                        </div>
                        <h2 className="break-words text-[15px] font-bold leading-tight text-gray-900 lg:text-[20px]">{user.full_name || 'Anonymous'}</h2>
                        <p className="mt-1 line-clamp-1 break-words text-[11px] text-gray-400 lg:line-clamp-2 lg:text-[12px]">{user.bio || 'Platform contributor ready to share skills.'}</p>
                        <div className="mt-2 flex max-w-full flex-nowrap gap-1.5 overflow-x-auto pb-1 lg:mt-4 lg:flex-wrap lg:gap-2 lg:overflow-visible lg:pb-0">
                          <span className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 lg:shrink lg:gap-1.5 lg:rounded-xl lg:px-3 lg:py-1.5 lg:text-[12px]">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{user.avgRating > 0 ? user.avgRating : '—'}
                            <span className="text-[10px] text-amber-500 font-medium">· {user.totalReviews} reviews</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 rounded-lg border border-sky-100 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 lg:shrink lg:gap-1.5 lg:rounded-xl lg:px-3 lg:py-1.5 lg:text-[12px]">
                            <GraduationCap className="w-3.5 h-3.5" />{user.sessionsCompleted} sessions
                          </span>
                          <span className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 lg:shrink lg:gap-1.5 lg:rounded-xl lg:px-3 lg:py-1.5 lg:text-[12px]">
                            <Coins className="w-3.5 h-3.5" />{user.creditsBalance} CR
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 border-t border-gray-100 pt-2 lg:col-auto lg:shrink-0 lg:flex-col lg:items-end lg:justify-start lg:gap-0 lg:border-0 lg:pt-0">
                        <p className={`text-[23px] font-bold leading-none lg:text-[32px] ${medal.text}`}>{getPrimaryScore(user)}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 lg:mt-1 lg:text-[10px] lg:tracking-widest">{getPrimarySub()}</p>
                        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 lg:ml-0 lg:mt-3 lg:gap-1 lg:text-[11px]">View Profile <ChevronRight className="w-3.5 h-3.5" /></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ══ #2 & #3 SIDE BY SIDE ══ */}
            {top2to3.length > 0 && (
              <div>
                <div className="mb-2 flex min-w-0 items-center gap-2 lg:mb-4 lg:gap-3">
                  <Award className="w-4 h-4 text-gray-400" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Runners-up</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-300">{top2to3.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4">
                  {top2to3.map(({ user, rank }) => {
                    const medal = MEDALS[rank];
                    return (
                      <div key={user.id} className="relative bg-white border border-gray-200 rounded-2xl px-3 py-3 lg:px-5 lg:py-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden cursor-pointer" onClick={() => navigate(`/user/${user.id}`)}>
                        <div className="absolute top-3 right-4 text-[48px] font-bold text-gray-900/[0.04] leading-none select-none">#{rank}</div>
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${medal.bg}`} />
                        <div className="mb-2 flex min-w-0 items-center gap-2 lg:mb-3 lg:gap-3">
                          <div className={`h-10 w-10 overflow-hidden rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base border-2 border-white ring-2 lg:h-12 lg:w-12 lg:text-lg ${medal.ring} shadow-sm shrink-0`}>
                            {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : user.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wider border px-1.5 py-0.5 rounded-full ${medal.badge}`}>{medal.label}</span>
                            </div>
                            <p className="font-bold text-[15px] text-gray-900 truncate">{user.full_name || 'Anonymous'}</p>
                            <p className="text-[12px] text-gray-400 truncate">{user.role || 'Member'}</p>
                          </div>
                        </div>
                        <p className="mb-2 line-clamp-1 text-[11px] text-gray-500 lg:mb-4 lg:text-[12px]">{user.bio || 'Platform contributor.'}</p>
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100 lg:gap-1.5 lg:pt-3">
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-lg text-[10px]"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{user.avgRating > 0 ? user.avgRating : '—'}</span>
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 border border-sky-100 text-sky-700 font-bold rounded-lg text-[10px]"><GraduationCap className="w-3 h-3" />{user.sessionsCompleted}</span>
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px]"><Coins className="w-3 h-3" />{user.creditsBalance} CR</span>
                          <span className="ml-auto flex items-center gap-0.5 text-[10px] font-bold text-gray-400">#{rank} <TrendingUp className="w-3 h-3" /></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ TOP 10 GRID (#4–#10) ══ */}
            {top4to10.length > 0 && (
              <div>
                <div className="mb-2 flex min-w-0 items-center gap-2 lg:mb-4 lg:gap-3">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Top 10</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-300">{top4to10.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
                  {top4to10.map(({ user, rank }) => (
                    <div key={user.id} className="relative flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border border-gray-200 bg-white px-3 py-3 cursor-pointer transition-all duration-200 hover:border-sky-200 hover:shadow-sm lg:gap-3 lg:px-4 lg:py-4" onClick={() => navigate(`/user/${user.id}`)}>
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-300 rounded-l-2xl" />
                      <div className="absolute top-2 right-3 text-[32px] font-bold text-gray-900/[0.04] leading-none select-none">#{rank}</div>
                      <div className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-100 text-sm font-bold text-emerald-800 lg:h-10 lg:w-10">
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[13px] font-bold text-gray-900 lg:text-[14px]">{user.full_name || 'Anonymous'}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user.role || 'Member'}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{user.avgRating > 0 ? user.avgRating : '—'}</span>
                          <span className="text-gray-200">·</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-sky-600"><GraduationCap className="w-2.5 h-2.5" />{user.sessionsCompleted}</span>
                          <span className="text-gray-200">·</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><Coins className="w-2.5 h-2.5" />{user.creditsBalance} CR</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <p className="text-right text-[15px] font-bold text-gray-800 lg:text-[17px]">{getPrimaryScore(user)}</p>
                        <p className="hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest lg:block">{getPrimarySub()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ COMMUNITY (11+) COMPACT LIST ══ */}
            {community.length > 0 && (
              <div>
                <div className="mb-2 flex min-w-0 items-center gap-2 lg:mb-4 lg:gap-3">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Community</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-300">{community.length}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  {community.map(({ user, rank }, i) => (
                    <div key={user.id} className={`flex min-w-0 items-center gap-2 px-2.5 py-2.5 hover:bg-gray-50 cursor-pointer transition lg:gap-3 lg:px-4 lg:py-3 ${i < community.length - 1 ? 'border-b border-gray-100' : ''}`} onClick={() => navigate(`/user/${user.id}`)}>
                      <span className="w-5 shrink-0 text-right text-[10px] font-bold text-gray-300 lg:w-6 lg:text-[11px]">#{rank}</span>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-gray-200 shrink-0">
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[14px] text-gray-800 truncate">{user.full_name || 'Anonymous'}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.role || 'Member'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{user.avgRating > 0 ? user.avgRating : '—'}</span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hidden sm:flex"><GraduationCap className="w-3 h-3" />{user.sessionsCompleted}</span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hidden sm:flex"><Coins className="w-3 h-3" />{user.creditsBalance} CR</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}