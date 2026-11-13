import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff, Save, Sparkles } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
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

      <Link to="/login" className="auth-back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Login
      </Link>

      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src="/logo.png" alt="SkillCredit" className="auth-logo" />
        </div>

        <div className="auth-header">
          <h1 className="auth-title">
            Reset password
            <Sparkles className="auth-title-accent" aria-hidden="true" />
          </h1>
          <p className="auth-subtitle">Create a new password to regain access to your account.</p>
        </div>

        {error && (
          <div className="auth-alert auth-alert--error">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <div className="auth-success-panel">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Password updated!</h3>
            <p className="mt-2 text-sm text-slate-500">You can now use your new password to log in. Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="auth-form">
            <div>
              <label htmlFor="new-password" className="auth-label">New Password</label>
              <div className="auth-password-wrap">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                  aria-pressed={showPassword}
                  className="auth-eye-btn"
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="auth-label">Confirm Password</label>
              <div className="auth-password-wrap">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input pr-12"
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
              {loading ? 'Updating password...' : <><Save className="h-[18px] w-[18px]" /> Save New Password</>}
            </button>
          </form>
        )}

        {!success && <div className="auth-divider" aria-hidden="true" />}

        {!success && (
          <p className="auth-footer-text">
            Need a new reset link?{' '}
            <Link to="/forgot-password" className="auth-footer-link">
              Request Again
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
