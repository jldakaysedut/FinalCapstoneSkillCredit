import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket } from 'lucide-react'; 
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
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 transition-colors duration-150 bg-gray-50 focus:bg-white" 
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Password</label>
            <input 
              type="password" 
              required 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/15 transition-colors duration-150 bg-gray-50 focus:bg-white" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 mt-4 bg-[#2d6a4f] text-white font-bold rounded-xl hover:bg-[#1b4332] transition-colors duration-150 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? 'Creating account...' : <><Rocket size={18} /> Sign Up & Get 20 Credits</>}
          </button>
        </form>

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