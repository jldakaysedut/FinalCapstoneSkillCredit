import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../supabaseClient';
​
export default function Disputes() {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'my_claims' | 'resolved' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
​
  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
​
      // 1. Kunin ang lahat ng session dispute reports
      const { data: reportsData, error: reportsErr } = await supabase
        .from('reports')
        .select(`
          id, reference_id, reference_type, reason, details, status, created_at, assigned_to,
          reporter_id, reported_user_id,
          reporter:user_profiles!reports_reporter_id_fkey(id, full_name, avatar_url),
          reported:user_profiles!reports_reported_user_id_fkey(id, full_name, avatar_url),
          assignee:user_profiles!reports_assigned_to_fkey(id, full_name)
        `)
        .eq('reference_type', 'session')
        .order('created_at', { ascending: false });
​
      if (reportsErr) throw reportsErr;
​
      // 2. Kunin ang matching session telemetry para sa credits at skill name
      const sessionIds = (reportsData || []).map(r => r.reference_id).filter(Boolean);
      let sessionMap = {};
​
      if (sessionIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select(`
            id, credit_amount, student_id, instructor_id, scheduled_date, scheduled_time,
            skill:skills(title)
          `)
          .in('id', sessionIds);
​
        (sessionsData || []).forEach(s => {
          sessionMap[s.id] = s;
        });
      }
​
      // 3. I-combine ang reports at session info
      const enriched = (reportsData || []).map(report => ({
        ...report,
        session: sessionMap[report.reference_id] || null
      }));
​
      setDisputes(enriched);
    } catch (err) {
      console.error('Failed to load escrow disputes:', err.message);
    } finally {
      setLoading(false);
    }
  };
​
  useEffect(() => {
    fetchDisputes();
  }, []);
​
  // Telemetry Calculations
  const metrics = useMemo(() => {
    const pendingList = disputes.filter(d => d.status === 'pending');
    const totalEscrow = pendingList.reduce(
      (acc, d) => acc + Number(d.session?.credit_amount || 0),
      0
    );
    const myClaims = disputes.filter(
      d => d.status === 'pending' && d.assigned_to === currentUserId
    ).length;
    const resolvedCount = disputes.filter(d => d.status === 'resolved').length;
​
    return {
      pendingCount: pendingList.length,
      escrowLocked: totalEscrow,
      myClaimsCount: myClaims,
      resolvedCount
    };
  }, [disputes, currentUserId]);
​
  // Tab & Search Filtering
  const filteredDisputes = useMemo(() => {
    return disputes.filter(item => {
      if (activeTab === 'pending' && item.status !== 'pending') return false;
      if (activeTab === 'my_claims' && (item.status !== 'pending' || item.assigned_to !== currentUserId)) return false;
      if (activeTab === 'resolved' && item.status !== 'resolved') return false;
​
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const skillMatch = item.session?.skill?.title?.toLowerCase().includes(q);
        const reporterMatch = item.reporter?.full_name?.toLowerCase().includes(q);
        const reportedMatch = item.reported?.full_name?.toLowerCase().includes(q);
        const reasonMatch = item.reason?.toLowerCase().includes(q);
        const idMatch = item.id.toLowerCase().includes(q);
​
        return skillMatch || reporterMatch || reportedMatch || reasonMatch || idMatch;
      }
​
      return true;
    });
  }, [disputes, activeTab, searchQuery, currentUserId]);
​
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Dispute & Escrow Adjudication
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review contested sessions, inspect dialogue logs, and release held escrow balances.
          </p>
        </div>
​
        <button
          onClick={fetchDisputes}
          className="self-start sm:self-auto px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition shadow-xs"
        >
          Refresh Queue
        </button>
      </div>
​
      {/* ── METRIC STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Action Required</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.pendingCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">Pending</span>
          </div>
        </div>
​
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Locked Escrow</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.escrowLocked}</span>
            <span className="text-[11px] font-semibold text-slate-500">Credits</span>
          </div>
        </div>
​
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Assigned to You</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.myClaimsCount}</span>
            <span className="text-[11px] text-blue-600 font-medium">In Review</span>
          </div>
        </div>
​
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Resolved</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.resolvedCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium">Closed</span>
          </div>
        </div>
      </div>
​
      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {[
            { id: 'pending', label: 'Pending', count: metrics.pendingCount },
            { id: 'my_claims', label: 'My Claims', count: metrics.myClaimsCount },
            { id: 'resolved', label: 'Resolved', count: metrics.resolvedCount },
            { id: 'all', label: 'All Cases', count: disputes.length }
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
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
​
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by skill, user, or reason..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
​
      </div>
​
      {/* ── TABLE DATA VIEW ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium">
            Loading dispute ledger...
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="py-20 text-center p-6">
            <p className="text-sm font-semibold text-slate-700">No disputes found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'No cases matched your filter criteria.'
                : 'There are no active disputes in this queue.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Case / Subject</th>
                  <th className="py-3 px-4">Parties Involved</th>
                  <th className="py-3 px-4 text-center">Escrow Value</th>
                  <th className="py-3 px-4">Assignment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDisputes.map(item => {
                  const isParticipant = Boolean(
                    currentUserId && item.session && (
                      currentUserId === item.session.student_id || currentUserId === item.session.instructor_id
                    )
                  );
                  const isMine = item.assigned_to === currentUserId;
​
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* Case & Reason */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900 text-xs">
                            {item.session?.skill?.title || 'Contested Booking'}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              {item.reason}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{item.id.slice(0, 8)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 italic max-w-xs">
                            "{item.details}"
                          </p>
                        </div>
                      </td>
​
                      {/* Parties Involved */}
                      <td className="py-3.5 px-4 align-top text-xs">
                        <div className="space-y-0.5">
                          <p className="text-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Filer:</span>
                            {item.reporter?.full_name || 'Complainant'}
                          </p>
                          <p className="text-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Target:</span>
                            {item.reported?.full_name || 'Instructor'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </td>
​
                      {/* Escrow Value */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.session?.credit_amount ?? 0}
                        </span>
                        <span className="block text-[10px] font-medium text-slate-400 uppercase">
                          Credits
                        </span>
                      </td>
​
                      {/* Assignment */}
                      <td className="py-3.5 px-4 align-top">
                        {isParticipant ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Conflict (You)
                          </span>
                        ) : item.assigned_to ? (
                          isMine ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Assigned to You
                            </span>
                          ) : (
                            <span className="inline-block text-xs text-slate-600 font-medium">
                              {item.assignee?.full_name || 'Staff Member'}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
​
                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                          item.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
​
                      {/* Action */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <Link
                          to={`/moderator/disputes/${item.id}`}
                          className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            item.status === 'pending'
                              ? 'bg-slate-900 hover:bg-slate-800 text-white'
                              : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {item.status === 'pending' ? 'Review Case' : 'View Record'}
                        </Link>
                      </td>
​
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
​
    </div>
  );
}