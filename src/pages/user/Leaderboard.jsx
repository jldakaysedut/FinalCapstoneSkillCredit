import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import {
  Star, GraduationCap, Coins, Users, Trophy,
  TrendingUp, Award, ChevronRight
} from 'lucide-react';
​
// ─────────────────────────────────────────────────────────────────
// LEADERBOARD V1 — Sessions-style clean header
// Header: small uppercase label + big bold h1 + pill toggle on right
// Matches My Sessions page header exactly.
// ─────────────────────────────────────────────────────────────────
​
const CATEGORY_TABS = [
  { key: 'ratings',  label: 'Top Rated',    icon: Star,          color: 'text-amber-600',   active: 'bg-gray-900 text-white border-gray-900'   },
  { key: 'sessions', label: 'Most Sessions', icon: GraduationCap, color: 'text-sky-600',     active: 'bg-gray-900 text-white border-gray-900'   },
  { key: 'credits',  label: 'Credits',       icon: Coins,         color: 'text-emerald-600', active: 'bg-gray-900 text-white border-gray-900'   },
];
​
const MEDALS = {
  1: { label: 'Champion',  bg: 'from-amber-400 to-yellow-300',  ring: 'ring-amber-300',  text: 'text-amber-900',  badge: 'bg-amber-100 border-amber-300 text-amber-800'  },
  2: { label: 'Runner-up', bg: 'from-gray-400 to-gray-300',     ring: 'ring-gray-300',   text: 'text-gray-700',   badge: 'bg-gray-100 border-gray-300 text-gray-600'    },
  3: { label: '3rd Place', bg: 'from-orange-400 to-amber-300',  ring: 'ring-orange-300', text: 'text-orange-900', badge: 'bg-orange-50 border-orange-300 text-orange-700' },
};
​
export default function Leaderboard() {
  const navigate = useNavigate();
  const [loading,      setLoading]      = useState(true);
  const [categoryTab,  setCategoryTab]  = useState('ratings');
  const [profiles,     setProfiles]     = useState([]);
  const [statsSummary, setStatsSummary] = useState({ totalUsers: 0, topRating: '0.0', totalSessionsCompleted: 0, totalCreditsCirculating: 0 });
​
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [{ data: usersData }, { data: reviewsData }, { data: sessionsData }] = await Promise.all([
  supabase.from('user_profiles').select('id,full_name,avatar_url,bio,role,credits_balance').eq('is_deleted', false),
  supabase.from('reviews').select('instructor_id,rating,q1_clarity,q2_patience,q3_relevance,q4_professionalism'),
  supabase.from('sessions').select('instructor_id,status'),
]);
        const reviewMap = {};
        reviewsData?.forEach(rev => {
          if (!reviewMap[rev.instructor_id]) reviewMap[rev.instructor_id] = { sum: 0, count: 0 };
          const avg5 = ([rev.rating, rev.q1_clarity, rev.q2_patience, rev.q3_relevance, rev.q4_professionalism].map(Number).reduce((a, b) => a + b, 0)) / 5;
          reviewMap[rev.instructor_id].sum += avg5;
          reviewMap[rev.instructor_id].count++;
        });
        const sessionMap = {}; let totalDone = 0;
        sessionsData?.forEach(s => { if (s.status === 'completed') { totalDone++; sessionMap[s.instructor_id] = (sessionMap[s.instructor_id] || 0) + 1; } });
        let topRating = 0, totalCredits = 0;
        const processed = (usersData || []).map(u => {
          const r = reviewMap[u.id] || { sum: 0, count: 0 };
          const avg = r.count > 0 ? parseFloat((r.sum / r.count).toFixed(1)) : 0;
          totalCredits += Number(u.credits_balance || 0);
          if (avg > topRating) topRating = avg;
          return { ...u, avgRating: avg, totalReviews: r.count, sessionsCompleted: sessionMap[u.id] || 0, creditsBalance: Number(u.credits_balance || 0) };
        });
        setProfiles(processed);
        setStatsSummary({ totalUsers: processed.length, topRating: topRating > 0 ? topRating.toFixed(1) : '5.0', totalSessionsCompleted: totalDone, totalCreditsCirculating: totalCredits });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    run();
  }, []);
​
  const sorted = useMemo(() => {
    const list = [...profiles];
    if (categoryTab === 'ratings')  list.sort((a, b) => b.avgRating - a.avgRating || b.totalReviews - a.totalReviews);
    if (categoryTab === 'sessions') list.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted || b.avgRating - a.avgRating);
    if (categoryTab === 'credits')  list.sort((a, b) => b.creditsBalance - a.creditsBalance);
    return list;
  }, [profiles, categoryTab]);
​
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
​
  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading leaderboard" className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-[1000px] animate-pulse px-6 py-5 md:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="space-y-2"><div className="h-3 w-32 rounded bg-emerald-100" /><div className="h-7 w-48 rounded bg-gray-200" /></div>
          <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-1"><div className="h-8 w-24 rounded-full bg-gray-200" /><div className="h-8 w-24 rounded-full bg-gray-100" /><div className="h-8 w-20 rounded-full bg-gray-100" /></div>
        </div>
        <div className="mb-8 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map(item => <div key={item} className="flex items-center gap-2 px-3 py-2"><div className="h-4 w-4 rounded bg-gray-200" /><div className="space-y-1.5"><div className="h-2.5 w-20 rounded bg-gray-200" /><div className="h-4 w-12 rounded bg-gray-300" /></div></div>)}
        </div>
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3"><div className="h-4 w-4 rounded bg-amber-100" /><div className="h-3 w-24 rounded bg-gray-200" /><div className="h-px flex-1 bg-gray-200" /></div>
          <div className="flex flex-col items-start gap-5 rounded-3xl border border-gray-200 bg-white px-7 py-7 sm:flex-row sm:items-center">
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-emerald-100" />
            <div className="min-w-0 flex-1 space-y-3"><div className="flex gap-2"><div className="h-5 w-20 rounded-full bg-amber-100" /><div className="h-5 w-16 rounded-full bg-emerald-100" /></div><div className="h-5 w-44 rounded bg-gray-200" /><div className="h-3 w-full max-w-md rounded bg-gray-100" /><div className="flex flex-wrap gap-2"><div className="h-8 w-24 rounded-xl bg-amber-50" /><div className="h-8 w-28 rounded-xl bg-sky-50" /><div className="h-8 w-24 rounded-xl bg-emerald-50" /></div></div>
            <div className="space-y-2 sm:text-right"><div className="h-9 w-16 rounded bg-gray-200" /><div className="h-3 w-20 rounded bg-gray-100" /></div>
          </div>
        </div>
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3"><div className="h-4 w-4 rounded bg-gray-200" /><div className="h-3 w-24 rounded bg-gray-200" /><div className="h-px flex-1 bg-gray-200" /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{[0, 1].map(item => <div key={item} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"><div className="flex items-center gap-3"><div className="h-12 w-12 rounded-xl bg-emerald-100" /><div className="space-y-2"><div className="h-4 w-28 rounded bg-gray-200" /><div className="h-3 w-20 rounded bg-gray-100" /></div></div><div className="h-3 w-full rounded bg-gray-100" /><div className="flex gap-2 border-t border-gray-100 pt-3"><div className="h-5 w-12 rounded bg-amber-50" /><div className="h-5 w-12 rounded bg-sky-50" /><div className="h-5 w-12 rounded bg-emerald-50" /></div></div>)}</div>
        </div>
        <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map(item => <div key={item} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"><div className="h-10 w-10 rounded-full bg-emerald-100" /><div className="flex-1 space-y-2"><div className="h-3.5 w-32 rounded bg-gray-200" /><div className="h-3 w-20 rounded bg-gray-100" /><div className="h-2.5 w-36 rounded bg-gray-100" /></div><div className="h-6 w-12 rounded bg-gray-100" /></div>)}</div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">{[0, 1, 2, 3].map(item => <div key={item} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3"><div className="h-3 w-6 rounded bg-gray-100" /><div className="h-8 w-8 rounded-full bg-emerald-100" /><div className="h-3.5 w-36 rounded bg-gray-200" /><div className="ml-auto h-3 w-20 rounded bg-gray-100" /></div>)}</div>
      </div>
    </div>
  );
  const champion  = sorted[0]  ? { user: sorted[0],  rank: 1 } : null;
  const top2to3   = sorted.slice(1, 3).map((u, i) => ({ user: u, rank: i + 2 }));
  const top4to10  = sorted.slice(3, 10).map((u, i) => ({ user: u, rank: i + 4 }));
  const community = sorted.slice(10).map((u, i) => ({ user: u, rank: i + 11 }));
​
  return (
    <div className="min-h-screen" style={{ background: '#faf9f6' }}>
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-5">
​
        {/* ══ PAGE HEADER — Sessions style ══ */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Community Rankings</p>
          <div className="flex items-end justify-between">
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Hall of Fame 🏆</h1>
            {/* Category pill toggle — same pattern as Sessions role filter */}
            <div className="flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
              {CATEGORY_TABS.map(tab => (
                <button key={tab.key} onClick={() => setCategoryTab(tab.key)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition ${
                    categoryTab === tab.key ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-900'
                  }`}>{tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
​
        {/* ══ STAT STRIP — same kanban-pill style, sits below header ══ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 bg-gray-50 p-3 rounded-xl border border-gray-100 gap-2">
          {[
            { icon: Users,         label: 'Members',         value: statsSummary.totalUsers,                color: 'text-gray-700'    },
            { icon: Star,          label: 'Top Rating',      value: statsSummary.topRating,                 color: 'text-amber-600'   },
            { icon: GraduationCap, label: 'Sessions Done',   value: statsSummary.totalSessionsCompleted,    color: 'text-sky-600'     },
            { icon: Coins,         label: 'Credits in Flow', value: statsSummary.totalCreditsCirculating,   color: 'text-emerald-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1">
              <Icon className={`w-4 h-4 shrink-0 ${color}`} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</span>
              <span className={`text-[17px] font-bold ml-1 ${color}`}>{value}</span>
            </div>
          ))}
        </div>
​
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-20 bg-white border border-gray-200 rounded-2xl text-center shadow-sm">
            <Trophy className="w-10 h-10 text-gray-300 mb-4" />
            <p className="text-[18px] font-bold text-gray-900 mb-1">No members yet</p>
            <p className="text-[12px] text-gray-400">Check back after some sessions are completed.</p>
          </div>
        ) : (
          <div className="space-y-10">
​
            {/* ══ #1 CHAMPION SPOTLIGHT ══ */}
            {champion && (() => {
              const { user, rank } = champion;
              const medal = MEDALS[rank];
              return (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Champion</p>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="relative bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => navigate(`/user/${user.id}`)}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${medal.bg} opacity-[0.08] pointer-events-none`} />
                    <div className="absolute top-4 right-6 text-[72px] font-bold text-gray-900/[0.04] leading-none select-none pointer-events-none">#1</div>
                    <div className="relative px-7 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl border-4 border-white ring-4 ${medal.ring} shadow-lg shrink-0`}>
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${medal.badge}`}>{medal.label}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-100">{user.role || 'Member'}</span>
                        </div>
                        <h2 className="text-[20px] font-bold text-gray-900 leading-tight">{user.full_name || 'Anonymous'}</h2>
                        <p className="text-[12px] text-gray-400 mt-1 line-clamp-2">{user.bio || 'Platform contributor ready to share skills.'}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-xl text-[12px]">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{user.avgRating > 0 ? user.avgRating : '—'}
                            <span className="text-[10px] text-amber-500 font-medium">· {user.totalReviews} reviews</span>
                          </span>
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-100 text-sky-700 font-bold rounded-xl text-[12px]">
                            <GraduationCap className="w-3.5 h-3.5" />{user.sessionsCompleted} sessions
                          </span>
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded-xl text-[12px]">
                            <Coins className="w-3.5 h-3.5" />{user.creditsBalance} CR
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <p className={`text-[32px] font-bold leading-none ${medal.text}`}>{getPrimaryScore(user)}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{getPrimarySub()}</p>
                        <span className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700">View Profile <ChevronRight className="w-3.5 h-3.5" /></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
​
            {/* ══ #2 & #3 SIDE BY SIDE ══ */}
            {top2to3.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-4 h-4 text-gray-400" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Runners-up</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-300">{top2to3.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {top2to3.map(({ user, rank }) => {
                    const medal = MEDALS[rank];
                    return (
                      <div key={user.id} className="relative bg-white border border-gray-200 rounded-2xl px-5 py-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden cursor-pointer" onClick={() => navigate(`/user/${user.id}`)}>
                        <div className="absolute top-3 right-4 text-[48px] font-bold text-gray-900/[0.04] leading-none select-none">#{rank}</div>
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${medal.bg}`} />
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-xl overflow-hidden bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg border-2 border-white ring-2 ${medal.ring} shadow-sm shrink-0`}>
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
                        <p className="text-[12px] text-gray-500 line-clamp-1 mb-4">{user.bio || 'Platform contributor.'}</p>
                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
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
​
            {/* ══ TOP 10 GRID (#4–#10) ══ */}
            {top4to10.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Top 10</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-300">{top4to10.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {top4to10.map(({ user, rank }) => (
                    <div key={user.id} className="bg-white border border-gray-200 rounded-2xl px-4 py-4 flex items-center gap-3 hover:shadow-sm hover:border-sky-200 transition-all duration-200 cursor-pointer relative overflow-hidden" onClick={() => navigate(`/user/${user.id}`)}>
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-300 rounded-l-2xl" />
                      <div className="absolute top-2 right-3 text-[32px] font-bold text-gray-900/[0.04] leading-none select-none">#{rank}</div>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200 shrink-0 ml-1">
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[14px] text-gray-900 truncate">{user.full_name || 'Anonymous'}</p>
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
                        <p className="text-[17px] font-bold text-gray-800">{getPrimaryScore(user)}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{getPrimarySub()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
​
            {/* ══ COMMUNITY (11+) COMPACT LIST ══ */}
            {community.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Community</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-300">{community.length}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  {community.map(({ user, rank }, i) => (
                    <div key={user.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition ${i < community.length - 1 ? 'border-b border-gray-100' : ''}`} onClick={() => navigate(`/user/${user.id}`)}>
                      <span className="text-[11px] font-bold text-gray-300 w-6 text-right shrink-0">#{rank}</span>
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
​
          </div>
        )}
      </div>
    </div>
  );
}