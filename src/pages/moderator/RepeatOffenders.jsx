import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { 
  AlertOctagon, Search, ShieldAlert, UserX, Clock, 
  UploadCloud, X, CalendarDays, MessageSquareOff, AlertTriangle 
} from 'lucide-react';

export default function RepeatOffenders() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offenders, setOffenders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentModId, setCurrentModId] = useState(null);

  // ── Escalation Modal State ──
  const [escalateModal, setEscalateModal] = useState({ isOpen: false, user: null });
  const [escalationNote, setEscalationNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // STRIKE THRESHOLD: Show users with 3 or more violations
  const STRIKE_LIMIT = 3;

  useEffect(() => {
    const fetchOffenders = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentModId(user?.id);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, role, violation_count, community_restricted_until, booking_restricted_until')
        .gte('violation_count', STRIKE_LIMIT)
        .order('violation_count', { ascending: false });

      if (!error && data) {
        setOffenders(data);
      }
      setLoading(false);
    };

    fetchOffenders();
  }, []);

  const handleOpenEscalateModal = (targetUser) => {
    setEscalateModal({ isOpen: true, user: targetUser });
    setEscalationNote('');
  };

  const confirmEscalation = async () => {
    if (!escalationNote.trim()) {
      alert('Please provide a justification note for the Administration team.');
      return;
    }

    setIsProcessing(true);
    const targetUser = escalateModal.user;

    try {
      // 1. GUMAWA NG RECORD SA REPORTS TABLE PARA MABASA NG ADMIN ESCALATION DASHBOARD
      // Gagamitin nating reporter ang Mod mismo, tapos ang target ay yung offender
      const { data: reportRecord, error: reportErr } = await supabase.from('reports').insert([{
        reporter_id: currentModId,
        reported_user_id: targetUser.id,
        reason: 'Repeat Offender Threshold Reached',
        details: `This user has accumulated ${targetUser.violation_count} strikes.\n\n[ESCALATION NOTES]: ${escalationNote.trim()}`,
        reference_type: 'Account Profile',
        reference_id: targetUser.id, // Reference is the user's own profile ID
        status: 'escalated',
        mod_action_notes: escalationNote.trim()
      }]).select().single();

      if (reportErr) throw reportErr;

      // 2. I-save sa mod_logs ang Escalation Record
      const { error: logErr } = await supabase.from('mod_logs').insert([{
        moderator_id: currentModId,
        target_user_id: targetUser.id,
        action_type: 'ESCALATED_TO_ADMIN',
        reference_id: reportRecord.id, // I-link natin yung ginawang report
        details: `Escalated repeat offender (${targetUser.violation_count} strikes) to Admin.\nNotes: ${escalationNote.trim()}`
      }]);

      if (logErr) throw logErr;

      // 3. I-notify ang User gamit ang pormal na Trust & Safety Template
      const notifContent = `Your account behavior has been escalated to an Administrator for severe review due to accumulating ${targetUser.violation_count} policy strikes.\n\nModerator Note: ${escalationNote.trim()}`;

      await supabase.from('notifications').insert([{
        user_id: targetUser.id,
        type: 'account_escalated',
        content: notifContent
      }]);

      // Remove from UI
      setOffenders(prev => prev.filter(user => user.id !== targetUser.id));

      alert(`Successfully escalated ${targetUser.full_name} to the Administration team.`);
      setEscalateModal({ isOpen: false, user: null });
    } catch (err) {
      console.error(err);
      alert('Error escalating user: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOffenders = offenders.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.id.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-700 animate-in fade-in duration-300">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-800">
            <AlertOctagon className="h-3.5 w-3.5" /> High Priority Watchlist
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            Repeat Offenders
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Accounts with {STRIKE_LIMIT} or more verified policy strikes. Escalate severe cases to Admins for final review and potential permanent ban.
          </p>
        </div>
      </div>

      {/* ── SEARCH CONTROL ── */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search offender by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
          />
        </div>
      </div>

      {/* ── OFFENDERS LIST ── */}
      {loading ? (
        <div className="grid min-h-[40vh] place-items-center">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-rose-600 border-t-transparent" />
            <span className="text-sm font-semibold text-slate-700">Scanning strike records...</span>
          </div>
        </div>
      ) : filteredOffenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-900">Queue is Clear</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            There are currently no active users who have reached the {STRIKE_LIMIT}-strike threshold limit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOffenders.map(user => {
            const now = new Date();
            
            // Evaluator para sa magkahiwalay na Timeout
            const commEnd = user.community_restricted_until ? new Date(user.community_restricted_until) : null;
            const isCommRestricted = commEnd && commEnd > now;

            const bookEnd = user.booking_restricted_until ? new Date(user.booking_restricted_until) : null;
            const isBookRestricted = bookEnd && bookEnd > now;

            return (
              <div key={user.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                
                {/* User Info Header */}
                <div className="flex items-start justify-between gap-3 mb-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border border-slate-200">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.full_name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-slate-900 leading-tight truncate">
                        {user.full_name || 'Unknown User'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        ID: {user.id.split('-')[0]}
                      </p>
                    </div>
                  </div>
                  
                  {/* Strike Badge */}
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 font-black text-lg px-3 py-1 rounded-xl shadow-sm text-center leading-tight shrink-0">
                    {user.violation_count}
                    <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-80">Strikes</span>
                  </div>
                </div>

                {/* Status Indicator Area */}
                <div className="mb-6 space-y-2">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <UserX className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Role: <span className="capitalize font-bold">{user.role || 'User'}</span></span>
                  </div>

                  {/* Community Penalty Indicator */}
                  {isCommRestricted && (
                    <div className="flex items-center gap-2.5 text-[12px] font-medium text-orange-800 bg-orange-50 p-2.5 rounded-xl border border-orange-200">
                      <MessageSquareOff className="w-4 h-4 text-orange-600 shrink-0" />
                      <span className="leading-tight">
                        Community Muted until: <br/>
                        <span className="font-bold">{commEnd.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </span>
                    </div>
                  )}

                  {/* Booking Penalty Indicator */}
                  {isBookRestricted && (
                    <div className="flex items-center gap-2.5 text-[12px] font-medium text-purple-800 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                      <CalendarDays className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="leading-tight">
                        Booking Locked until: <br/>
                        <span className="font-bold">{bookEnd.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </span>
                    </div>
                  )}

                  {/* Clean Slate state */}
                  {!isCommRestricted && !isBookRestricted && (
                    <div className="flex items-center gap-2.5 text-[12px] font-medium text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Account is currently active (No ongoing timeouts).</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <button 
                  onClick={() => handleOpenEscalateModal(user)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" /> Escalate to Admin
                </button>

              </div>
            );
          })}
        </div>
      )}

      {/* ── ESCALATION MODAL ── */}
      {escalateModal.isOpen && escalateModal.user && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Escalate to Admin</h3>
              </div>
              <button 
                onClick={() => !isProcessing && setEscalateModal({ isOpen: false, user: null })} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-5 pl-10">
              You are escalating <b className="text-slate-800">{escalateModal.user.full_name}</b> ({escalateModal.user.violation_count} strikes) to the Administration team for severe review and potential permanent ban.
            </p>

            <div className="space-y-3 mb-6">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Moderator Justification Notes</span>
                <textarea 
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                  placeholder="Provide context on why this user needs to be banned..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition resize-none h-28"
                />
              </label>
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 font-medium">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>These notes will be attached to the user's notification and logged securely for the Admin's reference.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setEscalateModal({ isOpen: false, user: null })} 
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmEscalation} 
                disabled={isProcessing || !escalationNote.trim()}
                className="flex-[1.5] py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Escalating...' : 'Confirm Escalation'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}