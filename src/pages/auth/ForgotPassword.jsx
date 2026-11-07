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
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f7faf6] px-4 py-16 sm:px-6 lg:px-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#dcf2e4]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#e3efe6]/70 blur-3xl" />
      <main className="relative w-full max-w-[490px] overflow-hidden rounded-[26px] border border-[#dce9e0] bg-white p-7 shadow-[0_22px_65px_rgba(26,63,40,0.09)] sm:p-11">
        <Link to="/" className="mb-9 inline-flex items-center gap-2 text-sm font-extrabold text-[#175b3d]"><img src="/logo.png" alt="" className="h-8 w-8 object-contain" /> SkillCredit</Link>
        <div className="mb-6 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#eaf7ee] text-[#196344]"><Mail className="h-6 w-6" /></div>
        <h1 className="text-3xl font-bold tracking-tight text-[#16271d]">Forgot your password?</h1>
        <p className="mt-3 mb-7 text-sm leading-6 text-[#68796d]">No worries. Enter your email and we'll send you a password reset link.</p>
        {message && <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</div>}
        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
        <form onSubmit={handleReset} className="space-y-5">
          <div><label htmlFor="email" className="mb-2 block text-[13px] font-semibold text-[#344c3d]">Email address</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" /></div>
          <button type="submit" disabled={loading || !email} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#196344] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(25,99,68,0.16)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#104c33] hover:shadow-[0_12px_22px_rgba(25,99,68,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none">{loading ? 'Sending Link...' : 'Send Reset Link'}</button>
        </form>
        <div className="mt-8 border-t border-[#edf1ee] pt-6 text-center"><Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#196344] hover:underline"><ArrowLeft className="h-4 w-4" /> Back to Login</Link></div>
      </main>
    </div>
  );
}
