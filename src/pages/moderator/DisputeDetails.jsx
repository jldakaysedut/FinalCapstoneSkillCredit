import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  };
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      {paths[name] || paths.report}
    </svg>
  );
}

// ─── AUTO-GENERATED DISPUTE NOTES LOGIC ───
function getDisputeAutoNote(actionType) {
  if (actionType === 'warning') {
    return "Unprofessional conduct or minor policy violations were detected during this session. Please review our booking and session guidelines.";
  }
  if (actionType === 'penalty') {
    return "Fraudulent activity, severe unprofessionalism, or deliberate failure to deliver services confirmed. Your booking privileges are temporarily suspended.";
  }
  if (actionType === 'escalate') {
    return "Case escalated to Administration due to suspected severe fraud or repeated escrow abuse. The account requires a final review.";
  }
  return "Standard escrow resolution. No disciplinary policy violations found.";
}

export default function DisputeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [report, setReport] = useState(null);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // ── Resolution Modal State ──
  const [resolutionModal, setResolutionModal] = useState({ isOpen: false, decision: null });
  const [disciplinaryAction, setDisciplinaryAction] = useState('standard'); // 'standard' | 'warning' | 'penalty' | 'escalate'

  useEffect(() => {
    if (!previewImage) return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewImage]);

  const fetchDisputeData = async (userId) => {
    setLoading(true);
    try {
      const { data: reportData, error: reportErr } = await supabase
        .from('reports')
        .select(`*, reporter:user_profiles!reports_reporter_id_fkey(id, full_name, role), reported:user_profiles!reports_reported_user_id_fkey(id, full_name, role), assignee:user_profiles!reports_assigned_to_fkey(id, full_name)`)
        .eq('id', id)
        .maybeSingle();

      if (reportErr) throw reportErr;
      if (!reportData) { setReport(null); setSession(null); return; }

      setReport(reportData);

      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select(`*, skill:skills(title), student:user_profiles!sessions_student_id_fkey(id, full_name, credits_balance), instructor:user_profiles!sessions_instructor_id_fkey(id, full_name, credits_balance)`)
        .eq('id', reportData.reference_id)
        .maybeSingle();

      if (sessionErr) throw sessionErr;

      if (sessionData) {
        setSession(sessionData);
        const { data: messagesData, error: msgErr } = await supabase
          .from('messages')
          .select(`id, session_id, sender_id, content, file_url, file_type, created_at, sender:user_profiles!sender_id(id, full_name, avatar_url)`)
          .eq('session_id', sessionData.id)
          .order('created_at', { ascending: true });

        if (msgErr) throw msgErr;
        setMessages(messagesData || []);
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Failed to load dispute dossier:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setCurrentUserId(user.id); fetchDisputeData(user.id); }
    };
    init();
  }, [id]);

  const isParticipant = Boolean(currentUserId && session && (currentUserId === session.student_id || currentUserId === session.instructor_id));

  const handleClaim = async () => {
    if (isParticipant) { alert('Action blocked: Conflict of interest policy prohibits self-adjudication.'); return; }
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('reports').update({ assigned_to: currentUserId }).eq('id', report.id);
      if (error) throw error;
      await fetchDisputeData(currentUserId);
    } catch (err) { alert('Failed to claim ticket: ' + err.message); } finally { setIsProcessing(false); }
  };

  // ── Open Resolution Modal ──
  const openResolutionModal = (decision) => {
    if (isParticipant) { alert('Action blocked: Conflict of interest policy prohibits self-adjudication.'); return; }
    setDisciplinaryAction('standard'); // Reset to default
    setResolutionModal({ isOpen: true, decision });
  };

  // ── Execute Final Resolution (Money + Penalty) ──
  const finalizeResolution = async () => {
    const decision = resolutionModal.decision;
    setResolutionModal({ isOpen: false, decision: null });
    setIsProcessing(true);

    try {
      const winnerId = decision === 'Learner' ? session.student_id : session.instructor_id;
      const loserId = decision === 'Learner' ? session.instructor_id : session.student_id;
      
      const newSessionStatus = decision === 'Learner' ? 'cancelled' : 'completed';
      const adjustmentAmount = Number(session.credit_amount || 0);

      // 1. Fetch current balance of Winner & adjust (Give them the money)
      const { data: winnerProfile, error: profErr } = await supabase.from('user_profiles').select('credits_balance').eq('id', winnerId).single();
      if (profErr) throw profErr;

      const newBalance = Number(winnerProfile?.credits_balance || 0) + adjustmentAmount;
      const { error: balanceErr } = await supabase.from('user_profiles').update({ credits_balance: newBalance }).eq('id', winnerId);
      if (balanceErr) throw balanceErr;

      // 2. Update Session status
      const { error: sessionUpdateErr } = await supabase.from('sessions').update({ status: newSessionStatus }).eq('id', session.id);
      if (sessionUpdateErr) throw sessionUpdateErr;

      // 3. APPLY PENALTIES TO LOSER IF SELECTED
      const autoNote = getDisputeAutoNote(disciplinaryAction);
      
      if (disciplinaryAction === 'warning') {
        await supabase.rpc('issue_penalty', { target_id: loserId, strike_to_add: 1, penalty_hours: 0, penalty_type: 'booking' });
      } else if (disciplinaryAction === 'penalty') {
        await supabase.rpc('issue_penalty', { target_id: loserId, strike_to_add: 1, penalty_hours: 12, penalty_type: 'booking' });
      }
      
      const newReportStatus = disciplinaryAction === 'escalate' ? 'escalated' : 'resolved';

      // 4. Update Report status with Final Notes
      const timestamp = new Date().toLocaleString();
      const updatedDetails = `${report.details}\n\n[RESOLVED - FAVOR ${decision.toUpperCase()} on ${timestamp}]: ${autoNote}`;
      
      const { error: reportUpdateErr } = await supabase.from('reports').update({ status: newReportStatus, details: updatedDetails, mod_action_notes: autoNote }).eq('id', report.id);
      if (reportUpdateErr) throw reportUpdateErr;

      // 5. RECORD TO MOD_LOGS
      const logDetails = decision === 'Learner'
        ? `Refunded ${adjustmentAmount} credits to Learner. Penalty applied to Instructor: ${disciplinaryAction.toUpperCase()}.`
        : `Released ${adjustmentAmount} credits to Instructor. Penalty applied to Learner: ${disciplinaryAction.toUpperCase()}.`;

      await supabase.from('mod_logs').insert([{ moderator_id: currentUserId, target_user_id: loserId, action_type: 'RESOLVE_DISPUTE', reference_id: report.id, details: logDetails }]);

      // 6. NOTIFICATIONS DISPATCH (Fixed with ?session=ID for auto-scroll)
      const tutorialTitle = session.skill?.title || 'Skill Session';
      
      // Winner Notice
      await supabase.from('notifications').insert([{
        user_id: winnerId,
        type: 'dispute_resolved',
        content: `The dispute for session '${tutorialTitle}' has been resolved in your favor. The escrowed credits have been securely transferred to your wallet.`,
        link_url: `/sessions?session=${session.id}`
      }]);

      // Loser Notice (Depends on Disciplinary Action)
      let loserNotifType = 'dispute_resolved';
      let loserNotifContent = `The dispute for session '${tutorialTitle}' was resolved in favor of the other party. The escrowed credits have been released to them.`;

      if (disciplinaryAction === 'warning') {
        loserNotifType = 'account_warning';
        loserNotifContent = `Your profile received a warning regarding your conduct in session '${tutorialTitle}'.\n\nModerator Note: ${autoNote}`;
      } else if (disciplinaryAction === 'penalty') {
        loserNotifType = 'account_penalized';
        loserNotifContent = `Your account has been temporarily restricted for 12 hours from booking and creating listings regarding your conduct in session '${tutorialTitle}'.\n\nModerator Note: ${autoNote}`;
      } else if (disciplinaryAction === 'escalate') {
        loserNotifType = 'account_escalated';
        loserNotifContent = `Your account behavior has been escalated to an Administrator for severe review regarding session '${tutorialTitle}'.\n\nModerator Note: ${autoNote}`;
      }

      await supabase.from('notifications').insert([{
        user_id: loserId,
        type: loserNotifType,
        content: loserNotifContent,
        link_url: `/sessions?session=${session.id}`
      }]);

      alert(`Dispute successfully closed in favor of the ${decision}. Action executed.`);
      navigate('/moderator/disputes');
    } catch (err) {
      console.error(err);
      alert('Error finalizing verdict: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-sm font-medium text-slate-500" role="status" aria-live="polite">Loading case documentation...</div>;

  if (!report || !session) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Record Not Found</p>
        <p className="text-xs text-slate-500 mt-1 mb-4">This dispute ticket or its associated session reference does not exist in the database.</p>
        <Link to="/moderator/disputes" className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition">Return to Disputes</Link>
      </div>
    );
  }

  const isReporterStudent = report.reporter_id === session.student_id;

  return (
    <div className="max-w-7xl mx-auto space-y-4 font-sans text-slate-700">
      
      {/* ── BREADCRUMB & HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/moderator/disputes" className="inline-flex items-center gap-1.5 font-medium hover:text-slate-900 transition">Disputes</Link>
            <span aria-hidden="true">/</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-500">Case #{report.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[28px]">Dispute review</h1>
          <p className="mt-1 text-sm text-slate-500">{session.skill?.title || 'Session booking'} · Review the session record and escrow outcome.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${report.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>{report.status}</span>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
            <ModeratorIcon name="wallet" size={15} className="text-slate-500" /> {session.credit_amount} credits in escrow
          </div>
        </div>
      </div>

      {isParticipant && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm" role="alert">
          <ModeratorIcon name="alert" className="mt-0.5 text-rose-600" /><span><b>Self-adjudication restriction:</b> You are registered as an active participant ({currentUserId === session.student_id ? 'Learner' : 'Instructor'}) in this session. Case controls have been locked to maintain institutional impartiality.</span>
        </div>
      )}

      {/* ── PARTICIPANTS ── */}
      <section aria-label="Session participants" className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          { role: 'Learner', person: session.student, isReporter: isReporterStudent, completed: session.student_completed },
          { role: 'Instructor', person: session.instructor, isReporter: !isReporterStudent, completed: session.instructor_completed },
        ].map((participant) => (
          <article key={participant.role} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">{participant.person?.full_name?.charAt(0)?.toUpperCase() || <ModeratorIcon name="user" size={18} />}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{participant.person?.full_name || `${participant.role} not available`}</p>
                  {participant.isReporter && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Reporter</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{participant.role}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${participant.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                <ModeratorIcon name={participant.completed ? 'check' : 'clock'} size={13} /> {participant.completed ? 'Completed' : 'Not completed'}
              </span>
            </div>
          </article>
        ))}
      </section>

      {/* ── MAIN WORKSPACE: EVIDENCE LOG & ACTIONS ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        
        {/* Left Column (2 Cols): Session Chat & Evidence Timeline */}
        <div className="lg:col-span-8 min-w-0 bg-white border border-slate-200/80 rounded-xl shadow-sm flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900"><ModeratorIcon name="report" className="text-slate-500" /> Session conversation</h2>
              <p className="mt-0.5 text-xs text-slate-500">Messages and evidence shared in this session.</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
          </div>

          <div className="max-h-[620px] flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9]">
            {messages.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <ModeratorIcon name="report" size={22} className="mb-3 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">No session messages</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">No chat messages or attachments were recorded for this session.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isStudentSender = msg.sender_id === session.student_id;
                const isInstructorSender = msg.sender_id === session.instructor_id;

                return (
                  <div key={msg.id} className="flex items-start gap-3 text-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                      {msg.sender?.avatar_url ? <img src={msg.sender.avatar_url} alt="" className="w-full h-full object-cover" /> : msg.sender?.full_name?.charAt(0) || 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{msg.sender?.full_name || 'User'}</span>
                        {isStudentSender && <span className="px-1.5 py-0.2 rounded text-xs font-medium bg-slate-100 text-slate-600">Learner</span>}
                        {isInstructorSender && <span className="px-1.5 py-0.2 rounded text-xs font-medium bg-slate-100 text-slate-600">Teacher</span>}
                        <time className="text-xs text-slate-400">{new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                      </div>
                      <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-800 shadow-sm">
                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                        {msg.file_url && (
                          <div className="pt-2 border-t border-slate-100">
                            {msg.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.file_url) ? (
                              <div className="inline-flex flex-col items-start gap-1.5">
                                <button type="button" onClick={() => setPreviewImage(msg.file_url)} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={msg.file_url} alt="Evidence" loading="lazy" className="max-h-56 max-w-full object-contain hover:opacity-90" /></button>
                              </div>
                            ) : (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"><span>Download File Attachment</span></a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Dossier Details & Adjudication Controls */}
        <div className="space-y-4 lg:col-span-4">
          
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2"><ModeratorIcon name="report" className="text-slate-500" /><h3 className="text-base font-semibold tracking-tight text-slate-900">Filed statement</h3></div>
            <dl className="space-y-4">
              <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Reason</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{report.reason || 'Not specified'}</dd></div>
              <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Reporter’s account</dt><dd className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{report.details || 'No additional details were provided.'}</dd></div>
              <div className="flex items-start gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600"><ModeratorIcon name="calendar" size={16} className="mt-0.5 text-slate-400" /><div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduled session</dt><dd className="mt-0.5 font-medium text-slate-800">{session.scheduled_date || 'Date unavailable'}{session.scheduled_time ? ` · ${session.scheduled_time}` : ''}</dd></div></div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2"><ModeratorIcon name="wallet" className="text-slate-500" /><h3 className="text-base font-semibold tracking-tight text-slate-900">Escrow decision</h3></div>

            {isParticipant ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><ModeratorIcon name="alert" className="mt-0.5 text-rose-600" /><p>You cannot decide this case because you are a session participant.</p></div>
            ) : report.status === 'pending' ? (
              !report.assigned_to ? (
                <div className="space-y-3"><p className="text-sm leading-relaxed text-slate-600">This case is unassigned. Claim it to record the escrow decision.</p><button onClick={handleClaim} disabled={isProcessing} className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer">{isProcessing ? 'Claiming Case...' : 'Claim Case'} <ModeratorIcon name="arrow" size={15} /></button></div>
              ) : report.assigned_to === currentUserId ? (
                <div className="space-y-2.5">
                  <p className="text-sm leading-relaxed text-slate-600 mb-4">Choose who should receive the <b className="text-slate-900">{session.credit_amount} credits</b> held in escrow.</p>
                  
                  <button onClick={() => openResolutionModal('Learner')} disabled={isProcessing} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-left transition hover:bg-emerald-100/50 flex items-center justify-between gap-3 cursor-pointer">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><ModeratorIcon name="arrow" size={16} className="rotate-180" /></span>
                      <span><span className="block text-sm font-bold text-emerald-900">Refund Learner</span><span className="block text-xs font-semibold text-emerald-700">Return credits to {session.student?.full_name?.split(' ')[0] || 'student'}</span></span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded-full">{session.credit_amount} CR</span>
                  </button>

                  <button onClick={() => openResolutionModal('Teacher')} disabled={isProcessing} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ModeratorIcon name="arrow" size={16} /></span>
                      <span><span className="block text-sm font-bold text-slate-900">Release to Instructor</span><span className="block text-xs font-semibold text-slate-500">Payout to {session.instructor?.full_name?.split(' ')[0] || 'teacher'}</span></span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-slate-600 bg-slate-100 border px-2 py-0.5 rounded-full">{session.credit_amount} CR</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><ModeratorIcon name="users" className="mt-0.5 text-blue-700" /><p>Assigned to <b>{report.assignee?.full_name || 'another moderator'}</b>. This case is read-only for you.</p></div>
              )
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><ModeratorIcon name="check" className="mt-0.5 text-emerald-700" /><p>This dispute is settled and the escrow transaction has been recorded.</p></div>
            )}
          </section>
        </div>
      </div>

      {/* ── DISCIPLINARY ACTION MODAL ── */}
      {resolutionModal.isOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Finalize Escrow Resolution</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              You are resolving the dispute in favor of the <b className="text-slate-800">{resolutionModal.decision}</b>. The {session.credit_amount} credits will be safely transferred to their wallet.
            </p>

            <div className="space-y-2 mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Disciplinary Action against Losing Party</p>
              
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${disciplinaryAction === 'standard' ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input type="radio" name="discipline" value="standard" checked={disciplinaryAction === 'standard'} onChange={() => setDisciplinaryAction('standard')} className="mt-0.5 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                <div>
                  <span className="block text-[13px] font-bold text-slate-900">Standard Resolution</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Transfer funds only. No penalty or strike applied.</span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${disciplinaryAction === 'warning' ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input type="radio" name="discipline" value="warning" checked={disciplinaryAction === 'warning'} onChange={() => setDisciplinaryAction('warning')} className="mt-0.5 w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300" />
                <div>
                  <div className="flex items-center gap-2"><span className="block text-[13px] font-bold text-amber-900">Issue Formal Warning</span><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 rounded">+1 Strike</span></div>
                  <span className="block text-[11px] text-amber-700/80 mt-0.5">For unprofessional conduct or minor policy violations.</span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${disciplinaryAction === 'penalty' ? 'border-orange-400 bg-orange-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input type="radio" name="discipline" value="penalty" checked={disciplinaryAction === 'penalty'} onChange={() => setDisciplinaryAction('penalty')} className="mt-0.5 w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300" />
                <div>
                  <div className="flex items-center gap-2"><span className="block text-[13px] font-bold text-orange-900">Apply 12h Booking Timeout</span><span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 rounded">+1 Strike</span></div>
                  <span className="block text-[11px] text-orange-700/80 mt-0.5">For fraudulent activity, severe unprofessionalism, or no-shows.</span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${disciplinaryAction === 'escalate' ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input type="radio" name="discipline" value="escalate" checked={disciplinaryAction === 'escalate'} onChange={() => setDisciplinaryAction('escalate')} className="mt-0.5 w-4 h-4 text-rose-600 focus:ring-rose-500 border-gray-300" />
                <div>
                  <div className="flex items-center gap-2"><span className="block text-[13px] font-bold text-rose-900">Escalate to Admin</span></div>
                  <span className="block text-[11px] text-rose-700/80 mt-0.5">For repeated escrow abuse requiring permanent ban review.</span>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setResolutionModal({ isOpen: false, decision: null })} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">Cancel</button>
              <button type="button" onClick={finalizeResolution} className="flex-[1.5] py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer">Confirm Release</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: IMAGE LIGHTBOX ── */}
      {previewImage && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6" onClick={(event) => event.target === event.currentTarget && setPreviewImage(null)}>
          <div className="relative flex max-h-[92vh] max-w-[95vw] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-white">
              <div><p className="text-sm font-semibold">Session evidence</p><p className="text-xs text-slate-300">Image preview</p></div>
              <button type="button" onClick={() => setPreviewImage(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><ModeratorIcon name="close" size={17} /></button>
            </div>
            <div className="flex min-h-0 items-center justify-center overflow-auto p-3 sm:p-5"><img src={previewImage} alt="Evidence" className="max-h-[calc(92vh-84px)] max-w-full rounded-lg object-contain" /></div>
          </div>
        </div>
      )}
    </div>
  );
}