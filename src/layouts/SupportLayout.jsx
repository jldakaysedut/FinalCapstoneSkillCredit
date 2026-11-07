import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, Headset, LayoutDashboard, LogOut, Ticket, FileText } from 'lucide-react';
import supabase from '../supabaseClient';

// ────────────────────────────────────────────────────────────────
// SUPPORT LAYOUT — top bar + tab navigation (no sidebar)
// Same structure as the moderator console: brand and account on the
// first row, workspace pages as tabs on the second. Primary color: yellow.
// ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Overview', path: '/support', Icon: LayoutDashboard },
  { label: 'Ticket queue', path: '/support/tickets', Icon: Ticket },
  { label: 'Audit logs', path: '/support/logs', Icon: FileText },
];

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2';

export default function SupportLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // UI-only: account dropdown
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      // SELECT 'id' added so we can use it for logging out
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, avatar_url')
        .eq('id', user.id)
        .single();

      if (error || !userProfile) {
        navigate('/login', { replace: true });
        return;
      }

      if (userProfile.role !== 'Support' && userProfile.role !== 'Admin') {
        alert('Access denied. You do not have permission to view this page.');
        navigate('/dashboard', { replace: true });
        return;
      }

      setProfile(userProfile);
      setLoading(false);
    };

    checkAccess();
  }, [navigate]);

  // UI-only: close the account menu on outside click / Escape / route change
  useEffect(() => {
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  useEffect(() => { setIsMenuOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const handleLogout = async () => {
    // 1. I-save muna sa logs bago mag-sign out
    if (profile?.id) {
      try {
        await supabase.from('support_logs').insert([{
          support_id: profile.id,
          action_type: 'SYSTEM_LOGOUT',
          details: 'Logged out of the Support workspace.'
        }]);
      } catch (err) {
        console.error('Failed to log logout', err);
      }
    }

    // 2. Patayin ang session at i-redirect
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => path === '/support'
    ? location.pathname === '/support' || location.pathname === '/support/'
    : location.pathname.startsWith(path);

  const activePage = location.pathname.startsWith('/support/logs') 
    ? 'Audit logs' 
    : location.pathname.startsWith('/support/tickets') 
      ? 'Ticket queue' 
      : 'Overview';

  const initials = profile?.full_name?.trim()?.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'S';
  const firstName = profile?.full_name?.trim()?.split(/\s+/)[0] || 'Agent';
  const todayLabel = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const avatar = (size, text) => (
    profile?.avatar_url
      ? <img src={profile.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
      : <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-yellow-400 ${text} font-bold text-gray-900`}>{initials}</span>
  );

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#faf9f6] font-sans text-gray-900">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm" role="status" aria-live="polite">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700"><Headset className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-semibold">Opening support workspace</p>
            <p className="mt-0.5 text-xs text-gray-500">Verifying support access…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#faf9f6] font-sans text-gray-900">
      <a href="#support-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-yellow-900 focus:shadow-lg">Skip to content</a>

      {/* ══ HEADER: brand row + tab row */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl">

        {/* Row 1 — brand, workspace label, account */}
        <div className="mx-auto flex h-16 max-w-[1440px] min-w-0 items-center justify-between gap-2 px-2 min-[360px]:px-3 sm:gap-4 sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/support" className={`flex shrink-0 items-center gap-2.5 rounded-lg ${FOCUS_RING}`}>
              <img src="/logo.png" alt="SkillCredit" className="h-8 w-8 object-contain" />
              <span className="hidden text-xl font-bold tracking-tight text-emerald-900 sm:block">SkillCredit</span>
            </Link>
            <span className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-800">
                <Headset className="h-3.5 w-3.5" /> Support
              </span>
              <span className="sr-only">{activePage}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-gray-500 lg:block">{todayLabel}</span>

            {/* Account */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(v => !v)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 transition-colors ${FOCUS_RING} ${isMenuOpen ? 'border-yellow-300 bg-yellow-50/80' : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'}`}
              >
                {avatar('h-7 w-7', 'text-xs')}
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block max-w-[120px] truncate text-[13px] font-semibold text-gray-900">{firstName}</span>
                  <span className="block text-[10px] capitalize text-gray-500">{profile?.role || 'Support'}</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMenuOpen && (
                <div role="menu" className="absolute right-0 z-50 mt-2.5 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
                    {avatar('h-10 w-10', 'text-sm')}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{profile?.full_name || 'Support agent'}</p>
                      <p className="text-xs capitalize text-gray-500">{profile?.role || 'Support'}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <Link to="/dashboard" role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                      <ArrowUpRight className="h-4 w-4 text-gray-400" /> Switch to user app
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <button onClick={handleLogout} role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">
                      <LogOut className="h-4 w-4 text-rose-500" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 — workspace tabs */}
        <nav aria-label="Support navigation" className="border-t border-gray-100">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-6 px-2 min-[360px]:px-3 sm:px-4 md:px-6 xl:grid-cols-[1fr_auto_1fr]">
            <div className="hidden xl:block" aria-hidden="true" />

            {/* auto margins centre the tabs when they fit and fall back to scrolling when they don't */}
            <div className="-mx-2 min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x xl:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-max gap-1">
            {NAV_ITEMS.map(({ label, path, Icon }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0 ${active ? 'border-yellow-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'}`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-yellow-700' : 'text-gray-400'}`} />
                  {label}
                </Link>
              );
            })}
            </div>
            </div>

            <p className="hidden items-center justify-end gap-2 text-xs text-gray-500 2xl:flex" role="status">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
              </span>
              Live queue
            </p>
          </div>
        </nav>
      </header>

      {/* ══ PAGE CONTENT */}
      <main id="support-main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] min-w-0 px-3 py-4 outline-none sm:px-4 sm:py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}