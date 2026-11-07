import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, Sparkles } from 'lucide-react'; 
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
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f7faf6] px-4 py-16 sm:px-6 lg:px-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#dcf2e4]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#e3efe6]/70 blur-3xl" />
      <Link to="/" className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-[#dde9e0] bg-white/90 px-4 py-2 text-xs font-semibold text-[#37624c] shadow-sm transition hover:border-[#bbd4c5] hover:bg-white sm:left-8 sm:top-7"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
      <main className="relative grid w-full max-w-[1030px] overflow-hidden rounded-[28px] border border-[#dce9e0] bg-white shadow-[0_25px_80px_rgba(26,63,40,0.11)] lg:grid-cols-[0.96fr_1.04fr]">
        <aside className="relative hidden min-h-[590px] flex-col justify-between overflow-hidden bg-[#124e36] p-10 text-white lg:flex xl:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full border border-white/15" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-44 h-60 w-60 rounded-full border border-white/15" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[-90px] left-[-50px] h-64 w-64 rounded-full bg-[#3b9b69]/30 blur-2xl" />
          <div className="relative">          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
            <span className="text-xl font-extrabold tracking-tight">SkillCredit<span className="text-[#b5e6c5]">.</span></span>
          </div>          </div>
          <div className="relative max-w-sm">
            <div className="mb-6 inline-flex h-13 w-13 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><Sparkles className="h-6 w-6 text-[#c2f3d2]" /></div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#b2e5c5]">Learn. Share. Grow.</p>
            <h2 className="text-[38px] font-bold leading-[1.17] tracking-tight xl:text-[43px]">Your skills can take you further.</h2>
            <p className="mt-5 text-[15px] leading-7 text-[#d8eee0]">Join a community where knowledge is shared, new skills are discovered, and every learning journey counts.</p>
            <div className="mt-9 flex flex-wrap gap-2 text-xs font-medium text-[#e0f6e8]"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Discover skills</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Teach others</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Earn credits</span></div>
          </div>
          <p className="relative text-xs text-[#b9dcc5]">A community built on learning together.</p>
        </aside>
        <section className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-12 sm:py-14 lg:px-14">
          <div className="mb-9 flex items-center gap-2 text-sm font-extrabold tracking-tight text-[#175b3d] lg:hidden"><img src="/logo.png" alt="" className="h-8 w-8 object-contain" /> SkillCredit</div>
          <div className="mb-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eaf7ee] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#27704b]"><span className="h-1.5 w-1.5 rounded-full bg-[#329b65]" /> Start your journey</div>
            <h1 className="text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#16271d] sm:text-[38px]">Create your account</h1>
            <p className="mt-3 text-sm leading-6 text-[#68796d]">Learn something new, share what you know, and grow together.</p>
          </div>
          {errorMsg && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMsg}{errorMsg.includes('Please log in instead.') && <Link to="/login" className="mt-2 block font-bold text-[#196344] hover:underline">Go to Log In</Link>}</div>}
          <form onSubmit={handleRegister} className="space-y-4">
            <div><label htmlFor="register-name" className="mb-2 block text-[13px] font-semibold text-[#344c3d]">Full name</label><input id="register-name" autoComplete="name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" placeholder="Your full name" /></div>
            <div><label htmlFor="register-email" className="mb-2 block text-[13px] font-semibold text-[#344c3d]">Email address</label><input id="register-email" autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" placeholder="you@example.com" /></div>
            <div><label htmlFor="register-password" className="mb-2 block text-[13px] font-semibold text-[#344c3d]">Password</label><input id="register-password" autoComplete="new-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" placeholder="Create a password" /></div>
            <div><label htmlFor="register-confirm" className="mb-2 block text-[13px] font-semibold text-[#344c3d]">Confirm password</label><input id="register-confirm" autoComplete="new-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-[#dbe5df] bg-[#f9fbfa] px-4 py-3.5 text-[14px] text-[#17261e] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9aa9a1] hover:border-[#bbcec2] focus:border-[#2c805e] focus:bg-white focus:ring-4 focus:ring-emerald-600/10" placeholder="Repeat your password" /></div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#196344] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(25,99,68,0.16)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#104c33] hover:shadow-[0_12px_22px_rgba(25,99,68,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none">{loading ? 'Creating account...' : <><Rocket className="h-[18px] w-[18px]" /> Sign Up & Get 20 Credits</>}</button>
          </form>
          <div className="mt-7 border-t border-[#edf1ee] pt-5 text-center text-sm text-[#68796d]">Already a member? <Link to="/login" className="font-bold text-[#196344] hover:underline">Log in here</Link></div>
        </section>
      </main>
    </div>
  );
}
