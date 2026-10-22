import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { 
  ArrowLeft, CheckCircle2, XCircle, Clock, Video, FileText, 
  MessageCircle, Sparkles, ExternalLink, FileImage, ShieldAlert, Hand
} from 'lucide-react';

const getFormatIcon = (format) => {
  const map = {
    'Video Call': Video,
    'Chat/Text': MessageCircle,
    'Docs': FileText,
    'All Formats': Sparkles
  };
  return map[format] || Sparkles;
};

const DECLINE_REASONS = [
  "Inappropriate or offensive content in cover photo or description.",
  "Skill description and outcomes are too vague or incomplete.",
  "Portfolio or reference link is invalid, broken, or suspicious.",
  "Listing violates platform Trust & Safety guidelines.",
  "Misclassified category or incorrect pricing tier.",
  "Spam or duplicate listing."
];

export default function SkillReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [skill, setSkill] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Explicit foreign keys para walang Ambiguous Relationship error
      const { data, error } = await supabase
        .from('skills')
        .select(`
          *,
          instructor:user_profiles!instructor_id ( id, full_name, email, avatar_url ),
          assignee:user_profiles!assigned_to ( id, full_name )
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      setSkill(data);
    } catch (err) {
      console.error(err);
      alert('Skill not found.');
      navigate('/moderator/approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    setProcessing(true);
    try {
      // Dinagdagan natin ng .select() para ma-verify kung pumasok talaga ang update
      const { data, error } = await supabase
        .from('skills')
        .update({ assigned_to: currentUser.id })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      
      // Kapag walang error pero walang nabago, RLS ang may kasalanan
      if (!data || data.length === 0) {
        throw new Error("Supabase RLS blocked the update. Check your database policies.");
      }

      await fetchData(); 
    } catch (err) {
      console.error("CLAIM ERROR:", err);
      alert(`Error claiming skill: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this skill to be published on the platform?')) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('skills')
        .update({ status: 'approved', rejection_reason: null })
        .eq('id', id);
        
      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: skill.instructor_id,
        type: 'report_updated',
        content: `Moderator Update: Your skill listing "${skill.title}" has been APPROVED and is now live!`,
        link_url: `/my-listings?highlight=${id}` // 🚨 DINAGDAGAN NG HIGHLIGHT PARAM
      }]);

      alert('Skill successfully approved!');
      navigate('/moderator/approvals'); 
    } catch (err) {
      console.error(err);
      alert('Error approving skill.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason) {
      alert('Please select a reason for rejection.');
      return;
    }
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('skills')
        .update({ status: 'rejected', rejection_reason: rejectReason })
        .eq('id', id);
        
      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: skill.instructor_id,
        type: 'account_warning',
        content: `Moderator Update: Your skill listing "${skill.title}" was REJECTED. Reason: ${rejectReason}`,
        link_url: `/my-listings?highlight=${id}` // 🚨 DINAGDAGAN NG HIGHLIGHT PARAM
      }]);

      alert('Skill has been rejected and the instructor has been notified.');
      setShowRejectModal(false);
      navigate('/moderator/approvals'); 
    } catch (err) {
      console.error(err);
      alert('Error rejecting skill.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#f4f7f4]">
        <span className="text-slate-400 font-medium text-xs animate-pulse">Loading skill details...</span>
      </div>
    );
  }

  if (!skill) return null;

  const FormatIcon = getFormatIcon(skill.format);
  const instructor = Array.isArray(skill.instructor) ? skill.instructor[0] : skill.instructor;
  const isResolved = skill.status !== 'pending';
  const isClaimedByMe = skill.status === 'pending' && skill.assigned_to === currentUser?.id;
  const isUnassigned = skill.status === 'pending' && !skill.assigned_to;
  const assignedToSomeoneElse = skill.status === 'pending' && skill.assigned_to && skill.assigned_to !== currentUser?.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* ── HEADER & BACK ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <button 
            onClick={() => navigate('/moderator/approvals')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Queue
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-2">Skill Inspection</h1>
        </div>

        <div className="flex items-center gap-2">
          {isUnassigned && (
            <button 
              onClick={handleClaim}
              disabled={processing}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-lg transition shadow-sm"
            >
              <Hand className="h-3.5 w-3.5" /> Claim Case
            </button>
          )}

          {isClaimedByMe && (
            <>
              <button 
                onClick={() => setShowRejectModal(true)}
                disabled={processing}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition shadow-sm"
              >
                <XCircle className="h-3.5 w-3.5" /> Decline
              </button>
              <button 
                onClick={handleApprove}
                disabled={processing}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg transition shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
            </>
          )}

          {isResolved && (
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
              skill.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {skill.status}
            </span>
          )}
        </div>
      </div>

      {/* Notices */}
      {isResolved && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${skill.status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {skill.status === 'approved' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div>
            <p className="font-bold text-sm">This skill has been {skill.status}.</p>
            {skill.status === 'rejected' && <p className="text-xs mt-1 font-medium">Reason: {skill.rejection_reason}</p>}
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mt-2">Resolved by {skill.assignee?.full_name || 'Moderator'}</p>
          </div>
        </div>
      )}

      {assignedToSomeoneElse && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
          <Hand className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Currently claimed by another moderator.</p>
            <p className="text-xs mt-1">This skill is locked for review by {skill.assignee?.full_name}.</p>
          </div>
        </div>
      )}

      {/* Main Review Card */}
      <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition ${isResolved ? 'opacity-80' : ''}`}>
        <div className="w-full h-64 bg-slate-100 relative border-b border-slate-200 flex items-center justify-center">
          {skill.cover_image_url ? (
            <img src={skill.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-slate-400">
              <FileImage className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-xs font-semibold">No Cover Image</span>
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-slate-900/80 backdrop-blur text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded shadow-sm">
              {skill.category}
            </span>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{skill.title}</h1>
          
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
            <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-500 text-xs">
              {instructor?.avatar_url ? <img src={instructor.avatar_url} className="w-full h-full object-cover" alt="" /> : instructor?.full_name?.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{instructor?.full_name || 'Unknown'}</p>
              <p className="text-[11px] text-slate-500">{instructor?.email || 'No email provided'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Credit Cost</p>
              <p className="text-lg font-bold text-slate-900">{skill.credit_cost} CR</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Duration</p>
              <p className="text-lg font-bold text-slate-900 flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {skill.duration}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Format</p>
              <p className="text-lg font-bold text-slate-900 flex items-center gap-1.5"><FormatIcon className="w-4 h-4 text-slate-400" /> {skill.format}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{skill.description}</p>
            </div>
            
            <div>
              <h3 className="text-xs font-semibold text-slate-900 mb-2">Learner Outcomes</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{skill.outcomes}</p>
            </div>

            {skill.portfolio_url && (
              <div>
                <h3 className="text-xs font-semibold text-slate-900 mb-2">Portfolio Reference</h3>
                <a href={skill.portfolio_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg hover:bg-blue-100 transition">
                  <ExternalLink className="w-3.5 h-3.5" /> View External Link
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DECLINE MODAL ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Decline Listing</h2>
            </div>
            <p className="text-xs font-medium text-slate-500 mb-5 ml-13">Select a reason to notify the instructor why this skill was rejected.</p>
            
            <form onSubmit={handleReject}>
              <div className="mb-6 space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {DECLINE_REASONS.map((reason) => (
                  <label 
                    key={reason} 
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      rejectReason === reason 
                        ? 'bg-rose-50 border-rose-300 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="rejectReason" 
                      value={reason} 
                      checked={rejectReason === reason} 
                      onChange={(e) => setRejectReason(e.target.value)} 
                      className="mt-0.5 w-3.5 h-3.5 accent-rose-600"
                    />
                    <span className={`text-xs leading-tight ${rejectReason === reason ? 'text-rose-800 font-bold' : 'text-slate-700 font-medium'}`}>
                      {reason}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowRejectModal(false)}
                  disabled={processing}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={processing || !rejectReason}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}