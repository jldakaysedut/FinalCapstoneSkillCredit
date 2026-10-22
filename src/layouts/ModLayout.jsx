import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Flag, LayoutDashboard, LifeBuoy, LogOut, Scale, ShieldCheck, FileText, AlertOctagon, ClipboardList } from 'lucide-react'; // 🚨 Added ClipboardList
import supabase from '../supabaseClient';

export default function ModLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [pendingDisputes, setPendingDisputes] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0); // 🚨 Bagong state para sa approvals
  const [loading, setLoading] = useState(true);

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

        // 🚨 Bagong fetch para mabilang ang Pending Skills sa sidebar
        const { count: approvalsCount } = await supabase
          .from('skills')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setPendingDisputes(disputesCount || 0);
        setPendingReports(reportsCount || 0);
        setPendingApprovals(approvalsCount || 0); // 🚨 I-set ang count
      } catch (err) {
        console.error('Moderator layout auth error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModeratorSession();
  }, [location.pathname, navigate]);

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

  // 🚨 Inayos ang Icon at Badge
  const navLinks = [
    { to: '/moderator', label: 'Overview', exact: true, badge: null, Icon: LayoutDashboard },
    { to: '/moderator/approvals', label: 'Skill approvals', exact: false, badge: pendingApprovals, Icon: ClipboardList },
    { to: '/moderator/disputes', label: 'Disputes & escrow', exact: false, badge: pendingDisputes, Icon: Scale },
    { to: '/moderator/reports', label: 'User reports', exact: false, badge: pendingReports, Icon: Flag },
    { to: '/moderator/repeat-offenders', label: 'Repeat offenders', exact: false, badge: null, Icon: AlertOctagon },
    { to: '/moderator/logs', label: 'Audit logs', exact: false, badge: null, Icon: FileText },
  ];
  
  // 🚨 Inayos ang dynamic header title
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

  const initials = profile?.full_name?.trim()?.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'M';

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f7f4] font-sans text-[#303833]">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e6ebe6] bg-white px-5 py-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
          <div><p className="text-sm font-semibold">Opening moderator workspace</p><p className="mt-0.5 text-[13px] text-slate-400">Checking your session…</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f4f7f4] font-sans text-[#303833]">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-[#e6ebe6] bg-white lg:flex">
        <div className="px-6 pb-6 pt-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm"><ShieldCheck className="h-5 w-5" /></span>
            <div><p className="text-[17px] font-bold tracking-tight text-[#303833]">Moderation</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700">Trust & safety</p></div>
          </div>
        </div>

        <div className="mx-5 mb-5 rounded-2xl border border-[#e6ebe6] bg-[#f7f8f6] px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>Case review workspace</div>
          <p className="mt-1.5 text-[11px] leading-4 text-[#7d857f]">Review reports and disputes with a clear audit trail.</p>
        </div>

        <nav aria-label="Moderator navigation" className="flex-1 space-y-1 px-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.17em] text-[#929993]">Workspace</p>
          {navLinks.map(({ to, label, exact, badge, Icon }) => (
            <NavLink key={to} to={to} end={exact} aria-label={badge ? `${label}, ${badge} pending` : label} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition ${isActive ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-100' : 'text-[#68716a] hover:bg-[#f5f7f4] hover:text-[#303833]'}`}>
              {({ isActive }) => <><Icon className={`h-[18px] w-[18px] ${isActive ? 'text-emerald-700' : 'text-[#929993] group-hover:text-emerald-700'}`} /><span className="flex-1">{label}</span>{badge > 0 && <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${isActive ? 'bg-white text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{badge}</span>}{isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />}</>}
            </NavLink>
          ))}
        </nav>

        <div className="m-4 mt-6 rounded-2xl border border-[#e6ebe6] bg-[#f7f8f6] p-4">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800">{initials}</span>}
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-[#303833]">{profile?.full_name || 'Moderator'}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{profile?.role || 'Moderator'}</p></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/dashboard" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e1e5df] px-2.5 py-2.5 text-[11px] font-semibold text-[#59625c] transition hover:bg-white hover:text-[#303833]">User app <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            <button onClick={handleSignOut} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-2.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-600 hover:text-white"><LogOut className="h-3.5 w-3.5" />Sign out</button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 shrink-0 border-b border-[#e6ebe6] bg-white/95 backdrop-blur">
          <div className="flex min-h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 lg:hidden"><LifeBuoy className="h-5 w-5" /></span>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Moderator / {routeName}</p><h1 className="mt-0.5 text-base font-bold tracking-tight text-[#26352c] sm:text-lg">Trust & safety workspace</h1></div>
            </div>
            <div className="flex items-center gap-3">
              
              <div className="flex items-center gap-2.5"><span className="hidden text-right sm:block"><span className="block max-w-[150px] truncate text-[12px] font-semibold text-[#303833]">{profile?.full_name || 'Moderator'}</span><span className="mt-0.5 block text-[10px] text-slate-400">{profile?.role || 'Staff'}</span></span>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-[#f1f3ef]" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-[13px] font-bold text-white">{initials}</span>}</div>
              <button onClick={handleSignOut} aria-label="Sign out" title="Sign out" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 lg:hidden"><LogOut className="h-[17px] w-[17px]" /></button>
            </div>
          </div>
          <nav aria-label="Moderator navigation" className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden sm:px-6">
            {navLinks.map(({ to, label, exact, badge, Icon }) => <NavLink key={to} to={to} end={exact} className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${isActive ? 'bg-emerald-700 text-white' : 'bg-[#f5f7f4] text-[#59625c] hover:bg-[#e9ece8]'}`}><Icon className="h-4 w-4" />{label}{badge > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${location.pathname.startsWith(to) ? 'bg-white/20 text-white' : 'bg-white text-emerald-800'}`}>{badge}</span>}</NavLink>)}
            <Link to="/dashboard" className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-[#59625c] hover:bg-[#f5f7f4]">User app <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </nav>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f7f4] p-5 sm:p-8 lg:p-10"><div className="mx-auto w-full max-w-[1600px]"><Outlet /></div></main>
      </div>
    </div>
  );
}