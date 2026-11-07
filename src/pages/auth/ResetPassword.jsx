import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Optional: Check if user actually has a valid session from the email link
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
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
      }, 3000); // Redirect to login after 3 seconds

    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f7faf6] px-4 py-16 sm:px-6 lg:px-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#dcf2e4]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#e3efe6]/70 blur-3xl" />
      <main className="relative w-full max-w-[490px] overflow-hidden rounded-[26px] border border-[#dce9e0] bg-white p-7 shadow-[0_22px_65px_rgba(26,63,40,0.09)] sm:p-11">
        <div className="mb-8 flex items-center gap-2 text-sm font-extrabold text-[#175b3d]"><img src="/logo.png" alt="" className="h-8 w-8 object-contain" /> SkillCredit</div>
        <div className="mb-6 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#eaf7ee] text-[#196344]"><Lock className="h-6 w-6" /></div>
        <h1 className="text-3xl font-bold tracking-tight text-[#16271d]">Choose a new password</h1>
        <p className="mt-3 mb-7 text-sm leading-6 text-[#68796d]">Set a fresh password to securely access your SkillCredit account.</p>
        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
        {success ? (
          <div role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-[#196344]" /><h2 className="text-lg font-bold text-[#16271d]">Password Updated!</h2><p className="mt-2 text-sm leading-6 text-[#68796d]">You can now use your new password to log in. Redirecting...</p></div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div><label htmlFor="new-password" className="mb-2 block text-[13px] font-semibold text-[#344c3d]">New password</label><input id="new-password" autoComplete="new-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a new password" className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" /></div>
            <div><label htmlFor="confirm-password" className="mb-2 block text-[13px] font-semibold text-[#344c3d]">Confirm password</label><input id="confirm-password" autoComplete="new-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" /></div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#196344] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(25,99,68,0.16)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#104c33] hover:shadow-[0_12px_22px_rgba(25,99,68,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none">{loading ? 'Updating Password...' : 'Save New Password'} <ArrowRight className="h-4 w-4" /></button>
          </form>
        )}
      </main>
    </div>
  );
}
