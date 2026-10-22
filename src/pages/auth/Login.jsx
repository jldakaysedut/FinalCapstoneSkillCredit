import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import supabase from '../../supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Fetch ang role, is_banned, deleted status, at has_set_interests
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, is_banned, is_deleted, is_active, has_set_interests')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // 🚨 BOUNCER CHECK
      if (profile.is_banned) {
        await supabase.auth.signOut();
        throw new Error("Your account has been permanently banned due to severe policy violations.");
      }

      // 🚨 AUTO-REACTIVATION
      if (profile.is_deleted || profile.is_active === false) {
        const { error: reactivateError } = await supabase
          .from('user_profiles')
          .update({ is_deleted: false, is_active: true })
          .eq('id', authData.user.id);

        if (reactivateError) throw reactivateError;
        alert("Welcome back! Your account has been successfully reactivated.");
      }

      // 3. Routing Logic
      if (profile.role === 'Admin') {
        await supabase.from('admin_logs').insert([{
          admin_id: authData.user.id,
          action_type: 'SYSTEM_LOGIN',
          details: 'Logged into the system as Admin.'
        }]);
        navigate('/admin', { replace: true });
        
      } else if (profile.role === 'Support') {
        await supabase.from('support_logs').insert([{
          support_id: authData.user.id,
          action_type: 'SYSTEM_LOGIN',
          details: 'Logged into the Support workspace.'
        }]);
        navigate('/support', { replace: true });
        
      } else if (profile.role === 'Moderator') {
        await supabase.from('mod_logs').insert([{
          moderator_id: authData.user.id,
          action_type: 'SYSTEM_LOGIN',
          details: 'Logged into the Moderator workspace.'
        }]);
        navigate('/moderator', { replace: true });
        
      } else {
        // 🚨 ONBOARDING CHECK: Normal User Detour
        if (!profile.has_set_interests) {
          navigate('/setup-interests', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }

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
          <h2 className="text-3xl font-bold text-[#111]" style={{ fontFamily:"'Fraunces',serif", letterSpacing:"-0.02em" }}>Welcome back</h2>
          <p className="text-gray-500 mt-2 text-sm">Log in to continue your learning journey.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3.5 outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition bg-gray-50 focus:bg-white" 
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-bold text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs font-bold text-[#2d6a4f] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3.5 outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] transition bg-gray-50 focus:bg-white" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-[#2d6a4f] text-white font-bold rounded-xl hover:bg-[#1b4332] transition shadow-md disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-[#2d6a4f] hover:underline">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}