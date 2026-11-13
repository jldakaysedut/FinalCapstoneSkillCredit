import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Rocket, Sparkles } from 'lucide-react';
import supabase from '../../supabaseClient';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      return setErrorMsg('Please fill in all fields.');
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return setErrorMsg('Please enter a valid email address.');
    }
    if (password !== confirmPassword) {
      return setErrorMsg('Passwords do not match');
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      const duplicateEmailError = 'An account with this email already exists. Please log in instead.';

      if (authError) {
        if (/already registered|already exists|user already registered|email.*(in use|registered)/i.test(authError.message || '')) {
          setErrorMsg(duplicateEmailError);
          return;
        }
        throw authError;
      }

      if (authData?.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        setErrorMsg(duplicateEmailError);
        return;
      }

      if (!authData?.user) {
        throw new Error('Registration was not completed. Please try again.');
      }

      if (!authData.session) {
        setErrorMsg('Please check your email to confirm your account before logging in.');
        return;
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: authData.user.id,
            full_name: fullName.trim(),
            email: normalizedEmail,
            credits_balance: 20,
            has_set_interests: false
          }
        ]);

      if (profileError) throw profileError;

      navigate('/setup-interests', { replace: true });
    } catch (error) {
      setErrorMsg(error.message || 'Something went wrong. Please try again.');
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
            Create account
            <Sparkles className="auth-title-accent" aria-hidden="true" />
          </h1>
          <p className="auth-subtitle">Join SkillCredit and get 20 free credits on signup.</p>
        </div>

        {errorMsg && (
          <div role="alert" className="auth-alert auth-alert--error">
            <div>{errorMsg}</div>
            {errorMsg.includes('Please log in instead.') && (
              <Link to="/login" className="mt-2 inline-block font-semibold text-[#2d6a4f] underline-offset-2 hover:underline">
                Go to Log In
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleRegister} className="auth-form">
          <div>
            <label htmlFor="register-full-name" className="auth-label">Full Name</label>
            <input
              id="register-full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="auth-input"
              placeholder="e.g. John Lhoyde Dakay"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="auth-label">Email</label>
            <input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="auth-label">Password</label>
            <div className="auth-password-wrap">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input pr-12"
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

          <div>
            <label htmlFor="register-confirm-password" className="auth-label">Confirm Password</label>
            <div className="auth-password-wrap">
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                aria-pressed={showConfirmPassword}
                className="auth-eye-btn"
              >
                {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-primary-btn">
            {loading ? 'Creating account...' : <><Rocket className="h-[18px] w-[18px]" /> Sign Up & Get 20 Credits</>}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true" />

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-footer-link">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
