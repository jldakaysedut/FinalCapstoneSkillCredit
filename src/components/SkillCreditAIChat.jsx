import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronDown,
  Clock3, Copy, FilePenLine, Loader2, MessageCircle, PanelRight, Search, Send,
  ShieldCheck, Sparkles, Trash2, UserRound, Wallet, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { confirmDialog } from './confirmDialog';
import AIMessageMarkdown from './AIMessageMarkdown';

// UI categories only; the backend remains responsible for choosing and enforcing
// verified SkillCredit read-only tools. Removing a menu option does not change Groq.
const CATEGORIES = [
  { id: 'chat', label: 'Ask SkillCredit', icon: Sparkles,
    placeholder: 'Ask about SkillCredit features or how something works…' },
  { id: 'recommend', label: 'Explore skills', icon: Search,
    placeholder: 'What would you like to learn?' },
  { id: 'sessions', label: 'My sessions', icon: CalendarDays,
    placeholder: 'Ask about your sessions or bookings…' },
  { id: 'wallet', label: 'My wallet', icon: Wallet,
    placeholder: 'Ask about your SkillCredits or top-up history…' },
  { id: 'listings', label: 'My listings', icon: BookOpen,
    placeholder: 'Ask about your posted skills…' },
  { id: 'describe', label: 'Skill Creator', icon: FilePenLine,
    placeholder: 'Tell me what you want to teach. I can draft your title, description and learning outcomes…' },
];
const MAX_CHARS = 2000;
const CARD_PREFIX = '__SKILLCREDIT_AI_RESULTS_V1__:';
const SAFE_PAGES = new Set(['/payments', '/sessions', '/notifications', '/my-listings', '/create-skill', '/community', '/messages', '/dashboard']);
const idOf = () => crypto.randomUUID();
const timeOf = (date) => new Date(date).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const titleOf = (items) => items.find((m) => m.role === 'user')?.content?.slice(0, 55) || 'New conversation';
const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Form drafts are from AI output but still untrusted: do not allow arbitrary routes,
// unexpected field names or large data into React Router state.
function safeSkillDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const fields = ['title', 'description', 'outcomes', 'category', 'format', 'duration'];
  const limits = [120, 2300, 1200, 95, 30, 15];
  const draft = Object.fromEntries(fields.map((key, i) => [key, typeof value[key] === 'string' ? value[key].slice(0, limits[i]).trim() : '']));
  return draft.title && draft.description && draft.outcomes ? draft : null;
}
const timeUntil = (s) => {
  if (!s) return null;
  const date = new Date(s);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;
};

// Reuses ai_chat_messages.content TEXT; previous conversations and their clickable cards survive.
// Only allow IDs/routes from verified result types. Never navigate to a raw model-generated URL.
function unpackMessage(content) {
  if (typeof content !== 'string' || !content.startsWith(CARD_PREFIX)) return { text: content || '', cards: [], links: [], draft: null };
  try {
    const parsed = JSON.parse(content.slice(CARD_PREFIX.length));
    if (typeof parsed?.text !== 'string' || !Array.isArray(parsed?.cards)) throw Error('Invalid AI card data');
    return {
      text: parsed.text,
      draft: safeSkillDraft(parsed.draft),
      cards: parsed.cards.filter((c) => c && (c.type === 'user' || c.type === 'skill') && isUuid(c.id) && typeof c.title === 'string').slice(0, 12),
      links: (Array.isArray(parsed.links) ? parsed.links : []).filter((link) => link && SAFE_PAGES.has(link.path) && typeof link.label === 'string').slice(0, 3),
    };
  } catch { return { text: 'Saved AI content is not readable.', cards: [], links: [], draft: null }; }
}
function packMessage(text, cards, links, draft) {
  const safeDraft = safeSkillDraft(draft);
  if ((!Array.isArray(cards) || !cards.length) && (!Array.isArray(links) || !links.length) && !safeDraft) return text;
  const safeCards = (cards || []).filter((c) => c && ['user', 'skill'].includes(c.type) && isUuid(c.id)).slice(0, 12)
    .map((c) => ({ type: c.type, id: c.id, title: String(c.title || '').slice(0, 120),
      subtitle: String(c.subtitle || '').slice(0, 125), avatar_url: String(c.avatar_url || '').slice(0, 260),
      instructor_name: String(c.instructor_name || '').slice(0, 90), credit_cost: c.credit_cost }));
  const safeLinks = (links || []).filter((link) => SAFE_PAGES.has(link?.path)).slice(0, 3)
    .map((link) => ({ path: link.path, label: String(link.label || 'Open page').slice(0, 55) }));
  // ai_chat_messages.content has a 12000-character maximum in the AI SQL patch.
  const payload = { text: text.slice(0, 4200), cards: safeCards, links: safeLinks, draft: safeDraft };
  let packed = CARD_PREFIX + JSON.stringify(payload);
  // Conservatively stay under the DB content limit even for verbose search cards.
  while (packed.length > 11000 && payload.cards.length) {
    payload.cards.pop();
    packed = CARD_PREFIX + JSON.stringify(payload);
  }
  if (packed.length > 11000) packed = CARD_PREFIX + JSON.stringify({ ...payload, text: text.slice(0, 2500) });
  // Fall back to readable text if a very long draft still exceeds the DB check constraint.
  if (packed.length > 11000) return text.slice(0, 10000);
  return packed;
}

function ResultCard({ card, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(card)}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      {card.type === 'user' ? (card.avatar_url && /^https:\/\//.test(card.avatar_url) ?
        <img src={card.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover bg-slate-100" referrerPolicy="no-referrer" /> :
        <span className="h-11 w-11 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><UserRound className="w-5 h-5" /></span>) :
        <span className="h-11 w-11 shrink-0 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><BookOpen className="w-5 h-5" /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-slate-900">{card.title}</span>
        {card.subtitle && <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 line-clamp-2">{card.subtitle}</span>}
        {card.type === 'skill' && <span className="mt-1 block text-[11px] font-medium text-slate-600">
          {card.instructor_name ? `${card.instructor_name} · ` : ''}{Number.isFinite(Number(card.credit_cost)) ? `${card.credit_cost} CR` : 'View listing'}
        </span>}
        <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">{card.type === 'user' ? 'View profile' : 'View skill'}<ArrowUpRight className="w-3.5 h-3.5" /></span>
      </span>
    </button>
  );
}

export default function SkillCreditAIChat({ userId, onBack }) {
  const navigate = useNavigate();
  const [allMessages, setAllMessages] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('chat');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const [lastSentAt, setLastSentAt] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true); // Visual layout toggle only.
  const [showCategories, setShowCategories] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const bottom = useRef(null);
  const inputRef = useRef(null);
  const sendingRef = useRef(false);
  const quotaResetMs = usage?.reset_at ? Date.parse(usage.reset_at) : NaN;
  const retryMs = usage?.retry_at ? Date.parse(usage.retry_at) : NaN;
  const isWindowOver = Number.isFinite(quotaResetMs) && clock >= quotaResetMs;
  // Rolling window: expiry returns slots gradually, not the whole 20-message allowance.
  const effectiveRemaining = usage?.remaining;
  const isQuotaBlocked = Boolean(usage && !isWindowOver && effectiveRemaining === 0) ||
    Boolean(usage?.reason && usage.reason !== 'ok' && Number.isFinite(retryMs) && clock < retryMs);
  const shortPause = lastSentAt && clock - lastSentAt < 5000;
  const maySend = !sending && !loading && !isQuotaBlocked && !shortPause;

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const refreshUsage = async () => {
    if (!userId) return;
    try {
      const { data, error: e } = await supabase.functions.invoke('skillcredit-ai-chat', { body: { action: 'usage_status' } });
      if (!e && data?.usage) setUsage((previous) => {
        const priorRetry = previous?.reason === 'provider_cooldown' ? Date.parse(previous.retry_at || '') : NaN;
        return Number.isFinite(priorRetry) && priorRetry > Date.now()
          ? { ...data.usage, reason: 'provider_cooldown', retry_at: previous.retry_at, allowed: false }
          : data.usage;
      });
    } catch { /* The server still enforces limits if the status check fails. */ }
  };
  useEffect(() => { void refreshUsage(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const until = usage?.reset_at ? Date.parse(usage.reset_at) - Date.now() : NaN;
    if (!Number.isFinite(until) || until < 0) return;
    // Refresh the real rolling count when the oldest stored message expires.
    const timer = setTimeout(() => { void refreshUsage(); }, until + 250);
    return () => clearTimeout(timer);
  }, [usage?.reset_at, userId]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    let alive = true;
    if (!userId) { setLoading(false); return; }
    (async () => {
      try {
        const rows = [];
        const PAGE = 500;
        for (let offset = 0; ; offset += PAGE) {
          const { data, error: e } = await supabase.from('ai_chat_messages')
            .select('id, chat_id, role, content, created_at')
            .eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true })
            .range(offset, offset + PAGE - 1);
          if (e) throw e;
          rows.push(...(data || []));
          if (!data || data.length < PAGE) break;
        }
        if (alive) { setAllMessages(rows); setActiveChatId(rows.at(-1)?.chat_id || null); }
      } catch (e) { if (alive) setError(e.message || 'AI chat history unavailable.'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId]);

  const conversations = useMemo(() => {
    const groups = new Map();
    for (const message of allMessages) {
      if (!groups.has(message.chat_id)) groups.set(message.chat_id, []);
      groups.get(message.chat_id).push(message);
    }
    return [...groups].map(([id, list]) => ({ id, title: titleOf(list), latest: list.at(-1)?.created_at }))
      .sort((a, b) => new Date(b.latest) - new Date(a.latest));
  }, [allMessages]);
  const visibleMessages = useMemo(() => allMessages.filter((m) => m.chat_id === activeChatId), [allMessages, activeChatId]);
  const category = CATEGORIES.find((c) => c.id === mode) || CATEGORIES[0];
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [visibleMessages.length, sending]);

  const pickCategory = (id) => {
    if (sendingRef.current) return;
    const next = CATEGORIES.find((c) => c.id === id);
    if (!next) return;
    setMode(next.id);
    setShowCategories(false);
    inputRef.current?.focus();
  };
  const newChat = () => { if (sendingRef.current) return; setActiveChatId(null); setDraft(''); setError(''); setShowHistory(false); setShowCategories(false); };
  const deleteChat = async (chatId) => {
    if (sendingRef.current || !await confirmDialog('Delete this AI conversation permanently?')) return;
    const { error: e } = await supabase.from('ai_chat_messages').delete().eq('user_id', userId).eq('chat_id', chatId);
    if (e) { setError(e.message); return; }
    const remaining = allMessages.filter((m) => m.chat_id !== chatId);
    setAllMessages(remaining);
    if (activeChatId === chatId) setActiveChatId(remaining.at(-1)?.chat_id || null);
  };
  const clearAll = async () => {
    if (sendingRef.current || !allMessages.length || !await confirmDialog('Permanently delete ALL saved SkillCredit AI conversations?')) return;
    const { error: e } = await supabase.from('ai_chat_messages').delete().eq('user_id', userId);
    if (e) { setError(e.message); return; }
    setAllMessages([]); setActiveChatId(null); setShowHistory(false); setError('');
  };
  const copyAnswer = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
    } catch { /* Copy requires a secure browser context. */ }
  };

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!userId || !text || sendingRef.current || isQuotaBlocked || shortPause || text.length > MAX_CHARS) return;
    sendingRef.current = true;
    setSending(true); setError(''); setShowCategories(false); setLastSentAt(Date.now());
    const chatId = activeChatId || idOf();
    if (!activeChatId) setActiveChatId(chatId);
    setDraft('');
    const history = allMessages.filter((m) => m.chat_id === chatId).slice(-10)
      .map((m) => ({ role: m.role, content: (m.role === 'assistant' ? unpackMessage(m.content).text : m.content).slice(0, MAX_CHARS) }));
    try {
      const { data: saved, error: saveError } = await supabase.from('ai_chat_messages')
        .insert({ user_id: userId, chat_id: chatId, role: 'user', content: text })
        .select('id, chat_id, role, content, created_at').single();
      if (saveError) throw saveError;
      setAllMessages((prev) => [...prev, saved]);
      const { data, error: invokeError } = await supabase.functions.invoke('skillcredit-ai-chat', { body: { mode, message: text, history, message_id: saved.id } });
      if (invokeError) {
        let reason = 'SkillCredit AI is temporarily unavailable. Please try again later.';
        let issueCode = '';
        try {
          const details = await invokeError.context?.json();
          reason = details?.error || reason;
          issueCode = details?.code || '';
          if (details?.usage) setUsage(details.usage);
          if (details?.retry_at) setUsage((previous) => ({ ...previous, allowed: false,
            reason: issueCode || 'provider_cooldown', retry_at: details.retry_at }));
        } catch { /* browser/network error; keep friendly message */ }
        // A request declined by the limiter is not a real chat turn; remove the just-saved user prompt.
        if (['user_limit', 'shared_limit', 'slow_down', 'provider_cooldown'].includes(issueCode)) {
          const { error: cleanupError } = await supabase.from('ai_chat_messages').delete().eq('id', saved.id).eq('user_id', userId);
          if (!cleanupError) setAllMessages((prev) => prev.filter((item) => item.id !== saved.id));
        }
        throw new Error(reason);
      }
      if (data?.usage) setUsage(data.usage);
      if (typeof data?.answer !== 'string' || !data.answer.trim()) throw new Error('AI did not return an answer.');
      const { data: assistantMessage, error: assistantSaveError } = await supabase.from('ai_chat_messages')
        .insert({ user_id: userId, chat_id: chatId, role: 'assistant', content: packMessage(data.answer.trim(), data.results, data.links, data.draft) })
        .select('id, chat_id, role, content, created_at').single();
      if (assistantSaveError) throw assistantSaveError;
      setAllMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message || 'SkillCredit AI could not complete the request. Please try again.');
    } finally { sendingRef.current = false; setSending(false); void refreshUsage(); }
  };

  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-white text-gray-900">
      {/* CENTER — matches the existing person/support chat pane in Messages.jsx. */}
      <section className="flex min-w-0 min-h-0 flex-1 flex-col bg-white">
        {/* Same header/avatar proportions as the user/support conversation header. */}
        <header className="relative z-20 flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-gray-100 bg-white px-3 py-2.5 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={onBack} className="mr-1 inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-1 text-[12px] font-semibold text-gray-700 hover:bg-gray-100 md:hidden" aria-label="Back to conversations">
              <ArrowLeft className="h-4 w-4" /><span>Back</span>
            </button>
            <div className="relative shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-100 text-emerald-800">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-bold leading-tight text-gray-900">Skiro AI</h2>
              <p className="truncate text-[11px] font-medium text-emerald-600">Your Skiro AI assistant</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => { setShowHistory((v) => !v); setShowCategories(false); }} title="AI chat history" aria-label="AI chat history"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition lg:hidden ${showHistory ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Clock3 className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setShowInfoPanel((v) => !v)} title="Toggle AI profile and chat history" aria-label="Toggle AI info panel" aria-expanded={showInfoPanel}
              className={`hidden h-9 w-9 items-center justify-center rounded-full transition lg:flex ${showInfoPanel ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <PanelRight className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* On small screens the saved conversations remain reachable from the header. */}
        {showHistory && <div className="max-h-60 shrink-0 overflow-y-auto border-b border-gray-100 bg-white p-3 lg:hidden">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-800">Chat history</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={newChat} disabled={sending} className="text-[11px] font-semibold text-emerald-700 disabled:opacity-40">New chat</button>
              <button type="button" onClick={clearAll} disabled={!allMessages.length || sending} className="text-[11px] font-semibold text-rose-600 disabled:opacity-40">Clear all</button>
            </div>
          </div>
           {usage && <p className="mb-2 rounded-lg bg-gray-50 px-2 py-2 text-[11px] text-gray-600" aria-label="Skiro AI mobile message allowance">
             <Clock3 className="mr-1 inline h-3.5 w-3.5 text-gray-400" />AI usage: {isWindowOver ? 'Updating…' : `${Math.max(0, Number(effectiveRemaining) || 0)} of ${usage.limit || 20} left`} · Rolling 1-hour window
           </p>}
          {!conversations.length && <p className="px-2 py-3 text-xs text-gray-400">No saved conversations yet.</p>}
          {conversations.map((c) => <div key={c.id} className={`mb-1 flex items-center gap-2 rounded-xl px-2 py-2 ${activeChatId === c.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
            <button type="button" onClick={() => { setActiveChatId(c.id); setError(''); setShowHistory(false); }} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-bold text-gray-800">{c.title}</span>
              <span className="text-[11px] text-gray-400">{timeOf(c.latest)}</span>
            </button>
            <button type="button" onClick={() => deleteChat(c.id)} disabled={sending} title="Delete conversation" aria-label="Delete conversation" className="rounded-full p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>)}
        </div>}

        {/* Native-style conversation scroll area; chat and AI logic remain unchanged. */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-5 sm:py-4 [&::-webkit-scrollbar]:hidden" aria-live="polite">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading your AI conversations…</div>
          ) : visibleMessages.length === 0 ? (
            <div className="m-auto flex w-full max-w-[520px] flex-col items-center px-2 py-8 text-center sm:py-14">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-100 text-emerald-700"><Sparkles className="h-7 w-7" /></span>
              <h3 className="mt-3 text-[18px] font-bold tracking-tight text-gray-900">Skiro AI</h3>
              <p className="mt-1 text-[13px] leading-5 text-gray-500">Ask about your credits, sessions, skill listings, or create a new teaching skill. I'll help with verified SkillCredit information.</p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[920px] flex-col">
              {visibleMessages.map((m, i) => {
                const isUser = m.role === 'user';
                const display = isUser ? { text: m.content, cards: [], links: [] } : unpackMessage(m.content);
                const currentDate = new Date(m.created_at);
                const prevDate = i > 0 ? new Date(visibleMessages[i - 1].created_at) : null;
                const dividerLabel = !prevDate || currentDate.toDateString() !== prevDate.toDateString()
                  ? currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : (currentDate - prevDate > 60 * 60 * 1000 ? currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
                return <div key={m.id}>
                  {dividerLabel && <div className="my-4 flex items-center gap-3 select-none">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[12px] font-bold text-gray-400">{dividerLabel}</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>}
                  <div className={`mb-2 flex w-full items-end gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && <span className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-100 text-emerald-700"><Sparkles className="h-4 w-4" /></span>}
                    <div className={`flex min-w-0 flex-col gap-1 ${isUser ? 'max-w-[88%] items-end sm:max-w-[68%]' : 'max-w-[calc(100%-40px)] items-start sm:max-w-[85%]'}`}>
                      <div className={`min-w-0 max-w-full break-words px-4 py-2.5 text-[14px] leading-snug ${isUser
                        ? 'rounded-2xl rounded-br-sm bg-emerald-600 text-white'
                        : 'rounded-2xl rounded-bl-sm bg-gray-100 text-gray-900'}`}>
                        {isUser ? <p className="whitespace-pre-wrap break-words">{display.text}</p> : <AIMessageMarkdown text={display.text} />}
                        {display.draft && <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-gray-800">
                          <div className="mb-1 flex items-center gap-2 text-[12px] font-bold text-emerald-800"><FilePenLine className="h-4 w-4" />Editable skill draft</div>
                          <p className="mb-2 text-[11px] text-gray-500">Review the details in Create Skill. The form is not submitted automatically.</p>
                          <button type="button" onClick={() => navigate('/create-skill', { state: { aiSkillDraft: display.draft } })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                            Apply to Create Skill <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </div>}
                        {display.cards.length > 0 && <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 border-t border-gray-200 pt-3 sm:grid-cols-2">
                          {display.cards.map((card) => <ResultCard key={`${card.type}:${card.id}`} card={card} onOpen={(r) => navigate(r.type === 'user' ? `/user/${r.id}` : `/skill/${r.id}`)} />)}
                        </div>}
                        {display.links.length > 0 && <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3">
                          {display.links.map((link) => <button key={link.path} type="button" onClick={() => navigate(link.path)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[12px] font-semibold text-emerald-800 transition hover:bg-emerald-50">{link.label}<ArrowUpRight className="h-3.5 w-3.5" /></button>)}
                        </div>}
                      </div>
                      <div className={`flex w-full items-center gap-2 px-1 text-[10px] text-gray-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <span>{currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!isUser && <button type="button" title="Copy AI response" aria-label="Copy AI response" onClick={() => copyAnswer(display.text, m.id)} className="flex items-center gap-1 rounded-md px-1 text-[10px] text-gray-400 transition hover:text-emerald-700">
                          {copiedId === m.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedId === m.id ? 'Copied' : 'Copy'}
                        </button>}
                      </div>
                    </div>
                  </div>
                </div>;
              })}
            </div>
          )}
          {sending && <div className="mx-auto mt-4 flex max-w-[920px] items-center gap-2 pl-1 text-[12px] text-gray-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-100 bg-emerald-100 text-emerald-700"><Sparkles className="h-4 w-4" /></span>
            <span>{mode === 'describe' ? 'Preparing your editable skill draft' : mode === 'wallet' ? 'Checking your account records' : mode === 'recommend' ? 'Finding available skills' : 'Skiro AI is thinking'}</span>
            <span className="flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:120ms]"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:240ms]"/></span>
          </div>}
          <div ref={bottom} />
        </div>

        {error && <div role="alert" className="flex shrink-0 items-start gap-2 border-t border-rose-100 bg-rose-50 px-4 py-2 text-[12px] text-rose-700">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button>
        </div>}

        {/* Same compact input area and green Send button as native Messages. */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-2.5 py-2.5 sm:px-4 sm:py-3">
          {isQuotaBlocked && <div className="mb-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-900" role="status">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(usage?.reason === 'user_limit' || effectiveRemaining === 0) ? 'You have reached your AI message allowance.' : 'Skiro AI is taking a short break.'}
              {usage?.reason !== 'provider_cooldown' && timeUntil(usage?.retry_at || usage?.reset_at) && <span className="ml-1">Available again around {timeUntil(usage?.retry_at || usage?.reset_at)}.</span>}
              <span className="ml-1">Your previous chats are safe.</span>
            </span>
          </div>}
           {/* Centered selector sits above the message input. */}
           <div className="mb-2 flex items-center justify-center">
             <button type="button" onClick={() => setShowCategories((v) => !v)} aria-expanded={showCategories}
               title="Change AI category"
               className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
               <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
               {category.label}<ChevronDown className={`h-3 w-3 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
             </button>
           </div>
          {showCategories && <div className="mb-3 max-h-[240px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[12px] font-bold text-gray-800">Choose an AI category</span>
              <button type="button" aria-label="Close categories" onClick={() => setShowCategories(false)} className="rounded-full p-1 hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
            </div>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5 sm:grid-cols-3">
              {CATEGORIES.map((opt) => { const Icon = opt.icon; return <button type="button" key={opt.id} onClick={() => pickCategory(opt.id)} className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${mode === opt.id ? 'border-emerald-200 bg-emerald-100' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                <Icon className="h-4 w-4 shrink-0 text-emerald-700" />
                <span className="truncate text-[11px] font-semibold text-gray-800">{opt.label}</span>
              </button>; })}
            </div>
          </div>}
          <form onSubmit={send} className="flex min-w-0 items-end gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-gray-100 px-3 sm:px-4 py-2.5 transition focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-emerald-400/30">
              <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} maxLength={MAX_CHARS} placeholder={category.placeholder}
                className="min-h-[22px] max-h-28 w-full resize-none bg-transparent text-[16px] sm:text-[14px] leading-[22px] text-gray-900 outline-none placeholder:text-gray-400"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (maySend && draft.trim()) e.currentTarget.form?.requestSubmit(); } }} />
            </div>
            <button type="submit" disabled={!maySend || !draft.trim()} title="Send to Skiro AI" aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      </section>

      {/* RIGHT — same 240px information panel placement as other Messages chats. */}
      {showInfoPanel && <aside className="hidden h-full max-h-full min-h-0 w-[240px] shrink-0 overflow-x-hidden overflow-y-auto overscroll-y-contain border-l border-gray-100 bg-white lg:block [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f8fafc] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300" aria-label="Skiro AI profile and chat history" tabIndex={0}>
        <div className="flex flex-col items-center border-b border-gray-100 px-5 pb-5 pt-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-100 text-emerald-800"><Sparkles className="h-6 w-6" /></span>
          <h3 className="mt-3 text-[16px] font-bold tracking-tight text-gray-900">Skiro AI</h3>
          <p className="mt-0.5 text-[12px] font-medium text-emerald-600">Your AI assistant</p>
          <p className="mt-2 text-[11px] leading-4 text-gray-400">Explore skills, review your learning, and get help with your account.</p>
          <button type="button" onClick={newChat} disabled={sending}
            className="mt-4 flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[11px] font-semibold text-gray-700 transition hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-40">
            New chat
          </button>
        </div>
        <details open className="border-b border-gray-100">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400">
            <span className="text-[14px] font-bold text-gray-900">Chat info</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </summary>
          <div className="space-y-2 px-5 pb-4 text-[12px] text-gray-600">
            <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />SkillCredit assistant</p>
            <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4 shrink-0 text-gray-400" />{visibleMessages.length} messages here</p>
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />Your account data stays private. Skill drafts require your review.</p>
             {usage && <p className="flex items-start gap-2" aria-label="Skiro AI message allowance">
               <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
               <span><span className="font-medium text-gray-700">AI usage:</span> {isWindowOver ? 'Updating…' : `${Math.max(0, Number(effectiveRemaining) || 0)} of ${usage.limit || 20} left`}<span className="block text-[11px] text-gray-400">Rolling 1-hour window</span></span>
             </p>}

          </div>
        </details>
        <div>
          <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-4">
            <h4 className="text-[14px] font-bold text-gray-900">Chat history</h4>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{conversations.length}</span>
          </div>
          <div className="px-3 pb-1">
            {!conversations.length && <p className="px-2 py-4 text-[12px] text-gray-400">No previous conversations yet.</p>}
            {conversations.map((c) => <div key={c.id} className={`group mb-1 flex min-w-0 items-center gap-1 rounded-xl transition ${activeChatId === c.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
              <button type="button" onClick={() => { setActiveChatId(c.id); setError(''); setShowHistory(false); }} title={c.title}
                className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2.5 text-left">
                <MessageCircle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${activeChatId === c.id ? 'text-emerald-700' : 'text-gray-400'}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[12px] font-semibold ${activeChatId === c.id ? 'text-emerald-800' : 'text-gray-700'}`}>{c.title}</span>
                  <span className="block text-[10px] text-gray-400">{timeOf(c.latest)}</span>
                </span>
              </button>
              <button type="button" onClick={() => deleteChat(c.id)} disabled={sending} title="Delete conversation" aria-label={`Delete conversation ${c.title}`}
                className="mr-1 shrink-0 rounded-full p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>)}
          </div>
        </div>
        <div className="shrink-0 border-t border-gray-100 px-5 py-3">
          <button type="button" onClick={clearAll} disabled={!allMessages.length || sending}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-gray-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />Clear chat history
          </button>
        </div>
      </aside>}
    </div>
  );
}
