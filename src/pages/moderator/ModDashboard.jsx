import { useState, useEffect } from 'react';
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

export default function ModDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [stats, setStats] = useState({
    pendingDisputes: 0,
    escrowLocked: 0,
    pendingReports: 0,
    resolvedTotal: 0,
    myClaims: 0,
    pendingSkills: 0 // 🚨 BAGONG METRIC PARA SA SKILLS
  });
  const [recentQueue, setRecentQueue] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // 1. Fetch Session Disputes (reference_type = 'session')
      const { data: sessionReports, error: repErr } = await supabase
        .from('reports')
        .select('id, reference_id, status, assigned_to')
        .eq('reference_type', 'session');

      if (repErr) throw repErr;

      const pendingDisputesList = (sessionReports || []).filter(r => r.status === 'pending');
      const pendingDisputesCount = pendingDisputesList.length;

      // 2. Compute Real Escrow Amount from Pending Sessions
      let totalEscrow = 0;
      const sessionIds = pendingDisputesList.map(r => r.reference_id).filter(Boolean);
      if (sessionIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('credit_amount')
          .in('id', sessionIds);

        totalEscrow = (sessionsData || []).reduce(
          (acc, item) => acc + Number(item.credit_amount || 0),
          0
        );
      }

      // 3. Fetch User Behavioral Reports (reference_type != 'session')
      const { count: pendingReportsCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .neq('reference_type', 'session')
        .eq('status', 'pending');

      // 4. Fetch All-Time Resolved Count
      const { count: resolvedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      // 5. Fetch Pending Skills Count 🚨
      const { count: pendingSkillsCount } = await supabase
        .from('skills')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 6. My Active Claims
      const myClaimedCount = (sessionReports || []).filter(
        r => r.status === 'pending' && r.assigned_to === user?.id
      ).length;

      setStats({
        pendingDisputes: pendingDisputesCount,
        escrowLocked: totalEscrow,
        pendingReports: pendingReportsCount || 0,
        resolvedTotal: resolvedCount || 0,
        myClaims: myClaimedCount,
        pendingSkills: pendingSkillsCount || 0
      });

      // 7. Fetch Recent Incoming Tickets (Cluster by reference_id, Limit 8)
      const { data: recentData } = await supabase
        .from('reports')
        .select(`
          id, reference_id, reference_type, reason, details, status, created_at, assigned_to,
          reporter:user_profiles!reports_reporter_id_fkey(full_name),
          reported:user_profiles!reports_reported_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      // Report Clustering Logic
      const recentClusters = {};
      (recentData || []).forEach(report => {
        const key = report.reference_id || report.id;
        if (!recentClusters[key]) {
           recentClusters[key] = { ...report, report_count: 1 };
        } else {
           recentClusters[key].report_count += 1;
           if (report.status === 'pending' && recentClusters[key].status !== 'pending') {
               recentClusters[key].status = 'pending';
           }
        }
      });

      setRecentQueue(Object.values(recentClusters).slice(0, 20));

    } catch (err) {
      console.error('Failed to load moderator dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-700">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Moderation Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System health, active escrow liabilities, and unresolved intake queues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <ModeratorIcon name="refresh" size={15} /> Refresh metrics
          </button>
          <Link
            to="/moderator/disputes"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <ModeratorIcon name="shield" size={15} /> Disputes queue
          </Link>
        </div>
      </div>

      {/* ── 5 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Pending Disputes</span>
            <ModeratorIcon name="clock" className="text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{stats.pendingDisputes}</span>
            <span className="text-xs font-medium text-slate-400">Cases</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Requiring adjudication</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Escrow at Stake</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase"><ModeratorIcon name="wallet" size={14} /> Credits</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{stats.escrowLocked}</span>
            <span className="text-xs font-semibold text-slate-500">CR</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Held across open sessions</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>User Reports</span>
            <ModeratorIcon name="alert" className="text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{stats.pendingReports}</span>
            <span className="text-xs font-medium text-slate-400">Tickets</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Conduct & profile flags</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Resolved Cases</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs"><ModeratorIcon name="check" size={14} /> Settled</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900">{stats.resolvedTotal}</span>
            <span className="text-xs font-medium text-slate-400">Total</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Historical closed tickets</p>
        </div>

        {/* Metric 5: Skill Approvals 🚨 */}
        <Link to="/moderator/approvals" className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition cursor-pointer group">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="group-hover:text-indigo-700 transition">Skill Approvals</span>
            <ModeratorIcon name="search" className="text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 group-hover:text-indigo-700 transition">{stats.pendingSkills}</span>
            <span className="text-xs font-medium text-slate-400">Listings</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Awaiting quality review</p>
        </Link>

      </div>

      {/* ── SPLIT SECTION: INTAKE QUEUE & WORKLOAD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left Column (3 Cols): Intake Queue Table */}
        <div className="lg:col-span-3 min-w-0 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-800">
              <ModeratorIcon name="report" className="text-slate-500" /> Recent intake queue
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Latest grouped submissions
            </span>
          </div>

          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9] max-h-[500px] w-full">
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400 font-medium">
                Fetching intake telemetry...
              </div>
            ) : recentQueue.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 font-medium">
                No active records in the intake queue.
              </div>
            ) : (
              <table className="min-w-[760px] w-full text-left text-sm whitespace-nowrap sm:whitespace-normal">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4 w-[10%]">Type</th>
                    <th className="py-2.5 px-4 w-[35%]">Subject / Reason</th>
                    <th className="py-2.5 px-4 w-[30%]">Parties</th>
                    <th className="py-2.5 px-4 w-[15%]">Status</th>
                    <th className="py-2.5 px-4 w-[10%] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentQueue.map((item) => {
                    const isDispute = item.reference_type === 'session';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                            isDispute 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {isDispute ? 'Dispute' : 'Report'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                             <p className="font-semibold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">
                               {item.reason}
                             </p>
                             {item.report_count > 1 && (
                               <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold shrink-0" title={`${item.report_count} users reported this`}>
                                  {item.report_count}x
                               </span>
                             )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs text-slate-600 truncate max-w-[150px] sm:max-w-[200px]">
                            {item.report_count > 1 ? 'Multiple Users' : (item.reporter?.full_name || 'Anonymous')} <span aria-hidden="true">→</span> {item.reported?.full_name || 'User'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'pending'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={isDispute ? `/moderator/disputes/${item.id}` : `/moderator/reports/${item.id}`}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-emerald-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                          >
                            Inspect <ModeratorIcon name="arrow" size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Workload & Operational Directives */}
        <div className="lg:col-span-1 min-w-0 space-y-4">
          
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Adjudication Protocol
            </h3>
            <ul className="text-xs text-slate-600 space-y-2.5">
              <li className="flex gap-2">
                <span className="font-semibold text-slate-900 shrink-0">1.</span>
                <span><b>Independent Inspection:</b> Review chat history and attendance telemetry prior to finalizing verdicts.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-slate-900 shrink-0">2.</span>
                <span><b>No Self-Adjudication:</b> Never claim or resolve disputes where your account is an involved party.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-slate-900 shrink-0">3.</span>
                <span><b>Escrow Finality:</b> Escrow refunds and payout distributions are permanently recorded upon execution.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}