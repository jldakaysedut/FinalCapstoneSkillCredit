import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { 
  ArrowLeft, Lock, UploadCloud, Save, X, ShieldAlert, Unlock, FileText, AlertCircle
} from 'lucide-react';

const SKILL_CATEGORIES = [
  { name: 'Cooking & Baking',                      tier: 'Tier 1', min: 9,  max: 22,  color: '#f97316' },
  { name: 'Gardening & Farming',                   tier: 'Tier 1', min: 9,  max: 18,  color: '#22c55e' },
  { name: 'Home & DIY',                            tier: 'Tier 1', min: 9,  max: 20,  color: '#a78bfa' },
  { name: 'Health & Fitness',                      tier: 'Tier 1', min: 9,  max: 25,  color: '#ef4444' },
  { name: 'Beauty & Grooming',                     tier: 'Tier 1', min: 9,  max: 20,  color: '#ec4899' },
  { name: 'Gaming & Hobbies',                      tier: 'Tier 1', min: 9,  max: 20,  color: '#6366f1' },
  { name: 'Electronics, Appliance & Basic Repair', tier: 'Tier 2', min: 17, max: 42,  color: '#64748b' },
  { name: 'Electronics & Repair',                  tier: 'Tier 2', min: 17, max: 42,  color: '#3b82f6' }, 
  { name: 'School & Tutoring',                     tier: 'Tier 2', min: 19, max: 39,  color: '#0ea5e9' },
  { name: 'Writing & Content',                     tier: 'Tier 2', min: 17, max: 45,  color: '#8b5cf6' },
  { name: 'Languages & Speaking',                  tier: 'Tier 2', min: 21, max: 42,  color: '#14b8a6' },
  { name: 'Singing & Instruments',                 tier: 'Tier 2', min: 17, max: 47,  color: '#f43f5e' },
  { name: 'Art & Graphic Design',                  tier: 'Tier 2', min: 19, max: 52,  color: '#f59e0b' },
  { name: 'Video & Animation',                     tier: 'Tier 2', min: 22, max: 56,  color: '#dc2626' },
  { name: 'Business & Freelance',                  tier: 'Tier 3', min: 28, max: 75,  color: '#0d9488' },
  { name: 'Financial Literacy & Money Management', tier: 'Tier 3', min: 25, max: 60,  color: '#ca8a04' },
  { name: 'Financial Literacy',                    tier: 'Tier 3', min: 25, max: 60,  color: '#059669' }, 
  { name: 'UI/UX Design',                          tier: 'Tier 3', min: 38, max: 94,  color: '#7c3aed' },
  { name: 'Coding & Tech',                         tier: 'Tier 3', min: 38, max: 100, color: '#10b981' },
];

export default function EditSkill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasActiveSessions, setHasActiveSessions] = useState(false);
  
  const [skill, setSkill] = useState(null);
  const [newImage, setNewImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // States para sa Conditional Re-review logic
  const [initialPortfolio, setInitialPortfolio] = useState('');
  const [initialImage, setInitialImage] = useState('');

  useEffect(() => {
    const fetchSkillData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: skillData, error: skillError } = await supabase
        .from('skills')
        .select('*')
        .eq('id', id)
        .eq('instructor_id', user.id)
        .single();

      if (skillError || !skillData) {
        alert('Skill not found or unauthorized.');
        navigate('/my-listings');
        return;
      }

      setSkill(skillData);
      setPreviewUrl(skillData.cover_image_url || '');
      
      // I-store ti orihinal a pateg ti link ken ladawan
      setInitialPortfolio(skillData.portfolio_url || '');
      setInitialImage(skillData.cover_image_url || '');

      const { data: activeSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('skill_id', id)
        .in('status', ['pending', 'active', 'upcoming', 'confirmed'])
        .limit(1);

      if (activeSessions && activeSessions.length > 0) {
        setHasActiveSessions(true);
      }

      setLoading(false);
    };

    fetchSkillData();
  }, [id, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSkill(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File size exceeds 5MB limit.'); return; }
    setNewImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setNewImage(null);
    setPreviewUrl('');
    setSkill(prev => ({ ...prev, cover_image_url: null })); 
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!skill.description.trim() || !skill.outcomes.trim()) {
      alert('Description and Outcomes are required.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let finalImageUrl = skill.cover_image_url;

      if (newImage) {
        const fileExt = newImage.name.split('.').pop();
        const fileName = `cover_${id}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('skill_covers')
          .upload(filePath, newImage, { upsert: true });
          
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('skill_covers').getPublicUrl(filePath);
          
        finalImageUrl = `${publicUrl}?t=${Date.now()}`;
      } else if (!previewUrl) {
        finalImageUrl = null;
      }

      const updatePayload = {
        description: skill.description,
        outcomes: skill.outcomes,
        portfolio_url: skill.portfolio_url,
        cover_image_url: finalImageUrl,
      };

      if (!hasActiveSessions) {
        updatePayload.credit_cost = parseInt(skill.credit_cost, 10);
        updatePayload.format = skill.format;
        updatePayload.duration = skill.duration;
      }

      // Check nu nagbaliw ti portfolio wenno ladawan para re-review
      const needsReview = (skill.portfolio_url !== initialPortfolio) || (finalImageUrl !== initialImage);

      if (needsReview) {
        updatePayload.status = 'pending';
        updatePayload.assigned_to = null;
        updatePayload.rejection_reason = null;
      }

      const { error: updateError } = await supabase
        .from('skills')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) throw updateError;

      if (needsReview) {
        alert('Listing updated! Because you changed your Portfolio Link or Cover Image, your listing has been sent back to pending status for moderator approval.');
      } else {
        alert('Listing updated successfully!');
      }
      
      navigate('/my-listings');

    } catch (error) {
      console.error('Error updating skill:', error);
      alert('Failed to update listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading edit skill form" className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-[800px] animate-pulse px-6 py-8">
        <div className="mb-6 flex items-center gap-4"><div className="h-10 w-10 rounded-full border border-gray-200 bg-white" /><div className="space-y-2"><div className="h-6 w-40 rounded bg-gray-200" /><div className="h-3 w-56 rounded bg-gray-100" /></div></div>
        <div className="mb-8 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="h-6 w-6 shrink-0 rounded bg-blue-100" /><div className="flex-1 space-y-2"><div className="h-4 w-40 rounded bg-blue-100" /><div className="h-3 w-full rounded bg-blue-100" /><div className="h-3 w-5/6 rounded bg-blue-100" /></div></div>
        <div className="space-y-8">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"><div className="mb-5 h-4 w-32 rounded bg-gray-200" /><div className="grid grid-cols-1 gap-5 md:grid-cols-2">{[0,1].map(item => <div key={item} className="space-y-2"><div className="h-3 w-20 rounded bg-gray-100" /><div className="h-11 rounded-xl bg-gray-100" /></div>)}</div></section>
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"><div className="mb-5 h-4 w-36 rounded bg-gray-200" /><div className="grid grid-cols-1 gap-6 md:grid-cols-2">{[0,1,2,3].map(item => <div key={item} className="space-y-2"><div className="h-3 w-24 rounded bg-gray-100" /><div className="h-11 rounded-xl bg-gray-100" /></div>)}</div></section>
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"><div className="mb-5 h-4 w-28 rounded bg-gray-200" /><div className="space-y-4"><div className="h-24 rounded-xl bg-gray-100" /><div className="h-12 rounded-xl bg-gray-100" /><div className="h-12 rounded-xl bg-gray-100" /></div></section>
          <div className="flex justify-end"><div className="h-11 w-36 rounded-xl bg-emerald-100" /></div>
        </div>
      </div>
    </div>
  );

  const activeCat = SKILL_CATEGORIES.find(c => c.name === skill.category) || SKILL_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="max-w-[800px] mx-auto px-6 py-8">
        
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Edit Listing</h1>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">Manage and update your skill details</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[13px] font-bold text-blue-900 mb-1">Integrity Protection Rules</h3>
            <p className="text-[12px] text-blue-800/80 leading-relaxed">
              To prevent bait-and-switch tactics and maintain review integrity, your <strong>Title</strong> and <strong>Category</strong> are permanently locked. 
              {hasActiveSessions 
                ? <span className="font-bold text-amber-700 ml-1">Pricing and scheduling are currently locked because you have active/pending sessions.</span>
                : <span className="text-emerald-700 ml-1">Pricing and scheduling can be edited right now since you have no active sessions.</span>
              }
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          
          <section className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <h2 className="text-[14px] font-extrabold text-gray-900 flex items-center gap-2 mb-5">
              <Lock className="w-4 h-4 text-gray-400" /> Core Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Title</label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 font-semibold text-[14px] flex items-center justify-between cursor-not-allowed">
                  <span className="truncate">{skill.title}</span>
                  <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Category</label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 font-semibold text-[14px] flex items-center justify-between cursor-not-allowed">
                  <span>{skill.category}</span>
                  <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            {hasActiveSessions && (
              <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl border-b border-l border-amber-200 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Locked
              </div>
            )}
            
            <h2 className="text-[14px] font-extrabold text-gray-900 flex items-center gap-2 mb-5">
              {hasActiveSessions ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />} 
              Contract Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className={`bg-gray-50 border border-gray-200 rounded-2xl p-5 ${hasActiveSessions ? 'opacity-70' : ''}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Credit Cost</p>
                <p className="text-[10px] text-gray-400 mb-4">{activeCat.min}–{activeCat.max} cr range</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-[38px] font-bold leading-none" style={{ color: hasActiveSessions ? '#9ca3af' : activeCat.color }}>{skill.credit_cost}</span>
                  <span className="text-[14px] font-bold text-gray-400">cr</span>
                </div>
                <input 
                  type="range" 
                  name="credit_cost" 
                  min={activeCat.min} 
                  max={activeCat.max} 
                  value={skill.credit_cost} 
                  onChange={handleInputChange}
                  disabled={hasActiveSessions}
                  className={`w-full h-2 rounded-lg appearance-none transition-all ${hasActiveSessions ? 'cursor-not-allowed grayscale' : 'cursor-pointer'}`} 
                  style={{ accentColor: hasActiveSessions ? '#9ca3af' : activeCat.color }} 
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-300 mt-1.5">
                  <span>Min {activeCat.min}</span><span>Max {activeCat.max}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Duration</label>
                  <select
                    name="duration" value={skill.duration}
                    onChange={handleInputChange}
                    disabled={hasActiveSessions}
                    className={`w-full border rounded-xl px-4 py-3 text-[14px] font-bold outline-none transition ${
                      hasActiveSessions ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed appearance-none' : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 cursor-pointer'
                    }`}
                  >
                    <option value="30 mins">30 mins</option>
                    <option value="1 hr">1 hr</option>
                    <option value="1.5 hrs">1.5 hrs</option>
                    <option value="2 hrs">2 hrs</option>
                    <option value="4 hrs">4 hrs</option>
                    <option value="Project Base">Project Base</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Format</label>
                  <select
                    name="format" value={skill.format}
                    onChange={handleInputChange}
                    disabled={hasActiveSessions}
                    className={`w-full border rounded-xl px-4 py-3 text-[14px] font-bold outline-none transition ${
                      hasActiveSessions ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed appearance-none' : 'bg-white border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 cursor-pointer'
                    }`}
                  >
                    <option value="Video Call">Video Call</option>
                    <option value="Chat/Text">Chat/Text</option>
                    <option value="Voice Call">Voice Call</option>
                    <option value="Docs">Docs / Review</option>
                    <option value="All Formats">All Formats</option>
                  </select>
                </div>
              </div>

            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <h2 className="text-[14px] font-extrabold text-gray-900 flex items-center gap-2 mb-5">
              <FileText className="w-4 h-4 text-emerald-600" /> Editable Content
            </h2>
            
            {/* Approval Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="text-[12px] font-bold mb-0.5">Moderator Review Trigger</p>
                <p className="text-[12px] opacity-90 leading-relaxed">
                  You can freely edit your description and outcomes without losing your active status. However, changing your <strong>Portfolio Link</strong> or <strong>Cover Image</strong> will automatically send this listing back to "Pending" status for moderator approval.
                </p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Description</label>
                <textarea
                  name="description" value={skill.description} onChange={handleInputChange} required
                  className="w-full bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3 text-[14px] text-gray-900 outline-none transition h-32 resize-none"
                  placeholder="Describe your skill..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Outcomes (What they will learn)</label>
                <textarea
                  name="outcomes" value={skill.outcomes} onChange={handleInputChange} required
                  className="w-full bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3 text-[14px] text-gray-900 outline-none transition h-24 resize-none"
                  placeholder="E.g., Students will be able to build a React app..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Portfolio / Proof Link (Optional)</label>
                <input
                  type="url" name="portfolio_url" value={skill.portfolio_url || ''} onChange={handleInputChange}
                  className="w-full bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3 text-[14px] text-gray-900 outline-none transition"
                  placeholder="https://your-portfolio.com"
                />
              </div>

              {/* Cover Image Upload (Naisentro a ladawan ken upload box babaen ti mx-auto) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 text-center md:text-left">Cover Image (Optional)</label>
                
                {previewUrl ? (
                  <div className="relative w-full md:w-2/3 mx-auto h-48 rounded-2xl overflow-hidden border border-gray-200 group">
                    <img src={previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white text-gray-900 text-sm font-bold rounded-xl hover:bg-gray-100 cursor-pointer">
                        Change
                      </button>
                      <button type="button" onClick={handleRemoveImage} className="px-4 py-2 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 cursor-pointer">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full md:w-2/3 mx-auto h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                    </div>
                    <p className="text-[13px] font-bold text-gray-600 group-hover:text-emerald-700">Click to upload image</p>
                    <p className="text-[11px] text-gray-400 mt-1">JPEG, PNG, WEBP (Max 5MB)</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
              </div>

            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => navigate('/my-listings')} 
              disabled={saving}
              className="px-6 py-3.5 rounded-xl font-bold text-[13px] text-gray-600 hover:bg-gray-200 bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-[13px] text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}