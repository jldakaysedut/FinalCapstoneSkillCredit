import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, LockKeyhole } from 'lucide-react';
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
    <main className="min-h-screen bg-[#f8f6f1] px-4 pb-10 pt-14 sm:px-6 sm:pt-16" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mx-auto w-full max-w-[520px]">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-[#817c70] transition hover:text-[#2d6a4f]">
          <ArrowLeft size={15} /> Back to Home
        </Link>
        <header className="mb-8 text-center">
          <Link to="/" className="inline-block text-[37px] font-bold leading-none tracking-[-0.045em] text-[#242424] sm:text-[43px]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            <span className="text-[#2d6a4f]">Skill</span>Credit
          </Link>
          <p className="mt-3 text-[13px] font-medium text-[#aaa191] sm:text-sm">Share skills · Earn credits · Keep learning</p>
        </header>
        <section className="rounded-[26px] border border-[#eee9df] bg-white px-6 py-9 shadow-[0_14px_40px_rgba(36,32,22,0.065)] sm:px-10 sm:py-11">
          <div className="mb-8">
            <h1 className="text-[31px] font-bold leading-tight tracking-tight text-[#202020] sm:text-[35px]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Welcome back <span aria-hidden="true">👋</span></h1>
            <p className="mt-2 text-[15px] text-[#909090]">Continue learning and earning credits.</p>
          </div>
          {errorMsg && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>}
          <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#454545]">Email address</label>
            <div className="relative">
              <Mail aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9d998f]" />
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="w-full min-h-[52px] rounded-xl border border-[#e8e0d2] bg-[#fdfbf8] pl-12 pr-4 text-[15px] text-[#292929] placeholder:text-[#b5aca0] outline-none transition-colors focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10" />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="password" className="text-sm font-semibold text-[#454545]">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-[#2d6a4f] hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9d998f]" />
              <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="w-full min-h-[52px] rounded-xl border border-[#e8e0d2] bg-[#fdfbf8] pl-12 pr-4 text-[15px] text-[#292929] placeholder:text-[#b5aca0] outline-none transition-colors focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-[#2d6a4f] px-5 py-4 text-[15px] font-bold text-white transition-colors hover:bg-[#24553f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6a4f]/20 disabled:cursor-wait disabled:opacity-60">
            {loading ? 'Logging in...' : 'Log in →'}
          </button>
          </form>
        </section>
        <p className="mt-7 text-center text-sm text-[#888780]">Don't have an account?{' '}<Link to="/register" className="font-bold text-[#2d6a4f] hover:underline">Sign up free — get 20 credits</Link></p>
      </div>
    </main>
  );
}
