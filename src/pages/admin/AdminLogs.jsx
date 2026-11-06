import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useCallback, useEffect, useMemo, useState } from 'react';
import supabase from '../../supabaseClient';
import {
  ArrowLeftRight,
  Ban,
  CheckCircle,
  Clock,
  Coins,
  FileText,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

// ── ACTION TYPE STYLES ──
// `accent` is the colored left edge on full entries.
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
  'SWITCH_ROLE': {
    label: 'Switched to User Mode',
    icon: ArrowLeftRight,
    color: 'text-blue-800',
    bg: 'bg-blue-50 border-blue-200',
    accent: 'border-l-blue-500'
  },
  'ROLE_CHANGE': {
    label: 'Role Changed',
    icon: UserCog,
    color: 'text-blue-800',
    bg: 'bg-blue-50 border-blue-200',
    accent: 'border-l-blue-500'
  },
  'CREDIT_ADJUST': {
    label: 'Credits Adjusted',
    icon: Coins,
    color: 'text-amber-800',
    bg: 'bg-amber-50 border-amber-200',
    accent: 'border-l-amber-500'
  },
  'ACCOUNT_STATUS': {
    label: 'Account Status Changed',
    icon: Ban,
    color: 'text-orange-800',
    bg: 'bg-orange-50 border-orange-200',
    accent: 'border-l-orange-500'
  },
  'ENFORCE_BAN': {
    label: 'Ban Enforced',
    icon: Ban,
    color: 'text-rose-800',
    bg: 'bg-rose-50 border-rose-200',
    accent: 'border-l-rose-500'
  },
  'RESOLVE_ESCALATION': {
    label: 'Resolved Escalation',
    icon: CheckCircle,
    color: 'text-emerald-800',
    bg: 'bg-emerald-50 border-emerald-200',
    accent: 'border-l-emerald-500'
  },
  'DEFAULT': {
    label: 'System Action',
    icon: ShieldCheck,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
    accent: 'border-l-gray-400'
  }
};

// Display-only: "SOME_ACTION" -> "Some action", used as the label for action types without a style above.
const humanizeAction = (value) => {
  const text = String(value || '').replace(/_/g, ' ').trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'System Action';
};

const getActionMeta = (type) => ACTION_META[type] || { ...ACTION_META['DEFAULT'], label: humanizeAction(type) };

// Display-only: the filter chips.
const FILTERS = [
  { id: 'ALL', label: 'All actions' },
  { id: 'SYSTEM_LOGIN', label: 'Logins' },
  { id: 'SYSTEM_LOGOUT', label: 'Logouts' },
  { id: 'ROLE_CHANGE', label: 'Role changes' },
  { id: 'CREDIT_ADJUST', label: 'Credit adjustments' },
  { id: 'ENFORCE_BAN', label: 'Bans' },
  { id: 'RESOLVE_ESCALATION', label: 'Escalations resolved' },
  { id: 'SWITCH_ROLE', label: 'Mode switches' },
];

// Display-only: first segment of an id, e.g. "3f9a2c1e-..." -> "3f9a2c1e".
const shortId = (value) => String(value || '').split('-')[0];

// Display-only: avatar image with an initial as fallback.
function Avatar({ url, name, fallback, className }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden font-semibold ${className}`}>
      {url
        ? <img src={url} alt="" className="h-full w-full object-cover" />
        : name?.trim()?.charAt(0)?.toUpperCase() || fallback}
    </span>
  );
}

// Looking up profiles in small batches keeps the request URL short.
const PROFILE_BATCH_SIZE = 100;

const formatDate = value => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(date);
};

// Display-only: "Today", "Yesterday", or a full date for a day heading.
const getDayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

// Display-only: 135 minutes -> "2h 15m".
const formatDuration = (ms) => {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'under 1 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

// Display-only: shared timeline geometry. The rail column is 32px wide, so its centre line sits at 16px.
const RAIL_ROW = 'grid grid-cols-[32px_minmax(0,1fr)] gap-x-4';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [profiles, setProfiles] = useState({});

  // ── PANEL STATE ──
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    // Add escape key listener to close the panel
    const handleEscape = (event) => {
      if (event.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setErrorMessage('Could not load audit logs. Please try again.');

    // Look up the people named in these logs. If this fails, the logs still show (with short IDs).
    const profileMap = {};
    try {
      const ids = [...new Set((data || []).flatMap(log => [log.admin_id, log.target_user_id]).filter(Boolean))];
      for (let start = 0; start < ids.length; start += PROFILE_BATCH_SIZE) {
        const { data: people } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url, role')
          .in('id', ids.slice(start, start + PROFILE_BATCH_SIZE));
        (people || []).forEach(person => { profileMap[person.id] = person; });
      }
    } catch (profileError) {
      console.error('Unable to load profiles for audit logs:', profileError);
    }

    setProfiles(profileMap);
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useRealtimeRefresh(fetchLogs, ['admin_logs'], 'web_refresh_admin_logs');

  // ── FILTERING LOGIC ──
  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter(log => {
      const matchSearch = !query
        || String(log.action_type || '').toLowerCase().includes(query)
        || String(log.details || '').toLowerCase().includes(query)
        || String(log.id || '').toLowerCase().includes(query)
        || String(profiles[log.admin_id]?.full_name || '').toLowerCase().includes(query)
        || String(profiles[log.target_user_id]?.full_name || '').toLowerCase().includes(query);

      const matchAction = filterAction === 'ALL' || log.action_type === filterAction;

      return matchSearch && matchAction;
    });
  }, [logs, searchQuery, filterAction, profiles]);

  // ── Display-only: chip counts, day grouping, and session lengths ──
  const actionCounts = useMemo(() => {
    const counts = { ALL: logs.length };
    logs.forEach(log => { counts[log.action_type] = (counts[log.action_type] || 0) + 1; });
    return counts;
  }, [logs]);

  const groupedByDay = useMemo(() => {
    const groups = [];
    filteredLogs.forEach(log => {
      const date = new Date(log.created_at);
      const valid = Boolean(log.created_at) && !Number.isNaN(date.getTime());
      const key = valid ? date.toDateString() : 'unknown';
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(log);
      else groups.push({ key, label: valid ? getDayLabel(date) : 'Date unavailable', items: [log] });
    });
    return groups;
  }, [filteredLogs]);

  // Each sign-out is matched with that admin's most recent sign-in to show how long the session lasted.
  const sessionLengths = useMemo(() => {
    const lengths = {};
    const openSignIn = {};
    [...logs].reverse().forEach(log => {
      if (log.action_type === 'SYSTEM_LOGIN') {
        openSignIn[log.admin_id] = log.created_at;
      } else if (log.action_type === 'SYSTEM_LOGOUT' && openSignIn[log.admin_id]) {
        lengths[log.id] = new Date(log.created_at) - new Date(openSignIn[log.admin_id]);
        delete openSignIn[log.admin_id];
      }
    });
    return lengths;
  }, [logs]);

  const selectedMeta = selectedLog ? getActionMeta(selectedLog.action_type) : null;
  const SelectedIcon = selectedMeta?.icon;

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Audit logs</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            {loading
              ? 'Loading the latest actions…'
              : 'Everything the admin team has done, newest first. Select an entry to see the full record.'}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 sm:self-auto ${FOCUS_RING}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {loading ? 'Loading logs' : 'Refresh logs'}
        </button>
      </div>

      {/* ── SEARCH + FILTER CHIPS ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:max-w-md">
            <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by admin, user, or details"
              aria-label="Search audit logs"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="rounded p-0.5 text-gray-300 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          {!loading && (
            <p className="text-xs text-gray-500" role="status">
              Showing <span className="font-semibold tabular-nums text-gray-900">{filteredLogs.length}</span> of <span className="tabular-nums">{logs.length}</span> actions
            </p>
          )}
        </div>

        <div role="group" aria-label="Filter by action" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map(f => {
            const isActive = filterAction === f.id;
            return (
              <button
                key={f.id}
                type="button"
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
                  {loading ? '—' : (actionCounts[f.id] || 0)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{errorMessage}</span>
          <button type="button" onClick={fetchLogs} className={`rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-800 ${FOCUS_RING}`}>Try again</button>
        </div>
      )}

      {/* ── ACTIVITY TIMELINE ── */}
      {loading ? (
        // Mirrors the real layout so nothing jumps when data arrives
        <div className="relative animate-pulse" role="status" aria-busy="true" aria-label="Loading audit logs">
          <span className="absolute bottom-0 left-4 top-3 w-px -translate-x-1/2 bg-gray-200" aria-hidden="true" />

          <div className={`relative mb-3 items-center ${RAIL_ROW}`} aria-hidden="true">
            <span className="flex justify-center"><span className="h-2.5 w-2.5 rounded-full bg-gray-300 ring-4 ring-[#faf9f6]" /></span>
            <span className="h-4 w-28 rounded bg-gray-200" />
          </div>

          <div className="space-y-3" aria-hidden="true">
            <div className={RAIL_ROW}>
              <span className="flex justify-center pt-[11px]"><span className="h-8 w-8 rounded-full bg-gray-200 ring-4 ring-[#faf9f6]" /></span>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="h-4 w-32 rounded bg-gray-200" />
                  <span className="h-3 w-24 rounded bg-gray-100" />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[0, 1].map(i => (
                    <span key={i} className="flex items-center gap-2.5">
                      <span className="h-8 w-8 rounded-full bg-gray-100" />
                      <span className="space-y-1.5">
                        <span className="block h-2.5 w-16 rounded bg-gray-100" />
                        <span className="block h-3 w-28 rounded bg-gray-200" />
                      </span>
                    </span>
                  ))}
                </div>
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                  <span className="block h-3 w-3/4 rounded bg-gray-100" />
                  <span className="block h-3 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
            </div>

            {[0, 1].map(n => (
              <div key={n} className={RAIL_ROW}>
                <span className="flex justify-center pt-[11px]"><span className="h-8 w-8 rounded-full bg-gray-200 ring-4 ring-[#faf9f6]" /></span>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="h-4 w-32 rounded bg-gray-200" />
                    <span className="h-3 w-24 rounded bg-gray-100" />
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-full bg-gray-100" />
                    <span className="space-y-1.5">
                      <span className="block h-2.5 w-16 rounded bg-gray-100" />
                      <span className="block h-3 w-28 rounded bg-gray-200" />
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <span className="block h-3 w-2/3 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
            <FileText className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-gray-900">{logs.length ? 'No logs found' : 'No audit logs recorded'}</p>
          <p className="mt-1 text-xs text-gray-500">{logs.length ? 'Try adjusting your search or filter settings.' : 'Administrative actions will appear here.'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDay.map(group => (
            <section key={group.key} aria-label={group.label}>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-[#faf9f6]" />
                <h2 className="text-sm font-bold text-gray-900">{group.label}</h2>
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-xs tabular-nums text-gray-400">{group.items.length}</span>
              </div>
              <ol className="relative space-y-3 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-gray-200">
                {group.items.map(log => {
                  const meta = getActionMeta(log.action_type);
                  const ActionIcon = meta.icon;
                  const dateTime = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const adminName = log.admin_id
                    ? profiles[log.admin_id]?.full_name || `Unknown admin #${shortId(log.admin_id)}`
                    : 'System';
                  const targetName = log.target_user_id
                    ? profiles[log.target_user_id]?.full_name || `Unknown user #${shortId(log.target_user_id)}`
                    : null;
                  return (
                    <li key={log.id} className="relative pl-10">
                      <span className={`absolute left-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#faf9f6] ${meta.bg} ${meta.color}`}><ActionIcon className="h-4 w-4" /></span>
                      <button type="button" onClick={() => setSelectedLog(log)} className={`group w-full rounded-2xl border border-gray-200 border-l-4 bg-white p-4 text-left shadow-sm transition hover:shadow-md ${meta.accent} ${FOCUS_RING}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-bold ${meta.color}`}>{meta.label}</p>
                            <p className="mt-1 text-xs text-gray-500">{adminName}{targetName ? ` acted on ${targetName}` : ''}</p>
                          </div>
                          <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium tabular-nums text-gray-500">{dateTime}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-600">{log.details || 'No additional details provided.'}</p>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 transition-colors group-hover:text-emerald-700">View record <span aria-hidden="true">→</span></span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      {/* ── CENTERED ADMIN RECORD MODAL ── */}
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
            onClick={event => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${selectedMeta.bg} ${selectedMeta.color}`}>
                  <SelectedIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Admin record</p>
                  <h3 id="log-details-title" className={`truncate text-base font-bold ${selectedMeta.color}`}>{selectedMeta.label}</h3>
                  <p className="text-xs tabular-nums text-gray-500">{formatDate(selectedLog.created_at)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Close"
                className={`shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ${FOCUS_RING}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {(selectedLog.admin_id || selectedLog.target_user_id) && (
                <section aria-label="People involved" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedLog.admin_id ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Executed by</p>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          url={profiles[selectedLog.admin_id]?.avatar_url}
                          name={profiles[selectedLog.admin_id]?.full_name}
                          fallback="A"
                          className="h-9 w-9 rounded-full border border-emerald-200 bg-emerald-100 text-xs text-emerald-800"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{profiles[selectedLog.admin_id]?.full_name || `Unknown admin #${shortId(selectedLog.admin_id)}`}</p>
                          {profiles[selectedLog.admin_id]?.role && profiles[selectedLog.admin_id].role.toLowerCase() !== String(profiles[selectedLog.admin_id]?.full_name || '').trim().toLowerCase() && (
                            <p className="mt-0.5 truncate text-[11px] text-gray-500">{profiles[selectedLog.admin_id].role}</p>
                          )}
                          <p className="mt-0.5 text-[11px] tabular-nums text-gray-400">#{shortId(selectedLog.admin_id)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {selectedLog.target_user_id ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Target user</p>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          url={profiles[selectedLog.target_user_id]?.avatar_url}
                          name={profiles[selectedLog.target_user_id]?.full_name}
                          fallback="U"
                          className="h-9 w-9 rounded-full border border-gray-200 bg-gray-100 text-xs text-gray-600"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{profiles[selectedLog.target_user_id]?.full_name || `Unknown user #${shortId(selectedLog.target_user_id)}`}</p>
                          <p className="mt-0.5 text-[11px] tabular-nums text-gray-400">#{shortId(selectedLog.target_user_id)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>
              )}

              <section>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Action details</h4>
                <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed">
                  {(() => {
                    const details = selectedLog.details;
                    if (!details) return <span className="text-gray-400 italic">No additional details were provided for this action.</span>;
                    if (details.includes('. Notes: ')) {
                      const parts = details.split('. Notes: ');
                      const summary = parts[0];
                      const notes = parts.slice(1).join('. Notes: ');
                      return (
                        <div className="space-y-3">
                          <div>
                            <span className="mb-1 block text-[11px] font-medium text-gray-500">Action summary</span>
                            <p className="font-semibold text-gray-900">{summary}</p>
                          </div>
                          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <span className="mb-1 block text-[11px] font-medium text-gray-500">Admin remarks</span>
                            <p className="italic text-gray-900">&quot;{notes}&quot;</p>
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
                    <dt className="font-medium text-gray-500">Record ID</dt>
                    <dd className="max-w-full break-all rounded bg-gray-200/70 px-2 py-1 font-mono text-gray-600">{selectedLog.id}</dd>
                  </div>
                  {sessionLengths[selectedLog.id] != null && (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <dt className="font-medium text-gray-500">Session length</dt>
                      <dd className="font-semibold text-gray-800">{formatDuration(sessionLengths[selectedLog.id])}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-3.5 sm:px-5">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className={`w-full rounded-xl bg-emerald-700 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}
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