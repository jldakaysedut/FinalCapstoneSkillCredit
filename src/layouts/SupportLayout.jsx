import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpRight, Headset, LayoutDashboard, LifeBuoy, LogOut, Ticket, FileText } from 'lucide-react';
import supabase from '../supabaseClient';

const NAV_ITEMS = [
  { label: 'Overview', path: '/support', Icon: LayoutDashboard },
  { label: 'Ticket queue', path: '/support/tickets', Icon: Ticket },
  { label: 'Audit logs', path: '/support/logs', Icon: FileText },
];

export default function SupportLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f4]">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#e6ebe6] bg-white px-8 py-7 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Headset className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">Opening your workspace</p>
            <p className="mt-1 text-xs text-slate-500">Verifying support access…</p>
          </div>
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f4f7f4] font-sans text-gray-900">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-[#e6ebe6] bg-white text-[#303833] lg:flex">
        <div className="px-6 pb-6 pt-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
              <Headset className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[17px] font-bold tracking-tight text-[#303833]">Helpdesk</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Staff workspace</p>
            </div>
          </div>
        </div>

        <div className="mx-5 mb-5 rounded-2xl border border-[#e6ebe6] bg-[#f7f8f6] px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
            Support operations
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-[#7d857f]">A clear view of every request, from first reply to resolution.</p>
        </div>

        <nav aria-label="Support navigation" className="flex-1 space-y-1 px-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#929993]">Workspace</p>
          {NAV_ITEMS.map(({ label, path, Icon }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition ${active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-100' : 'text-[#68716a] hover:bg-[#f5f7f4] hover:text-[#303833]'}`}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-emerald-700' : 'text-[#929993] group-hover:text-emerald-700'}`} />
                <span className="flex-1">{label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />}
              </Link>
            );
          })}
        </nav>

        <div className="m-4 mt-6 rounded-2xl border border-[#e6ebe6] bg-[#f7f8f6] p-4">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-white/15" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800">{initials}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[#303833]">{profile?.full_name || 'Support agent'}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-emerald-700">{profile?.role || 'Support'}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/dashboard" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e1e5df] px-2.5 py-2.5 text-[11px] font-semibold text-[#59625c] transition hover:bg-white hover:text-[#303833]">
              Back to app <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-2.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 shrink-0 border-b border-[#e9ece8] bg-white/95 backdrop-blur">
          <div className="flex min-h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 lg:hidden"><LifeBuoy className="h-5 w-5" /></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Helpdesk / {activePage}</p>
                <h1 className="mt-0.5 text-[15px] font-bold tracking-tight text-[#303833] sm:text-base">Support workspace</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live queue
              </div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-2.5">
                <span className="hidden text-right sm:block">
                  <span className="block max-w-[150px] truncate text-[12px] font-semibold text-slate-800">{profile?.full_name || 'Support agent'}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">{profile?.role || 'Support'}</span>
                </span>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-100" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">{initials}</span>}
              </div>
              <button onClick={handleLogout} aria-label="Sign out" title="Sign out" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 lg:hidden">
                <LogOut className="h-[17px] w-[17px]" />
              </button>
            </div>
          </div>
          <nav aria-label="Support navigation" className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden sm:px-6">
            {NAV_ITEMS.map(({ label, path, Icon }) => {
              const active = isActive(path);
              return (
                <Link key={path} to={path} aria-current={active ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${active ? 'bg-emerald-700 text-white' : 'bg-[#f5f7f4] text-[#59625c] hover:bg-[#e9ece8]'}`}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
            <Link to="/dashboard" className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">Return to app <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </nav>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-5 sm:p-7 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}