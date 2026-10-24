import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import supabase from '../supabaseClient';
import {
  Bell, ChevronDown, Menu, X, Shield,
  AlertTriangle, ShieldAlert, Scale, ShieldCheck, MessageSquare,
  BellRing, Coins, LayoutList, CreditCard,
  Settings, LogOut, MessageCircle, Paperclip, CheckCheck,
  ArrowRight, LifeBuoy, User, ChevronRight, ImagePlus, GripVertical, Globe, Star, PlayCircle, CalendarDays
} from 'lucide-react';
​
// ────────────────────────────────────────────────────────────────
// USER LAYOUT V1 — "Corporate Clean" + Expanded Notification Routing
// ────────────────────────────────────────────────────────────────
​
const getNotificationMeta = (type) => {
  switch (type) {
    case 'account_warning':
      return {
        Icon: AlertTriangle,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-50 border-amber-200',
        badge: 'Warning',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        bgBox: 'bg-amber-50/50 hover:bg-amber-50',
      };
    case 'account_penalized':
      return {
        Icon: ShieldAlert,
        iconColor: 'text-rose-500',
        iconBg: 'bg-rose-50 border-rose-200',
        badge: 'Account Notice',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        bgBox: 'bg-rose-50/40 hover:bg-rose-50',
      };
    case 'admin_role_notice':
      return {
        Icon: Shield,
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-50 border-indigo-200',
        badge: 'Role Update',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        bgBox: 'bg-indigo-50/40 hover:bg-indigo-50',
      };
    case 'admin_credit_notice':
      return {
        Icon: Coins,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-50 border-amber-200',
        badge: 'Credit Update',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        bgBox: 'bg-amber-50/40 hover:bg-amber-50',
      };
    case 'dispute_resolved':
      return {
        Icon: Scale,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50 border-emerald-200',
        badge: 'Dispute Settled',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        bgBox: 'bg-emerald-50/40 hover:bg-emerald-50',
      };
    case 'session_disputed':
    case 'dispute':
    case 'session_expired':
      return {
        Icon: AlertTriangle,
        iconColor: 'text-rose-600',
        iconBg: 'bg-rose-50 border-rose-200',
        badge: 'Session Notice',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        bgBox: 'bg-rose-50/40 hover:bg-rose-50',
      };
    case 'message':
      return {
        Icon: MessageCircle,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50 border-emerald-200',
        badge: 'Message',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        bgBox: 'bg-emerald-50/40 hover:bg-emerald-50',
      };
    case 'community':
    case 'community_like':
    case 'community_comment':
    case 'community_reply':
      return {
        Icon: Globe,
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-50 border-indigo-200',
        badge: 'Community',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        bgBox: 'bg-indigo-50/40 hover:bg-indigo-50',
      };
    case 'report_updated':
      return {
        Icon: ShieldCheck,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-50 border-blue-200',
        badge: 'Report Update',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        bgBox: 'bg-blue-50/40 hover:bg-blue-50',
      };
    case 'support_reply':
    case 'ticket_updated':
      return {
        Icon: MessageSquare,
        iconColor: 'text-teal-600',
        iconBg: 'bg-teal-50 border-teal-200',
        badge: 'Support Desk',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
        bgBox: 'bg-teal-50/40 hover:bg-teal-50',
      };
    
    // ── BAGONG SESSION UPDATES ──
    case 'booking_accepted':
      return {
        Icon: CalendarDays, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50 border-indigo-200',
        badge: 'Schedule Confirmed', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', bgBox: 'bg-indigo-50/40 hover:bg-indigo-50',
      };
    case 'session_started':
      return {
        Icon: PlayCircle, iconColor: 'text-sky-600', iconBg: 'bg-sky-50 border-sky-200',
        badge: 'Session Started', badgeClass: 'bg-sky-100 text-sky-800 border-sky-200', bgBox: 'bg-sky-50/40 hover:bg-sky-50',
      };
    case 'session_update':
    case 'session_completed':
      return {
        Icon: CheckCheck, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50 border-emerald-200',
        badge: type === 'session_completed' ? 'Completed' : 'Session Update', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', bgBox: 'bg-emerald-50/40 hover:bg-emerald-50',
      };
    case 'session_cancelled':
      return {
        Icon: AlertTriangle, iconColor: 'text-gray-500', iconBg: 'bg-gray-50 border-gray-200',
        badge: 'Cancelled', badgeClass: 'bg-gray-100 text-gray-800 border-gray-200', bgBox: 'bg-gray-50/40 hover:bg-gray-50',
      };
    case 'new_rating':
      return {
        Icon: Star, iconColor: 'text-amber-500', iconBg: 'bg-amber-50 border-amber-200',
        badge: 'New Rating', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', bgBox: 'bg-amber-50/40 hover:bg-amber-50',
      };
​
    default:
      return {
        Icon: BellRing,
        iconColor: 'text-gray-400',
        iconBg: 'bg-gray-50 border-gray-200',
        badge: 'Notice',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
        bgBox: 'hover:bg-gray-50',
      };
  }
};
​
const NAV_LINKS = [
  { to: '/dashboard',   label: 'Browse'      },
  { to: '/community',   label: 'Community'   },
  { to: '/sessions',    label: 'Sessions'    },
  { to: '/messages',    label: 'Messages'    },
  { to: '/leaderboard', label: 'Leaderboard' },
];
​
const PROFILE_LINKS = [
  { to: '/profile',     label: 'View Profile', Icon: User,        iconColor: 'text-gray-500'    },
  { to: '/my-listings', label: 'My Listings',  Icon: LayoutList,  iconColor: 'text-indigo-500'  },
  { to: '/payments',    label: 'Wallet',     Icon: CreditCard,  iconColor: 'text-emerald-600' },
  { to: '/settings',    label: 'Settings',     Icon: Settings,    iconColor: 'text-gray-400'    },
];
​
const buildMessageLink = (message) => {
  const params = new URLSearchParams();
  if (message?.ticket_id) params.set('ticket', message.ticket_id);
  else if (message?.session_id) params.set('session', message.session_id);
  else if (message?.sender_id) params.set('user', message.sender_id);
  if (message?.id) params.set('message', message.id);
  return params.size ? `/messages?${params.toString()}` : '/messages';
};
​
const findLatestIncomingMessage = async (userId) => {
  if (!userId) return null;
  const columns = 'id, sender_id, receiver_id, session_id, ticket_id, created_at';
  const candidates = [];
​
  const { data: directMessage } = await supabase
    .from('messages')
    .select(columns)
    .eq('receiver_id', userId)
    .neq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (directMessage) candidates.push(directMessage);
​
  const { data: participantSessions } = await supabase
    .from('sessions')
    .select('id')
    .or(`student_id.eq.${userId},instructor_id.eq.${userId}`);
  const sessionIds = (participantSessions || []).map(session => session.id).filter(Boolean);
  if (sessionIds.length) {
    const { data: sessionMessage } = await supabase
      .from('messages')
      .select(columns)
      .in('session_id', sessionIds)
      .neq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sessionMessage) candidates.push(sessionMessage);
  }
​
  const { data: userTickets } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('user_id', userId);
  const ticketIds = (userTickets || []).map(ticket => ticket.id).filter(Boolean);
  if (ticketIds.length) {
    const { data: ticketMessage } = await supabase
      .from('messages')
      .select(columns)
      .in('ticket_id', ticketIds)
      .neq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ticketMessage) candidates.push(ticketMessage);
  }
​
  return candidates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
};
​
const isInternalLink = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
​
// ────────────────────── FLOATING HELP BUTTON
const FloatingHelpButton = () => {
  const [isOpen,        setIsOpen]        = useState(false);
  const [subject,       setSubject]       = useState('General Inquiry');
  const [message,       setMessage]       = useState('');
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [previewUrl,    setPreviewUrl]    = useState(null);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [buttonPosition, setButtonPosition] = useState(null);
  const buttonDragRef = useRef(null);
  const wasDraggedRef = useRef(false);
​
  const handleButtonPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    buttonDragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    setButtonPosition({ x: rect.left, y: rect.top });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
​
  const handleButtonPointerMove = (e) => {
    const drag = buttonDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) drag.moved = true;
    if (!drag.moved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonPosition({
      x: Math.max(8, Math.min(window.innerWidth - rect.width - 8, e.clientX - drag.offsetX)),
      y: Math.max(8, Math.min(window.innerHeight - rect.height - 8, e.clientY - drag.offsetY)),
    });
  };
​
  const handleButtonPointerUp = (e) => {
    const drag = buttonDragRef.current;
    if (drag?.pointerId !== e.pointerId) return;
    wasDraggedRef.current = drag.moved;
    buttonDragRef.current = null;
  };
​
  const handleButtonClick = () => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    setIsOpen(true);
  };
​
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    e.target.value = '';
  };
​
  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  };
​
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');
​
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert([{ user_id: user.id, subject, message }])
        .select()
        .single();
      if (ticketError) throw ticketError;
​
      let uploadedFileUrl = null;
      let fileType = null;
​
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
        uploadedFileUrl = publicUrl;
        fileType = selectedFile.type;
      }
​
      const { error: msgError } = await supabase.from('messages').insert([{
        ticket_id: ticket.id,
        sender_id: user.id,
        content: message,
        file_url: uploadedFileUrl,
        file_type: fileType,
        is_deleted: false,
      }]);
      if (msgError) throw msgError;
​
      alert('Ticket submitted successfully! Support will respond shortly.');
      setIsOpen(false);
      setMessage('');
      setSubject('General Inquiry');
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error(error);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
​
  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        onPointerDown={handleButtonPointerDown}
        onPointerMove={handleButtonPointerMove}
        onPointerUp={handleButtonPointerUp}
        onPointerCancel={handleButtonPointerUp}
        style={{
          ...(buttonPosition
            ? { left: `${buttonPosition.x}px`, top: `${buttonPosition.y}px`, right: 'auto', bottom: 'auto' }
            : {}),
          touchAction: 'none',
        }}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/95 py-2 pl-2 pr-3 text-emerald-900 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-150 hover:border-emerald-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.16)] active:scale-[0.98] cursor-grab active:cursor-grabbing"
        title="Drag to move · Click to get help"
        aria-label="Drag support button to move, or click to contact support"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <MessageCircle className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <span className="text-sm font-semibold tracking-tight">Support</span>
        <GripVertical className="h-4 w-4 text-gray-300" strokeWidth={1.5} />
      </button>
​
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={handleClose} />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-dialog-title"
            className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                <LifeBuoy className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <h2 id="support-dialog-title" className="text-lg font-bold tracking-tight text-gray-900">Contact Support</h2>
                <p className="text-xs text-gray-500">Tell us what happened and we’ll get back to you.</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close support form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
​
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                <div>
                  <label htmlFor="ticket-subject" className="mb-2 block text-xs font-semibold text-gray-700">What do you need help with?</label>
                  <select
                    id="ticket-subject"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option>General Inquiry</option>
                    <option>Billing / Credits Issue</option>
                    <option>Report a Bug</option>
                    <option>Account Recovery</option>
                    <option>Other</option>
                  </select>
                </div>
​
                <div>
                  <label htmlFor="ticket-message" className="mb-2 block text-xs font-semibold text-gray-700">Message <span className="font-normal text-gray-400">(optional if attaching a file)</span></label>
                  <textarea
                    id="ticket-message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe the issue and any steps that led to it…"
                    className="h-32 w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
​
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">Screenshot or file <span className="font-normal text-gray-400">(optional)</span></p>
                    <span className="text-[11px] text-gray-400">Up to 5 MB</span>
                  </div>
                  <input type="file" id="ticket-file" className="sr-only" accept="image/*,.pdf" onChange={handleFileSelect} />
                  {selectedFile ? (
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                      {previewUrl ? (
                        <div className="flex max-h-56 items-center justify-center bg-gray-100 p-2">
                          <img src={previewUrl} alt="Selected screenshot preview" className="max-h-52 max-w-full rounded-lg object-contain" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 border-b border-gray-100 bg-emerald-50/70 px-4 py-5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                            <Paperclip className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-semibold text-gray-800">Document attached</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800">{selectedFile.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <label htmlFor="ticket-file" className="shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">Replace</label>
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove attachment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="ticket-file" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-4 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/50">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><ImagePlus className="h-5 w-5" /></span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-800">Add a screenshot or PDF</span>
                        <span className="mt-1 block text-xs text-gray-500">PNG, JPG, WEBP, or PDF</span>
                      </span>
                      <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">Browse files</span>
                    </label>
                  )}
                </div>
              </div>
​
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (!message.trim() && !selectedFile)}
                  className="flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending…' : <>Submit Ticket <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
​
// ────────────────────── MAIN LAYOUT
export default function UserLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const notifRef    = useRef(null);
  const profileRef  = useRef(null);
​
  const [profile,       setProfile]       = useState({ id: '', full_name: '', credits_balance: 0, avatar_url: '', is_banned: false });
  const [notifications, setNotifications] = useState([]);
  const [toastNotification, setToastNotification] = useState(null);
  const [isNotifOpen,   setIsNotifOpen]   = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileOpen,  setIsMobileOpen]  = useState(false);
  const toastTimerRef = useRef(null);
  const notificationIdsRef = useRef(new Set());
  const unreadCount = notifications.filter(item => !item.is_read).length;
​
  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);
​
  useEffect(() => {
    const handler = e => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setIsNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
​
  useEffect(() => {
    let disposed = false;
    let profileChannel = null;
    let notifsChannel  = null;
    let currentUserId  = null;
    const channelSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
​
    const publishNotification = (notification, showToast = true) => {
      if (!notification?.id) return;
      const isNewToThisLayout = !notificationIdsRef.current.has(notification.id);
      notificationIdsRef.current.add(notification.id);
      setNotifications(prev => [notification, ...prev.filter(item => item.id !== notification.id)].slice(0, 8));
​
      if (showToast && isNewToThisLayout) {
        setToastNotification(notification);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToastNotification(null), 7000);
      }
    };
​
    const fetchProfile = async (uid) => {
      const { data: p } = await supabase
        .from('user_profiles')
        .select('id, full_name, credits_balance, avatar_url, is_banned')
        .eq('id', uid)
        .single();
        
      if (p && !disposed) {
        if (p.is_banned) {
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
          return;
        }
        setProfile(p);
      }
    };
​
    const fetchNotifications = async (uid) => {
      const { data: n, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) {
        console.error('Could not load notifications:', error);
        return;
      }
      if (n && !disposed) {
        notificationIdsRef.current = new Set(n.map(item => item.id));
        setNotifications(n);
      }
    };
​
    const handleLocalUpdate = () => { if (currentUserId) fetchProfile(currentUserId); };
​
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (disposed) return;
      if (!user) { navigate('/login', { replace: true }); return; }
      currentUserId = user.id;
​
      await fetchProfile(user.id);
      await fetchNotifications(user.id);
      if (disposed) return;
​
      window.addEventListener('credit_updated', handleLocalUpdate);
​
      profileChannel = supabase.channel(`profile_rt_${user.id}_${channelSuffix}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            if (payload.new?.is_banned === true) {
              supabase.auth.signOut().then(() => {
                navigate('/login', { replace: true });
              });
              return;
            }
            if (payload.new?.credits_balance !== undefined) {
              setProfile(prev => ({ ...prev, credits_balance: payload.new.credits_balance }));
            }
          })
        .subscribe();
​
      notifsChannel = supabase.channel(`notifs_rt_${user.id}_${channelSuffix}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new) publishNotification(payload.new, true);
          })
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new) {
              setNotifications(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
            }
          })
        .subscribe((status, error) => {
          if (status !== 'SUBSCRIBED') console.warn('Notifications Realtime status:', status, error || '');
        });
​
    };
​
    init().catch(error => console.error('UserLayout initialization failed:', error));
    return () => {
      disposed = true;
      window.removeEventListener('credit_updated', handleLocalUpdate);
      if (profileChannel) supabase.removeChannel(profileChannel);
      if (notifsChannel)  supabase.removeChannel(notifsChannel);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [navigate]);
​
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };
​
  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (unreadIds.length > 0)
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  };
​
  const handleNotificationClick = async (notif) => {
    setIsNotifOpen(false);
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
        if (error) console.error('Could not mark notification read:', error);
      } catch (error) {
        console.error('Could not mark notification read:', error);
      }
    }
    const type = notif.type?.toLowerCase();
​
    // ── EKSKTONG NAGAGAMIT YUNG LINK NA MAY ?session=123 DAHIL SA CONDITION NA ITO ──
    if (isInternalLink(notif.link_url)) {
      navigate(notif.link_url);
      return;
    }
​
    const systemTypes = ['account_warning', 'account_penalized', 'report_updated', 'admin_role_notice', 'admin_credit_notice'];
    if (systemTypes.includes(type)) {
      navigate('/notifications', { state: { tab: type.startsWith('admin') ? 'System' : 'Moderation' } }); 
      return;
    }
​
    if (type === 'session_disputed' || type === 'dispute') {
      navigate('/sessions', { state: { tab: 'Disputed' } });
      return;
    }
​
    if (type === 'session_expired') {
      navigate('/sessions', { state: { tab: 'Pending' } });
      return;
    }
​
    if (type === 'dispute_resolved') {
      navigate('/sessions'); 
      return;
    }
​
    if (type === 'message') {
      const latestMsg = await findLatestIncomingMessage(profile.id || notif.user_id);
      navigate(latestMsg ? buildMessageLink(latestMsg) : '/messages');
      return;
    }
​
    if (type === 'community' || type === 'community_like' || type === 'community_comment' || type === 'community_reply') {
      navigate(isInternalLink(notif.link_url) ? notif.link_url : '/community');
      return;
    }
​
    if (type === 'support_reply' || type === 'ticket_updated') {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', profile.id || notif.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
​
      if (ticket) {
        navigate(`/messages?ticket=${ticket.id}`);
      } else {
        navigate('/messages');
      }
      return;
    }
​
    navigate(notif.link_url || '/notifications');
  };
​
  const isActive  = path => location.pathname === path;
  const firstName = profile.full_name?.split(' ')[0] || 'You';
  const initial   = profile.full_name?.charAt(0)?.toUpperCase() || '?';
  const toastMeta = toastNotification ? getNotificationMeta(toastNotification.type) : null;
  const ToastIcon = toastMeta?.Icon;
​
  return (
    <div className="min-h-screen bg-[#faf9f6] font-sans text-gray-900 relative">
​
      {/* ══ NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
​
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="SkillCredit" className="w-8 h-8 object-contain" />
            <span className="font-bold text-xl text-emerald-900 tracking-tight hidden sm:block">SkillCredit</span>
          </Link>
​
          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center justify-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`relative px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                  isActive(to)
                    ? 'text-emerald-800 bg-emerald-50/80'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'
                }`}
              >
                {label}
                {isActive(to) && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </Link>
            ))}
          </div>
​
          {/* Right controls */}
          <div className="flex items-center justify-end gap-2 shrink-0">
​
            {/* ── NOTIFICATIONS BELL */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setIsNotifOpen(v => !v); setIsProfileOpen(false); }}
                className={`relative p-2.5 rounded-full transition cursor-pointer ${
                  isNotifOpen ? 'bg-emerald-50 text-emerald-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white" />
                  </span>
                )}
              </button>
​
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-[360px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden z-50">
​
                  {/* Notif header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 tracking-tight">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer">
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
​
                  {/* Notif list */}
                  <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="py-12 flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                          <BellRing className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 font-semibold">You&rsquo;re all caught up!</p>
                      </div>
                    ) : (
                      notifications.map(n => {
                        const meta = getNotificationMeta(n.type);
                        const { Icon } = meta;
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition ${
                              !n.is_read ? meta.bgBox : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${meta.iconBg}`}>
                              <Icon className={`w-4 h-4 ${meta.iconColor}`} />
                            </div>
​
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${meta.badgeClass}`}>
                                  {meta.badge}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-relaxed">
                                {n.content}
                              </p>
                            </div>
​
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
​
                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                    <button
                      onClick={() => { setIsNotifOpen(false); navigate('/notifications'); }}
                      className="w-full py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      View all activity <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
​
            {/* ── PROFILE PILL */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setIsProfileOpen(v => !v); setIsNotifOpen(false); }}
                className={`flex items-center gap-2 border rounded-full pl-1.5 pr-3 py-1.5 transition cursor-pointer ${
                  isProfileOpen ? 'border-emerald-200 bg-emerald-50/80' : 'border-gray-200 hover:border-gray-300 bg-white shadow-sm'
                }`}
              >
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-full flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : initial}
                </div>
                <span className="max-w-[64px] truncate text-xs font-semibold text-gray-800 sm:max-w-[80px] sm:text-sm">{firstName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
​
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden z-50">
​
                  <div className="py-2 px-2">
                    {PROFILE_LINKS.map(({ to, label, Icon, iconColor }) => (
                      <Link key={to} to={to}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition"
                      >
                        <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />
                        {label}
                      </Link>
                    ))}
                  </div>
​
                  <div className="border-t border-gray-100 py-2 px-2">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
​
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileOpen(v => !v)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>
​
      {/* ══ MOBILE MENU */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-xl rounded-b-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition ${
                    isActive(to) ? 'bg-emerald-50 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                  {isActive(to) && <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />}
                </Link>
              ))}
            </div>
​
            <div className="border-t border-gray-100 px-4 py-4 space-y-1">
              {PROFILE_LINKS.map(({ to, label, Icon, iconColor }) => (
                <Link key={to} to={to} onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                  <span className="flex-1">{label}</span>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm text-rose-600 hover:bg-rose-50 transition mt-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
​
      {/* ══ PAGE CONTENT */}
      <main className="max-w-[1600px] mx-auto w-full">
        <Outlet />
      </main>
​
      {/* ══ FLOATING HELP */}
      <FloatingHelpButton />
​
      {/* Live alert for new messages and community activity. Clicking it uses
          the same exact message/post/comment deep link as the bell item. */}
      {toastNotification && toastMeta && ToastIcon && (
        <div className="fixed bottom-5 right-5 z-[100] w-[calc(100vw-2.5rem)] max-w-[390px]" role="status" aria-live="polite">
          <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${toastMeta.iconBg}`}>
              <ToastIcon className={`h-5 w-5 ${toastMeta.iconColor}`} />
            </div>
            <button
              type="button"
              onClick={() => handleNotificationClick(toastNotification)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">New notification</span>
              <span className="mt-1 block text-sm font-semibold text-gray-900">{toastNotification.content}</span>
              <span className="mt-2 block text-xs font-semibold text-emerald-700">Open notification →</span>
            </button>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => {
                if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                setToastNotification(null);
              }}
              className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}