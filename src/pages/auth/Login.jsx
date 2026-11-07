import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f7f8f7] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-[440px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-[#1f513c] hover:text-[#173c2c]">SkillCredit</Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
        <main className="rounded-xl border border-[#e1e6e2] bg-white px-6 py-8 shadow-[0_3px_20px_rgba(15,23,42,0.035)] sm:px-9 sm:py-10">
          <header className="mb-7">
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Log in to your account</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Enter your credentials to access SkillCredit.</p>
          </header>
          {errorMsg && (
            <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
              <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/10" placeholder="name@example.com" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-sm font-medium text-[#286547] hover:underline">Forgot password?</Link>
              </div>
              <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/10" placeholder="Enter your password" />
            </div>
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-lg bg-[#286547] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1c5037] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Logging in...' : 'Log in'}</button>
          </form>
          <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
            Don't have an account? <Link to="/register" className="font-semibold text-[#286547] hover:underline">Create an account</Link>
          </div>
        </main>
        <p className="mt-6 text-center text-xs text-slate-400">© SkillCredit · Learn and share skills</p>
      </div>
    </div>
  );
}
