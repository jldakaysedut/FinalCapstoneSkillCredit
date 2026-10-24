import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import {
  ChefHat, Leaf, Hammer, Dumbbell, Scissors, Gamepad2, Wrench,
  BookOpen, PenLine, MessageCircle, Music2, Palette, Film, Briefcase,
  PiggyBank, Monitor, Code2, Globe, Bookmark, BookmarkCheck,
  Video, MessageSquare, FileText, Star, TrendingUp, TrendingDown,
  Trophy, Flame, Sparkles, Clock, Users, Coins, Search, X,
  ArrowUpDown, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Pin, SlidersHorizontal, Zap, LayoutGrid, Hand, Lightbulb
} from 'lucide-react';
​
const CATEGORIES = [
  { name: 'Cooking & Baking',      icon: ChefHat,    color: 'text-orange-500'  },
  { name: 'Gardening & Farming',   icon: Leaf,        color: 'text-green-500'   },
  { name: 'Home & DIY',            icon: Hammer,      color: 'text-yellow-600'  },
  { name: 'Health & Fitness',      icon: Dumbbell,    color: 'text-red-500'     },
  { name: 'Beauty & Grooming',     icon: Scissors,    color: 'text-pink-500'    },
  { name: 'Gaming & Hobbies',      icon: Gamepad2,    color: 'text-violet-500'  },
  { name: 'Electronics & Repair',  icon: Wrench,      color: 'text-blue-500'    },
  { name: 'School & Tutoring',     icon: BookOpen,    color: 'text-indigo-500'  },
  { name: 'Writing & Content',     icon: PenLine,     color: 'text-teal-500'    },
  { name: 'Languages & Speaking',  icon: MessageCircle, color: 'text-cyan-500'  },
  { name: 'Singing & Instruments', icon: Music2,      color: 'text-fuchsia-500' },
  { name: 'Art & Graphic Design',  icon: Palette,     color: 'text-rose-500'    },
  { name: 'Video & Animation',     icon: Film,        color: 'text-amber-500'   },
  { name: 'Business & Freelance',  icon: Briefcase,   color: 'text-slate-600'   },
  { name: 'Financial Literacy',    icon: PiggyBank,   color: 'text-emerald-600' },
  { name: 'UI/UX Design',          icon: Monitor,     color: 'text-sky-500'     },
  { name: 'Coding & Tech',         icon: Code2,       color: 'text-lime-600'    },
];
​
const FORMAT_MAP = {
  'Video Call':   { icon: Video,         color: 'text-sky-500'     },
  'Chat/Text':    { icon: MessageSquare, color: 'text-emerald-500' },
  'Docs':         { icon: FileText,      color: 'text-indigo-500'  },
  'All Formats':  { icon: Globe,         color: 'text-gray-500'    },
};
​
const SORT_OPTIONS = [
  { value: 'default', label: 'Default', icon: SlidersHorizontal, color: 'text-slate-500' },
  { value: 'newest', label: 'Newest', icon: CalendarDays, color: 'text-sky-600' },
  { value: 'oldest', label: 'Oldest', icon: Clock, color: 'text-indigo-500' },
  { value: 'cheapest', label: 'Cheapest', icon: TrendingDown, color: 'text-emerald-600' },
  { value: 'priciest', label: 'Priciest', icon: TrendingUp, color: 'text-orange-500' },
  { value: 'top', label: 'Top Rated', icon: Star, color: 'text-amber-500', internal: true },
  { value: 'trending', label: 'Trending', icon: Flame, color: 'text-orange-500', internal: true },
];
​
const CatIcon = ({ name, className = 'w-4 h-4' }) => {
  const cat = CATEGORIES.find(c => c.name === name);
  if (!cat) return <Pin className={`${className} text-gray-400`} />;
  const Icon = cat.icon;
  return <Icon className={`${className} ${cat.color}`} />;
};
​
const FmtIcon = ({ format, className = 'w-4 h-4' }) => {
  const f = FORMAT_MAP[format] || FORMAT_MAP['All Formats'];
  const Icon = f.icon;
  return <Icon className={`${className} ${f.color}`} />;
};
​
function SkeletonCard() {
  return (
    <div className="shrink-0 w-[260px] bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-gray-100 rounded-full" />
          <div className="h-3 w-12 bg-gray-100 rounded-full" />
        </div>
        <div className="h-4 w-full bg-gray-100 rounded-full" />
        <div className="h-4 w-3/4 bg-gray-100 rounded-full" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-20 bg-gray-100 rounded-lg" />
          <div className="h-6 w-12 bg-gray-100 rounded-lg" />
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-50">
          <div className="h-3 w-24 bg-gray-100 rounded-full" />
          <div className="h-4 w-4 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
​
function SkillCard({ skill, isSaved, onSave, onView, width = 260 }) {
  const profile = Array.isArray(skill.user_profiles) ? skill.user_profiles[0] : skill.user_profiles;
  const name    = profile?.full_name || 'Instructor';
  const isNew   = skill.totalReviews === 0;
​
  return (
    <article
      onClick={() => onView(skill.id)}
      style={{ width }}
      className="group shrink-0 bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200/70
        hover:shadow-[0_10px_32px_rgba(16,185,129,0.10)] hover:border-emerald-200 transition-all duration-300 cursor-pointer snap-start"
    >
      <div className="relative overflow-hidden bg-emerald-900" style={{ height: 158 }}>
        {skill.cover_image_url ? (
          <img src={skill.cover_image_url} alt={skill.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <CatIcon name={skill.category} className="w-14 h-14 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 pointer-events-none" />
​
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/20">
            {isNew
              ? <><Sparkles className="w-3 h-3 text-amber-300" /> New Arrival</>
              : <><FmtIcon format={skill.format} className="w-3 h-3 text-white" /> {skill.format}</>}
          </span>
        </div>
​
        <button
          onClick={e => { e.stopPropagation(); onSave(skill.id); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
          title={isSaved ? 'Unsave' : 'Save'}
        >
          {isSaved
            ? <BookmarkCheck className="w-4 h-4 text-emerald-600" />
            : <Bookmark className="w-4 h-4 text-white" />}
        </button>
      </div>
​
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px] text-gray-500 font-medium truncate">{name}</span>
            {skill.totalSessions > 0 && (
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            )}
          </div>
          {isNew ? (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">New</span>
          ) : (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="font-bold text-[13px] text-gray-800">{skill.avgRating}</span>
              <span className="text-[11px] text-gray-400">({skill.totalReviews})</span>
            </div>
          )}
        </div>
​
        <h3 className="font-bold text-[15px] text-gray-900 leading-snug tracking-tight line-clamp-2 mb-3 group-hover:text-emerald-700 transition-colors">
          {skill.title}
        </h3>
​
        <div className="flex flex-wrap gap-1.5 mt-auto mb-3">
          <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-[11px] font-medium px-2.5 py-1 rounded-lg">
            <CatIcon name={skill.category} className="w-3 h-3" /> {skill.category}
          </span>
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
            <Coins className="w-3 h-3 text-amber-500" /> {skill.credit_cost} CR
          </span>
        </div>
​
        <div className="flex items-center gap-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
          <span className="flex items-center gap-1"><FmtIcon format={skill.format} className="w-3 h-3" /> {skill.format}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {skill.totalSessions}</span>
          <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" /> {skill.duration}</span>
        </div>
      </div>
    </article>
  );
}
​
function Swimlane({ icon: SectionIcon, iconColor, title, subtitle, skills, savedSkills, onSave, onView, onSeeAll, loading }) {
  const rowRef = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);
  const showSeeAll = skills.length > 5;
​
  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };
​
  const scroll = dir => {
    rowRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };
​
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
            {SectionIcon && <SectionIcon className={`w-5 h-5 ${iconColor || 'text-emerald-600'}`} />}
            {title}
          </h2>
          {subtitle && <p className="text-[12px] text-gray-400 font-medium mt-0.5 pl-7">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {showSeeAll && (
            <div className="flex gap-1.5">
              <button onClick={() => scroll(-1)} disabled={!canLeft}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                  canLeft ? 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-200 cursor-default'
                }`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => scroll(1)} disabled={!canRight}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                  canRight ? 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-200 cursor-default'
                }`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {showSeeAll && (
            <button onClick={() => { onSeeAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-1 px-4 py-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all cursor-pointer">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
​
      <div className="relative">
        <div ref={rowRef} onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : skills.slice(0, 10).map(skill => (
                <SkillCard key={skill.id} skill={skill} isSaved={savedSkills.includes(skill.id)} onSave={onSave} onView={onView} />
              ))}
        </div>
      </div>
    </section>
  );
}
​
function HeroBanner({ skill, isSaved, onSave, onView }) {
  if (!skill) return null;
  const profile = Array.isArray(skill.user_profiles) ? skill.user_profiles[0] : skill.user_profiles;
  const name    = profile?.full_name || 'Instructor';
​
  return (
    <div onClick={() => onView(skill.id)}
      className="relative w-full rounded-2xl overflow-hidden cursor-pointer group mb-10"
      style={{ height: 280 }}>
      {skill.cover_image_url ? (
        <img src={skill.cover_image_url} alt={skill.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900">
          <CatIcon name={skill.category} className="absolute inset-0 m-auto w-32 h-32 opacity-10" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
​
      <div className="absolute top-5 left-6 flex gap-2">
        <span className="flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
          <Flame className="w-3 h-3" /> Top Pick
        </span>
        <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium px-3 py-1.5 rounded-full border border-white/25">
          <CatIcon name={skill.category} className="w-3 h-3 text-white" /> {skill.category}
        </span>
      </div>
​
      <button onClick={e => { e.stopPropagation(); onSave(skill.id); }}
        className="absolute top-5 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/40 hover:scale-110 transition-all">
        {isSaved
          ? <BookmarkCheck className="w-5 h-5 text-emerald-400" />
          : <Bookmark className="w-5 h-5 text-white" />}
      </button>
​
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h2 className="text-white font-bold text-[22px] leading-snug tracking-tight line-clamp-2 mb-3 max-w-[65%]">
          {skill.title}
        </h2>
        <div className="flex items-center flex-wrap gap-3">
          <span className="text-white/70 text-[13px] font-medium">by {name}</span>
          {skill.totalReviews > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-white font-semibold text-[13px]">{skill.avgRating}</span>
              <span className="text-white/60 text-[12px]">({skill.totalReviews})</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-[12px] font-medium px-3 py-1.5 rounded-full border border-white/20">
              <Clock className="w-3 h-3" /> {skill.duration}
            </span>
            <span className="flex items-center gap-1.5 bg-amber-400 text-amber-900 text-[13px] font-bold px-4 py-1.5 rounded-full shadow">
              <Coins className="w-3.5 h-3.5" /> {skill.credit_cost} CR
            </span>
            <span className="bg-white text-emerald-800 text-[12px] font-bold px-4 py-1.5 rounded-full shadow group-hover:bg-emerald-50 transition">
              Book Now
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
​
function FilterGrid({ skills, savedSkills, onSave, onView, loading }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-20 bg-gray-100 rounded-full" />
                <div className="h-4 w-full bg-gray-100 rounded-full" />
                <div className="h-4 w-3/4 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))
        : skills.map(skill => (
            <SkillCard key={skill.id} skill={skill} isSaved={savedSkills.includes(skill.id)} onSave={onSave} onView={onView} width="100%" />
          ))}
    </div>
  );
}
​
export default function UserDashboard() {
  const navigate = useNavigate();
​
  const [skills,         setSkills]        = useState([]);
  const [savedSkills,    setSavedSkills]   = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [currentUser,    setCurrentUser]   = useState(null);
  const [profile,        setProfile]       = useState(null);
  const [searchQuery,    setSearchQuery]   = useState('');
  const [activeCategory, setActiveCategory]= useState('All');
  const [showSaved,      setShowSaved]     = useState(false);
  const [sortBy,         setSortBy]        = useState('default');
​
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        await Promise.all([fetchSkills(), fetchSaved(user.id), fetchProfile(user.id)]);
      } else {
        await fetchSkills();
      }
      setLoading(false);
    };
    init();
  }, []);
​
  const fetchSkills = async () => {
    const { data, error } = await supabase
      .from('skills')
      .select(`id, title, category, format, duration, credit_cost, cover_image_url, description, created_at,
        user_profiles!instructor_id ( id, full_name, avatar_url ),
        reviews ( rating ),
        sessions ( id, student_completed, instructor_completed )`)
      .eq('is_active', true)
      .or('status.eq.approved,status.is.null') 
      .order('created_at', { ascending: false });
      
    if (error || !data) {
      console.error("Fetch Error:", error); 
      return;
    }
    
    setSkills(data.map(s => {
      const rv = s.reviews  || [];
      const ss = s.sessions || [];
      const avgRating = rv.length ? parseFloat((rv.reduce((a, r) => a + (Number(r.rating) || 0), 0) / rv.length).toFixed(1)) : 0;
      const completedSessions = ss.filter(x => x.student_completed && x.instructor_completed).length;
      return { ...s, avgRating, totalReviews: rv.length, totalSessions: completedSessions };
    }));
  };
​
  const fetchSaved = async uid => {
    const { data } = await supabase.from('saved_skills').select('skill_id').eq('user_id', uid);
    if (data) setSavedSkills(data.map(r => r.skill_id));
  };
​
  const fetchProfile = async uid => {
    // 🚨 UPDATED: Fetched "interests" from database
    const { data } = await supabase.from('user_profiles').select('full_name, avatar_url, interests').eq('id', uid).single();
    if (data) setProfile(data);
  };
​
  const toggleSave = async skillId => {
    if (!currentUser) { alert('Please log in to save skills.'); return; }
    const already = savedSkills.includes(skillId);
    setSavedSkills(p => already ? p.filter(id => id !== skillId) : [...p, skillId]);
    if (already) {
      await supabase.from('saved_skills').delete().match({ user_id: currentUser.id, skill_id: skillId });
    } else {
      await supabase.from('saved_skills').insert({ user_id: currentUser.id, skill_id: skillId });
    }
  };
​
  const handleView  = id  => navigate(`/skill/${id}`);
  const handleReset = () => { setSearchQuery(''); setActiveCategory('All'); setShowSaved(false); setSortBy('default'); };
  const jumpTo      = cat => { setActiveCategory(cat); setShowSaved(false); setSearchQuery(''); setSortBy('default'); };
​
  const isFiltered    = activeCategory !== 'All' || showSaved || !!searchQuery.trim() || sortBy !== 'default';
  const firstName     = profile?.full_name?.split(' ')[0] || 'there';
  const catCount      = n => skills.filter(s => s.category === n).length;
  const savedList     = skills.filter(s => savedSkills.includes(s.id));
  const featuredSkill = [...skills].filter(s => s.totalReviews > 0).sort((a, b) => b.avgRating - a.avgRating)[0] || skills[0];
  const trending = [...skills].sort((a, b) => b.totalSessions - a.totalSessions);
  const topRated = [...skills].sort((a, b) => b.avgRating - a.avgRating);
  const newest   = [...skills];
​
  // 🚨 RECOMMENDED SKILLS DERIVATION
  const recommendedSkills = profile?.interests?.length > 0 
    ? [...skills].filter(s => profile.interests.includes(s.category)).sort((a, b) => b.avgRating - a.avgRating)
    : [];
​
  let filtered = showSaved ? [...savedList] : [...skills];
  
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s => {
      return s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q);
    });
  }
  
  if (activeCategory !== 'All') filtered = filtered.filter(s => s.category === activeCategory);
  if (sortBy === 'newest')    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else if (sortBy === 'oldest')   filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else if (sortBy === 'top')      filtered.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
  else if (sortBy === 'trending') filtered.sort((a, b) => (b.totalSessions || 0) - (a.totalSessions || 0));
  else if (sortBy === 'cheapest') filtered.sort((a, b) => (Number(a.credit_cost) || 0) - (Number(b.credit_cost) || 0));
  else if (sortBy === 'priciest') filtered.sort((a, b) => (Number(b.credit_cost) || 0) - (Number(a.credit_cost) || 0));
​
  let gridTitle = 'Search Results';
  if (showSaved) gridTitle = 'Saved Skills';
  else if (activeCategory !== 'All') gridTitle = activeCategory;
  else if (searchQuery.trim()) gridTitle = 'Search Results';
  else {
    if (sortBy === 'top') gridTitle = 'Top Rated';
    else if (sortBy === 'trending') gridTitle = 'Top Trending';
    else if (sortBy === 'newest') gridTitle = 'New Arrivals';
    else if (sortBy === 'oldest') gridTitle = 'Oldest Listings';
    else if (sortBy === 'cheapest') gridTitle = 'Cheapest Skills';
    else if (sortBy === 'priciest') gridTitle = 'Priciest Skills';
    else gridTitle = 'All Skills';
  }
​
  const sharedProps = { savedSkills, onSave: toggleSave, onView: handleView };
  const activeSortOption = SORT_OPTIONS.find(option => option.value === sortBy) || SORT_OPTIONS[0];
  const visibleSortOptions = SORT_OPTIONS.filter(option => !option.internal || option.value === sortBy);
  const ActiveSortIcon = activeSortOption.icon;
​
  return (
    <div className="min-h-full" style={{ background: '#faf9f6' }}>
      <div className="max-w-[1440px] mx-auto flex gap-0">
​
        <aside className="hidden lg:flex flex-col w-[240px] shrink-0 border-r border-gray-200/80 min-h-full bg-white">
          <div className="custom-sidebar-scroll sticky top-[64px] pt-6 pb-4 px-4 flex flex-col gap-1 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
​
            {profile && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Welcome back</p>
                <p className="font-bold text-[15px] text-gray-900 mt-0.5 tracking-tight flex items-center gap-1.5">
                  {firstName} <Hand className="w-4 h-4 text-amber-400" />
                </p>
              </div>
            )}
​
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 mt-1 mb-1">Browse</p>
​
            <button onClick={handleReset}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                activeCategory === 'All' && !showSaved ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <span className="flex items-center gap-2 text-[13px] font-medium">
                <Globe className="w-4 h-4" /> All Skills
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                activeCategory === 'All' && !showSaved ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{skills.length}</span>
            </button>
​
            {currentUser && (
              <button onClick={() => { setShowSaved(v => !v); setActiveCategory('All'); setSearchQuery(''); setSortBy('default'); }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                  showSaved ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <Bookmark className="w-4 h-4" /> Saved
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  showSaved ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{savedList.length}</span>
              </button>
            )}
​
            <div className="my-2 border-t border-gray-100" />
​
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.name && !showSaved;
              return (
                <button key={cat.name} onClick={() => jumpTo(cat.name)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                    isActive ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                  <span className="flex items-center gap-2 text-[12px] font-medium truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : cat.color}`} />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${
                    isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{catCount(cat.name)}</span>
                </button>
              );
            })}
          </div>
        </aside>
​
        <main className="flex-1 min-w-0 px-6 md:px-8 py-6">
​
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 min-w-[200px] shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition cursor-text">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="text" value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setShowSaved(false); setSortBy('default'); }}
                placeholder="Search skills or categories…"
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 font-medium" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                </button>
              )}
            </label>
​
            <div className="relative w-[135px] shrink-0">
              <details
                className="group relative w-full"
                onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false; }}
              >
                <summary
                  aria-label="Sort listings"
                  className="flex min-h-11 w-full cursor-pointer list-none items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 text-[13px] font-medium text-gray-700 shadow-sm transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100 [&::-webkit-details-marker]:hidden"
                >
                  <ActiveSortIcon className={`h-4 w-4 shrink-0 ${activeSortOption.color}`} aria-hidden="true" />
                  <span className="flex-1 text-left">{activeSortOption.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="absolute right-0 top-full z-30 mt-2 w-full rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
                  {visibleSortOptions.map(option => {
                    const OptionIcon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={sortBy === option.value}
                        onClick={e => {
                          setSortBy(option.value);
                          const menu = e.currentTarget.closest('details');
                          if (menu) menu.open = false;
                        }}
                        className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                          sortBy === option.value ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <OptionIcon className={`h-4 w-4 shrink-0 ${option.color}`} aria-hidden="true" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>
          </div>
​
          <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
            <button onClick={handleReset}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition ${
                activeCategory === 'All' && !showSaved ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              <Globe className="w-3 h-3" /> All
            </button>
            {currentUser && (
              <button onClick={() => { setShowSaved(v => !v); setActiveCategory('All'); setSortBy('default'); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition ${
                  showSaved ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                <Bookmark className="w-3 h-3" /> Saved ({savedList.length})
              </button>
            )}
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.name && !showSaved;
              return (
                <button key={cat.name} onClick={() => jumpTo(cat.name)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition ${
                    isActive ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  <Icon className={`w-3 h-3 ${isActive ? 'text-white' : cat.color}`} />
                  {cat.name}
                </button>
              );
            })}
          </div>
​
          {!isFiltered && (
            <>
              {!loading && featuredSkill && (
                <HeroBanner skill={featuredSkill} isSaved={savedSkills.includes(featuredSkill.id)} onSave={toggleSave} onView={handleView} />
              )}
              
              {/* 🚨 NEW: Recommended For You Section 🚨 */}
              {!loading && profile?.interests?.length > 0 && recommendedSkills.length > 0 && (
                <Swimlane 
                  icon={Lightbulb} 
                  iconColor="text-purple-500" 
                  title="Recommended For You" 
                  subtitle="Handpicked based on your interests" 
                  skills={recommendedSkills} 
                  loading={false} 
                  {...sharedProps} 
                  onSeeAll={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                />
              )}
​
              {!loading && savedList.length > 0 && (
                <Swimlane icon={Bookmark} iconColor="text-emerald-600" title="Saved Skills" subtitle="Skills you bookmarked" skills={savedList} loading={false} {...sharedProps} onSeeAll={() => setShowSaved(true)} />
              )}
              <Swimlane icon={Flame} iconColor="text-orange-500" title="Top Trending" subtitle="Most sessions completed" skills={trending} loading={loading} {...sharedProps} onSeeAll={() => { setSortBy('trending'); setActiveCategory('All'); }} />
              <Swimlane icon={Trophy} iconColor="text-amber-500" title="Top Rated" subtitle="Highest rated by the community" skills={topRated} loading={loading} {...sharedProps} onSeeAll={() => { setSortBy('top'); setActiveCategory('All'); }} />
              <Swimlane icon={Sparkles} iconColor="text-sky-500" title="New Arrivals" subtitle="Just added to SkillCredit" skills={newest} loading={loading} {...sharedProps} onSeeAll={() => { setSortBy('newest'); setActiveCategory('All'); }} />
              {CATEGORIES.map(cat => {
                const catSkills = skills.filter(s => s.category === cat.name);
                if (!catSkills.length) return null;
                return (
                  <div key={cat.name} className="border-t border-gray-100 pt-8">
                    <Swimlane icon={cat.icon} iconColor={cat.color} title={cat.name} subtitle={null} skills={catSkills} loading={false} {...sharedProps} onSeeAll={() => jumpTo(cat.name)} />
                  </div>
                );
              })}
            </>
          )}
​
          {isFiltered && (
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {activeCategory !== 'All' && sortBy !== 'default' ? `Sorted by ${sortBy}` : (showSaved ? 'Saved' : activeCategory !== 'All' ? activeCategory : 'Search Results')}
                  </p>
                  <p className="font-bold text-[17px] text-gray-900 tracking-tight">
                    {gridTitle}
                    <span className="text-emerald-600 ml-2 text-[13px] font-medium">({filtered.length} {filtered.length === 1 ? 'skill' : 'skills'})</span>
                    {searchQuery && <span className="text-gray-400 font-normal text-[14px]"> for &ldquo;{searchQuery}&rdquo;</span>}
                  </p>
                </div>
                <button onClick={handleReset} className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-700 hover:text-emerald-900">
                  <ChevronLeft className="w-4 h-4" /> Back to home
                </button>
              </div>
​
              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center py-24 text-center">
                  <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                    {showSaved
                      ? <Bookmark className="w-6 h-6 text-gray-300" />
                      : <Search className="w-6 h-6 text-gray-300" />}
                  </div>
                  <p className="text-xl font-bold text-gray-900 mb-1 tracking-tight">
                    {showSaved ? 'No saved skills yet' : 'No skills found'}
                  </p>
                  <p className="text-[13px] text-gray-400 mb-6 max-w-xs font-medium">
                    {showSaved ? 'Tap the bookmark on any skill card to save it.' : 'Try different keywords or browse a category.'}
                  </p>
                  <button onClick={handleReset} className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition shadow-sm">
                    Back to home
                  </button>
                </div>
              )}
​
              <FilterGrid skills={filtered} savedSkills={savedSkills} onSave={toggleSave} onView={handleView} loading={loading} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}