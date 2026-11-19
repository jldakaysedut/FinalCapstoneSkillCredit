import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, Eye, EyeOff } from 'lucide-react'; 
import supabase from '../../supabaseClient';
import PasswordStrengthMeter, { MIN_PASSWORD_LENGTH } from '../../components/PasswordStrengthMeter';

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
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResendMessage('');

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      return setErrorMsg('Please fill in all fields.');
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return setErrorMsg('Please enter a valid email address.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setErrorMsg(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
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
        options: {
          // Store this until the first *verified* login creates user_profiles.
          data: { full_name: fullName.trim() },
          // Keep the normal Login UI; no separate verification page is needed.
          emailRedirectTo: `${window.location.origin}/login`,
        },
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
        // Pending verification is a successful signup request, not a failure.
        // Do not insert a public profile before the user has authenticated.
        setVerificationEmail(normalizedEmail);
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

  const handleResendVerification = async () => {
    if (!verificationEmail || resendLoading) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
      setResendMessage('If verification is still pending, a new email will arrive shortly. Check Spam too.');
    } catch (error) {
      setResendMessage(error.message || 'Could not resend the email. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative" style={{ background: "#faf8f4", fontFamily: "'DM Sans', sans-serif" }}>
      
      <Link 
        to="/" 
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#2d6a4f] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-[0_12px_38px_rgb(0,0,0,0.06)] border border-[#e8e2d9] transition-shadow duration-200 hover:shadow-[0_16px_44px_rgb(0,0,0,0.075)]">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#111]" style={{ fontFamily:"'Fraunces',serif", letterSpacing:"-0.02em" }}>Create an account</h2>
          <p className="text-gray-500 mt-2 text-sm">Join the community and start learning today.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
            {errorMsg}
            {errorMsg.includes('Please log in instead.') && (
              <Link to="/login" className="block mt-2 font-bold text-[#2d6a4f] hover:underline">
                Go to Log In
              </Link>
            )}
          </div>
        )}

        {verificationEmail ? (
          <div className="space-y-4 text-center" role="status" aria-live="polite">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <p className="font-bold text-lg">Check your email</p>
              <p className="mt-2 text-sm leading-6">
                We've sent a confirmation link to <strong className="break-all">{verificationEmail}</strong>.
                Open the link first, then log in normally to finish setting up SkillCredit.
              </p>
              <p className="mt-2 text-xs">No credits are added until your account is set up after verification.</p>
            </div>
            {resendMessage && (
              <p className="text-sm text-gray-700" role="status">{resendMessage}</p>
            )}
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="w-full rounded-xl border border-[#2d6a4f] px-4 py-3 text-sm font-bold text-[#2d6a4f] hover:bg-emerald-50 disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : 'Resend verification email'}
            </button>
            <Link to="/login" className="block font-bold text-[#2d6a4f] hover:underline">
              Continue to Log In
            </Link>
          </div>
        ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
            <input 
              type="text" 
              required 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 transition-colors duration-150 bg-gray-50 focus:bg-white" 
              placeholder="e.g. John Lhoyde Dakay"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 transition-colors duration-150 bg-gray-50 focus:bg-white" 
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 pr-12 outline-none focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 transition-colors duration-150 bg-gray-50 focus:bg-white"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-500 transition-colors hover:text-[#2d6a4f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6a4f]"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            <PasswordStrengthMeter password={password} />
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="block text-sm font-bold text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 pr-12 outline-none focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 transition-colors duration-150 bg-gray-50 focus:bg-white"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-500 transition-colors hover:text-[#2d6a4f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6a4f]"
              >
                {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {!!confirmPassword && (
              <p className={`mt-1.5 text-xs font-medium ${password === confirmPassword ? 'text-emerald-700' : 'text-rose-600'}`} aria-live="polite">
                {password === confirmPassword ? '✓ Passwords match' : 'Passwords do not match yet'}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 mt-4 bg-[#2d6a4f] text-white font-bold rounded-xl hover:bg-[#1b4332] transition-colors duration-150 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? 'Creating account...' : <><Rocket size={18} /> Sign Up & Get 20 Credits</>}
          </button>
        </form>
        )}

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#2d6a4f] hover:underline">
            Log in here
          </Link>
        </p>

      </div>
    </div>
  );
}