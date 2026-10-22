import { useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
    check: <><path d="m5 12 4 4L19 6" /></>,
  };
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      {paths[name] || paths.report}
    </svg>
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
      className="fixed inset-0 z-[650] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-6"
    >
      <section className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Moderator review</p>
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          ><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9]">
          <div className="space-y-4">{children}</div>
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
    <div className={depth > 0 ? 'ml-4 border-l-2 border-slate-200 pl-3 sm:ml-7 sm:pl-4' : 'space-y-4'}>
      {threadItems.map((comment) => {
        const children = comments.filter((reply) => reply.parent_comment_id === comment.id);
        const isFlagged = comment.id === flaggedCommentId;
        const name = comment.user?.full_name || 'Community member';
        return (
          <article key={comment.id} className="min-w-0" data-comment-id={comment.id}>
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600">
                {comment.user?.avatar_url ? (
                  <img src={comment.user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">{name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`rounded-2xl border px-3.5 py-3 shadow-sm ${isFlagged ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{name}</span>
                      {depth > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Reply</span>}
                      {isFlagged && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Reported comment</span>}
                    </div>
                    <time className="text-[11px] text-slate-500">{new Date(comment.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{comment.content}</p>
                </div>
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCollapsed((previous) => ({ ...previous, [comment.id]: !previous[comment.id] }))}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
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
    <div className={`grid w-full min-w-0 gap-1 overflow-hidden rounded-xl bg-[#f0f2ee] ${gridClass}`}>
      {visibleImages.map((url, index) => {
        const isLargeTile = (count === 3 || count === 5) && index === 0;
        const hasOverflow = total > 5 && index === 4;
        return (
          <button key={`${url}-${index}`} type="button" onClick={() => onOpen(mediaUrls, index)} className={`group relative min-h-0 min-w-0 overflow-hidden bg-[#e9ece8] ${isLargeTile ? 'row-span-2' : ''}`}>
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
    <div role="dialog" aria-modal="true" onClick={event => event.target === event.currentTarget && onClose()} className="fixed inset-0 z-[700] flex flex-col bg-black/90 p-3 text-white sm:p-5">
      <div className="flex shrink-0 items-center justify-between">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">{currentIndex + 1} / {images.length}</span>
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-4">
        {images.length > 1 && <button type="button" onClick={showPrevious} className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></button>}
        <img src={images[currentIndex]} alt="" className="max-h-[calc(100vh-112px)] max-w-[calc(100vw-128px)] select-none object-contain" draggable="false" />
        {images.length > 1 && <button type="button" onClick={showNext} className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"><ChevronRight className="h-6 w-6" /></button>}
      </div>
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
      // Walang delete modal confirmation for Dismiss and Warning
      executeFinalAction(actionType, false);
    } else {
      // Penalty at Escalate lang ang may Delete Content Option
      setDeleteContentOption(true);
      setActionModal({ isOpen: true, type: actionType });
    }
  };

  const executeFinalAction = async (actionType, shouldDeleteContentParam) => {
    setActionModal({ isOpen: false, type: null });
    setIsProcessing(actionType);

    // Strict rule
    const shouldDeleteContent = (actionType === 'penalty' || actionType === 'escalate') ? shouldDeleteContentParam : false;

    try {
      const { complainantText } = parseReportDetails(report.details);
      const timestamp = new Date().toLocaleString();
      const autoNote = getAutoNote(report.reason, actionType);
      
      const updatedDetails = `${complainantText}\n\n[RESOLVED - ${actionType.toUpperCase()} on ${timestamp}]: ${autoNote}`;
      const newStatus = actionType === 'escalate' ? 'escalated' : 'resolved';

      await supabase.from('reports').update({ status: newStatus, details: updatedDetails, mod_action_notes: autoNote }).eq('id', report.id);
      
      if (report.reference_id && clusteredReports.length > 1) {
         await supabase.from('reports').update({ status: newStatus, assigned_to: currentUserId, mod_action_notes: autoNote }).eq('reference_id', report.reference_id).neq('id', report.id);
      }

      if (actionType === 'warning') {
        await supabase.rpc('issue_penalty', { target_id: report.reported_user_id, strike_to_add: 1, penalty_hours: 0, penalty_type: 'community' });
      } else if (actionType === 'penalty') {
        await supabase.rpc('issue_penalty', { target_id: report.reported_user_id, strike_to_add: 1, penalty_hours: 12, penalty_type: 'community' });
      }

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

  if (loading) return <div className="py-20 text-center text-xs font-medium text-slate-500">Loading case documentation...</div>;

  if (!report) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-sm font-semibold text-slate-800">Record Not Found</p>
        <p className="text-xs text-slate-500 mt-1 mb-4">This report does not exist or has been removed from the database.</p>
        <Link to="/moderator/reports" className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800">Return to Reports</Link>
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

  return (
    <div className="max-w-7xl mx-auto space-y-3 font-sans text-slate-700">
      
      {/* ── BREADCRUMB & HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
            <Link to="/moderator/reports" className="hover:text-slate-900 transition">User Reports</Link>
            <span>/</span>
            <span className="font-mono text-slate-400">#{report.id.slice(0, 8)}</span>
          </div>
          <h1 className="flex items-center gap-2 text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl">
            {pageTitle}
            {clusteredReports.length > 1 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">{clusteredReports.length} linked reports</span>}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 h-fit rounded-full text-xs font-bold uppercase tracking-wider border ${report.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>{report.status}</span>
          <div className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 capitalize">{report.reference_type || 'User Conduct'}</div>
        </div>
      </div>

      {isParticipant && (
        <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm" role="alert">
          <ModeratorIcon name="alert" className="mt-0.5 text-rose-600" /><span><b>Self-adjudication restriction:</b> You are an involved party in this complaint. Adjudication controls have been disabled to ensure institutional impartiality.</span>
        </div>
      )}

      {/* ── WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column (2 Cols): Evidence Dossier */}
        <div className="lg:col-span-2 space-y-4">
          
          {reportedComment && (
            <div className="bg-rose-50/40 border border-rose-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider bg-rose-100 px-2 py-0.5 rounded">Reported Offending Comment</span>
                <span className="text-xs text-slate-400">{new Date(reportedComment.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs overflow-hidden">
                  {reportedComment.author?.avatar_url ? <img src={reportedComment.author.avatar_url} alt="" className="w-full h-full object-cover" /> : reportedComment.author?.full_name?.charAt(0) || 'U'}
                </div>
                <p className="text-xs font-semibold text-slate-900">{reportedComment.author?.full_name || 'Comment Author'}</p>
              </div>
              <div className="bg-white border border-rose-200 rounded-lg p-3 text-xs text-slate-900 leading-relaxed font-medium">"{reportedComment.content}"</div>
            </div>
          )}

          {reportedPost ? (
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden">
                    {reportedPost.author?.avatar_url ? <img src={reportedPost.author.avatar_url} alt="" className="w-full h-full object-cover" /> : reportedPost.author?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 leading-tight">{reportedPost.author?.full_name || 'Post Author'}</p>
                    <p className="text-xs text-slate-400">{new Date(reportedPost.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">{reportedPost.category || 'General'}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{reportedComment ? 'Parent Context' : 'Reported Post'}</span>
                </div>
              </div>
              <div><p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{reportedPost.content}</p></div>
              {postMediaUrls.length > 0 && (
                <div className="pt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Attached Media ({postMediaUrls.length})</span>
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200/80"><PostImageCollage mediaUrls={postMediaUrls} onOpen={openImageGallery} /></div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Community discussion</h4>
                  <p className="mt-0.5 text-xs text-slate-500">{postComments.length === 0 ? 'No comments published under this post.' : `${topLevelCommentCount} thread${topLevelCommentCount === 1 ? '' : 's'} · ${totalReplyCount} repl${totalReplyCount === 1 ? 'y' : 'ies'}`}</p>
                </div>
                {postComments.length > 0 && (
                  <button type="button" onClick={() => setActiveDetailModal('comments')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ModeratorIcon name="report" size={15} /> View discussion</button>
                )}
              </div>
            </div>
          ) : (
            !reportedComment && <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 text-center text-xs text-slate-400">No active community post record found for this reference.</div>
          )}

          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-800"><ModeratorIcon name="report" className="text-slate-500" /> Complainant claims</h3>
                <p className="mt-1 text-xs text-slate-500">Review each reporter's reason and full statement.</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{clusteredReports.length} filing{clusteredReports.length === 1 ? '' : 's'}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Report reason</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">{claimReasonSummary}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Content category</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">{contentCategory}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                <p className="text-xs text-slate-500">{clusteredReports.length} complete statement{clusteredReports.length === 1 ? '' : 's'} from {involvedReporters.length} complainant{involvedReporters.length === 1 ? '' : 's'}.</p>
                {clusteredReports.length > 0 && (
                  <button type="button" onClick={() => setActiveDetailModal('claims')} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"><ModeratorIcon name="report" size={15} /> View claims</button>
                )}
              </div>
            </div>

            {resolutionMeta && (
              <div className="pt-3 border-t border-slate-100 space-y-1.5 mt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <ModeratorIcon name="scale" size={15} className="text-emerald-700" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Adjudication Verdict & Findings</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-mono">{resolutionMeta.split(' on ')[1] || ''}</span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-1">
                  <span className="px-1.5 py-0.2 rounded text-xs font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 inline-block">{resolutionMeta.split(' on ')[0] || 'RESOLVED'}</span>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed whitespace-pre-wrap pt-0.5">"{existingResolutionNotes}"</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Involved Parties & Adjudication Deck */}
        <div className="space-y-3.5">
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-3.5 space-y-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-800"><ModeratorIcon name="users" className="text-slate-500" /> Involved parties</h3>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{involvedReporters.length} complainant{involvedReporters.length === 1 ? '' : 's'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{clusteredReports.length} linked filing{clusteredReports.length === 1 ? '' : 's'}</p>
                </div>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">Reported</span>
              </div>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Subject</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{report.reported?.full_name || 'Flagged User'}</p>
                <p className="text-xs capitalize text-slate-500">{report.reported?.role || 'User'}</p>
              </div>
              <button type="button" onClick={() => setActiveDetailModal('parties')} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ModeratorIcon name="users" size={15} /> View involved parties</button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 shadow-xs">
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-800"><ModeratorIcon name="scale" className="text-slate-500" /> Adjudication action</h3>
            {isParticipant ? (
              <p className="text-xs text-slate-500">You cannot act on this case due to conflict of interest guidelines.</p>
            ) : report.status === 'pending' ? (
              !report.assigned_to ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-600 leading-relaxed">This ticket is unassigned. Claim custody to record findings and take action.</p>
                  <button onClick={handleClaim} disabled={isProcessing === 'claim'} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer">{isProcessing === 'claim' ? 'Claiming Ticket...' : 'Claim Ticket'}</button>
                </div>
              ) : report.assigned_to === currentUserId ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-500 italic mb-2">Automated remarks will be generated based on the chosen action and report reason.</p>
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => handleOpenActionModal('dismiss')} disabled={Boolean(isProcessing)} className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer disabled:opacity-50"><span><ModeratorIcon name="close" size={15} /> {isProcessing === 'dismiss' ? 'Dismissing Ticket...' : 'Dismiss (No Violation)'}</span><span className="text-xs text-slate-400 font-semibold">Unfounded</span></button>
                    <button type="button" onClick={() => handleOpenActionModal('warning')} disabled={Boolean(isProcessing)} className="w-full py-2 px-3 bg-amber-50 border border-amber-300 hover:bg-amber-100/80 text-amber-900 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer disabled:opacity-50"><span><ModeratorIcon name="alert" size={15} /> {isProcessing === 'warning' ? 'Issuing Warning...' : 'Issue Formal Warning'}</span><span className="text-xs text-amber-700 font-semibold">+1 Strike</span></button>
                    <button type="button" onClick={() => handleOpenActionModal('penalty')} disabled={Boolean(isProcessing)} className="w-full py-2 px-3 bg-orange-50 border border-orange-300 hover:bg-orange-100/80 text-orange-900 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer disabled:opacity-50"><span><ModeratorIcon name="clock" size={15} /> {isProcessing === 'penalty' ? 'Applying Penalty...' : 'Apply 12h Timeout'}</span><span className="text-xs text-orange-700 font-semibold">+1 Strike</span></button>
                    <button type="button" onClick={() => handleOpenActionModal('escalate')} disabled={Boolean(isProcessing)} className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer disabled:opacity-50"><span><ModeratorIcon name="send" size={15} /> {isProcessing === 'escalate' ? 'Escalating...' : 'Escalate to Admin'}</span><span className="text-xs text-rose-200 font-semibold">Severe</span></button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Assigned to <b>{report.assignee?.full_name || 'another moderator'}</b>.</div>
              )
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2"><ModeratorIcon name="check" size={16} className="text-emerald-700" /><span>This incident inquiry has been resolved and closed.</span></div>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTION CONFIRMATION MODAL ── */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 capitalize">Confirm {actionModal.type} Action</h3>
            <p className="text-xs text-slate-500 leading-relaxed">You are about to issue a <b>{actionModal.type}</b> against this user. Please confirm your preferences below:</p>

            {/* ONLY SHOW CHECKBOX IF PENALTY OR ESCALATE AND HAS CONTENT */}
            {(actionModal.type === 'penalty' || actionModal.type === 'escalate') && (reportedPost || reportedComment) && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2.5 text-xs text-slate-800 font-semibold cursor-pointer select-none">
                  <input type="checkbox" checked={deleteContentOption} onChange={(e) => setDeleteContentOption(e.target.checked)} className="rounded border-slate-300 text-slate-900 h-4 w-4 cursor-pointer" />
                  <span>Remove / Delete offending content immediately</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-1 pl-6">If checked, the offender will receive a notification stating their post was permanently removed.</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setActionModal({ isOpen: false, type: null })} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
              <button type="button" onClick={() => executeFinalAction(actionModal.type, deleteContentOption)} className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer">Confirm & Execute</button>
            </div>
          </div>
        </div>
      )}

      {activeDetailModal && (
        <CaseDetailsModal title={activeDetailModal === 'comments' ? 'Community discussion' : activeDetailModal === 'claims' ? `Complainant claims (${clusteredReports.length})` : `Involved parties (${involvedReporters.length} complainants)`} onClose={() => setActiveDetailModal(null)}>
          {activeDetailModal === 'comments' && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Conversation timeline</p>
                  <p className="mt-1 text-xs text-slate-500">Replies are nested under their parent comment. The reported comment is highlighted.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{topLevelCommentCount} {topLevelCommentCount === 1 ? 'thread' : 'threads'}</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{totalReplyCount} {totalReplyCount === 1 ? 'reply' : 'replies'}</span>
                </div>
              </div>
              <ModerationCommentThread comments={postComments} flaggedCommentId={reportedComment?.id} />
            </>
          )}

          {activeDetailModal === 'claims' && (
            <>
              <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</p><p className="mt-1 text-sm font-semibold text-slate-900">{claimReasonSummary}</p></div>
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Content category</p><p className="mt-1 text-sm font-semibold text-slate-900">{contentCategory}</p></div>
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference type</p><p className="mt-1 text-sm font-semibold capitalize text-slate-900">{report.reference_type || 'Not specified'}</p></div>
              </section>
              {clusteredReports.map((claim) => {
                const { complainantText } = parseReportDetails(claim.details);
                return (
                  <article key={claim.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{claim.reporter?.full_name || 'Anonymous User'}</p><p className="text-xs capitalize text-slate-500">{claim.reporter?.role || 'User'}</p></div>
                      <time className="text-xs text-slate-500">{new Date(claim.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </div>
                    <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason for this filing</p><p className="mt-0.5 text-sm font-medium text-slate-800">{claim.reason || report.reason || 'Not specified'}</p></div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{complainantText}</p>
                  </article>
                );
              })}
            </>
          )}

          {activeDetailModal === 'parties' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Complainants</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{involvedReporters.length}</p><p className="text-xs text-slate-500">{clusteredReports.length} linked filing{clusteredReports.length === 1 ? '' : 's'}</p></div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Reported subject</p><p className="mt-1 text-base font-semibold text-slate-900">{report.reported?.full_name || 'Flagged User'}</p><p className="text-xs capitalize text-slate-600">{report.reported?.role || 'User'}</p></div>
              </div>
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h3 className="text-sm font-semibold text-slate-900">Filing parties</h3><p className="text-xs text-slate-500">Unique reporters linked to this case.</p></div><ModeratorIcon name="users" className="text-slate-400" /></div>
                <div className="divide-y divide-slate-100">
                  {involvedReporters.map((claim) => {
                    const key = claim.reporter_id || claim.reporter?.id || claim.id;
                    const name = claim.reporter?.full_name || 'Anonymous User';
                    return (
                      <div key={key} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600">{claim.reporter?.avatar_url ? <img src={claim.reporter.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center">{name.charAt(0).toUpperCase()}</span>}</div>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{name}</p><p className="text-xs capitalize text-slate-500">{claim.reporter?.role || 'User'}</p></div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{reporterReportCounts.get(key) || 1} {reporterReportCounts.get(key) === 1 ? 'filing' : 'filings'}</span>
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