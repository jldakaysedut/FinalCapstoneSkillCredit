import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import SkiroMascot from './SkiroMascot';

const TIPS = {
  '/dashboard': {
    title: 'Discover your next skill',
    summary: 'Start with a topic you love. Your existing interests can help narrow the choices.',
    details: 'Use the category filters or the Recommended For You section to explore approved skills.',
    actions: [{ label: 'My Interests', to: '/settings' }, { label: 'My Sessions', to: '/sessions' }],
  },
  '/create-skill': {
    title: 'Share a skill clearly',
    summary: 'A specific title and clear learning outcomes help seekers understand your listing.',
    details: 'Explain what learners will practice. Your listing will still follow the existing review process.',
    actions: [{ label: 'My Listings', to: '/my-listings' }],
  },
  '/sessions': {
    title: 'Track your session journey',
    summary: 'Expand a session card to see where the booking stands and what each status means.',
    details: 'Pending requests need a response; proposed times must be accepted; completed sessions require both confirmations.',
    actions: [{ label: 'Browse Skills', to: '/dashboard' }],
  },
  '/profile': {
    title: 'Your Skill Passport is here',
    summary: 'Your profile highlights your teaching activity, reviews, listings and portfolio.',
    details: 'These are summaries of existing records—not new certificates or achievement awards.',
    actions: [{ label: 'Create a Listing', to: '/create-skill' }],
  },
  '/community': {
    title: 'Join the conversation',
    summary: 'Ask a question or share a learning experience. Long posts expand with See more.',
    details: 'Use post-type filters to explore discussions. Community rules and moderation still apply.',
    actions: [{ label: 'Discover Skills', to: '/dashboard' }],
  },
};

/** Frontend-only, page-aware tips; no AI calls, API queries, or database writes. */
export default function SkiroPageGuide() {
  const { pathname } = useLocation();
  const config = TIPS[pathname];
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('skillcredit:skiro:guide-hidden') === 'true'; }
    catch { return false; }
  });
  useEffect(() => setExpanded(false), [pathname]);
  if (!config || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem('skillcredit:skiro:guide-hidden', 'true'); }
    catch { /* Browser storage can be unavailable. */ }
  };

  return (
    <aside aria-label="Skiro page guide" className="sc-skiro-guide mx-3 mt-3 rounded-2xl border border-emerald-100 bg-white/95 px-3 py-2.5 shadow-sm sm:mx-5 sm:px-4 lg:mx-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 rounded-xl border border-emerald-100 bg-emerald-50 p-1">
          <SkiroMascot size={33} status="idle" animated={false} decorative />
        </div>
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700"><Sparkles className="h-3 w-3" /> Skiro Guide</p>
          <p className="text-xs font-semibold text-gray-800 sm:text-sm">{config.title}</p>
          <p className="text-[11px] leading-4 text-gray-500 sm:text-xs">{config.summary}</p>
        </div>
        <button type="button" onClick={() => setExpanded(x => !x)} aria-expanded={expanded}
          className="shrink-0 rounded-lg p-2 text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label={expanded ? 'Collapse Skiro tips' : 'Expand Skiro tips'}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button type="button" onClick={dismiss} title="Hide guide for this browser session" aria-label="Hide Skiro guide for this session"
          className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <X className="h-4 w-4" />
        </button>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-emerald-100 pt-3 text-xs text-gray-600">
          <p>{config.details}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {config.actions.map(a => (
              <Link key={a.to} to={a.to} className="inline-flex min-h-9 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 transition hover:bg-emerald-100">
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
