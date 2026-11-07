import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, Flag, LayoutDashboard, LogOut, Scale, ShieldCheck, FileText, AlertOctagon, ClipboardList } from 'lucide-react';
import supabase from '../supabaseClient';

// ────────────────────────────────────────────────────────────────
// MODERATOR LAYOUT — top bar + tab navigation (no sidebar)
// Same language as the user app navbar, but built as a staff console:
// brand and account on the first row, work queues as tabs on the second.
// ────────────────────────────────────────────────────────────────

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';

export default function ModLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [pendingDisputes, setPendingDisputes] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [loading, setLoading] = useState(true);

  // UI-only: account dropdown
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const fetchModeratorSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, full_name, role, avatar_url')
          .eq('id', user.id)
          .single();
        setProfile(userProfile);

        const { count: disputesCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('reference_type', 'session')
          .eq('status', 'pending');

        const { count: reportsCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .neq('reference_type', 'session')
          .eq('status', 'pending');

        const { count: approvalsCount } = await supabase
          .from('skills')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setPendingDisputes(disputesCount || 0);
        setPendingReports(reportsCount || 0);
        setPendingApprovals(approvalsCount || 0);
      } catch (err) {
        console.error('Moderator layout auth error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModeratorSession();
  }, [location.pathname, navigate]);

  // Close the account menu on outside click / Escape / route change
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

  const handleSignOut = async () => {
    if (profile?.id) {
      try {
        await supabase.from('mod_logs').insert([{
          moderator_id: profile.id,
          action_type: 'SYSTEM_LOGOUT',
          details: 'Logged out of the Moderator workspace.'
        }]);
      } catch (err) {
        console.error('Failed to log logout', err);
      }
    }
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navLinks = [
    { to: '/moderator', label: 'Overview', exact: true, badge: null, Icon: LayoutDashboard },
    { to: '/moderator/approvals', label: 'Skill approvals', exact: false, badge: pendingApprovals, Icon: ClipboardList },
    { to: '/moderator/disputes', label: 'Disputes & escrow', exact: false, badge: pendingDisputes, Icon: Scale },
    { to: '/moderator/reports', label: 'User reports', exact: false, badge: pendingReports, Icon: Flag },
    { to: '/moderator/repeat-offenders', label: 'Repeat offenders', exact: false, badge: null, Icon: AlertOctagon },
    { to: '/moderator/logs', label: 'Audit logs', exact: false, badge: null, Icon: FileText },
  ];

  const routeName = location.pathname.startsWith('/moderator/approvals')
    ? 'Skill approvals'
    : location.pathname.startsWith('/moderator/disputes')
      ? 'Disputes & escrow'
      : location.pathname.startsWith('/moderator/reports')
        ? 'User reports'
        : location.pathname.startsWith('/moderator/repeat-offenders')
          ? 'Repeat offenders'
          : location.pathname.startsWith('/moderator/logs')
            ? 'Audit logs'
            : location.pathname.startsWith('/moderator/review')
              ? 'Skill review'
              : 'Overview';

  // A tab is highlighted for every route except detail pages with no tab (e.g. skill review).
  const hasActiveTab = navLinks.some(l => (l.exact ? location.pathname === l.to : location.pathname.startsWith(l.to)));
  const totalPending = pendingApprovals + pendingDisputes + pendingReports;

  useEffect(() => { document.title = `${routeName} · Moderation`; }, [routeName]);

  const initials = profile?.full_name?.trim()?.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'M';
  const firstName = profile?.full_name?.trim()?.split(/\s+/)[0] || 'Moderator';
  const todayLabel = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const avatar = (size, text) => (
    profile?.avatar_url
      ? <img src={profile.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
      : <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-emerald-700 ${text} font-bold text-white`}>{initials}</span>
  );

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#faf9f6] font-sans text-gray-900">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm" role="status" aria-live="polite">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-semibold">Opening moderator workspace</p>
            <p className="mt-0.5 text-xs text-gray-500">Verifying your session…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] font-sans text-gray-900">
      <a href="#mod-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-800 focus:shadow-lg">Skip to content</a>

      {/* ══ HEADER: brand row + tab row */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl">

        {/* Row 1 — brand, current page, account */}
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/moderator" className={`flex shrink-0 items-center gap-2.5 rounded-lg ${FOCUS_RING}`}>
              <img src="/logo.png" alt="SkillCredit" className="h-8 w-8 object-contain" />
              <span className="hidden text-xl font-bold tracking-tight text-emerald-900 sm:block">SkillCredit</span>
            </Link>
            <span className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" /> Moderation
              </span>
              {!hasActiveTab && <span className="truncate text-sm font-semibold text-gray-900" aria-current="page">{routeName}</span>}
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
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 transition-colors ${FOCUS_RING} ${isMenuOpen ? 'border-emerald-200 bg-emerald-50/80' : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'}`}
              >
                {avatar('h-7 w-7', 'text-xs')}
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block max-w-[120px] truncate text-[13px] font-semibold text-gray-900">{firstName}</span>
                  <span className="block text-[10px] capitalize text-gray-500">{profile?.role || 'Staff'}</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMenuOpen && (
                <div role="menu" className="absolute right-0 z-50 mt-2.5 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
                    {avatar('h-10 w-10', 'text-sm')}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{profile?.full_name || 'Moderator'}</p>
                      <p className="text-xs capitalize text-gray-500">{profile?.role || 'Moderator'}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <Link to="/dashboard" role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                      <ArrowUpRight className="h-4 w-4 text-gray-400" /> Switch to user app
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <button onClick={handleSignOut} role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">
                      <LogOut className="h-4 w-4 text-rose-500" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 — queue tabs */}
        <nav aria-label="Moderator navigation" className="border-t border-gray-100">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-6 px-4 md:px-6 xl:grid-cols-[1fr_auto_1fr]">
            <div className="hidden xl:block" aria-hidden="true" />

            {/* auto margins centre the tabs when they fit and fall back to scrolling when they don't */}
            <div className="-mx-3 min-w-0 overflow-x-auto xl:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-max gap-1">
            {navLinks.map(({ to, label, exact, badge, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                aria-label={badge ? `${label}, ${badge} pending` : label}
                className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-offset-0 ${isActive ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`} />
                    {label}
                    {badge > 0 && (
                      <span className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${isActive ? 'bg-emerald-700 text-white' : 'bg-amber-100 text-amber-800'}`}>{badge}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
            </div>
            </div>

            <p className="hidden items-center justify-end gap-2 text-xs text-gray-500 2xl:flex" role="status">
              <span className={`h-2 w-2 rounded-full ${totalPending > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} aria-hidden="true" />
              {totalPending > 0
                ? <><span className="font-semibold tabular-nums text-gray-900">{totalPending}</span> {totalPending === 1 ? 'item' : 'items'} waiting for review</>
                : 'All queues are clear'}
            </p>
          </div>
        </nav>
      </header>

      {/* ══ PAGE CONTENT */}
      <main id="mod-main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 py-6 outline-none md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}