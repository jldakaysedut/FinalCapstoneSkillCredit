import { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send, Sparkles } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      const { error: dbError } = await supabase
        .from('password_reset_requests')
        .insert([{ email: email, status: 'link_sent' }]);

      if (dbError) {
        console.error('Audit log error:', dbError.message);
      }

      setMessage('Password reset link sent! Please check your email inbox or spam folder.');
    } catch (err) {
      setError(err.message || 'An error occurred while sending the reset link.');
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
            Forgot password
            <Sparkles className="auth-title-accent" aria-hidden="true" />
          </h1>
          <p className="auth-subtitle">Enter your registered email and we'll send you a reset link.</p>
        </div>

        {message && (
          <div className="auth-alert auth-alert--success">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p>{message}</p>
          </div>
        )}

        {error && (
          <div className="auth-alert auth-alert--error">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleReset} className="auth-form">
          <div>
            <label htmlFor="forgot-email" className="auth-label">Email</label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="auth-input"
            />
          </div>

          <button type="submit" disabled={loading || !email} className="auth-primary-btn">
            {loading ? 'Sending link...' : <><Send className="h-[18px] w-[18px]" /> Send Reset Link</>}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true" />

        <p className="auth-footer-text">
          Remembered your password?{' '}
          <Link to="/login" className="auth-footer-link">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
