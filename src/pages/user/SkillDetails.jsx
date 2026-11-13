import { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock, Coins,
  ExternalLink, Mail, MessageSquare, PenLine, Search, Star, Target, X
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';

export default function SkillDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [skill,               setSkill]               = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [currentUserId,       setCurrentUserId]       = useState(null);
  const [currentUserCredits,  setCurrentUserCredits]  = useState(0);
  const [bookingRestrictedUntil, setBookingRestrictedUntil] = useState(null);
  const [existingSession,     setExistingSession]     = useState(null);
  const [showModal,           setShowModal]           = useState(false);
  const [bookingLoading,      setBookingLoading]      = useState(false);
  const [bookingSuccess,      setBookingSuccess]      = useState(false);
  const [bookingError,        setBookingError]        = useState('');
  const [preferredDate,       setPreferredDate]       = useState('');
  const [preferredTime,       setPreferredTime]       = useState('');
  const [bookingMessage,      setBookingMessage]      = useState('');

  const getLocalDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayDateString = getLocalDateString();

  useEffect(() => {
    const fetchSkillDetails = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        const { data: profileData } = await supabase.from('user_profiles').select('credits_balance, booking_restricted_until').eq('id', user.id).single();
        if (profileData) {
          setCurrentUserCredits(profileData.credits_balance);
          setBookingRestrictedUntil(profileData.booking_restricted_until);
        }
        
        const { data: sessionData } = await supabase.from('sessions').select('status, id').eq('skill_id', id).eq('student_id', user.id).in('status', ['pending', 'active', 'upcoming', 'confirmed']).limit(1);
        if (sessionData && sessionData.length > 0) setExistingSession(sessionData[0]);
      }
      
      const { data: skillData, error: skillError } = await supabase
        .from('skills')
        .select(`*, user_profiles!instructor_id(id,full_name,avatar_url,bio,role,created_at,availability_schedule,contact_info,booking_restricted_until), reviews(rating, feedback, created_at, student:user_profiles!student_id(full_name, avatar_url), q1_clarity, q2_patience, q3_relevance, q4_professionalism)`)
        .eq('id', id)
        .single();
      
      if (!skillError && skillData) {
        const reviews = skillData.reviews || [];
        let totalOverallSum = 0;
        reviews.forEach(rev => {
          totalOverallSum += (Number(rev.rating||0)+Number(rev.q1_clarity||0)+Number(rev.q2_patience||0)+Number(rev.q3_relevance||0)+Number(rev.q4_professionalism||0)) / 5;
        });
        setSkill({ 
          ...skillData, 
          avgRating: reviews.length > 0 ? parseFloat((totalOverallSum/reviews.length).toFixed(1)) : 0, 
          totalReviews: reviews.length,
          reviewsList: reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        });
      }
      setLoading(false);
    };
    fetchSkillDetails();
  }, [id]);

  const handleConfirmBooking = async () => {
    if (!preferredDate || !preferredTime) { setBookingError('Please select a preferred date and time.'); return; }
    if (!bookingMessage.trim()) { setBookingError('Please provide a message for the instructor.'); return; }
    if (preferredDate < todayDateString)  { setBookingError('You cannot book a session for a past date.'); return; }
    
    const [year, month, day] = preferredDate.split('-').map(Number);
    const [hours, minutes] = preferredTime.split(':').map(Number);
    
    const bookingDateObj = new Date(year, month - 1, day, hours, minutes);
    const bookingDateTimeMs = bookingDateObj.getTime();
    const oneHourFromNowMs = Date.now() + (60 * 60 * 1000);

    if (bookingDateTimeMs < oneHourFromNowMs) {
      setBookingError('Please select a schedule at least 1 hour from now to give the instructor time to accept.');
      return;
    }
    
    setBookingLoading(true); setBookingError('');
    
    const { data: freshProfile, error: freshError } = await supabase.from('user_profiles').select('credits_balance').eq('id', currentUserId).single();
    if (freshError || !freshProfile) { setBookingError('Could not verify your credit balance.'); setBookingLoading(false); return; }
    
    const latestBalance = freshProfile.credits_balance;
    if (latestBalance < skill.credit_cost) {
      setBookingError(`Insufficient credits. You have ${latestBalance} CR, but this session costs ${skill.credit_cost} CR.`);
      setCurrentUserCredits(latestBalance); setBookingLoading(false); return;
    }
    
    try {
      const { data: newSession, error: sessionError } = await supabase.from('sessions')
        .insert([{ 
          skill_id: skill.id, 
          student_id: currentUserId, 
          instructor_id: skill.instructor_id, 
          credit_amount: skill.credit_cost, 
          scheduled_date: preferredDate, 
          scheduled_time: preferredTime, 
          message: bookingMessage.trim(), 
          status: 'pending' 
        }])
        .select()
        .single();
        
      if (sessionError) throw sessionError;
      
      // ✨ ADDED: image to the payload
      const bookingSysContent = `__BOOKING_REQUEST__::${JSON.stringify({
        skill_id: skill.id,
        title: skill.title,
        image: skill.cover_image_url || null,
        cost: skill.credit_cost,
        date: preferredDate,
        time: preferredTime,
        userMsg: bookingMessage.trim()
      })}`;

      const { error: msgError } = await supabase.from('messages').insert([{
        session_id: newSession.id,
        sender_id: currentUserId,
        receiver_id: skill.instructor_id,
        content: bookingSysContent,
        is_deleted: false
      }]);
      if (msgError) console.error("Failed to save initial message:", msgError);
      
      await supabase.from('notifications').insert([{ user_id: skill.instructor_id, type: 'booking', content: `New booking request for "${skill.title}" worth ${skill.credit_cost} CR.`, link_url: '/sessions' }]);
      
      const newBalance = latestBalance - skill.credit_cost;
      const { error: profileError } = await supabase.from('user_profiles').update({ credits_balance: newBalance }).eq('id', currentUserId);
      if (profileError) throw profileError;
      
      window.dispatchEvent(new Event('credit_updated'));
      
      setBookingSuccess(true); 
      setCurrentUserCredits(newBalance);
    } catch (error) {
      setBookingError('An error occurred while booking. Please try again.');
    } finally { setBookingLoading(false); }
  };

  const closeBookingModal = () => {
    if (!bookingLoading) {
      setShowModal(false);
      setBookingError('');
    }
  };

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading skill details" className="min-h-[80vh] bg-[#faf9f6]">
      <div className="mx-auto max-w-[1000px] min-w-0 animate-pulse px-3 py-4 sm:px-6 sm:py-6 md:px-8">
        <div className="mb-4 flex items-center justify-between"><div className="h-3 w-24 rounded bg-emerald-100" /><div className="h-4 w-16 rounded bg-gray-100" /></div>
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-8 lg:w-[260px]"><div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-emerald-50 p-4 shadow-sm"><div className="mb-3 h-20 w-20 rounded-2xl bg-emerald-100" /><div className="mb-2 h-5 w-24 rounded-full bg-white" /><div className="mb-2 h-4 w-32 rounded bg-gray-200" /><div className="mb-4 h-3 w-full rounded bg-gray-100" /><div className="mb-3 h-16 w-full rounded-xl bg-white" /><div className="h-9 w-full rounded-xl bg-gray-100" /></div>
            <div className="grid grid-cols-2 gap-2">{[0,1,2,3].map(item => <div key={item} className="flex h-24 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-3"><div className="mb-2 h-5 w-5 rounded bg-gray-100" /><div className="mb-1 h-6 w-12 rounded bg-gray-200" /><div className="h-2.5 w-14 rounded bg-gray-100" /></div>)}</div>
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4"><div className="h-3 w-24 rounded bg-gray-200" /><div className="h-8 w-20 rounded bg-emerald-100" /><div className="h-10 rounded-xl bg-gray-100" /><div className="h-10 rounded-xl bg-emerald-100" /></div>
          </aside>
          <main className="min-w-0 flex-1 space-y-4"> <div className="h-64 rounded-2xl border border-gray-200 bg-gray-100" /><section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"><div className="flex gap-2"><div className="h-5 w-20 rounded-full bg-emerald-50" /><div className="h-5 w-24 rounded-full bg-gray-100" /><div className="h-5 w-20 rounded-full bg-blue-50" /></div><div className="h-6 w-3/4 rounded bg-gray-200" /><div className="h-3 w-36 rounded bg-gray-100" /></section><section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"><div className="h-4 w-36 rounded bg-gray-200" /><div className="h-3 w-full rounded bg-gray-100" /><div className="h-3 w-5/6 rounded bg-gray-100" /><div className="h-3 w-2/3 rounded bg-gray-100" /></section><section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"><div className="h-4 w-40 rounded bg-gray-200" />{[0,1,2].map(item => <div key={item} className="flex items-center gap-3 border-b border-gray-100 pb-3"><div className="h-8 w-8 rounded-full bg-gray-200" /><div className="flex-1 space-y-2"><div className="h-3 w-28 rounded bg-gray-200" /><div className="h-3 w-full rounded bg-gray-100" /></div></div>)}</section></main>
        </div>
      </div>
    </div>
  );

  if (!skill) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center bg-[#faf9f6]">
      <Search className="w-12 h-12 text-emerald-600 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Skill Not Found</h2>
      <p className="text-gray-500 text-sm mb-6">This listing may have been removed or does not exist.</p>
      <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition shadow-sm text-xs">Return to Dashboard</button>
    </div>
  );

  const isMyListing = skill.instructor_id === currentUserId;
  const profileObj = Array.isArray(skill.user_profiles) ? skill.user_profiles[0] : skill.user_profiles;
  const instructorName     = profileObj?.full_name             || 'Unknown Instructor';
  const instructorAvatar   = profileObj?.avatar_url            || null;
  const instructorBio      = profileObj?.bio                   || '';
  const instructorAvail    = profileObj?.availability_schedule || '';
  const instructorContact  = profileObj?.contact_info          || '';
  const instructorId       = profileObj?.id                    || skill.instructor_id;
  const memberSince        = profileObj?.created_at ? new Date(profileObj.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';
  const hasEnoughCredits   = currentUserCredits >= skill.credit_cost;

  const now = new Date();
  const instructorRestrictedUntil = profileObj?.booking_restricted_until ? new Date(profileObj.booking_restricted_until) : null;
  const isInstructorRestricted = instructorRestrictedUntil && instructorRestrictedUntil > now;
  
  const learnerRestrictedUntil = bookingRestrictedUntil ? new Date(bookingRestrictedUntil) : null;
  const isLearnerRestricted = learnerRestrictedUntil && learnerRestrictedUntil > now;

  const SKILL_STATS = [
    { label: 'Cost',    icon: Coins,         value: `${skill.credit_cost} CR`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Rating',  icon: Star,          value: skill.avgRating > 0 ? skill.avgRating : 'New', color: 'text-amber-500',  bg: 'bg-amber-50',   border: 'border-amber-100'   },
    { label: 'Reviews', icon: MessageSquare, value: skill.totalReviews, color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-100'     },
    { label: 'Time',    icon: Clock,         value: skill.duration || 'N/A', color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-100'  },
  ];

  return (
    <div className="w-full bg-[#faf9f6] min-h-screen">
      <div className="max-w-[1000px] mx-auto min-w-0 px-3 py-4 sm:px-6 sm:py-6 md:px-8">
        <div className="flex items-center justify-between mb-5 rounded-[22px] border border-[#e4eee1] bg-white px-4 py-3 shadow-[0_6px_20px_rgba(26,80,37,0.04)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Skill Listing</p>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-emerald-700 transition"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
        </div>

        <div className="flex min-w-0 flex-col lg:flex-row gap-3 sm:gap-6 items-start">
          <div className="grid w-full min-w-0 grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] items-stretch gap-2 lg:sticky lg:top-8 lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col lg:gap-4">
            <div className="min-w-0 bg-white border border-[#e3ecdf] rounded-[22px] p-2 min-[360px]:p-2.5 lg:p-4 flex flex-col items-center text-center shadow-[0_6px_20px_rgba(26,80,37,0.05)]">
              <div onClick={() => navigate(`/user/${instructorId}`)}
                className="relative w-11 h-11 min-[360px]:w-12 min-[360px]:h-12 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl bg-emerald-100 border-[3px] lg:border-4 border-white shadow-md overflow-hidden flex items-center justify-center mb-1.5 lg:mb-2 cursor-pointer hover:scale-105 transition">
                {instructorAvatar
                  ? <img src={instructorAvatar} alt={instructorName} className="w-full h-full object-cover" />
                  : <span className="text-xl lg:text-4xl font-bold text-emerald-800">{instructorName.charAt(0)}</span>}
              </div>

              <div className="flex min-w-0 flex-wrap gap-1 justify-center mb-1">
                <span className="max-w-full text-[8px] lg:text-[10px] font-semibold uppercase tracking-normal lg:tracking-widest bg-white text-emerald-700 border border-emerald-200 px-1.5 lg:px-3 py-0.5 rounded-full">Instructor</span>
                {skill.totalReviews > 0 && <span className="flex items-center gap-1 text-[9px] lg:text-[10px] font-semibold uppercase tracking-normal lg:tracking-widest bg-amber-50 text-amber-600 border border-amber-100 px-1.5 lg:px-3 py-0.5 rounded-full"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {skill.avgRating}</span>}
              </div>

              <h3 onClick={() => navigate(`/user/${instructorId}`)}
                className="max-w-full break-words [overflow-wrap:anywhere] font-bold text-[12px] min-[360px]:text-[13px] lg:text-[15px] text-gray-900 tracking-tight leading-snug cursor-pointer hover:text-emerald-700 transition mb-1">{instructorName}</h3>
              <p className="max-w-full line-clamp-2 lg:line-clamp-none break-words text-[10px] lg:text-[11px] text-gray-500 leading-snug mb-2 lg:mb-3">{instructorBio || 'Platform Instructor and Member'}</p>

              {(instructorAvail || instructorContact || memberSince) && (
                <div className="hidden w-full space-y-2 mb-3 lg:block">
                  {instructorAvail && (
                    <div className="flex items-center gap-2 text-left bg-white border border-gray-100 rounded-xl px-3 py-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Availability</p>
                        <p className="text-[11px] font-medium text-gray-800">{instructorAvail}</p>
                      </div>
                    </div>
                  )}
                  {instructorContact && (
                    <div className="flex items-center gap-2 text-left bg-white border border-gray-100 rounded-xl px-3 py-2">
                      <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contact</p>
                        <p className="text-[11px] font-medium text-gray-800">{instructorContact}</p>
                      </div>
                    </div>
                  )}
                  
                </div>
              )}
              <button onClick={() => navigate(`/user/${instructorId}`)}
                className="mt-auto w-full min-w-0 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-1 py-1.5 lg:py-2 rounded-lg lg:rounded-xl font-semibold text-[9px] min-[360px]:text-[10px] lg:text-[11px] transition flex items-center justify-center gap-1 lg:gap-1.5">View Full Profile <ArrowRight className="w-3.5 h-3.5" /></button>
            </div>

            <div className="grid h-full min-w-0 grid-cols-2 grid-rows-2 gap-1.5 min-[360px]:gap-2 lg:h-auto lg:grid-rows-none">
              {SKILL_STATS.map(sc => {
                const StatIcon = sc.icon;
                return (
                  <div key={sc.label} className={`${sc.bg} min-w-0 border ${sc.border} rounded-xl lg:rounded-2xl px-1 py-2 lg:p-4 flex flex-col items-center justify-center text-center hover:shadow-sm transition`}>
                    <StatIcon className={`w-4 h-4 lg:w-5 lg:h-5 mb-0.5 lg:mb-1 ${sc.color}`} />
                    <span className={`max-w-full break-words text-[12px] min-[360px]:text-[13px] lg:text-lg font-bold ${sc.color} leading-tight`}>{sc.value}</span>
                    <span className="text-[8px] min-[360px]:text-[9px] lg:text-[10px] font-semibold uppercase tracking-normal lg:tracking-widest text-gray-400 mt-0.5 lg:mt-1">{sc.label}</span>
                  </div>
                );
              })}
            </div>


            <div className="col-span-2 min-w-0 space-y-1.5 rounded-xl border border-gray-200 bg-white p-2.5 lg:hidden">
              {instructorAvail ? (
                <div className="flex min-w-0 items-start gap-2 text-left">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <p className="min-w-0 break-words text-[11px] text-gray-700"><span className="font-semibold text-gray-500">Availability: </span>{instructorAvail}</p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">Availability not provided</p>
              )}
              {instructorContact ? (
                <div className="flex min-w-0 items-start gap-2 text-left">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <p className="min-w-0 break-all text-[11px] text-gray-700"><span className="font-semibold text-gray-500">Contact: </span>{instructorContact}</p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">Contact information not provided</p>
              )}
            </div>
            <div className="col-span-2 min-w-0 bg-white border border-[#e3ecdf] rounded-[22px] p-3 lg:p-4 shadow-[0_6px_20px_rgba(26,80,37,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Session Cost</p>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-3xl lg:text-4xl font-bold text-emerald-700">{skill.credit_cost}</span>
                <span className="text-sm font-bold text-emerald-600 mb-0.5">CR</span>
              </div>
              
              {!isInstructorRestricted && (
                <div className={`px-3 py-2 rounded-xl text-[10px] font-bold border mb-4 ${
                  hasEnoughCredits ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      {hasEnoughCredits
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Sufficient</>
                        : <><X className="w-3.5 h-3.5" /> Insufficient</>}
                    </span>
                    <span>{currentUserCredits} CR</span>
                  </div>
                </div>
              )}

              {isMyListing ? (
                <button 
                  onClick={() => navigate(`/edit-skill/${skill.id}`)} 
                  className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[12px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <PenLine className="w-4 h-4" /> Edit Your Listing
                </button>
              ) : existingSession ? (
                <button onClick={() => navigate('/sessions')}
                  className="w-full py-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-xl hover:bg-amber-100 transition flex flex-col items-center gap-0.5">
                  <span className="font-bold">Status: {existingSession.status}</span>
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider">Manage in Sessions <ArrowRight className="w-3 h-3" /></span>
                </button>
              ) : isInstructorRestricted ? (
                <div className="space-y-2">
                  <button disabled className="w-full py-3 bg-gray-100 text-gray-400 text-[12px] font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm border border-gray-200">
                    <CalendarDays className="w-4 h-4" /> Instructor Unavailable
                  </button>
                  <p className="text-[10px] text-center text-rose-500 font-bold leading-tight px-1">This instructor is currently restricted from accepting new bookings.</p>
                </div>
              ) : isLearnerRestricted ? (
                <div className="space-y-2">
                  <button disabled className="w-full py-3 bg-gray-100 text-gray-400 text-[12px] font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm border border-gray-200">
                    <CalendarDays className="w-4 h-4" /> Booking Restricted
                  </button>
                  <p className="text-[10px] text-center text-rose-500 font-bold leading-tight px-1">Your account is temporarily restricted from booking sessions.</p>
                </div>
              ) : (
                <button onClick={() => setShowModal(true)}
                  className="w-full py-3 bg-gradient-to-r from-[#40b343] via-[#20983d] to-[#07803a] hover:brightness-95 text-white text-[12px] font-semibold rounded-full transition shadow-[0_8px_18px_rgba(25,141,52,0.18)] flex items-center justify-center gap-1.5 cursor-pointer">
                  <CalendarDays className="w-4 h-4" /> Book Session
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
            {skill.cover_image_url && (
              <div className="w-full h-40 min-[360px]:h-48 sm:h-64 bg-white rounded-[24px] overflow-hidden border border-[#e3ecdf] shadow-[0_6px_20px_rgba(26,80,37,0.05)]">
                <img src={skill.cover_image_url} alt={skill.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="bg-white border border-[#e3ecdf] rounded-[22px] p-3 sm:p-5 shadow-[0_6px_20px_rgba(26,80,37,0.05)]">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {skill.format   && <span className="text-[10px] font-semibold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full">{skill.format}</span>}
                {skill.category && <span className="text-[10px] font-semibold uppercase tracking-widest bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-0.5 rounded-full">{skill.category}</span>}
                {skill.duration && <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full"><Clock className="w-3 h-3" /> {skill.duration}</span>}
              </div>
              <h1 className="font-bold text-[24px] sm:text-[30px] text-gray-900 tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>{skill.title}</h1>
              
              <p className="text-[10px] text-gray-400 font-bold mt-1">
                Posted on {new Date(skill.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>

              {skill.portfolio_url && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Portfolio / Demo</p>
                  <a href={skill.portfolio_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition">
                    <ExternalLink className="w-3.5 h-3.5" /> Visit Link
                  </a>
                </div>
              )}
            </div>

            <div className="bg-white border border-[#e3ecdf] rounded-[22px] p-3 sm:p-5 shadow-[0_6px_20px_rgba(26,80,37,0.05)]">
              <p className="text-sm font-bold tracking-tight text-gray-900 mb-2 sm:mb-3">About This Session</p>
              <p className="text-[12px] sm:text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{skill.description}</p>
            </div>

            {skill.outcomes && (
              <div className="bg-white border border-[#e3ecdf] rounded-[22px] p-3 sm:p-5 shadow-[0_6px_20px_rgba(26,80,37,0.05)]">
                <p className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-gray-900 mb-2 sm:mb-3"><Target className="w-4 h-4 text-emerald-600" /> What You Will Walk Away With</p>
                <p className="text-[12px] sm:text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{skill.outcomes}</p>
              </div>
            )}

            {skill.reviewsList && skill.reviewsList.length > 0 && (
              <div className="bg-white border border-[#e3ecdf] rounded-[22px] p-3 sm:p-5 shadow-[0_6px_20px_rgba(26,80,37,0.05)]">
                <p className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-gray-900 mb-3 sm:mb-4"><MessageSquare className="w-4 h-4 text-sky-600" /> Student Feedback ({skill.totalReviews})</p>
                
                <div className="space-y-2.5 sm:space-y-4">
                  {skill.reviewsList.slice(0, 5).map((review, idx) => {
                    const studentData = Array.isArray(review.student) ? review.student[0] : review.student;
                    const reviewerName = studentData?.full_name || 'Anonymous Student';
                    const reviewerAvatar = studentData?.avatar_url || null;

                    return (
                      <div key={idx} className="border-b border-gray-50 pb-2.5 last:border-0 last:pb-0 sm:pb-4">
                        <div className="mb-1.5 flex min-w-0 items-center gap-2 sm:mb-2 sm:gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-800 overflow-hidden shrink-0">
                            {reviewerAvatar ? <img src={reviewerAvatar} alt="" className="w-full h-full object-cover" /> : reviewerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-gray-900 leading-none">{reviewerName}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-semibold text-gray-700">{review.rating}</span>
                          </div>
                        </div>
                        {review.feedback && (
                          <p className="break-words pl-9 text-[11px] italic text-gray-600 sm:pl-11 sm:text-[12px]">"{review.feedback}"</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeBookingModal} />
          <div className={`relative w-full rounded-3xl bg-white shadow-2xl border border-gray-100 ${
            bookingSuccess
              ? 'max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto'
              : 'max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto scrollbar-hide p-3 min-[360px]:p-4 sm:p-6'
          }`}>
            {!bookingSuccess ? (
              <>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">Book a Session</h3>
                  <button onClick={closeBookingModal} aria-label="Close booking dialog" className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-[11px] text-gray-400 mb-4">Credits are deducted and held securely in escrow.</p>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 sm:px-4 py-2.5 mb-4 flex min-w-0 items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Session</p>
                    <p className="min-w-0 max-w-[155px] min-[360px]:max-w-[200px] truncate text-[12px] font-bold text-gray-900">{skill.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Cost</p>
                    <p className="text-[16px] font-bold text-emerald-700">{skill.credit_cost} CR</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Preferred Date *</p>
                    <input type="date" min={todayDateString} value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-800 outline-none focus:border-emerald-400 transition" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Preferred Time *</p>
                    <input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-800 outline-none focus:border-emerald-400 transition" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Message *</p>
                    <textarea value={bookingMessage} onChange={e => setBookingMessage(e.target.value)} required
                      placeholder="Tell the instructor about your goals or preferred schedule..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-700 outline-none resize-none h-20 focus:border-emerald-400 transition" />
                  </div>
                </div>

                {bookingError && <div className="mb-3 p-3 bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold rounded-xl">{bookingError}</div>}

                <div className={`p-3 rounded-xl flex justify-between items-center text-[11px] font-bold border mb-4 ${
                  hasEnoughCredits ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  <span className="flex items-center gap-1">
                    {hasEnoughCredits
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Sufficient Balance</>
                      : <><X className="w-3.5 h-3.5" /> Insufficient Balance</>}
                  </span>
                  <span>{currentUserCredits} / {skill.credit_cost} CR</span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 border-t border-gray-100 pt-3">
                  <button onClick={closeBookingModal} disabled={bookingLoading}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gray-100 px-2 text-center text-[11px] font-bold leading-tight text-gray-600 transition hover:bg-gray-200 cursor-pointer">Cancel</button>
                  <button onClick={handleConfirmBooking} disabled={bookingLoading || !hasEnoughCredits}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#40b343] via-[#20983d] to-[#07803a] px-2 text-center text-[11px] font-bold leading-tight text-white transition hover:brightness-95 shadow-[0_6px_16px_rgba(25,141,52,0.16)] disabled:opacity-50 cursor-pointer">
                    {bookingLoading ? 'Processing...' : 'Confirm and Deduct'}
                  </button>
                </div>
              </>
            ) : (
              <div className="relative overflow-hidden px-5 py-5 text-center sm:px-7 sm:py-6">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-emerald-600 to-teal-500" />
                <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-emerald-50" />
                <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
                  <CheckCircle2 className="h-7 w-7" />
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-lime-400" />
                </div>
                <span className="relative inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-800">Booking Confirmed</span>
                <h3 className="relative mb-2 mt-3 text-[22px] font-bold tracking-tight text-gray-900">You are all set!</h3>
                <p className="relative mx-auto mb-4 max-w-sm px-1 text-[13px] leading-relaxed text-gray-500">
                  The instructor will confirm your session soon.
                </p>
                <div className="relative rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800/60">Credits deducted</p>
                      <p className="text-[16px] font-bold text-emerald-800">{skill.credit_cost} CR</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Held in escrow
                    </span>
                  </div>
                </div>
                <button onClick={() => navigate('/sessions')}
                  className="relative mt-4 w-full rounded-full bg-gradient-to-r from-[#40b343] via-[#20983d] to-[#07803a] py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:brightness-95 cursor-pointer">Manage Bookings</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}