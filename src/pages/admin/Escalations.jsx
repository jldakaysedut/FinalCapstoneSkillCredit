import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import supabase from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShieldCheck, UploadCloud, X, CalendarDays,
  MessageSquareOff, AlertTriangle, Clock, Scale, ArrowRight,
  Ban, RefreshCw, ShieldAlert
} from 'lucide-react';

// The audit trail records where the most recent ban was applied; case status is separate.
const auditBanSource = log => {
  const details = log?.details || '';
  if (details.includes('UNBANNED user:')) return null;
  if (details.includes('BANNED user:') && details.includes('Source: User Management')) return 'User Management';
  if (details.includes('Admin enforced permanent ban on') && details.includes('Source: Admin Escalations')) return 'Admin Escalations';
  return undefined;
};

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

const relation = value => Array.isArray(value) ? value[0] : value;

const getTargetUser = item => {
  // Escalations are genuine moderator cases linked through repeat_offenders.
  const offender = relation(item?.repeat_offender);
  return relation(offender?.user_profiles) || null;
};

export default function Escalations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [escalations, setEscalations] = useState([]);
  const [banSources, setBanSources] = useState({});
  const [lastBanLifts, setLastBanLifts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const latestFetch = useRef(0);

  const [activeTabFilter, setActiveTabFilter] = useState('ALL'); // 'ALL', 'pending', 'admin_banned'
  const [manageModal, setManageModal] = useState({ isOpen: false, item: null });
  const [historyModal, setHistoryModal] = useState({ isOpen: false, user: null, logs: [], loading: false });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, item: null, note: '', action: 'ban' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState('');

  // An escalation is an actual moderator-submitted case, not a direct admin ban.
  // The account's live restriction still comes from user_profiles.is_banned; historical decisions stay in case status.
  const fetchEscalations = useCallback(async (quiet = false) => {
    const request = ++latestFetch.current;
    if (!quiet) setLoading(true);

    const { data, error } = await supabase
      .from('admin_escalations')
      .select(`
        id, status, created_at, updated_at, repeat_offender_id,
        moderator_id, admin_id,
        repeat_offender:repeat_offenders(
          id, user_id,
          user_profiles:user_id(id, full_name, avatar_url, role, is_banned, violation_count)
        ),
        moderator:user_profiles!admin_escalations_moderator_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (request !== latestFetch.current) return;
    if (error) {
      console.error('Could not load admin escalations:', error);
      setNotice('Could not load escalation records. Check admin read permissions and try again.');
    } else {
      setEscalations(data || []);
      // Read audit notes for historical bans too, even after the account is active.
      const ids = [...new Set((data || []).map(getTargetUser).filter(user => user?.id).map(user => user.id))];
      const origins = {};
      const lifts = {};
      for (let index = 0; index < ids.length; index += 100) {
        const { data: logs, error: logsError } = await supabase.from('admin_logs')
          .select('target_user_id, details, created_at')
          .in('target_user_id', ids.slice(index, index + 100))
          .in('action_type', ['ACCOUNT_STATUS', 'ENFORCE_BAN'])
          .order('created_at', { ascending: false });
        if (logsError) {
          console.warn('Could not load ban origin notes:', logsError);
          continue;
        }
        for (const log of logs || []) {
          // Logs are newest-first. A lift counts as the latest action only if
          // there is no newer recorded ban for that account.
          const source = auditBanSource(log);
          if (source === null && !Object.prototype.hasOwnProperty.call(lifts, log.target_user_id)) {
            lifts[log.target_user_id] = { lifted: true, source: 'User Management', at: log.created_at };
          } else if (source && !Object.prototype.hasOwnProperty.call(lifts, log.target_user_id)) {
            lifts[log.target_user_id] = { lifted: false };
          }
          if (source && !origins[log.target_user_id]) origins[log.target_user_id] = source;
        }
      }
      if (request === latestFetch.current) {
        setBanSources(origins);
        setLastBanLifts(lifts);
      }
    }
    if (request === latestFetch.current) setLoading(false);
  }, []);

  useEffect(() => {
    fetchEscalations();

    // Existing subscriptions: escalation records and the shared account ban status.
    // No new database publications or tables are required.
    const refresh = () => fetchEscalations(true);
    const channel = supabase
      .channel('admin_escalations_existing_tables_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_escalations' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' }, refresh)
      .subscribe();
    window.addEventListener('focus', refresh);
    const refreshOnVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', refreshOnVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
      supabase.removeChannel(channel);
    };
  }, [fetchEscalations]);

  // Open Active Reports History modal
  const handleOpenHistoryModal = async (targetUser) => {
    setManageModal({ isOpen: false, item: null });
    setHistoryModal({ isOpen: true, user: targetUser, logs: [], loading: true });

    if (targetUser?.id) {
      const { data, error } = await supabase
        .from('reports')
        .select('id, created_at, reason, details, status, reference_type')
        .eq('reported_user_id', targetUser.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHistoryModal({ isOpen: true, user: targetUser, logs: data, loading: false });
      } else {
        setHistoryModal(prev => ({ ...prev, loading: false }));
      }
    } else {
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  // No database migration: use the existing moderator case, account status and audit log.
  // These are separate client writes, so a partial failure is surfaced for review.
  // Admin Escalations enforces ban decisions. Lift Ban is centralized in User Management.
  // All pending moderator ban-review cases for the same account share the decision.
  const confirmBan = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const item = confirmModal.item;
    const targetUser = getTargetUser(item);
    if (!targetUser?.id) {
      setNotice('Target user ID not found.');
      setIsProcessing(false);
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminId = authData?.user?.id;
      if (!adminId) throw new Error('Admin session expired. Please log in again.');
      const { data: refreshed, error: userReadError } = await supabase.from('user_profiles')
        .select('id, is_banned').eq('id', targetUser.id).single();
      if (userReadError) throw userReadError;
      if (refreshed.is_banned) throw new Error('Account is already banned. Use User Management to manage this ban.');
      if (item.status !== 'pending') throw new Error('Only pending escalations can enforce a ban.');

      // Preflight linked escalations to avoid applying a ban if cases are unreadable.
      const { data: pendingCases, error: casesReadError } = await supabase.from('admin_escalations')
        .select('id, repeat_offender:repeat_offenders!inner(user_id)')
        .eq('status', 'pending').eq('repeat_offender.user_id', targetUser.id);
      if (casesReadError) throw casesReadError;
      if (!(pendingCases || []).some(record => record.id === item.id)) {
        throw new Error('This escalation changed since it was opened. Reopen the record and try again.');
      }

      const { data: updated, error: updateError } = await supabase.from('user_profiles')
        .update({ is_banned: true }).eq('id', targetUser.id).eq('is_banned', false).select('id');
      if (updateError || !updated?.length) throw updateError || new Error('Account status changed. Please refresh and review.');

      // Updating genuine existing cases only: no new escalation records or schema changes.
      const { data: markedCases, error: caseUpdateError } = await supabase.from('admin_escalations')
        .update({ status: 'admin_banned', admin_id: adminId, updated_at: new Date().toISOString() })
        .in('id', pendingCases.map(record => record.id)).eq('status', 'pending').select('id');
      const caseSyncError = caseUpdateError || ((markedCases || []).length !== pendingCases.length
        ? new Error('Some pending cases were not marked Admin Banned.') : null);

      const { error: auditError } = await supabase.from('admin_logs').insert({
        admin_id: adminId, target_user_id: targetUser.id, action_type: 'ENFORCE_BAN',
        details: `Admin enforced permanent ban on ${targetUser.full_name || targetUser.id} | Source: Admin Escalations | Notes: ${confirmModal.note.trim() || 'No notes provided'}`,
      });
      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: targetUser.id,
        type: 'account_banned',
        content: 'Your account has been permanently banned by an Administrator following escalation review.',
      });
      if (notifyError) console.warn('Ban updated, notification failed:', notifyError);

      if (caseSyncError || auditError) {
        console.warn('Ban applied, but a related write was incomplete:', { caseSyncError, auditError });
        setNotice('Account is banned, but some escalation/audit records did not synchronize. Please review the cases.');
      } else {
        setNotice(`${targetUser.full_name} is banned. ${pendingCases.length} linked escalation(s) marked Admin Banned. User Management will sync automatically.`);
      }
      setConfirmModal({ isOpen: false, item: null, note: '', action: 'ban' });
      setManageModal({ isOpen: false, item: null });
      await fetchEscalations(true);
    } catch (err) {
      console.error('Error changing account ban:', err);
      setNotice(`Could not ban this user. ${err.message}`);
      await fetchEscalations(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Summary counts refer only to genuine moderator escalation cases.
  const stats = useMemo(() => {
    const total = escalations.length;
    const pending = escalations.filter(e => e.status === 'pending').length;
    // This category tracks historical ban decisions, including lifted bans.
    const banned = escalations.filter(e => e.status === 'admin_banned').length;

    return { total, pending, banned };
  }, [escalations]);

  // Filtered escalations list
  const filteredEscalations = useMemo(() => {
    return escalations.filter(item => {
      if (activeTabFilter === 'admin_banned' && item.status !== 'admin_banned') return false;
      if (activeTabFilter === 'pending' && item.status !== 'pending') return false;

      const targetUser = getTargetUser(item);
      const modUser = relation(item.moderator);
      const query = searchQuery.toLowerCase();

      const userName = targetUser?.full_name?.toLowerCase() || '';
      const modName = modUser?.full_name?.toLowerCase() || '';
      const itemId = item.id.toLowerCase();
      const sourceName = 'moderator escalation';

      return userName.includes(query) || modName.includes(query) || itemId.includes(query) || sourceName.includes(query);
    });
  }, [escalations, searchQuery, activeTabFilter]);

  // Active reports formatting
  const validHistoryLogs = historyModal.logs
    .filter(log => !log.details?.toUpperCase().includes('DISMISS'))
    .sort((a, b) => {
      const isAEscape = a.reason === 'Repeat Offender Threshold Reached';
      const isBEscape = b.reason === 'Repeat Offender Threshold Reached';
      if (isAEscape && !isBEscape) return -1;
      if (!isAEscape && isBEscape) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const strikeReportsCount = validHistoryLogs.filter(
    log => log.reason !== 'Repeat Offender Threshold Reached'
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-gray-700">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Admin Escalations</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Review cases escalated by moderators. Direct User Management bans are tracked in Admin Logs, not added as escalation cases.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchEscalations()}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60 sm:self-auto ${FOCUS_RING}`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {loading ? 'Refreshing' : 'Refresh queue'}
        </button>
      </div>

      {/* ── NOTICE ALERT ── */}
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 animate-in fade-in">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice" className="shrink-0 rounded-md p-0.5 text-emerald-700 hover:bg-emerald-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setActiveTabFilter('ALL')}
          className={`rounded-2xl border p-5 text-left transition-all ${FOCUS_RING} ${
            activeTabFilter === 'ALL'
              ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <p className={`text-[13px] font-semibold ${activeTabFilter === 'ALL' ? 'text-emerald-800' : 'text-gray-600'}`}>All Escalations</p>
          <p className={`mt-2 text-3xl font-bold ${activeTabFilter === 'ALL' ? 'text-emerald-900' : 'text-gray-900'}`}>{stats.total}</p>
          <p className={`mt-1 text-xs ${activeTabFilter === 'ALL' ? 'text-emerald-700' : 'text-gray-500'}`}>Genuine moderator escalation cases only</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabFilter('pending')}
          className={`rounded-2xl border p-5 text-left transition-all ${FOCUS_RING} ${
            activeTabFilter === 'pending'
              ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <p className={`text-[13px] font-semibold ${activeTabFilter === 'pending' ? 'text-emerald-800' : 'text-gray-600'}`}>Pending Review</p>
          <p className={`mt-2 text-3xl font-bold ${activeTabFilter === 'pending' ? 'text-emerald-900' : 'text-gray-900'}`}>{stats.pending}</p>
          <p className={`mt-1 text-xs ${activeTabFilter === 'pending' ? 'text-emerald-700' : 'text-gray-500'}`}>Awaiting admin review</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabFilter('admin_banned')}
          className={`rounded-2xl border p-5 text-left transition-all ${FOCUS_RING} ${
            activeTabFilter === 'admin_banned'
              ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <p className={`text-[13px] font-semibold ${activeTabFilter === 'admin_banned' ? 'text-emerald-800' : 'text-gray-600'}`}>Admin Banned</p>
          <p className={`mt-2 text-3xl font-bold ${activeTabFilter === 'admin_banned' ? 'text-emerald-900' : 'text-gray-900'}`}>{stats.banned}</p>
          <p className={`mt-1 text-xs ${activeTabFilter === 'admin_banned' ? 'text-emerald-700' : 'text-gray-500'}`}>Recorded admin ban decisions (including lifted bans)</p>
        </button>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:max-w-md">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search user, case ID, or moderator"
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
        {!loading && (
          <div className="flex items-center gap-3">
            {activeTabFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setActiveTabFilter('ALL')}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Reset filter ({activeTabFilter.toLowerCase()})
              </button>
            )}
            <p className="text-xs text-gray-500" role="status">
              Showing <span className="font-semibold tabular-nums text-gray-900">{filteredEscalations.length}</span> of <span className="tabular-nums">{escalations.length}</span> records
            </p>
          </div>
        )}
      </div>

      {/* ── TABLE LAYOUT ── */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Offender</th>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Policy Strikes</th>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Queue Status</th>
              <th scope="col" className="px-6 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-sm text-gray-500 animate-pulse">
                  Loading escalations queue...
                </td>
              </tr>
            ) : filteredEscalations.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-16 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">No escalation tickets match this filter</p>
                  <p className="mt-1 text-xs text-gray-500">Try switching your view above or clearing your search.</p>
                </td>
              </tr>
            ) : (
              filteredEscalations.map(item => {
                const targetUser = getTargetUser(item);
                const isBanned = Boolean(targetUser?.is_banned);

                return (
                  <tr key={item.id} className="relative hover:bg-gray-50/50 transition-colors">
                    <td className={`px-6 py-4 whitespace-nowrap border-l-4 ${isBanned ? 'border-l-rose-500' : 'border-l-amber-400'}`}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-bold text-gray-500 uppercase border border-gray-200">
                          {targetUser?.avatar_url ? (
                            <img src={targetUser.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            targetUser?.full_name?.charAt(0) || 'U'
                          )}
                        </span>
                        <div>
                          <p className="text-[15px] font-bold text-gray-900">{targetUser?.full_name || 'Unknown User'}</p>
                          <p className="mt-0.5 text-[11px] text-gray-500">
                            Moderator Escalation
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                              {targetUser?.role || 'User'}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">#{targetUser?.id ? targetUser.id.split('-')[0] : item.id.split('-')[0]}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true"></span>
                        {targetUser?.violation_count || 0} Strikes
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-800">
                          <Ban className="h-3.5 w-3.5" /> {item.status === 'pending' ? 'Account Banned · Case Pending' : item.status === 'admin_banned' ? 'Admin Banned' : 'Account Banned · Case Resolved'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          <UploadCloud className="h-3.5 w-3.5 text-amber-600" /> {item.status === 'resolved' ? 'Resolved · Active' : item.status === 'admin_banned' ? 'Admin Banned · Now Active' : 'Pending Review'}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setManageModal({ isOpen: true, item })}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold shadow-sm transition ${
                          !isBanned
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                        } ${FOCUS_RING}`}
                      >
                        {isBanned || item.status !== 'pending' ? 'View record' : 'Manage user'} <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── UNIFIED MANAGE MODAL (Without Resolve button) ── */}
      {manageModal.isOpen && manageModal.item && (() => {
        const item = escalations.find(row => row.id === manageModal.item.id) || manageModal.item;
        const targetUser = getTargetUser(item);
        if (!targetUser) return null;

        const isBanned = Boolean(targetUser.is_banned);

        return (
          <div
            role="dialog"
            className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && setManageModal({ isOpen: false, item: null })}
          >
            <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setManageModal({ isOpen: false, item: null })}
                className="absolute right-4 top-4 p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center mt-4">
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xl font-bold text-emerald-800 border border-emerald-200 shadow-sm">
                  {targetUser.avatar_url ? (
                    <img src={targetUser.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    targetUser.full_name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </span>
                <h3 className="mt-3 text-lg font-bold text-gray-900">{targetUser.full_name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mt-1 flex items-center justify-center gap-1.5">
                  <span>{targetUser.role || 'User'}</span>
                  <span className="text-gray-300">•</span>
                  <span className="font-mono text-gray-400">#{targetUser.id.split('-')[0]}</span>
                </p>

                <div className="mt-5 w-full rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3 text-left">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Policy Strikes:</span>
                    <span className="font-bold text-rose-600 px-2 py-0.5 bg-rose-100 rounded-md">{targetUser.violation_count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-gray-500 font-medium">Account Status:</span>
                    <span className={`font-semibold ${isBanned ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {isBanned ? 'Banned' : 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-gray-500 font-medium">Original Admin Decision:</span>
                    <span className={`font-semibold text-right ${item.status === 'admin_banned' ? 'text-rose-700' : 'text-gray-900'}`}>
                      {item.status === 'admin_banned' ? 'Admin Banned' : item.status === 'resolved' ? 'Resolved' : 'Pending Review'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-gray-500 font-medium">Case Origin:</span>
                    <span className="font-semibold text-gray-900 text-right">Moderator Escalation</span>
                  </div>
                  {isBanned && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs leading-5 text-emerald-900">
                      {banSources[targetUser.id] === 'User Management'
                        ? 'Ban decision applied through User Management. This existing escalation was linked to that decision; no extra case was created.'
                        : banSources[targetUser.id] === 'Admin Escalations'
                          ? 'Ban decision applied through Admin Escalations.'
                          : 'This account is banned. The origin of its current ban could not be verified from the audit log.'}
                    </p>
                  )}
                  {!isBanned && item.status === 'admin_banned' && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs leading-5 text-emerald-900">
                      The account is Active, but the original Admin Banned decision stays in this escalation history.
                      {lastBanLifts[targetUser.id]?.lifted
                        ? ` Latest recorded action: ban lifted via ${lastBanLifts[targetUser.id].source}${lastBanLifts[targetUser.id].at ? ` on ${new Date(lastBanLifts[targetUser.id].at).toLocaleString()}` : ''}.`
                        : ' No verified lift action is available in accessible Admin Logs.'}
                    </p>
                  )}
                  {isBanned && item.status === 'pending' && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                      Account is banned but this case is still pending. Please review the case synchronization before making another decision.
                    </p>
                  )}
                  <p className="text-xs text-gray-500"><strong>Record date:</strong> {item.created_at ? new Date(item.created_at).toLocaleString() : 'Not recorded'}</p>
                </div>

                <div className="mt-6 w-full flex flex-col gap-2 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => handleOpenHistoryModal(targetUser)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 text-[13px] font-semibold text-gray-700 hover:bg-gray-200 transition"
                  >
                    <Clock className="h-4 w-4" /> View Active Reports
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManageModal({ isOpen: false, item: null });
                      if (isBanned) navigate('/admin/users');
                      else setConfirmModal({ isOpen: true, item, note: '', action: 'ban' });
                    }}
                    disabled={!isBanned && item.status !== 'pending'}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition ${
                      isBanned
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : item.status !== 'pending'
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <Ban className="h-4 w-4" /> {isBanned ? 'Lift Ban in User Management' : item.status !== 'pending' ? 'Record Resolved' : 'Enforce Permanent Ban'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ACTIVE REPORT HISTORY MODAL ── */}
      {historyModal.isOpen && historyModal.user && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setHistoryModal({ isOpen: false, user: null, logs: [], loading: false })}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">Active Report History</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{historyModal.user.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, user: null, logs: [], loading: false })}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {historyModal.loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500 text-sm font-medium animate-pulse">
                  Loading report records...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-1 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-700 mb-1">
                        <MessageSquareOff className="h-4 w-4" />
                        <p className="text-[11px] font-bold uppercase tracking-wider">Total Reports</p>
                      </div>
                      <p className="text-3xl font-black text-amber-900">
                        {strikeReportsCount.length}
                      </p>
                      <p className="text-[10px] font-medium text-amber-700 mt-1 leading-tight">filed against this user</p>
                    </div>

                    <div className="flex-1 bg-purple-50 border border-purple-200 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-purple-700 mb-1">
                        <Scale className="h-4 w-4" />
                        <p className="text-[11px] font-bold uppercase tracking-wider">Session Disputes</p>
                      </div>
                      <p className="text-3xl font-black text-purple-900">
                        {strikeReportsCount.filter(l => l.reference_type?.toLowerCase().includes('session') || l.reference_type?.toLowerCase().includes('booking')).length}
                      </p>
                      <p className="text-[10px] font-medium text-purple-700 mt-1 leading-tight">booking or escrow issues</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Associated Reports</h4>
                    {validHistoryLogs.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No active reports found for this user.</p>
                    ) : (
                      <div className="space-y-3">
                        {validHistoryLogs.map(log => {
                          const isEscalationTicket = log.reason === 'Repeat Offender Threshold Reached';
                          const isDispute = log.reference_type?.toLowerCase().includes('session') || log.reference_type?.toLowerCase().includes('booking');
                          const isCommunity = !isDispute && !isEscalationTicket;

                          let style = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', icon: ShieldAlert, iconColor: 'text-gray-500' };

                          if (isEscalationTicket) style = { bg: 'bg-rose-50/70', border: 'border-rose-300', text: 'text-rose-950', icon: UploadCloud, iconColor: 'text-rose-600' };
                          else if (isCommunity) style = { bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-900', icon: AlertTriangle, iconColor: 'text-amber-600' };
                          else if (isDispute) style = { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-900', icon: Scale, iconColor: 'text-purple-600' };

                          const IconToUse = style.icon;

                          return (
                            <div key={log.id} className={`p-3.5 rounded-xl border ${style.border} ${style.bg} ${isEscalationTicket ? 'ring-2 ring-rose-400/30' : ''}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <IconToUse className={`h-3.5 w-3.5 ${style.iconColor}`} />
                                  <span className={`text-xs font-bold ${style.text}`}>{log.reason || 'User Report'}</span>
                                  {isEscalationTicket && (
                                    <span className="ml-1.5 rounded bg-rose-200 px-1.5 py-0.2 text-[10px] font-extrabold text-rose-800 uppercase">Master Ticket</span>
                                  )}
                                </div>
                                <span className="text-[10px] font-medium text-gray-500">
                                  {new Date(log.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed mb-2 line-clamp-3">
                                {log.details}
                              </p>
                              <div className="flex justify-between text-[10px] text-gray-500 font-medium border-t border-gray-200/50 pt-2 mt-2">
                                <span className="uppercase">Status: {log.status}</span>
                                <span>Type: {log.reference_type || 'Unknown'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, user: null, logs: [], loading: false })}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
              >
                Close History
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── BAN CONFIRMATION MODAL ── */}
      {confirmModal.isOpen && confirmModal.item && (() => {
        const item = confirmModal.item;
        const targetUser = getTargetUser(item);

        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                    <Ban className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-gray-900">
                    Enforce permanent ban
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => !isProcessing && setConfirmModal({ isOpen: false, item: null, note: '' })}
                  aria-label="Close"
                  className={`rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ${FOCUS_RING}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-500">
                <>Enforce a ban for <span className="font-semibold text-gray-900">{targetUser?.full_name}</span>? This updates all pending moderator escalations for the account and restricts access. Lift Ban is available in User Management.</>
              </p>

              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Admin remarks / justification</span>
                  <textarea
                    value={confirmModal.note}
                    onChange={(e) => setConfirmModal(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Reason for banning this user..."
                    className="h-28 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <div className="flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-5 border-rose-100 bg-rose-50/60 text-rose-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
                  <p>Uses existing database tables. Account, case, and audit writes are separate; review the status if any step fails.</p>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false, item: null, note: '' })}
                  disabled={isProcessing}
                  className={`flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBan}
                  disabled={isProcessing}
                  className={`flex-[1.5] rounded-lg py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} bg-rose-700 hover:bg-rose-800`}
                >
                  {isProcessing ? 'Processing...' : 'Confirm permanent ban'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}