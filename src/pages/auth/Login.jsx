import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import supabase from '../../supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Fetch ang role, is_banned, deleted status, at has_set_interests
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, is_banned, is_deleted, is_active, has_set_interests')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // 🚨 BOUNCER CHECK
      if (profile.is_banned) {
        await supabase.auth.signOut();
        throw new Error("Your account has been permanently banned due to severe policy violations.");
      }

      // 🚨 AUTO-REACTIVATION
      if (profile.is_deleted || profile.is_active === false) {
        const { error: reactivateError } = await supabase
          .from('user_profiles')
          .update({ is_deleted: false, is_active: true })
          .eq('id', authData.user.id);

        if (reactivateError) throw reactivateError;
        alert("Welcome back! Your account has been successfully reactivated.");
      }

      // 3. Routing Logic
      if (profile.role === 'Admin') {
        await supabase.from('admin_logs').insert([{
          admin_id: authData.user.id,
          action_type: 'SYSTEM_LOGIN',
          details: 'Logged into the system as Admin.'
        }]);
        navigate('/admin', { replace: true });
        
      } else if (profile.role === 'Support') {
        await supabase.from('support_logs').insert([{
          support_id: authData.user.id,
          action_type: 'SYSTEM_LOGIN',
          details: 'Logged into the Support workspace.'
        }]);
        navigate('/support', { replace: true });
        
      } else if (profile.role === 'Moderator') {
        await supabase.from('mod_logs').insert([{
          moderator_id: authData.user.id,
          action_type: 'SYSTEM_LOGIN',
          details: 'Logged into the Moderator workspace.'
        }]);
        navigate('/moderator', { replace: true });
        
      } else {
        // 🚨 ONBOARDING CHECK: Normal User Detour
        if (!profile.has_set_interests) {
          navigate('/setup-interests', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f7faf6] px-4 py-16 sm:px-6 lg:px-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#dcf2e4]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#e3efe6]/70 blur-3xl" />
      <Link to="/" className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-[#dde9e0] bg-white/90 px-4 py-2 text-xs font-semibold text-[#37624c] shadow-sm transition hover:border-[#bbd4c5] hover:bg-white sm:left-8 sm:top-7"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
      <main className="relative grid w-full max-w-[1030px] overflow-hidden rounded-[28px] border border-[#dce9e0] bg-white shadow-[0_25px_80px_rgba(26,63,40,0.11)] lg:grid-cols-[0.96fr_1.04fr]">
        <aside className="relative hidden min-h-[590px] flex-col justify-between overflow-hidden bg-[#124e36] p-10 text-white lg:flex xl:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full border border-white/15" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-44 h-60 w-60 rounded-full border border-white/15" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[-90px] left-[-50px] h-64 w-64 rounded-full bg-[#3b9b69]/30 blur-2xl" />
          <div className="relative">          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
            <span className="text-xl font-extrabold tracking-tight">SkillCredit<span className="text-[#b5e6c5]">.</span></span>
          </div>          </div>
          <div className="relative max-w-sm">
            <div className="mb-6 inline-flex h-13 w-13 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><Sparkles className="h-6 w-6 text-[#c2f3d2]" /></div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#b2e5c5]">Learn. Share. Grow.</p>
            <h2 className="text-[38px] font-bold leading-[1.17] tracking-tight xl:text-[43px]">Your skills can take you further.</h2>
            <p className="mt-5 text-[15px] leading-7 text-[#d8eee0]">Join a community where knowledge is shared, new skills are discovered, and every learning journey counts.</p>
            <div className="mt-9 flex flex-wrap gap-2 text-xs font-medium text-[#e0f6e8]"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Discover skills</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Teach others</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Earn credits</span></div>
          </div>
          <p className="relative text-xs text-[#b9dcc5]">A community built on learning together.</p>
        </aside>
        <section className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-12 sm:py-14 lg:px-14">
          <div className="mb-9 flex items-center gap-2 text-sm font-extrabold tracking-tight text-[#175b3d] lg:hidden"><img src="/logo.png" alt="" className="h-8 w-8 object-contain" /> SkillCredit</div>
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eaf7ee] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#27704b]"><span className="h-1.5 w-1.5 rounded-full bg-[#329b65]" /> Welcome back</div>
            <h1 className="text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#16271d] sm:text-[38px]">Log in to SkillCredit</h1>
            <p className="mt-3 text-sm leading-6 text-[#68796d]">Pick up where you left off. Your learning journey continues here.</p>
          </div>
          {errorMsg && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMsg}</div>}
          <form onSubmit={handleLogin} className="space-y-5">
            <div><label htmlFor="login-email" className="mb-2 block text-[13px] font-semibold text-[#344c3d]">Email address</label><input id="login-email" autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" placeholder="you@example.com" /></div>
            <div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="login-password" className="text-[13px] font-semibold text-[#344c3d]">Password</label><Link to="/forgot-password" className="text-xs font-bold text-[#206e4d] hover:underline">Forgot password?</Link></div><input id="login-password" autoComplete="current-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" placeholder="Enter your password" /></div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#196344] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(25,99,68,0.16)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#104c33] hover:shadow-[0_12px_22px_rgba(25,99,68,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none">{loading ? 'Logging in...' : 'Log In'}<ArrowRight className="h-4 w-4" /></button>
          </form>
          <div className="mt-8 border-t border-[#edf1ee] pt-6 text-center text-sm text-[#68796d]">New to SkillCredit? <Link to="/register" className="font-bold text-[#196344] hover:underline">Create an account</Link></div>
        </section>
      </main>
    </div>
  );
}
