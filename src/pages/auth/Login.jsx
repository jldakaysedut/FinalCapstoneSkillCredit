import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import supabase from '../../supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-20 sm:px-6 sm:py-16 lg:px-8"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #f5f8f2 0%, #faf8f4 52%)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <Link
        to="/"
        className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-500 transition-colors duration-200 hover:text-[#2d6a4f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6a4f]/30 sm:left-7 sm:top-7"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>

      <div className="w-full max-w-md rounded-[22px] border border-[#e8e2d9] bg-white px-6 py-8 shadow-[0_18px_48px_rgba(27,67,50,0.075)] sm:px-9 sm:py-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e5eee6] bg-[#f6f9f4]" aria-hidden="true">
            <img src="/logo.png" alt="" className="h-7 w-9 object-contain" />
          </div>
          <h2 className="text-[29px] font-bold tracking-tight text-[#16231c] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif", letterSpacing: '-0.025em' }}>
            Welcome back
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">Log in to continue your learning journey.</p>
        </div>

        {errorMsg && (
          <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="skillcredit-login-input w-full rounded-xl border border-[#dfe5df] bg-white px-4 py-3.5 text-[15px] text-slate-800 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 hover:border-[#bdcfc0] focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[#2d6a4f]/10"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-[#2d6a4f] transition-colors hover:text-[#1b4332] hover:underline focus-visible:outline-none focus-visible:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="skillcredit-login-input w-full rounded-xl border border-[#dfe5df] bg-white py-3.5 pl-4 pr-12 text-[15px] text-slate-800 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-slate-400 hover:border-[#bdcfc0] focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[#2d6a4f]/10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(current => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#f3f7f3] hover:text-[#2d6a4f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6a4f]/25"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-[#2d6a4f] py-3.5 font-bold text-white shadow-[0_3px_8px_rgba(27,67,50,0.12)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#24583f] hover:shadow-[0_6px_14px_rgba(27,67,50,0.15)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-600">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-[#2d6a4f] hover:underline focus-visible:outline-none focus-visible:underline">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}
