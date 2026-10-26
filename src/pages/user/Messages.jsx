// ─────────────────────────────────────────────────────────────────────
// MESSAGES V10 — "Global Live Updates + Unrestricted Role Filters"
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Bell, BellOff, BookOpen, Briefcase, CheckCircle2, ChefHat, ChevronDown,
  Code2, Dumbbell, FileText, Film, Gamepad2, Hammer, Hand, Heart, ImagePlus,
  PanelRight, Leaf, Lock, MessageCircle, MessageSquare, Monitor, Music2, Palette,
  PenLine, PiggyBank, Reply, Scissors, Search, Send, Shield, Smile, Star,
  ThumbsUp, UserRound, Wrench, X, Flame, Laugh, Lightbulb, PartyPopper, CalendarDays
} from 'lucide-react';
import supabase from '../../supabaseClient';

const QUICK_EMOJIS = ['👍', '❤', '😊', '😂', '🔥', '🙏', '💡', '🎉'];
const QUICK_EMOJI_ICONS = {
  '👍': { icon: ThumbsUp, color: 'text-blue-500' },
  '❤': { icon: Heart, color: 'text-rose-500 fill-rose-100' },
  '😊': { icon: Smile, color: 'text-amber-500' },
  '😂': { icon: Laugh, color: 'text-amber-500' },
  '🔥': { icon: Flame, color: 'text-orange-500 fill-orange-100' },
  '🙏': { icon: Hand, color: 'text-amber-600' },
  '💡': { icon: Lightbulb, color: 'text-amber-500' },
  '🎉': { icon: PartyPopper, color: 'text-fuchsia-500' },
};

const CATEGORY_ICON_META = {
  'Cooking & Baking': { icon: ChefHat, color: 'text-orange-500' },
  'Gardening & Farming': { icon: Leaf, color: 'text-green-500' },
  'Home & DIY': { icon: Hammer, color: 'text-yellow-600' },
  'Health & Fitness': { icon: Dumbbell, color: 'text-red-500' },
  'Beauty & Grooming': { icon: Scissors, color: 'text-pink-500' },
  'Gaming & Hobbies': { icon: Gamepad2, color: 'text-violet-500' },
  'Electronics & Repair': { icon: Wrench, color: 'text-blue-500' },
  'Electronics, Appliance & Basic Repair': { icon: Wrench, color: 'text-blue-500' },
  'School & Tutoring': { icon: BookOpen, color: 'text-indigo-500' },
  'Writing & Content': { icon: PenLine, color: 'text-teal-500' },
  'Languages & Speaking': { icon: MessageCircle, color: 'text-cyan-500' },
  'Singing & Instruments': { icon: Music2, color: 'text-fuchsia-500' },
  'Art & Graphic Design': { icon: Palette, color: 'text-rose-500' },
  'Video & Animation': { icon: Film, color: 'text-amber-500' },
  'Business & Freelance': { icon: Briefcase, color: 'text-slate-600' },
  'Financial Literacy': { icon: PiggyBank, color: 'text-emerald-600' },
  'Financial Literacy & Money Management': { icon: PiggyBank, color: 'text-emerald-600' },
  'UI/UX Design': { icon: Monitor, color: 'text-sky-500' },
  'Coding & Tech': { icon: Code2, color: 'text-lime-600' },
};

const CategoryIcon = ({ category, className = 'w-4 h-4' }) => {
  const meta = CATEGORY_ICON_META[category] || { icon: BookOpen, color: 'text-gray-400' };
  const Icon = meta.icon;
  return <Icon className={`${className} ${meta.color}`} />;
};

const renderTextWithLinks = (text, isMe) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => 
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
         className={`underline font-bold break-all hover:opacity-80 transition-opacity ${
           isMe ? 'text-emerald-100' : 'text-emerald-600'
         }`}>
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

const REPLY_PREFIX = '__REPLY__:';
const REPLY_SUFFIX = '::__\n';

function encodeReply(replyingTo) {
  const snippet = (replyingTo.content || '').replace(/^__REPLY__:.*::__\n/s, '').slice(0, 80);
  return `${REPLY_PREFIX}${JSON.stringify({ id: replyingTo.id, snippet, name: replyingTo.senderName })}${REPLY_SUFFIX}`;
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

export default function Messages() {
  const navigate          = useNavigate();
  const location          = useLocation();
  const messagesEndRef    = useRef(null);
  const messagesAreaRef   = useRef(null);
  const fileInputRef      = useRef(null);
  const typingTimeoutRef  = useRef(null);
  const longPressRef      = useRef(null);
  const replyInputRef     = useRef(null);

  const [currentUserId,      setCurrentUserId]      = useState(null);
  const [contacts,           setContacts]           = useState([]);
  const [selectedContact,    setSelectedContact]    = useState(null);
  const [messages,           setMessages]           = useState([]);
  const [newMessage,         setNewMessage]         = useState('');
  const [loadingContacts,    setLoadingContacts]    = useState(true);
  const [loadingMessages,    setLoadingMessages]    = useState(false);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [activeTab,          setActiveTab]          = useState('All');
  const [uploadingFile,      setUploadingFile]      = useState(false);
  const [selectedFile,       setSelectedFile]       = useState(null);
  const [filePreviewUrl,     setFilePreviewUrl]     = useState('');
  const [showEmojiPicker,    setShowEmojiPicker]    = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isContactTyping,    setIsContactTyping]    = useState(false);
  const [chatChannel,        setChatChannel]        = useState(null);
  const [showInfoPanel,      setShowInfoPanel]      = useState(true);
  const [mutedContacts,      setMutedContacts]      = useState({});
  const [replyingTo,         setReplyingTo]         = useState(null); 
  const [isProcessingDone,   setIsProcessingDone]   = useState(false);

  const focusedMessageRef = useRef(null);
  const focusMessageId = new URLSearchParams(location.search).get('message');

  useEffect(() => {
    const initUserAndContacts = async () => {
      setLoadingContacts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);
      
      const { data: sessionData } = await supabase.from('sessions')
        .select(`id, status, skill:skills(title,category), student_id, instructor_id, instructor_completed, student_completed,
          student:user_profiles!student_id(id,full_name,avatar_url),
          instructor:user_profiles!instructor_id(id,full_name,avatar_url)`)
        .or(`student_id.eq.${user.id},instructor_id.eq.${user.id}`)
        .in('status', ['pending', 'reschedule_proposed', 'upcoming', 'active', 'completed', 'disputed', 'cancelled']).order('created_at', { ascending: false });
        
      const { data: ticketData } = await supabase.from('support_tickets')
        .select('id, subject, status, created_at, rating')
        .eq('user_id', user.id).order('created_at', { ascending: false });
        
      const combinedContacts = [];
      
      if (sessionData) {
        sessionData.forEach(session => {
          const isInstructor = session.instructor_id === user.id;
          const otherUser    = isInstructor ? session.student : session.instructor;
          combinedContacts.push({
            id: session.id, type: 'session', userId: otherUser.id,
            name: otherUser.full_name, avatar: otherUser.avatar_url,
            role: isInstructor ? 'Student' : 'Teacher',
            skillCategory: session.skill?.category || 'Uncategorized',
            sessionStatus: session.status,
            sortDate: session.created_at || new Date().toISOString(),
            instructorCompleted: session.instructor_completed,
            studentCompleted: session.student_completed,
            isInstructor: isInstructor
          });
        });
      }
      
      if (ticketData) {
        ticketData.forEach(ticket => {
          combinedContacts.push({
            id: ticket.id, type: 'ticket', userId: 'support',
            name: 'Support Team', avatar: null, role: 'Support',
            skillCategory: `Ticket: ${ticket.subject}`,
            sessionStatus: ticket.status, sortDate: ticket.created_at,
            rating: ticket.rating,
          });
        });
      }
      
      combinedContacts.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
      setContacts(combinedContacts);
      
      const queryParams = new URLSearchParams(location.search);
      const targetId = 
        queryParams.get('session') || 
        queryParams.get('session_id') || 
        queryParams.get('ticket') || 
        queryParams.get('ticket_id') || 
        queryParams.get('ticketId') ||
        queryParams.get('id');

      if (targetId) {
        const found = combinedContacts.find(c => c.id === targetId);
        if (found) setSelectedContact(found);
      } else if (combinedContacts.length > 0 && !selectedContact) {
        setSelectedContact(combinedContacts[0]);
      }
      
      setLoadingContacts(false);
    };
    initUserAndContacts();
  }, [location.search]);

  // ✨ GLOBAL SESSION LISTENER: Ensures any update (like canceling in Sessions.jsx) reflects live here!
  useEffect(() => {
    if (!currentUserId) return;
    
    const sessionChannel = supabase.channel('global_sessions_rt_messages')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'sessions' }, 
        (payload) => {
          const updatedSession = payload.new;
          
          setContacts(prev => prev.map(c => {
            if (c.id === updatedSession.id) {
              return {
                ...c,
                sessionStatus: updatedSession.status,
                instructorCompleted: updatedSession.instructor_completed,
                studentCompleted: updatedSession.student_completed
              };
            }
            return c;
          }));
          
          setSelectedContact(prev => {
            if (prev && prev.id === updatedSession.id) {
              return {
                ...prev,
                sessionStatus: updatedSession.status,
                instructorCompleted: updatedSession.instructor_completed,
                studentCompleted: updatedSession.student_completed
              };
            }
            return prev;
          });
        }
      ).subscribe();

    return () => { supabase.removeChannel(sessionChannel); };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !selectedContact) return;
    setReplyingTo(null); 
    
    const fetchMessages = async () => {
      setLoadingMessages(true);
      const column = selectedContact.type === 'ticket' ? 'ticket_id' : 'session_id';
      const { data, error } = await supabase.from('messages')
        .select('*').eq(column, selectedContact.id)
        .order('created_at', { ascending: true });
      if (!error) setMessages(data || []);
      setLoadingMessages(false);
    };
    
    fetchMessages();
    
    const col         = selectedContact.type === 'ticket' ? 'ticket' : 'session';
    const channelName = `room_${col}_${selectedContact.id}`;
    const dbCol       = selectedContact.type === 'ticket' ? 'ticket_id' : 'session_id';
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `${dbCol}=eq.${selectedContact.id}` },
        (payload) => {
          const newMsg = payload.new;
          if (payload.eventType === 'INSERT')
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          else if (payload.eventType === 'UPDATE')
            setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m));
          else if (payload.eventType === 'DELETE')
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          setIsContactTyping(false);
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== currentUserId)
          setIsContactTyping(payload.payload.isTyping);
      })
      .subscribe();
      
    setChatChannel(channel);
    
    return () => { if (channel) supabase.removeChannel(channel); clearTimeout(typingTimeoutRef.current); };
  }, [currentUserId, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isContactTyping]);

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-emerald-400', 'rounded-2xl');
      setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400', 'rounded-2xl'), 1500);
    }
  };

  useEffect(() => {
    if (!focusMessageId || !selectedContact || loadingMessages) return;
    const key = `${selectedContact.id}:${focusMessageId}`;
    if (focusedMessageRef.current === key) return;
    if (!document.getElementById(`msg-${focusMessageId}`)) return;
    focusedMessageRef.current = key;
    const frame = window.requestAnimationFrame(() => scrollToMessage(focusMessageId));
    return () => window.cancelAnimationFrame(frame);
  }, [focusMessageId, selectedContact, loadingMessages, messages]);

  const startLongPress = useCallback((msg) => {
    longPressRef.current = setTimeout(() => {
      const isMe      = msg.sender_id === currentUserId;
      const senderName = isMe ? 'You' : selectedContact?.name || 'Them';
      setReplyingTo({ id: msg.id, content: msg.content, senderName });
      replyInputRef.current?.focus();
    }, 500);
  }, [currentUserId, selectedContact]);

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }, []);

  const handleContextMenu = useCallback((e, msg) => {
    e.preventDefault();
    if (msg.is_deleted) return;
    const isMe      = msg.sender_id === currentUserId;
    const senderName = isMe ? 'You' : selectedContact?.name || 'Them';
    setReplyingTo({ id: msg.id, content: msg.content, senderName });
    replyInputRef.current?.focus();
  }, [currentUserId, selectedContact]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File size exceeds 5MB limit.'); return; }
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (chatChannel) {
      chatChannel.send({ type: 'broadcast', event: 'typing', payload: { isTyping: true, userId: currentUserId } });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        chatChannel.send({ type: 'broadcast', event: 'typing', payload: { isTyping: false, userId: currentUserId } });
      }, 2000);
    }
  };

  const executeMessageSend = async (contentString) => {
    if (!selectedContact || !currentUserId) return;
    if (['completed', 'resolved', 'cancelled'].includes(selectedContact.sessionStatus)) {
      alert('This conversation is closed/resolved.'); return;
    }
    setUploadingFile(true);
    if (chatChannel) {
      chatChannel.send({ type: 'broadcast', event: 'typing', payload: { isTyping: false, userId: currentUserId } });
      clearTimeout(typingTimeoutRef.current);
    }
    const isReplyToMessage = Boolean(replyingTo && !replyingTo.quickLike);
    let finalContent = contentString;
    if (isReplyToMessage) {
      finalContent = encodeReply(replyingTo) + contentString;
    }
    setReplyingTo(null);

    let uploadedFileUrl = null;
    let fileType        = null;
    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments').getPublicUrl(filePath);
        uploadedFileUrl = publicUrl;
        fileType        = selectedFile.type;
      }
      setNewMessage('');
      setSelectedFile(null);
      setFilePreviewUrl('');
      setShowEmojiPicker(false);

      const msgPayload = {
        sender_id: currentUserId, content: finalContent,
        file_url: uploadedFileUrl, file_type: fileType, is_deleted: false,
      };
      if (selectedContact.type === 'ticket') msgPayload.ticket_id = selectedContact.id;
      else { msgPayload.session_id = selectedContact.id; msgPayload.receiver_id = selectedContact.userId; }

      const tempId = Date.now().toString();
      setMessages(prev => [...prev, { ...msgPayload, id: tempId, created_at: new Date().toISOString() }]);
      const { data, error } = await supabase.from('messages').insert([msgPayload]).select().single();
      if (error) {
        alert('Failed to send message.');
        setMessages(prev => prev.filter(m => m.id !== tempId));
      } else if (data) {
        setMessages(prev => prev.map(m => m.id === tempId ? data : m));

        if (selectedContact.type === 'session' && selectedContact.userId && selectedContact.userId !== currentUserId) {
          const { data: actor } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', currentUserId)
            .maybeSingle();
          const actorName = actor?.full_name || 'Someone';
          const preview = stripReplyPrefix(finalContent || '').trim().replace(/\s+/g, ' ');
          const excerpt = preview
            ? `: “${preview.slice(0, 90)}${preview.length > 90 ? '…' : ''}”`
            : uploadedFileUrl ? ': Sent an attachment' : '';
          const params = new URLSearchParams({ session: data.session_id, message: data.id });
          const { error: notificationError } = await supabase.from('notifications').insert({
            user_id: selectedContact.userId,
            type: 'message',
            content: `${actorName} ${isReplyToMessage ? 'replied to your message' : 'sent you a message'}${excerpt}`,
            link_url: `/messages?${params.toString()}`,
            is_read: false,
          });
          if (notificationError) console.error('Could not create message notification:', notificationError);
        }
      }
    } catch { alert('Failed to upload attachment.'); }
    finally { setUploadingFile(false); }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;
    executeMessageSend(newMessage.trim());
  };

  const handleQuickLike = () => { executeMessageSend('💚'); };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted', file_url: null } : m
    ));
    const { error: updateError } = await supabase.from('messages')
      .update({ is_deleted: true, content: 'This message was deleted', file_url: null })
      .eq('id', messageId).eq('sender_id', currentUserId);
    if (updateError) {
      await supabase.from('messages').delete().eq('id', messageId).eq('sender_id', currentUserId);
      const column = selectedContact.type === 'ticket' ? 'ticket_id' : 'session_id';
      const { data } = await supabase.from('messages').select('*')
        .eq(column, selectedContact.id).order('created_at', { ascending: true });
      setMessages(data || []);
    }
  };

  const handleRateTicket = async (stars) => {
    if (isSubmittingRating || !selectedContact || selectedContact.type !== 'ticket') return;
    setIsSubmittingRating(true);
    const { error } = await supabase.from('support_tickets')
      .update({ rating: stars }).eq('id', selectedContact.id);
    if (!error) {
      setSelectedContact(prev => ({ ...prev, rating: stars }));
      setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, rating: stars } : c));
    } else { alert('Failed to submit rating.'); }
    setIsSubmittingRating(false);
  };

  const quickUpdateStatus = async (newStatus) => {
    if (!selectedContact || selectedContact.type !== 'session') return;
    const { data: session } = await supabase.from('sessions').select(`*, instructor:user_profiles!instructor_id(id,full_name), student:user_profiles!student_id(id,full_name)`).eq('id', selectedContact.id).single();
    
    const { error } = await supabase.from('sessions').update({ status: newStatus }).eq('id', selectedContact.id);
    if (!error) {
      if (newStatus === 'upcoming' && session) {
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
    } else {
      alert('Failed to update status.');
    }
  };

  const handleQuickMarkDone = async () => {
    setIsProcessingDone(true);
    const { data: session, error } = await supabase.from('sessions')
      .select(`*, instructor:user_profiles!instructor_id(id,full_name), student:user_profiles!student_id(id,full_name)`)
      .eq('id', selectedContact.id).single();
    
    if (error || !session) { setIsProcessingDone(false); return; }

    const isInstructor = session.instructor_id === currentUserId;
    const myCompletedLocal = isInstructor ? session.instructor_completed : session.student_completed;
    const otherCompletedLocal = isInstructor ? session.student_completed : session.instructor_completed;

    if (myCompletedLocal) {
      alert("You have already marked this as done! Waiting for your partner.");
      setIsProcessingDone(false);
      return;
    }

    if (window.confirm('Mark session as done?')) {
      const payload = isInstructor ? { instructor_completed: true } : { student_completed: true };
      
      if (otherCompletedLocal) {
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
        const targetUserId = isInstructor ? session.student_id : session.instructor_id;
        const actorName = isInstructor ? session.instructor?.full_name || 'The teacher' : session.student?.full_name || 'The learner';
        await supabase.from('notifications').insert([{
          user_id: targetUserId,
          type: 'session_update',
          content: `${actorName} has marked the session as done. Please confirm to finalize the completion.`,
          link_url: `/sessions?session=${session.id}`
        }]);
      }
      
      await supabase.from('sessions').update(payload).eq('id', session.id);
      
      if (!otherCompletedLocal) {
         alert("Marked as done! Waiting for partner confirmation.");
      }
    }
    setIsProcessingDone(false);
  };

  const toggleMute = () => {
    if (!selectedContact) return;
    setMutedContacts(prev => ({ ...prev, [selectedContact.id]: !prev[selectedContact.id] }));
  };

  const handleVisitProfile = () => {
    if (!selectedContact) return;
    if (selectedContact.userId === 'support') return;
    navigate(`/profile/${selectedContact.userId}`);
  };

  // ✨ CHANGED: Removed the status restriction on Teachers and Students tabs
  const TAB_FILTERS = {
    All:       ()  => true,
    Unread:    (c) => c.sessionStatus === 'active',
    Teachers:  (c) => c.role === 'Teacher',
    Students:  (c) => c.role === 'Student',
    Support:   (c) => c.role === 'Support',
    Completed: (c) => ['completed','resolved', 'cancelled'].includes(c.sessionStatus),
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.skillCategory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (TAB_FILTERS[activeTab]?.(contact) ?? true);
  });

  const isContactInstructor = selectedContact?.isInstructor;
  const myCompleted = selectedContact ? (isContactInstructor ? selectedContact.instructorCompleted : selectedContact.studentCompleted) : false;
  const otherCompleted = selectedContact ? (isContactInstructor ? selectedContact.studentCompleted : selectedContact.instructorCompleted) : false;

  if (loadingContacts) return (
    <div role="status" aria-live="polite" aria-label="Loading messages" className="flex h-[calc(100vh-70px)] bg-white overflow-hidden text-gray-900">
      
      <div className="w-full md:w-[260px] lg:w-[280px] border-r border-gray-100 flex flex-col shrink-0 bg-white">
        <div className="px-5 pt-5 pb-3 flex items-center shrink-0">
          <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="px-4 pb-3 shrink-0">
          <div className="h-[40px] w-full bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-hidden shrink-0">
          <div className="h-[32px] w-[50px] bg-emerald-100 rounded-full animate-pulse shrink-0" />
          <div className="h-[32px] w-[70px] bg-gray-100 rounded-full animate-pulse shrink-0" />
          <div className="h-[32px] w-[80px] bg-gray-100 rounded-full animate-pulse shrink-0" />
          <div className="h-[32px] w-[75px] bg-gray-100 rounded-full animate-pulse shrink-0" />
        </div>
        <div className="flex-1 overflow-hidden px-2 py-1 space-y-1">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="px-3 py-2 flex items-center gap-3 rounded-xl mx-2 mb-0.5">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                  <div className="h-2.5 w-8 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden md:flex flex-1 min-w-0 flex-col bg-white">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
        </div>

        <div className="flex-1 overflow-hidden px-5 py-4 flex flex-col justify-end gap-5">
          <div className="flex justify-start w-full">
            <div className="flex items-end gap-1.5 w-full">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 animate-pulse mb-4" />
              <div className="flex flex-col gap-1 items-start">
                <div className="px-4 py-3 h-12 w-56 max-w-[70%] bg-gray-100 rounded-2xl rounded-bl-sm animate-pulse" />
                <div className="h-2 w-10 bg-gray-100 rounded animate-pulse ml-1" />
              </div>
            </div>
          </div>
          <div className="flex justify-end w-full">
             <div className="flex flex-col gap-1 items-end">
                <div className="px-4 py-3 h-16 w-64 max-w-[70%] bg-emerald-100/50 rounded-2xl rounded-br-sm animate-pulse" />
                <div className="h-2 w-10 bg-gray-100 rounded animate-pulse mr-1" />
             </div>
          </div>
           <div className="flex justify-start w-full">
            <div className="flex items-end gap-1.5 w-full">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 animate-pulse mb-4" />
              <div className="flex flex-col gap-1 items-start">
                <div className="px-4 py-3 h-20 w-72 max-w-[70%] bg-gray-100 rounded-2xl rounded-bl-sm animate-pulse" />
                <div className="h-2 w-10 bg-gray-100 rounded animate-pulse ml-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0 bg-white">
           <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
           <div className="hidden sm:block w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
           <div className="flex-1 h-10 bg-gray-100 rounded-full animate-pulse" />
           <div className="w-9 h-9 rounded-full bg-emerald-100/50 animate-pulse shrink-0" />
        </div>
      </div>

      <div className="hidden lg:flex w-[240px] shrink-0 border-l border-gray-100 flex-col bg-white overflow-hidden">
        <div className="flex flex-col items-center text-center px-5 pt-8 pb-5 border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
          <div className="mt-3 h-4 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="mt-1.5 h-3 w-16 bg-gray-100 rounded animate-pulse" />
          
          <div className="flex gap-3 mt-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-2 w-8 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-2 w-8 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {[1, 2].map(item => (
          <div key={item} className="border-b border-gray-100">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="px-5 pb-4 space-y-3">
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
                 <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
                 <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );

  const isClosed = ['completed','resolved','cancelled'].includes(selectedContact?.sessionStatus);
  const isMuted  = selectedContact ? mutedContacts[selectedContact.id] : false;

  const Avatar = ({ contact, size = 'md' }) => {
    const s = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-14 h-14 text-2xl' : 'w-10 h-10 text-base';
    return contact?.avatar ? (
      <div className={`${s} rounded-full overflow-hidden shrink-0 border border-gray-100`}>
        <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
      </div>
    ) : (
      <div className={`${s} rounded-full flex items-center justify-center font-bold border shrink-0 ${
        contact?.role === 'Support'
          ? 'bg-gray-900 text-white border-gray-700'
          : 'bg-emerald-100 text-emerald-800 border-emerald-100'
      }`}>
        {contact?.role === 'Support' ? <Shield className="w-5 h-5" /> : contact?.name?.charAt(0)}
      </div>
    );
  };

  const ReplyQuote = ({ reply, isMe }) => (
    <div
      onClick={() => scrollToMessage(reply.id)}
      className={`flex flex-col mb-1.5 px-3 py-2 rounded-xl cursor-pointer text-[12px] leading-snug max-w-full border-l-4 ${
        isMe
          ? 'bg-emerald-700/30 border-emerald-300 text-emerald-100'
          : 'bg-gray-200 border-emerald-500 text-gray-600'
      }`}
    >
      <span className={`font-bold mb-0.5 ${ isMe ? 'text-emerald-200' : 'text-emerald-700' }`}>
        <Reply className="inline w-3.5 h-3.5 mr-1" /> {reply.name}
      </span>
      <span className="truncate opacity-80">
        {reply.snippet || 'Image'}
      </span>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-70px)] bg-white overflow-hidden text-gray-900">

      {/* ══ LEFT PANEL ══ */}
      <div className={`w-full md:w-[260px] lg:w-[280px] border-r border-gray-100 flex flex-col shrink-0 bg-white ${
        selectedContact ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="px-5 pt-5 pb-3 flex items-center shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Chats</h1>
        </div>

        <div className="px-4 pb-3 shrink-0">
          <div className="bg-gray-100 rounded-full flex items-center gap-2 px-4 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 transition">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              id="inboxSearch" type="text" placeholder="Search Chats"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none text-[14px] text-gray-800 placeholder-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 text-xs font-bold"><X className="w-4 h-4" /></button>
            )}
          </div>
        </div>

        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
          {['All', 'Unread', 'Teachers', 'Students', 'Support', 'Completed'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === tab ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm font-medium">No conversations found.</div>
          ) : filteredContacts.map(contact => {
            const isActive = selectedContact?.id === contact.id;
            const closed   = ['completed','resolved','cancelled'].includes(contact.sessionStatus);
            return (
              <div key={contact.id} onClick={() => setSelectedContact(contact)}
                className={`px-3 py-2 flex items-center gap-3 cursor-pointer rounded-xl mx-2 mb-0.5 transition ${
                  isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}>
                <div className="relative shrink-0">
                  <Avatar contact={contact} size="md" />
                  {!closed && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`font-bold text-[14px] truncate ${closed ? 'text-gray-400' : 'text-gray-900'}`}>
                      {contact.name} {mutedContacts[contact.id] && <BellOff className="inline w-3 h-3 text-gray-400" />}
                    </h3>
                    <span className="text-[11px] text-gray-400 shrink-0">{closed ? <Lock className="w-3.5 h-3.5" /> : 'now'}</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-[12px] text-gray-400 truncate">{contact.skillCategory && <CategoryIcon category={contact.skillCategory} className="w-3.5 h-3.5 shrink-0" />}{contact.skillCategory}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ CENTER: Chat ══ */}
      <div className={`flex-1 min-w-0 flex flex-col bg-white ${ !selectedContact ? 'hidden md:flex' : 'flex' }`}>
        {selectedContact ? (
          <>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedContact(null)} aria-label="Back to conversations" className="md:hidden text-gray-500 mr-1"><ArrowLeft className="w-4 h-4" /></button>
                <div className="relative">
                  <Avatar contact={selectedContact} size="md" />
                  {!isClosed && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />}
                </div>
                <div>
                  <h2 className="font-bold text-[15px] text-gray-900 leading-tight">
                    {selectedContact.name}
                    {isMuted && <span className="text-[11px] text-gray-400 font-normal ml-1.5">(Muted)</span>}
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    {isClosed ? <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Closed</span> : <span className="text-emerald-600 font-medium">Active now</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowInfoPanel(p => !p)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                    showInfoPanel ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`} title="Toggle Info Panel">
                  <PanelRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── STICKY ACTION BANNER ── */}
            {selectedContact.type === 'session' && (
              ['pending', 'reschedule_proposed'].includes(selectedContact.sessionStatus) || 
              (selectedContact.sessionStatus === 'active' && (myCompleted || otherCompleted))
            ) && (
              <div className={`border-b px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 relative z-10 ${
                selectedContact.sessionStatus === 'active' ? 'bg-sky-50 border-sky-100 text-sky-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'
              }`}>
                <div className="flex items-center gap-2 text-[12px]">
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  <p>
                    {selectedContact.sessionStatus === 'pending' && selectedContact.role === 'Teacher' && "⏳ Waiting for Teacher's Confirmation."}
                    {selectedContact.sessionStatus === 'pending' && selectedContact.role === 'Student' && "📅 Booking Request: Confirm Schedule?"}
                    {selectedContact.sessionStatus === 'reschedule_proposed' && selectedContact.role === 'Teacher' && "📅 Teacher proposed a new time."}
                    {selectedContact.sessionStatus === 'reschedule_proposed' && selectedContact.role === 'Student' && "⏳ Waiting for Learner's Confirmation on new time."}
                    
                    {selectedContact.sessionStatus === 'active' && otherCompleted && !myCompleted && `✨ ${selectedContact.name} marked this session as done. Please confirm to finalize.`}
                    {selectedContact.sessionStatus === 'active' && myCompleted && `⏳ Waiting for ${selectedContact.name} to confirm completion.`}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {selectedContact.sessionStatus === 'pending' && selectedContact.role === 'Student' && (
                    <button onClick={() => quickUpdateStatus('upcoming')} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition cursor-pointer">
                      Confirm Schedule
                    </button>
                  )}

                  {selectedContact.sessionStatus === 'reschedule_proposed' && selectedContact.role === 'Teacher' && (
                    <button onClick={() => quickUpdateStatus('upcoming')} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition cursor-pointer">
                      Accept Schedule
                    </button>
                  )}

                  {selectedContact.sessionStatus === 'active' && otherCompleted && !myCompleted && (
                    <button onClick={handleQuickMarkDone} disabled={isProcessingDone} className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50">
                      {isProcessingDone ? 'Processing...' : 'Confirm Done'}
                    </button>
                  )}

                  <button onClick={() => navigate(`/sessions?session=${selectedContact.id}`)} className={`px-4 py-1.5 bg-white border text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    selectedContact.sessionStatus === 'active' ? 'border-sky-200 text-sky-700 hover:bg-sky-100' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                  }`}>
                    Manage Details
                  </button>
                </div>
              </div>
            )}

            <div
              ref={messagesAreaRef}
              className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col bg-white [&::-webkit-scrollbar]:hidden"
            >
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="m-auto text-center py-8">
                  <Avatar contact={selectedContact} size="lg" />
                  <p className="font-bold tracking-tight text-gray-900 text-lg mt-3">{selectedContact.name}</p>
                  <p className="flex items-center justify-center gap-1.5 text-[12px] text-gray-400 mt-1"><CategoryIcon category={selectedContact.skillCategory} className="w-3.5 h-3.5" />{selectedContact.skillCategory}</p>
                  <p className="flex items-center justify-center gap-1 text-[13px] text-gray-500 mt-3">Say hello and start the conversation <Hand className="w-3.5 h-3.5 text-amber-500" /></p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe      = msg.sender_id === currentUserId;
                  const reply     = !msg.is_deleted ? parseReply(msg.content) : null;
                  const bodyText  = reply ? stripReplyPrefix(msg.content) : msg.content;
                  const hasText   = bodyText && bodyText.trim().length > 0;
                  const isImage   = msg.file_url && (msg.file_type === 'image' || msg.file_type?.startsWith('image/'));
                  const isFile    = msg.file_url && !isImage;
                  const messageTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      className={`flex w-full mb-2 transition-all ${ isMe ? 'justify-end' : 'justify-start' }`}
                    >
                      <div
                        className={`flex w-fit items-end gap-1.5 max-w-[68%] ${ isMe ? 'flex-row-reverse' : 'flex-row' } group/msg`}
                        onTouchStart={() => !msg.is_deleted && startLongPress(msg)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        onContextMenu={(e) => !msg.is_deleted && handleContextMenu(e, msg)}
                      >
                        {!isMe && (
                          <div className="shrink-0 mb-4">
                            <Avatar contact={selectedContact} size="sm" />
                          </div>
                        )}

                        <div className={`flex w-fit max-w-full flex-col gap-1 ${ isMe ? 'items-end' : 'items-start' }`}>

                          {reply && <ReplyQuote reply={reply} isMe={isMe} />}

                          {isImage && !msg.is_deleted && (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                              <img src={msg.file_url} alt="Attached"
                                className="rounded-2xl max-w-[240px] max-h-60 object-cover" />
                            </a>
                          )}

                          {isFile && !msg.is_deleted && (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-[13px] font-bold ${
                                isMe ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'
                              }`}>
                              <FileText className="inline w-4 h-4 mr-1" /> View Attachment
                            </a>
                          )}

                          {(hasText || msg.is_deleted) && (
                            <div className={`px-4 py-2.5 text-[14px] leading-snug break-words ${
                              msg.is_deleted
                                ? 'bg-gray-100 text-gray-400 italic rounded-2xl'
                                : isMe
                                ? 'bg-emerald-600 text-white rounded-2xl rounded-br-sm'
                                : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm'
                            }`}>
                              {msg.is_deleted ? 'This message was deleted' : renderTextWithLinks(bodyText, isMe)}
                            </div>
                          )}

                          <div className={`flex w-full items-center gap-2 px-1 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && <span className="text-gray-400">{messageTime}</span>}
                            {!msg.is_deleted && (
                              <button
                                onClick={() => {
                                  const senderName = isMe ? 'You' : selectedContact?.name || 'Them';
                                  setReplyingTo({ id: msg.id, content: msg.content, senderName });
                                  replyInputRef.current?.focus();
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-500 hover:text-emerald-700 opacity-0 group-hover/msg:opacity-100 transition font-semibold cursor-pointer"
                                title="Reply"
                              >
                                <Reply className="w-3.5 h-3.5" /> Reply
                              </button>
                            )}
                            {isMe && !msg.is_deleted && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover/msg:opacity-100 transition font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                            {isMe && <span className="text-gray-400">{messageTime}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isContactTyping && (
                <div className="flex w-full mb-2 justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-end gap-1.5">
                    <div className="shrink-0 mb-4"><Avatar contact={selectedContact} size="sm" /></div>
                    <div className="px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {isClosed ? (
              <div className="px-5 py-4 border-t border-gray-100 flex flex-col items-center justify-center min-h-[80px] shrink-0">
                {selectedContact.type === 'ticket' && selectedContact.sessionStatus === 'resolved' ? (
                  selectedContact.rating ? (
                    <div className="text-center">
                      <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-gray-400 mb-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Issue Resolved — Your rating</p>
                      <div className="flex gap-1 justify-center">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-5 h-5 ${s <= selectedContact.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-bold text-gray-800 text-[13px] mb-2">How was your support experience?</p>
                      <div className="flex gap-1 justify-center">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} disabled={isSubmittingRating} onClick={() => handleRateTicket(s)}
                            aria-label={`Rate ${s} stars`} className="transition-all cursor-pointer"><Star className="w-7 h-7 text-gray-200 fill-gray-100 hover:text-amber-400 hover:fill-amber-400 hover:scale-125 transition-all" /></button>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <p className="flex items-center gap-1 text-gray-400 font-semibold text-[13px]"><Lock className="w-3.5 h-3.5" /> This conversation is closed</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendMessage}
                className="px-4 py-3 border-t border-gray-100 flex flex-col gap-2 shrink-0 relative bg-white">

                {replyingTo && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 animate-in slide-in-from-bottom-2">
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><Reply className="w-3.5 h-3.5" /> Replying to {replyingTo.senderName}</p>
                      <p className="text-[12px] text-gray-500 truncate">
                        {(replyingTo.content || '').replace(/^__REPLY__:.*::__\n/s, '').slice(0, 80) || 'Image'}
                      </p>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 shrink-0 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {selectedFile && (
                  <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl flex items-center gap-3 shadow-sm">
                    {selectedFile.type.startsWith('image/')
                      ? <div className="w-9 h-9 rounded-xl overflow-hidden"><img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" /></div>
                      : <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                    }
                    <span className="text-[11px] font-bold text-gray-800 truncate max-w-[130px]">{selectedFile.name}</span>
                    <button type="button" onClick={() => setSelectedFile(null)}
                      className="w-6 h-6 bg-gray-100 hover:bg-rose-100 text-gray-500 hover:text-rose-600 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer ml-auto"><X className="w-4 h-4" /></button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*, .pdf, .doc, .docx" />

                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 transition shrink-0 cursor-pointer" title="Attach file">
                    <ImagePlus className="w-5 h-5" />
                  </button>

                  <button type="button" onClick={() => setShowEmojiPicker(p => !p)}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 transition text-lg shrink-0 hidden sm:flex cursor-pointer" title="Emoji">
                    <Smile className="w-5 h-5" />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-20 left-4 bg-white border border-gray-200 shadow-xl rounded-2xl p-3 flex flex-wrap gap-2 z-30 w-[230px] animate-in fade-in">
                      {QUICK_EMOJIS.map(emoji => {
                        const { icon: EmojiIcon, color } = QUICK_EMOJI_ICONS[emoji];
                        return (
                          <button key={emoji} type="button" aria-label={`Insert ${emoji} emoji`}
                            onClick={() => { setNewMessage(p => p + emoji); setShowEmojiPicker(false); }}
                            className="hover:bg-gray-100 rounded-xl p-2 transition cursor-pointer">
                            <EmojiIcon className={`w-5 h-5 ${color}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2.5 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-400/30 transition">
                    <input
                      ref={replyInputRef}
                      type="text"
                      placeholder={replyingTo ? `Reply to ${replyingTo.senderName}…` : 'Aa'}
                      value={newMessage}
                      onChange={handleTyping}
                      className="w-full bg-transparent outline-none text-[14px] text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  {newMessage.trim() || selectedFile ? (
                    <button type="submit" disabled={uploadingFile}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition shrink-0 shadow-sm cursor-pointer">
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button type="button" onClick={handleQuickLike}
                      className="w-9 h-9 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 transition shrink-0 text-xl cursor-pointer"
                      title="Send Quick Like">
                      <Heart className="w-5 h-5 fill-emerald-500 text-emerald-600" />
                    </button>
                  )}
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4"><MessageSquare className="w-8 h-8 text-gray-400" /></div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-1">Your messages</h2>
            <p className="text-gray-400 text-[13px]">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {/* ══ RIGHT INFO PANEL ══ */}
      {selectedContact && showInfoPanel && (
        <div className="hidden lg:flex w-[240px] shrink-0 border-l border-gray-100 flex-col bg-white overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col items-center text-center px-5 pt-8 pb-5 border-b border-gray-100">
            <Avatar contact={selectedContact} size="lg" />
            <h3 className="font-bold text-[16px] tracking-tight text-gray-900 mt-3">{selectedContact.name}</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {isClosed ? <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Conversation closed</span> : <span className="text-emerald-600 font-medium">Active now</span>}
            </p>
            <div className="flex gap-3 mt-4">
              <div className="flex flex-col items-center gap-1">
                <button onClick={toggleMute}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isMuted ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>
                <span className="text-[10px] font-bold text-gray-500">{isMuted ? 'Unmute' : 'Mute'}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handleVisitProfile}
                  disabled={selectedContact.userId === 'support'}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={selectedContact.userId === 'support' ? 'No profile' : `Visit ${selectedContact.name}'s profile`}
                >
                  <UserRound className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-gray-500">Visit</span>
              </div>
            </div>
          </div>

          {[{
            label: 'Chat info',
            content: (
              <div className="flex flex-col gap-2 text-[12px]">
                <div className="flex items-center gap-2"><CategoryIcon category={selectedContact.skillCategory} className="w-4 h-4 shrink-0" /><p className="text-gray-600">{selectedContact.skillCategory}</p></div>
                <div className="flex items-center gap-2">{isClosed ? <Lock className="w-4 h-4 text-gray-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}<p className="text-gray-600 capitalize">{selectedContact.sessionStatus}</p></div>
                <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-gray-400" /><p className="text-gray-600">{messages.length} messages</p></div>
              </div>
            ),
          }, {
            label: 'Chat members',
            content: (
              <div className="flex items-center gap-2">
                <Avatar contact={selectedContact} size="sm" />
                <div>
                  <p className="font-bold text-[12px] text-gray-800">{selectedContact.name}</p>
                  <p className="text-[10px] text-gray-400">{selectedContact.role}</p>
                </div>
              </div>
            ),
          }].map(({ label, content }) => (
            <details key={label} className="border-b border-gray-100" open>
              <summary className="px-5 py-3.5 flex items-center justify-between cursor-pointer list-none hover:bg-gray-50 transition">
                <span className="font-bold text-[14px] text-gray-900">{label}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </summary>
              <div className="px-5 pb-4">{content}</div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}