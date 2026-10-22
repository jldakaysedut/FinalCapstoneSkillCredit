import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Bell, CalendarDays, CheckCheck, Globe, MessageCircle, Rocket, Scale, ShieldAlert, ShieldCheck, Star, Ticket, X, Shield, Coins, ExternalLink, PlayCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase from '../../supabaseClient';

const TYPE_META = {
  // ── Moderation & Safety ──
  account_warning:     { dot: 'bg-amber-400',   ring: 'ring-amber-100',   icon: AlertTriangle, chip: 'bg-amber-50 border-amber-200 text-amber-800',     label: 'Conduct Warning', category: 'Moderation' },
  account_penalized:   { dot: 'bg-rose-500',    ring: 'ring-rose-100',    icon: ShieldAlert, chip: 'bg-rose-50 border-rose-200 text-rose-800',        label: 'Account Action',  category: 'Moderation' },
  report_updated:      { dot: 'bg-blue-400',    ring: 'ring-blue-100',    icon: ShieldCheck, chip: 'bg-blue-50 border-blue-200 text-blue-700',        label: 'Report Update',   category: 'Moderation' },
  report:              { dot: 'bg-red-400',     ring: 'ring-red-100',     icon: ShieldAlert, chip: 'bg-red-50 border-red-200 text-red-700',          label: 'Report Notice',   category: 'Moderation' },

  // ── System Admin Notices ──
  admin_role_notice:   { dot: 'bg-indigo-500',  ring: 'ring-indigo-100',  icon: Shield,      chip: 'bg-indigo-50 border-indigo-200 text-indigo-800',   label: 'Role Update',     category: 'System' },
  admin_credit_notice: { dot: 'bg-amber-500',   ring: 'ring-amber-100',   icon: Coins,       chip: 'bg-amber-50 border-amber-200 text-amber-800',      label: 'Balance Update',  category: 'System' },

  // ── Escrow Disputes & Sessions ──
  dispute_resolved:    { dot: 'bg-emerald-500', ring: 'ring-emerald-100', icon: Scale,       chip: 'bg-emerald-50 border-emerald-200 text-emerald-800', label: 'Dispute Settled', category: 'Disputes'   },
  dispute:             { dot: 'bg-amber-500',   ring: 'ring-amber-100',   icon: Scale,       chip: 'bg-amber-50 border-amber-200 text-amber-800',     label: 'Dispute Alert',   category: 'Disputes'   },
  session_disputed:    { dot: 'bg-rose-500',    ring: 'ring-rose-100',    icon: AlertTriangle, chip: 'bg-rose-50 border-rose-200 text-rose-800',   label: 'Dispute Notice',  category: 'Disputes'   },
  session_expired:     { dot: 'bg-amber-400',   ring: 'ring-amber-100',   icon: AlertTriangle, chip: 'bg-amber-50 border-amber-200 text-amber-800',   label: 'Session Expired', category: 'Booking'    },

  // ── Customer Support ──
  support_reply:       { dot: 'bg-teal-400',    ring: 'ring-teal-100',    icon: MessageCircle, chip: 'bg-teal-50 border-teal-200 text-teal-700',        label: 'Support Desk',    category: 'Support'    },
  ticket_updated:      { dot: 'bg-teal-500',    ring: 'ring-teal-100',    icon: Ticket,      chip: 'bg-teal-50 border-teal-200 text-teal-800',        label: 'Ticket Update',   category: 'Support'    },

  // ── Platform Engagements ──
  booking:             { dot: 'bg-sky-400',     ring: 'ring-sky-100',     icon: CalendarDays, chip: 'bg-sky-50 border-sky-200 text-sky-700',         label: 'Booking',         category: 'Booking'    },
  session:             { dot: 'bg-sky-400',     ring: 'ring-sky-100',     icon: CalendarDays, chip: 'bg-sky-50 border-sky-200 text-sky-700',         label: 'Session',         category: 'Booking'    },
  review:              { dot: 'bg-amber-400',   ring: 'ring-amber-100',   icon: Star,        chip: 'bg-amber-50 border-amber-200 text-amber-700',      label: 'Review',          category: 'Review'     },
  message:             { dot: 'bg-emerald-500', ring: 'ring-emerald-100', icon: MessageCircle, chip: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Message',         category: 'Message'    },
  community:           { dot: 'bg-indigo-400',  ring: 'ring-indigo-100',  icon: Globe,       chip: 'bg-indigo-50 border-indigo-200 text-indigo-700',   label: 'Community',       category: 'Community'  },
  community_like:      { dot: 'bg-indigo-400',  ring: 'ring-indigo-100',  icon: Globe,       chip: 'bg-indigo-50 border-indigo-200 text-indigo-700',   label: 'Community',       category: 'Community'  },
  community_comment:   { dot: 'bg-indigo-400',  ring: 'ring-indigo-100',  icon: Globe,       chip: 'bg-indigo-50 border-indigo-200 text-indigo-700',   label: 'Community',       category: 'Community'  },
  community_reply:     { dot: 'bg-indigo-400',  ring: 'ring-indigo-100',  icon: Globe,       chip: 'bg-indigo-50 border-indigo-200 text-indigo-700',   label: 'Community Reply', category: 'Community'  },
  system:              { dot: 'bg-purple-400',  ring: 'ring-purple-100',  icon: Rocket,      chip: 'bg-purple-50 border-purple-200 text-purple-700',   label: 'System',          category: 'System'     },
  system_alert:        { dot: 'bg-amber-500',   ring: 'ring-amber-100',   icon: Coins,       chip: 'bg-amber-50 border-amber-200 text-amber-800',      label: 'Balance Update',  category: 'System' },
  
  // ── BAGONG SESSION UPDATES MO BRO (Naka-map sa "Booking" category) ──
  booking_accepted:    { dot: 'bg-indigo-400',  ring: 'ring-indigo-100',  icon: CalendarDays, chip: 'bg-indigo-50 border-indigo-200 text-indigo-700',   label: 'Schedule Set',    category: 'Booking'    },
  session_started:     { dot: 'bg-sky-400',     ring: 'ring-sky-100',     icon: PlayCircle,   chip: 'bg-sky-50 border-sky-200 text-sky-700',         label: 'Started',         category: 'Booking'    },
  session_update:      { dot: 'bg-blue-400',    ring: 'ring-blue-100',    icon: CheckCheck,   chip: 'bg-blue-50 border-blue-200 text-blue-700',        label: 'Session Update',  category: 'Booking'    },
  session_completed:   { dot: 'bg-emerald-500', ring: 'ring-emerald-100', icon: CheckCheck,   chip: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Completed',       category: 'Booking'    },
  session_cancelled:   { dot: 'bg-gray-400',    ring: 'ring-gray-100',    icon: X,            chip: 'bg-gray-50 border-gray-200 text-gray-700',       label: 'Cancelled',       category: 'Booking'    },
  new_rating:          { dot: 'bg-amber-400',   ring: 'ring-amber-100',   icon: Star,         chip: 'bg-amber-50 border-amber-200 text-amber-700',      label: 'New Rating',      category: 'Review'     },
};

const TYPE_TABS = ['All', 'Moderation', 'Disputes', 'Support', 'Booking', 'Message', 'Community', 'System'];
const GROUP_ORDER = ['Today', 'This Week', 'This Month', 'Earlier'];

const buildMessageLink = (message) => {
  const params = new URLSearchParams();
  if (message?.ticket_id) params.set('ticket', message.ticket_id);
  else if (message?.session_id) params.set('session', message.session_id);
  else if (message?.sender_id) params.set('user', message.sender_id);
  if (message?.id) params.set('message', message.id);
  return params.size ? `/messages?${params.toString()}` : '/messages';
};

const findLatestIncomingMessage = async (userId) => {
  if (!userId) return null;
  const columns = 'id, sender_id, receiver_id, session_id, ticket_id, created_at';
  const candidates = [];

  const { data: directMessage } = await supabase
    .from('messages')
    .select(columns)
    .eq('receiver_id', userId)
    .neq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (directMessage) candidates.push(directMessage);

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

  return candidates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
};

const isInternalLink = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

function resolveMeta(type) {
  const normalized = type?.toLowerCase() || 'system';
  return TYPE_META[normalized] || TYPE_META.system;
}

function getCategory(type) {
  return resolveMeta(type).category;
}

function getGroup(createdAt) {
  const now = new Date();
  const diff = (now - new Date(createdAt)) / 86400000;
  if (diff < 1)  return 'Today';
  if (diff < 7)  return 'This Week';
  if (diff < 30) return 'This Month';
  return 'Earlier';
}

function timeAgo(createdAt) {
  const diff = (Date.now() - new Date(createdAt)) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── HELPER: EXTRACT MOD/ADMIN REMARKS ─────────────────────────────
function extractModeratorDetails(rawContent) {
  if (!rawContent) {
    return {
      summary: 'Action taken on your account regarding a system update.',
      remarks: 'No specific notes provided.'
    };
  }

  if (/moderator note:|investigation notes:|remarks:|admin note:/i.test(rawContent)) {
    const parts = rawContent.split(/moderator note:|investigation notes:|remarks:|admin note:/i);
    return {
      summary: parts[0].trim(),
      remarks: parts[1]?.trim() || rawContent
    };
  }

  if (rawContent.includes('\n\n')) {
    const parts = rawContent.split('\n\n');
    return {
      summary: parts[0].trim(),
      remarks: parts.slice(1).join('\n\n').trim()
    };
  }

  return {
    summary: rawContent.includes('resolved') || rawContent.includes('dispute') ? 'Escrow Resolution Notice' : 'System Notice',
    remarks: rawContent
  };
}

// ─── SKELETON LOADER ───────────────────────────────────────────────────────
const NotificationsSkeleton = () => (
  <div className="min-h-screen bg-[#faf9f6] animate-pulse">
    <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-5">
      <div className="mb-4">
        <div className="w-28 h-3.5 bg-gray-200 rounded-md mb-2" />
        <div className="flex items-end justify-between">
          <div className="w-52 h-8 bg-gray-200 rounded-xl" />
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 bg-gray-200 rounded-xl" />
            <div className="w-28 h-8 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
        {[75, 110, 95, 90, 85, 90, 105].map((w, idx) => (
          <div key={idx} className="h-9 bg-gray-200 rounded-xl shrink-0" style={{ width: `${w}px` }} />
        ))}
      </div>
      <div className="space-y-10">
        {[1, 2].map((g) => (
          <div key={g}>
            <div className="w-20 h-3 bg-gray-200 rounded mb-4 pl-8" />
            <div className="relative pl-8">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
              <div className="space-y-3">
                {[1, 2, 3].map((card) => (
                  <div key={card} className="relative">
                    <div className="absolute -left-8 top-4 w-[14px] h-[14px] rounded-full bg-gray-300 border-2 border-white z-10" />
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                      <div className="flex-1 space-y-2 py-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-4 bg-gray-200 rounded-md" />
                          <div className="w-12 h-3.5 bg-gray-100 rounded" />
                        </div>
                        <div className="w-5/6 h-3.5 bg-gray-200 rounded" />
                        <div className="w-1/2 h-3 bg-gray-100 rounded" />
                      </div>
                      <div className="w-12 h-3.5 bg-gray-200 rounded shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function Notifications() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [typeTab, setTypeTab] = useState(location.state?.tab || 'All');

  // Modal State para sa Moderator & Admin Action Inspection
  const [activeNotice, setActiveNotice] = useState(null);

  useEffect(() => {
    if (location.state?.tab) {
      setTypeTab(location.state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    let disposed = false;
    let channel = null;
    const channelSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (disposed) return;
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (disposed) return;

      setNotifications(data || []);
      setLoading(false);

      channel = supabase.channel(`notifs_page_${user.id}_${channelSuffix}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => prev.some(item => item.id === payload.new.id)
                ? prev
                : [payload.new, ...prev]);
            }
            if (payload.eventType === 'UPDATE') {
              setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
            }
          }
        )
        .subscribe();
    };

    init().catch(error => {
      console.error('Notifications initialization failed:', error);
      if (!disposed) setLoading(false);
    });

    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  // ─── SMART REDIRECTION LOGIC ───
  const handleClick = async (notif) => {
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      supabase.from('notifications').update({ is_read: true }).eq('id', notif.id).catch(err => console.error("Mark read failed:", err));
    }

    const type = notif.type?.toLowerCase() || '';

    try {
      // ── MODAL TRIGGER FOR ALL REPORTS AND DISPUTES ──
      const modalNoticeTypes = ['account_warning', 'account_penalized', 'admin_role_notice', 'admin_credit_notice', 'report_updated', 'report', 'dispute_resolved', 'system', 'system_alert'];
      if (modalNoticeTypes.includes(type)) {
        setActiveNotice(notif);
        return;
      }

      if (type === 'message') {
        if (isInternalLink(notif.link_url)) {
          navigate(notif.link_url);
        } else {
          const latestMsg = await findLatestIncomingMessage(currentUserId);
          navigate(latestMsg ? buildMessageLink(latestMsg) : '/messages');
        }
        return;
      }
      if (['community', 'community_like', 'community_comment', 'community_reply'].includes(type)) {
        navigate(isInternalLink(notif.link_url) ? notif.link_url : '/community');
        return;
      }

      if (type === 'support_reply' || type === 'ticket_updated') {
        const { data: ticket } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (ticket) {
          navigate(`/messages?ticket=${ticket.id}`);
        } else {
          navigate('/messages');
        }
      } 
      else if (type === 'session_disputed' || type === 'dispute') {
        navigate('/sessions', { state: { tab: 'Disputed' } });
      }
      else if (type === 'session_expired') {
        navigate('/sessions', { state: { tab: 'Pending' } });
      }
      // Dito hindi ko isinama yung mga bagong types sa condition na ito para umabot sila sa else statement
      // Sa else statement, dederecho sila eksakto kung saan sila naka-link (e.g., /sessions?session=123)
      else if (type === 'booking' || type === 'session') {
        navigate('/sessions');
      } 
      else if (type === 'review') {
        navigate('/profile');
      } 
      else {
        // Lahat ng hindi nahuli sa taas (katulad ng session_started, booking_accepted) ay didiretso dito 
        // at gagamitin ang eksaktong link_url para may auto-highlight!
        navigate(isInternalLink(notif.link_url) ? notif.link_url : '/dashboard');
      }
    } catch (error) {
      console.error('Error during notification routing:', error);
      navigate(isInternalLink(notif.link_url) ? notif.link_url : '/dashboard');
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!unreadIds.length) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  };

  const filtered = useMemo(() => {
    if (typeTab === 'All') return notifications;
    return notifications.filter(n => getCategory(n.type) === typeTab);
  }, [notifications, typeTab]);

  const grouped = useMemo(() => {
    const g = GROUP_ORDER.reduce((acc, k) => ({ ...acc, [k]: [] }), {});
    filtered.forEach(n => {
      const key = getGroup(n.created_at);
      if (g[key]) g[key].push(n);
    });
    return g;
  }, [filtered]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const tabCounts = useMemo(() => {
    return TYPE_TABS.reduce((acc, tab) => {
      acc[tab] = tab === 'All'
        ? notifications.length
        : notifications.filter(n => getCategory(n.type) === tab).length;
      return acc;
    }, {});
  }, [notifications]);

  if (loading) {
    return <NotificationsSkeleton />;
  }

  // ─── DYNAMIC MODAL UI LOGIC ───
  const parsedNotice = activeNotice ? extractModeratorDetails(activeNotice.content) : null;
  
  let ModalIcon = AlertTriangle;
  let iconBg = 'bg-amber-100 text-amber-700';
  let badgeStyle = 'bg-amber-100 border-amber-200 text-amber-800';
  let badgeText = 'Formal Warning';
  let modalTitle = 'Trust & Safety Notice';
  let notesLabel = 'Moderator Investigation Notes & Rationale';
  let notesIcon = <ShieldCheck className="h-4 w-4 text-emerald-700" />;
  let notesBg = 'bg-emerald-50/70 border-emerald-200 text-emerald-950';

  if (activeNotice) {
    if (activeNotice.type === 'account_penalized') {
        ModalIcon = ShieldAlert;
        iconBg = 'bg-rose-100 text-rose-700';
        badgeStyle = 'bg-rose-100 border-rose-200 text-rose-800';
        badgeText = 'Disciplinary Penalty';
    } else if (activeNotice.type === 'admin_role_notice' || activeNotice.type === 'system') {
        ModalIcon = Shield;
        iconBg = 'bg-indigo-100 text-indigo-700';
        badgeStyle = 'bg-indigo-100 border-indigo-200 text-indigo-800';
        badgeText = 'System Role Update';
        modalTitle = 'System Admin Notice';
        notesLabel = 'Administrator Remarks';
        notesIcon = <Shield className="h-4 w-4 text-indigo-700" />;
        notesBg = 'bg-indigo-50/70 border-indigo-200 text-indigo-950';
    } else if (activeNotice.type === 'admin_credit_notice' || activeNotice.type === 'system_alert') {
        ModalIcon = Coins;
        iconBg = 'bg-amber-100 text-amber-700';
        badgeStyle = 'bg-amber-100 border-amber-200 text-amber-800';
        badgeText = 'Wallet Adjustment';
        modalTitle = 'System Admin Notice';
        notesLabel = 'Administrator Remarks';
        notesIcon = <Coins className="h-4 w-4 text-amber-700" />;
        notesBg = 'bg-amber-50/70 border-amber-200 text-amber-950';
    } else if (activeNotice.type === 'report_updated' || activeNotice.type === 'report') {
        ModalIcon = ShieldCheck;
        iconBg = 'bg-blue-100 text-blue-700';
        badgeStyle = 'bg-blue-100 border-blue-200 text-blue-800';
        badgeText = 'Report Update';
        modalTitle = 'Trust & Safety Notice';
        notesLabel = 'Resolution Status';
        notesIcon = <ShieldCheck className="h-4 w-4 text-blue-700" />;
        notesBg = 'bg-blue-50/70 border-blue-200 text-blue-950';
    } else if (activeNotice.type === 'dispute_resolved') {
        ModalIcon = Scale;
        iconBg = 'bg-emerald-100 text-emerald-700';
        badgeStyle = 'bg-emerald-100 border-emerald-200 text-emerald-800';
        badgeText = 'Escrow Verdict';
        modalTitle = 'Dispute Resolution Notice';
        notesLabel = 'Verdict Notes';
        notesIcon = <Scale className="h-4 w-4 text-emerald-700" />;
        notesBg = 'bg-emerald-50/70 border-emerald-200 text-emerald-950';
    }
  }

  // ── DYNAMIC BUTTON LABEL PARA SA SESSION VS COMMUNITY ──
  const getButtonLabel = (url) => {
    if (url && url.includes('session')) return 'View Session Record';
    return 'View Reported Content';
  };

  return (
    <div className="min-h-screen" style={{ background: '#faf9f6' }}>
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-5">

        {/* ══ PAGE HEADER ══ */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
            Activity Center
          </p>
          <div className="flex items-end justify-between">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notifications</h1>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 shadow-xs">
                  <span className="font-bold text-[14px] text-emerald-700">{unreadCount}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Unread</span>
                </div>
              )}

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition shadow-xs cursor-pointer"
                >
                  <CheckCheck className="h-4 w-4" /> Mark all read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══ KANBAN TYPE TABS ══ */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 mb-8">
          {TYPE_TABS.map(tab => {
            const isActive = typeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setTypeTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {tabCounts[tab] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* ══ TIMELINE FEED ══ */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 bg-white border border-gray-200 rounded-2xl shadow-xs">
            <Bell className="h-9 w-9 text-gray-300 mb-3" strokeWidth={1.7} />
            <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">All caught up</p>
            <p className="text-[11px] text-gray-400 mt-1">No notifications under this category.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {GROUP_ORDER.filter(g => grouped[g]?.length > 0).map(group => (
              <div key={group}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 pl-8">
                  {group}
                </p>

                <div className="relative pl-8">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                  
                  <div className="space-y-3">
                    {grouped[group].map(notif => {
                      const meta = resolveMeta(notif.type);
                      const NotificationIcon = meta.icon;
                      const isUnread = !notif.is_read;
                      const isHighPriority = notif.type === 'account_warning' || notif.type === 'account_penalized';

                      return (
                        <div key={notif.id} className="relative">
                          <div className={`absolute -left-8 top-4 w-[14px] h-[14px] rounded-full border-2 border-white z-10 ring-2 ${meta.dot} ${meta.ring}`} />

                          <div
                            onClick={() => handleClick(notif)}
                            className={`relative flex items-start gap-3.5 bg-white border rounded-2xl px-5 py-4 cursor-pointer overflow-hidden transition-all duration-200 ${
                              isUnread
                                ? isHighPriority
                                  ? 'border-rose-200 shadow-[0_2px_12px_rgba(244,63,94,0.08)] hover:shadow-[0_4px_16px_rgba(244,63,94,0.14)] bg-rose-50/10'
                                  : 'border-emerald-200 shadow-[0_2px_12px_rgba(16,185,129,0.08)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.14)]'
                                : 'border-gray-200/80 hover:border-emerald-200 hover:shadow-[0_2px_8px_rgba(16,185,129,0.06)]'
                            }`}
                          >
                            {isUnread && (
                              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                                isHighPriority ? 'bg-rose-500' : 'bg-emerald-500'
                              }`} />
                            )}

                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${meta.chip}`}><NotificationIcon className="h-5 w-5" strokeWidth={1.8} /></div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${meta.chip}`}>
                                  {meta.label}
                                </span>
                                {isUnread && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${isHighPriority ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                )}
                              </div>

                              <p className={`text-[13px] leading-snug ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                {notif.content}
                              </p>

                              {notif.link_url && notif.link_url !== '/notifications' && !['account_warning', 'account_penalized', 'admin_role_notice', 'admin_credit_notice', 'report_updated', 'dispute_resolved', 'system', 'system_alert'].includes(notif.type) && (
                                <div className="mt-3">
                                 
                                </div>
                              )}
                            </div>

                            <span className="shrink-0 text-[10px] font-bold text-gray-400 whitespace-nowrap pt-0.5">
                              {timeAgo(notif.created_at)}
                            </span>
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

      {/* ══ MODERATOR / ADMIN ACTION & NOTES MODAL ══ */}
      {activeNotice && parsedNotice && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setActiveNotice(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-5 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${iconBg}`}>
                  <ModalIcon className="h-6 w-6" />
                </div>
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${badgeStyle}`}>
                    {badgeText}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">{modalTitle}</h3>
                </div>
              </div>

              <button 
                onClick={() => setActiveNotice(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Notice Summary</p>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {parsedNotice.summary}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {notesIcon}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    {notesLabel}
                  </p>
                </div>
                <div className={`${notesBg} border rounded-2xl p-4 text-xs font-semibold leading-relaxed whitespace-pre-wrap shadow-inner`}>
                  "{parsedNotice.remarks}"
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-1 font-mono">
                <span>Date: {new Date(activeNotice.created_at).toLocaleDateString()}</span>
                <span>Ref: #{activeNotice.id.split('-')[0]}</span>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl mb-6 flex items-start gap-2.5">
              <Bell className="h-4 w-4 shrink-0 text-gray-500" />
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                SkillCredit strictly adheres to platform rules. System modifications are tracked and recorded for security purposes.
              </p>
            </div>

            <div className="flex gap-2">
              {activeNotice.link_url && activeNotice.link_url !== '/notifications' ? (
                <button
                  onClick={() => {
                    const link = activeNotice.link_url;
                    setActiveNotice(null);
                    navigate(link);
                  }}
                  className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-xs font-bold rounded-2xl transition shadow-sm cursor-pointer"
                >
                  {getButtonLabel(activeNotice.link_url)}
                </button>
              ) : activeNotice.content.includes('removed by the moderation team') ? (
                <button
                  disabled
                  className="w-full py-3.5 bg-gray-50 border border-gray-200 text-gray-400 text-xs font-bold rounded-2xl cursor-not-allowed shadow-sm"
                >
                  Content Deleted by Moderators
                </button>
              ) : null}

              <button
                onClick={() => setActiveNotice(null)}
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-2xl transition shadow-sm cursor-pointer"
              >
                I Acknowledge & Understand
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}