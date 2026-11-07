import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useEffect, useMemo, useState } from 'react';
import supabase from '../../supabaseClient';
import { BookOpen, CalendarDays, MessageSquare, RefreshCw, Search, X, Coins, Tag, Clock, ShieldAlert, ChevronDown, Eye } from 'lucide-react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

const TABS = [
  { id: 'skills', label: 'Published skills', icon: BookOpen },
  { id: 'sessions', label: 'Booked sessions', icon: CalendarDays },
  { id: 'community', label: 'Community feed', icon: MessageSquare },
];

const SUB_FILTERS = {
  skills: ['all', 'pending', 'approved', 'rejected'],
  sessions: ['all', 'pending', 'completed', 'cancelled'],
  community: ['all', 'active', 'archived']
};

const formatDate = value => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
};

const extractName = relationObj => {
  if (!relationObj) return 'Unknown';
  if (Array.isArray(relationObj)) return relationObj[0]?.full_name || 'Unknown';
  return relationObj.full_name || 'Unknown';
};

const getItemTitle = (item, tab) => {
  if (tab === 'skills') return item.title || 'Untitled skill';
  if (tab === 'sessions') return item.skills?.title || 'Unknown skill';
  return item.content || 'Empty community post';
};

const getStatus = (item, tab) => {
  if (tab === 'skills') return item.status || (item.is_active ? 'Active' : 'Archived');
  if (tab === 'sessions') return item.status || 'Unknown';
  if (tab === 'community') return item.is_active ? 'Active' : 'Archived';
  return item.post_type || 'Post';
};

const getTabTone = tab => {
  if (tab === 'skills') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (tab === 'sessions') return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-purple-50 text-purple-700 border border-purple-200';
};

const getStatusTone = (item, tab) => {
  if (tab === 'skills') {
    const status = item.status || (item.is_active ? 'approved' : 'archived');
    if (status === 'pending') return 'bg-amber-50 text-amber-800 border-amber-200';
    if (status === 'approved') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (status === 'rejected') return 'bg-rose-50 text-rose-800 border-rose-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }
  if (tab === 'sessions') {
    const status = item.status || 'pending';
    if (status === 'completed') return 'bg-blue-50 text-blue-800 border-blue-200';
    if (status === 'cancelled') return 'bg-rose-50 text-rose-800 border-rose-200';
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  if (tab === 'community') {
    return item.is_active ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200';
  }
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const humanizeKey = key => key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

/* ── EXACT CENTERED DETAIL MODAL MATCHED TO ESCALATIONS & USER MANAGEMENT ── */
function DetailModal({ item, tab, onClose }) {
  let itemImage = null;
  if (tab === 'skills') itemImage = item.cover_image_url;
  if (tab === 'community' && item.media_urls) {
    try {
      const parsedUrls = typeof item.media_urls === 'string' ? JSON.parse(item.media_urls) : item.media_urls;
      if (Array.isArray(parsedUrls) && parsedUrls.length > 0) itemImage = parsedUrls[0];
      else if (typeof parsedUrls === 'string') itemImage = parsedUrls;
    } catch (e) {
      console.warn("Could not parse media_urls");
    }
  }

  let block1 = { label: '', value: '', sub: '', color: '' };
  let block2 = { label: '', value: '', sub: '', color: '' };

  if (tab === 'skills') {
    block1 = { label: 'CREDIT COST', value: item.credit_cost || '0', sub: 'Required to book', color: 'bg-amber-50/70 border-amber-200 text-amber-900', labelCol: 'text-amber-700' };
    block2 = { label: 'CATEGORY', value: item.category || 'N/A', sub: 'Skill classification', color: 'bg-purple-50/70 border-purple-200 text-purple-900', labelCol: 'text-purple-700' };
  } else if (tab === 'sessions') {
    block1 = { label: 'AMOUNT', value: item.credit_amount || '0', sub: 'Credits transferred', color: 'bg-amber-50/70 border-amber-200 text-amber-900', labelCol: 'text-amber-700' };
    block2 = { label: 'SCHEDULE', value: item.scheduled_date || 'TBD', sub: item.scheduled_time || 'Time TBD', color: 'bg-blue-50/70 border-blue-200 text-blue-900', labelCol: 'text-blue-700' };
  } else {
    block1 = { label: 'POST TYPE', value: item.post_type || 'Standard', sub: 'Classification', color: 'bg-purple-50/70 border-purple-200 text-purple-900', labelCol: 'text-purple-700' };
    block2 = { label: 'CATEGORY', value: item.category || 'General', sub: 'Discussion topic', color: 'bg-emerald-50/70 border-emerald-200 text-emerald-900', labelCol: 'text-emerald-700' };
  }

  const skipKeys = ['id', 'user_id', 'instructor_id', 'student_id', 'skill_id', 'assigned_to', 'cover_image_url', 'media_urls', 'user_profiles', 'student', 'instructor', 'skills', 'rejection_reason'];
  
  const filteredDetails = Object.entries(item).filter(([key, value]) => {
    if (skipKeys.includes(key) || key.endsWith('_id')) return false;
    if (value === null || value === '' || typeof value === 'object') return false; 
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex shrink-0 items-center justify-between gap-3 p-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700">
              {tab === 'skills' ? <BookOpen className="h-5 w-5" /> : tab === 'sessions' ? <CalendarDays className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {tab === 'skills' ? 'Skill Details' : tab === 'sessions' ? 'Session Details' : 'Post Details'}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {tab === 'sessions' ? `Session by ${extractName(item.student)}` : extractName(item.user_profiles)}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className={`rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition ${FOCUS_RING}`}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          <div className="text-center">
             <h3 className="text-lg font-bold text-gray-900 leading-snug break-words">
                {tab === 'community' ? `“${getItemTitle(item, tab)}”` : getItemTitle(item, tab)}
             </h3>
             <div className="mt-2.5 flex justify-center">
               <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(item, tab)}`}>
                 {getStatus(item, tab)}
               </span>
             </div>
          </div>

          {tab === 'skills' && item.status === 'rejected' && item.rejection_reason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-rose-800 uppercase tracking-widest mb-1">Rejection Reason</p>
                <p className="text-xs font-medium text-rose-900">{item.rejection_reason}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className={`border p-4 rounded-xl ${block1.color}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${block1.labelCol}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider">{block1.label}</p>
              </div>
              <p className="text-2xl font-black">{block1.value}</p>
              <p className={`text-[10px] font-medium mt-1 leading-tight ${block1.labelCol}`}>{block1.sub}</p>
            </div>

            <div className={`border p-4 rounded-xl ${block2.color}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${block2.labelCol}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider">{block2.label}</p>
              </div>
              <p className="text-2xl font-black truncate">{block2.value}</p>
              <p className={`text-[10px] font-medium mt-1 leading-tight ${block2.labelCol}`}>{block2.sub}</p>
            </div>
          </div>

          {itemImage && (
            <div>
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Attached Media</h4>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 max-h-64 flex items-center justify-center">
                <img src={itemImage} alt="Attachment" className="w-full h-full object-cover max-h-64" />
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Record Information</h4>
            <div className="space-y-3">
              {tab === 'sessions' && (
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                  <p className="text-[11px] font-bold text-gray-500 uppercase">Instructor</p>
                  <p className="text-sm font-semibold text-gray-900">{extractName(item.instructor)}</p>
                </div>
              )}
              {tab === 'sessions' && (
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                  <p className="text-[11px] font-bold text-gray-500 uppercase">Student</p>
                  <p className="text-sm font-semibold text-gray-900">{extractName(item.student)}</p>
                </div>
              )}

              {filteredDetails.map(([key, value]) => {
                const isDate = key.includes('date') || key.includes('_at');
                const displayValue = isDate ? formatDate(value) : (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value));
                return (
                  <div key={key} className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">{humanizeKey(key)}</p>
                    <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {displayValue}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
          <button
            onClick={onClose}
            className={`w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition ${FOCUS_RING}`}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlatformViewer() {
  const [tab, setTab] = useState('skills');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useRealtimeRefresh(() => setReloadKey(key => key + 1), ['skills', 'sessions', 'community_posts'], 'web_refresh_platform');
  
  const [subFilter, setSubFilter] = useState('all'); 
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    const fetchData = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        let result;
        
        if (tab === 'skills') {
          let query = supabase.from('skills')
            .select('*, user_profiles!skills_instructor_id_fkey(full_name, avatar_url)');
          
          if (subFilter !== 'all') query = query.eq('status', subFilter);
          result = await query.order('created_at', { ascending: false }); // Removed limit(50)
          
          if (result.error) {
             let fallbackQuery = supabase.from('skills').select('*, user_profiles(full_name, avatar_url)');
             if (subFilter !== 'all') fallbackQuery = fallbackQuery.eq('status', subFilter);
             result = await fallbackQuery.order('created_at', { ascending: false });
          }
        } else if (tab === 'sessions') {
          let query = supabase.from('sessions')
            .select('*, student:user_profiles!sessions_student_id_fkey(full_name, avatar_url), instructor:user_profiles!sessions_instructor_id_fkey(full_name, avatar_url), skills(title)');
          
          if (subFilter !== 'all') query = query.eq('status', subFilter);
          result = await query.order('created_at', { ascending: false }); // Removed limit(50)
        } else {
          let query = supabase.from('community_posts')
            .select('*, user_profiles!community_posts_user_id_fkey(full_name, avatar_url)');
          
          if (subFilter !== 'all') query = query.eq('is_active', subFilter === 'active');
          result = await query.order('created_at', { ascending: false }); // Removed limit(50)
            
          if (result.error) {
             let fallbackQuery = supabase.from('community_posts').select('*, user_profiles(full_name, avatar_url)');
             if (subFilter !== 'all') fallbackQuery = fallbackQuery.eq('is_active', subFilter === 'active');
             result = await fallbackQuery.order('created_at', { ascending: false });
          }
        }
        
        if (!isCurrent) return;
        if (result.error) {
          console.error("Supabase Error Details:", result.error);
          setErrorMessage('Could not load these records. Please try again.');
        }
        setData(result.data || []);
      } catch (error) {
        console.error('Unable to load platform records:', error);
        if (isCurrent) setErrorMessage('Could not load these records. Please try again.');
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    fetchData();
  }, [tab, reloadKey, subFilter]); 

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;
    return data.filter(item => {
      const title = getItemTitle(item, tab);
      const status = getStatus(item, tab);
      return `${title} ${status}`.toLowerCase().includes(query);
    });
  }, [data, searchQuery, tab]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">
      
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Platform data viewer</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Read-only access to published skills, booked sessions, and community feed activity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey(value => value + 1)}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60 sm:self-auto ${FOCUS_RING}`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {loading ? 'Refreshing' : 'Refresh data'}
        </button>
      </div>

      {errorMessage && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setReloadKey(value => value + 1)} className={`rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 ${FOCUS_RING}`}>Try again</button>
        </div>
      )}

      {/* ── TABS & CONTROLS CONTAINER ── */}
      <div className="space-y-4">
        <div role="tablist" aria-label="Platform data type" className="grid grid-cols-3 gap-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => { 
                  setTab(id); 
                  setSearchQuery(''); 
                  setSelectedItem(null); 
                  setSubFilter('all');
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-2xl border p-4 text-center sm:text-left transition-colors ${FOCUS_RING} ${
                  isActive
                    ? 'border-emerald-600 bg-emerald-50 shadow-sm ring-1 ring-emerald-600 text-emerald-900'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100 text-gray-600'}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-xs sm:text-sm font-bold tracking-tight">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Sub-filters bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {SUB_FILTERS[tab].map(filter => (
              <button
                key={filter}
                onClick={() => setSubFilter(filter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition border ${
                  subFilter === filter 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                } ${FOCUS_RING}`}
              >
                {filter}
              </button>
            ))}
          </div>

          <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:max-w-xs">
            <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search records" className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="rounded p-0.5 text-gray-300 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
      </div>

      {/* ── RECORDS TABLE / LIST CONTAINER (EXACT MATCH TO USER MANAGEMENT) ── */}
      <section aria-label="Platform data records" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <ul aria-busy="true" className="divide-y divide-gray-100" role="status">
            {[0, 1, 2, 3].map(i => (
              <li key={i} className="flex animate-pulse items-center gap-4 px-6 py-5">
                <span className="h-11 w-11 rounded-full bg-gray-100" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-1/3 rounded bg-gray-100" />
                  <span className="block h-3 w-1/5 rounded bg-gray-100" />
                </span>
              </li>
            ))}
          </ul>
        ) : filteredData.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
              <Search className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-gray-900">No matching records found</p>
            <p className="mt-1 text-xs text-gray-500">Try changing your search or category filter.</p>
          </div>
        ) : (
          <>
            <div aria-hidden="true" className="hidden border-b border-gray-200 bg-gray-50 px-6 py-3 text-xs font-semibold text-gray-500 lg:grid lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_140px] lg:items-center lg:gap-6">
              <span>Record Title / Info</span>
              <span>Status</span>
              <span>Owner / Student</span>
              <span className="text-right">Actions</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {filteredData.map(item => {
                const ActiveIcon = TABS.find(t => t.id === tab)?.icon;
                let personObj = item.user_profiles;
                if (tab === 'sessions') personObj = item.student; 

                return (
                  <li
                    key={item.id}
                    className="relative flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 lg:grid lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_140px] lg:items-center lg:gap-6"
                  >
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" aria-hidden="true" />

                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getTabTone(tab)}`}>
                        <ActiveIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900" title={getItemTitle(item, tab)}>{getItemTitle(item, tab)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {tab !== 'sessions' && (
                             <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                               <Tag className="h-3 w-3 text-gray-400" /> {item.category || 'Uncategorized'}
                             </span>
                          )}
                          {tab === 'skills' && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                              <Coins className="h-3 w-3 text-amber-600" /> {Number(item.credit_cost || 0).toLocaleString()} CR
                            </span>
                          )}
                          {tab === 'sessions' && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                              <Coins className="h-3 w-3 text-amber-600" /> {Number(item.credit_amount || 0).toLocaleString()} CR
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-gray-400 lg:sr-only">Status</span>
                      <div className="mt-1 lg:mt-0">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(item, tab)}`}>
                          {getStatus(item, tab)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-bold text-gray-600 border border-gray-200">
                        {personObj?.avatar_url ? <img src={personObj.avatar_url} alt="" className="h-full w-full object-cover" /> : extractName(personObj).charAt(0)}
                      </span>
                      <span className="text-xs font-medium text-gray-600 truncate">
                         {tab === 'sessions' ? 'Student: ' : 'By '}{extractName(personObj)}
                      </span>
                    </div>

                    <div className="flex items-center lg:justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className={`inline-flex w-full lg:w-auto items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 ${FOCUS_RING}`}
                      >
                        <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" /> <span>View details</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
      
      {selectedItem && (
        <DetailModal 
          item={selectedItem} 
          tab={tab} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
}