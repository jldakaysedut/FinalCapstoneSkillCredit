import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import {
  ChefHat, Leaf, Hammer, Dumbbell, Scissors, Gamepad2, Wrench,
  BookOpen, PenLine, MessageCircle, Music2, Palette, Film, Briefcase,
  PiggyBank, Monitor, Code2, Sparkles, Check
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Coding & Tech',         icon: Code2,       color: 'text-lime-600',    bg: 'bg-lime-50' },
  { name: 'UI/UX Design',          icon: Monitor,     color: 'text-sky-500',     bg: 'bg-sky-50' },
  { name: 'Business & Freelance',  icon: Briefcase,   color: 'text-slate-600',   bg: 'bg-slate-50' },
  { name: 'Financial Literacy',    icon: PiggyBank,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { name: 'Writing & Content',     icon: PenLine,     color: 'text-teal-500',    bg: 'bg-teal-50' },
  { name: 'Art & Graphic Design',  icon: Palette,     color: 'text-rose-500',    bg: 'bg-rose-50' },
  { name: 'Video & Animation',     icon: Film,        color: 'text-amber-500',   bg: 'bg-amber-50' },
  { name: 'Languages & Speaking',  icon: MessageCircle, color: 'text-cyan-500',  bg: 'bg-cyan-50' },
  { name: 'School & Tutoring',     icon: BookOpen,    color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  { name: 'Health & Fitness',      icon: Dumbbell,    color: 'text-red-500',     bg: 'bg-red-50' },
  { name: 'Cooking & Baking',      icon: ChefHat,     color: 'text-orange-500',  bg: 'bg-orange-50' },
  { name: 'Singing & Instruments', icon: Music2,      color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
  { name: 'Gaming & Hobbies',      icon: Gamepad2,    color: 'text-violet-500',  bg: 'bg-violet-50' },
  { name: 'Beauty & Grooming',     icon: Scissors,    color: 'text-pink-500',    bg: 'bg-pink-50' },
  { name: 'Home & DIY',            icon: Hammer,      color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  { name: 'Gardening & Farming',   icon: Leaf,        color: 'text-green-500',   bg: 'bg-green-50' },
  { name: 'Electronics & Repair',  icon: Wrench,      color: 'text-blue-500',    bg: 'bg-blue-50' },
];

export default function SetupInterests() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(0); // Para sa loading bar

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/login');
      else setUser(user);
    };
    checkAuth();
  }, [navigate]);

  // ANIMATION EFFECT PARA SA LOADING BAR
  useEffect(() => {
    if (isSaving) {
      const startTime = Date.now();
      const duration = 4000; // 4 seconds
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);
        if (newProgress >= 100) clearInterval(interval);
      }, 50); // Update every 50ms for smooth bar movement
      return () => clearInterval(interval);
    }
  }, [isSaving]);

  const toggleCategory = (name) => {
    setSelected(prev => 
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0 || !user) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          interests: selected, 
          has_set_interests: true 
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // UX Trick: 4-second artificial delay for the loading screen
      await new Promise(resolve => setTimeout(resolve, 4000));

      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error(error);
      alert('Failed to save interests. Please try again.');
      setIsSaving(false);
    }
  };

  // 🚨 THE PREMIUM LOADING SCREEN 🚨
  if (isSaving) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        
        {/* Logo Container with Soft Glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 animate-pulse rounded-full" />
          <div className="w-28 h-28 bg-white rounded-[2rem] shadow-sm border border-emerald-50 flex items-center justify-center relative z-10">
            <img src="/logo.png" alt="SkillCredit Logo" className="w-16 h-16 object-contain animate-pulse" />
          </div>
        </div>
        
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">SkillCredit Setup</p>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Preparing your dashboard...</h2>
        <p className="text-[13px] text-gray-500 font-medium mb-12 max-w-[280px] text-center">
          Curating skills and building recommendations based on your selected interests.
        </p>

        {/* Dynamic Progress Bar */}
        <div className="w-full max-w-[260px] space-y-2.5">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
            <span className="text-gray-400">Loading resources</span>
            <span className="text-emerald-700">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

      </div>
    );
  }

  // NORMAL SELECTION SCREEN
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col">
        
        <div className="text-center mb-10 mt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-5 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">What are you interested in?</h1>
          <p className="text-gray-500 max-w-lg mx-auto font-medium">
            Pick a few topics you'd like to learn or teach. We'll use this to personalize your SkillCredit dashboard.
          </p>
        </div>

        <div className="flex-1 flex flex-wrap justify-center gap-3 md:gap-4 mb-12">
          {CATEGORIES.map(cat => {
            const isSelected = selected.includes(cat.name);
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                className={`relative flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? 'border-emerald-500 bg-emerald-50 shadow-[0_4px_16px_rgba(16,185,129,0.15)] scale-105' 
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white' : cat.bg}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : cat.color}`} />
                </div>
                <span className={`font-bold text-[14px] ${isSelected ? 'text-emerald-800' : 'text-gray-700'}`}>
                  {cat.name}
                </span>
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-white shadow-sm">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Sticky Bottom Bar */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-sm font-bold text-gray-500 hidden sm:block">
            {selected.length === 0 ? 'Select at least 1 topic' : `${selected.length} topics selected`}
          </p>
          <button
            onClick={handleSave}
            disabled={selected.length === 0 || isSaving}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}