import { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, X, ArrowLeft, AlertTriangle, Scale,
  Clock, Users, Check, FileText, UploadCloud, Flag, MessageSquare, Image as ImageIcon
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import supabase from '../../supabaseClient';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

// Display-only: avatar image with an initial as fallback.
function Avatar({ url, name, fallback = 'U', className }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden font-semibold ${className}`}>
      {url
        ? <img src={url} alt="" className="h-full w-full object-cover" />
        : (name?.charAt(0) || fallback).toUpperCase()}
    </span>
  );
}

function parseReportDetails(rawDetails) {
  if (!rawDetails) return { complainantText: 'No narrative details provided.', resolutionMeta: null, resolutionNotes: null };
  const resolutionPattern = /\n\n\[RESOLVED\s*-\s*([^\]]+)\]:\s*([\s\S]*)$/i;
  const match = rawDetails.match(resolutionPattern);
  if (match) {
    return {
      complainantText: rawDetails.substring(0, match.index).trim() || 'No narrative details provided.',
      resolutionMeta: match[1].trim(),
      resolutionNotes: match[2].trim(),
    };
  }
  return { complainantText: rawDetails.trim(), resolutionMeta: null, resolutionNotes: null };
}

// ─── AUTO-GENERATED MODERATOR NOTES LOGIC ───
function getAutoNote(reason, actionType) {
  if (actionType === 'dismiss') return "Report reviewed and dismissed. No community guidelines violation found.";
  if (actionType === 'escalate') return "Case escalated to Administration. The account requires a final review for platform safety.";

  const r = reason || '';
  if (r.includes('Spam') || r.includes('Inappropriate')) {
    return actionType === 'warning'
      ? "Your recent post or comment was flagged and reviewed for violating our spam and content relevance policies. Please ensure your contributions remain constructive and relevant to the community."
      : "Your account has been temporarily restricted for 12 hours due to repeated or severe posting of inappropriate/spam content. Please adhere to community standards.";
  }
  if (r.includes('Harassment') || r.includes('Abuse')) {
    return actionType === 'warning'
      ? "Your recent community interaction was reviewed and flagged for unprofessional or disrespectful language. SkillCredit strictly enforces a respectful and safe environment for all members."
      : "Zero tolerance for harassment. Your account has been temporarily restricted for 12 hours following verified reports of abusive behavior or targeted harassment towards another member.";
  }
  if (r.includes('Misinformation')) {
    return actionType === 'warning'
      ? "Content published from your account was flagged for sharing misleading or unverified information. Please verify your claims and resources before sharing them in the community."
      : "Your account has been temporarily restricted for 12 hours due to the distribution of misleading claims or unverified technical data that could affect other learners.";
  }

  // Fallback / Other
  return actionType === 'warning'
    ? "Your recent contribution was reviewed by Trust & Safety and found to be in violation of general community guidelines. Please review our platform rules."
    : "Your account has been temporarily restricted for 12 hours from posting and commenting due to a confirmed breach of community rules.";
}

function CaseDetailsModal({ title, onClose, children }) {
  useEffect(() => {
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">Case materials <span className="px-1 text-gray-300">/</span> Moderator review</p>
              <h2 className="mt-1 truncate text-lg font-semibold leading-tight tracking-tight text-gray-950 sm:text-xl">{title}</h2>
              <p className="mt-1 hidden text-xs leading-5 text-gray-500 sm:block">Supporting information attached to this moderation case</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-white hover:text-gray-900 ${FOCUS_RING}`}
          ><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f2ee] px-3.5 py-5 sm:px-7 sm:py-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin]">
          <div className="mx-auto max-w-3xl space-y-5 font-sans text-gray-700">{children}</div>
        </div>
      </section>
    </div>
  );
}

function ModerationCommentThread({ comments, flaggedCommentId, parentId = null, depth = 0 }) {
  const [collapsed, setCollapsed] = useState({});
  const commentIds = new Set(comments.map((comment) => comment.id));
  const threadItems = parentId === null
    ? comments.filter((comment) => !comment.parent_comment_id || !commentIds.has(comment.parent_comment_id))
    : comments.filter((comment) => comment.parent_comment_id === parentId);

  if (!threadItems.length) return null;

  return (
    <div className={depth > 0 ? 'ml-4 border-l-2 border-gray-200 pl-3 sm:ml-7 sm:pl-4' : 'space-y-4'}>
      {threadItems.map((comment) => {
        const children = comments.filter((reply) => reply.parent_comment_id === comment.id);
        const isFlagged = comment.id === flaggedCommentId;
        const name = comment.user?.full_name || 'Community member';
        return (
          <article key={comment.id} className="min-w-0" data-comment-id={comment.id}>
            <div className="flex items-start gap-2.5 sm:gap-3">
              <Avatar
                url={comment.user?.avatar_url}
                name={name}
                className="mt-0.5 h-9 w-9 rounded-full border border-gray-200 bg-white text-sm text-gray-600"
              />
              <div className="min-w-0 flex-1">
                <div className={`rounded-xl border px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.02] ${isFlagged ? 'border-rose-200 bg-rose-50/90 ring-rose-100' : 'border-gray-200 bg-white'}`}>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold tracking-tight text-gray-900">{name}</span>
                      {depth > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Reply</span>}
                      {isFlagged && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Reported comment</span>}
                    </div>
                    <time className="text-xs tabular-nums text-gray-400">{new Date(comment.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{comment.content}</p>
                </div>
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCollapsed((previous) => ({ ...previous, [comment.id]: !previous[comment.id] }))}
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 ${FOCUS_RING}`}
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed[comment.id] ? '-rotate-90' : ''}`} />
                    {collapsed[comment.id] ? `Show ${children.length} replies` : 'Hide replies'}
                  </button>
                )}
                {!collapsed[comment.id] && children.length > 0 && (
                  <div className="mt-2.5">
                    <ModerationCommentThread comments={comments} flaggedCommentId={flaggedCommentId} parentId={comment.id} depth={depth + 1} />
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PostImageCollage({ mediaUrls = [], onOpen }) {
  if (!mediaUrls.length) return null;
  const total = mediaUrls.length;
  const visibleImages = mediaUrls.slice(0, 5);
  const count = visibleImages.length;
  const gridClass = [
    'grid-cols-1 aspect-[16/9]', 'grid-cols-2 aspect-[16/9]',
    'grid-cols-2 grid-rows-2 aspect-[3/2]', 'grid-cols-2 grid-rows-2 aspect-[4/3]',
    'grid-cols-[2fr_1fr_1fr] grid-rows-2 aspect-[16/9]',
  ][count - 1];

  return (
    <div className={`grid w-full min-w-0 gap-1 overflow-hidden rounded-xl bg-gray-100 ${gridClass}`}>
      {visibleImages.map((url, index) => {
        const isLargeTile = (count === 3 || count === 5) && index === 0;
        const hasOverflow = total > 5 && index === 4;
        return (
          <button key={`${url}-${index}`} type="button" onClick={() => onOpen(mediaUrls, index)} aria-label={`Open image ${index + 1} of ${total}`} className={`group relative min-h-0 min-w-0 overflow-hidden bg-gray-200 ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0 ${isLargeTile ? 'row-span-2' : ''}`}>
            <img src={url} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
            {hasOverflow && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-3xl font-bold text-white">+{total - 5}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ImageGalleryModal({ images = [], initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => setCurrentIndex(initialIndex), [initialIndex]);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (images.length < 2) return;
      if (event.key === 'ArrowRight') setCurrentIndex(index => (index + 1) % images.length);
      if (event.key === 'ArrowLeft') setCurrentIndex(index => (index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  if (!images.length) return null;

  const showPrevious = () => setCurrentIndex(index => (index - 1 + images.length) % images.length);
  const showNext = () => setCurrentIndex(index => (index + 1) % images.length);

  return (
    <div role="dialog" aria-modal="true" aria-label="Image viewer" onClick={event => event.target === event.currentTarget && onClose()} className="fixed inset-0 z-[700] flex flex-col bg-[#111916] p-3 font-sans text-white sm:p-5 lg:p-6">
      <header className="mx-auto flex w-full max-w-[1440px] shrink-0 items-center justify-between gap-4 border-b border-white/10 px-1 pb-4 sm:px-2 sm:pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-emerald-200 shadow-sm">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">Evidence viewer</p>
            <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-white sm:text-base">Original submitted media</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold tabular-nums tracking-wide text-gray-100 shadow-inner sm:px-3.5">
            <span className="text-white">{currentIndex + 1}</span><span className="mx-1.5 text-gray-500">/</span><span className="text-gray-400">{images.length}</span>
          </span>
          <button type="button" onClick={onClose} aria-label="Close image viewer" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-gray-200 transition-all hover:border-white/20 hover:bg-white/[0.14] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><X className="h-5 w-5" /></button>
        </div>
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 items-center justify-center gap-2.5 py-4 sm:gap-5 sm:py-5 lg:gap-7">
        {images.length > 1 && <button type="button" onClick={showPrevious} aria-label="Previous image" className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-gray-200 shadow-lg transition-all hover:border-emerald-300/40 hover:bg-emerald-900/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:h-12 sm:w-12"><ChevronLeft className="h-6 w-6" /></button>}
        <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-2 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:rounded-[22px] sm:p-4">
          <img src={images[currentIndex]} alt="" className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl" draggable="false" />
        </div>
        {images.length > 1 && <button type="button" onClick={showNext} aria-label="Next image" className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-gray-200 shadow-lg transition-all hover:border-emerald-300/40 hover:bg-emerald-900/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:h-12 sm:w-12"><ChevronRight className="h-6 w-6" /></button>}
      </div>
      <footer className="mx-auto flex w-full max-w-[1440px] shrink-0 items-center justify-between gap-3 border-t border-white/10 px-1 pt-3 text-xs sm:px-2 sm:pt-4">
        <p className="font-medium text-gray-300">Submitted evidence <span className="mx-1.5 text-gray-600">·</span><span className="tabular-nums text-gray-500">Image {currentIndex + 1} of {images.length}</span></p>
        <p className="hidden items-center gap-2 text-gray-500 sm:flex"><span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-gray-300">←</span><span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-gray-300">→</span> Navigate <span className="mx-1 text-gray-700">·</span><span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-gray-300">ESC</span> Close</p>
      </footer>
    </div>
  );
}

export default function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [report, setReport] = useState(null);
  const [clusteredReports, setClusteredReports] = useState([]);
  const [reportedPost, setReportedPost] = useState(null);
  const [reportedComment, setReportedComment] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(null);
  const [imageGallery, setImageGallery] = useState(null);
  const [activeDetailModal, setActiveDetailModal] = useState(null);

  // Modal State for Penalty Options
  const [actionModal, setActionModal] = useState({ isOpen: false, type: null });
  const [deleteContentOption, setDeleteContentOption] = useState(true);

  const openImageGallery = (images, index) => setImageGallery({ images, index });

  const resolveMediaUrls = (media) => {
    if (!media) return [];
    let urls = [];
    if (Array.isArray(media)) urls = media;
    else if (typeof media === 'string') {
      try { urls = JSON.parse(media); urls = Array.isArray(urls) ? urls : [media]; } catch { urls = [media]; }
    }
    return urls.map((url) => {
      if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) return url;
      const { data } = supabase.storage.from('community_media').getPublicUrl(url);
      return data?.publicUrl || url;
    });
  };

  const fetchParentPost = async (postId) => {
    const { data: postData, error: postErr } = await supabase.from('community_posts').select(`*, author:user_profiles!community_posts_user_id_fkey(id, full_name, role, avatar_url)`).eq('id', postId).maybeSingle();
    if (!postErr && postData) {
      setReportedPost(postData);
      const { data: comments, error: commErr } = await supabase.from('community_comments').select(`*, user:user_profiles!community_comments_user_id_fkey(id, full_name, avatar_url)`).eq('post_id', postData.id).order('created_at', { ascending: true });
      if (!commErr) setPostComments(comments || []);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: repData, error: repErr } = await supabase.from('reports').select(`*, reporter:user_profiles!reports_reporter_id_fkey(id, full_name, role, avatar_url), reported:user_profiles!reports_reported_user_id_fkey(id, full_name, role, avatar_url), assignee:user_profiles!reports_assigned_to_fkey(id, full_name)`).eq('id', id).maybeSingle();
      if (repErr) throw repErr;
      if (!repData) { setReport(null); return; }
      setReport(repData);

      const refType = repData.reference_type?.toLowerCase() || '';
      const refId = repData.reference_id;

      if (refId) {
        const { data: clusterData } = await supabase.from('reports').select(`id, details, reason, reference_type, created_at, reporter_id, reporter:user_profiles!reports_reporter_id_fkey(id, full_name, role, avatar_url)`).eq('reference_id', refId).order('created_at', { ascending: true });
        setClusteredReports(clusterData || [repData]);
      } else {
        setClusteredReports([repData]);
      }

      if (refType.includes('comment') && refId) {
        const { data: commData, error: commErr } = await supabase.from('community_comments').select(`*, author:user_profiles!community_comments_user_id_fkey(id, full_name, role, avatar_url)`).eq('id', refId).maybeSingle();
        if (!commErr && commData) {
          setReportedComment(commData);
          if (commData.post_id) await fetchParentPost(commData.post_id);
        }
      } else if (refId) {
        await fetchParentPost(refId);
      }
    } catch (err) {
      console.error('Failed to load incident report dossier:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [id]);

  const isParticipant = Boolean(currentUserId && report && (clusteredReports.some(r => r.reporter_id === currentUserId) || currentUserId === report.reported_user_id));

  const handleClaim = async () => {
    if (isParticipant) { alert('Action blocked: Conflict of interest policy prohibits self-adjudication.'); return; }
    setIsProcessing('claim');
    try {
      const { error } = await supabase.from('reports').update({ assigned_to: currentUserId }).eq('id', report.id);
      if (error) throw error;
      await fetchReportData();
    } catch (err) { alert('Failed to claim ticket: ' + err.message); } finally { setIsProcessing(null); }
  };

  const handleOpenActionModal = (actionType) => {
    if (isParticipant) { alert('Action blocked: Conflict of interest policy prohibits self-adjudication.'); return; }

    if (actionType === 'dismiss' || actionType === 'warning') {
      executeFinalAction(actionType, false);
    } else {
      setDeleteContentOption(true);
      setActionModal({ isOpen: true, type: actionType });
    }
  };

  const executeFinalAction = async (actionType, shouldDeleteContentParam) => {
    setActionModal({ isOpen: false, type: null });
    setIsProcessing(actionType);

    const shouldDeleteContent = (actionType === 'penalty' || actionType === 'escalate') ? shouldDeleteContentParam : false;

    try {
      const { complainantText } = parseReportDetails(report.details);
      const timestamp = new Date().toLocaleString();
      const autoNote = getAutoNote(report.reason, actionType);

      const updatedDetails = `${complainantText}\n\n[RESOLVED - ${actionType.toUpperCase()} on ${timestamp}]: ${autoNote}`;
      const newStatus = actionType === 'escalate' ? 'resolved' : 'resolved';

      await supabase.from('reports').update({ status: newStatus, details: updatedDetails, mod_action_notes: autoNote }).eq('id', report.id);

      if (report.reference_id && clusteredReports.length > 1) {
         await supabase.from('reports').update({ status: newStatus, assigned_to: currentUserId, mod_action_notes: autoNote }).eq('reference_id', report.reference_id).neq('id', report.id);
      }

      if (actionType === 'warning') {
        await supabase.rpc('issue_penalty', { target_id: report.reported_user_id, strike_to_add: 1, penalty_hours: 0, penalty_type: 'community' });
      } else if (actionType === 'penalty') {
        await supabase.rpc('issue_penalty', { target_id: report.reported_user_id, strike_to_add: 1, penalty_hours: 12, penalty_type: 'community' });
      }

      // ─── REPEAT OFFENDERS & ADMIN ESCALATIONS INTEGRATION (WITH MODERATOR_ID) ───
      if (actionType === 'warning' || actionType === 'penalty' || actionType === 'escalate') {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('violation_count')
          .eq('id', report.reported_user_id)
          .single();

        if (profileData) {
          const currentCount = profileData.violation_count || 0;

          if (currentCount >= 3) {
            const { data: existingOffender } = await supabase
              .from('repeat_offenders')
              .select('id')
              .eq('user_id', report.reported_user_id)
              .maybeSingle();

            let repeatOffenderId = existingOffender?.id;

            if (!existingOffender) {
              const { data: newOffender, error: insertOffenderErr } = await supabase
                .from('repeat_offenders')
                .insert([{ user_id: report.reported_user_id, moderator_id: currentUserId }])
                .select('id')
                .single();

              if (!insertOffenderErr && newOffender) {
                repeatOffenderId = newOffender.id;
              }
            }

            if (actionType === 'escalate') {
              await supabase
                .from('admin_escalations')
                .insert([{
                  user_id: report.reported_user_id,
                  repeat_offender_id: repeatOffenderId,
                  status: 'pending'
                }]);
            }
          }
        }
      }
      // ────────────────────────────────────────────────────────

      if (shouldDeleteContent) {
        try {
          if (reportedComment) {
            await supabase.from('community_comments').delete().eq('id', reportedComment.id);
          } else if (reportedPost) {
            await supabase.from('community_posts').delete().eq('id', reportedPost.id);
          }
        } catch (contentDelErr) { console.warn('Could not remove reported content automatically:', contentDelErr); }
      }

      const logEntries = [];
      const logActionTypes = { 'dismiss': 'REPORT_DISMISSED', 'warning': 'USER_WARNED', 'penalty': 'USER_PENALIZED', 'escalate': 'ESCALATED_TO_ADMIN' };
      const actionDescriptions = { dismiss: 'Dismiss report (No violation detected)', warning: 'Issue an official community conduct warning (+1 Strike)', penalty: 'Apply a 12-hour account timeout (+1 Strike)', escalate: 'Escalate to Admin for severe review and potential ban' };

      logEntries.push({ moderator_id: currentUserId, target_user_id: report.reported_user_id, action_type: logActionTypes[actionType], reference_id: report.id, details: `${actionDescriptions[actionType]}. Notes: ${autoNote}${shouldDeleteContent ? ' (Content Deleted)' : ''}` });

      if (shouldDeleteContent && actionType !== 'dismiss' && (reportedComment || reportedPost)) {
        logEntries.push({ moderator_id: currentUserId, target_user_id: report.reported_user_id, action_type: 'DELETE_POST', reference_id: reportedComment ? reportedComment.id : reportedPost.id, details: `Auto-deleted offending ${reportedComment ? 'comment' : 'post'} during report adjudication.` });
      }

      if (logEntries.length > 0) {
        const { error: logErr } = await supabase.from('mod_logs').insert(logEntries);
        if (logErr) console.warn('Failed to insert mod log:', logErr);
      }

      try {
        let notifContent = '';
        let notifType = '';
        const deletedNoticeTag = shouldDeleteContent ? '\n\nAction Taken: The offending content has been permanently removed by the moderation team.' : '';

        if (actionType === 'warning') {
          notifType = 'account_warning';
          notifContent = `Your profile received a warning regarding: "${report.reason}".\n\nModerator Note: ${autoNote}`;
        } else if (actionType === 'penalty') {
          notifType = 'account_penalized';
          notifContent = `Your account has been temporarily restricted for 12 hours from posting and commenting in the Community regarding violations in: "${report.reason}".\n\nModerator Note: ${autoNote}${deletedNoticeTag}`;
        } else if (actionType === 'escalate') {
          notifType = 'account_escalated';
          notifContent = `Your account behavior has been escalated to an Administrator for severe review regarding: "${report.reason}".\n\nModerator Note: ${autoNote}${deletedNoticeTag}`;
        }

        let dynamicLink = '/notifications';
        if (!shouldDeleteContent) {
          const refType = report.reference_type?.toLowerCase() || '';
          if (refType.includes('post')) {
            dynamicLink = `/community?post=${report.reference_id}`;
          } else if (refType.includes('comment') && reportedComment?.post_id) {
            dynamicLink = `/community?post=${reportedComment.post_id}&comment=${report.reference_id}`;
          }
        }

        if (notifContent && report.reported_user_id) {
          await supabase.from('notifications').insert([{
            user_id: report.reported_user_id,
            type: notifType,
            content: notifContent,
            link_url: dynamicLink,
          }]);
        }

        if (clusteredReports.length > 0) {
           const reporterNotifications = clusteredReports
              .filter(r => r.reporter_id)
              .map(r => ({
                 user_id: r.reporter_id,
                 type: 'report_updated',
                 content: `Your report regarding "${report.reason}" has been reviewed and adjudicated by Trust & Safety.`,
                 link_url: '/notifications',
              }));
           if (reporterNotifications.length > 0) await supabase.from('notifications').insert(reporterNotifications);
        }
      } catch (notifErr) { console.warn('Notification log skipped:', notifErr.message); }

      alert('Ticket successfully adjudicated and resolved.');
      navigate('/moderator/reports');
    } catch (err) {
      console.error(err);
      alert('Error finalizing ticket: ' + err.message);
    } finally {
      setIsProcessing(null);
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

  if (!report) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400">
          <FileText className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-gray-900">Record not found</p>
        <p className="mb-5 mt-1 text-xs text-gray-500">This report does not exist or has been removed from the database.</p>
        <Link to="/moderator/reports" className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}>
          <ArrowLeft className="h-3.5 w-3.5" /> Return to reports
        </Link>
      </div>
    );
  }

  const postMediaUrls = reportedPost ? resolveMediaUrls(reportedPost.media_urls) : [];
  const { resolutionMeta, resolutionNotes: existingResolutionNotes } = parseReportDetails(report.details);
  const postCommentIds = new Set(postComments.map((comment) => comment.id));
  const topLevelCommentCount = postComments.filter((comment) => !comment.parent_comment_id || !postCommentIds.has(comment.parent_comment_id)).length;
  const totalReplyCount = postComments.length - topLevelCommentCount;
  const involvedReporters = Array.from(new Map(clusteredReports.map((claim) => [claim.reporter_id || claim.reporter?.id || claim.id, claim])).values());
  const reporterReportCounts = clusteredReports.reduce((counts, claim) => {
    const key = claim.reporter_id || claim.reporter?.id || claim.id;
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
  const contentCategory = reportedPost?.category || 'Not specified';
  const claimReasons = Array.from(new Map(clusteredReports.map((claim) => claim.reason?.trim()).filter(Boolean).map((reason) => [reason.toLowerCase(), reason])).values());
  const claimReasonSummary = claimReasons.length > 1 ? 'Mixed reasons' : claimReasons[0] || report.reason || 'Not specified';
  const pageTitle = reportedComment ? 'Community comment review' : reportedPost ? 'Community post review' : 'User report review';

  const isPending = report.status === 'pending';
  const isEscalated = report.status === 'escalated';
  const firstFiledAt = clusteredReports[0]?.created_at || report.created_at;
  const assignedLabel = report.assigned_to
    ? (report.assigned_to === currentUserId ? 'You' : report.assignee?.full_name || 'Another moderator')
    : 'Unassigned';
  const progressSteps = [
    {
      label: 'Filed',
      done: true,
      detail: firstFiledAt ? new Date(firstFiledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'On record',
    },
    {
      label: 'Claimed',
      done: Boolean(report.assigned_to),
      detail: report.assigned_to ? `By ${assignedLabel}` : 'Waiting for a moderator',
    },
    {
      label: 'Decision',
      done: !isPending,
      detail: !isPending
        ? (resolutionMeta ? (resolutionMeta.split(' on ')[0] || 'Resolved') : isEscalated ? 'Escalated' : 'Resolved')
        : 'Not decided yet',
    },
  ];
  const currentStepIndex = progressSteps.findIndex(step => !step.done);

  const adjudicationActions = [
    { type: 'dismiss', Icon: X, idle: 'Dismiss (No Violation)', busy: 'Dismissing Ticket...', hint: 'Unfounded', tone: 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50', hintTone: 'text-gray-500' },
    { type: 'warning', Icon: AlertTriangle, idle: 'Issue Formal Warning', busy: 'Issuing Warning...', hint: '+1 Strike', tone: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100/70', hintTone: 'text-amber-700' },
    { type: 'penalty', Icon: Clock, idle: 'Apply 12h Timeout', busy: 'Applying Penalty...', hint: '+1 Strike', tone: 'border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100/70', hintTone: 'text-orange-700' },
    { type: 'escalate', Icon: UploadCloud, idle: 'Escalate to Admin', busy: 'Escalating...', hint: 'Severe', tone: 'border-rose-700 bg-rose-700 text-white hover:bg-rose-800', hintTone: 'text-rose-200' },
  ];

  const cardClass = 'rounded-2xl border border-gray-200 bg-white shadow-sm';

  return (
    <div className="-mt-2 mx-auto w-full max-w-5xl space-y-6 font-sans antialiased text-gray-700">

      {/* ── STREAMLINED CASE HEADER ── */}
      <header className="border-b border-gray-200 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-[28px]">{pageTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">Review the source material and linked filings before recording an outcome.</p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold tracking-wide text-gray-600">
            <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Case ID</span>
            #{report.id.slice(0, 8)}
          </span>
        </div>
      </header>

      {isParticipant && (
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-rose-500 bg-rose-50 px-4 py-3.5 text-sm text-rose-900" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span><span className="font-semibold">Self-adjudication restriction:</span> You are an involved party in this complaint. Adjudication controls have been disabled to ensure institutional impartiality.</span>
        </div>
      )}

      {/* ── NEW CASE-FILE ARCHITECTURE: VERTICAL CASE SPINE + EVIDENCE READER ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-7">

        {/* Case spine: compact identity, filing facts, progress, and party access. */}
        <aside className="order-2 space-y-3 lg:order-1 lg:sticky lg:top-28 lg:self-start">
          <section aria-label="Case identity" className={`${cardClass} overflow-hidden`}>
            <div className="border-l-4 border-emerald-700 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Subject of report</p>
              <div className="mt-2.5 flex min-w-0 items-center gap-3">
                <Avatar
                  url={report.reported?.avatar_url}
                  name={report.reported?.full_name}
                  className="h-10 w-10 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{report.reported?.full_name || 'Flagged User'}</p>
                  <p className="text-xs capitalize text-gray-500">{report.reported?.role || 'User'}</p>
                </div>
              </div>
              <span className="mt-2 inline-flex rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">Reported account</span>
            </div>

            <div className="border-t border-gray-100 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Primary concern</p>
              <p className="mt-1 break-words text-sm font-semibold leading-5 text-gray-900">{claimReasonSummary}</p>
              <p className="mt-0.5 text-xs text-gray-500">{contentCategory}</p>
            </div>

            <dl className="grid grid-cols-2 border-t border-gray-100">
              <div className="border-r border-gray-100 px-4 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Filings</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{clusteredReports.length}</dd>
                <dd className="text-[11px] text-gray-500">linked reports</dd>
              </div>
              <div className="px-4 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Complainants</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">{involvedReporters.length}</dd>
                <dd className="text-[11px] text-gray-500">unique reporters</dd>
              </div>
            </dl>

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
                      {step.done && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
                    </span>
                    <p className={`text-xs font-semibold ${step.done || isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>{step.label}</p>
                    <p className="mt-0.5 break-words text-[11px] leading-4 text-gray-500">{step.detail}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-label="Involved parties" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-900">People in this case</p>
                <p className="mt-0.5 text-[11px] text-gray-500">{involvedReporters.length} complainant{involvedReporters.length === 1 ? '' : 's'}</p>
              </div>
              <div className="flex -space-x-2" aria-hidden="true">
                {involvedReporters.slice(0, 4).map((claim) => (
                  <Avatar
                    key={claim.reporter_id || claim.reporter?.id || claim.id}
                    url={claim.reporter?.avatar_url}
                    name={claim.reporter?.full_name}
                    className="h-7 w-7 rounded-full border-2 border-white bg-gray-200 text-[10px] text-gray-600"
                  />
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setActiveDetailModal('parties')} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 ${FOCUS_RING}`}>
              <Users className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" /> Open party register
            </button>
          </section>
        </aside>

        {/* Evidence reader: source material first, then filings, then the decision. */}
        <main className="order-1 min-w-0 space-y-7 lg:order-2">
          <section aria-labelledby="evidence-heading" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">01 / Source material</p>
                <h2 id="evidence-heading" className="mt-1 text-lg font-semibold tracking-tight text-gray-950">Evidence under review</h2>
              </div>
              <span className="text-[11px] text-gray-400">Original community activity</span>
            </div>

            {reportedComment && (
              <section className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-rose-50/70 px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Reported comment
                  </span>
                  <time className="text-[11px] tabular-nums text-gray-500">{new Date(reportedComment.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      url={reportedComment.author?.avatar_url}
                      name={reportedComment.author?.full_name}
                      className="h-8 w-8 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-600"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{reportedComment.author?.full_name || 'Comment Author'}</p>
                      <p className="text-[11px] text-gray-500">Comment author</p>
                    </div>
                  </div>
                  <blockquote className="mt-4 border-l-[3px] border-rose-300 bg-rose-50/60 px-4 py-3 text-sm leading-6 text-gray-900">“{reportedComment.content}”</blockquote>
                </div>
              </section>
            )}

            {reportedPost ? (
              <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      url={reportedPost.author?.avatar_url}
                      name={reportedPost.author?.full_name}
                      className="h-9 w-9 rounded-full border border-gray-200 bg-gray-100 text-xs text-gray-600"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{reportedPost.author?.full_name || 'Post Author'}</p>
                      <p className="text-[11px] tabular-nums text-gray-500">{new Date(reportedPost.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">{reportedPost.category || 'General'}</span>
                    <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${reportedComment ? 'border-gray-200 bg-white text-gray-600' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{reportedComment ? 'Parent context' : 'Reported post'}</span>
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-800">{reportedPost.content}</p>
                  {postMediaUrls.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> Attached evidence
                        </span>
                        <span className="text-[11px] tabular-nums text-gray-400">{postMediaUrls.length} file{postMediaUrls.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50"><PostImageCollage mediaUrls={postMediaUrls} onOpen={openImageGallery} /></div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-[#faf9f6] px-4 py-3.5 sm:px-5">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900">Community discussion</h3>
                    <p className="mt-0.5 text-[11px] text-gray-500">{postComments.length === 0 ? 'No comments published under this post.' : `${topLevelCommentCount} thread${topLevelCommentCount === 1 ? '' : 's'}, ${totalReplyCount} repl${totalReplyCount === 1 ? 'y' : 'ies'}`}</p>
                  </div>
                  {postComments.length > 0 && (
                    <button type="button" onClick={() => setActiveDetailModal('comments')} className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 ${FOCUS_RING}`}>
                      <MessageSquare className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" /> Read discussion
                    </button>
                  )}
                </div>
              </article>
            ) : (
              !reportedComment && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400"><FileText className="h-5 w-5" /></span>
                  <p className="mt-3 text-sm font-semibold text-gray-900">No content record</p>
                  <p className="mt-1 text-xs text-gray-500">No active community post record found for this reference.</p>
                </div>
              )
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            <section aria-labelledby="claims-heading" className="min-w-0 space-y-3">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 px-3.5 py-3 sm:px-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">02 / Submitted reports</p>
                <h2 id="claims-heading" className="mt-1 text-lg font-semibold tracking-tight text-gray-950">Complaint record</h2>
              </div>
              <span className="text-[11px] tabular-nums text-gray-400">{clusteredReports.length} filing{clusteredReports.length === 1 ? '' : 's'}</span>
              </div>

            <div className="overflow-hidden">
              <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="px-3.5 py-3 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Consolidated reason</p>
                  <p className="mt-1.5 break-words text-sm font-semibold text-gray-900">{claimReasonSummary}</p>
                </div>
                <div className="px-3.5 py-3 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Content category</p>
                  <p className="mt-1.5 break-words text-sm font-semibold text-gray-900">{contentCategory}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 border-t border-gray-100 bg-[#faf9f6] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div>
                  <p className="text-xs font-semibold text-gray-800">Individual complainant statements</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{clusteredReports.length} complete statement{clusteredReports.length === 1 ? '' : 's'} from {involvedReporters.length} complainant{involvedReporters.length === 1 ? '' : 's'}.</p>
                </div>
                {clusteredReports.length > 0 && (
                  <button type="button" onClick={() => setActiveDetailModal('claims')} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 ${FOCUS_RING}`}>
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Read all statements
                  </button>
                )}
              </div>
            </div>
            </div>

            {resolutionMeta && (
              <section aria-label="Recorded verdict" className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <h3 className="text-xs font-semibold text-emerald-900">Recorded verdict</h3>
                  </div>
                  <span className="text-[11px] tabular-nums text-emerald-700">{resolutionMeta.split(' on ')[1] || ''}</span>
                </div>
                <div className="space-y-2 p-4">
                  <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900">{resolutionMeta.split(' on ')[0] || 'RESOLVED'}</span>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">“{existingResolutionNotes}”</p>
                </div>
              </section>
            )}
          </section>

          <section aria-labelledby="decision-heading" className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 px-3.5 py-3 sm:px-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">03 / Moderator response</p>
                <h2 id="decision-heading" className="mt-1 text-lg font-semibold tracking-tight text-gray-950">Decision desk</h2>
              </div>
              <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isPending ? 'bg-amber-50 text-amber-800' : isEscalated ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>{isPending ? 'Awaiting decision' : isEscalated ? 'Escalated' : 'Closed'}</span>
            </div>
            <div className="p-3.5 sm:p-4">
              {isParticipant ? (
                <p className="text-xs leading-5 text-gray-500">You cannot act on this case due to conflict of interest guidelines.</p>
              ) : report.status === 'pending' ? (
                !report.assigned_to ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">This case is waiting for an owner.</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">Claim custody to record findings and take moderation action.</p>
                    </div>
                    <button onClick={handleClaim} disabled={isProcessing === 'claim'} className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>{isProcessing === 'claim' ? 'Claiming Ticket...' : 'Claim this case'}</button>
                  </div>
                ) : report.assigned_to === currentUserId ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Choose an outcome</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">Automated remarks will be generated based on the chosen action and report reason.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {adjudicationActions.map(({ type, Icon, idle, busy, hint, tone, hintTone }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleOpenActionModal(type)}
                          disabled={Boolean(isProcessing)}
                          className={`flex min-h-[44px] items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${FOCUS_RING}`}
                        >
                          <span className="inline-flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> <span>{isProcessing === type ? busy : idle}</span></span>
                          <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${hintTone}`}>{hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 px-3.5 py-3 text-xs leading-5 text-gray-600">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <span>Assigned to <span className="font-semibold text-gray-800">{report.assignee?.full_name || 'another moderator'}</span>.</span>
                  </div>
                )
              ) : (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold leading-5 text-emerald-800">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>This incident inquiry has been resolved and closed.</span>
                </div>
              )}
            </div>
          </section>
          </div>
        </main>
      </div>

      {/* ── ACTION CONFIRMATION MODAL ── */}
      {actionModal.isOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-action-title" className="fixed inset-0 z-[700] flex items-center justify-center bg-gray-950/65 p-3 font-sans backdrop-blur-sm sm:p-5">
          <div className="w-full max-w-lg overflow-hidden rounded-[22px] border border-white/80 bg-[#faf9f6] shadow-[0_28px_90px_rgba(15,23,42,0.32)]">
            <div className="h-1 shrink-0 bg-gradient-to-r from-rose-800 via-rose-600 to-amber-400" aria-hidden="true" />
            <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-700 shadow-sm">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 id="confirm-action-title" className="text-lg font-semibold capitalize leading-tight tracking-tight text-gray-950">Confirm {actionModal.type} action</h3>
            </div>
            <p className="text-sm leading-6 text-gray-600">You are about to issue a <span className="font-semibold text-gray-900">{actionModal.type}</span> against this user. Please confirm your preferences below:</p>

            {(actionModal.type === 'penalty' || actionModal.type === 'escalate') && (reportedPost || reportedComment) && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm font-semibold tracking-tight text-gray-900">
                  <input type="checkbox" checked={deleteContentOption} onChange={(e) => setDeleteContentOption(e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-emerald-700" />
                  <span>Remove / Delete offending content immediately</span>
                </label>
                <p className="mt-2 pl-[26px] text-xs leading-5 text-gray-500">If checked, the offender will receive a notification stating their post was permanently removed.</p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200/80 bg-white/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={() => setActionModal({ isOpen: false, type: null })} className={`rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:min-w-28 ${FOCUS_RING}`}>Cancel</button>
              <button type="button" onClick={() => executeFinalAction(actionModal.type, deleteContentOption)} className={`rounded-xl bg-rose-700 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-rose-800 sm:min-w-40 ${FOCUS_RING}`}>Confirm & execute</button>
            </div>
            </div>
          </div>
        </div>
      )}

      {activeDetailModal && (
        <CaseDetailsModal title={activeDetailModal === 'comments' ? 'Community discussion' : activeDetailModal === 'claims' ? `Complainant claims (${clusteredReports.length})` : `Involved parties (${involvedReporters.length} complainants)`} onClose={() => setActiveDetailModal(null)}>
          {activeDetailModal === 'comments' && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-gray-950">Conversation timeline</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Replies are nested under their parent comment. The reported comment is highlighted.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium tabular-nums text-gray-600">{topLevelCommentCount} {topLevelCommentCount === 1 ? 'thread' : 'threads'}</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium tabular-nums text-emerald-700">{totalReplyCount} {totalReplyCount === 1 ? 'reply' : 'replies'}</span>
                </div>
              </div>
              <ModerationCommentThread comments={postComments} flaggedCommentId={reportedComment?.id} />
            </>
          )}

          {activeDetailModal === 'claims' && (
            <>
              <section className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5">
                <div><p className="text-xs font-medium text-gray-500">Reason</p><p className="mt-1 text-sm font-semibold text-gray-900">{claimReasonSummary}</p></div>
                <div><p className="text-xs font-medium text-gray-500">Content category</p><p className="mt-1 text-sm font-semibold text-gray-900">{contentCategory}</p></div>
                <div><p className="text-xs font-medium text-gray-500">Reference type</p><p className="mt-1 text-sm font-semibold capitalize text-gray-900">{report.reference_type || 'Not specified'}</p></div>
              </section>
              {clusteredReports.map((claim) => {
                const { complainantText } = parseReportDetails(claim.details);
                return (
                  <article key={claim.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          url={claim.reporter?.avatar_url}
                          name={claim.reporter?.full_name}
                          className="h-9 w-9 rounded-full border border-gray-200 bg-gray-100 text-sm text-gray-600"
                        />
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{claim.reporter?.full_name || 'Anonymous User'}</p><p className="text-xs capitalize text-gray-500">{claim.reporter?.role || 'User'}</p></div>
                      </div>
                      <time className="text-xs tabular-nums text-gray-500">{new Date(claim.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </div>
                    <div className="mb-3 rounded-xl border border-gray-100 bg-[#faf9f6] px-3.5 py-3"><p className="text-xs font-medium text-gray-500">Reason for this filing</p><p className="mt-0.5 text-sm font-medium text-gray-800">{claim.reason || report.reason || 'Not specified'}</p></div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{complainantText}</p>
                  </article>
                );
              })}
            </>
          )}

          {activeDetailModal === 'parties' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-gray-500">Complainants</p><p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-gray-900">{involvedReporters.length}</p><p className="text-xs text-gray-500">{clusteredReports.length} linked filing{clusteredReports.length === 1 ? '' : 's'}</p></div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm"><p className="text-xs font-medium text-rose-700">Reported subject</p><p className="mt-1 text-base font-semibold text-gray-900">{report.reported?.full_name || 'Flagged User'}</p><p className="text-xs capitalize text-gray-600">{report.reported?.role || 'User'}</p></div>
              </div>
              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4"><div><h3 className="text-sm font-semibold text-gray-900">Filing parties</h3><p className="text-xs text-gray-500">Unique reporters linked to this case.</p></div><Users className="h-4 w-4 text-gray-400" aria-hidden="true" /></div>
                <div className="divide-y divide-gray-100">
                  {involvedReporters.map((claim) => {
                    const key = claim.reporter_id || claim.reporter?.id || claim.id;
                    const name = claim.reporter?.full_name || 'Anonymous User';
                    return (
                      <div key={key} className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-gray-50/80">
                        <Avatar
                          url={claim.reporter?.avatar_url}
                          name={name}
                          className="h-10 w-10 rounded-full border border-gray-200 bg-gray-100 text-sm text-gray-600"
                        />
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-900">{name}</p><p className="text-xs capitalize text-gray-500">{claim.reporter?.role || 'User'}</p></div>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium tabular-nums text-gray-600">{reporterReportCounts.get(key) || 1} {reporterReportCounts.get(key) === 1 ? 'filing' : 'filings'}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </CaseDetailsModal>
      )}

      <ImageGalleryModal images={imageGallery?.images || []} initialIndex={imageGallery?.index ?? 0} onClose={() => setImageGallery(null)} />
    </div>
  );
}