import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, Briefcase, Check, ChefHat, Clock,
  Code2, Dumbbell, ExternalLink, FileText, Film, Gamepad2, Hammer,
  Leaf, MessageCircle, Monitor, Music2, Palette, PenLine,
  PiggyBank, Rocket, Scissors, Settings, Sparkles, Target, Video, Wrench, X
} from 'lucide-react';
import supabase from '../../supabaseClient';
​
const SKILL_CATEGORIES = [
  { name: 'Cooking & Baking',                      tier: 'Tier 1', min: 9,  max: 22,  icon: ChefHat, iconColor: 'text-orange-500', color: '#f97316' },
  { name: 'Gardening & Farming',                   tier: 'Tier 1', min: 9,  max: 18,  icon: Leaf, iconColor: 'text-green-500', color: '#22c55e' },
  { name: 'Home & DIY',                            tier: 'Tier 1', min: 9,  max: 20,  icon: Hammer, iconColor: 'text-yellow-600', color: '#a78bfa' },
  { name: 'Health & Fitness',                      tier: 'Tier 1', min: 9,  max: 25,  icon: Dumbbell, iconColor: 'text-red-500', color: '#ef4444' },
  { name: 'Beauty & Grooming',                     tier: 'Tier 1', min: 9,  max: 20,  icon: Scissors, iconColor: 'text-pink-500', color: '#ec4899' },
  { name: 'Gaming & Hobbies',                      tier: 'Tier 1', min: 9,  max: 20,  icon: Gamepad2, iconColor: 'text-violet-500', color: '#6366f1' },
  { name: 'Electronics, Appliance & Basic Repair', tier: 'Tier 2', min: 17, max: 42,  icon: Wrench, iconColor: 'text-blue-500', color: '#64748b' },
  { name: 'School & Tutoring',                     tier: 'Tier 2', min: 19, max: 39,  icon: BookOpen, iconColor: 'text-indigo-500', color: '#0ea5e9' },
  { name: 'Writing & Content',                     tier: 'Tier 2', min: 17, max: 45,  icon: PenLine, iconColor: 'text-teal-500', color: '#8b5cf6' },
  { name: 'Languages & Speaking',                  tier: 'Tier 2', min: 21, max: 42,  icon: MessageCircle, iconColor: 'text-cyan-500', color: '#14b8a6' },
  { name: 'Singing & Instruments',                 tier: 'Tier 2', min: 17, max: 47,  icon: Music2, iconColor: 'text-fuchsia-500', color: '#f43f5e' },
  { name: 'Art & Graphic Design',                  tier: 'Tier 2', min: 19, max: 52,  icon: Palette, iconColor: 'text-rose-500', color: '#f59e0b' },
  { name: 'Video & Animation',                     tier: 'Tier 2', min: 22, max: 56,  icon: Film, iconColor: 'text-amber-500', color: '#dc2626' },
  { name: 'Business & Freelance',                  tier: 'Tier 3', min: 28, max: 75,  icon: Briefcase, iconColor: 'text-slate-600', color: '#0d9488' },
  { name: 'Financial Literacy & Money Management', tier: 'Tier 3', min: 25, max: 60,  icon: PiggyBank, iconColor: 'text-emerald-600', color: '#ca8a04' },
  { name: 'UI/UX Design',                          tier: 'Tier 3', min: 38, max: 94,  icon: Monitor,        iconColor: 'text-sky-500', color: '#7c3aed' },
  { name: 'Coding & Tech',                         tier: 'Tier 3', min: 38, max: 100, icon: Code2,    iconColor: 'text-lime-600', color: '#10b981' },
];
​
const STEPS = [
  { num: 1, label: 'Category',      icon: Target },
  { num: 2, label: 'Skill Info',    icon: PenLine },
  { num: 3, label: 'Session Setup', icon: Settings },
  { num: 4, label: 'Publish',       icon: Rocket },
];
​
export default function CreateSkill() {
  const navigate = useNavigate();
  const [step, setStep]                 = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading]   = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState({ full_name: 'Me', avatar_url: '', booking_restricted_until: null });
  const fileInputRef = useRef(null);
  const [coverImage, setCoverImage] = useState(null);
  const [previewUrl, setPreviewUrl]  = useState(null);
  const [formData, setFormData] = useState({
    title: '', category: 'Coding & Tech', description: '', outcomes: '',
    format: 'Video Call', duration: '1 hr', creditCost: '38', portfolioUrl: ''
  });
​
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // FETCH NATHIN ANG BOOKING RESTRICTION COLUMN
        const { data: p } = await supabase.from('user_profiles').select('full_name,avatar_url,booking_restricted_until').eq('id', user.id).single();
        if (p) setCurrentUserProfile(p);
      }
      setPageLoading(false);
    })();
  }, []);
​
  // ─── BOOKING RESTRICTION CHECKER ───
  const checkRestriction = () => {
    if (currentUserProfile?.booking_restricted_until) {
      const restrictionEnd = new Date(currentUserProfile.booking_restricted_until);
      if (restrictionEnd > new Date()) {
        const timeOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        alert(`Action blocked: Your account is temporarily restricted from creating or booking sessions until ${restrictionEnd.toLocaleString(undefined, timeOptions)} due to a Trust & Safety violation.`);
        return true; 
      }
    }
    return false; 
  };
​
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);
​
  const cat = SKILL_CATEGORIES.find(c => c.name === formData.category) || SKILL_CATEGORIES.at(-1);
  const CategoryIcon = cat.icon;
  const getFormatIcon = f => ({ 'Video Call': Video, 'Chat/Text': MessageCircle, 'Docs': FileText, 'All Formats': Sparkles }[f] ?? Sparkles);
  const FormatIcon = getFormatIcon(formData.format);
​
  const handleChange = e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleCategorySelect = name => {
    const c = SKILL_CATEGORIES.find(x => x.name === name);
    setFormData(p => ({ ...p, category: name, creditCost: String(c.min) }));
  };
  const handleImageChange = e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5e6) { alert('Max 5MB'); return; }
    setCoverImage(file); setPreviewUrl(URL.createObjectURL(file));
  };
  const handleRemoveImage = e => {
    e.stopPropagation(); setCoverImage(null); setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleNext = () => {
    if (checkRestriction()) return; // 🔒 Guard: Harangin kapag restricted bago mag proceed
    if (step === 2 && (!formData.title.trim() || !formData.description.trim() || !formData.outcomes.trim())) {
      alert('Fill in all required fields.'); return;
    }
    setStep(s => s + 1);
  };
  
  const handlePrev  = () => setStep(s => s - 1);
  
  const handlePublish = async e => {
    e.preventDefault(); 
    if (checkRestriction()) return; // 🔒 Guard check again bago mag publish
    setIsSubmitting(true);
    try {
      const { data: { user }, error: ue } = await supabase.auth.getUser();
      if (ue || !user) { alert('Auth error.'); return; }
      let imgUrl = null;
      if (coverImage) {
        const fn = `${user.id}-${Date.now()}.${coverImage.name.split('.').pop()}`;
        const { error: upe } = await supabase.storage.from('skill_covers').upload(fn, coverImage);
        if (!upe) { const { data: p } = supabase.storage.from('skill_covers').getPublicUrl(fn); imgUrl = p.publicUrl; }
      }
      const { error: dbe } = await supabase.from('skills').insert([{
        instructor_id: user.id, title: formData.title, category: formData.category,
        description: formData.description, outcomes: formData.outcomes, format: formData.format,
        duration: formData.duration, credit_cost: parseInt(formData.creditCost),
        portfolio_url: formData.portfolioUrl || null, cover_image_url: imgUrl,
        status: 'pending' // 🚨 ADDED PENDING STATUS
      }]);
      if (dbe) throw dbe;
      // 🚨 CHANGED REDIRECT TO MY LISTINGS
      alert('Skill submitted successfully! It is now In Review and waiting for Moderator approval.'); navigate('/my-listings');
    } catch (err) { alert('Error: ' + err.message); }
    finally { setIsSubmitting(false); }
  };
​
  if (pageLoading) return (
    <div role="status" aria-live="polite" aria-label="Loading create skill form" className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-[1000px] animate-pulse px-6 py-6 md:px-8">
        <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl bg-emerald-900 px-6 py-5 shadow-md sm:flex-row sm:items-center"><div className="space-y-2"><div className="h-3 w-28 rounded bg-emerald-700" /><div className="h-6 w-48 rounded bg-emerald-700" /><div className="h-3 w-56 rounded bg-emerald-800" /></div><div className="flex items-center gap-2">{[0,1,2,3].map(item => <div key={item} className="h-12 w-12 rounded-xl border border-white/10 bg-white/10" />)}</div></div>
        <div className="flex flex-col items-start gap-5 lg:flex-row">
          <aside className="w-full shrink-0 space-y-3 lg:w-[250px]"><div className="h-3 w-24 rounded bg-gray-200" /><div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="h-44 bg-emerald-100" /><div className="space-y-3 p-4"><div className="h-4 w-3/4 rounded bg-gray-200" /><div className="h-3 w-1/2 rounded bg-gray-100" /><div className="h-3 w-2/3 rounded bg-gray-100" /><div className="h-8 w-full rounded-xl bg-gray-100" /></div></div></aside>
          <main className="min-w-0 flex-1 space-y-5"><div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"><div className="mb-5 h-4 w-32 rounded bg-gray-200" /><div className="grid grid-cols-1 gap-5 md:grid-cols-2"><div className="space-y-2"><div className="h-3 w-20 rounded bg-gray-100" /><div className="h-11 rounded-xl bg-gray-100" /></div><div className="space-y-2"><div className="h-3 w-24 rounded bg-gray-100" /><div className="h-11 rounded-xl bg-gray-100" /></div></div><div className="mt-5 space-y-2"><div className="h-3 w-28 rounded bg-gray-100" /><div className="h-24 rounded-xl bg-gray-100" /></div><div className="mt-5 grid grid-cols-2 gap-5"><div className="h-11 rounded-xl bg-gray-100" /><div className="h-11 rounded-xl bg-gray-100" /></div></div><div className="flex justify-between"><div className="h-10 w-24 rounded-xl bg-gray-200" /><div className="h-10 w-28 rounded-xl bg-emerald-100" /></div></main>
        </div>
      </div>
    </div>
  );
​
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-6">
        <div className="rounded-2xl mb-5 overflow-hidden shadow-md"
          style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 45%,#047857 100%)' }}>
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mb-0.5">Instructor Studio</p>
              <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">Create a New Listing</h1>
              <p className="text-[12px] text-emerald-300 mt-0.5">4 steps to share your skill with learners</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {STEPS.map((s, i) => {
                const StepIcon = s.icon;
                return (
                  <div key={s.num} className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => step > s.num && setStep(s.num)}
                      className={`flex flex-col items-center px-3 py-2 rounded-xl border transition-all ${
                        step === s.num  ? 'bg-white/20 border-white/30 scale-105'
                        : step > s.num  ? 'bg-white/10 border-white/15 hover:bg-white/15 cursor-pointer'
                        : 'bg-white/5 border-white/5 opacity-40 cursor-default'
                      }`}>
                      <span className="text-[15px] font-bold text-white">{step > s.num ? <Check className="w-4 h-4" /> : s.num}</span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-300 hidden sm:flex mt-0.5"><StepIcon className="w-3 h-3" /> {s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className="w-4 h-px" style={{ background: step > s.num ? '#6ee7b7' : '#ffffff30' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
​
        <div className="flex flex-col lg:flex-row gap-5 items-start">
​
          <div className="w-full lg:w-[250px] shrink-0">
            <div className="sticky top-6 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">Live Preview</p>
​
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm relative">
                <div className="relative h-44 flex items-center justify-center overflow-hidden"
                  style={{ background: previewUrl ? 'transparent' : cat.color }}>
                  {previewUrl
                    ? <img src={previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : (
                      <>
                        <CategoryIcon className="w-24 h-24 text-white opacity-20 select-none" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                          <CategoryIcon className="w-10 h-10 text-white" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">{cat.tier}</span>
                        </div>
                      </>
                    )}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-black/30 backdrop-blur-sm">
                    <span className="font-bold text-[14px] text-white">{formData.creditCost}</span>
                    <span className="text-[10px] text-white/70 ml-0.5">cr</span>
                  </div>
                </div>
​
                <div className="absolute top-[152px] left-4 p-0.5 bg-white rounded-xl shadow-md border border-gray-100 z-20">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white overflow-hidden"
                    style={{ background: cat.color }}>
                    {currentUserProfile.avatar_url
                      ? <img src={currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      : currentUserProfile.full_name?.charAt(0) || 'U'}
                  </div>
                </div>
​
                <div className="p-4 pt-8">
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border"
                      style={{ color: cat.color, borderColor: cat.color+'40', background: cat.color+'12' }}>
                      <CategoryIcon className={`w-3.5 h-3.5 ${cat.iconColor}`} /> {formData.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-[15px] text-gray-900 tracking-tight leading-snug mb-1 min-h-[20px]">
                    {formData.title || <span className="text-gray-300 font-medium text-[13px]">Skill title…</span>}
                  </h3>
                  <p className="text-[11px] text-gray-400 line-clamp-2 mb-4 min-h-[32px]">
                    {formData.description || 'Description will show here…'}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-xl">
                      <FormatIcon className="inline w-3.5 h-3.5 mr-1 align-[-0.15em]" /> {formData.format}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-xl"><Clock className="w-3.5 h-3.5" /> {formData.duration}</span>
                  </div>
                </div>
              </div>
​
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Tier',   value: cat.tier.replace('Tier ','T'), color: cat.color },
                  { label: 'Min',    value: cat.min+'cr',                  color: '#10b981' },
                  { label: 'Max',    value: cat.max+'cr',                  color: '#f59e0b' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white border border-gray-200 rounded-xl p-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">{label}</p>
                    <p className="text-[12px] font-bold mt-0.5" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
​
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-3">Progress</p>
                {[
                  { label: 'Category chosen', done: true },
                  { label: 'Title added',      done: !!formData.title },
                  { label: 'Description',      done: !!formData.description },
                  { label: 'Outcomes filled',  done: !!formData.outcomes },
                  { label: 'Cover uploaded',   done: !!previewUrl },
                  { label: 'Portfolio link',   done: !!formData.portfolioUrl },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2 mb-2 last:mb-0">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                      done ? 'text-white' : 'bg-gray-100 text-gray-300'
                    }`} style={done ? { background: cat.color } : {}}>{done ? <Check className="w-3 h-3" /> : null}</div>
                    <p className={`text-[11px] font-medium ${done ? 'text-gray-700' : 'text-gray-300'}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
​
          <div className="flex-1 min-w-0">
​
            {step === 1 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Step 1 · Pick a Category</p>
                <p className="text-[12px] text-gray-400 mb-5">Sets your credit price range and tier badge.</p>
​
                {['Tier 1','Tier 2','Tier 3'].map(tier => (
                  <div key={tier} className="mb-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-2">{tier}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SKILL_CATEGORIES.filter(c => c.tier === tier).map(c => {
                        const isSel = formData.category === c.name;
                        const CategoryIcon = c.icon;
                        return (
                          <button key={c.name} type="button"
                            onClick={() => handleCategorySelect(c.name)}
                            className="group relative p-3 rounded-2xl border-2 text-left transition-all overflow-hidden"
                            style={{
                              borderColor: isSel ? c.color         : 'transparent',
                              background:  isSel ? c.color+'14'    : '#fff',
                              boxShadow:   isSel
                                ? `0 0 0 1px ${c.color}35, 0 4px 12px ${c.color}20`
                                : '0 1px 3px rgba(0,0,0,0.05)',
                            }}>
                            {isSel && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm"
                                style={{ background: c.color }}><Check className="w-3.5 h-3.5" /></div>
                            )}
                            <CategoryIcon className={`absolute -right-2 -bottom-2 w-12 h-12 opacity-[0.07] select-none pointer-events-none ${c.iconColor}`} />
                            <CategoryIcon className={`w-7 h-7 block mb-1.5 relative z-10 ${c.iconColor}`} />
                            <p className="text-[11px] font-bold tracking-tight text-gray-800 leading-tight relative z-10">{c.name}</p>
                            <p className="text-[10px] font-bold mt-1 relative z-10"
                              style={{ color: isSel ? c.color : '#d1d5db' }}>
                              {c.min}–{c.max} credits
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
​
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl border"
                    style={{ color: cat.color, borderColor: cat.color+'40', background: cat.color+'10' }}>
                    <CategoryIcon className={`inline w-3.5 h-3.5 mr-1 align-[-0.15em] ${cat.iconColor}`} /> {formData.category} · {cat.tier} · {cat.min}–{cat.max} cr
                  </span>
                  <button type="button" onClick={() => setStep(1)}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-600 underline">Change</button>
                </div>
​
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Cover Image</p>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                  <div onClick={() => !previewUrl && fileInputRef.current.click()}
                    className="border border-dashed rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer transition overflow-hidden relative"
                    style={{ borderColor: cat.color+'50', background: cat.color+'06' }}>
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        <button type="button" onClick={handleRemoveImage}
                          aria-label="Remove cover image" className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center z-10"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <><CategoryIcon className={`w-7 h-7 mb-1 ${cat.iconColor}`} />
                      <p className="text-[11px] font-semibold" style={{ color: cat.color }}>Click to upload cover</p>
                      <p className="text-[10px] text-gray-400">Max 5MB</p></>
                    )}
                  </div>
                </div>
​
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Skill Title <span className="text-rose-400">*</span></p>
                      <input type="text" name="title" value={formData.title} onChange={handleChange}
                        placeholder="e.g. Master React & Tailwind"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium bg-gray-50 outline-none transition"
                        onFocus={e => e.target.style.boxShadow=`0 0 0 3px ${cat.color}30`}
                        onBlur={e => e.target.style.boxShadow=''} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Portfolio Link <span className="text-gray-300">(opt)</span></p>
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input type="url" name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange}
                          placeholder="https://github.com/..."
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-9 text-[13px] font-medium bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Description <span className="text-rose-400">*</span></p>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
                      placeholder="What is this session about?"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Learner Outcomes <span className="text-rose-400">*</span></p>
                    <textarea name="outcomes" value={formData.outcomes} onChange={handleChange} rows={2}
                      placeholder="What will learners walk away with?"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                  </div>
                </div>
              </div>
            )}
​
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Teaching Format</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Video Call', Video, 'Live 1-on-1 interactive'],
                      ['Chat/Text', MessageCircle, 'Q&A via messaging'],
                      ['Docs', FileText, 'PDFs & file guides'],
                      ['All Formats', Sparkles, 'Mixed combination'],
                    ].map(([f, FormatIcon, desc]) => (
                      <div key={f} onClick={() => setFormData(p => ({ ...p, format: f }))}
                        className="p-4 rounded-xl border-2 cursor-pointer transition-all"
                        style={{
                          borderColor: formData.format === f ? cat.color : '#f3f4f6',
                          background:  formData.format === f ? cat.color+'0d' : '#fff',
                        }}>
                        <FormatIcon className="w-7 h-7 block mb-1 text-emerald-700" style={{ color: cat.color }} />
                        <p className="text-[12px] font-bold text-gray-800">{f}</p>
                        <p className="text-[10px] text-gray-400">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
​
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Duration</p>
                    <div className="space-y-2">
                      {['30 mins','1 hr','4 hrs'].map(d => (
                        <button key={d} type="button" onClick={() => setFormData(p => ({ ...p, duration: d }))}
                          className="w-full py-2.5 rounded-xl border-2 text-[12px] font-bold transition-all"
                          style={{
                            borderColor: formData.duration === d ? cat.color : '#f3f4f6',
                            color:       formData.duration === d ? cat.color : '#9ca3af',
                            background:  formData.duration === d ? cat.color+'0d' : '#fff',
                          }}>{d}</button>
                      ))}
                    </div>
                  </div>
​
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Credit Cost</p>
                    <p className="text-[10px] text-gray-400 mb-4">{cat.min}–{cat.max} cr range</p>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-[38px] font-bold leading-none" style={{ color: cat.color }}>{formData.creditCost}</span>
                      <span className="text-[14px] font-bold text-gray-400">cr</span>
                    </div>
                    <input type="range" name="creditCost" min={cat.min} max={cat.max} value={formData.creditCost} onChange={handleChange}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ accentColor: cat.color }} />
                    <div className="flex justify-between text-[10px] font-bold text-gray-300 mt-1.5">
                      <span>Min {cat.min}</span><span>Max {cat.max}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
​
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">Review your listing</p>
​
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  {[
                    { label: 'Category',    value: formData.category,                              icon: cat.icon, iconColor: cat.iconColor, sub: cat.tier },
                    { label: 'Title',       value: formData.title || '—',                          sub: null },
                    { label: 'Format',      value: formData.format,                                icon: getFormatIcon(formData.format), iconColor: 'text-emerald-600', sub: null },
                    { label: 'Duration',    value: formData.duration,                              sub: null },
                    { label: 'Credit Cost', value: `${formData.creditCost} credits`,               sub: `${cat.min}–${cat.max} range` },
                    { label: 'Portfolio',   value: formData.portfolioUrl || 'Not provided',        sub: null },
                  ].map(({ label, value, sub, icon: Icon, iconColor }, i) => (
                    <div key={label} className={`flex items-center justify-between px-5 py-3.5 ${
                      i < 5 ? 'border-b border-gray-100' : ''
                    }`}>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                        {sub && <p className="text-[10px] text-gray-300 mt-0.5">{sub}</p>}
                      </div>
                      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900 truncate max-w-[60%] text-right">{Icon && <Icon className={`w-4 h-4 shrink-0 ${iconColor || 'text-gray-500'}`} />}{value}</p>
                    </div>
                  ))}
                </div>
​
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[12px] font-semibold text-emerald-800">Looking great! Ready to publish?</p>
                    <p className="text-[11px] text-emerald-700/70">It will be reviewed by our moderation team shortly.</p>
                  </div>
                </div>
              </div>
            )}
​
            <div className="mx-auto mt-5 grid w-full max-w-[340px] grid-cols-2 gap-3">
              <button onClick={handlePrev} disabled={step === 1}
                className={`inline-flex h-11 w-full items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-[12px] font-bold text-gray-600 transition-all hover:border-gray-300 ${
                  step === 1 ? 'opacity-0 pointer-events-none' : ''
                }`}><ArrowLeft className="h-3.5 w-3.5" />Back</button>
​
              {step < 4
                ? <button onClick={handleNext}
                    className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-xl px-3 text-[12px] font-bold text-white shadow-sm transition-all hover:opacity-90"
                    style={{ background: cat.color }}>Next Step <ArrowRight className="h-3.5 w-3.5" /></button>
                : <button onClick={handlePublish} disabled={isSubmitting}
                    className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-xl px-3 text-[12px] font-bold text-white shadow-md transition-all hover:opacity-90"
                    style={{ background: isSubmitting ? '#9ca3af' : cat.color }}>
                    {isSubmitting ? <><Clock className="h-3.5 w-3.5 animate-pulse" />Publishing...</> : <><Rocket className="h-3.5 w-3.5" />Submit for Review</>}
                  </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}