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

    if (password !== confirmPassword) {
      return setErrorMsg('Passwords do not match');
    }

    setLoading(true);

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Save profile and give 20 credits in user_profiles table
      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: fullName,
              email: email,
              credits_balance: 20,
              has_set_interests: false
            }
          ]);

        if (profileError) throw profileError;
      }

      // 3. Redirect to SetupInterests instead of Dashboard for first-timers
      navigate('/setup-interests', { replace: true });

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative" style={{ background: "#faf8f4", fontFamily: "'DM Sans', sans-serif" }}>
      
      <Link 
        to="/" 
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#2d6a4f] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e8e2d9]">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#111]" style={{ fontFamily:"'Fraunces',serif", letterSpacing:"-0.02em" }}>Create an account</h2>
          <p className="text-gray-500 mt-2 text-sm">Join the community and start learning today.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
            {errorMsg}
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
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition bg-gray-50 focus:bg-white" 
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
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition bg-gray-50 focus:bg-white" 
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
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition bg-gray-50 focus:bg-white" 
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
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition bg-gray-50 focus:bg-white" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 mt-4 bg-[#2d6a4f] text-white font-bold rounded-xl hover:bg-[#1b4332] transition shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
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