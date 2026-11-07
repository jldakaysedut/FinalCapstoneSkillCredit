import { useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

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
      // 1. Supabase BaaS handles the actual security and email sending
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      // 2. Custom Audit Log para sa Capstone Panel Defense
      const { error: dbError } = await supabase
        .from('password_reset_requests')
        .insert([{ email: email, status: 'link_sent' }]);

      if (dbError) {
        console.error("Audit log error:", dbError.message);
      }

      setMessage('Password reset link sent! Please check your email inbox or spam folder.');
    } catch (err) {
      setError(err.message || 'An error occurred while sending the reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8faf9] px-4 sm:px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.035)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-[26px] font-semibold tracking-tight text-gray-900">Forgot Password</h2>
          <p className="mt-2 text-sm text-gray-500">Enter your registered email address and we'll send you a link to reset your password.</p>
        </div>

        {message && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p>{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus-visible:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="flex w-full items-center justify-center rounded-lg bg-[#2d6a4f] py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#24573f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 disabled:opacity-50"
          >
            {loading ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2d6a4f] transition hover:text-emerald-800">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}