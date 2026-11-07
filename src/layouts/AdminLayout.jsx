import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowLeftRight,
  ChevronDown,
  ClipboardList,
  Globe,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  Users,
} from 'lucide-react';
import supabase from '../supabaseClient';

// ────────────────────────────────────────────────────────────────
// ADMIN LAYOUT — top bar + tab navigation (no sidebar)
// Same language as the Moderator console: brand and account on the
// first row, work areas as tabs on the second.
// ────────────────────────────────────────────────────────────────

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

const NAV_LINKS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/admin/users', icon: Users, label: 'User Control' },
  { to: '/admin/escalations', icon: AlertOctagon, label: 'Escalations' },
  { to: '/admin/platform', icon: Globe, label: 'Platform Data' },
  { to: '/admin/logs', icon: ClipboardList, label: 'Audit Logs' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [adminId, setAdminId] = useState(null);

  // UI-only: account dropdown (replaces the old mobile drawer)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setIsAuthorized(false);
          return;
        }
        const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (!isMounted) return;
        if (data && (data.role === 'Admin' || data.role === 'Moderator')) {
          setIsAuthorized(true);
          setAdminId(user.id);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Unable to verify admin access:', error);
        if (isMounted) setIsAuthorized(false);
      }
    };
    checkRole();
    return () => { isMounted = false; };
  }, []);

  // Close the account menu on outside click / Escape / route change
  useEffect(() => {
    const onDown = event => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false); };
    const onKey = event => { if (event.key === 'Escape') setIsMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  useEffect(() => { setIsMenuOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const logSystemAction = async (actionType, details) => {
    if (!adminId) return;
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action_type: actionType,
      details,
    });
  };

  const handleLogout = async () => {
    await logSystemAction('SYSTEM_LOGOUT', 'Admin securely terminated the session.');
    await supabase.auth.signOut();
    navigate('/login');
  };

  const switchToUser = async () => {
    await logSystemAction('SWITCH_ROLE', 'Admin switched to User Dashboard view.');
    navigate('/dashboard');
  };

  const isTabActive = link => (link.exact ? location.pathname === link.to : location.pathname.startsWith(link.to));
  const activeLink = NAV_LINKS.find(isTabActive);
  const routeName = activeLink?.label || 'Admin Console';
  const todayLabel = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  useEffect(() => { document.title = `${routeName} · Admin`; }, [routeName]);

  if (isAuthorized === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#faf9f6] px-4 font-sans text-gray-900">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm" role="status" aria-live="polite">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </span>
          <div>
            <p className="text-sm font-semibold">Securing connection</p>
            <p className="mt-0.5 text-xs text-gray-500">Verifying admin access…</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen min-w-0 bg-[#faf9f6] font-sans text-gray-900">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-800 focus:shadow-lg">Skip to content</a>

      {/* ══ HEADER: brand row + tab row */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl">

        {/* Row 1 — brand, workspace, account */}
        <div className="mx-auto flex h-16 max-w-[1440px] min-w-0 items-center justify-between gap-2 px-2 min-[360px]:px-3 sm:gap-4 sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/admin" className={`flex shrink-0 items-center gap-2.5 rounded-lg ${FOCUS_RING}`}>
              <img src="/logo.png" alt="SkillCredit" className="h-8 w-8 object-contain" />
              <span className="hidden text-xl font-bold tracking-tight text-emerald-900 sm:block">SkillCredit</span>
            </Link>
            <span className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                <ShieldAlert className="h-3.5 w-3.5" /> Admin console
              </span>
              {!activeLink && <span className="truncate text-sm font-semibold text-gray-900" aria-current="page">{routeName}</span>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-gray-500 lg:block">{todayLabel}</span>

            {/* Account */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(open => !open)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 transition-colors ${FOCUS_RING} ${isMenuOpen ? 'border-emerald-200 bg-emerald-50/80' : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-[13px] font-semibold text-gray-900">Admin</span>
                  <span className="block text-[10px] text-gray-500">Superuser access</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMenuOpen && (
                <div role="menu" className="absolute right-0 z-50 mt-2.5 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <ShieldAlert className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">Admin Console</p>
                      <p className="text-xs text-gray-500">Superuser access</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setIsMenuOpen(false); switchToUser(); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      <ArrowLeftRight className="h-4 w-4 text-gray-400" /> Switch to user mode
                    </button>
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" /> Terminate session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 — section tabs */}
        <nav aria-label="Admin navigation" className="border-t border-gray-100">
          <div className="mx-auto max-w-[1440px] px-2 min-[360px]:px-3 sm:px-4 md:px-6">
            {/* auto margins centre the tabs when they fit and fall back to scrolling when they don't */}
            <div className="-mx-2 min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x md:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto flex w-max gap-1">
                {NAV_LINKS.map(({ to, icon: Icon, label, exact }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0 ${isActive ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'}`}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`} aria-hidden="true" />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* ══ PAGE CONTENT */}
      <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] min-w-0 px-3 py-4 outline-none sm:px-4 sm:py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}