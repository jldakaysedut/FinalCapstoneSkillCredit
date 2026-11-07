import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react'; 
import supabase from '../../supabaseClient';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

      // Supabase Auth is the authoritative uniqueness check. Do not publicly
      // query user_profiles/auth users to see whether an email exists.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      const duplicateEmailError =
        'An account with this email already exists. Please log in instead.';

      // Depending on Supabase email-confirmation settings, an existing signup
      // can return an explicit error or an obfuscated user with no identities.
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

      // With email confirmation enabled, Supabase may create the Auth user
      // without a session. Never treat this as a signed-in account.
      if (!authData.session) {
        setErrorMsg('Please check your email to confirm your account before logging in.');
        return;
      }

      // Only authenticated NEW registrations get the existing starter profile.
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

      // Keep the existing onboarding destination for successful signups.
      navigate('/setup-interests', { replace: true });

    } catch (error) {
      setErrorMsg(error.message || 'Something went wrong. Please try again.');
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
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">Create an account</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Register to start learning and sharing skills.</p>
          </header>
          {errorMsg && (
            <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
              {errorMsg.includes('Please log in instead.') && (
                <Link to="/login" className="mt-2 block font-semibold text-[#286547] hover:underline">Go to Log In</Link>
              )}
            </div>
          )}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
              <input id="register-name" type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/10" placeholder="Your full name" />
            </div>
            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
              <input id="register-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/10" placeholder="name@example.com" />
            </div>
            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input id="register-password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/10" placeholder="Create a password" />
            </div>
            <div>
              <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
              <input id="register-confirm-password" type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/10" placeholder="Confirm your password" />
            </div>
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-lg bg-[#286547] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1c5037] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Creating account...' : 'Create account'}</button>
          </form>
          <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
            Already have an account? <Link to="/login" className="font-semibold text-[#286547] hover:underline">Log in</Link>
          </div>
        </main>
        <p className="mt-6 text-center text-xs text-slate-400">© SkillCredit · Learn and share skills</p>
      </div>
    </div>
  );
}
