import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Clock3, FileText, Headset, Lock, RotateCcw, Send, ShieldCheck, Star, Ticket, UserRound, X } from 'lucide-react';
import supabase from '../../supabaseClient';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2';

const CANNED_REPLIES = {
  "Greetings & Acknowledgments": [
    "Hello, thank you for contacting Support. I have taken ownership of your ticket.",
    "Hi, I am currently reviewing your inquiry and will provide an update shortly."
  ],
  "Investigation & Triage": [
    "I am currently looking into this issue. Please allow me a few moments.",
    "Could you please provide a screenshot or further details regarding the error?",
    "To assist you better, can you confirm the exact time this issue occurred?"
  ],
  "Resolution & Closing": [
    "We have applied a fix for your reported issue. Kindly verify on your end.",
    "Your request has been successfully processed.",
    "I am marking this ticket as resolved. Please feel free to open a new ticket if further assistance is required."
  ]
};

export default function TicketChat() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedCanned, setSelectedCanned] = useState('');
  const [chatMessages, setChatMessages] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ total: 0, resolved: 0, open: 0 });
  const [isSending, setIsSending] = useState(false);

  // Lightbox viewer para sa customer screenshots
  const [previewImage, setPreviewImage] = useState(null);
  
  const conversationRef = useRef(null);
  const shouldFollowMessagesRef = useRef(true);
  const lastMessageIdRef = useRef(null);
  const textareaRef = useRef(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const resolveAttachmentUrl = (pathOrUrl) => {
    if (!pathOrUrl) return null;
    if (typeof pathOrUrl === 'string' && (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:'))) {
      return pathOrUrl;
    }
    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(pathOrUrl);
    return data?.publicUrl || pathOrUrl;
  };

  const isImageFile = (url, fileType) => {
    if (fileType && fileType.startsWith('image/')) return true;
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url);
  };

  const fetchLiveMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:user_profiles!messages_sender_id_fkey(full_name, avatar_url)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setChatMessages(data);
    }
  };

  const fetchTicketDetails = async (uid) => {
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *, 
        user:user_profiles!support_tickets_user_id_fkey(id, full_name, avatar_url), 
        agent:user_profiles!support_tickets_assigned_to_fkey(id, full_name)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticketData) {
      console.error("DB ERROR FETCHING TICKET:", ticketError);
      navigate('/support/tickets'); 
      return;
    }

    setTicket(ticketData);

    const { data: userTickets } = await supabase
      .from('support_tickets')
      .select('status')
      .eq('user_id', ticketData.user_id);

    if (userTickets) {
      setUserStats({
        total: userTickets.length,
        resolved: userTickets.filter(t => t.status === 'resolved').length,
        open: userTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
      });
    }
  };

  useEffect(() => {
    let msgChannel = null;
    let ticketChannel = null;

    const init = async () => {
      setLoading(true);
      setTicket(null);
      setChatMessages([]);
      lastMessageIdRef.current = null;
      shouldFollowMessagesRef.current = true;
      setHasNewMessages(false);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setCurrentUserProfile(profile);
      }

      await fetchTicketDetails(user?.id);
      await fetchLiveMessages();
      setLoading(false);

      msgChannel = supabase.channel(`ticket_chat_${ticketId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `ticket_id=eq.${ticketId}` 
        }, () => {
          fetchLiveMessages(); 
        })
        .subscribe();

      ticketChannel = supabase.channel(`ticket_status_${ticketId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`
        }, () => {
          fetchTicketDetails();
        })
        .subscribe();
    };

    init();

    return () => {
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (ticketChannel) supabase.removeChannel(ticketChannel);
    };
  }, [ticketId, navigate]);

  useEffect(() => {
    const latestMessage = chatMessages[chatMessages.length - 1];
    if (!latestMessage || latestMessage.id === lastMessageIdRef.current) return;

    const isInitialLoad = lastMessageIdRef.current === null;
    lastMessageIdRef.current = latestMessage.id;

    if (isInitialLoad) {
      requestAnimationFrame(() => {
        const container = conversationRef.current;
        if (container) container.scrollTop = container.scrollHeight;
      });
      return;
    }

    if (shouldFollowMessagesRef.current) {
      requestAnimationFrame(() => {
        const container = conversationRef.current;
        container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      });
    } else {
      setHasNewMessages(true);
    }
  }, [chatMessages]);

  const handleConversationScroll = () => {
    const container = conversationRef.current;
    if (!container) return;
    const isNearLatest = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    shouldFollowMessagesRef.current = isNearLatest;
    if (isNearLatest) setHasNewMessages(false);
  };

  const jumpToLatest = () => {
    shouldFollowMessagesRef.current = true;
    setHasNewMessages(false);
    const container = conversationRef.current;
    container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  const handleClaimTicket = async () => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ assigned_to: currentUserId, status: 'in_progress' })
      .eq('id', ticket.id);
      
    if (!error) {
      // ─── RECORD ACTION TO SUPPORT_LOGS ───
      await supabase.from('support_logs').insert([{
        support_id: currentUserId,
        target_user_id: ticket.user_id,
        action_type: 'TICKET_CLAIMED',
        ticket_id: ticket.id,
        details: `Started investigating Ticket #${ticket.id.split('-')[0]} (Subject: ${ticket.subject}).`
      }]);

      setTicket(prev => ({ 
        ...prev, 
        assigned_to: currentUserId, 
        status: 'in_progress',
        agent: { id: currentUserId, full_name: currentUserProfile?.full_name || 'You' }
      }));
    }
  };

  const handleReleaseTicket = async () => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ assigned_to: null, status: 'open' })
      .eq('id', ticket.id);
      
    if (!error) {
      // ─── RECORD ACTION TO SUPPORT_LOGS ───
      await supabase.from('support_logs').insert([{
        support_id: currentUserId,
        target_user_id: ticket.user_id,
        action_type: 'TICKET_RELEASED',
        ticket_id: ticket.id,
        details: `Released Ticket #${ticket.id.split('-')[0]} back to the open queue.`
      }]);

      setTicket(prev => ({ ...prev, assigned_to: null, status: 'open', agent: null }));
    }
  };

  const updateTicketStatus = async (newStatus) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', ticket.id);
      
    if (!error) {
      setTicket(prev => ({ ...prev, status: newStatus }));
      
      if (newStatus === 'resolved') {
        // Send Notification to User WITH EXACT LINK_URL
        await supabase.from('notifications').insert([{
          user_id: ticket.user_id,
          type: 'ticket_updated',
          content: `Your support ticket regarding "${ticket.subject}" has been marked as resolved.`,
          link_url: `/messages?ticket=${ticket.id}`
        }]);

        // ─── RECORD ACTION TO SUPPORT_LOGS ───
        const { error: logErr } = await supabase.from('support_logs').insert([{
          support_id: currentUserId,
          target_user_id: ticket.user_id,
          action_type: 'RESOLVE_TICKET',
          ticket_id: ticket.id,
          details: `Ticket successfully resolved and closed. Notes: Marked as resolved by assigned agent.`
        }]);

        if (logErr) console.warn("Failed to record action to support_logs:", logErr);
      }
    }
  };

  // Controlled Quick Reply Insertion
  const handleCannedReplySelect = (e) => {
    const chosenText = e.target.value;
    if (!chosenText) return;

    setNewMessage(prev => (prev ? `${prev.trim()}\n${chosenText}` : chosenText));
    setSelectedCanned('');

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 50);
  };

  const handleSendReply = async () => {
    if (!newMessage.trim() || !ticket || isSending) return;

    shouldFollowMessagesRef.current = true;
    setHasNewMessages(false);
    setIsSending(true);
    const msgContent = newMessage.trim();
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          ticket_id: ticket.id,
          sender_id: currentUserId,
          receiver_id: ticket.user_id, 
          content: msgContent
        }]);

      if (error) throw error;

      // DINAGDAG ANG LINK_URL DITO PARA MAG-REDIRECT ANG USER SA TAMANG TICKET CHAT NILA
      await supabase.from('notifications').insert([{
        user_id: ticket.user_id,
        type: 'support_reply',
        content: `Support replied to your ticket: "${ticket.subject}"`,
        link_url: `/messages?ticket=${ticket.id}`
      }]);

      setNewMessage(''); 
      await fetchLiveMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Error sending message: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (loading || !ticket) {
    return (
      <div className="grid min-h-[55vh] place-items-center font-sans" role="status">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-yellow-400 border-t-transparent" />
          <span><span className="block text-sm font-semibold text-gray-900">Opening conversation</span><span className="mt-0.5 block text-xs text-gray-500">Loading ticket details…</span></span>
        </div>
      </div>
    );
  }

  const isResolved = ticket.status === 'resolved';
  const isUnassigned = !ticket.assigned_to;
  const isAssignedToMe = ticket.assigned_to === currentUserId;
  const isAssignedToOther = Boolean(ticket.assigned_to && ticket.assigned_to !== currentUserId);
  const statusStyle = isResolved
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : ticket.status === 'in_progress'
      ? 'bg-blue-50 text-blue-800 ring-blue-200'
      : 'bg-amber-50 text-amber-800 ring-amber-200';

  return (
    <div className="grid min-h-0 grid-cols-1 gap-6 font-sans text-gray-700 xl:grid-cols-[minmax(0,1fr)_320px]">

      {/* ══ CONVERSATION ══ */}
      <section className="flex h-[calc(100dvh-210px)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/support/tickets')}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 ${FOCUS_RING}`}
              title="Back to ticket queue"
              aria-label="Back to ticket queue"
            ><ArrowLeft className="h-[17px] w-[17px]" /></button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-gray-900"><Ticket className="h-[18px] w-[18px]" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-gray-900 sm:text-[15px]">{ticket.subject || 'Support request'}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                <span className="font-mono">#{ticket.id.split('-')[0]}</span><span aria-hidden="true">·</span><span>{new Date(ticket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset sm:px-3 ${statusStyle}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isResolved ? 'bg-emerald-500' : ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500'}`} aria-hidden="true" />
            <span className="hidden sm:inline">{ticket.status.replace('_', ' ')}</span><span className="sm:hidden">{isResolved ? 'Done' : ticket.status === 'in_progress' ? 'Active' : 'Open'}</span>
          </span>
        </header>

        <div className="relative min-h-0 flex-1">
          <div ref={conversationRef} onScroll={handleConversationScroll} className="absolute inset-0 flex flex-col overflow-y-auto bg-gray-50 px-4 py-5 sm:px-6 [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin]">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm">
              <Clock3 className="h-3 w-3" /> Conversation started {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {chatMessages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 shadow-sm"><Headset className="h-5 w-5" /></span>
              <p className="mt-3 text-sm font-semibold text-gray-900">No messages yet</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">The conversation will appear here when the customer sends a message.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {chatMessages.map(msg => {
                const isAgentMessage = msg.sender_id !== ticket.user_id;
                const attachmentUrl = resolveAttachmentUrl(msg.file_url);
                const isImage = isImageFile(attachmentUrl, msg.file_type);
                const senderName = isAgentMessage
                  ? (msg.sender?.full_name || (msg.sender_id === currentUserId ? 'You' : 'Support agent'))
                  : (msg.sender?.full_name || ticket.user?.full_name || 'Customer');
                return (
                  <article key={msg.id} className={`flex max-w-[94%] items-end gap-2.5 sm:max-w-[86%] ${isAgentMessage ? 'ml-auto flex-row-reverse' : ''}`}>
                    {isAgentMessage ? (
                      <span className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-gray-900"><ShieldCheck className="h-4 w-4" /></span>
                    ) : (
                      <span className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[11px] font-semibold text-gray-600">{ticket.user?.avatar_url ? <img src={ticket.user.avatar_url} alt="" className="h-full w-full object-cover" /> : (ticket.user?.full_name?.charAt(0) || 'U')}</span>
                    )}
                    <div className={`flex min-w-0 flex-col gap-1.5 ${isAgentMessage ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 px-1"><span className="text-xs font-semibold text-gray-900">{senderName}</span><span className="text-xs text-gray-500">{isAgentMessage ? 'Support' : 'Requester'}</span></div>
                      <div className={`max-w-full rounded-2xl px-4 py-3 text-[13px] leading-6 shadow-sm ${isAgentMessage ? 'rounded-br-md bg-yellow-400 text-gray-900' : 'rounded-bl-md border border-gray-200 bg-white text-gray-700'}`}>
                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                        {attachmentUrl && (
                          <div className={msg.content ? 'mt-3' : ''}>
                            {isImage ? (
                              <button type="button" onClick={() => setPreviewImage(attachmentUrl)} aria-label="Preview image attachment" className={`block overflow-hidden rounded-xl bg-black/5 ${FOCUS_RING}`}>
                                <img src={attachmentUrl} alt="Ticket attachment" onError={event => { event.currentTarget.style.display = 'none'; }} className="max-h-[280px] max-w-full object-contain transition hover:opacity-90" />
                              </button>
                            ) : (
                              <a href={attachmentUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isAgentMessage ? 'bg-black/10 text-gray-900 hover:bg-black/15' : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                                <FileText className="h-4 w-4" /> View attached document <ArrowRight className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="px-1 text-xs tabular-nums text-gray-400">{new Date(msg.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
            <div className="h-2 shrink-0" />
          </div>
          {hasNewMessages && (
            <button type="button" onClick={jumpToLatest} className={`absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-900 shadow-[0_6px_20px_rgba(15,23,42,0.12)] transition-colors hover:bg-yellow-50 ${FOCUS_RING}`}>
              <ArrowDown className="h-3.5 w-3.5" /> New message · Jump to latest
            </button>
          )}
        </div>

        {/* ── COMPOSER / STATE BAR ── */}
        {isResolved ? (
          <div className="flex shrink-0 items-center gap-3 border-t border-emerald-100 bg-emerald-50/70 px-5 py-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><CheckCircle2 className="h-5 w-5" /></span>
            <div><p className="text-[13px] font-semibold text-emerald-900">Ticket resolved</p><p className="mt-0.5 text-xs text-emerald-700">This conversation is closed and archived.</p></div>
          </div>
        ) : isUnassigned ? (
          <div className="shrink-0 border-t border-amber-100 bg-amber-50/60 px-5 py-4 sm:px-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-[13px] font-semibold text-amber-950">This ticket is waiting for an agent</p><p className="mt-0.5 text-xs text-amber-800">Claim it to take ownership and reply to the requester.</p></div><button type="button" onClick={handleClaimTicket} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-[13px] font-semibold text-gray-900 shadow-sm transition-colors hover:bg-yellow-500 ${FOCUS_RING}`}><Headset className="h-4 w-4" /> Claim ticket</button></div>
          </div>
        ) : isAssignedToOther ? (
          <div className="flex shrink-0 items-center gap-3 border-t border-blue-100 bg-blue-50/60 px-5 py-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Lock className="h-4 w-4" /></span>
            <div><p className="text-[13px] font-semibold text-blue-950">Handled by {ticket.agent?.full_name || 'another support agent'}</p><p className="mt-0.5 text-xs text-blue-800">You can review the conversation, but only the assigned agent can reply.</p></div>
          </div>
        ) : (
          <div className="shrink-0 border-t border-gray-100 bg-white p-3 sm:p-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-200">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700"><span className="text-sm" aria-hidden="true">✦</span></span>
                <select value={selectedCanned} onChange={handleCannedReplySelect} aria-label="Insert a canned reply" className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-1 text-xs font-medium text-gray-600 outline-none">
                  <option value="" disabled>Choose a quick reply…</option>
                  {Object.entries(CANNED_REPLIES).map(([category, replies]) => <optgroup label={category} key={category}>{replies.map((reply, index) => <option value={reply} key={index}>{reply.length > 72 ? `${reply.slice(0, 72)}…` : reply}</option>)}</optgroup>)}
                </select>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-end gap-2 p-2 sm:p-2.5">
                <textarea ref={textareaRef} rows={2} placeholder="Write a thoughtful reply… (Enter to send, Shift + Enter for a new line)" value={newMessage} onChange={event => setNewMessage(event.target.value)} onKeyDown={handleKeyDown} className="max-h-32 min-h-[54px] flex-1 resize-y bg-transparent px-2 py-2 text-[13px] leading-5 text-gray-900 outline-none placeholder:text-gray-400" />
                <button type="button" onClick={handleSendReply} disabled={isSending || !newMessage.trim()} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-yellow-400 px-3.5 text-[13px] font-semibold text-gray-900 shadow-sm transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 ${FOCUS_RING}`}>
                  {isSending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900/30 border-t-gray-900" /> : <Send className="h-4 w-4" />}<span className="hidden sm:inline">Send reply</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══ SIDE PANEL ══ */}
      <aside className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:flex xl:min-h-0 xl:flex-col">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs text-gray-500">Requester</p><h2 className="mt-0.5 text-sm font-semibold text-gray-900">Customer profile</h2></div><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><UserRound className="h-4 w-4" /></span></div>
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            {ticket.user?.avatar_url ? <img src={ticket.user.avatar_url} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100 text-sm font-semibold text-yellow-800">{ticket.user?.full_name?.charAt(0) || 'U'}</span>}
            <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-gray-900">{ticket.user?.full_name || 'Unknown user'}</p><p className="mt-0.5 text-xs text-gray-500">Ticket requester</p></div>
          </div>
          <dl className="mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 py-3 text-center">
            <div><dd className="text-lg font-semibold tabular-nums text-gray-900">{userStats.total}</dd><dt className="mt-0.5 text-xs text-gray-500">Tickets</dt></div>
            <div><dd className="text-lg font-semibold tabular-nums text-emerald-700">{userStats.resolved}</dd><dt className="mt-0.5 text-xs text-gray-500">Resolved</dt></div>
            <div><dd className="text-lg font-semibold tabular-nums text-amber-700">{userStats.open}</dd><dt className="mt-0.5 text-xs text-gray-500">Active</dt></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs text-gray-500">Workflow</p><h2 className="mt-0.5 text-sm font-semibold text-gray-900">Ticket controls</h2></div><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700"><ShieldCheck className="h-4 w-4" /></span></div>
          <label htmlFor="ticket-status" className="mb-2 block text-xs font-medium text-gray-500">Current status</label>
          <div className="relative">
            <select id="ticket-status" value={ticket.status} onChange={event => updateTicketStatus(event.target.value)} disabled={!isAssignedToMe || isResolved} className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-9 text-xs font-semibold text-gray-700 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 disabled:cursor-not-allowed disabled:opacity-60">
              {ticket.status === 'open' && <option value="open">Open · Unassigned</option>}
              <option value="in_progress">Investigating · In progress</option>
              <option value="resolved">Resolved · Closed</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <p className="mt-2 text-xs leading-4 text-gray-500">{isAssignedToMe ? 'Update status as you work through the request.' : isAssignedToOther ? `Assigned to ${ticket.agent?.full_name || 'another agent'}.` : 'Claim this ticket before changing its status.'}</p>
          {isAssignedToMe && !isResolved && <button type="button" onClick={handleReleaseTicket} className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 ${FOCUS_RING}`}><RotateCcw className="h-3.5 w-3.5" /> Release to queue</button>}
        </section>

        <section className="hidden rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-gray-900 shadow-sm xl:block">
          <div className="flex items-center gap-2 text-yellow-800"><Star className="h-4 w-4 fill-yellow-300" /><p className="text-xs font-medium">A little reminder</p></div>
          <p className="mt-3 text-[13px] font-semibold leading-5">Clear, kind replies make support feel human.</p>
          <p className="mt-2 text-xs leading-5 text-gray-600">Use a quick reply as a starting point, then tailor it to this customer.</p>
        </section>
      </aside>

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/85 p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)} role="dialog" aria-modal="true" aria-label="Image attachment preview">
          <button type="button" onClick={() => setPreviewImage(null)} aria-label="Close image preview" className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"><X className="h-5 w-5" /></button>
          <img src={previewImage} alt="Full-size ticket attachment" onClick={event => event.stopPropagation()} className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}