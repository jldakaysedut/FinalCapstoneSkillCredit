import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { FileImage, RefreshCw, Search, X, ArrowRight, ClipboardCheck } from 'lucide-react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

// One column template shared by the header row and every listing row (desktop),
// so all columns line up exactly.
const ROW_GRID = 'lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.4fr)_96px_minmax(0,1.2fr)_104px_128px] lg:items-center lg:gap-6';

export default function SkillApprovals() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'unassigned' | 'my_claims' | 'resolved' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // 🚨 FIX: Explicit relations to avoid Ambiguous Relationship error
      const { data, error } = await supabase
        .from('skills')
        .select(`
          id, title, category, format, credit_cost, cover_image_url, created_at, status, assigned_to,
          instructor:user_profiles!instructor_id(id, full_name),
          assignee:user_profiles!assigned_to(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSkills(data || []);
    } catch (err) {
      console.error('Failed to load skill approvals:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  useRealtimeRefresh(fetchSkills, ['skills'], 'web_refresh_skillapprovals');

  // Telemetry Calculations
  const metrics = useMemo(() => {
    const pendingList = skills.filter(s => s.status === 'pending');
    const unassigned = pendingList.filter(s => !s.assigned_to).length;
    const myClaims = pendingList.filter(s => s.assigned_to === currentUserId).length;
    const resolvedCount = skills.filter(s => s.status === 'approved' || s.status === 'rejected').length;

    return {
      pendingCount: pendingList.length,
      unassignedCount: unassigned,
      myClaimsCount: myClaims,
      resolvedCount
    };
  }, [skills, currentUserId]);

  // Tab & Search Filtering
  const filteredSkills = useMemo(() => {
    return skills.filter(item => {
      if (activeTab === 'pending' && item.status !== 'pending') return false;
      if (activeTab === 'unassigned' && (item.status !== 'pending' || item.assigned_to)) return false;
      if (activeTab === 'my_claims' && (item.status !== 'pending' || item.assigned_to !== currentUserId)) return false;
      if (activeTab === 'resolved' && (item.status === 'pending')) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        const instructorMatch = item.instructor?.full_name?.toLowerCase().includes(q);
        const idMatch = item.id.toLowerCase().includes(q);

        return titleMatch || catMatch || instructorMatch || idMatch;
      }

      return true;
    });
  }, [skills, activeTab, searchQuery, currentUserId]);

  // ── Display-only: the five filter tabs ──
  const tabs = [
    { id: 'pending', label: 'All pending', hint: 'Action required', count: metrics.pendingCount },
    { id: 'unassigned', label: 'Unassigned', hint: 'Awaiting claim', count: metrics.unassignedCount },
    { id: 'my_claims', label: 'My claims', hint: 'In your review', count: metrics.myClaimsCount },
    { id: 'resolved', label: 'Resolved history', hint: 'Processed', count: metrics.resolvedCount },
    { id: 'all', label: 'All listings', hint: 'Everything', count: skills.length },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Skill approvals</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Review, claim, and rule on new skill listings before they go live on the platform.
          </p>
        </div>
        <button
          onClick={fetchSkills}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:self-auto ${FOCUS_RING}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh queue
        </button>
      </div>

      {/* ── STAT TABS (counts double as the queue filter) ── */}
      <div role="group" aria-label="Filter the queue" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
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

      {/* ── SEARCH ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:max-w-md">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, category, instructor, or ID"
            aria-label="Search listings"
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
            Showing <span className="font-semibold tabular-nums text-gray-900">{filteredSkills.length}</span> of <span className="tabular-nums">{skills.length}</span> listings
          </p>
        )}
      </div>

      {/* ── LISTINGS ── */}
      <section aria-label="Skill listings" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
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
        ) : filteredSkills.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-gray-900">Queue is clear</p>
            <p className="mt-1 text-xs text-gray-500">
              {searchQuery
                ? 'No skills matched your search filter.'
                : 'There are no listings waiting for approval.'}
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
              <span>Skill</span>
              <span>Instructor</span>
              <span>Cost</span>
              <span>Assignment</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {filteredSkills.map(item => {
                const isMine = item.assigned_to === currentUserId;
                const isPending = item.status === 'pending';

                return (
                  <li key={item.id} className={`relative flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 ${ROW_GRID}`}>
                    <span
                      className={`absolute inset-y-0 left-0 w-[3px] ${isPending ? 'bg-amber-400' : item.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-400'}`}
                      aria-hidden="true"
                    />

                    {/* Skill details */}
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                        {item.cover_image_url ? (
                          <img src={item.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <FileImage className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900" title={item.title}>{item.title}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {item.category} <span className="text-gray-300" aria-hidden="true">/</span> <span className="tabular-nums text-gray-400">#{item.id.slice(0, 8)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Meta cells: labelled on mobile, columns on desktop */}
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:contents">
                      <div className="min-w-0">
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Instructor</dt>
                        <dd>
                          <p className="truncate text-[13px] font-medium text-gray-800">{item.instructor?.full_name || 'Unknown User'}</p>
                          <p className="mt-0.5 text-xs tabular-nums text-gray-400">
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </dd>
                      </div>

                      <div>
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Cost</dt>
                        <dd>
                          <p className="text-sm font-semibold tabular-nums text-gray-900">{item.credit_cost} CR</p>
                          <p className="mt-0.5 text-xs text-gray-500">{item.format}</p>
                        </dd>
                      </div>

                      <div className="min-w-0">
                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Assignment</dt>
                        <dd>
                          {item.assigned_to ? (
                            isMine ? (
                              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Assigned to You
                              </span>
                            ) : (
                              <span className="block truncate text-[13px] font-medium text-gray-700">
                                {item.assignee?.full_name || 'Another Mod'}
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
                            isPending
                              ? 'bg-amber-50 text-amber-800'
                              : item.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}>
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${isPending ? 'bg-amber-500' : item.status === 'approved' ? 'bg-emerald-600' : 'bg-rose-500'}`}
                              aria-hidden="true"
                            />
                            {item.status}
                          </span>
                        </dd>
                      </div>
                    </dl>

                    {/* Action */}
                    <Link
                      to={`/moderator/review/${item.id}`}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors lg:w-full ${FOCUS_RING} ${
                        isPending
                          ? 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {isPending ? 'Review Skill' : 'View Record'} <ArrowRight className="h-3.5 w-3.5" />
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