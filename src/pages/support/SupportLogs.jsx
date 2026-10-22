import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { 
  CheckCircle, Wallet, AlertOctagon,
  Search, Filter, LifeBuoy, ArrowLeft, CalendarDays,
  FileText, ChevronDown, X, LogIn, LogOut, RotateCcw, Headset
} from 'lucide-react';

// ── ACTION TYPE STYLES (SUPPORT THEME) ──
const ACTION_META = {
  'SYSTEM_LOGIN': { 
    label: 'System Login', 
    icon: LogIn, 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50 border-emerald-200' 
  },
  'SYSTEM_LOGOUT': { 
    label: 'System Logout', 
    icon: LogOut, 
    color: 'text-slate-600', 
    bg: 'bg-slate-50 border-slate-200' 
  },
  'TICKET_CLAIMED': { 
    label: 'Claimed Ticket', 
    icon: Headset, 
    color: 'text-purple-600', 
    bg: 'bg-purple-50 border-purple-200' 
  },
  'TICKET_RELEASED': { 
    label: 'Released Ticket', 
    icon: RotateCcw, 
    color: 'text-amber-600', 
    bg: 'bg-amber-50 border-amber-200' 
  },
  'RESOLVE_TICKET': { 
    label: 'Resolved Ticket', 
    icon: CheckCircle, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50 border-blue-200' 
  },
  'MANUAL_REFUND': { 
    label: 'Manual Refund', 
    icon: Wallet, 
    color: 'text-amber-600', 
    bg: 'bg-amber-50 border-amber-200' 
  },
  'ESCALATE_TICKET': { 
    label: 'Escalated to Admin', 
    icon: AlertOctagon, 
    color: 'text-rose-600', 
    bg: 'bg-rose-50 border-rose-200' 
  },
  'DEFAULT': { 
    label: 'System Action', 
    icon: LifeBuoy, 
    color: 'text-gray-600', 
    bg: 'bg-gray-50 border-gray-200' 
  }
};

const getActionMeta = (type) => ACTION_META[type] || ACTION_META['DEFAULT'];

export default function SupportLogs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  
  // ── MODAL STATE ──
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    const fetchSupportLogs = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.role !== 'Admin' && profile.role !== 'Support')) {
        alert('Unauthorized access. Admin or Support privileges required.');
        navigate('/dashboard');
        return;
      }

      const { data, error } = await supabase
        .from('support_logs')
        .select(`
          *,
          support:support_id(full_name, avatar_url, role),
          target:target_user_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching support logs:', error);
      } else {
        setLogs(data || []);
      }
      
      setLoading(false);
    };

    fetchSupportLogs();
  }, [navigate]);

  // ── FILTERING LOGIC ──
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        (log.support?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.target?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.details?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchAction = filterAction === 'ALL' || log.action_type === filterAction;

      return matchSearch && matchAction;
    });
  }, [logs, searchQuery, filterAction]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center">
        <LifeBuoy className="w-12 h-12 text-blue-300 animate-pulse mb-4" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Support Logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-12">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-8">
        
        {/* ══ HEADER ══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-blue-700 transition mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Workspace
            </button>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">
              Customer Service
            </p>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Support Audit Logs
            </h1>
            <p className="text-[13px] text-gray-500 mt-1 font-medium">
              Track and monitor all ticket milestones, agent authentications, and manual interventions.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white border border-gray-200 p-2 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <LifeBuoy className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Actions</p>
                <p className="text-[14px] font-black text-gray-800 leading-none">{logs.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ══ CONTROLS (SEARCH & FILTER) ══ */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by agent, user, or details..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-[13px] font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm"
            />
          </div>
          
          <div className="relative shrink-0 w-full sm:w-48">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-8 py-3 text-[13px] font-bold text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition appearance-none shadow-sm cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="SYSTEM_LOGIN">System Logins</option>
              <option value="SYSTEM_LOGOUT">System Logouts</option>
              <option value="TICKET_CLAIMED">Tickets Claimed</option>
              <option value="TICKET_RELEASED">Tickets Released</option>
              <option value="RESOLVE_TICKET">Resolved Tickets</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* ══ DATA TABLE ══ */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <p className="font-bold text-gray-900 mb-1">No logs found</p>
              <p className="text-[12px] text-gray-400">Try adjusting your search or filter settings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Action Taken</th>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Support Agent</th>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Target User</th>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Details & Ticket ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map(log => {
                    const meta = getActionMeta(log.action_type);
                    const ActionIcon = meta.icon;
                    
                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-gray-50/80 transition cursor-pointer group"
                      >
                        
                        {/* TIMESTAMP */}
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-1.5 text-gray-500 mb-0.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span className="text-[12px] font-bold group-hover:text-blue-700 transition">
                              {new Date(log.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-gray-400 ml-5">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* ACTION TYPE */}
                        <td className="px-5 py-4 align-top">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap ${meta.bg} ${meta.color}`}>
                            <ActionIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                            {meta.label}
                          </div>
                        </td>

                        {/* SUPPORT AGENT */}
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 border border-blue-200">
                              {log.support?.avatar_url 
                                ? <img src={log.support.avatar_url} alt="" className="w-full h-full object-cover" />
                                : log.support?.full_name?.charAt(0) || 'S'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-gray-900 truncate group-hover:text-blue-700 transition">
                                {log.support?.full_name || 'Unknown Agent'}
                              </p>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                                {log.support?.role || 'Support'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* TARGET USER */}
                        <td className="px-5 py-4 align-top">
                          {log.target ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 border border-gray-200">
                                {log.target.avatar_url 
                                  ? <img src={log.target.avatar_url} alt="" className="w-full h-full object-cover" />
                                  : log.target.full_name?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-gray-900 truncate">
                                  {log.target.full_name}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono truncate">
                                  ID: {log.target_user_id.split('-')[0]}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[12px] italic text-gray-400">N/A</span>
                          )}
                        </td>

                        {/* DETAILS & REF */}
                        <td className="px-5 py-4 align-top">
                          <p className="text-[12px] text-gray-700 font-medium leading-relaxed line-clamp-2 mb-1">
                            {log.details || 'No additional details provided.'}
                          </p>
                          {log.ticket_id && (
                            <div className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[9px] font-mono text-gray-500">
                              Ticket: {log.ticket_id.split('-')[0]}
                            </div>
                          )}
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

      {/* ══ MODAL: AUDIT RECORD DETAILS ══ */}
      {selectedLog && (
        <div 
          className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-1">Audit Record</p>
                <h3 className="font-bold text-lg text-gray-900 leading-tight">Support Log Details</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)} 
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto [&::-webkit-scrollbar]:hidden">
              
              {/* Top Meta: Action & Time */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Action Executed</p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-bold ${getActionMeta(selectedLog.action_type).bg} ${getActionMeta(selectedLog.action_type).color}`}>
                    {(() => {
                      const Icon = getActionMeta(selectedLog.action_type).icon;
                      return <Icon className="w-4 h-4" strokeWidth={2.5} />;
                    })()}
                    {getActionMeta(selectedLog.action_type).label}
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Timestamp</p>
                  <p className="text-[14px] font-bold text-gray-800">
                    {new Date(selectedLog.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              {/* Profiles: Support & Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                {/* Support Box */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-800 mb-3">Executed By (Agent)</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-blue-200">
                      {selectedLog.support?.avatar_url 
                        ? <img src={selectedLog.support.avatar_url} alt="" className="w-full h-full object-cover" />
                        : selectedLog.support?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-gray-900 truncate">
                        {selectedLog.support?.full_name || 'Unknown Agent'}
                      </p>
                      <p className="text-[11px] font-mono text-blue-600 truncate">
                        ID: {selectedLog.support_id.split('-')[0]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Target User Box */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Target User</p>
                  {selectedLog.target ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-gray-300">
                        {selectedLog.target.avatar_url 
                          ? <img src={selectedLog.target.avatar_url} alt="" className="w-full h-full object-cover" />
                          : selectedLog.target.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-gray-900 truncate">
                          {selectedLog.target.full_name}
                        </p>
                        <p className="text-[11px] font-mono text-gray-500 truncate">
                          ID: {selectedLog.target_user_id.split('-')[0]}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] font-medium italic text-gray-400 py-2">No target user assigned.</p>
                  )}
                </div>
              </div>

              {/* Details and Notes */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Resolution Notes / Details</p>
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 text-[14px] leading-relaxed whitespace-pre-wrap">
                  {(() => {
                    const details = selectedLog.details;
                    if (!details) return <span className="text-gray-400 italic">No additional details were provided.</span>;

                    if (details.includes('. Notes: ')) {
                      const parts = details.split('. Notes: ');
                      const summary = parts[0];
                      const notes = parts.slice(1).join('. Notes: ');

                      return (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <CheckCircle className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Action Summary</span>
                              <p className="text-gray-800 font-medium">{summary}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 p-4 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Agent Remarks</span>
                              <p className="text-gray-900 font-medium italic">"{notes}"</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return <p className="text-gray-800 font-medium">{details}</p>;
                  })()}
                </div>
              </div>

              {/* Ticket Reference ID */}
              {selectedLog.ticket_id && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Support Ticket ID</p>
                  <p className="text-[13px] font-mono text-gray-600 bg-gray-50 border border-gray-200 inline-block px-4 py-2 rounded-xl">
                    {selectedLog.ticket_id}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50 shrink-0">
              <button 
                onClick={() => setSelectedLog(null)} 
                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-[13px] font-bold transition shadow-sm cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}