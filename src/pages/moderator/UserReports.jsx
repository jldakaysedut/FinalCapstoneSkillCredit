import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
 import { useState, useEffect, useMemo } from 'react';

import { Link } from 'react-router-dom';

import supabase from '../../supabaseClient';

import { RefreshCw, Search, X, ArrowRight, Flag, AlertTriangle } from 'lucide-react';



const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';



// One column template shared by the header row and every report row (desktop),

// so all columns line up exactly.

const ROW_GRID = 'lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_104px_136px] lg:items-center lg:gap-6';



export default function UserReports() {

  const [loading, setLoading] = useState(true);

  const [groupedReports, setGroupedReports] = useState([]);

  const [currentUserId, setCurrentUserId] = useState(null);

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'my_claims' | 'resolved' | 'all'

  const [searchQuery, setSearchQuery] = useState('');



  const fetchReports = async () => {

    setLoading(true);

    try {

      const { data: { user } } = await supabase.auth.getUser();

      if (user) setCurrentUserId(user.id);



      // Kunin ang lahat ng behavioral at conduct reports (hindi session escrow)

      const { data, error } = await supabase

        .from('reports')

        .select(`

          id, reference_id, reference_type, reason, details, status, created_at, assigned_to,

          reporter_id, reported_user_id,

          reporter:user_profiles!reports_reporter_id_fkey(id, full_name, role),

          reported:user_profiles!reports_reported_user_id_fkey(id, full_name, role),

          assignee:user_profiles!reports_assigned_to_fkey(id, full_name)

        `)

        .neq('reference_type', 'session')

        .order('created_at', { ascending: false });



      if (error) throw error;



      // ─── CLUSTERING LOGIC: Group by reference_id ───

      const clusters = {};

      (data || []).forEach(report => {

        // Fallback kung walang reference_id, gamitin ang report ID mismo

        const key = report.reference_id || report.id;



        if (!clusters[key]) {

          clusters[key] = {

            ...report,

            report_count: 1,

            all_reporters: [report.reporter?.full_name].filter(Boolean),

            all_reasons: [],

            all_details: [],

          };

        } else {

          clusters[key].report_count += 1;

          if (report.reporter?.full_name && !clusters[key].all_reporters.includes(report.reporter.full_name)) {

            clusters[key].all_reporters.push(report.reporter.full_name);

          }

          // Keep a pending status if any filer still has an open report.

          if (report.status === 'pending' && clusters[key].status !== 'pending') {

            clusters[key].status = 'pending';

          }

        }



        const reason = report.reason?.trim();

        if (reason && !clusters[key].all_reasons.some(

          existing => existing.toLowerCase() === reason.toLowerCase()

        )) {

          clusters[key].all_reasons.push(reason);

        }

        const details = report.details?.trim();

        if (details) clusters[key].all_details.push(details);

      });



      // Convert clustered records to a summary that does not hide differing filer reasons.

      const grouped = Object.values(clusters).map(cluster => ({

        ...cluster,

        reason_variants: cluster.all_reasons,

        reason_summary: cluster.all_reasons.length > 1

          ? 'Mixed reasons'

          : cluster.all_reasons[0] || 'Unspecified reason',

      }));

      setGroupedReports(grouped);



    } catch (err) {

      console.error('Failed to load user reports:', err.message);

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    fetchReports();

  }, []);

  useRealtimeRefresh(fetchReports, ['reports'], 'web_refresh_userreports');



  // Telemetry Calculations (Using grouped reports)

  const metrics = useMemo(() => {

    const pendingList = groupedReports.filter(r => r.status === 'pending');

    const myClaims = groupedReports.filter(r => r.status === 'pending' && r.assigned_to === currentUserId).length;

    const resolvedCount = groupedReports.filter(r => r.status === 'resolved' || r.status === 'escalated').length;



    return {

      pendingCount: pendingList.length,

      myClaimsCount: myClaims,

      resolvedCount,

      totalCount: groupedReports.length // Number of unique issues

    };

  }, [groupedReports, currentUserId]);



  // Tab & Search Filtering

  const filteredReports = useMemo(() => {

    return groupedReports.filter(item => {

      if (activeTab === 'pending' && item.status !== 'pending') return false;

      if (activeTab === 'my_claims' && (item.status !== 'pending' || item.assigned_to !== currentUserId)) return false;

      if (activeTab === 'resolved' && item.status !== 'resolved' && item.status !== 'escalated') return false;



      if (searchQuery.trim() !== '') {

        const q = searchQuery.toLowerCase();

        const reasonMatch = (item.reason_variants || []).some(reason => reason.toLowerCase().includes(q));

        const reporterMatch = item.all_reporters.some(name => name.toLowerCase().includes(q));

        const reportedMatch = item.reported?.full_name?.toLowerCase().includes(q);

        const detailsMatch = (item.all_details || []).some(details => details.toLowerCase().includes(q));



        return reasonMatch || reporterMatch || reportedMatch || detailsMatch;

      }



      return true;

    });

  }, [groupedReports, activeTab, searchQuery, currentUserId]);



  // ── Display-only: the four filter tabs ──

  const tabs = [

    { id: 'pending', label: 'Pending', hint: 'Awaiting review', count: metrics.pendingCount },

    { id: 'my_claims', label: 'My claims', hint: 'In your review', count: metrics.myClaimsCount },

    { id: 'resolved', label: 'Resolved & escalated', hint: 'Closed or sent up', count: metrics.resolvedCount },

    { id: 'all', label: 'All reports', hint: 'Unique issues on record', count: groupedReports.length },

  ];



  return (

    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">



      {/* ── PAGE HEADER ── */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">User reports & conduct queue</h1>

          <p className="mt-1 max-w-xl text-sm text-gray-500">

            Review community infractions, harassment complaints, and account conduct tickets.

          </p>

        </div>

        <button

          onClick={fetchReports}

          className={`inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:self-auto ${FOCUS_RING}`}

        >

          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh queue

        </button>

      </div>



      {/* ── STAT TABS (counts double as the queue filter) ── */}

      <div role="group" aria-label="Filter the queue" className="grid grid-cols-2 gap-3 lg:grid-cols-4">

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

            placeholder="Search by reason, user, or details"

            aria-label="Search user reports"

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

            Showing <span className="font-semibold tabular-nums text-gray-900">{filteredReports.length}</span> of <span className="tabular-nums">{groupedReports.length}</span> reports

          </p>

        )}

      </div>



      {/* ── REPORTS ── */}

      <section aria-label="User reports" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

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

        ) : filteredReports.length === 0 ? (

          <div className="px-6 py-16 text-center">

            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">

              <Flag className="h-5 w-5" />

            </span>

            <p className="mt-3 text-sm font-semibold text-gray-900">No reports found</p>

            <p className="mt-1 text-xs text-gray-500">

              {searchQuery

                ? 'No tickets matched your filter criteria.'

                : 'There are no active records in this queue.'}

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

              <span>Report</span>

              <span>Complaints</span>

              <span>Reported user</span>

              <span>Assignment</span>

              <span>Status</span>

              <span className="text-right">Action</span>

            </div>



            <ul className="divide-y divide-gray-100">

              {filteredReports.map(item => {

                const isParticipant = Boolean(

                  currentUserId && (currentUserId === item.reporter_id || currentUserId === item.reported_user_id)

                );

                const isMine = item.assigned_to === currentUserId;

                const isPending = item.status === 'pending';

                const isEscalated = item.status === 'escalated';



                return (

                  <li key={item.id} className={`relative flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-gray-50/70 ${isParticipant ? 'bg-rose-50/30' : ''} ${ROW_GRID}`}>

                    <span

                      className={`absolute inset-y-0 left-0 w-[3px] ${isParticipant || isEscalated ? 'bg-rose-500' : isPending ? 'bg-amber-400' : 'bg-emerald-500'}`}

                      aria-hidden="true"

                    />



                    {/* Reason & type */}

                    <div className="flex min-w-0 items-start gap-3.5">

                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">

                        <Flag className="h-5 w-5" />

                      </span>

                      <div className="min-w-0">

                        <p title={item.reason_summary} className="truncate text-sm font-semibold text-gray-900">

                          {item.reason_summary}

                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">

                          <span className="inline-block rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium capitalize text-gray-600">

                            {item.reference_type || 'User Conduct'}

                          </span>

                          <span className="text-xs tabular-nums text-gray-400">#{item.id.slice(0, 8)}</span>

                        </div>

                      </div>

                    </div>



                    {/* Meta cells: labelled on mobile, columns on desktop */}

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:contents">

                      <div>

                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Complaints</dt>

                        <dd>

                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-rose-700">

                            {item.report_count} {item.report_count > 1 ? 'reports' : 'report'}

                          </span>

                          <p className="mt-1 text-xs tabular-nums text-gray-400">

                            Latest {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}

                          </p>

                        </dd>

                      </div>



                      <div className="min-w-0">

                        <dt className="mb-1 text-[11px] font-medium text-gray-400 lg:sr-only">Reported user</dt>

                        <dd>

                          <p className="truncate text-[13px] font-medium text-gray-900">

                            {item.reported?.full_name || 'Flagged User'}

                          </p>

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

                            isPending

                              ? 'bg-amber-50 text-amber-800'

                              : isEscalated

                                ? 'bg-rose-50 text-rose-800'

                                : 'bg-emerald-50 text-emerald-800'

                          }`}>

                            <span className={`h-1.5 w-1.5 rounded-full ${isPending ? 'bg-amber-500' : isEscalated ? 'bg-rose-500' : 'bg-emerald-600'}`} aria-hidden="true" />

                            {item.status}

                          </span>

                        </dd>

                      </div>

                    </dl>



                    {/* Action */}

                    <Link

                      to={`/moderator/reports/${item.id}`}

                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${FOCUS_RING} ${

                        isPending

                          ? 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800'

                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'

                      }`}

                    >

                      {isPending ? 'Review ticket' : 'View record'} <ArrowRight className="h-3.5 w-3.5" />

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