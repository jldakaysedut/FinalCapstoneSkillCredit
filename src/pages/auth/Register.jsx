import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserRound, Mail, LockKeyhole } from 'lucide-react'; 
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
    <main className="min-h-screen bg-[#f8f6f1] px-4 pb-10 pt-14 sm:px-6 sm:pt-16" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mx-auto w-full max-w-[520px]">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-[#817c70] transition hover:text-[#2d6a4f]">
          <ArrowLeft size={15} /> Back to Home
        </Link>
        <header className="mb-8 text-center">
          <Link to="/" className="inline-block text-[37px] font-bold leading-none tracking-[-0.045em] text-[#242424] sm:text-[43px]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            <span className="text-[#2d6a4f]">Skill</span>Credit
          </Link>
          <p className="mt-3 text-[13px] font-medium text-[#aaa191] sm:text-sm">Share skills · Earn credits · Keep learning</p>
        </header>
        <section className="rounded-[26px] border border-[#eee9df] bg-white px-6 py-9 shadow-[0_14px_40px_rgba(36,32,22,0.065)] sm:px-10 sm:py-11">
          <div className="mb-8">
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-[#202020] sm:text-[35px]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Create your account</h1>
            <p className="mt-2 text-[15px] text-[#909090]">Join and get <span className="font-semibold text-[#2d6a4f]">20 free credits</span> to start learning <span aria-hidden="true">🎁</span></p>
          </div>
          {errorMsg && (
            <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
              {errorMsg.includes('Please log in instead.') && <Link to="/login" className="mt-2 block font-semibold text-[#2d6a4f] hover:underline">Go to Log In</Link>}
            </div>
          )}
          <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-[#454545]">Full Name</label>
            <div className="relative">
              <UserRound aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9d998f]" />
              <input id="fullName" type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name" className="w-full min-h-[52px] rounded-xl border border-[#e8e0d2] bg-[#fdfbf8] pl-12 pr-4 text-[15px] text-[#292929] placeholder:text-[#b5aca0] outline-none transition-colors focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10" />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#454545]">Email address</label>
            <div className="relative">
              <Mail aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9d998f]" />
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="w-full min-h-[52px] rounded-xl border border-[#e8e0d2] bg-[#fdfbf8] pl-12 pr-4 text-[15px] text-[#292929] placeholder:text-[#b5aca0] outline-none transition-colors focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10" />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#454545]">Password</label>
            <div className="relative">
              <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9d998f]" />
              <input id="password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="w-full min-h-[52px] rounded-xl border border-[#e8e0d2] bg-[#fdfbf8] pl-12 pr-4 text-[15px] text-[#292929] placeholder:text-[#b5aca0] outline-none transition-colors focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10" />
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#454545]">Confirm Password</label>
            <div className="relative">
              <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9d998f]" />
              <input id="confirmPassword" type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" className="w-full min-h-[52px] rounded-xl border border-[#e8e0d2] bg-[#fdfbf8] pl-12 pr-4 text-[15px] text-[#292929] placeholder:text-[#b5aca0] outline-none transition-colors focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10" />
            </div>
          </div>
            <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-[#2d6a4f] px-5 py-4 text-[15px] font-bold text-white transition-colors hover:bg-[#24553f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6a4f]/20 disabled:cursor-wait disabled:opacity-60">
              {loading ? 'Creating account...' : 'Sign up & get 20 credits →'}
            </button>
          </form>
        </section>
        <p className="mt-7 text-center text-sm text-[#888780]">Already have an account?{' '}<Link to="/login" className="font-bold text-[#2d6a4f] hover:underline">Log in</Link></p>
      </div>
    </main>
  );
}
