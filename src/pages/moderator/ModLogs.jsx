import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import {
  ShieldAlert, Trash2, Scale, AlertTriangle,
  Search, ShieldCheck, Clock,
  FileText, X, LogIn, LogOut, CheckCircle, UploadCloud,
  ChevronRight, Hash, BookOpen
} from 'lucide-react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

const ACTION_META = {
  'SYSTEM_LOGIN': {
    label: 'System Login',
    icon: LogIn,
    color: 'text-emerald-800',
    bg: 'bg-emerald-50 border-emerald-200',
    accent: 'border-l-emerald-500'
  },
  'SYSTEM_LOGOUT': {
    label: 'System Logout',
    icon: LogOut,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
    accent: 'border-l-gray-400'
  },
  'REPORT_DISMISSED': {
    label: 'Dismissed Report',
    icon: CheckCircle,
    color: 'text-blue-800',
    bg: 'bg-blue-50 border-blue-200',
    accent: 'border-l-blue-500'
  },
  'USER_WARNED': {
    label: 'Issued Warning',
    icon: AlertTriangle,
    color: 'text-amber-800',
    bg: 'bg-amber-50 border-amber-200',
    accent: 'border-l-amber-500'
  },
  'USER_PENALIZED': {
    label: 'Account Penalty (12h)',
    icon: ShieldAlert,
    color: 'text-orange-800',
    bg: 'bg-orange-50 border-orange-200',
    accent: 'border-l-orange-500'
  },
  'ESCALATED_TO_ADMIN': {
    label: 'Escalated to Admin',
    icon: UploadCloud,
    color: 'text-rose-800',
    bg: 'bg-rose-50 border-rose-200',
    accent: 'border-l-rose-500'
  },
  'DELETE_POST': {
    label: 'Deleted Content',
    icon: Trash2,
    color: 'text-rose-800',
    bg: 'bg-rose-50 border-rose-200',
    accent: 'border-l-rose-500'
  },
  'RESOLVE_DISPUTE': {
    label: 'Resolved Dispute',
    icon: Scale,
    color: 'text-purple-800',
    bg: 'bg-purple-50 border-purple-200',
    accent: 'border-l-purple-500'
  },
  'SKILL_REVIEW': {
    label: 'Skill Reviewed',
    icon: BookOpen,
    color: 'text-indigo-800',
    bg: 'bg-indigo-50 border-indigo-200',
    accent: 'border-l-indigo-500'
  },
  'DEFAULT': {
    label: 'System Action',
    icon: ShieldCheck,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
    accent: 'border-l-gray-400'
  }
};

const getActionMeta = (type) => ACTION_META[type] || ACTION_META['DEFAULT'];

const FILTERS = [
  { id: 'ALL', label: 'All actions' },
  { id: 'SYSTEM_LOGIN', label: 'Logins' },
  { id: 'SYSTEM_LOGOUT', label: 'Logouts' },
  { id: 'REPORT_DISMISSED', label: 'Dismissed reports' },
  { id: 'USER_WARNED', label: 'Warnings' },
  { id: 'USER_PENALIZED', label: 'Penalties' },
  { id: 'ESCALATED_TO_ADMIN', label: 'Escalations' },
  { id: 'DELETE_POST', label: 'Deleted content' },
  { id: 'RESOLVE_DISPUTE', label: 'Disputes' },
  { id: 'SKILL_REVIEW', label: 'Skill reviews' },
];

const getDayLabel = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDuration = (ms) => {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'under 1 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

function Avatar({ url, name, fallback, className }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden font-semibold ${className}`}>
      {url
        ? <img src={url} alt="" className="h-full w-full object-cover" />
        : name?.charAt(0) || fallback}
    </span>
  );
}

const RAIL_ROW = 'grid grid-cols-[32px_minmax(0,1fr)] gap-x-4';

export default function ModLogs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    const fetchModLogs = async () => {
      setLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || (profile.role !== 'Admin' && profile.role !== 'Moderator')) {
          alert('Unauthorized access. Admin or Moderator privileges required.');
          navigate('/dashboard');
          return;
        }

        const { data, error } = await supabase
          .from('mod_logs')
          .select(`
            *,
            moderator:moderator_id(full_name, avatar_url, role),
            target:target_user_id(full_name, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching mod logs:', error);
        } else {
          setLogs(data || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading audit logs:', err);
        setLoading(false);
      }
    };

    fetchModLogs();
  }, [navigate]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch =
        (log.moderator?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.target?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.details?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchAction = filterAction === 'ALL' || log.action_type === filterAction;

      return matchSearch && matchAction;
    });
  }, [logs, searchQuery, filterAction]);

  const actionCounts = useMemo(() => {
    const counts = { ALL: logs.length };
    logs.forEach(log => { counts[log.action_type] = (counts[log.action_type] || 0) + 1; });
    return counts;
  }, [logs]);

  const groupedByDay = useMemo(() => {
    const groups = [];
    filteredLogs.forEach(log => {
      const key = new Date(log.created_at).toDateString();
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(log);
      else groups.push({ key, label: getDayLabel(log.created_at), items: [log] });
    });
    return groups;
  }, [filteredLogs]);

  const sessionLengths = useMemo(() => {
    const lengths = {};
    const openSignIn = {};
    [...logs].reverse().forEach(log => {
      if (log.action_type === 'SYSTEM_LOGIN') {
        openSignIn[log.moderator_id] = log.created_at;
      } else if (log.action_type === 'SYSTEM_LOGOUT' && openSignIn[log.moderator_id]) {
        lengths[log.id] = new Date(log.created_at) - new Date(openSignIn[log.moderator_id]);
        delete openSignIn[log.moderator_id];
      }
    });
    return lengths;
  }, [logs]);

  if (loading) {
    return (
      <div className="space-y-6 font-sans text-gray-700" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading audit logs</span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Audit logs</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">Checking your access and loading the latest actions…</p>
        </div>
        <div className="animate-pulse space-y-3" aria-hidden="true">
          <div className="h-11 w-full rounded-xl border border-gray-200 bg-white sm:max-w-md" />
          <div className="flex gap-2 overflow-hidden">
            {[104, 84, 84, 140, 100, 100, 116, 128].map((w, i) => (
              <span key={i} style={{ width: w }} className="h-9 shrink-0 rounded-full border border-gray-200 bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Audit logs</h1>
        <p className="mt-1 max-w-xl text-sm text-gray-500">
          Everything the moderation team has done, newest first. Select an entry to see the full record.
        </p>
      </div>

      {/* ── SEARCH + FILTER CHIPS ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:max-w-md">
            <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by moderator, user, or details"
              aria-label="Search audit logs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="rounded p-0.5 text-gray-300 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <p className="text-xs text-gray-500" role="status">
            Showing <span className="font-semibold tabular-nums text-gray-900">{filteredLogs.length}</span> of <span className="tabular-nums">{logs.length}</span> actions
          </p>
        </div>

        <div role="group" aria-label="Filter by action" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map(f => {
            const isActive = filterAction === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilterAction(f.id)}
                aria-pressed={isActive}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${FOCUS_RING} ${
                  isActive
                    ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {f.label}
                <span className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {actionCounts[f.id] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVITY LIST: TIMELINE PANELS ── */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400"><FileText className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-gray-900">No logs found</p><p className="mt-1 text-xs text-gray-500">Try adjusting your search or filter settings.</p></div>
      ) : (
        <div className="space-y-8">
          {groupedByDay.map(group => (
            <section key={group.key} aria-label={group.label}>
              <div className="mb-4 flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-[#faf9f6]" /><h2 className="text-sm font-bold text-gray-900">{group.label}</h2><span className="h-px flex-1 bg-gray-200" /><span className="text-xs tabular-nums text-gray-400">{group.items.length}</span></div>
              <ol className="relative space-y-3 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-gray-200">
                {group.items.map(log => {
                  const meta = getActionMeta(log.action_type);
                  const ActionIcon = meta.icon;
                  const dateTime = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <li key={log.id} className="relative pl-10">
                      <span className={`absolute left-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#faf9f6] ${meta.bg} ${meta.color}`}><ActionIcon className="h-4 w-4" /></span>
                      <button type="button" onClick={() => setSelectedLog(log)} className={`group w-full rounded-2xl border border-gray-200 border-l-4 bg-white p-4 text-left shadow-sm transition hover:shadow-md ${meta.accent} ${FOCUS_RING}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className={`text-sm font-bold ${meta.color}`}>{meta.label}</p><p className="mt-1 text-xs text-gray-500">{log.moderator?.full_name || 'System'}{log.target?.full_name ? ` acted on ${log.target.full_name}` : ''}</p></div><span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium tabular-nums text-gray-500">{dateTime}</span></div>
                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-600">{log.details || 'No additional details provided.'}</p>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 transition-colors group-hover:text-emerald-700">View record <ChevronRight className="h-3.5 w-3.5" /></span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      {/* ── ACTIVITY RECORD MODAL ── */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-details-title"
          className="fixed inset-0 z-[600] flex items-center justify-center bg-gray-900/60 p-3 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getActionMeta(selectedLog.action_type).bg} ${getActionMeta(selectedLog.action_type).color}`}>
                  {(() => {
                    const Icon = getActionMeta(selectedLog.action_type).icon;
                    return <Icon className="h-5 w-5" aria-hidden="true" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Moderation record</p>
                  <h3 id="log-details-title" className={`truncate text-base font-bold ${getActionMeta(selectedLog.action_type).color}`}>
                    {getActionMeta(selectedLog.action_type).label}
                  </h3>
                  <p className="text-xs tabular-nums text-gray-500">
                    {new Date(selectedLog.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                aria-label="Close"
                className={`shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ${FOCUS_RING}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <section aria-label="People involved" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Action by</p>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar
                      url={selectedLog.moderator?.avatar_url}
                      name={selectedLog.moderator?.full_name}
                      fallback="M"
                      className="h-9 w-9 rounded-full border border-emerald-200 bg-emerald-100 text-xs text-emerald-800"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {selectedLog.moderator?.full_name || 'System / Unknown'}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                        <Hash className="h-3 w-3" />{selectedLog.moderator_id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedLog.target ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Target user</p>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar
                        url={selectedLog.target.avatar_url}
                        name={selectedLog.target.full_name}
                        fallback="U"
                        className="h-9 w-9 rounded-full border border-gray-200 bg-gray-100 text-xs text-gray-600"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{selectedLog.target.full_name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                          <Hash className="h-3 w-3" />{selectedLog.target_user_id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-3.5 text-xs text-gray-400">
                    No specific target user
                  </div>
                )}
              </section>

              <section>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Action details</h4>
                <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed">
                  {(() => {
                    const details = selectedLog.details;
                    if (!details) return <span className="text-gray-400 italic">No additional details were provided.</span>;
                    if (details.includes('. Notes: ')) {
                      const parts = details.split('. Notes: ');
                      const summary = parts[0];
                      const notes = parts.slice(1).join('. Notes: ');
                      return (
                        <div className="space-y-3">
                          <div>
                            <span className="mb-1 block text-[11px] font-medium text-gray-500">System summary</span>
                            <p className="font-semibold text-gray-900">{summary}</p>
                          </div>
                          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                            <span className="mb-1 block text-[11px] font-medium text-amber-600">Moderator remarks</span>
                            <p className="italic text-amber-900">&quot;{notes}&quot;</p>
                          </div>
                        </div>
                      );
                    }
                    return <p className="font-medium text-gray-900">{details}</p>;
                  })()}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">System metadata</h4>
                <dl className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <dt className="font-medium text-gray-500">Log record ID</dt>
                    <dd className="max-w-full break-all rounded bg-gray-200/70 px-2 py-1 font-mono text-gray-600">{selectedLog.id}</dd>
                  </div>
                  {selectedLog.reference_id && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <dt className="font-medium text-gray-500">Reference (Ticket/Session)</dt>
                      <dd className="max-w-full break-all rounded bg-gray-200/70 px-2 py-1 font-mono text-gray-600">{selectedLog.reference_id}</dd>
                    </div>
                  )}
                  {sessionLengths[selectedLog.id] != null && (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <dt className="font-medium text-gray-500">Recorded session length</dt>
                      <dd className="font-semibold text-gray-800">{formatDuration(sessionLengths[selectedLog.id])}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
              <button
                onClick={() => setSelectedLog(null)}
                className={`rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}
              >
                Close record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}