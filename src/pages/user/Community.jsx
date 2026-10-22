// ─────────────────────────────────────────────────────────────────────
// COMMUNITY — "Messenger Clean" design language
// Matches Messages.jsx: Tailwind, emerald palette, same typography scale
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Flame, Heart,
  ImagePlus, Inbox, Flag, Lightbulb, MessageSquare, Plus, Search, Send,
  Pencil, Sparkles, Trash2, Users, X
} from 'lucide-react';
import supabase from '../../supabaseClient';
​
const MACRO_CATEGORIES = [
  'Tech, Coding & UI/UX', 'Creative, Arts & Media', 'Academics & Languages',
  'Business & Finance', 'Lifestyle, Health & Home', 'Hobbies & Practical Skills',
];
const buildCommunityActivityLink = (postId, commentId = null, activityId = null) => {
  const params = new URLSearchParams({ post: postId });
  if (commentId) params.set('comment', commentId);
  if (activityId) params.set('activity', activityId);
  return `/community?${params.toString()}#post-${postId}`;
};
​
const createCommunityActivityNotification = async ({ recipientId, actorId, type, content, linkUrl }) => {
  if (!recipientId || recipientId === actorId) return;
  const { error } = await supabase.from('notifications').insert({
    user_id: recipientId,
    type,
    content,
    link_url: linkUrl,
    is_read: false,
  });
  if (error) console.error('Could not create community notification:', error);
};
​
const POST_TYPES = [
  'General Q&A', 'Looking for a Mentor', 'Offering a Skill',
  'Project Showcase', 'Pricing Advice',
];
​
// ── Avatar ──────────────────────────────
const Avatar = ({ src, name, size = 'md', isMe = false }) => {
  const s = size === 'sm' ? 'w-8 h-8 text-sm'
          : size === 'lg' ? 'w-14 h-14 text-2xl'
          : 'w-10 h-10 text-base';
  return src ? (
    <div className={`${s} rounded-full overflow-hidden shrink-0 border ${isMe ? 'border-emerald-300' : 'border-gray-100'}`}>
      <img src={src} alt={name} className="w-full h-full object-cover" />
    </div>
  ) : (
    <div className={`${s} rounded-full flex items-center justify-center font-bold border shrink-0 bg-emerald-100 text-emerald-800 border-emerald-100`}>
      {name?.charAt(0) || '?'}
    </div>
  );
};
​
function PostImageCollage({ mediaUrls = [], onOpen, compact = false }) {
  if (!mediaUrls.length) return null;
​
  const total = mediaUrls.length;
  const visibleImages = mediaUrls.slice(0, 5);
  const count = visibleImages.length;
  const gridClass = [
    'grid-cols-1 aspect-[16/9]',
    'grid-cols-2 aspect-[16/9]',
    'grid-cols-2 grid-rows-2 aspect-[3/2]',
    'grid-cols-2 grid-rows-2 aspect-[4/3]',
    'grid-cols-[2fr_1fr_1fr] grid-rows-2 aspect-[16/9]',
  ][count - 1];
​
  return (
    <div className={`grid w-full min-w-0 gap-1 overflow-hidden bg-[#f0f2ee] ${compact ? 'max-h-[200px] sm:max-h-[240px]' : ''} ${gridClass}`}>
      {visibleImages.map((url, index) => {
        const isLargeTile = (count === 3 || count === 5) && index === 0;
        const hasOverflow = total > 5 && index === 4;
        return (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => onOpen(mediaUrls, index)}
            aria-label={hasOverflow ? `Open gallery, plus ${total - 5} more images` : `View image ${index + 1} of ${total}`}
            className={`group relative min-h-0 min-w-0 overflow-hidden bg-[#e9ece8] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
              isLargeTile ? 'row-span-2' : ''
            }`}
          >
            <img
              src={url}
              alt={`Post image ${index + 1} of ${total}`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
            />
            {hasOverflow && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-3xl font-bold text-white">
                +{total - 5}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
​
function ImageGalleryModal({ images = [], initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
​
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
​
  if (!images.length) return null;
​
  const showPrevious = () => setCurrentIndex(index => (index - 1 + images.length) % images.length);
  const showNext = () => setCurrentIndex(index => (index + 1) % images.length);
​
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Post image gallery"
      onClick={event => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-[700] flex flex-col bg-black/90 p-3 text-white sm:p-5"
    >
      <div className="flex shrink-0 items-center justify-between">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image gallery"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        ><X className="h-5 w-5" /></button>
      </div>
​
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-4">
        {images.length > 1 && (
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Previous image"
            className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-12 sm:w-12"
          ><ChevronLeft className="h-6 w-6" /></button>
        )}
        <img
          src={images[currentIndex]}
          alt={`Community image ${currentIndex + 1} of ${images.length}`}
          className="max-h-[calc(100vh-112px)] max-w-[calc(100vw-128px)] select-none object-contain"
          draggable="false"
        />
        {images.length > 1 && (
          <button
            type="button"
            onClick={showNext}
            aria-label="Next image"
            className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-12 sm:w-12"
          ><ChevronRight className="h-6 w-6" /></button>
        )}
      </div>
    </div>
  );
}
​
// ── Nested Comment Thread ─────────────────────────────────────────────
function CommentThread({
  comments, currentUserId, currentUserProfile,
  depth = 0, parentId = null, highlightCommentId = null,
  postId, onAddReply, onUpdateComment, onDeleteComment, onProfileClick
}) {
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [replyText,  setReplyText]  = useState('');
  const [collapsed,  setCollapsed]  = useState({});
  const [submitting, setSubmitting] = useState(false);
​
  const roots = comments.filter(c => (c.parent_comment_id ?? null) === parentId);
  if (!roots.length) return null;
​
  const submitReply = async (parentComment) => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    await onAddReply(postId, parentComment.id, replyText.trim());
    setReplyText(''); setReplyingTo(null); setSubmitting(false);
  };
​
  const saveCommentEdit = async (commentId) => {
    const content = editingCommentText.trim();
    if (!content || savingCommentEdit) return;
    setSavingCommentEdit(true);
    try {
      const saved = await onUpdateComment(commentId, content);
      if (saved) { setEditingCommentId(null); setEditingCommentText(''); }
    } finally {
      setSavingCommentEdit(false);
    }
  };
​
  return (
    <div className={depth > 0 ? 'ml-4 pl-3 border-l-2 border-gray-100' : ''}>
      {roots.map(c => {
        const isMe     = c.user_id === currentUserId;
        const children = comments.filter(ch => ch.parent_comment_id === c.id);
        return (
          <div id={`comment-${c.id}`} key={c.id} className={`mb-3 scroll-mt-24 rounded-xl transition ${highlightCommentId === c.id ? 'bg-amber-50 ring-2 ring-amber-300' : ''}`}>
            <div className="flex items-start gap-1.5 group/cmt">
              
              {/* Clickable Profile Picture */}
              <button 
                type="button" 
                onClick={() => onProfileClick && onProfileClick(c.user_id)} 
                className="shrink-0 mt-1 transition hover:opacity-80 cursor-pointer"
                aria-label="View user profile"
              >
                <Avatar
                  src={isMe ? currentUserProfile?.avatar_url : c.author?.avatar_url}
                  name={isMe ? currentUserProfile?.full_name : c.author?.full_name}
                  size="sm" isMe={isMe}
                />
              </button>
​
              <div className="flex flex-col items-start gap-1 max-w-[75%]">
                {/* Comment bubble or inline edit form */}
                {editingCommentId === c.id ? (
                  <div className="w-full min-w-[220px] rounded-2xl border border-emerald-200 bg-white p-2 shadow-sm">
                    <textarea
                      autoFocus
                      rows={3}
                      value={editingCommentText}
                      onChange={e => setEditingCommentText(e.target.value)}
                      aria-label="Edit your comment"
                      className="w-full resize-y rounded-xl bg-gray-50 p-2 text-[13px] leading-snug text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400/40"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }} className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
                      <button type="button" onClick={() => saveCommentEdit(c.id)} disabled={!editingCommentText.trim() || savingCommentEdit} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{savingCommentEdit ? 'Saving…' : 'Save'}</button>
                    </div>
                  </div>
                ) : (
                  <div className={`px-3.5 py-2 text-[13px] leading-snug rounded-2xl break-words ${
                    isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    {/* Clickable Commenter Name */}
                    {!isMe && (
                      <button 
                        type="button" 
                        onClick={() => onProfileClick && onProfileClick(c.user_id)} 
                        className="block text-[11px] font-bold text-emerald-700 mb-0.5 text-left hover:underline cursor-pointer"
                      >
                        {c.author?.full_name}
                      </button>
                    )}
                    {c.content}
                  </div>
                )}
                {/* Meta row */}
                <div className="flex items-center gap-2.5 px-1 text-[11px] text-gray-400">
                  <span className="opacity-100">
                    {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyText(''); }}
                    className="font-bold text-gray-600 hover:text-emerald-600 transition cursor-pointer">
                    Reply
                  </button>
                  {isMe && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.content ?? ''); }}
                        aria-label="Edit your comment"
                        title="Edit comment"
                        className="text-gray-400 hover:text-emerald-600 transition cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteComment(c.id)}
                        aria-label="Delete your comment"
                        title="Delete comment"
                        className="text-gray-400 hover:text-rose-600 transition cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {children.length > 0 && (
                    <button
                      onClick={() => setCollapsed(p => ({ ...p, [c.id]: !p[c.id] }))}
                      className="font-bold text-emerald-600 hover:text-emerald-800 transition cursor-pointer">
                      {collapsed[c.id]
                        ? <span className="inline-flex items-center gap-1"><ChevronRight className="w-3.5 h-3.5" /> {children.length} {children.length > 1 ? 'replies' : 'reply'}</span>
                        : <span className="inline-flex items-center gap-1"><ChevronDown className="w-3.5 h-3.5" /> hide</span>}
                    </button>
                  )}
                </div>
                {/* Inline reply input */}
                {replyingTo === c.id && (
                  <div className="flex items-center gap-2 mt-1 w-full">
                    <div className="flex-1 bg-gray-100 rounded-full flex items-center px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-400/30 transition">
                      <input
                        autoFocus type="text" value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitReply(c)}
                        placeholder={`Reply to ${c.author?.full_name?.split(' ')[0] || 'user'}…`}
                        className="w-full bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400"
                      />
                    </div>
                    <button onClick={() => submitReply(c)} disabled={!replyText.trim() || submitting}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition shrink-0 cursor-pointer disabled:opacity-40">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
            {/* Children */}
            {!collapsed[c.id] && children.length > 0 && (
              <CommentThread
                comments={comments} currentUserId={currentUserId} currentUserProfile={currentUserProfile}
                depth={depth + 1} parentId={c.id} highlightCommentId={highlightCommentId} postId={postId}
                onAddReply={onAddReply} onUpdateComment={onUpdateComment} onDeleteComment={onDeleteComment}
                onProfileClick={onProfileClick}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
​
// ── Comment Modal (mirrors Messages chat panel aesthetic) ─────────────
function CommentModal({
  post, onClose, currentUserId, currentUserProfile,
  onAddComment, onAddReply, onUpdateComment, onDeleteComment, onOpenImage, isImageGalleryOpen,
  newCommentValue, onCommentChange, focusCommentId = null, onProfileClick
}) {
  const commentsEndRef = useRef(null);
  const inputRef       = useRef(null);
  const previousCommentsRef = useRef({ postId: null, count: null });
​
  useEffect(() => {
    const count = post?.comments?.length ?? 0;
    const previous = previousCommentsRef.current;
    if (previous.postId === post?.id && previous.count !== null && count > previous.count) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    previousCommentsRef.current = { postId: post?.id, count };
  }, [post?.id, post?.comments?.length]);
  
  useEffect(() => {
    if (!focusCommentId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`comment-${focusCommentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [post?.id, focusCommentId]);
​
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !isImageGalleryOpen) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, isImageGalleryOpen]);
​
  if (!post) return null;
​
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-[560px] max-h-[90vh] flex flex-col shadow-2xl">
​
        {/* Header — mirrors Messages chat header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onProfileClick && onProfileClick(post.user_id)} className="shrink-0 transition hover:opacity-80">
              <Avatar src={post.author?.avatar_url} name={post.author?.full_name} size="md" />
            </button>
            <div>
              <button type="button" onClick={() => onProfileClick && onProfileClick(post.user_id)} className="block font-bold text-[15px] text-gray-900 leading-tight hover:underline text-left cursor-pointer">
                {post.author?.full_name}
              </button>
              <p className="text-[11px] text-gray-400 mt-0.5">
                <span className="text-emerald-600 font-medium">{post.post_type}</span>
                {' · '}{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
​
        {/* Post and comments share one scroll area; header and composer stay fixed */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-[14px] leading-relaxed text-gray-900 whitespace-pre-wrap">{post.content}</p>
            {post.media_urls?.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl">
                <PostImageCollage mediaUrls={post.media_urls} onOpen={onOpenImage} compact />
              </div>
            )}
          </div>
​
          <div className="flex flex-col px-5 py-4">
            {post.comments.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100"><MessageSquare className="h-7 w-7 text-gray-400" /></div>
                <p className="text-[15px] font-bold tracking-tight text-gray-900">No comments yet</p>
                <p className="mt-1 text-[13px] text-gray-400">Be the first to comment!</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-[12px] font-bold text-gray-400">
                  {post.comments.filter(c => !c.parent_comment_id).length} comment{post.comments.filter(c => !c.parent_comment_id).length !== 1 ? 's' : ''}
                </p>
                <CommentThread
                  comments={post.comments} currentUserId={currentUserId} currentUserProfile={currentUserProfile}
                  depth={0} parentId={null} postId={post.id} highlightCommentId={focusCommentId}
                  onAddReply={onAddReply} onUpdateComment={onUpdateComment} onDeleteComment={onDeleteComment}
                  onProfileClick={onProfileClick}
                />
              </>
            )}
            <div ref={commentsEndRef} />
          </div>
        </div>
​
        {/* Input bar — mirrors Messages input bar */}
        <form
          onSubmit={e => { e.preventDefault(); onAddComment(post.id); }}
          className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0"
        >
          <Avatar src={currentUserProfile?.avatar_url} name={currentUserProfile?.full_name} size="sm" isMe />
          <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2.5 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-400/30 transition">
            <input
              ref={inputRef}
              type="text" value={newCommentValue}
              onChange={e => onCommentChange(post.id, e.target.value)}
              placeholder={`Comment as ${currentUserProfile?.full_name?.split(' ')[0] || 'you'}…`}
              className="w-full bg-transparent outline-none text-[14px] text-gray-900 placeholder-gray-400"
            />
          </div>
          {newCommentValue?.trim() ? (
            <button type="submit"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition shrink-0 shadow-sm cursor-pointer">
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" className="w-9 h-9 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 transition shrink-0 cursor-pointer" title="Send Quick Like"
              onClick={() => onCommentChange(post.id, '💚')}>
              <Heart className="w-5 h-5 fill-emerald-500 text-emerald-600" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
​
// ── Create Post Modal ─────────────────────────────────────────────────
function CreatePostModal({
  isOpen, onClose, currentUserProfile,
  newPostContent, onContentChange, textareaRef,
  newPostType, setNewPostType, newPostCategory, setNewPostCategory,
  filePreviews, selectedFiles = [], onFileSelect, fileInputRef, onRemoveFile,
  tagSuggestions, showSuggestions, onTagSelect,
  isSubmitting, onSubmit,
}) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
​
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-6"
    >
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-post-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] animate-in zoom-in-95 duration-200"
      >
        {/* Header — matches the UserLayout support dialog */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <ImagePlus className="h-5 w-5" strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <h2 id="create-post-title" className="text-lg font-bold tracking-tight text-gray-900">Create a post</h2>
            <p className="text-xs text-gray-500">Share an idea, question, or photo with the community.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create post dialog"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
​
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {/* Author and post settings */}
            <div className="flex items-start gap-3">
              <Avatar src={currentUserProfile?.avatar_url} name={currentUserProfile?.full_name} size="md" isMe />
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-sm font-semibold text-gray-900">{currentUserProfile?.full_name}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="sr-only">Post type</span>
                    <select value={newPostType} onChange={e => setNewPostType(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                      {POST_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="sr-only">Post category</span>
                    <select value={newPostCategory} onChange={e => setNewPostCategory(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                      {MACRO_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            </div>
​
            {/* Post text */}
            <div className="relative">
              <label htmlFor="community-post-content" className="mb-2 block text-xs font-semibold text-gray-700">Your post</label>
              <textarea
                id="community-post-content"
                ref={textareaRef}
                autoFocus
                rows={4}
                value={newPostContent}
                onChange={onContentChange}
                placeholder="What's on your mind?"
                className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              {showSuggestions && (
                <div className="absolute left-0 top-full z-20 min-w-[160px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  {tagSuggestions.map((tag, i) => (
                    <div key={i}
                      onMouseDown={e => { e.preventDefault(); onTagSelect(tag); }}
                      className="cursor-pointer border-b border-gray-50 px-4 py-2.5 text-[13px] text-gray-800 last:border-0 hover:bg-gray-50">
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
​
            {/* Image attachments — show the entire image without cropping */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-gray-700">Photos <span className="font-normal text-gray-400">(optional)</span></p>
                {filePreviews.length > 0 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
                    <ImagePlus className="h-4 w-4" /> Add more
                  </button>
                )}
              </div>
              <input id="community-post-images" type="file" accept="image/*" multiple ref={fileInputRef} onChange={onFileSelect} className="sr-only" aria-label="Choose photos for your post" />
              {filePreviews.length > 0 ? (
                <div className={`grid gap-3 ${filePreviews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {filePreviews.map((src, i) => {
                    const file = selectedFiles[i];
                    return (
                      <div key={src} className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                        <div className={`relative flex items-center justify-center bg-gray-100 p-2 ${filePreviews.length === 1 ? 'h-52 sm:h-64' : 'aspect-[4/3]'}`}>
                          <img src={src} alt={file?.name ? `Preview of ${file.name}` : `Post image ${i + 1}`} className="max-h-full max-w-full rounded-lg object-contain" />
                          <button type="button" onClick={() => onRemoveFile(i)}
                            aria-label={`Remove ${file?.name || `photo ${i + 1}`}`}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl border border-white/70 bg-white/95 text-gray-500 shadow-sm transition hover:bg-rose-50 hover:text-rose-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {file && (
                          <div className="flex min-w-0 items-center gap-3 border-t border-gray-200 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-gray-800">{file.name}</p>
                              <p className="mt-0.5 text-[11px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <label htmlFor="community-post-images" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-4 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/50">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><ImagePlus className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">Add photos to your post</span>
                    <span className="mt-1 block text-xs text-gray-500">Choose one or more images to preview before sharing.</span>
                  </span>
                  <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">Browse photos</span>
                </label>
              )}
            </div>
          </div>
​
          {/* Footer — stays visible while the form scrolls */}
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
            <p className="hidden text-xs text-gray-500 sm:block">Your post will be shared with the community.</p>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={onClose}
                className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                disabled={isSubmitting || (!newPostContent.trim() && filePreviews.length === 0)}
                className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
                {isSubmitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
​
// ── Main Community ────────────────────────────────────────────────────
export default function Community() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const fileInputRef = useRef(null);
  const editPostFileInputRef = useRef(null);
  const textareaRef  = useRef(null);
​
  const [currentUserId,      setCurrentUserId]      = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [posts,              setPosts]              = useState([]);
  const [trendingTags,       setTrendingTags]       = useState([]);
  const [globalTags,         setGlobalTags]         = useState([]);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [selectedCategory,   setSelectedCategory]   = useState('All');
  const [selectedPostType,   setSelectedPostType]   = useState('All');
  const [highlightedPostId,  setHighlightedPostId]  = useState(null);
  const deepLinkHandledRef = useRef(null);
  const [isCreateModalOpen,  setIsCreateModalOpen]  = useState(false);
  const [newPostContent,     setNewPostContent]     = useState('');
  const [newPostCategory,    setNewPostCategory]    = useState(MACRO_CATEGORIES[0]);
  const [newPostType,        setNewPostType]        = useState(POST_TYPES[0]);
  const [newPostFiles,       setNewPostFiles]       = useState([]);
  const [filePreviews,       setFilePreviews]       = useState([]);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [tagSuggestions,     setTagSuggestions]     = useState([]);
  const [showSuggestions,    setShowSuggestions]    = useState(false);
  const [newComment,         setNewComment]         = useState({});
  const [reportModal,        setReportModal]        = useState({ isOpen: false, referenceId: null, referenceType: '', reportedUserId: null });
  const [reportReason,       setReportReason]       = useState('Inappropriate Content / Spam');
  const [reportDetails,      setReportDetails]      = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [submittedReports,   setSubmittedReports]   = useState([]);
  const [commentModal,       setCommentModal]       = useState(null);
  const [imageGallery,       setImageGallery]        = useState(null);
  const [editingPostId,      setEditingPostId]       = useState(null);
  const [editingPostContent, setEditingPostContent]  = useState('');
  const [editingPostMedia,   setEditingPostMedia]    = useState([]);
  const [editingPostFiles,   setEditingPostFiles]    = useState([]);
  const [editingPostPreviews,setEditingPostPreviews] = useState([]);
  const [savingPostEdit,     setSavingPostEdit]      = useState(false);
​
  const focusPostId = new URLSearchParams(location.search).get('post');
  const focusCommentId = new URLSearchParams(location.search).get('comment');
​
  useEffect(() => {
    if (!focusPostId) return;
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedPostType('All');
  }, [focusPostId]);
​
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);
      const { data: p } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      setCurrentUserProfile(p);
      await Promise.all([fetchPosts(), fetchUserReports(user.id)]);
      setLoading(false);
    };
    init();
  }, [navigate]);
​
  // ─── NEW RESTRICTION CHECKER HELPER ───
  const checkRestriction = () => {
    if (currentUserProfile?.community_restricted_until) {
      const restrictionEnd = new Date(currentUserProfile.community_restricted_until);
      if (restrictionEnd > new Date()) {
        const timeOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        alert(`Action blocked: Your account is temporarily restricted from posting or interacting until ${restrictionEnd.toLocaleString(undefined, timeOptions)} due to a Trust & Safety violation.`);
        return true;
      }
    }
    return false;
  };
​
  const fetchUserReports = async (uid) => {
    const { data } = await supabase.from('reports').select('reference_id').eq('reporter_id', uid);
    if (data) setSubmittedReports(data.map(r => r.reference_id));
  };
​
  const fetchPosts = async () => {
    const { data: postsData }    = await supabase.from('community_posts')
      .select('*, author:user_profiles!community_posts_user_id_fkey(full_name, avatar_url, role)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    const { data: commentsData } = await supabase.from('community_comments')
      .select('*, author:user_profiles!community_comments_user_id_fkey(full_name, avatar_url)')
      .order('created_at', { ascending: true });
    const { data: likesData } = await supabase.from('community_post_likes').select('*');
    if (postsData) {
      const enriched = postsData.map(p => ({
        ...p,
        comments: (commentsData || []).filter(c => c.post_id === p.id),
        likes:    (likesData    || []).filter(l => l.post_id === p.id),
      }));
      setPosts(enriched);
      setCommentModal(prev => prev ? (enriched.find(p => p.id === prev.id) ?? prev) : null);
      const tc = {};
      postsData.forEach(post => post.content.split(/\s+/).forEach(w => {
        if (w.match(/^#\w+$/)) {
          const k = w.toLowerCase();
          if (!tc[k]) tc[k] = { count: 0, original: w };
          tc[k].count++;
        }
      }));
      const sorted = Object.values(tc).sort((a, b) => b.count - a.count);
      setTrendingTags(sorted.slice(0, 8));
      setGlobalTags(sorted.map(t => t.original));
    }
  };
​
  const handleContentChange = (e) => {
    const text = e.target.value;
    setNewPostContent(text);
    const match = text.slice(0, e.target.selectionStart).match(/(#\w+)$/);
    if (match) {
      const filtered = globalTags.filter(t => t.toLowerCase().includes(match[1].toLowerCase()));
      setTagSuggestions(filtered.slice(0, 5)); setShowSuggestions(filtered.length > 0);
    } else setShowSuggestions(false);
  };
​
  const handleTagSelect = (tag) => {
    const c = textareaRef.current.selectionStart;
    setNewPostContent(newPostContent.slice(0, c).replace(/#\w+$/, `${tag} `) + newPostContent.slice(c));
    setShowSuggestions(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };
​
  const renderContentWithTags = (content) => {
    if (!content) return null;
    return content.split(/(#\w+)/g).map((part, i) =>
      part.match(/^#\w+/)
        ? <span key={i} onClick={() => setSearchQuery(part)} className="font-bold text-emerald-600 cursor-pointer hover:text-emerald-800">{part}</span>
        : <span key={i}>{part}</span>
    );
  };
​
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (checkRestriction()) return;
    if (!newPostContent.trim() && newPostFiles.length === 0) return;
    setIsSubmitting(true);
    try {
      let uploadedUrls = [];
      for (const file of newPostFiles) {
        const fp = `${currentUserProfile?.id}/${Date.now()}_${file.name}`;
        const { error: ue } = await supabase.storage.from('community_media').upload(fp, file);
        if (!ue) { const { data } = supabase.storage.from('community_media').getPublicUrl(fp); uploadedUrls.push(data.publicUrl); }
      }
      await supabase.from('community_posts').insert([{ user_id: currentUserProfile.id, content: newPostContent, category: newPostCategory, post_type: newPostType, media_urls: uploadedUrls, is_active: true }]);
      setNewPostContent(''); setNewPostType(POST_TYPES[0]); setNewPostCategory(MACRO_CATEGORIES[0]);
      setNewPostFiles([]); setFilePreviews([]); setShowSuggestions(false); setIsCreateModalOpen(false);
      fetchPosts();
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };
​
  const handleDeletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    await supabase.from('community_posts').update({ is_active: false }).eq('id', id);
    fetchPosts();
  };
​
  const startPostEdit = (post) => {
    editingPostPreviews.forEach(URL.revokeObjectURL);
    setEditingPostId(post.id);
    setEditingPostContent(post.content ?? '');
    setEditingPostMedia(Array.isArray(post.media_urls) ? post.media_urls : []);
    setEditingPostFiles([]);
    setEditingPostPreviews([]);
  };
​
  const cancelPostEdit = () => {
    editingPostPreviews.forEach(URL.revokeObjectURL);
    setEditingPostId(null);
    setEditingPostContent('');
    setEditingPostMedia([]);
    setEditingPostFiles([]);
    setEditingPostPreviews([]);
  };
​
  const handleEditPostFileSelect = (event) => {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'));
    setEditingPostFiles(current => [...current, ...files]);
    setEditingPostPreviews(current => [...current, ...files.map(file => URL.createObjectURL(file))]);
    event.target.value = '';
  };
​
  const removeEditPostImage = (index) => {
    setEditingPostMedia(current => current.filter((_, i) => i !== index));
  };
​
  const removeEditPostFile = (index) => {
    const preview = editingPostPreviews[index];
    if (preview) URL.revokeObjectURL(preview);
    setEditingPostFiles(current => current.filter((_, i) => i !== index));
    setEditingPostPreviews(current => current.filter((_, i) => i !== index));
  };
​
  const handleUpdatePost = async (postId) => {
    if (checkRestriction()) return;
    if (!currentUserId || savingPostEdit) return;
    setSavingPostEdit(true);
    try {
      const newImageUrls = [];
      for (const [index, file] of editingPostFiles.entries()) {
        const storagePath = `${currentUserId}/${Date.now()}_${index}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('community_media').upload(storagePath, file);
        if (uploadError) {
          console.error('Failed to upload post image:', uploadError);
          window.alert('Could not upload an image. Please try again.');
          return;
        }
        const { data: publicUrlData } = supabase.storage.from('community_media').getPublicUrl(storagePath);
        if (publicUrlData?.publicUrl) newImageUrls.push(publicUrlData.publicUrl);
      }
      const nextMediaUrls = [...editingPostMedia, ...newImageUrls];
      const { data, error } = await supabase.from('community_posts')
        .update({ content: editingPostContent.trim(), media_urls: nextMediaUrls })
        .eq('id', postId)
        .eq('user_id', currentUserId)
        .select('id')
        .maybeSingle();
      if (error || !data) {
        console.error('Failed to update post:', error);
        window.alert('Could not update your post. Please try again.');
        return;
      }
      editingPostPreviews.forEach(URL.revokeObjectURL);
      setEditingPostId(null);
      setEditingPostContent('');
      setEditingPostMedia([]);
      setEditingPostFiles([]);
      setEditingPostPreviews([]);
      await fetchPosts();
    } finally {
      setSavingPostEdit(false);
    }
  };
​
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewPostFiles(p => [...p, ...files]);
    setFilePreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };
  const removeFile = (i) => {
    setNewPostFiles(p => p.filter((_, j) => j !== i));
    setFilePreviews(p => p.filter((_, j) => j !== i));
  };
​
  const handleAddComment = async (postId) => {
    if (checkRestriction()) return;
    const text = newComment[postId]?.trim();
    if (!text || !currentUserProfile?.id) return;
    const post = posts.find(item => item.id === postId);
    const { data: insertedComment, error } = await supabase
      .from('community_comments')
      .insert([{ post_id: postId, user_id: currentUserProfile.id, content: text }])
      .select('id')
      .single();
    if (error) {
      console.error('Could not post community comment:', error);
      return;
    }
    if (post?.user_id && post.user_id !== currentUserProfile.id) {
      await createCommunityActivityNotification({
        recipientId: post.user_id,
        actorId: currentUserProfile.id,
        type: 'community_comment',
        content: `${currentUserProfile.full_name || 'Someone'} commented on your community post.`,
        linkUrl: buildCommunityActivityLink(postId, insertedComment.id),
      });
    }
    setNewComment(prev => ({ ...prev, [postId]: '' }));
    await fetchPosts();
  };
​
  const handleAddReply = async (postId, parentCommentId, text) => {
    if (checkRestriction()) return;
    if (!text?.trim() || !currentUserProfile?.id) return;
    const post = posts.find(item => item.id === postId);
    const parentComment = post?.comments?.find(comment => comment.id === parentCommentId);
    const { data: insertedComment, error } = await supabase
      .from('community_comments')
      .insert([{ post_id: postId, user_id: currentUserProfile.id, content: text.trim(), parent_comment_id: parentCommentId }])
      .select('id')
      .single();
    if (error) {
      console.error('Could not post community reply:', error);
      return;
    }
​
    const recipients = new Set([parentComment?.user_id, post?.user_id]
      .filter(id => id && id !== currentUserProfile.id));
    for (const recipientId of recipients) {
      const repliedToCurrentUser = parentComment?.user_id === recipientId;
      await createCommunityActivityNotification({
        recipientId,
        actorId: currentUserProfile.id,
        type: 'community_reply',
        content: repliedToCurrentUser
          ? `${currentUserProfile.full_name || 'Someone'} replied to your comment on a community post.`
          : `${currentUserProfile.full_name || 'Someone'} replied to a comment on your community post.`,
        linkUrl: buildCommunityActivityLink(postId, insertedComment.id),
      });
    }
    await fetchPosts();
  };
​
  const handleUpdateComment = async (commentId, content) => {
    if (checkRestriction()) return false;
    if (!currentUserId || !content?.trim()) return false;
    const { data, error } = await supabase.from('community_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('user_id', currentUserId)
      .select('id')
      .maybeSingle();
    if (error || !data) {
      console.error('Failed to update comment:', error);
      window.alert('Could not update your comment. Please try again.');
      return false;
    }
    await fetchPosts();
    return true;
  };
​
  const handleDeleteComment = async (commentId) => {
    if (!currentUserId || !window.confirm('Delete your comment?')) return;
    const { error } = await supabase.from('community_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUserId);
    if (error) {
      console.error('Failed to delete comment:', error);
      window.alert('Could not delete your comment. Please try again.');
      return;
    }
    await fetchPosts();
  };
​
  const toggleLike = async (postId) => {
    if (checkRestriction()) return;
    const post = posts.find(item => item.id === postId);
    const actorId = currentUserProfile?.id;
    if (!post || !actorId) return;
    const liked = post.likes.some(like => like.user_id === actorId);
    if (liked) {
      const { error } = await supabase.from('community_post_likes')
        .delete().eq('post_id', postId).eq('user_id', actorId);
      if (error) console.error('Could not unlike community post:', error);
    } else {
      const { data: insertedLike, error } = await supabase
        .from('community_post_likes')
        .insert([{ post_id: postId, user_id: actorId }])
        .select('id')
        .single();
      if (error) {
        console.error('Could not like community post:', error);
      } else if (post.user_id !== actorId) {
        await createCommunityActivityNotification({
          recipientId: post.user_id,
          actorId,
          type: 'community_like',
          content: `${currentUserProfile.full_name || 'Someone'} liked your community post.`,
          linkUrl: buildCommunityActivityLink(postId, null, insertedLike.id),
        });
      }
    }
    await fetchPosts();
  };
​
  const openReportModal = (id, type, reportedId) =>
    setReportModal({ isOpen: true, referenceId: id, referenceType: type, reportedUserId: reportedId });
​
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportDetails.trim()) return;
    setIsSubmittingReport(true);
    try {
      await supabase.from('reports').insert([{ reporter_id: currentUserId, reported_user_id: reportModal.reportedUserId, reason: reportReason, details: reportDetails, reference_type: reportModal.referenceType, reference_id: reportModal.referenceId }]);
      alert('Report submitted.');
      setSubmittedReports(p => [...p, reportModal.referenceId]);
      setReportModal({ isOpen: false, referenceId: null, referenceType: '', reportedUserId: null });
      setReportDetails(''); setReportReason('Inappropriate Content / Spam');
    } catch { alert('Failed to submit report.'); }
    finally { setIsSubmittingReport(false); }
  };
​
  const filteredPosts = useMemo(() => posts.filter(p => {
    const matchesSearch = p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPostType = selectedPostType === 'All'
      || (selectedPostType === 'My Post' ? p.user_id === currentUserId : p.post_type === selectedPostType);
    return matchesSearch && (selectedCategory === 'All' || p.category === selectedCategory) && matchesPostType;
  }), [posts, searchQuery, selectedCategory, selectedPostType, currentUserId]);
  const userPostCount = posts.filter(p => p.user_id === currentUserId).length;
​
  useEffect(() => {
    if (!focusPostId) {
      deepLinkHandledRef.current = null;
      setHighlightedPostId(null);
      return;
    }
    if (loading || !filteredPosts.some(post => post.id === focusPostId)) return;
​
    const key = `${focusPostId}:${focusCommentId || ''}`;
    if (deepLinkHandledRef.current === key) return;
    const targetPost = posts.find(post => post.id === focusPostId);
    if (!targetPost) return;
​
    deepLinkHandledRef.current = key;
    setHighlightedPostId(focusPostId);
    if (focusCommentId) setCommentModal(targetPost);
​
    const focusTimer = window.setTimeout(() => {
      const targetId = focusCommentId ? `comment-${focusCommentId}` : `post-${focusPostId}`;
      const target = document.getElementById(targetId) || document.getElementById(`post-${focusPostId}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
    const highlightTimer = window.setTimeout(() => setHighlightedPostId(null), 3500);
    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [focusPostId, focusCommentId, filteredPosts, loading, posts]);
  const openImageGallery = (images, index) => setImageGallery({ images, index });
​
  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading community" className="min-h-[calc(100vh-64px)] bg-[#f7f8f6] text-[#202522]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:h-[calc(100vh-64px)] lg:flex-row lg:overflow-hidden">
        <aside className="flex w-full flex-col gap-4 border-b border-[#e9e9e5] bg-white px-5 py-5 lg:h-full lg:w-[280px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="animate-pulse space-y-2"><div className="h-3 w-24 rounded bg-[#e9ece8]" /><div className="h-7 w-36 rounded bg-[#e9ece8]" /></div>
          <div className="h-11 w-full animate-pulse rounded-xl bg-[#eef0ec]" />
          <div className="animate-pulse space-y-2"><div className="h-3 w-16 rounded bg-[#e9ece8]" /><div className="h-11 w-full rounded-xl bg-[#eef0ec]" /></div>
          <div className="animate-pulse space-y-3 rounded-2xl border border-[#e9ece8] bg-[#fcfdfb] p-3">
            <div className="h-4 w-24 rounded bg-[#e9ece8]" /><div className="flex gap-2"><div className="h-8 w-20 rounded-full bg-[#e9ece8]" /><div className="h-8 w-16 rounded-full bg-[#e9ece8]" /><div className="h-8 w-24 rounded-full bg-[#e9ece8]" /></div>
          </div>
          <div className="mt-auto flex animate-pulse items-center gap-3 rounded-xl border border-[#e9ece8] p-3"><div className="h-10 w-10 rounded-full bg-[#e9ece8]" /><div className="flex-1 space-y-2"><div className="h-3 w-28 rounded bg-[#e9ece8]" /><div className="h-3 w-36 rounded bg-[#eef0ec]" /></div></div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:h-full lg:overflow-hidden lg:px-7 lg:py-6">
          <div className="mx-auto w-full max-w-[760px] animate-pulse">
            <div className="mb-4 flex min-h-[64px] items-center gap-3 rounded-2xl border border-[#e9ece8] bg-white p-3"><div className="h-10 w-10 rounded-full bg-[#e9ece8]" /><div className="h-10 flex-1 rounded-xl bg-[#f0f2ee]" /><div className="h-10 w-10 rounded-xl bg-emerald-700/20" /></div>
            <div className="mb-4 flex gap-2 overflow-hidden lg:justify-center"><div className="h-10 w-16 rounded-full bg-[#dfe4dd]" /><div className="h-10 w-24 rounded-full bg-[#e9ece8]" /><div className="h-10 w-20 rounded-full bg-[#e9ece8]" /><div className="h-10 w-24 rounded-full bg-[#e9ece8]" /></div>
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map(item => <article key={item} className="rounded-[20px] border border-[#e9ece8] bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3"><div className="h-11 w-11 rounded-full bg-[#e9ece8]" /><div className="flex-1 space-y-2"><div className="h-3.5 w-32 rounded bg-[#e9ece8]" /><div className="h-3 w-20 rounded bg-[#eef0ec]" /></div><div className="h-8 w-8 rounded-lg bg-[#eef0ec]" /></div>
                <div className="space-y-2.5"><div className="h-3.5 w-full rounded bg-[#e9ece8]" /><div className="h-3.5 w-5/6 rounded bg-[#e9ece8]" /><div className="h-3.5 w-2/3 rounded bg-[#eef0ec]" /></div>
                {item === 0 && <div className="mt-4 h-40 w-full rounded-xl bg-[#eef0ec] sm:h-52" />}
                <div className="mt-4 flex gap-5 border-t border-[#f0f1ee] pt-3"><div className="h-4 w-14 rounded bg-[#eef0ec]" /><div className="h-4 w-16 rounded bg-[#eef0ec]" /><div className="h-4 w-14 rounded bg-[#eef0ec]" /></div>
              </article>)}
            </div>
          </div>
        </main>
        <aside className="border-t border-[#e9e9e5] bg-white px-5 py-5 lg:h-full lg:w-[260px] lg:shrink-0 lg:border-l lg:border-t-0">
          <div className="mb-4 flex animate-pulse items-start gap-3"><div className="h-9 w-9 rounded-xl bg-amber-100" /><div className="flex-1 space-y-2"><div className="h-4 w-28 rounded bg-[#e9ece8]" /><div className="h-3 w-full rounded bg-[#eef0ec]" /></div></div>
          <div className="flex animate-pulse flex-col gap-2">{[0, 1, 2, 3].map(item => <div key={item} className="flex min-h-[72px] items-center gap-3 rounded-xl border border-[#e9ece8] p-3"><div className="h-9 w-9 rounded-lg bg-[#eef0ec]" /><div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-[#e9ece8]" /><div className="h-3 w-full rounded bg-[#eef0ec]" /></div></div>)}</div>
        </aside>
      </div>
    </div>
  );
​
  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f7f8f6] text-[#202522]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:h-[calc(100vh-64px)] lg:flex-row lg:overflow-hidden">
​
        {/* LEFT: compact, fixed navigation */}
        <aside
          aria-label="Community navigation"
          className="flex w-full flex-col gap-3 border-b border-[#e9e9e5] bg-white px-5 py-5 lg:h-full lg:w-[280px] lg:shrink-0 lg:overflow-hidden lg:border-b-0 lg:border-r"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">The Commons</p>
            <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#202522]">Community</h1>
          </div>
​
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#e7e9e5] bg-[#fafbf9] px-3.5 transition focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
            <Search className="h-4 w-4 shrink-0 text-[#858b86]" aria-hidden="true" />
            <input
              type="text"
              role="searchbox"
              inputMode="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search posts"
              aria-label="Search community posts"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#303833] outline-none placeholder:text-[#989e99]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#777d78] hover:bg-white hover:text-[#202522] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              ><X className="h-4 w-4" /></button>
            )}
          </label>
​
          <section aria-labelledby="community-topics-heading">
            <label id="community-topics-heading" htmlFor="community-topic-filter" className="mb-2 block px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#777d78]">Topics</label>
            <select
              id="community-topic-filter"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-[#e7eae5] bg-white px-3 text-[13px] font-medium text-[#465149] outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="All">All topics</option>
              {MACRO_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </section>
​
          <section aria-labelledby="trending-heading" className="rounded-2xl border border-[#e9ece8] bg-[#fcfdfb] p-3">
            <h2 id="trending-heading" className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#303833]">
              Trending <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
            </h2>
            {trendingTags.length === 0 ? (
              <p className="text-[12px] leading-5 text-[#858b86]">New hashtags will appear here.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {trendingTags.map((tag, index) => (
                  <button
                    key={`${tag.original}-${index}`}
                    type="button"
                    onClick={() => setSearchQuery(searchQuery === tag.original ? '' : tag.original)}
                    aria-pressed={searchQuery === tag.original}
                    className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      searchQuery === tag.original
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-[#e8ebe6] bg-white text-[#59625c] hover:border-emerald-200 hover:text-emerald-800'
                    }`}
                  >{tag.original}<span className="font-normal text-[#929993]">{tag.count}</span></button>
                ))}
              </div>
            )}
          </section>
​
          <button
            type="button"
            onClick={() => navigate(`/user/${currentUserId}`)}
            className="mt-auto flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#e9ece8] bg-white p-2.5 text-left transition hover:border-emerald-200 hover:bg-[#fbfdfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Avatar src={currentUserProfile?.avatar_url} name={currentUserProfile?.full_name} size="sm" isMe />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-[#303833]">{currentUserProfile?.full_name || 'Your profile'}</span>
              <span className="mt-0.5 block truncate text-[11px] text-[#858b86]">{currentUserProfile?.role || 'Community member'} · {userPostCount} posts</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-[#858b86]" aria-hidden="true" />
          </button>
        </aside>
​
        {/* CENTER: only desktop panel that scrolls */}
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:px-7 lg:py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto w-full max-w-[760px]">
            <button
              type="button"
              onClick={() => { if (!checkRestriction()) setIsCreateModalOpen(true); }}
              className="mb-4 flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-[#e9ece8] bg-white p-3 text-left shadow-[0_1px_2px_rgba(20,30,20,0.03)] transition hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Avatar src={currentUserProfile?.avatar_url} name={currentUserProfile?.full_name} size="md" isMe />
              <span className="flex min-h-10 flex-1 items-center rounded-xl bg-[#f5f7f4] px-4 text-[14px] text-[#7d857f]">What would you like to share?</span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white"><Plus className="h-4 w-4" /></span>
            </button>
​
            <div className="mb-4 flex flex-nowrap gap-2 overflow-x-auto pb-1 lg:justify-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter posts by type">
              {['All', 'My Post', ...POST_TYPES].map(type => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selectedPostType === type}
                  onClick={() => setSelectedPostType(type)}
                  className={`min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    selectedPostType === type
                      ? 'bg-[#25352d] text-white'
                      : 'border border-[#e7eae5] bg-white text-[#59625c] hover:border-[#cfd8d0] hover:bg-[#fbfcfa]'
                  }`}
                >{type}</button>
              ))}
            </div>
​
            <div className="flex flex-col gap-4">
              {filteredPosts.length === 0 ? (
                <section className="rounded-[20px] border border-dashed border-[#dfe4dd] bg-white px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f4ef] text-emerald-700"><Inbox className="h-6 w-6" /></div>
                  <h3 className="text-[16px] font-bold text-[#303833]">{posts.length ? 'No posts match those filters' : 'A good conversation starts here'}</h3>
                  <p className="mx-auto mt-2 max-w-sm text-[14px] leading-6 text-[#777d78]">{posts.length ? 'Try another topic or search, or clear your filters.' : 'Ask a question, share a project, or meet someone learning the same thing.'}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {posts.length > 0 && <button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedPostType('All'); }} className="min-h-11 rounded-xl border border-[#dfe4dd] px-4 text-[13px] font-semibold text-[#465149] hover:bg-[#f7f8f6]">Clear filters</button>}
                    <button type="button" onClick={() => { if (!checkRestriction()) setIsCreateModalOpen(true); }} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-[13px] font-semibold text-white hover:bg-emerald-800">Share what you know</button>
                  </div>
                </section>
              ) : filteredPosts.map(post => {
                const isLiked = post.likes.some(like => like.user_id === currentUserId);
                const isOwner = post.user_id === currentUserId;
                const hasReported = submittedReports.includes(post.id);
                return (
                  <article
                    id={`post-${post.id}`}
                    key={post.id}
                    className={`relative scroll-mt-6 overflow-hidden rounded-[20px] border bg-white shadow-[0_1px_2px_rgba(20,30,20,0.03)] transition ${highlightedPostId === post.id ? 'border-emerald-400 ring-2 ring-emerald-300 shadow-lg' : 'border-[#e9ece8]'}`}
                  >
                    {isOwner ? (
                      <div className="absolute right-3 top-3 z-10 flex gap-1">
                        <button type="button" onClick={() => startPostEdit(post)} aria-label="Edit post" title="Edit post" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#9aa19b] hover:bg-emerald-50 hover:text-emerald-700"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleDeletePost(post.id)} aria-label="Delete post" title="Delete post" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#9aa19b] hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => {
                          if (hasReported) {
                            alert("You have already reported this post. Our moderators are reviewing it.");
                            return;
                          }
                          openReportModal(post.id, 'post', post.user_id);
                        }} 
                        aria-label={hasReported ? 'Post already reported' : 'Report post'} 
                        title={hasReported ? 'You have already reported this post' : 'Report post'} 
                        className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl transition ${
                          hasReported 
                            ? 'bg-amber-50 text-amber-600 border border-amber-200 cursor-pointer' 
                            : 'text-[#9aa19b] hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <Flag className="h-4 w-4" />
                      </button>
                    )}
                    <div className="flex items-center gap-3 px-5 pb-3 pt-5 pr-24">
                      <button type="button" onClick={() => navigate(`/user/${post.user_id}`)} aria-label={`Open ${post.author?.full_name || 'author'}’s profile`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                        <Avatar src={post.author?.avatar_url} name={post.author?.full_name} size="md" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <button type="button" onClick={() => navigate(`/user/${post.user_id}`)} className="truncate text-[14px] font-bold text-[#303833] hover:text-emerald-800">{post.author?.full_name || 'Community member'}</button>
                          {post.author?.role && <span className="rounded-full bg-[#f2f4f1] px-2 py-0.5 text-[11px] font-medium text-[#68716a]">{post.author.role}</span>}
                          <span className="text-[12px] text-[#8b928c]">{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#788079]">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">{post.post_type}</span>
                          <span>{post.category}</span>
                        </div>
                      </div>
                    </div>
                    {editingPostId === post.id ? (
                      <div className="px-5 pb-5">
                        <textarea
                          autoFocus
                          rows={5}
                          value={editingPostContent}
                          onChange={e => setEditingPostContent(e.target.value)}
                          aria-label="Edit your post"
                          className="w-full resize-y rounded-xl border border-emerald-200 bg-[#fbfdfb] p-3 text-[15px] leading-7 text-[#37413a] outline-none focus:ring-2 focus:ring-emerald-400/40"
                        />
                        <div className="mt-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-[12px] font-semibold text-gray-600">Post images</span>
                            <button type="button" onClick={() => editPostFileInputRef.current?.click()} disabled={savingPostEdit} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                              <ImagePlus className="h-4 w-4" /> Add images
                            </button>
                            <input ref={editPostFileInputRef} type="file" accept="image/*" multiple onChange={handleEditPostFileSelect} className="sr-only" aria-label="Choose images for your post" />
                          </div>
                          {(editingPostMedia.length > 0 || editingPostPreviews.length > 0) && (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {editingPostMedia.map((src, index) => (
                                <div key={`saved-${src}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                                  <img src={src} alt={`Attached image ${index + 1}`} className="h-full w-full object-cover" />
                                  <button type="button" onClick={() => removeEditPostImage(index)} disabled={savingPostEdit} aria-label={`Remove attached image ${index + 1}`} title="Remove image" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><X className="h-4 w-4" /></button>
                                </div>
                              ))}
                              {editingPostPreviews.map((src, index) => (
                                <div key={`new-${src}`} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                                  <img src={src} alt={`New image ${index + 1}`} className="h-full w-full object-cover" />
                                  <button type="button" onClick={() => removeEditPostFile(index)} disabled={savingPostEdit} aria-label={`Remove new image ${index + 1}`} title="Remove image" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><X className="h-4 w-4" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" onClick={cancelPostEdit} disabled={savingPostEdit} className="min-h-9 rounded-lg px-3 text-[13px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
                          <button type="button" onClick={() => handleUpdatePost(post.id)} disabled={savingPostEdit} className="min-h-9 rounded-lg bg-emerald-700 px-3 text-[13px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{savingPostEdit ? 'Saving…' : 'Save changes'}</button>
                        </div>
                      </div>
                    ) : (
                      post.content && <div className="whitespace-pre-wrap break-words px-5 pb-5 text-[15px] leading-7 text-[#37413a]">{renderContentWithTags(post.content)}</div>
                    )}
                    {editingPostId !== post.id && post.media_urls?.length > 0 && (
                      <PostImageCollage mediaUrls={post.media_urls} onOpen={openImageGallery} />
                    )}
                    <div className="flex items-center gap-2 border-t border-[#f0f1ee] px-4 py-2.5">
                      <button type="button" onClick={() => toggleLike(post.id)} aria-pressed={isLiked} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition ${isLiked ? 'bg-rose-50 text-rose-600' : 'text-[#69716b] hover:bg-[#f5f7f4]'}`}><Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />{post.likes.length > 0 ? post.likes.length : 'Like'}</button>
                      <button type="button" onClick={() => setCommentModal(post)} className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold text-[#69716b] transition hover:bg-[#f5f7f4]"><MessageSquare className="h-4 w-4" />{post.comments.length > 0 ? `${post.comments.length} comment${post.comments.length === 1 ? '' : 's'}` : 'Comment'}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </main>
​
        {/* RIGHT: community posting guide */}
        <aside
          aria-label="Community posting guide"
          className="border-t border-[#e9e9e5] bg-white px-5 py-5 lg:h-full lg:w-[260px] lg:shrink-0 lg:overflow-hidden lg:border-l lg:border-t-0"
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Sparkles className="h-4 w-4" /></span>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-[#303833]">A good space for everyone</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#777d78]">Four simple reminders for better conversations.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex min-h-[72px] items-center gap-3 rounded-xl border border-[#e9ece8] bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><CircleHelp className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-bold leading-4 text-[#303833]">Add context</span><span className="mt-1 block text-[11px] leading-4 text-[#777d78]">Share what you tried and where you got stuck.</span></span>
            </div>
            <div className="flex min-h-[72px] items-center gap-3 rounded-xl border border-[#e9ece8] bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Lightbulb className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-bold leading-4 text-[#303833]">Be constructive</span><span className="mt-1 block text-[11px] leading-4 text-[#777d78]">Keep feedback kind, specific, and useful.</span></span>
            </div>
            <div className="flex min-h-[72px] items-center gap-3 rounded-xl border border-[#e9ece8] bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Users className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-bold leading-4 text-[#303833]">Choose a topic</span><span className="mt-1 block text-[11px] leading-4 text-[#777d78]">Pick the category that best fits your post.</span></span>
            </div>
            <div className="flex min-h-[72px] items-center gap-3 rounded-xl border border-[#e9ece8] bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Sparkles className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-bold leading-4 text-[#303833]">Protect your privacy</span><span className="mt-1 block text-[11px] leading-4 text-[#777d78]">Never share passwords or private details.</span></span>
            </div>
          </div>
        </aside>
      </div>
​
      {/* ══ CREATE POST MODAL ══ */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setNewPostContent(''); setFilePreviews([]); setNewPostFiles([]); setShowSuggestions(false); }}
        currentUserProfile={currentUserProfile}
        newPostContent={newPostContent} onContentChange={handleContentChange} textareaRef={textareaRef}
        newPostType={newPostType} setNewPostType={setNewPostType}
        newPostCategory={newPostCategory} setNewPostCategory={setNewPostCategory}
        filePreviews={filePreviews} selectedFiles={newPostFiles} onFileSelect={handleFileSelect}
        fileInputRef={fileInputRef} onRemoveFile={removeFile}
        tagSuggestions={tagSuggestions} showSuggestions={showSuggestions} onTagSelect={handleTagSelect}
        isSubmitting={isSubmitting} onSubmit={handleCreatePost}
      />
​
      {/* ══ COMMENT MODAL ══ */}
      {commentModal && (
        <CommentModal
          post={commentModal} onClose={() => setCommentModal(null)}
          currentUserId={currentUserId} currentUserProfile={currentUserProfile}
          onAddComment={handleAddComment} onAddReply={handleAddReply}
          onUpdateComment={handleUpdateComment} onDeleteComment={handleDeleteComment}
          onOpenImage={openImageGallery}
          isImageGalleryOpen={Boolean(imageGallery)}
          newCommentValue={newComment[commentModal?.id] || ''}
          focusCommentId={focusCommentId}
          onCommentChange={(postId, val) => setNewComment(prev => ({ ...prev, [postId]: val }))}
          onProfileClick={(userId) => {
            setCommentModal(null);
            navigate(`/user/${userId}`);
          }}
        />
      )}
​
      {imageGallery && (
        <ImageGalleryModal
          images={imageGallery.images}
          initialIndex={imageGallery.index}
          onClose={() => setImageGallery(null)}
        />
      )}
​
      {/* ══ REPORT MODAL ══ */}
      {reportModal.isOpen && (
        <div className="fixed inset-0 z-[600] bg-black/50 flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-2xl">
            <h2 className="font-bold text-[18px] tracking-tight text-gray-900 mb-1">Report an Issue</h2>
            <p className="text-[12px] text-gray-400 mb-5">Reporting a {reportModal.referenceType}.</p>
            <form onSubmit={handleSubmitReport} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Reason</label>
                <select value={reportReason} onChange={e => setReportReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-800 outline-none cursor-pointer">
                  <option>Inappropriate Content / Spam</option>
                  <option>Harassment / Abuse</option>
                  <option>Misinformation</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Details</label>
                <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)}
                  placeholder="Describe what happened…" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-800 outline-none resize-none h-20" />
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button"
                  onClick={() => setReportModal({ isOpen: false, referenceId: null, referenceType: '', reportedUserId: null })}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingReport || !reportDetails.trim()}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl text-[13px] font-bold transition cursor-pointer">
                  {isSubmittingReport ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}