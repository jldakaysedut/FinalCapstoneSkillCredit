import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { 
  ArrowLeft, Lock, UploadCloud, Save, X, ShieldAlert, Unlock, FileText, AlertCircle
} from 'lucide-react';

// min/max = allowed credits for a 1-hour session (Table 2). 2-hr and 3-hr bands = x2 and x3.
const SKILL_CATEGORIES = [
  { name: 'Cooking & Baking',                       min: 8,  max: 15, color: '#f97316' },
  { name: 'Gardening & Plant Care',                 min: 7,  max: 13, color: '#22c55e' },
  { name: 'Home Repair & DIY',                      min: 7,  max: 14, color: '#a78bfa' },
  { name: 'Fitness & Sports',                       min: 11, max: 21, color: '#ef4444' },
  { name: 'Beauty & Personal Care',                 min: 9,  max: 17, color: '#ec4899' },
  { name: 'Computer, Phone & Electronics Help',     min: 7,  max: 14, color: '#64748b' },
  { name: 'School Subjects & Tutoring',             min: 8,  max: 15, color: '#0ea5e9' },
  { name: 'Writing & Editing',                      min: 11, max: 20, color: '#8b5cf6' },
  { name: 'Languages & Public Speaking',            min: 22, max: 42, color: '#14b8a6' },
  { name: 'Music & Singing',                        min: 13, max: 24, color: '#f43f5e' },
  { name: 'Graphic Design & Digital Art',           min: 11, max: 21, color: '#f59e0b' },
  { name: 'Video, Animation & AI Content Creation', min: 11, max: 21, color: '#dc2626' },
  { name: 'Business, Entrepreneurship & Marketing', min: 10, max: 19, color: '#0d9488' },
  { name: 'Finance, Investing & Trading',           min: 15, max: 27, color: '#ca8a04' },
  { name: 'Website & App Design',                   min: 19, max: 35, color: '#7c3aed' },
  { name: 'Coding & Programming',                   min: 15, max: 28, color: '#10b981' },
];

// Old category names still stored on existing listings -> their new category (so the right band is used)
const LEGACY_CATEGORY_MAP = {
  'Gardening & Farming': 'Gardening & Plant Care',
  'Home & DIY': 'Home Repair & DIY',
  'Health & Fitness': 'Fitness & Sports',
  'Beauty & Grooming': 'Beauty & Personal Care',
  'Electronics, Appliance & Basic Repair': 'Computer, Phone & Electronics Help',
  'Electronics & Repair': 'Computer, Phone & Electronics Help',
  'School & Tutoring': 'School Subjects & Tutoring',
  'Writing & Content': 'Writing & Editing',
  'Languages & Speaking': 'Languages & Public Speaking',
  'Singing & Instruments': 'Music & Singing',
  'Art & Graphic Design': 'Graphic Design & Digital Art',
  'Video & Animation': 'Video, Animation & AI Content Creation',
  'Business & Freelance': 'Business, Entrepreneurship & Marketing',
  'Financial Literacy & Money Management': 'Finance, Investing & Trading',
  'Financial Literacy': 'Finance, Investing & Trading',
  'UI/UX Design': 'Website & App Design',
  'Coding & Tech': 'Coding & Programming',
};

const DURATIONS = ['1 hr', '2 hrs', '3 hrs'];
const getHours  = d => parseInt(d, 10) || 1;
const findCat   = name =>
  SKILL_CATEGORIES.find(c => c.name === name) ||
  SKILL_CATEGORIES.find(c => c.name === LEGACY_CATEGORY_MAP[name]) ||
  SKILL_CATEGORIES[0];

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
    if (name === 'duration' && DURATIONS.includes(value)) {
      setSkill(prev => {
        const c = findCat(prev.category);
        const h = getHours(value);
        const lo = c.min * h, hi = c.max * h;
        const v = Math.min(hi, Math.max(lo, parseInt(prev.credit_cost, 10) || lo));
        return { ...prev, duration: value, credit_cost: v };
      });
      return;
    }
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

    if (!hasActiveSessions) {
      if (!DURATIONS.includes(skill.duration)) {
        alert('Please choose a session duration (1, 2, or 3 hrs).');
        return;
      }
      const c = findCat(skill.category);
      const h = getHours(skill.duration);
      const cost = parseInt(skill.credit_cost, 10);
      if (isNaN(cost) || cost < c.min * h || cost > c.max * h) {
        alert(`Credit cost must be between ${c.min * h} and ${c.max * h} credits for a ${skill.duration} session in this category.`);
        return;
      }
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

  const activeCat = findCat(skill.category);
  const hours = DURATIONS.includes(skill.duration) ? getHours(skill.duration) : 1;
  const band  = { min: activeCat.min * hours, max: activeCat.max * hours };

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
                <p className="text-[10px] text-gray-400 mb-4">{band.min}–{band.max} cr range</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-[38px] font-bold leading-none" style={{ color: hasActiveSessions ? '#9ca3af' : activeCat.color }}>{skill.credit_cost}</span>
                  <span className="text-[14px] font-bold text-gray-400">cr</span>
                </div>
                <input 
                  type="range" 
                  name="credit_cost" 
                  min={band.min} 
                  max={band.max} 
                  value={skill.credit_cost} 
                  onChange={handleInputChange}
                  disabled={hasActiveSessions}
                  className={`w-full h-2 rounded-lg appearance-none transition-all ${hasActiveSessions ? 'cursor-not-allowed grayscale' : 'cursor-pointer'}`} 
                  style={{ accentColor: hasActiveSessions ? '#9ca3af' : activeCat.color }} 
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-300 mt-1.5">
                  <span>Min {band.min}</span><span>Max {band.max}</span>
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
                    {!DURATIONS.includes(skill.duration) && <option value={skill.duration}>{skill.duration} (old)</option>}
                    {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
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