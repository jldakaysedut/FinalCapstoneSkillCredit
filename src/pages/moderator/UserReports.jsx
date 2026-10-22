import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../supabaseClient';



// Small inline icon set keeps the moderator UI consistent without adding dependencies.
function ModeratorIcon({ name, size = 16, className = '' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" /></>,
    close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    report: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    scale: <><path d="m16 16 3-8 3 8a5 5 0 0 1-6 0ZM2 16l3-8 3 8a5 5 0 0 1-6 0Z" /><path d="M7 21h10M12 3v18M5 8h14l-2-4H7Z" /></>,
    wallet: <><path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" /><path d="M16 14h.01" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  };
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      {paths[name] || paths.report}
    </svg>
  );
}
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-700">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            User Reports & Conduct Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review community infractions, harassment complaints, and account conduct tickets.
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="self-start sm:self-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 shadow-sm"
        >
          <ModeratorIcon name="refresh" size={15} /> Refresh queue
        </button>
      </div>

      {/* ── METRIC STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unique Issues (Pending)</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{metrics.pendingCount}</span>
            <span className="text-xs text-amber-600 font-medium">Clusters</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned to You</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{metrics.myClaimsCount}</span>
            <span className="text-xs text-blue-600 font-medium">In Review</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolved Issues</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{metrics.resolvedCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Closed</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Unique Issues</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{metrics.totalCount}</span>
            <span className="text-xs font-medium text-slate-400">Records</span>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9] text-xs">
          {[
            { id: 'pending', label: 'Pending', count: metrics.pendingCount },
            { id: 'my_claims', label: 'My Claims', count: metrics.myClaimsCount },
            { id: 'resolved', label: 'Resolved & Escalated', count: metrics.resolvedCount },
            { id: 'all', label: 'All Reports', count: groupedReports.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <ModeratorIcon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reason, user, or details..."
            aria-label="Search user reports"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 focus:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <ModeratorIcon name="close" size={14} />
            </button>
          )}
        </div>

      </div>

      {/* ── TABLE DATA VIEW ── */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading report records...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-20 text-center p-6">
            <p className="text-sm font-semibold text-slate-700">No reports found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'No tickets matched your filter criteria.'
                : 'There are no active records in this queue.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9]">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs">
                <tr>
                  <th scope="col" className="py-3 px-4">Subject / Reason</th>
                  <th className="py-3 px-4">Complaints</th>
                  <th className="py-3 px-4">Reported User</th>
                  <th className="py-3 px-4">Assignment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredReports.map(item => {
                  const isParticipant = Boolean(
                    currentUserId && (currentUserId === item.reporter_id || currentUserId === item.reported_user_id)
                  );
                  const isMine = item.assigned_to === currentUserId;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* Reason & Narrative */}
                      <td className="py-3.5 px-4 align-top max-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p
                              title={item.reason_summary}
                              className="truncate text-xs font-semibold text-slate-900"
                            >
                              {item.reason_summary}
                            </p>
                          </div>
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                            {item.reference_type || 'User Conduct'}
                          </span>
                        </div>
                      </td>

                      {/* Complaints Volume (The new Cluster Count) */}
                      <td className="py-3.5 px-4 align-top text-xs">
                        <div className="flex items-center gap-1.5">
                           <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                             {item.report_count} Report{item.report_count > 1 ? 's' : ''}
                           </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Latest: {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </td>

                      {/* Reported User */}
                      <td className="py-3.5 px-4 align-top text-xs">
                          <p className="font-semibold text-slate-800">
                            {item.reported?.full_name || 'Flagged User'}
                          </p>
                      </td>

                      {/* Assignment */}
                      <td className="py-3.5 px-4 align-top">
                        {isParticipant ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Conflict (You)
                          </span>
                        ) : item.assigned_to ? (
                          isMine ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Assigned to You
                            </span>
                          ) : (
                            <span className="inline-block text-xs text-slate-600 font-medium">
                              {item.assignee?.full_name || 'Staff Member'}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          item.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : item.status === 'escalated'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <Link
                          to={`/moderator/reports/${item.id}`}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                            item.status === 'pending'
                              ? 'bg-slate-900 hover:bg-slate-800 text-white'
                              : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {item.status === 'pending' ? 'Review Ticket' : 'View Record'} <ModeratorIcon name="arrow" size={14} />
                        </Link>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}