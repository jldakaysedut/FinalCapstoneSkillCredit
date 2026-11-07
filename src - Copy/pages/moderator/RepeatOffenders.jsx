import { useState, useEffect, useMemo } from 'react';
import supabase from '../../supabaseClient';
import {
  Search, ShieldAlert, ShieldCheck, UploadCloud, X, CalendarDays,
  MessageSquareOff, AlertTriangle, Check, Clock, Scale, ArrowRight
} from 'lucide-react';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

export default function RepeatOffenders() {
  const [loading, setLoading] = useState(true);
  const [offenders, setOffenders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentModId, setCurrentModId] = useState(null);

  const [activeTabFilter, setActiveTabFilter] = useState('ALL');
  const [manageModal, setManageModal] = useState({ isOpen: false, user: null });
  const [escalateModal, setEscalateModal] = useState({ isOpen: false, user: null });
  const [escalationNote, setEscalationNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyModal, setHistoryModal] = useState({ isOpen: false, user: null, logs: [], loading: false });

  const STRIKE_LIMIT = 3;

  useEffect(() => {
    const fetchOffenders = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentModId(user?.id);

      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, role, violation_count, community_restricted_until, booking_restricted_until')
        .gte('violation_count', STRIKE_LIMIT)
        .order('violation_count', { ascending: false });

      if (!usersError && usersData) {
        // Fetch from repeat_offenders to see if status is 'escalated'
        const { data: repeatOffendersData } = await supabase
          .from('repeat_offenders')
          .select('user_id, status')
          .eq('status', 'escalated');

        const escalatedIds = new Set((repeatOffendersData || []).map(r => r.user_id));

        const combinedData = usersData.map(u => ({
          ...u,
          is_escalated: escalatedIds.has(u.id)
        }));

        setOffenders(combinedData);
      }
      setLoading(false);
    };

    fetchOffenders();
  }, []);

  const handleOpenEscalateModal = (targetUser) => {
    setManageModal({ isOpen: false, user: null });
    setEscalateModal({ isOpen: true, user: targetUser });
    setEscalationNote('');
  };

  const handleOpenHistoryModal = async (targetUser) => {
    setManageModal({ isOpen: false, user: null });
    setHistoryModal({ isOpen: true, user: targetUser, logs: [], loading: true });
    
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
  };

  const confirmEscalation = async () => {
    if (!escalationNote.trim()) {
      alert('Please provide a justification note for the Administration team.');
      return;
    }
    setIsProcessing(true);
    const targetUser = escalateModal.user;

    try {
      // 1. Check if record exists in repeat_offenders
      const { data: existingOffender } = await supabase
        .from('repeat_offenders')
        .select('id')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      let repeatOffenderId = existingOffender?.id;

      if (existingOffender) {
        // Update existing record status to 'escalated'
        const { error: updateErr } = await supabase
          .from('repeat_offenders')
          .update({ status: 'escalated', moderator_id: currentModId, updated_at: new Date().toISOString() })
          .eq('id', existingOffender.id);

        if (updateErr) throw updateErr;
      } else {
        // Insert new record with status 'escalated'
        const { data: newOffender, error: insertOffenderErr } = await supabase
          .from('repeat_offenders')
          .insert([{ 
            user_id: targetUser.id, 
            moderator_id: currentModId,
            status: 'escalated'
          }])
          .select('id')
          .single();

        if (insertOffenderErr) throw insertOffenderErr;
        if (newOffender) repeatOffenderId = newOffender.id;
      }

      // 2. Insert into admin_escalations for the admin queue with status 'pending'
      const { data: escalationRecord, error: escalationErr } = await supabase
        .from('admin_escalations')
        .insert([{
          repeat_offender_id: repeatOffenderId,
          moderator_id: currentModId,
          status: 'pending'
        }])
        .select()
        .single();

      if (escalationErr) throw escalationErr;

      // 3. Log the action in mod_logs
      const { error: logErr } = await supabase.from('mod_logs').insert([{
        moderator_id: currentModId,
        target_user_id: targetUser.id,
        action_type: 'ESCALATED_TO_ADMIN',
        reference_id: escalationRecord.id,
        details: `Escalated repeat offender (${targetUser.violation_count} strikes) to Admin.\nNotes: ${escalationNote.trim()}`
      }]);

      if (logErr) throw logErr;

      const notifContent = `Your account behavior has been escalated to an Administrator for severe review due to accumulating ${targetUser.violation_count} policy strikes.\n\nModerator Note: ${escalationNote.trim()}`;

      await supabase.from('notifications').insert([{
        user_id: targetUser.id,
        type: 'account_escalated',
        content: notifContent
      }]);

      setOffenders(prev => prev.map(u => 
        u.id === targetUser.id ? { ...u, is_escalated: true } : u
      ));
      
      alert(`Successfully escalated ${targetUser.full_name} to the Administration team.`);
      setEscalateModal({ isOpen: false, user: null });
    } catch (err) {
      console.error(err);
      alert('Error escalating user: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(() => {
    const total = offenders.length;
    const escalatedCount = offenders.filter(u => u.is_escalated).length;
    const pendingCount = total - escalatedCount;

    return { total, pending: pendingCount, escalated: escalatedCount };
  }, [offenders]);

  const filteredOffenders = useMemo(() => {
    return offenders.filter(user => {
      const isEscalated = user.is_escalated;

      if (activeTabFilter === 'PENDING' && isEscalated) return false;
      if (activeTabFilter === 'ESCALATED' && !isEscalated) return false;

      const matchesSearch =
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.includes(searchQuery);

      return matchesSearch;
    });
  }, [offenders, searchQuery, activeTabFilter]);

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
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Repeat offenders queue</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Review accounts with {STRIKE_LIMIT} or more policy strikes and manage escalation statuses.
          </p>
        </div>
      </div>

      {/* ── CLICKABLE SUMMARY CARDS ── */}
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
          <p className={`text-[13px] font-semibold ${activeTabFilter === 'ALL' ? 'text-emerald-800' : 'text-gray-600'}`}>Total Tracked</p>
          <p className={`mt-2 text-3xl font-bold ${activeTabFilter === 'ALL' ? 'text-emerald-900' : 'text-gray-900'}`}>{stats.total}</p>
          <p className={`mt-1 text-xs ${activeTabFilter === 'ALL' ? 'text-emerald-700' : 'text-gray-500'}`}>All unique offenders on record</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabFilter('PENDING')}
          className={`rounded-2xl border p-5 text-left transition-all ${FOCUS_RING} ${
            activeTabFilter === 'PENDING'
              ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <p className={`text-[13px] font-semibold ${activeTabFilter === 'PENDING' ? 'text-emerald-800' : 'text-gray-600'}`}>Pending Review</p>
          <p className={`mt-2 text-3xl font-bold ${activeTabFilter === 'PENDING' ? 'text-emerald-900' : 'text-gray-900'}`}>{stats.pending}</p>
          <p className={`mt-1 text-xs ${activeTabFilter === 'PENDING' ? 'text-emerald-700' : 'text-gray-500'}`}>Awaiting moderator action</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabFilter('ESCALATED')}
          className={`rounded-2xl border p-5 text-left transition-all ${FOCUS_RING} ${
            activeTabFilter === 'ESCALATED'
              ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <p className={`text-[13px] font-semibold ${activeTabFilter === 'ESCALATED' ? 'text-emerald-800' : 'text-gray-600'}`}>Escalated to Admin</p>
          <p className={`mt-2 text-3xl font-bold ${activeTabFilter === 'ESCALATED' ? 'text-emerald-900' : 'text-gray-900'}`}>{stats.escalated}</p>
          <p className={`mt-1 text-xs ${activeTabFilter === 'ESCALATED' ? 'text-emerald-700' : 'text-gray-500'}`}>Sent up for final review</p>
        </button>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:max-w-md">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by name or details"
            aria-label="Search repeat offenders"
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
              Showing <span className="font-semibold tabular-nums text-gray-900">{filteredOffenders.length}</span> of <span className="tabular-nums">{offenders.length}</span> accounts
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
                  Loading offenders queue...
                </td>
              </tr>
            ) : filteredOffenders.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-16 text-center">
                   <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">No accounts match this filter</p>
                  <p className="mt-1 text-xs text-gray-500">Try switching your view above or clearing your search.</p>
                </td>
              </tr>
            ) : (
              filteredOffenders.map(user => {
                const isEscalated = user.is_escalated;

                return (
                  <tr key={user.id} className="relative hover:bg-gray-50/50 transition-colors">
                    <td className={`px-6 py-4 whitespace-nowrap border-l-4 ${isEscalated ? 'border-l-rose-500' : 'border-l-amber-400'}`}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-bold text-gray-500 uppercase border border-gray-200">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                          ) : (
                            user.full_name?.charAt(0) || 'U'
                          )}
                        </span>
                        <div>
                          <p className="text-[15px] font-bold text-gray-900">{user.full_name}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                              {user.role || 'User'}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">#{user.id.split('-')[0]}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true"></span>
                        {user.violation_count} Strikes
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEscalated ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-800">
                          <UploadCloud className="h-3.5 w-3.5" /> Escalated to Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span> Pending Review
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setManageModal({ isOpen: true, user })}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold shadow-sm transition ${
                          isEscalated 
                            ? 'text-gray-700' 
                            : 'bg-emerald-700 text-white hover:bg-emerald-800'
                        } ${FOCUS_RING}`}
                      >
                        {isEscalated ? 'View record' : 'Manage user'} <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── UNIFIED MANAGE MODAL ── */}
      {manageModal.isOpen && manageModal.user && (
        <div
          role="dialog"
          className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setManageModal({ isOpen: false, user: null })}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setManageModal({ isOpen: false, user: null })}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex flex-col items-center text-center mt-4">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xl font-bold text-emerald-800 border border-emerald-200 shadow-sm">
                {manageModal.user.avatar_url ? (
                  <img src={manageModal.user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  manageModal.user.full_name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </span>
              <h3 className="mt-3 text-lg font-bold text-gray-900">{manageModal.user.full_name}</h3>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mt-1 flex items-center justify-center gap-1.5">
                <span>{manageModal.user.role || 'User'}</span>
                <span className="text-gray-300">•</span>
                <span className="font-mono text-gray-400">#{manageModal.user.id.split('-')[0]}</span>
              </p>
              
              <div className="mt-5 w-full rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Policy Strikes:</span>
                  <span className="font-bold text-rose-600 px-2 py-0.5 bg-rose-100 rounded-md">{manageModal.user.violation_count}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Queue Status:</span>
                  <span className="font-semibold text-gray-900">
                     {manageModal.user.is_escalated ? 'Escalated to Admin' : 'Pending Review'}
                  </span>
                </div>
              </div>

              <div className="mt-6 w-full flex flex-col gap-2 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => handleOpenHistoryModal(manageModal.user)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 text-[13px] font-semibold text-gray-700 hover:bg-gray-200 transition"
                >
                  <Clock className="h-4 w-4" /> View Active Reports
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEscalateModal(manageModal.user)}
                  disabled={manageModal.user.is_escalated}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition ${
                    manageModal.user.is_escalated
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <UploadCloud className="h-4 w-4" /> {manageModal.user.is_escalated ? 'Already Escalated' : 'Escalate to Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OFFENDER HISTORY MODAL ── */}
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

      {/* ── ESCALATION MODAL ── */}
      {escalateModal.isOpen && escalateModal.user && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="escalate-title"
          className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <h3 id="escalate-title" className="text-base font-semibold text-gray-900">Escalate to admin</h3>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setEscalateModal({ isOpen: false, user: null })}
                aria-label="Close"
                className={`rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ${FOCUS_RING}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              You are escalating <span className="font-semibold text-gray-900">{escalateModal.user.full_name}</span> ({escalateModal.user.violation_count} strikes) to the Administration team for severe review and a possible permanent ban.
            </p>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Moderator justification notes</span>
                <textarea
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                  placeholder="Explain why this user needs to be banned"
                  className="h-28 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-5 text-emerald-900">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <p>These notes are attached to the user's notification and logged securely for the admin's reference.</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setEscalateModal({ isOpen: false, user: null })}
                disabled={isProcessing}
                className={`flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEscalation}
                disabled={isProcessing || !escalationNote.trim()}
                className={`flex-[1.5] rounded-lg bg-rose-700 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {isProcessing ? 'Escalating...' : 'Confirm escalation'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}