import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldAlert, User, ShieldCheck, AlertTriangle } from 'lucide-react';
import supabase from '../../supabaseClient';

export default function Settings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Deletion State
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
      }
      setLoading(false);
    };
    fetchUser();
  }, [navigate]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setPasswordMessage({ type: 'error', text: error.message });
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsUpdatingPassword(false);
  };

  const handleInitiateDelete = async () => {
    setIsValidating(true);
    setValidationMessage('');
    
    try {
      // 1. Check Active Sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, status')
        .or(`student_id.eq.${currentUser.id},instructor_id.eq.${currentUser.id}`);
      
      const hasActiveSessions = sessions?.some(s => 
        ['pending', 'scheduled', 'accepted', 'ongoing'].includes(s.status?.toLowerCase())
      );

      // 2. Check Pending Reports (User is reported)
      const { data: reports } = await supabase
        .from('reports')
        .select('id')
        .eq('reported_user_id', currentUser.id)
        .eq('status', 'pending');

      // 3. Check Open Support Tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('status', 'open');

      if (hasActiveSessions) {
        setValidationMessage('You cannot delete your account while you have active, pending, or scheduled sessions.');
      } else if (reports && reports.length > 0) {
        setValidationMessage('Your account cannot be deleted while under active moderator review for a report.');
      } else if (tickets && tickets.length > 0) {
        setValidationMessage('Please resolve or close your open support tickets before deleting your account.');
      } else {
        // Passed all checks!
        setShowConfirmModal(true);
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidationMessage('An error occurred while verifying your account status. Please try again later.');
    } finally {
      setIsValidating(false);
    }
  };

  const executeAccountDeletion = async () => {
    if (deleteInput !== 'deleteacc' || !currentUser) return;
    setIsDeleting(true);

    try {
      // Soft Delete: Mark as deleted and inactive to hide from public views
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          is_deleted: true, 
          is_active: false,
          community_restricted_until: null, // Clear any temporary restrictions as it's now permanently disabled
          booking_restricted_until: null
        })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Log out
      await supabase.auth.signOut();
      
      alert("Your account has been successfully deleted.");
      navigate('/login');
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please contact support.");
      setIsDeleting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f7f8f6] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522]">Account Settings</h1>
          <p className="mt-1 text-sm text-[#777d78]">Manage your profile, security, and account status.</p>
        </div>

        {/* Section 1: Profile Reminder */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(20,30,20,0.03)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#303833]">Profile Information</h2>
              <p className="mt-1 text-sm text-[#777d78]">
                To update your full name, bio, and avatar, please visit your public profile page.
              </p>
              <button 
                onClick={() => navigate('/profile')}
                className="mt-3 inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Security & Password */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(20,30,20,0.03)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-[#303833]">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-gray-700">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-[#fbfdfb] px-4 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-gray-700">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-[#fbfdfb] px-4 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="Confirm new password"
              />
            </div>

            {passwordMessage.text && (
              <div className={`rounded-xl p-3 text-sm font-medium ${passwordMessage.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {passwordMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingPassword || !newPassword}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* Section 3: Danger Zone */}
        <section className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-[#303833]">Danger Zone</h2>
          </div>
          
          <div className="mt-4 rounded-xl border border-rose-100 bg-[#fff5f5] p-5">
            <h3 className="text-[14px] font-bold text-rose-900">Delete Account</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-rose-800/80">
              Deleting your account will permanently hide your profile, skills, and community posts from the public platform. For audit and security purposes, historical transaction data (such as past sessions) will be retained.
            </p>
            
            {validationMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-white p-3 border border-rose-200 text-sm text-rose-700">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{validationMessage}</p>
              </div>
            )}

            {!showConfirmModal && (
              <button
                onClick={handleInitiateDelete}
                disabled={isValidating}
                className="mt-5 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-rose-600 border border-rose-200 transition hover:bg-rose-50 focus:ring-2 focus:ring-rose-200 disabled:opacity-50"
              >
                {isValidating ? 'Checking account status...' : 'Delete my account'}
              </button>
            )}

            {/* Confirmation Modal Area */}
            {showConfirmModal && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-white p-5 shadow-sm animate-in fade-in duration-200">
                <h4 className="text-sm font-bold text-gray-900">Are you absolutely sure?</h4>
                <p className="mt-1 text-sm text-gray-600">
                  If you continue, you will never be able to recover this account again.
                </p>
                <div className="mt-4">
                  <label className="block text-[12px] font-bold uppercase tracking-wide text-gray-500 mb-2">
                    Type <span className="text-rose-600 select-all">deleteacc</span> to continue
                  </label>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="deleteacc"
                    className="w-full max-w-sm rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={executeAccountDeletion}
                    disabled={isDeleting || deleteInput !== 'deleteacc'}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-40"
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                  <button
                    onClick={() => { setShowConfirmModal(false); setDeleteInput(''); setValidationMessage(''); }}
                    disabled={isDeleting}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}