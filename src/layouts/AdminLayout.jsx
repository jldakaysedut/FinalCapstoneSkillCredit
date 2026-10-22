import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowLeftRight,
  ClipboardList,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import supabase from '../supabaseClient';

const NAV_LINKS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/admin/users', icon: Users, label: 'User Control' },
  { to: '/admin/escalations', icon: AlertOctagon, label: 'Escalations' },
  { to: '/admin/platform', icon: Globe, label: 'Platform Data' },
  { to: '/admin/logs', icon: ClipboardList, label: 'Audit Logs' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileOpen]);

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

  if (isAuthorized === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
          <ShieldAlert className="h-7 w-7 animate-pulse" />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Securing connection</p>
        <p className="mt-1 text-xs text-slate-400">Verifying admin access…</p>
      </div>
    );
  }

  if (isAuthorized === false) return <Navigate to="/" replace />;

  const renderNavLinks = mobile => NAV_LINKS.map(({ to, icon: Icon, label, exact }) => (
    <NavLink
      key={to}
      to={to}
      end={exact}
      onClick={() => { if (mobile) setIsMobileOpen(false); }}
      className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition ${
        isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{label}</span>
    </NavLink>
  ));

  const renderAccountActions = () => (
    <div className="space-y-1.5 border-t border-slate-100 p-3">
      <button
        type="button"
        onClick={() => { setIsMobileOpen(false); switchToUser(); }}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
      >
        <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden="true" /> Switch to User Mode
      </button>
      <button
        type="button"
        onClick={() => { setIsMobileOpen(false); handleLogout(); }}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" /> Terminate Session
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-900">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5 xl:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-950">Admin Console</h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Superuser access</p>
          </div>
        </div>
        <nav aria-label="Admin navigation" className="flex-1 space-y-1.5 overflow-y-auto p-3 xl:p-4">
          {renderNavLinks(false)}
        </nav>
        {renderAccountActions()}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">Admin Console</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">Admin workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(open => !open)}
            aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile navigation drawer */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden" onMouseDown={() => setIsMobileOpen(false)}>
            <aside
              aria-label="Admin navigation menu"
              className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] max-w-full flex-col bg-white shadow-2xl"
              onMouseDown={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><ShieldAlert className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">Admin Console</p><p className="mt-0.5 text-[10px] text-slate-400">Secure workspace</p></div>
                </div>
                <button type="button" onClick={() => setIsMobileOpen(false)} aria-label="Close menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <nav aria-label="Admin navigation" className="flex-1 space-y-1.5 overflow-y-auto p-3">
                {renderNavLinks(true)}
              </nav>
              {renderAccountActions()}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
