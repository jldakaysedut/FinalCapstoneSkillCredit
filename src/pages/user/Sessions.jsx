───────────────────────────────────────────────────
// SESSIONS V4 — "Upcoming State" + Formal Start & Cancelled Chat
// ─────────────────────────────────────────────────────────────────

const STATUS_DOT = {
  pending:             { dot: 'bg-amber-400',   ring: 'ring-amber-100',   label: 'Pending',     text: 'text-amber-700',   chip: 'bg-amber-50 border-amber-200 text-amber-700',     bar: 'bg-gradient-to-r from-amber-300 to-yellow-300'   },
  reschedule_proposed: { dot: 'bg-purple-400',  ring: 'ring-purple-100',  label: 'Rescheduled', text: 'text-purple-700',  chip: 'bg-purple-50 border-purple-200 text-purple-700',  bar: 'bg-gradient-to-r from-purple-400 to-fuchsia-300' },
  upcoming:            { dot: 'bg-indigo-400',  ring: 'ring-indigo-100',  label: 'Upcoming',    text: 'text-indigo-700',  chip: 'bg-indigo-50 border-indigo-200 text-indigo-700',  bar: 'bg-gradient-to-r from-indigo-400 to-blue-300'    },
  active:              { dot: 'bg-sky-400',     ring: 'ring-sky-100',     label: 'Active',      text: 'text-sky-700',     chip: 'bg-sky-50 border-sky-200 text-sky-700',           bar: 'bg-gradient-to-r from-sky-400 to-cyan-300'       },
  completed:           { dot: 'bg-emerald-500', ring: 'ring-emerald-100', label: 'Completed',   text: 'text-emerald-700', chip: 'bg-emerald-50 border-emerald-200 text-emerald-700', bar: 'bg-gradient-to-r from-emerald-400 to-teal-300'   },
  cancelled:           { dot: 'bg-gray-300',    ring: 'ring-gray-100',    label: 'Cancelled',   text: 'text-gray-400',    chip: 'bg-gray-50 border-gray-200 text-gray-500',        bar: 'bg-gradient-to-r from-gray-200 to-gray-100'      },
  disputed:            { dot: 'bg-rose-400',    ring: 'ring-rose-100',    label: 'Disputed',    text: 'text-rose-700',    chip: 'bg-rose-50 border-rose-200 text-rose-700',        bar: 'bg-gradient-to-r from-rose-400 to-red-300'       },
};

const STATUS_TABS = ['All', 'Pending', 'Upcoming', 'Active', 'Completed', 'Cancelled', 'Disputed'];

function getSafeDateObj(dateStr, timeStr) {
  if (!dateStr || !timeStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes]   = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function getGroup(dateStr, timeStr) {
  const now  = new Date();
  const date = getSafeDateObj(dateStr, timeStr);
  const diffDays = (now - date) / 86400000;
  if (diffDays < 1)  return 'Today';
  if (diffDays < 7)  return 'This Week';
  if (diffDays < 30) return 'This Month';
  return 'Earlier';
}

const GROUP_ORDER = ['Today', 'This Week', 'This Month', 'Earlier'];

function parseDurationToMs(durationStr) {
  if (!durationStr) return 0;
  const str = durationStr.toLowerCase();
  if (str.includes('min'))  return (parseInt(str) || 0) * 60 * 1000;
  if (str.includes('hr') || str.includes('hour')) return (parseInt(str) || 0) * 3600 * 1000;
  return 0;
}

export default function Sessions() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sessions,           setSessions]           = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [processingId,       setProcessingId]       = useState(null);
  const [currentUserId,      setCurrentUserId]      = useState(null);
  const [roleFilter,         setRoleFilter]         = useState('All');
  const [statusTab,          setStatusTab]          = useState('All');
  const [expandedId,         setExpandedId]         = useState(null);
  
  const [highlightedSessionId, setHighlightedSessionId] = useState(null);

  const [proposeModal,         setProposeModal]         = useState({ isOpen: false, session: null });
  const [newDate,              setNewDate]              = useState('');
  const [newTime,              setNewTime]              = useState('');
  const [isSubmittingPropose,  setIsSubmittingPropose]  = useState(false);

  const [ratingModal,        setRatingModal]        = useState({ isOpen: false, session: null });
  const [ratings,            setRatings]            = useState({ overall: 0, clarity: 0, patience: 0, relevance: 0, professionalism: 0 });
  const [feedback,           setFeedback]           = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  
  const [reportModal,        setReportModal]        = useState({ isOpen: false, session: null });
  const [reportReason,       setReportReason]       = useState('No-Show / Unresponsive');
  const [reportDetails,      setReportDetails]      = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [submittedReports,   setSubmittedReports]   = useState([]);

  const [disputeModal,       setDisputeModal]       = useState({ isOpen: false, session: null, reportInfo: null });

  const focusSessionId = new URLSearchParams(location.search).get('session');

  useEffect(() => {
    let channel = null;
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);
      await fetchSessions(user.id);
      await fetchUserReports(user.id);
      
      channel = supabase.channel('sessions_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
          fetchSessions(user.id);
          if (payload.new && (payload.new.status === 'cancelled' || payload.new.status === 'completed')) {
            window.dispatchEvent(new Event('credit_updated'));
          }
        }).subscribe();
    };
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [navigate]);

  useEffect(() => {
    if (!focusSessionId || loading || sessions.length === 0) return;

    const targetSession = sessions.find(s => s.id === focusSessionId);
    if (targetSession) {
      setStatusTab('All');
      setRoleFilter('All');
      setExpandedId(focusSessionId);
      setHighlightedSessionId(focusSessionId);

      let attempts = 0;
      const scrollInterval = setInterval(() => {
        const el = document.getElementById(`session-${focusSessionId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          clearInterval(scrollInterval);
        }
        attempts++;
        if (attempts > 15) clearInterval(scrollInterval);
      }, 100);

      const glowTimer = setTimeout(() => {
        setHighlightedSessionId(null);
        navigate('/sessions', { replace: true });
      }, 4000);

      return () => {
        clearInterval(scrollInterval);
        clearTimeout(glowTimer);
      };
    }
  }, [focusSessionId, loading, sessions.length, navigate]);

  const fetchSessions = async (userId) => {
    const uid = userId || currentUserId;
    if (!uid) return;
    const { data, error } = await supabase
      .from('sessions')
      .select(`*, skill:skills(duration,title,format), student:user_profiles!student_id(id,full_name,avatar_url), instructor:user_profiles!instructor_id(id,full_name,avatar_url)`)
      .or(`student_id.eq.${uid},instructor_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    if (!error) setSessions(data || []);
    setLoading(false);
  };

  const fetchUserReports = async (userId) => {
    const { data } = await supabase.from('reports')
      .select('reference_id')
      .or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)
      .eq('reference_type', 'session')
      .neq('status', 'resolved');
    if (data) setSubmittedReports(data.map(r => r.reference_id));
  };

  const handleUpdateStatus = async (session, action) => {
    setProcessingId(session.id);
    try {
      if (action === 'cancel' || action === 'decline' || action === 'cancel_no_show') {
        // One server-side transaction: verify participants/status, lock the session,
        // cancel it and refund the learner exactly once. Do not refund via browser.
        const { data: cancellationResult, error: cancellationError } = await supabase.rpc(
          'skillcredit_secure_cancel_session',
          { p_session_id: session.id, p_action: action }
        );
        if (cancellationError) throw cancellationError;
        if (cancellationResult?.state === 'already_cancelled') {
          // Older cancellations may have missed a refund. Replaying one here could
          // also duplicate a real refund. Do not assume an old refund occurred.
          alert('This session was already cancelled. If the credits did not return, contact support for a wallet review.');
          await fetchSessions(currentUserId);
          return;
        }
        if (cancellationResult?.state !== 'cancelled' || cancellationResult?.refunded !== true) {
          throw new Error('Refund could not be verified. Please refresh and contact support.');
        }
        window.dispatchEvent(new Event('credit_updated'));

        // Inform the other participant about normal cancellations/declines.
        // Preserve the existing no-show notification and refund/status behavior.
        if (!cancellationError && action !== 'cancel_no_show') {
          const isTeacherAction = session.instructor_id === currentUserId;
          const recipientId = isTeacherAction ? session.student_id : session.instructor_id;
          const actorName = isTeacherAction
            ? session.instructor?.full_name || 'Your teacher'
            : session.student?.full_name || 'Your learner';
          const sessionLabel = session.skill?.title ? ` for "${session.skill.title}"` : '';
          let noticeContent;

          if (action === 'decline' && session.status === 'pending') {
            noticeContent = `${actorName} declined your booking request${sessionLabel}. The booking has been cancelled. Please check your wallet for the credit refund.`;
          } else if (action === 'decline') {
            noticeContent = `${actorName} cancelled your booking${sessionLabel} after proposing a new time. Please check your wallet for the credit refund.`;
          } else if (session.status === 'reschedule_proposed' && !isTeacherAction) {
            noticeContent = `${actorName} declined the proposed schedule and cancelled the booking${sessionLabel}.`;
          } else if (session.status === 'upcoming' && isTeacherAction) {
            noticeContent = `${actorName} cancelled your upcoming session${sessionLabel}. Please check your wallet for the credit refund.`;
          } else if (session.status === 'upcoming') {
            noticeContent = `${actorName} cancelled the upcoming session${sessionLabel}.`;
          } else if (session.status === 'pending') {
            noticeContent = `${actorName} cancelled the booking request${sessionLabel}.`;
          } else {
            noticeContent = `${actorName} cancelled the session${sessionLabel}.`;
          }

          if (recipientId && recipientId !== currentUserId) {
            const { error: noticeError } = await supabase.from('notifications').insert([{
              user_id: recipientId,
              type: 'session_cancelled',
              content: noticeContent,
              link_url: `/sessions?session=${session.id}`
            }]);
            if (noticeError) console.error('Session cancellation notification failed:', noticeError);
          }
        }

        if (action === 'cancel_no_show') {
          await supabase.from('notifications').insert([{
            user_id: session.instructor_id,
            type: 'session_cancelled',
            content: `Your session was cancelled and the credits were refunded to the learner due to inactivity (Missed Schedule).`,
            link_url: `/sessions?session=${session.id}`
          }]);
        }
      } 
      else if (action === 'accept_schedule') {
        await supabase.from('sessions').update({ status: 'upcoming' }).eq('id', session.id);
        
        const isInstructorAction = session.instructor_id === currentUserId;
        const targetUserId = isInstructorAction ? session.student_id : session.instructor_id;
        const actorName = isInstructorAction ? session.instructor?.full_name || 'The teacher' : session.student?.full_name || 'The learner';
        
        await supabase.from('notifications').insert([{
          user_id: targetUserId,
          type: 'booking_accepted', 
          content: `${actorName} has confirmed the schedule for the session. It is now upcoming!`,
          link_url: `/sessions?session=${session.id}`
        }]);
      } 
      else if (action === 'start_session') {
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        
        await supabase.from('sessions').update({ 
          status: 'active', 
          scheduled_date: dateStr, 
          scheduled_time: timeStr 
        }).eq('id', session.id);

        await supabase.from('notifications').insert([{
          user_id: session.student_id,
          type: 'session_started',
          content: `${session.instructor?.full_name || 'The teacher'} has started the session. The countdown has begun!`,
          link_url: `/sessions?session=${session.id}`
        }]);
      } 
      else if (action === 'mark_done') {
        if (!await confirmDialog('Mark session as done?')) { setProcessingId(null); return; }
        // Only this branch has changed. The database handles final credit award
        // and credits_awarded_at atomically, without touching dispute/refund logic.
        const { data: outcome, error: completionError } = await supabase.rpc('confirm_session_completion', {
          p_session_id: session.id
        });
        if (completionError) throw completionError;
        if (!outcome || !['waiting', 'completed'].includes(outcome.state)) {
          throw new Error('Unexpected completion response. Please refresh and check the session.');
        }

        const isInstructor = session.instructor_id === currentUserId;
        const targetUserId = isInstructor ? session.student_id : session.instructor_id;
        const actorName = isInstructor ? session.instructor?.full_name || 'The teacher' : session.student?.full_name || 'The learner';

        if (outcome.state === 'completed' && outcome.awarded === true) {
          window.dispatchEvent(new Event('credit_updated'));
          // Notification failure must NOT undo/retry a successful credit award.
          const { error: noticeError } = await supabase.from('notifications').insert([
            {
              user_id: session.student_id,
              type: 'session_completed',
              content: `Your session with ${session.instructor?.full_name || 'the teacher'} is officially completed!`,
              link_url: `/sessions?session=${session.id}`
            },
            {
              user_id: session.instructor_id,
              type: 'session_completed',
              content: `Your session with ${session.student?.full_name || 'the learner'} is officially completed! ${session.credit_amount} CR added.`,
              link_url: `/sessions?session=${session.id}`
            }
          ]);
          if (noticeError) console.error('Completion notification failed (credits already awarded):', noticeError);
        } else if (outcome.state === 'waiting' && outcome.new_confirmation === true) {
          const { error: noticeError } = await supabase.from('notifications').insert([{
            user_id: targetUserId,
            type: 'session_update',
            content: `${actorName} has marked the session as done. Please confirm to finalize the completion.`,
            link_url: `/sessions?session=${session.id}`
          }]);
          if (noticeError) console.error('Completion notification failed:', noticeError);
        }
      } else if (action === 'undo_done') {
        if (!await confirmDialog("Undo 'Mark as Done'?")) { setProcessingId(null); return; }
        const isInstructor = session.instructor_id === currentUserId;
        const { error: undoError } = await supabase.from('sessions').update(isInstructor ? { instructor_completed: false } : { student_completed: false }).eq('id', session.id);
        if (!undoError) {
          const recipientId = isInstructor ? session.student_id : session.instructor_id;
          const actorName = isInstructor
            ? session.instructor?.full_name || 'The teacher'
            : session.student?.full_name || 'The learner';
          if (recipientId && recipientId !== currentUserId) {
            const { error: noticeError } = await supabase.from('notifications').insert([{
              user_id: recipientId,
              type: 'session_update',
              content: `${actorName} withdrew their completion confirmation. The session now needs confirmation again.`,
              link_url: `/sessions?session=${session.id}`
            }]);
            if (noticeError) console.error('Completion undo notification failed:', noticeError);
          }
        }
      }
      fetchSessions(currentUserId);
    } catch (err) { console.error('Session transaction failed:', err); alert(`Error processing transaction: ${err?.message || 'Unknown error'}`); }
    finally { setProcessingId(null); }
  };

  const handleProposeTime = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;
    setIsSubmittingPropose(true);
    const s = proposeModal.session;
    try {
      const { data: proposedSession, error: proposalError } = await supabase.from('sessions').update({
        status: 'reschedule_proposed',
        scheduled_date: newDate,
        scheduled_time: newTime
      }).eq('id', s.id).select('id').maybeSingle();
      if (proposalError || !proposedSession) {
        throw proposalError || new Error('Proposed schedule was not saved.');
      }

      await supabase.from('notifications').insert([{
        user_id: s.student_id,
        type: 'session_disputed', 
        content: `Your Teacher proposed a new time for your session: ${newDate} at ${newTime}. Please Accept or Decline.`,
        link_url: `/sessions?session=${s.id}`
      }]);

      alert('New time proposed to the learner successfully!');
      setProposeModal({ isOpen: false, session: null });
      fetchSessions(currentUserId);
    } catch (error) {
      alert('Failed to propose new time.');
    } finally {
      setIsSubmittingPropose(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!Object.values(ratings).every(v => v > 0)) { alert('Please rate all categories.'); return; }
    setIsSubmittingRating(true);
    const s = ratingModal.session;
    try {
      await supabase.from('reviews').insert([{ session_id: s.id, skill_id: s.skill_id, instructor_id: s.instructor_id, student_id: s.student_id, rating: ratings.overall, q1_clarity: ratings.clarity, q2_patience: ratings.patience, q3_relevance: ratings.relevance, q4_professionalism: ratings.professionalism, feedback }]);
      await supabase.from('sessions').update({ is_rated: true }).eq('id', s.id);

      await supabase.from('notifications').insert([{
        user_id: s.instructor_id,
        type: 'new_rating',
        content: `${s.student?.full_name || 'A learner'} evaluated your session and left a rating!`,
        link_url: `/sessions?session=${s.id}`
      }]);

      setRatingModal({ isOpen: false, session: null });
      setRatings({ overall: 0, clarity: 0, patience: 0, relevance: 0, professionalism: 0 });
      setFeedback('');
      fetchSessions(currentUserId);
      alert('Evaluation submitted!');
    } catch { alert('Failed to submit.'); }
    finally { setIsSubmittingRating(false); }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportDetails.trim()) return;
    setIsSubmittingReport(true);
    const s = reportModal.session;
    const reportedUserId = s.instructor_id === currentUserId ? s.student_id : s.instructor_id;
    try {
      await supabase.from('reports').insert([{ reporter_id: currentUserId, reported_user_id: reportedUserId, reason: reportReason, details: reportDetails, reference_type: 'session', reference_id: s.id }]);
      await supabase.from('sessions').update({ status: 'disputed' }).eq('id', s.id);
      
      const isInstructorAction = s.instructor_id === currentUserId;
      const targetUserId = isInstructorAction ? s.student_id : s.instructor_id;
      const actorName = isInstructorAction ? s.instructor?.full_name || 'The teacher' : s.student?.full_name || 'The learner';

      await supabase.from('notifications').insert([{
        user_id: targetUserId,
        type: 'session_disputed',
        content: `${actorName} has filed a dispute regarding your session. A moderator will review the case.`,
        link_url: `/sessions?session=${s.id}`
      }]);

      alert('Issue reported. A moderator will review this case and decide on the credit refund.');
      setSubmittedReports(p => [...p, s.id]);
      setReportModal({ isOpen: false, session: null });
      setReportDetails(''); setReportReason('No-Show / Unresponsive');
      fetchSessions(currentUserId);
    } catch { alert('Failed to submit report.'); }
    finally { setIsSubmittingReport(false); }
  };

  const handleOpenDisputeModal = async (session) => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('reference_id', session.id)
      .eq('reference_type', 'session')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setDisputeModal({
      isOpen: true,
      session,
      reportInfo: data || { reason: 'System Dispute', details: 'No formal report narrative available. Please check support messages.', status: session.status }
    });
  };

  const StarRow = ({ label, stateKey, icon: Icon }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1 sm:mb-0">{Icon && <Icon className="w-4 h-4 text-emerald-600" />}{label}</span>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(star => (
          <button key={star} type="button" onClick={() => setRatings(p => ({ ...p, [stateKey]: star }))}
            className="text-2xl transition-transform hover:scale-110 focus:outline-none">
            <Star className={`w-6 h-6 ${star <= ratings[stateKey] ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
          </button>
        ))}
      </div>
    </div>
  );

  const filtered = sessions.filter(s => {
    if (roleFilter === 'Teaching' && s.instructor_id !== currentUserId) return false;
    if (roleFilter === 'Learning' && s.student_id   !== currentUserId) return false;
    
    if (statusTab !== 'All') {
      const isActuallyDisputed = (s.status === 'disputed' || (submittedReports.includes(s.id) && !['completed', 'cancelled'].includes(s.status)));
      if (statusTab.toLowerCase() === 'disputed') {
        return isActuallyDisputed;
      } else if (statusTab.toLowerCase() === 'pending') {
        return (s.status === 'pending' || s.status === 'reschedule_proposed') && !isActuallyDisputed;
      } else {
        return s.status === statusTab.toLowerCase() && !isActuallyDisputed;
      }
    }
    return true;
  }).sort((a, b) => {
    const aCreated = new Date(a.created_at || 0).getTime();
    const bCreated = new Date(b.created_at || 0).getTime();
    return (Number.isFinite(bCreated) ? bCreated : 0) - (Number.isFinite(aCreated) ? aCreated : 0);
  });

  const grouped = GROUP_ORDER.reduce((acc, g) => ({ ...acc, [g]: [] }), {});
  filtered.forEach(s => { const g = getGroup(s.scheduled_date, s.scheduled_time); grouped[g].push(s); });
