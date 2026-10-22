import { useEffect, useMemo, useState } from 'react';
import supabase from '../../supabaseClient';
import { BookOpen, CalendarDays, MessageSquare, RefreshCw, Search } from 'lucide-react';

const TABS = [
  { id: 'skills', label: 'Published skills', icon: BookOpen },
  { id: 'sessions', label: 'Booked sessions', icon: CalendarDays },
  { id: 'community', label: 'Community feed', icon: MessageSquare },
];

const relationName = value => {
  const record = Array.isArray(value) ? value[0] : value;
  return record?.full_name || 'Unknown member';
};

const formatDate = value => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
};

const getItemTitle = (item, tab) => {
  if (tab === 'skills') return item.title || 'Untitled skill';
  if (tab === 'sessions') {
    const skill = Array.isArray(item.skills) ? item.skills[0] : item.skills;
    return skill?.title || 'Unknown skill';
  }
  return item.content || 'Empty community post';
};

const getItemDescription = (item, tab) => {
  if (tab === 'skills') return `By ${relationName(item.user_profiles)} · ${item.category || 'Uncategorized'} · ${Number(item.credit_cost || 0).toLocaleString()} CR`;
  if (tab === 'sessions') return `Scheduled: ${item.scheduled_date ? formatDate(item.scheduled_date) : 'Date unavailable'} · ${Number(item.credit_amount || 0).toLocaleString()} CR`;
  return `By ${relationName(item.user_profiles)} · ${item.category || 'Uncategorized'} · ${formatDate(item.created_at)}`;
};

const getStatus = (item, tab) => {
  if (tab === 'skills') return item.is_active ? 'Active' : 'Archived';
  if (tab === 'sessions') return item.status || 'Unknown';
  return item.post_type || 'Post';
};

const getStatusTone = (item, tab) => {
  if (tab === 'skills') return item.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-600 ring-slate-200';
  if (tab === 'sessions') return item.status === 'completed' ? 'bg-blue-50 text-blue-700 ring-blue-100' : 'bg-amber-50 text-amber-800 ring-amber-100';
  return 'bg-violet-50 text-violet-700 ring-violet-100';
};

export default function PlatformViewer() {
  const [tab, setTab] = useState('skills');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const fetchData = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        let result;
        
        // ADDED FOREIGN KEY HINTS TO PREVENT AMBIGUOUS JOIN ERRORS
        if (tab === 'skills') {
          result = await supabase.from('skills')
            .select('id, title, category, credit_cost, is_active, user_profiles!skills_instructor_id_fkey(full_name)')
            .order('created_at', { ascending: false }).limit(50);
          
          if (result.error) {
             result = await supabase.from('skills')
              .select('id, title, category, credit_cost, is_active, user_profiles(full_name)')
              .order('created_at', { ascending: false }).limit(50);
          }
        } else if (tab === 'sessions') {
          result = await supabase.from('sessions')
            .select('id, status, credit_amount, scheduled_date, skills(title)')
            .order('created_at', { ascending: false }).limit(50);
        } else {
          result = await supabase.from('community_posts')
            .select('id, content, category, post_type, created_at, user_profiles!community_posts_user_id_fkey(full_name)')
            .order('created_at', { ascending: false }).limit(50);
            
          if (result.error) {
             result = await supabase.from('community_posts')
              .select('id, content, category, post_type, created_at, user_profiles(full_name)')
              .order('created_at', { ascending: false }).limit(50);
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
    return () => { isCurrent = false; };
  }, [tab, reloadKey]);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;
    return data.filter(item => {
      const title = getItemTitle(item, tab);
      const description = getItemDescription(item, tab);
      const status = getStatus(item, tab);
      return `${title} ${description} ${status} ${item.id || ''}`.toLowerCase().includes(query);
    });
  }, [data, searchQuery, tab]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Platform data viewer</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Read-only access to listings, sessions, and community activity.</p>
        </div>
        <button type="button" onClick={() => setReloadKey(value => value + 1)} disabled={loading} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {loading ? 'Loading records' : 'Refresh data'}
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 pt-3 sm:px-5 sm:pt-4">
          <div role="tablist" aria-label="Platform data type" className="-mx-4 flex touch-pan-x gap-1 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:gap-2 sm:px-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => { setTab(id); setSearchQuery(''); }}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-3 text-xs font-bold transition sm:px-4 sm:text-sm ${tab === id ? 'border-slate-900 bg-slate-50/70 text-slate-950' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-sm font-bold text-slate-950">{TABS.find(item => item.id === tab)?.label}</h2>
            <p className="mt-1 text-xs text-slate-500">{loading ? 'Loading records…' : `${filteredData.length.toLocaleString()} records shown · up to 50 loaded`}</p>
          </div>
          <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100 sm:w-[min(100%,360px)]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><span className="sr-only">Search platform records</span>
            <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search current records" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
        </div>

        {errorMessage && <div role="alert" className="m-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span>{errorMessage}</span><button type="button" onClick={() => setReloadKey(value => value + 1)} className="min-h-9 rounded-lg bg-rose-700 px-3 text-xs font-bold text-white hover:bg-rose-800">Try again</button></div>}

        {loading ? (
          <div className="space-y-3 p-4" aria-label="Loading platform records">{[1, 2, 3, 4].map(item => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : filteredData.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Search className="h-5 w-5" /></span>
            <h3 className="mt-3 text-sm font-bold text-slate-900">{data.length ? 'No matching records' : 'No records found'}</h3>
            <p className="mt-1 text-xs text-slate-500">{data.length ? 'Try a different search term.' : 'There is no data to display for this section yet.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredData.map(item => (
              <li key={item.id} className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/60 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1">
                  <p className={`${tab === 'community' ? 'line-clamp-3 font-medium' : 'line-clamp-2 font-bold'} break-words text-sm leading-relaxed text-slate-900`}>
                    {tab === 'community' ? `“${getItemTitle(item, tab)}”` : getItemTitle(item, tab)}
                  </p>
                  <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-500">{getItemDescription(item, tab)}</p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 lg:shrink-0 lg:justify-end lg:border-0 lg:pt-0">
                  <span className={`inline-flex max-w-full break-all rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${getStatusTone(item, tab)}`}>
                    {getStatus(item, tab)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-slate-400">Read-only view. Each section loads the 50 most recent records.</p>
    </main>
  );
}