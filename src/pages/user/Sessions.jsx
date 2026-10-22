import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Briefcase, CalendarDays, ChevronDown,
  Heart, MessageCircle, MessageSquare, PenLine, RefreshCw, Star, Target, ShieldCheck, Scale, PlayCircle, CheckCircle2
} from 'lucide-react';
import supabase from '../../supabaseClient';

// ─────────────────────────────────────────────────────────────────
// SESSIONS V3 — "Upcoming State" + Formal Start & Dispute Countdown
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
      .eq('reference_type', 'session');
    if (data) setSubmittedReports(data.map(r => r.reference_id));
  };

  const handleUpdateStatus = async (session, action) => {
    setProcessingId(session.id);
    try {
      if (action === 'cancel' || action === 'decline' || action === 'cancel_no_show') {
        const { data: sd } = await supabase.from('user_profiles').select('credits_balance').eq('id', session.student_id).single();
        await supabase.from('user_profiles').update({ credits_balance: Number(sd?.credits_balance || 0) + Number(session.credit_amount || 0) }).eq('id', session.student_id);
        await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', session.id);
        window.dispatchEvent(new Event('credit_updated'));

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
        if (!window.confirm('Mark session as done?')) { setProcessingId(null); return; }
        const isInstructor = session.instructor_id === currentUserId;
        const payload = isInstructor ? { instructor_completed: true } : { student_completed: true };
        const otherDone = isInstructor ? session.student_completed : session.instructor_completed;
        const targetUserId = isInstructor ? session.student_id : session.instructor_id;
        const actorName = isInstructor ? session.instructor?.full_name || 'The teacher' : session.student?.full_name || 'The learner';

        if (otherDone) {
          payload.status = 'completed';
          const { data: id } = await supabase.from('user_profiles').select('credits_balance').eq('id', session.instructor_id).single();
          await supabase.from('user_profiles').update({ credits_balance: Number(id?.credits_balance || 0) + Number(session.credit_amount || 0) }).eq('id', session.instructor_id);
          window.dispatchEvent(new Event('credit_updated'));

          await supabase.from('notifications').insert([
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
        } else {
          await supabase.from('notifications').insert([{
            user_id: targetUserId,
            type: 'session_update',
            content: `${actorName} has marked the session as done. Please confirm to finalize the completion.`,
            link_url: `/sessions?session=${session.id}`
          }]);
        }
        await supabase.from('sessions').update(payload).eq('id', session.id);
      } else if (action === 'undo_done') {
        if (!window.confirm("Undo 'Mark as Done'?")) { setProcessingId(null); return; }
        const isInstructor = session.instructor_id === currentUserId;
        await supabase.from('sessions').update(isInstructor ? { instructor_completed: false } : { student_completed: false }).eq('id', session.id);
      }
      fetchSessions(currentUserId);
    } catch (err) { console.error(err.message); alert('Error processing transaction.'); }
    finally { setProcessingId(null); }
  };

  const handleProposeTime = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;
    setIsSubmittingPropose(true);
    const s = proposeModal.session;
    try {
      await supabase.from('sessions').update({
        status: 'reschedule_proposed',
        scheduled_date: newDate,
        scheduled_time: newTime
      }).eq('id', s.id);

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
      const isActuallyDisputed = submittedReports.includes(s.id) || s.status === 'disputed';
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
  const latestBookingGroup = filtered.length ? getGroup(filtered[0].scheduled_date, filtered[0].scheduled_time) : null;
  const activeGroups = GROUP_ORDER.filter(g => grouped[g].length > 0).sort((a, b) => {
    if (a === b) return 0;
    if (a === latestBookingGroup) return -1;
    if (b === latestBookingGroup) return 1;
    return GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b);
  });

  const tabCounts = STATUS_TABS.reduce((acc, t) => {
    if (t === 'All') {
      acc[t] = sessions.length;
    } else if (t === 'Disputed') {
      acc[t] = sessions.filter(s => submittedReports.includes(s.id) || s.status === 'disputed').length;
    } else if (t === 'Pending') {
      acc[t] = sessions.filter(s => (s.status === 'pending' || s.status === 'reschedule_proposed') && !submittedReports.includes(s.id)).length;
    } else {
      acc[t] = sessions.filter(s => s.status === t.toLowerCase() && !submittedReports.includes(s.id)).length;
    }
    return acc;
  }, {});

  const totalSessions   = sessions.length;
  const activeSessions  = sessions.filter(s => s.status === 'active').length;
  const completedCount  = sessions.filter(s => s.status === 'completed').length;
  const pendingCount    = sessions.filter(s => s.status === 'pending' || s.status === 'reschedule_proposed').length;

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading sessions" className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-[1000px] animate-pulse px-6 py-6 md:px-8">
        <div
          className="relative mb-5 overflow-hidden rounded-2xl px-6 py-5 shadow-md"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 100%)' }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-1 h-3 w-28 rounded bg-emerald-300/40" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-40 rounded bg-white/20" />
                <div className="h-5 w-5 rounded bg-emerald-200/40" />
              </div>
              <div className="mt-0.5 h-3 w-48 max-w-full rounded bg-emerald-200/40" />
            </div>
            <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center">
              <div className="flex items-center gap-2">
                <div className="flex min-w-[64px] flex-col items-center rounded-xl border border-white/10 bg-white/10 px-4 py-2.5">
                  <div className="h-[17px] w-6 rounded bg-white/25" />
                  <div className="mt-0.5 h-2.5 w-8 rounded bg-emerald-200/50" />
                </div>
                <div className="flex min-w-[64px] flex-col items-center rounded-xl border border-white/10 bg-white/10 px-4 py-2.5">
                  <div className="h-[17px] w-6 rounded bg-white/25" />
                  <div className="mt-0.5 h-2.5 w-8 rounded bg-sky-200/50" />
                </div>
                <div className="flex min-w-[64px] flex-col items-center rounded-xl border border-lime-300/25 bg-lime-300/15 px-4 py-2.5">
                  <div className="h-[17px] w-6 rounded bg-lime-100/40" />
                  <div className="mt-0.5 h-2.5 w-8 rounded bg-lime-200/40" />
                </div>
              </div>
              <div className="flex w-fit items-center rounded-full border border-white/10 bg-white/10 p-1">
                <div className="h-6 w-10 rounded-full bg-white/80" />
                <div className="h-6 w-14 rounded-full bg-white/15" />
                <div className="h-6 w-16 rounded-full bg-white/15" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 flex gap-1 overflow-x-auto pb-1">
          {['All', 'Pending', 'Upcoming', 'Active', 'Completed', 'Cancelled', 'Disputed'].map((tab, index) => (
            <div
              key={tab}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 ${index === 0 ? 'border-gray-900 bg-gray-900 shadow-sm' : 'border-gray-200 bg-white'}`}
            >
              {index > 0 && <div className="h-2 w-2 rounded-full bg-gray-300" />}
              <div className={`h-3 w-12 rounded ${index === 0 ? 'bg-white/35' : 'bg-gray-200'}`} />
              <div className={`h-4 w-6 rounded-full ${index === 0 ? 'bg-white/25' : 'bg-gray-100'}`} />
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="h-px flex-1 bg-gray-200" />
          <div className="h-3 w-5 rounded bg-gray-100" />
        </div>
        <div className="relative space-y-3 pl-6">
          <div className="absolute bottom-2 left-[9px] top-2 w-px bg-gray-200" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="relative rounded-2xl border border-gray-200 bg-white">
              <div className="h-1 w-full rounded-t-2xl bg-emerald-100" />
              <div className="relative px-5 py-4">
                <div className="absolute right-4 top-5 h-8 w-8 rounded-full bg-gray-100" />
                <div className="relative z-10 mb-3 flex items-start gap-4 pr-8">
                  <div className="h-12 w-12 shrink-0 rounded-xl border border-emerald-200 bg-emerald-100" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <div className="h-4 w-32 rounded bg-gray-200" />
                      <div className="h-5 w-16 rounded-full bg-sky-50" />
                      <div className="h-5 w-20 rounded-full bg-emerald-50" />
                    </div>
                    <div className="h-3 w-44 max-w-full rounded bg-gray-100" />
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-4 w-4 shrink-0 rounded bg-emerald-100" />
                      <div className="h-4 w-52 max-w-full rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
                <div className="relative z-10 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="h-3 w-28 rounded bg-gray-100" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="h-8 w-16 rounded-lg bg-gray-100" />
                      <div className="h-8 w-24 rounded-lg bg-emerald-100" />
                      <div className="h-8 w-20 rounded-lg bg-gray-100" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-6">

        {/* ── HEADER BANNER ── */}
        <div className="rounded-2xl mb-5 overflow-hidden shadow-md relative"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 100%)' }}>
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mb-1">Booking Manager</p>
              <h1 className="font-bold text-[22px] text-white tracking-tight leading-tight flex items-center gap-2">
                My Sessions <CalendarDays className="w-5 h-5 text-emerald-200" />
              </h1>
              <p className="text-[12px] text-emerald-300 font-medium mt-0.5">
                {totalSessions} total · {activeSessions} active · {pendingCount} pending
              </p>
            </div>

            <div className="flex flex-col gap-2 shrink-0 lg:flex-row lg:items-center">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 min-w-[64px]">
                  <p className="text-[17px] font-bold text-white leading-none">{totalSessions}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300 mt-0.5">Total</p>
                </div>
                <div className="flex flex-col items-center px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 min-w-[64px]">
                  <p className="text-[17px] font-bold text-white leading-none">{activeSessions}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-300 mt-0.5">Active</p>
                </div>
                <div className="flex flex-col items-center px-4 py-2.5 rounded-xl min-w-[64px]"
                  style={{ background: 'rgba(132,204,22,0.25)', border: '1px solid rgba(132,204,22,0.35)' }}>
                  <p className="text-[17px] font-bold leading-none" style={{ color: '#d9f99d' }}>{completedCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#a3e635' }}>Done</p>
                </div>
              </div>
              <div className="flex bg-white/10 border border-white/10 rounded-full p-1">
                {['All', 'Teaching', 'Learning'].map(role => (
                  <button key={role} onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                      roleFilter === role ? 'bg-white text-gray-900' : 'text-emerald-200 hover:text-white'
                    }`}>{role}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── STATUS TABS ── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 mb-8">
          {STATUS_TABS.map(tab => {
            const meta = STATUS_DOT[tab.toLowerCase()];
            const isActive = statusTab === tab;
            return (
              <button key={tab} onClick={() => setStatusTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all ${
                  isActive ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                }`}>
                {meta && <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : meta.dot}`} />}
                {tab}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{tabCounts[tab]}</span>
              </button>
            );
          })}
        </div>

        {/* ── CARDS ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 bg-white border border-gray-200 rounded-2xl text-center shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mb-4"><CalendarDays className="w-6 h-6 text-emerald-600" /></div>
            <p className="text-lg font-bold tracking-tight text-gray-900 mb-1">No sessions here</p>
            <p className="text-[13px] text-gray-400 mb-5">Switch tabs or role filter to see more.</p>
            <button onClick={() => { setStatusTab('All'); setRoleFilter('All'); }}
              className="px-6 py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm">Show all</button>
          </div>
        ) : (
          <div className="space-y-10">
            {activeGroups.map(group => (
              <div key={group}>
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{group}</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-bold text-gray-300">{grouped[group].length}</span>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />

                  <div className="space-y-3">
                    {grouped[group].map((session) => {
                      const isInstructor   = session.instructor_id === currentUserId;
                      const isProcessing   = processingId === session.id;
                      const displayUser    = isInstructor ? session.student : session.instructor;
                      const displayName    = displayUser?.full_name || 'Unknown';
                      const displayAvatar  = displayUser?.avatar_url || null;
                      const partnerId      = displayUser?.id;

                      const myCompleted    = isInstructor ? Boolean(session.instructor_completed) : Boolean(session.student_completed);
                      const otherCompleted = isInstructor ? Boolean(session.student_completed) : Boolean(session.instructor_completed);

                      const hasReported    = submittedReports.includes(session.id) || session.status === 'disputed';
                      
                      const meta = hasReported ? STATUS_DOT['disputed'] : (STATUS_DOT[session.status] || STATUS_DOT.cancelled);

                      const sessionDateObj = getSafeDateObj(session.scheduled_date, session.scheduled_time);
                      const time = sessionDateObj.toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
                      });
                      const bookedDate = new Date(session.created_at).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
                      });

                      const durationMs         = parseDurationToMs(session.skill?.duration);
                      const disputeUnlockTime  = sessionDateObj.getTime() + durationMs;
                      const isSessionFinished  = Date.now() > disputeUnlockTime;
                      
                      const isExpired          = Date.now() > sessionDateObj.getTime();
                      const gracePeriodMs      = 30 * 60 * 1000; 
                      const isNoShow           = Date.now() > (sessionDateObj.getTime() + gracePeriodMs);
                      
                      const isExpanded         = expandedId === session.id;
                      const isHighlighted      = highlightedSessionId === session.id;

                      const canMessage         = ['pending', 'reschedule_proposed', 'upcoming', 'active', 'completed', 'disputed'].includes(session.status);

                      return (
                        <div id={`session-${session.id}`} key={session.id} className="relative scroll-mt-24">
                          <div className={`absolute -left-6 top-5 w-[18px] h-[18px] rounded-full border-2 border-white ring-2 ${meta.dot} ${meta.ring} shadow-sm z-10`} />

                          <div className={`bg-white border rounded-2xl overflow-hidden transition-all duration-500 relative z-20 ${
                            isHighlighted
                              ? 'border-emerald-400 ring-4 ring-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.2)] scale-[1.01]'
                              : 'border-gray-200/80 hover:border-emerald-200 hover:shadow-[0_4px_20px_rgba(16,185,129,0.08)]'
                          }`}>

                            <div className={`h-1 w-full ${meta.bar}`} />

                            <div className="px-5 py-4 relative z-20">

                              <button
                                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                                className="absolute top-5 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition focus:outline-none z-30 cursor-pointer">
                                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>

                              <div className="flex items-start gap-4 mb-3 pr-8 relative z-20">
                                <div onClick={() => partnerId && navigate(`/user/${partnerId}`)}
                                  className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg border border-emerald-200 cursor-pointer hover:scale-105 transition shrink-0">
                                  {displayAvatar ? <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span onClick={() => partnerId && navigate(`/user/${partnerId}`)}
                                      className="font-bold text-[15px] text-gray-900 cursor-pointer hover:text-emerald-700 transition">{displayName}</span>
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider border px-2 py-0.5 rounded-full ${
                                      isInstructor ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                                    }`}>{isInstructor ? 'Learner' : 'Teacher'}</span>
                                    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${meta.chip}`}>{meta.label}</span>
                                  </div>

                                  <button onClick={() => navigate(`/skill/${session.skill_id}`)} className="text-[12px] text-gray-400 font-medium hover:text-emerald-700 hover:underline block truncate max-w-xs cursor-pointer">
                                    {session.skill?.title || 'Unknown Skill'} · {session.skill?.duration || '?'}
                                  </button>

                                  <div className="mt-2 flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                                    <span className="text-[13px] font-semibold text-gray-800">{time}</span>
                                  </div>
                                </div>
                              </div>

                              {session.status === 'active' && myCompleted && (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl mb-3">
                                  ⏳ Waiting for partner to confirm.
                                  <button onClick={() => handleUpdateStatus(session, 'undo_done')} disabled={isProcessing}
                                    className="ml-auto text-[10px] text-gray-400 hover:text-rose-600 underline cursor-pointer">Undo</button>
                                </div>
                              )}
                              {session.status === 'active' && !myCompleted && otherCompleted && (
                                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl mb-3">
                                  ✨ Partner marked done — finalize below!
                                </div>
                              )}

                              {/* ── ACTION BAR ── */}
                              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-gray-100 relative z-30">
                                
                                <div className="flex items-center justify-between w-full">
                                  
                                  {/* STATUS TEXT MESSAGES */}
                                  <div className="mr-auto text-[10px] font-bold italic">
                                    {isExpired && session.status === 'pending' && <span className="text-rose-500">⏰ Schedule Expired</span>}
                                    {session.status === 'reschedule_proposed' && isInstructor && <span className="text-purple-600">⏳ Waiting for Learner to confirm new time</span>}
                                    {session.status === 'reschedule_proposed' && !isInstructor && <span className="text-purple-600">📅 Teacher proposed a new schedule</span>}
                                    {session.status === 'upcoming' && <span className="text-indigo-600">📅 Schedule confirmed. Wait for the day.</span>}
                                    {session.status === 'active' && !isSessionFinished && <span className="text-gray-400 hidden sm:block">Dispute unlocks after session</span>}
                                  </div>

                                  {/* BUTTONS */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    
                                    {/* MESSAGE BUTTON */}
                                    {canMessage && (
                                      <button onClick={() => navigate(`/messages?session=${session.id}`)} className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg text-[11px] hover:bg-slate-800 transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer">
                                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                                      </button>
                                    )}

                                    {/* PENDING (INSTRUCTOR) */}
                                    {session.status === 'pending' && isInstructor && (
                                      <>
                                        <button onClick={() => { if (window.confirm('Decline?')) handleUpdateStatus(session, 'decline'); }} disabled={isProcessing} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-lg text-[11px] transition cursor-pointer">Decline</button>
                                        <button onClick={() => { setProposeModal({ isOpen: true, session }); setNewDate(session.scheduled_date); setNewTime(session.scheduled_time); }} disabled={isProcessing} className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 font-bold rounded-lg text-[11px] transition cursor-pointer hover:bg-purple-100">Propose Time</button>
                                        {!isExpired && <button onClick={() => handleUpdateStatus(session, 'accept_schedule')} disabled={isProcessing} className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg text-[11px] shadow-sm transition cursor-pointer">Confirm Schedule</button>}
                                      </>
                                    )}

                                    {/* PENDING (LEARNER) */}
                                    {session.status === 'pending' && !isInstructor && (
                                      <>
                                        {!isExpired
                                          ? <button onClick={() => { if (window.confirm('Cancel?')) handleUpdateStatus(session, 'cancel'); }} disabled={isProcessing} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-lg text-[11px] transition cursor-pointer">Cancel & Refund</button>
                                          : <button onClick={() => { if (window.confirm('Session expired. Cancel to refund?')) handleUpdateStatus(session, 'cancel'); }} disabled={isProcessing} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-lg text-[11px] hover:bg-emerald-100 transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Claim Refund</button>}
                                      </>
                                    )}

                                    {/* 🚨 PROPOSED (INSTRUCTOR) - FIXED UI */}
                                    {session.status === 'reschedule_proposed' && isInstructor && (
                                      <>
                                        <button onClick={() => { if (window.confirm('Cancel booking entirely?')) handleUpdateStatus(session, 'decline'); }} disabled={isProcessing} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-lg text-[11px] transition cursor-pointer">Decline</button>
                                        <button onClick={() => { setProposeModal({ isOpen: true, session }); setNewDate(session.scheduled_date); setNewTime(session.scheduled_time); }} disabled={isProcessing} className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 font-bold rounded-lg text-[11px] transition cursor-pointer hover:bg-purple-100">Edit Proposed Time</button>
                                        <button disabled className="px-3 py-1.5 bg-gray-100 text-gray-400 font-bold rounded-lg text-[11px] shadow-sm cursor-not-allowed border border-gray-200">Confirm Schedule</button>
                                      </>
                                    )}

                                    {/* PROPOSED (LEARNER) */}
                                    {session.status === 'reschedule_proposed' && !isInstructor && (
                                      <>
                                        <button onClick={() => { if (window.confirm('Decline and cancel session?')) handleUpdateStatus(session, 'cancel'); }} disabled={isProcessing} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-lg text-[11px] transition cursor-pointer">Cancel & Refund</button>
                                        <button onClick={() => handleUpdateStatus(session, 'accept_schedule')} disabled={isProcessing} className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg text-[11px] shadow-sm transition cursor-pointer">Accept Schedule</button>
                                      </>
                                    )}

                                    {/* UPCOMING (TEACHER) */}
                                    {session.status === 'upcoming' && isInstructor && (
                                      !isNoShow ? (
                                        <>
                                          <button onClick={() => { if (window.confirm('Emergency: Cancel this upcoming session? Credits will be refunded to the learner.')) handleUpdateStatus(session, 'cancel'); }} disabled={isProcessing} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-lg text-[11px] transition cursor-pointer">
                                            Cancel Booking
                                          </button>
                                          <button onClick={() => { if(window.confirm("Start session now? This will begin the duration countdown.")) handleUpdateStatus(session, 'start_session'); }} disabled={isProcessing} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition cursor-pointer flex items-center gap-1">
                                            <PlayCircle className="w-3.5 h-3.5" /> Start Session
                                          </button>
                                        </>
                                      ) : (
                                        <span className="px-3 py-1.5 bg-rose-50 text-rose-500 font-bold rounded-lg text-[11px] border border-rose-200 cursor-not-allowed">
                                          ⏰ Missed Schedule
                                        </span>
                                      )
                                    )}

                                    {/* UPCOMING (LEARNER) */}
                                    {session.status === 'upcoming' && !isInstructor && (
                                      <>
                                        {!isNoShow 
                                          ? <button onClick={() => { if (window.confirm('Cancel booking?')) handleUpdateStatus(session, 'cancel'); }} disabled={isProcessing} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 font-bold rounded-lg text-[11px] transition cursor-pointer">Cancel & Refund</button>
                                          : <button onClick={() => { if (window.confirm('Teacher is a no-show. Claim your refund now?')) handleUpdateStatus(session, 'cancel_no_show'); }} disabled={isProcessing} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-sm transition cursor-pointer flex items-center gap-1">
                                              <RefreshCw className="w-3.5 h-3.5" /> Claim Refund (No-Show)
                                            </button>
                                        }
                                      </>
                                    )}

                                    {/* ALL OTHER NORMAL STATUSES (Active, Completed, Disputed) */}
                                    {session.status !== 'pending' && session.status !== 'reschedule_proposed' && session.status !== 'upcoming' && (
                                      <>
                                        {hasReported && (
                                          <button onClick={() => handleOpenDisputeModal(session)} className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-lg text-[11px] hover:bg-rose-100 transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Dispute Details
                                          </button>
                                        )}

                                        {session.status === 'active' && !hasReported && (
                                          <button onClick={() => handleUpdateStatus(session, 'mark_done')} disabled={isProcessing || myCompleted}
                                            className={`px-3 py-1.5 font-bold rounded-lg text-[11px] transition shadow-sm cursor-pointer ${
                                              myCompleted ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                            }`}>{isProcessing ? '…' : myCompleted ? 'Waiting' : 'Mark Done'}</button>
                                        )}
                                        
                                        {!isInstructor && session.status === 'completed' && !session.is_rated && !hasReported && (
                                          <button onClick={() => setRatingModal({ isOpen: true, session })} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-lg text-[11px] hover:bg-amber-100 transition inline-flex items-center gap-1.5 cursor-pointer"><PenLine className="w-3.5 h-3.5" /> Evaluate</button>
                                        )}
                                        {!isInstructor && session.status === 'completed' && session.is_rated && (
                                          <span className="px-3 py-1.5 bg-gray-50 text-emerald-700 font-semibold rounded-lg text-[11px] inline-flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Rated</span>
                                        )}
                                        
                                        {isInstructor && session.status === 'completed' && !hasReported && (
                                          <span className="px-3 py-1.5 bg-gray-50 text-emerald-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1.5 cursor-default border border-gray-100 shadow-sm">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                          </span>
                                        )}

                                        {session.status === 'active' && isSessionFinished && !hasReported && (
                                          <button onClick={() => setReportModal({ isOpen: true, session })} 
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-white text-rose-500 border-rose-200 hover:bg-rose-50 transition cursor-pointer">
                                            <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" /> File Dispute
                                          </button>
                                        )}

                                        {session.status === 'cancelled' && !hasReported && (
                                          <span className="px-3 py-1.5 bg-gray-50 text-gray-500 font-bold rounded-lg text-[11px] inline-flex items-center gap-1.5 cursor-not-allowed border border-gray-100 shadow-sm">
                                            Cancelled
                                          </span>
                                        )}
                                      </>
                                    )}

                                  </div>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-6 animate-in slide-in-from-top-2 duration-200 relative z-30">
                                  <div className="flex-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Details</p>
                                    <div className="grid grid-cols-[80px_1fr] gap-y-2 text-[13px]">
                                      <span className="text-gray-400 font-bold">Format</span><span className="text-gray-900 font-medium">{session.skill?.format || 'N/A'}</span>
                                      <span className="text-gray-400 font-bold">Credits</span><span className="text-gray-900 font-medium">{session.credit_amount} cr</span>
                                      <span className="text-gray-400 font-bold">Booked On</span><span className="text-gray-900 font-medium">{bookedDate}</span>
                                      <span className="text-gray-400 font-bold">Status</span><span className="text-gray-900 font-medium capitalize">{session.status.replace('_', ' ')}</span>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Quick Links</p>
                                    <button onClick={() => navigate(`/skill/${session.skill_id}`)} className="inline-flex items-center gap-1 text-[13px] font-medium text-gray-900 hover:text-emerald-700 transition cursor-pointer">View listing <ArrowRight className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PROPOSE TIME MODAL ── */}
      {proposeModal.isOpen && proposeModal.session && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !isSubmittingPropose && setProposeModal({ isOpen: false, session: null })} />
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm relative z-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-1">Propose New Time</h2>
            <p className="text-[12px] text-gray-500 mb-5">Offer a new schedule to <span className="font-bold text-gray-800">{proposeModal.session.student?.full_name}</span>.</p>
            <form onSubmit={handleProposeTime} className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">New Date</p>
                <input type="date" required min={new Date().toISOString().split('T')[0]} value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-purple-500 transition" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">New Time</p>
                <input type="time" required value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-purple-500 transition" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setProposeModal({ isOpen: false, session: null })} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200 transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmittingPropose} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-700 disabled:opacity-50 transition shadow-sm cursor-pointer">{isSubmittingPropose ? 'Sending…' : 'Send Offer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DISPUTE & RESOLUTION DETAILS MODAL ── */}
      {disputeModal.isOpen && disputeModal.session && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Dispute & Escrow Record</h3>
                  <p className="text-[11px] text-gray-400 font-mono">Session ID: #{disputeModal.session.id.slice(0, 8)}</p>
                </div>
              </div>
              <button onClick={() => setDisputeModal({ isOpen: false, session: null, reportInfo: null })} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Filed Reason</span>
                <p className="font-bold text-gray-800">{disputeModal.reportInfo?.reason || 'Issue Reported'}</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Complainant Narrative / Resolution</span>
                <p className="text-gray-700 italic whitespace-pre-wrap">"{disputeModal.reportInfo?.details || 'Resolution metadata was logged by Trust & Safety.'}"</p>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                  <Scale className="w-4 h-4 text-rose-700" />
                  <span>Escrow Allocation & Verdict</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  {disputeModal.session.status === 'completed' || disputeModal.session.status === 'cancelled' || disputeModal.reportInfo?.status === 'resolved'
                    ? `This dispute case has been settled and closed by Trust & Safety. The locked escrow amount of ${disputeModal.session.credit_amount} CR has been permanently distributed or refunded according to the moderator's final adjudication verdict.`
                    : `The escrow amount of ${disputeModal.session.credit_amount} CR is currently locked and held safely in the platform escrow vault awaiting a moderator's active review and adjudication.`}
                </p>
              </div>
            </div>

            <button
              onClick={() => setDisputeModal({ isOpen: false, session: null, reportInfo: null })}
              className="w-full mt-5 py-3 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* ── File Dispute Modal ── */}
      {reportModal.isOpen && reportModal.session && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !isSubmittingReport && setReportModal({ isOpen: false, session: null })} />
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md relative z-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-1">File a Dispute</h2>
            <p className="text-[12px] text-gray-400 mb-5">Against <span className="font-bold text-gray-800">{reportModal.session.instructor_id === currentUserId ? reportModal.session.student?.full_name : reportModal.session.instructor?.full_name}</span>.</p>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Reason</p>
                <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-emerald-500">
                  <option>No-Show / Unresponsive</option><option>Harassment / Abuse</option><option>Scam / Fraud</option>
                  <option>Inappropriate Behavior</option><option>Tutorial Doesn't Match Description</option><option>Other</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Details</p>
                <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Describe what happened…" required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none h-24 focus:border-emerald-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setReportModal({ isOpen: false, session: null })} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200 transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmittingReport || !reportDetails.trim()} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 disabled:opacity-50 transition shadow-sm cursor-pointer">{isSubmittingReport ? 'Submitting…' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rating Modal ── */}
      {ratingModal.isOpen && ratingModal.session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setRatingModal({ isOpen: false, session: null })} />
          <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-xl relative z-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Teacher Evaluation</h2>
              <p className="text-gray-400 text-[13px] mt-1">Rank <span className="font-bold text-gray-800">{ratingModal.session.instructor?.full_name}</span> on the leaderboard.</p>
            </div>
            <div className="space-y-1 mb-6">
              <StarRow label="Overall" icon={Star} stateKey="overall" />
              <StarRow label="Clarity" icon={MessageCircle} stateKey="clarity" />
              <StarRow label="Patience" icon={Heart} stateKey="patience" />
              <StarRow label="Relevance" icon={Target} stateKey="relevance" />
              <StarRow label="Professionalism" icon={Briefcase} stateKey="professionalism" />
            </div>
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Comments (Optional)</p>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Extra feedback…"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:border-emerald-500 outline-none resize-none h-20" />
            </div>
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button onClick={() => setRatingModal({ isOpen: false, session: null })} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition cursor-pointer">Cancel</button>
              <button onClick={handleSubmitRating} disabled={isSubmittingRating || !Object.values(ratings).every(v => v > 0)}
                className="flex-[2] py-3.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition shadow-md cursor-pointer">{isSubmittingRating ? 'Submitting…' : 'Submit Evaluation'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}