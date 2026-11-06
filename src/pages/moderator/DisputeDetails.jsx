import { useState, useEffect, Fragment } from 'react';
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

// ─── PARSERS FOR BOOKING CARDS & REPLIES ───
const BOOKING_PREFIX = '__BOOKING_REQUEST__::';
const REPLY_PREFIX = '__REPLY__:';
const REPLY_SUFFIX = '::__\n';

function parseBookingRequest(content) {
  if (!content || !content.startsWith(BOOKING_PREFIX)) return null;
  try {
    const json = content.slice(BOOKING_PREFIX.length);
    return JSON.parse(json); 
  } catch { return null; }
}

function parseReply(content) {
  if (!content || !content.startsWith(REPLY_PREFIX)) return null;
  try {
    const end = content.indexOf(REPLY_SUFFIX);
    if (end === -1) return null;
    const json = content.slice(REPLY_PREFIX.length, end);
    return JSON.parse(json); 
  } catch { return null; }
}

function stripReplyPrefix(content) {
  if (!content) return content;
  const end = content.indexOf(REPLY_SUFFIX);
  if (end === -1) return content;
  return content.slice(end + REPLY_SUFFIX.length);
}

// ─── TIME DIVIDER UI ───
const ChatDivider = ({ label }) => (
  <div className="my-5 flex items-center gap-3 select-none">
    <div className="h-px flex-1 bg-gray-200" />
    <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-semibold tracking-wide text-gray-500 shadow-sm">{label}</span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
);

// ─── DESIGN-ONLY HELPERS (same look as the Report review page) ───
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

// Avatar image with an initial as fallback.
function Avatar({ url, name, fallback = 'U', className }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden font-semibold ${className}`}>
      {url
        ? <img src={url} alt="" className="h-full w-full object-cover" />
        : (name?.charAt(0) || fallback).toUpperCase()}
    </span>
  );
}

// Detail modal shell. Escape is already handled by the page, so this only renders the frame.
function CaseDetailsModal({ title, eyebrow = 'Moderator review', onClose, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-[650] grid place-items-center bg-gray-950/65 p-2.5 font-sans backdrop-blur-sm sm:p-5"
    >
      <section className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[22px] border border-white/80 bg-[#faf9f6] shadow-[0_28px_90px_rgba(15,23,42,0.32)]">
        <div className="h-1 shrink-0 bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-400" aria-hidden="true" />
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200/90 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 shadow-sm">
              <ModeratorIcon name="report" size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">Case materials <span className="px-1 text-gray-300">/</span> {eyebrow}</p>
              <h2 className="mt-1 truncate text-lg font-semibold leading-tight tracking-tight text-gray-950 sm:text-xl">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-white hover:text-gray-900 ${FOCUS_RING}`}
          ><ModeratorIcon name="close" size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f2ee] px-3.5 py-5 sm:px-7 sm:py-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin]">
          <div className="mx-auto max-w-3xl space-y-5 font-sans text-gray-700">{children}</div>
        </div>
      </section>
    </div>
  );
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
  const [selectedBookingData, setSelectedBookingData] = useState(null); 
  
  const [bookingSkillDetails, setBookingSkillDetails] = useState({ 
    description: '', 
    outcomes: '', 
    category: '',
    format: '',
    duration: '',
    loading: false 
  }); 

  // ── Resolution Modal State ──
  const [resolutionModal, setResolutionModal] = useState({ isOpen: false, decision: null });
  const [disciplinaryAction, setDisciplinaryAction] = useState('standard'); 

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setPreviewImage(null);
        setSelectedBookingData(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewImage, selectedBookingData]);

  useEffect(() => {
    const fetchSkillDetails = async () => {
      if (selectedBookingData?.skill_id) {
        setBookingSkillDetails(prev => ({ ...prev, loading: true }));
        const { data } = await supabase
          .from('skills')
          .select('description, outcomes, category, format, duration')
          .eq('id', selectedBookingData.skill_id)
          .maybeSingle();
        
        if (data) {
          setBookingSkillDetails({ 
            description: data.description || 'No description provided.', 
            outcomes: data.outcomes || 'No outcomes listed.', 
            category: data.category || 'Uncategorized',
            format: data.format || 'N/A',
            duration: data.duration || 'N/A',
            loading: false 
          });
        } else {
          setBookingSkillDetails({ 
            description: 'Description unavailable.', 
            outcomes: 'Outcome unavailable.', 
            category: 'N/A', format: 'N/A', duration: 'N/A',
            loading: false 
          });
        }
      }
    };
    fetchSkillDetails();
  }, [selectedBookingData]);

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

  const openResolutionModal = (decision) => {
    if (isParticipant) { alert('Action blocked: Conflict of interest policy prohibits self-adjudication.'); return; }
    setDisciplinaryAction('standard'); 
    setResolutionModal({ isOpen: true, decision });
  };

  const finalizeResolution = async () => {
    const decision = resolutionModal.decision;
    setResolutionModal({ isOpen: false, decision: null });
    setIsProcessing(true);

    try {
      const winnerId = decision === 'Learner' ? session.student_id : session.instructor_id;
      const loserId = decision === 'Learner' ? session.instructor_id : session.student_id;
      
      const newSessionStatus = decision === 'Learner' ? 'cancelled' : 'completed';
      const adjustmentAmount = Number(session.credit_amount || 0);

      const { error: balanceErr } = await supabase.rpc('process_escrow_refund', { 
        target_user_id: winnerId, 
        amount: adjustmentAmount 
      });
      if (balanceErr) throw balanceErr;

      const { error: sessionUpdateErr } = await supabase.from('sessions').update({ status: newSessionStatus }).eq('id', session.id);
      if (sessionUpdateErr) throw sessionUpdateErr;

      const autoNote = getDisputeAutoNote(disciplinaryAction);
      const timestamp = new Date().toLocaleString();
      
      if (disciplinaryAction === 'warning') {
        await supabase.rpc('issue_penalty', { target_id: loserId, strike_to_add: 1, penalty_hours: 0, penalty_type: 'booking' });
      } else if (disciplinaryAction === 'penalty') {
        await supabase.rpc('issue_penalty', { target_id: loserId, strike_to_add: 1, penalty_hours: 12, penalty_type: 'booking' });
      }

      // ─── REPEAT OFFENDERS & ADMIN ESCALATIONS INTEGRATION (WITH MODERATOR_ID) ───
      if (disciplinaryAction === 'warning' || disciplinaryAction === 'penalty' || disciplinaryAction === 'escalate') {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('violation_count')
          .eq('id', loserId)
          .single();

        if (profileData) {
          const currentCount = profileData.violation_count || 0;

          if (currentCount >= 3) {
            const { data: existingOffender } = await supabase
              .from('repeat_offenders')
              .select('id')
              .eq('user_id', loserId)
              .maybeSingle();

            let repeatOffenderId = existingOffender?.id;

            if (!existingOffender) {
              const { data: newOffender, error: insertOffenderErr } = await supabase
                .from('repeat_offenders')
                .insert([{ user_id: loserId, moderator_id: currentUserId }])
                .select('id')
                .single();

              if (!insertOffenderErr && newOffender) {
                repeatOffenderId = newOffender.id;
              }
            }

            if (disciplinaryAction === 'escalate') {
              await supabase
                .from('admin_escalations')
                .insert([{
                  user_id: loserId,
                  repeat_offender_id: repeatOffenderId,
                  status: 'pending'
                }]);
            }
          }
        }
      }
      // ────────────────────────────────────────────────────────

      const newReportStatus = 'resolved';
      const updatedDetails = `${report.details}\n\n[RESOLVED - FAVOR ${decision.toUpperCase()} on ${timestamp}]: ${autoNote}`;
      
      const { error: reportUpdateErr } = await supabase.from('reports').update({ status: newReportStatus, details: updatedDetails, mod_action_notes: autoNote }).eq('id', report.id);
      if (reportUpdateErr) throw reportUpdateErr;

      const logDetails = decision === 'Learner'
        ? `Refunded ${adjustmentAmount} credits to Learner. Penalty applied to Instructor: ${disciplinaryAction.toUpperCase()}.`
        : `Released ${adjustmentAmount} credits to Instructor. Penalty applied to Learner: ${disciplinaryAction.toUpperCase()}.`;

      await supabase.from('mod_logs').insert([{ moderator_id: currentUserId, target_user_id: loserId, action_type: 'RESOLVE_DISPUTE', reference_id: report.id, details: logDetails }]);

      const tutorialTitle = session.skill?.title || 'Skill Session';
      
      await supabase.from('notifications').insert([{
        user_id: winnerId,
        type: 'dispute_resolved',
        content: `The dispute for session '${tutorialTitle}' has been resolved in your favor. The escrowed credits have been securely transferred to your wallet.`,
        link_url: `/sessions?session=${session.id}`
      }]);

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

  if (loading) {
    return (
      <div className="space-y-6 font-sans text-gray-700" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading case documentation</span>
        <div className="animate-pulse space-y-3" aria-hidden="true">
          <span className="block h-3 w-24 rounded bg-gray-200" />
          <span className="block h-7 w-72 max-w-full rounded bg-gray-200" />
          <span className="block h-5 w-56 max-w-full rounded bg-gray-100" />
        </div>
        <div className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-white" aria-hidden="true" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" aria-hidden="true">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-white" />
            <div className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          </div>
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white" />
            <div className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!report || !session) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
          <ModeratorIcon name="report" size={20} />
        </span>
        <p className="mt-3 text-sm font-semibold text-gray-900">Record not found</p>
        <p className="mb-5 mt-1 text-xs text-gray-500">This dispute ticket or its associated session reference does not exist in the database.</p>
        <Link to="/moderator/disputes" className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}>
          <ModeratorIcon name="arrow" size={14} className="rotate-180" /> Return to disputes
        </Link>
      </div>
    );
  }

  const isReporterStudent = report.reporter_id === session.student_id;

  // ── Display-only values (no new data is fetched) ──
  const isPending = report.status === 'pending';
  const assignedLabel = report.assigned_to
    ? (report.assigned_to === currentUserId ? 'You' : report.assignee?.full_name || 'Another moderator')
    : 'Unassigned';
  const progressSteps = [
    {
      label: 'Filed',
      done: true,
      detail: report.created_at ? new Date(report.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'On record',
    },
    {
      label: 'Claimed',
      done: Boolean(report.assigned_to),
      detail: report.assigned_to ? `By ${assignedLabel}` : 'Waiting for a moderator',
    },
    {
      label: 'Decision',
      done: !isPending,
      detail: !isPending ? 'Resolved' : 'Not decided yet',
    },
  ];
  const currentStepIndex = progressSteps.findIndex(step => !step.done);
  const cardClass = 'rounded-2xl border border-gray-200 bg-white shadow-sm';

  return (
    <div className="-mt-2 mx-auto w-full max-w-5xl space-y-6 font-sans antialiased text-gray-700">

      {/* ── STREAMLINED CASE HEADER ── */}
      <header className="border-b border-gray-200 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-[28px]">Dispute review</h1>
            <p className="mt-1 text-sm text-gray-500">{session.skill?.title || 'Session booking'} · Review the session record and escrow outcome.</p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold tracking-wide text-gray-600">
            <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Case ID</span>
            #{report.id.slice(0, 8)}
          </span>
        </div>
      </header>

      {isParticipant && (
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-rose-500 bg-rose-50 px-4 py-3.5 text-sm text-rose-900" role="alert">
          <ModeratorIcon name="alert" size={16} className="mt-0.5 text-rose-600" />
          <span><span className="font-semibold">Self-adjudication restriction:</span> You are registered as an active participant ({currentUserId === session.student_id ? 'Learner' : 'Instructor'}) in this session. Case controls have been locked to maintain institutional impartiality.</span>
        </div>
      )}

      {/* ── CASE SPINE + EVIDENCE READER ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-7">

        {/* Case spine: escrow, progress, and the people in the session. */}
        <aside className="order-2 space-y-3 lg:order-1 lg:sticky lg:top-28 lg:self-start">
          <section aria-label="Case identity" className={`${cardClass} overflow-hidden`}>
            <div className="border-l-4 border-emerald-700 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Escrow held</p>
              <p className="mt-2.5 text-xl font-semibold tracking-tight text-gray-950">{session.credit_amount} <span className="text-xs font-bold text-emerald-700">CR</span></p>
              <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isPending ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{report.status}</span>
            </div>

            <div className="border-t border-gray-100 px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Case owner</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{assignedLabel}</p>
                </div>
                <span className={`h-2 w-2 shrink-0 rounded-full ${report.assigned_to ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500">{report.assigned_to ? 'Ticket in custody' : 'Open for any moderator'}</p>
            </div>
          </section>

          <section aria-label="Case progress" className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold text-gray-900">Case progress</h2>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Lifecycle</span>
            </div>
            <ol className="ml-2 mt-4 space-y-4 border-l border-gray-200 pl-5">
              {progressSteps.map((step, index) => {
                const isCurrent = index === currentStepIndex;
                return (
                  <li key={step.label} className="relative min-w-0" aria-current={isCurrent ? 'step' : undefined}>
                    <span className={`absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      step.done ? 'border-emerald-700 bg-emerald-700 text-white' : isCurrent ? 'border-emerald-600 bg-white ring-4 ring-emerald-50' : 'border-gray-300 bg-white'
                    }`}>
                      {step.done && <ModeratorIcon name="check" size={10} />}
                    </span>
                    <p className={`text-xs font-semibold ${step.done || isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>{step.label}</p>
                    <p className="mt-0.5 break-words text-[11px] leading-4 text-gray-500">{step.detail}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-label="Session participants" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div>
              <p className="text-xs font-semibold text-gray-900">People in this session</p>
              <p className="mt-0.5 text-[11px] text-gray-500">Learner and instructor</p>
            </div>
            <div className="mt-3 space-y-3">
              {[
                { role: 'Learner', person: session.student, isReporter: isReporterStudent, completed: session.student_completed },
                { role: 'Instructor', person: session.instructor, isReporter: !isReporterStudent, completed: session.instructor_completed },
              ].map((participant) => (
                <article key={participant.role} className="flex min-w-0 items-start gap-2.5 border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
                  <Avatar
                    url={participant.person?.avatar_url}
                    name={participant.person?.full_name}
                    className="h-9 w-9 rounded-full border border-gray-200 bg-gray-100 text-sm text-gray-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[13px] font-semibold text-gray-900">{participant.person?.full_name || `${participant.role} not available`}</p>
                      {participant.isReporter && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Reporter</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500">{participant.role}</p>
                    <span className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold ${participant.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      <ModeratorIcon name={participant.completed ? 'check' : 'clock'} size={12} /> {participant.completed ? 'Completed' : 'Not completed'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>

        {/* Evidence reader: the session record first, then the filing, then the decision. */}
        <main className="order-1 min-w-0 space-y-7 lg:order-2">
          <section aria-labelledby="conversation-heading" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">01 / Session record</p>
                <h2 id="conversation-heading" className="mt-1 text-lg font-semibold tracking-tight text-gray-950">Session conversation</h2>
              </div>
              <span className="text-[11px] tabular-nums text-gray-400">{messages.length} {messages.length === 1 ? 'message' : 'messages'} · Messages and evidence shared in this session</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="max-h-[560px] space-y-4 overflow-y-auto bg-[#f3f2ee] p-3.5 sm:p-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] lg:max-h-[680px]">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400"><ModeratorIcon name="report" size={20} /></span>
                <p className="mt-3 text-sm font-semibold text-gray-900">No session messages</p>
                <p className="mt-1 text-xs text-gray-500">No chat messages or attachments were recorded for this session.</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isStudentSender = msg.sender_id === session.student_id;
                const isInstructorSender = msg.sender_id === session.instructor_id;

                const bookingData = parseBookingRequest(msg.content);
                const replyData = parseReply(msg.content);
                const bodyText = replyData ? stripReplyPrefix(msg.content) : msg.content;

                const prevMsg = messages[i - 1];
                const thisDate = new Date(msg.created_at);
                let dividerLabel = null;
                
                if (!prevMsg || thisDate.toDateString() !== new Date(prevMsg.created_at).toDateString()) {
                  dividerLabel = thisDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                } else if (thisDate - new Date(prevMsg.created_at) > 60 * 60 * 1000) {
                  dividerLabel = thisDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                return (
                  <Fragment key={msg.id}>
                    {dividerLabel && <ChatDivider label={dividerLabel} />}
                    
                    <div className={`flex w-full items-end gap-2.5 text-sm sm:gap-3 ${isInstructorSender ? 'flex-row-reverse' : ''}`}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-white text-xs font-semibold text-gray-700 shadow-sm">
                        {msg.sender?.avatar_url ? <img src={msg.sender.avatar_url} alt="" className="w-full h-full object-cover" /> : msg.sender?.full_name?.charAt(0) || 'U'}
                      </div>

                      <div className={`flex w-fit max-w-[86%] min-w-0 flex-col ${isInstructorSender ? 'items-end' : 'items-start'}`}>
                        <div className={`mb-1 flex flex-wrap items-center gap-2 px-1 ${isInstructorSender ? 'justify-end text-right' : 'justify-start'}`}>
                          <span className="text-[12px] font-semibold tracking-tight text-gray-800">{msg.sender?.full_name || 'User'}</span>
                          {isStudentSender && <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">Learner</span>}
                          {isInstructorSender && <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">Teacher</span>}
                          <time className="text-[10px] tabular-nums text-gray-400">{new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                        </div>
                        
                        <div className={`space-y-2.5 rounded-2xl border p-3 text-sm leading-relaxed text-gray-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-3.5 ${isInstructorSender ? 'rounded-br-md border-emerald-200/90 bg-[#e8f1eb]' : 'rounded-bl-md border-gray-200 bg-white'}`}>
                          
                          {replyData && (
                            <div className="mb-2 flex flex-col rounded-md border-l-2 border-gray-400 bg-black/[0.035] px-3 py-2 text-xs text-gray-500">
                               <span className="font-bold mb-0.5 text-gray-600">Replying to {replyData.name}</span>
                               <span className="truncate">{replyData.snippet || 'Image'}</span>
                            </div>
                          )}

                          {bookingData ? (
                            <div 
                              onClick={() => setSelectedBookingData(bookingData)}
                              className="w-full max-w-sm cursor-pointer overflow-hidden rounded-xl border border-amber-200 bg-amber-50 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
                            >
                              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-1.5 bg-amber-500">
                                <ModeratorIcon name="calendar" size={14} />
                                Booking Request (Click to view)
                              </div>
                              <div className="p-3 flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                  {bookingData.image ? (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-black/5 bg-gray-100">
                                      <img src={bookingData.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg shrink-0 border border-black/5 bg-amber-100 flex items-center justify-center text-amber-500">
                                      <ModeratorIcon name="calendar" size={20} />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-[13px] leading-tight truncate text-amber-950">{bookingData.title}</p>
                                    <p className="text-[10px] font-semibold mt-1 text-amber-700">
                                      {new Date(bookingData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {bookingData.time}
                                    </p>
                                    <p className="text-[11px] font-bold mt-0.5 text-amber-800">
                                      {bookingData.cost} CR
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {(bookingData ? bookingData.userMsg : bodyText) && (
                            <p className="whitespace-pre-wrap">{bookingData ? bookingData.userMsg : bodyText}</p>
                          )}
                          
                          {msg.file_url && (
                            <div className="pt-2 border-t border-gray-100">
                              {msg.file_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.file_url) ? (
                                <div className="inline-flex flex-col items-start gap-1.5">
                                  <button type="button" onClick={() => setPreviewImage(msg.file_url)} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-emerald-300"><img src={msg.file_url} alt="Evidence" loading="lazy" className="max-h-56 max-w-full object-contain hover:opacity-90" /></button>
                                </div>
                              ) : (
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"><span>Download File Attachment</span></a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })
            )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            <section aria-labelledby="filed-statement-heading" className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 px-3.5 py-3 sm:px-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">02 / Submitted report</p>
                  <h2 id="filed-statement-heading" className="mt-1 text-lg font-semibold tracking-tight text-gray-950">Filed statement</h2>
                </div>
              </div>

              <dl>
                <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="px-3.5 py-3 sm:px-4">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Reason</dt>
                    <dd className="mt-1.5 break-words text-sm font-semibold text-gray-900">{report.reason || 'Not specified'}</dd>
                  </div>
                  <div className="px-3.5 py-3 sm:px-4">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Scheduled session</dt>
                    <dd className="mt-1.5 break-words text-sm font-semibold text-gray-900">{session.scheduled_date || 'Date unavailable'}{session.scheduled_time ? ` · ${session.scheduled_time}` : ''}</dd>
                  </div>
                </div>
                <div className="border-t border-gray-100 bg-[#faf9f6] px-3.5 py-3 sm:px-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Reporter’s account</dt>
                  <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{report.details || 'No additional details were provided.'}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="escrow-decision-heading" className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 px-3.5 py-3 sm:px-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">03 / Moderator response</p>
                  <h2 id="escrow-decision-heading" className="mt-1 text-lg font-semibold tracking-tight text-gray-950">Escrow decision</h2>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isPending ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{isPending ? 'Awaiting decision' : 'Closed'}</span>
              </div>
              <div className="p-3.5 sm:p-4">
                {isParticipant ? (
                  <p className="text-xs leading-5 text-gray-500">You cannot decide this case because you are a session participant.</p>
                ) : report.status === 'pending' ? (
                  !report.assigned_to ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">This case is waiting for an owner.</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">This case is unassigned. Claim it to record the escrow decision.</p>
                      </div>
                      <button onClick={handleClaim} disabled={isProcessing} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>{isProcessing ? 'Claiming Case...' : 'Claim Case'} <ModeratorIcon name="arrow" size={14} /></button>
                    </div>
                  ) : report.assigned_to === currentUserId ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Choose an outcome</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">Choose who should receive the <span className="font-semibold text-gray-800">{session.credit_amount} credits</span> held in escrow.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <button type="button" onClick={() => openResolutionModal('Learner')} disabled={isProcessing} className={`flex min-h-[44px] items-center justify-between gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100/70 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <ModeratorIcon name="arrow" size={16} className="rotate-180" />
                            <span><span className="block">Refund Learner</span><span className="block text-[11px] font-medium text-emerald-700">Return credits to {session.student?.full_name?.split(' ')[0] || 'student'}</span></span>
                          </span>
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{session.credit_amount} CR</span>
                        </button>

                        <button type="button" onClick={() => openResolutionModal('Teacher')} disabled={isProcessing} className={`flex min-h-[44px] items-center justify-between gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <ModeratorIcon name="arrow" size={16} />
                            <span><span className="block">Release to Instructor</span><span className="block text-[11px] font-medium text-gray-500">Payout to {session.instructor?.full_name?.split(' ')[0] || 'teacher'}</span></span>
                          </span>
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-500">{session.credit_amount} CR</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 px-3.5 py-3 text-xs leading-5 text-gray-600">
                      <ModeratorIcon name="users" size={16} className="mt-0.5 text-gray-400" />
                      <span>Assigned to <span className="font-semibold text-gray-800">{report.assignee?.full_name || 'another moderator'}</span>. This case is read-only for you.</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold leading-5 text-emerald-800">
                    <ModeratorIcon name="check" size={16} className="mt-0.5 text-emerald-700" />
                    <span>This dispute is settled and the escrow transaction has been recorded.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ── DISCIPLINARY ACTION MODAL ── */}
      {resolutionModal.isOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="resolution-title" className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-950/65 p-3 font-sans backdrop-blur-sm sm:p-5">
          <div className="w-full max-w-lg overflow-hidden rounded-[22px] border border-white/80 bg-[#faf9f6] shadow-[0_28px_90px_rgba(15,23,42,0.32)]">
            <div className="h-1 shrink-0 bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-400" aria-hidden="true" />
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 shadow-sm">
                  <ModeratorIcon name="wallet" size={20} />
                </span>
                <h3 id="resolution-title" className="text-lg font-semibold leading-tight tracking-tight text-gray-950">Finalize escrow resolution</h3>
              </div>
              <p className="text-sm leading-6 text-gray-600">You are resolving the dispute in favor of the <span className="font-semibold text-gray-900">{resolutionModal.decision}</span>. The {session.credit_amount} credits will be safely transferred to their wallet.</p>

              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Disciplinary action against losing party</p>

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${disciplinaryAction === 'standard' ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input type="radio" name="discipline" value="standard" checked={disciplinaryAction === 'standard'} onChange={() => setDisciplinaryAction('standard')} className="mt-0.5 h-4 w-4 cursor-pointer border-gray-300 accent-emerald-700" />
                  <div>
                    <span className="block text-[13px] font-semibold text-gray-900">Standard Resolution</span>
                    <span className="mt-0.5 block text-[11px] text-gray-500">Transfer funds only. No penalty or strike applied.</span>
                  </div>
                </label>

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${disciplinaryAction === 'warning' ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input type="radio" name="discipline" value="warning" checked={disciplinaryAction === 'warning'} onChange={() => setDisciplinaryAction('warning')} className="mt-0.5 h-4 w-4 cursor-pointer border-gray-300 accent-amber-600" />
                  <div>
                    <div className="flex items-center gap-2"><span className="block text-[13px] font-semibold text-amber-900">Issue Formal Warning</span><span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">+1 Strike</span></div>
                    <span className="mt-0.5 block text-[11px] text-amber-700/80">For unprofessional conduct or minor policy violations.</span>
                  </div>
                </label>

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${disciplinaryAction === 'penalty' ? 'border-orange-400 bg-orange-50/50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input type="radio" name="discipline" value="penalty" checked={disciplinaryAction === 'penalty'} onChange={() => setDisciplinaryAction('penalty')} className="mt-0.5 h-4 w-4 cursor-pointer border-gray-300 accent-orange-600" />
                  <div>
                    <div className="flex items-center gap-2"><span className="block text-[13px] font-semibold text-orange-900">Apply 12h Booking Timeout</span><span className="rounded bg-orange-100 px-1.5 text-[10px] font-bold text-orange-700">+1 Strike</span></div>
                    <span className="mt-0.5 block text-[11px] text-orange-700/80">For fraudulent activity, severe unprofessionalism, or no-shows.</span>
                  </div>
                </label>

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${disciplinaryAction === 'escalate' ? 'border-rose-400 bg-rose-50/50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input type="radio" name="discipline" value="escalate" checked={disciplinaryAction === 'escalate'} onChange={() => setDisciplinaryAction('escalate')} className="mt-0.5 h-4 w-4 cursor-pointer border-gray-300 accent-rose-600" />
                  <div>
                    <div className="flex items-center gap-2"><span className="block text-[13px] font-semibold text-rose-900">Escalate to Admin</span></div>
                    <span className="mt-0.5 block text-[11px] text-rose-700/80">For repeated escrow abuse requiring permanent ban review.</span>
                  </div>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-200/80 bg-white/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={() => setResolutionModal({ isOpen: false, decision: null })} className={`rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:min-w-28 ${FOCUS_RING}`}>Cancel</button>
                <button type="button" onClick={finalizeResolution} className={`rounded-xl bg-emerald-700 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 sm:min-w-40 ${FOCUS_RING}`}>Confirm release</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SKILL DETAILS ── */}
      {selectedBookingData && (
        <CaseDetailsModal title="Skill details" eyebrow="Booking request" onClose={() => setSelectedBookingData(null)}>
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {selectedBookingData.image && (
              <div className="h-40 w-full overflow-hidden border-b border-gray-100 bg-gray-100">
                <img src={selectedBookingData.image} alt="Skill cover" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <h3 className="text-xl font-semibold leading-tight tracking-tight text-gray-950">{selectedBookingData.title}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {bookingSkillDetails.loading ? '...' : bookingSkillDetails.category}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {bookingSkillDetails.loading ? '...' : bookingSkillDetails.format}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  <ModeratorIcon name="clock" size={12} />
                  {bookingSkillDetails.loading ? '...' : bookingSkillDetails.duration}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">Description</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {bookingSkillDetails.loading ? 'Loading description...' : bookingSkillDetails.description}
              </p>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">Outcomes</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {bookingSkillDetails.loading ? 'Loading outcomes...' : bookingSkillDetails.outcomes}
              </p>
            </div>
          </section>
        </CaseDetailsModal>
      )}

      {/* ── MODAL: IMAGE VIEWER ── */}
      {previewImage && (
        <div role="dialog" aria-modal="true" aria-label="Image viewer" onClick={event => event.target === event.currentTarget && setPreviewImage(null)} className="fixed inset-0 z-[700] flex flex-col bg-[#111916] p-3 font-sans text-white sm:p-5 lg:p-6">
          <header className="mx-auto flex w-full max-w-[1440px] shrink-0 items-center justify-between gap-4 border-b border-white/10 px-1 pb-4 sm:px-2 sm:pb-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-emerald-200 shadow-sm">
                <ModeratorIcon name="report" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">Evidence viewer</p>
                <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-white sm:text-base">Session attachment</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <button type="button" onClick={() => setPreviewImage(null)} aria-label="Close image viewer" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-gray-200 transition-all hover:border-white/20 hover:bg-white/[0.14] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><ModeratorIcon name="close" size={20} /></button>
            </div>
          </header>
          <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 items-center justify-center gap-2.5 py-4 sm:gap-5 sm:py-5 lg:gap-7">
            <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-2 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:rounded-[22px] sm:p-4">
              <img src={previewImage} alt="Evidence" className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl" draggable="false" />
            </div>
          </div>
          <footer className="mx-auto flex w-full max-w-[1440px] shrink-0 items-center justify-between gap-3 border-t border-white/10 px-1 pt-3 text-xs sm:px-2 sm:pt-4">
            <p className="font-medium text-gray-300">Submitted evidence</p>
            <p className="hidden items-center gap-2 text-gray-500 sm:flex"><span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-gray-300">ESC</span> Close</p>
          </footer>
        </div>
      )}
    </div>
  );
}