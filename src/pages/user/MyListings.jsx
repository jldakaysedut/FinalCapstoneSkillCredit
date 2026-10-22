import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, BookOpen, Briefcase, ChefHat, ChevronDown, CircleHelp, ClipboardList, Code2, Coins, Dumbbell, ExternalLink, Film, Gamepad2, Hammer, Leaf, MessageCircle, Monitor, Music2, Palette, PenLine, Scissors, Star, Tag, Trash2, Wrench, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'; // 🚨 ADDED useLocation
import supabase from '../../supabaseClient';

const CATEGORIES = [
  { name: 'Cooking & Baking',      icon: ChefHat,       iconColor: 'text-orange-500',  color: '#f97316' },
  { name: 'Gardening & Farming',   icon: Leaf,          iconColor: 'text-green-500',   color: '#16a34a' },
  { name: 'Home & DIY',            icon: Hammer,        iconColor: 'text-yellow-600',  color: '#ca8a04' },
  { name: 'Health & Fitness',      icon: Dumbbell,      iconColor: 'text-red-500',     color: '#ef4444' },
  { name: 'Beauty & Grooming',     icon: Scissors,      iconColor: 'text-pink-500',    color: '#ec4899' },
  { name: 'Gaming & Hobbies',      icon: Gamepad2,      iconColor: 'text-violet-500',  color: '#8b5cf6' },
  { name: 'Electronics & Repair',  icon: Wrench,        iconColor: 'text-blue-500',    color: '#3b82f6' },
  { name: 'School & Tutoring',     icon: BookOpen,      iconColor: 'text-indigo-500',  color: '#6366f1' },
  { name: 'Writing & Content',     icon: PenLine,       iconColor: 'text-teal-500',    color: '#14b8a6' },
  { name: 'Languages & Speaking',  icon: MessageCircle, iconColor: 'text-cyan-500',    color: '#06b6d4' },
  { name: 'Singing & Instruments', icon: Music2,         iconColor: 'text-fuchsia-500', color: '#d946ef' },
  { name: 'Art & Graphic Design',  icon: Palette,       iconColor: 'text-rose-500',    color: '#f43f5e' },
  { name: 'Video & Animation',     icon: Film,          iconColor: 'text-amber-500',   color: '#f59e0b' },
  { name: 'Business & Freelance',  icon: Briefcase,     iconColor: 'text-slate-600',   color: '#475569' },
  { name: 'Financial Literacy',    icon: Coins,         iconColor: 'text-emerald-600', color: '#059669' },
  { name: 'UI/UX Design',          icon: Monitor,       iconColor: 'text-sky-500',     color: '#0ea5e9' },
  { name: 'Coding & Tech',         icon: Code2,         iconColor: 'text-lime-600',    color: '#65a30d' },
];
const catInfo = n => CATEGORIES.find(c => c.name === n) ?? { icon: Tag, iconColor: 'text-slate-500', color: '#6b7280' };

function timeAgo(d) {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function RadialProgress({ pct, size = 48, stroke = 5 }) {
  const r   = (size - stroke) / 2;
  const c   = 2 * Math.PI * r;
  const col = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : pct > 0 ? '#f87171' : '#e5e7eb';
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={stroke}
        strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size < 44 ? 8 : 10} fontWeight={900} fill="#374151">{pct}%</text>
    </svg>
  );
}

function QBar({ label, value }) {
  const pct = value ? Math.round((value / 5) * 100) : 0;
  const col = pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : value ? 'bg-rose-400' : 'bg-gray-100';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-20 shrink-0">{label}</span>
      <div className="flex-1 h-[4px] bg-gray-100 rounded-full overflow-hidden">
        {value && <div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} />}
      </div>
      <span className="text-[10px] font-bold text-gray-700 w-6 text-right">{value ? value.toFixed(1) : '—'}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="relative">
      <div className="absolute -left-6 top-5 w-[18px] h-[18px] rounded-full bg-gray-200 border-2 border-white z-10" />
      <div className="animate-pulse flex items-center gap-4 bg-white rounded-2xl px-5 py-4 border border-gray-100">
        <div className="w-14 h-14 bg-gray-100 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-gray-100 rounded-full" />
          <div className="h-3 w-32 bg-gray-100 rounded-full" />
        </div>
        <div className="flex gap-3">{[1,2,3,4].map(i => <div key={i} className="h-8 w-14 bg-gray-100 rounded-xl" />)}</div>
      </div>
    </div>
  );
}

// 🚨 ADDED currentFilter TO PROPS
function ListingRow({ skill, expanded, onToggle, onView, onDelete, currentFilter }) {
  const cat     = catInfo(skill.category);
  const CategoryIcon = cat.icon;
  const isNew   = skill.totalReviews === 0;
  const needsAct= skill.pendingSessions > 0 || skill.unratedSessions > 0;
  const compPct = skill.totalSessions > 0
    ? Math.round((skill.completedSessions / skill.totalSessions) * 100) : 0;

  return (
    <div className={`relative rounded-2xl border overflow-hidden transition-all duration-200 ${
      needsAct
        ? 'border-amber-200 bg-white shadow-[0_2px_12px_rgba(251,191,36,0.1)]'
        : 'border-gray-200 bg-white hover:border-emerald-200 hover:shadow-[0_4px_16px_rgba(16,185,129,0.08)]'
    }`}>

      {needsAct && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-2xl" />}

      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => onToggle(skill.id)}>
        <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden relative" style={{ background: cat.color + '15' }}>
          {skill.cover_image_url
            ? <img src={skill.cover_image_url} alt={skill.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><CategoryIcon className={`h-7 w-7 ${cat.iconColor}`} strokeWidth={1.8} /></div>}
          {needsAct && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
              <Zap className="h-2.5 w-2.5 text-white" fill="currentColor" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-[14px] text-gray-900 truncate hover:text-emerald-700 transition-colors"
              onClick={e => { e.stopPropagation(); onView(skill.id); }}>
              {skill.title}
            </h3>
            {/* 🚨 ADDED PENDING AND REJECTED BADGES HERE 🚨 */}
            {isNew && <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">NEW</span>}
            {skill.status === 'pending' && <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">⏳ IN REVIEW</span>}
            {skill.status === 'rejected' && <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">❌ REJECTED</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${cat.iconColor}`}><CategoryIcon className="h-3.5 w-3.5" strokeWidth={2} />{skill.category}</span>
            <span className="text-gray-300">·</span>
            <span className="text-[11px] text-gray-400">{skill.format}</span>
            <span className="text-gray-300">·</span>
            <span className="text-[11px] text-gray-400">{timeAgo(skill.created_at)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-center px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl">
            <span className="text-[13px] font-bold text-amber-700">{skill.credit_cost}</span>
            <span className="text-[10px] font-bold uppercase text-amber-500">CR/HR</span>
          </div>
          <div className="flex flex-col items-center px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-xl">
            <span className="text-[13px] font-bold text-sky-600">{skill.totalSessions}</span>
            <span className="text-[10px] font-bold uppercase text-sky-400">SESS.</span>
          </div>
          <div className="flex flex-col items-center px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-xl">
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[13px] font-bold text-orange-600">{isNew ? '—' : skill.avgRating}</span>
            </div>
            <span className="text-[10px] font-bold uppercase text-orange-400">RATING</span>
          </div>
          <RadialProgress pct={compPct} size={44} stroke={4} />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 🚨 CONDITION UPDATED: HIDDEN IF FILTER IS 'all' AND ONLY UNRATED EXISTS TO FIX ALIGNMENT */}
          {needsAct && !(currentFilter === 'all' && skill.unratedSessions > 0 && skill.pendingSessions === 0) && (
            <span className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
              <Zap className="h-3 w-3" /> {skill.pendingSessions > 0 ? `${skill.pendingSessions} pending` : `${skill.unratedSessions} unrated`}
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); onView(skill.id); }}
            className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer" title="View">
            <ExternalLink className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(skill.id); }}
            className="p-2 rounded-xl text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); onToggle(skill.id); }}
            className={`p-2 rounded-xl transition cursor-pointer ${
              expanded ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}>
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 mx-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Session Breakdown</p>
            <div className="space-y-1.5">
              {[
                { label: 'Pending',   count: skill.pendingSessions,   dot: 'bg-amber-400',   txt: 'text-amber-700' },
                { label: 'Active',    count: skill.activeSessions,    dot: 'bg-emerald-400', txt: 'text-emerald-700' },
                { label: 'Upcoming',  count: skill.upcomingSessions,  dot: 'bg-sky-400',     txt: 'text-sky-700' },
                { label: 'Confirmed', count: skill.confirmedSessions, dot: 'bg-teal-400',    txt: 'text-teal-700' },
                { label: 'Completed', count: skill.completedSessions, dot: 'bg-gray-500',    txt: 'text-gray-700' },
                { label: 'Cancelled', count: skill.cancelledSessions, dot: 'bg-gray-300',    txt: 'text-gray-400' },
              ].filter(s => s.count > 0).map(s => (
                <div key={s.label} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-gray-600 font-medium">{s.label}</span>
                  </div>
                  <span className={`font-bold ${s.txt}`}>{s.count}</span>
                </div>
              ))}
              {skill.totalSessions === 0 && <p className="text-[11px] text-gray-300 italic">No sessions yet</p>}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Review Quality</p>
            <div className="space-y-2">
              <QBar label="Clarity"       value={skill.avgClarity} />
              <QBar label="Patience"      value={skill.avgPatience} />
              <QBar label="Relevance"     value={skill.avgRelevance} />
              <QBar label="Professional." value={skill.avgProfessionalism} />
            </div>
            {!skill.totalReviews && <p className="text-[11px] text-gray-300 italic mt-2">No reviews yet</p>}
          </div>
          <div className="flex flex-col gap-3">
            {/* 🚨 REJECTION REASON DISPLAY 🚨 */}
            {skill.status === 'rejected' && skill.rejection_reason && (
              <div className="bg-rose-50 rounded-xl border border-rose-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Moderator Note (Rejected)</p>
                <p className="text-[11px] text-rose-700 italic font-medium">{skill.rejection_reason}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Earnings</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[26px] font-bold text-orange-600 leading-none">{skill.totalEarned}</span>
                <span className="text-[11px] font-bold text-orange-400">credits earned</span>
              </div>
              {skill.unratedSessions > 0 && (
                <p className="flex items-center gap-1 text-[11px] text-rose-500 font-bold mt-1"><CircleHelp className="h-3.5 w-3.5" />{skill.unratedSessions} unrated session{skill.unratedSessions > 1 ? 's' : ''}</p>
              )}
            </div>
            {skill.latestReview?.feedback && (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Latest Review</p>
                <p className="text-[11px] text-gray-600 italic line-clamp-2 font-medium">&ldquo;{skill.latestReview.feedback}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─ Main Page ──────────────────────────────────────────────────────────────────
export default function MyListings() {
  const navigate = useNavigate();
  const location = useLocation(); // 🚨 ADDED
  const [highlightId, setHighlightId] = useState(null); // 🚨 ADDED
  
  const [skills,   setSkills]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [expanded, setExpanded] = useState(new Set());
  const [profile,  setProfile]  = useState(null);
  const [stats,    setStats]    = useState({
    totalListings: 0, totalSessions: 0, totalEarned: 0,
    totalPending: 0,  totalUnrated: 0,  avgRating: 0, totalReviews: 0,
    totalActive: 0,   totalCompleted: 0, totalCancelled: 0,
  });

  useEffect(() => { fetchMyListings(); }, []);

  // 🚨 ADDED HIGHLIGHT EFFECT
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hId = params.get('highlight');
    if (hId && skills.length > 0) {
      setExpanded(prev => new Set(prev).add(hId)); 
      
      setTimeout(() => {
        const el = document.getElementById(`skill-${hId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightId(hId);
          setTimeout(() => setHighlightId(null), 3000);
        }
      }, 500); 
    }
  }, [location.search, skills]);

  const fetchMyListings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    const { data: pData } = await supabase.from('user_profiles').select('full_name, credits_balance, avatar_url').eq('id', user.id).single();
    if (pData) setProfile(pData);
    
    // 🚨 UPDATED QUERY: ADDED STATUS AND REJECTION_REASON
    const { data, error } = await supabase.from('skills').select(`
      id, title, category, format, duration, credit_cost, cover_image_url,
      description, portfolio_url, created_at, status, rejection_reason,
      reviews ( rating, feedback, created_at, q1_clarity, q2_patience, q3_relevance, q4_professionalism ),
      sessions ( id, status, credit_amount, student_completed, instructor_completed, is_rated )
    `).eq('instructor_id', user.id)
      .eq('is_active', true) 
      .order('created_at', { ascending: false });
      
    if (error || !data) { setLoading(false); return; }
    let gEarned = 0, gSess = 0, gPend = 0, gUnrated = 0, gRatingSum = 0, gRevCnt = 0, gActive = 0, gCompleted = 0, gCancelled = 0;
    const enriched = data.map(skill => {
      const rv = skill.reviews || []; const ss = skill.sessions || []; const n = rv.length;
      const avg = key => n > 0 ? parseFloat((rv.reduce((a, r) => a + (Number(r[key]) || 0), 0) / n).toFixed(1)) : null;
      gRatingSum += rv.reduce((a, r) => a + (Number(r.rating) || 0), 0); gRevCnt += n;
      const byStatus  = s => ss.filter(x => x.status === s).length;
      const completed = ss.filter(s => s.student_completed && s.instructor_completed);
      const earned    = completed.reduce((a, s) => a + (s.credit_amount || 0), 0);
      const unrated   = ss.filter(s => s.student_completed && s.instructor_completed && !s.is_rated).length;
      const pending   = byStatus('pending'); const active = byStatus('active'); const cancelled = byStatus('cancelled');
      gEarned += earned; gSess += ss.length; gPend += pending; gUnrated += unrated;
      gActive += active; gCompleted += completed.length; gCancelled += cancelled;
      return { ...skill, avgRating: n > 0 ? parseFloat((rv.reduce((a,r)=>a+(Number(r.rating)||0),0)/n).toFixed(1)) : 0, totalReviews: n, avgClarity: avg('q1_clarity'), avgPatience: avg('q2_patience'), avgRelevance: avg('q3_relevance'), avgProfessionalism: avg('q4_professionalism'), latestReview: n > 0 ? [...rv].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0] : null, totalSessions: ss.length, completedSessions: completed.length, pendingSessions: pending, activeSessions: active, upcomingSessions: byStatus('upcoming'), confirmedSessions: byStatus('confirmed'), cancelledSessions: cancelled, unratedSessions: unrated, totalEarned: earned };
    });
    setSkills(enriched);
    setStats({ totalListings: enriched.length, totalSessions: gSess, totalEarned: gEarned, totalPending: gPend, totalUnrated: gUnrated, avgRating: gRevCnt > 0 ? (gRatingSum / gRevCnt).toFixed(1) : 0, totalReviews: gRevCnt, totalActive: gActive, totalCompleted: gCompleted, totalCancelled: gCancelled });
    setLoading(false);
  };

  const handleDelete = async skillId => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    
    try {
      const { data: active } = await supabase
        .from('sessions')
        .select('id')
        .eq('skill_id', skillId)
        .in('status', ['pending', 'active', 'upcoming', 'confirmed']);
        
      if (active?.length > 0) { 
        alert('Cannot delete: This skill currently has active or pending sessions.'); 
        return; 
      }

      const { error } = await supabase
        .from('skills')
        .update({ is_active: false })
        .eq('id', skillId);
      
      if (error) throw error;
      
      setSkills(p => p.filter(s => s.id !== skillId));
      alert('Listing successfully removed.');
      
    } catch (error) {
      console.error('Error during deletion:', error);
      alert('An error occurred while deleting the skill. Please try again.');
    }
  };

  const toggleExpand = id => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const FILTERS = [
    { key: 'all',         label: 'All',         count: skills.length,                                                     dot: 'bg-emerald-500', activePill: 'bg-emerald-700 text-white border-emerald-700', activeBadge: 'bg-emerald-500/40 text-white', railColor: 'bg-orange-300',  dotColor: (s) => s.pendingSessions > 0 || s.unratedSessions > 0 ? 'bg-amber-400 ring-2 ring-amber-100' : 'bg-orange-400 ring-2 ring-orange-100' },
    { key: 'has_pending', label: 'Action', icon: Zap,      count: skills.filter(s => s.pendingSessions > 0 || s.unratedSessions > 0).length, dot: 'bg-amber-400',   activePill: 'bg-amber-500 text-white border-amber-500',     activeBadge: 'bg-amber-400/40 text-white',   railColor: 'bg-amber-300',   dotColor: (_) => 'bg-amber-400 ring-2 ring-amber-100' },
    { key: 'unrated',     label: 'Unrated', icon: CircleHelp,      count: skills.filter(s => s.unratedSessions > 0).length,                         dot: 'bg-rose-400',    activePill: 'bg-rose-500 text-white border-rose-500',       activeBadge: 'bg-rose-400/40 text-white',    railColor: 'bg-rose-300',    dotColor: (_) => 'bg-rose-400 ring-2 ring-rose-100' },
    { key: 'no_reviews',  label: 'No Reviews', icon: Bell,  count: skills.filter(s => s.totalReviews === 0).length,                          dot: 'bg-purple-400',  activePill: 'bg-purple-600 text-white border-purple-600',   activeBadge: 'bg-purple-400/40 text-white',  railColor: 'bg-purple-300',  dotColor: (_) => 'bg-purple-400 ring-2 ring-purple-100' },
  ];
  const activeFilter = FILTERS.find(f => f.key === filter) ?? FILTERS[0];
  const filtered = skills.filter(s => {
    if (filter === 'has_pending') return s.pendingSessions > 0 || s.unratedSessions > 0;
    if (filter === 'unrated')     return s.unratedSessions > 0;
    if (filter === 'no_reviews')  return s.totalReviews === 0;
    return true;
  });

  const STAT_TILES = [
    { label: 'Listings',   value: stats.totalListings,  icon: ClipboardList, color: 'text-orange-500', bg: 'bg-orange-50',   border: 'border-orange-100' },
    { label: 'Sessions',   value: stats.totalSessions,  icon: BookOpen, color: 'text-sky-600',     bg: 'bg-sky-50',      border: 'border-sky-100'    },
    { label: 'CR Earned',  value: stats.totalEarned,    icon: Coins, color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-100'},
    { label: 'Avg Rating', value: stats.avgRating > 0 ? stats.avgRating : '—', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    ...(stats.totalPending > 0  ? [{ label: 'Pending',  value: stats.totalPending,  icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50',  border: 'border-amber-200', click: () => setFilter('has_pending') }] : []),
    ...(stats.totalUnrated > 0  ? [{ label: 'Unrated',  value: stats.totalUnrated,  icon: CircleHelp, color: 'text-rose-600',  bg: 'bg-rose-50',   border: 'border-rose-200',  click: () => setFilter('unrated') }] : []),
  ];

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading listings" className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-[1000px] animate-pulse px-6 py-6 md:px-8">
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-emerald-900 px-6 py-5 shadow-md">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="space-y-2"><div className="h-3 w-28 rounded bg-emerald-700" /><div className="h-6 w-44 rounded bg-emerald-700" /><div className="h-3 w-56 rounded bg-emerald-800" /></div><div className="flex gap-2"><div className="h-14 w-20 rounded-xl bg-white/10" /><div className="h-14 w-20 rounded-xl bg-white/10" /><div className="h-14 w-20 rounded-xl bg-white/10" /></div></div>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[0,1,2,3].map(item => <div key={item} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4"><div className="h-10 w-10 rounded-xl bg-emerald-50" /><div className="space-y-2"><div className="h-2.5 w-16 rounded bg-gray-100" /><div className="h-5 w-12 rounded bg-gray-200" /></div></div>)}</div>
        <div className="mb-5 flex flex-wrap gap-2">{[0,1,2,3].map(item => <div key={item} className="h-10 w-24 rounded-xl border border-gray-200 bg-white" />)}</div>
        <div className="relative space-y-3 pl-6"><div className="absolute bottom-2 left-[9px] top-2 w-px bg-orange-200" />{[0,1,2].map(item => <div key={item} className="relative flex animate-pulse items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4"><div className="absolute -left-6 top-5 h-[18px] w-[18px] rounded-full border-2 border-white bg-gray-200" /><div className="h-14 w-14 shrink-0 rounded-xl bg-gray-100" /><div className="flex-1 space-y-2"><div className="h-4 w-48 max-w-full rounded-full bg-gray-200" /><div className="h-3 w-32 rounded-full bg-gray-100" /></div><div className="hidden gap-3 sm:flex">{[0,1,2,3].map(chip => <div key={chip} className="h-8 w-14 rounded-xl bg-gray-100" />)}</div></div>)}</div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-6">

        <div className="rounded-2xl mb-5 overflow-hidden shadow-md"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 100%)' }}>

          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Instructor Studio</p>
              <h1 className="font-bold text-[22px] text-white leading-tight flex items-center gap-2">
                {loading ? 'Loading…' : (
                  <>{profile?.full_name ? `${profile.full_name.split(' ')[0]}'s Listings` : 'My Listings'} <ClipboardList className="h-5 w-5 text-emerald-200" /></>
                )}
              </h1>
              <p className="text-[12px] text-emerald-300 font-medium mt-0.5">
                {!loading && `${stats.totalListings} published · ${stats.totalSessions} sessions · ${stats.totalEarned} CR earned`}
              </p>
            </div>

            {!loading && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-white/10 border border-white/10 min-w-[80px]">
                  <p className="text-[20px] font-bold text-white leading-none">{stats.totalSessions}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mt-1">Sessions</p>
                </div>
                <div className="flex flex-col items-center px-5 py-3 rounded-xl min-w-[90px]"
                  style={{ background: 'rgba(132,204,22,0.25)', border: '1px solid rgba(132,204,22,0.35)' }}>
                  <p className="text-[20px] font-bold leading-none" style={{ color: '#d9f99d' }}>{stats.totalEarned} CR</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: '#a3e635' }}>Earned</p>
                </div>
                <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-white/10 border border-white/10 min-w-[80px]">
                  <p className="flex items-center gap-1 text-[20px] font-bold text-white leading-none"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{stats.avgRating > 0 ? stats.avgRating : '—'}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mt-1">{stats.totalReviews} Reviews</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-5">
          {FILTERS.map(f => {
            const isActive = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                  isActive ? `${f.activePill} shadow-md` : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
                }`}>
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white/80' : f.dot}`} />
                {f.icon && <f.icon className="w-3.5 h-3.5" />}
                {f.label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? f.activeBadge : 'bg-gray-100 text-gray-400'
                }`}>{f.count}</span>
              </button>
            );
          })}
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-gray-400 hover:text-emerald-700 px-2 cursor-pointer"><ArrowLeft className="h-3.5 w-3.5" />All</button>
          )}
        </div>

        {loading ? (
          <div className="relative pl-6">
            <div className={`absolute left-[9px] top-2 bottom-2 w-px ${activeFilter.railColor}`} />
            <div className="space-y-3">{[1,2,3].map(i => <SkeletonRow key={i} />)}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mb-3"><ClipboardList className="h-6 w-6" /></div>
            <p className="font-bold text-gray-900 mb-1">{filter === 'all' ? 'No listings yet' : 'No listings match this filter'}</p>
            <p className="text-[12px] text-gray-400 mb-4">{filter === 'all' ? 'Share your expertise with the community' : 'Try switching to a different filter'}</p>
            {filter === 'all'
              ? <button onClick={() => navigate('/create-skill')} className="px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-[12px] font-bold shadow-sm cursor-pointer">Create First Listing</button>
              : <button onClick={() => setFilter('all')} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-[12px] font-bold cursor-pointer"><ArrowLeft className="h-3.5 w-3.5" />Back to All</button>}
          </div>
        ) : (
          <div className="relative pl-6">
            <div className={`absolute left-[9px] top-2 bottom-2 w-px ${activeFilter.railColor}`} />
            <div className="space-y-3">
              {filtered.map(skill => (
                <div 
                  key={skill.id} 
                  id={`skill-${skill.id}`} // 🚨 ADDED ID PARA SA SCROLL TARGET
                  className={`relative transition-all duration-1000 ease-out rounded-2xl ${
                    highlightId === skill.id 
                      ? 'ring-4 ring-emerald-400 bg-emerald-50/50 scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)] z-20' 
                      : ''
                  }`}
                >
                  <div className={`absolute -left-6 top-5 w-[18px] h-[18px] rounded-full border-2 border-white shadow-sm z-10 ${activeFilter.dotColor(skill)}`} />
                  
                  {/* 🚨 currentFilter PASSED HERE */}
                  <ListingRow
                    skill={skill}
                    expanded={expanded.has(skill.id)}
                    onToggle={toggleExpand}
                    onView={id => navigate(`/skill/${id}`)}
                    onDelete={handleDelete}
                    currentFilter={filter} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}