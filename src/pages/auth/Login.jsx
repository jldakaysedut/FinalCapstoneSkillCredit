import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, is_banned, is_deleted, is_active, has_set_interests')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.is_banned) {
        await supabase.auth.signOut();
        throw new Error('Your account has been permanently banned due to severe policy violations.');
      }

      if (profile.is_deleted || profile.is_active === false) {
        const { error: reactivateError } = await supabase
          .from('user_profiles')
          .update({ is_deleted: false, is_active: true })
          .eq('id', authData.user.id);

        if (reactivateError) throw reactivateError;
        alert('Welcome back! Your account has been successfully reactivated.');
      }

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
    <div className="auth-shell">
      <div className="auth-bg auth-bg--top-left" aria-hidden="true" />
      <div className="auth-bg auth-bg--top-right" aria-hidden="true" />
      <div className="auth-bg auth-bg--bottom-left" aria-hidden="true" />
      <div className="auth-bg auth-bg--bottom-right" aria-hidden="true" />

      <Link to="/" className="auth-back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>

      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="SkillCredit" className="auth-logo" />
        </div>

        <div className="auth-header">
          <h1 className="auth-title">
            Welcome back
            <Sparkles className="auth-title-accent" aria-hidden="true" />
          </h1>
          <p className="auth-subtitle">Log in to continue to SkillCredit.</p>
        </div>

        {errorMsg && (
          <div role="alert" className="auth-alert auth-alert--error">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div>
            <label htmlFor="login-email" className="auth-label">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input skillcredit-login-input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="auth-password-row">
              <label htmlFor="login-password" className="auth-label !mb-0">Password</label>
              <Link to="/forgot-password" className="auth-inline-link">
                Forgot Password?
              </Link>
            </div>

            <div className="auth-password-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input skillcredit-login-input pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="auth-eye-btn"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-primary-btn">
            {loading ? 'Logging in...' : <><LogIn className="h-[18px] w-[18px]" /> Log In</>}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true" />

        <p className="auth-footer-text">
          Don't have an account?{' '}
          <Link to="/register" className="auth-footer-link">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
