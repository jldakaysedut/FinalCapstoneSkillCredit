import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { Briefcase, BookOpen, CalendarDays, Camera, ClipboardList, Clock3, Coins, ExternalLink, FileText, FolderOpen, Heart, Image, Lightbulb, Mail, Paperclip, Pencil, Star, Target, Trash2, X } from 'lucide-react';

const STAT_CONFIG = [
  { key: 'credits_balance', label: 'Credits',        icon: Coins, color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-100' },
  { key: 'sessionsTaught', label: 'Sessions Done',  icon: BookOpen, color: 'text-sky-600',     bg: 'bg-sky-50',      border: 'border-sky-100'     },
  { key: 'skillsCount',    label: 'Listings',        icon: ClipboardList, color: 'text-orange-500', bg: 'bg-orange-50',   border: 'border-orange-100'  },
  { key: 'avgRating',      label: 'Avg Rating',      icon: Star,     color: 'text-amber-500',  bg: 'bg-amber-50',    border: 'border-amber-100'   },
];

const RATING_DIMS = [
  { key: 'avgClarity',         label: 'Clarity',         icon: Lightbulb },
  { key: 'avgPatience',        label: 'Patience',        icon: Heart },
  { key: 'avgRelevance',       label: 'Relevance',       icon: Target },
  { key: 'avgProfessionalism', label: 'Professionalism', icon: Briefcase },
];

export default function Profile() {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [uploadingAvatar,  setUploadingAvatar]  = useState(false);
  const [pendingAvatarFile,setPendingAvatarFile]= useState(null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(null);
  const [user,             setUser]             = useState(null);
  const [profile,          setProfile]          = useState({
    full_name: '', bio: '', avatar_url: '', credits_balance: 0,
    role: '', created_at: '', availability_schedule: '', contact_info: ''
  });
  const [reviews,          setReviews]          = useState([]);
  const [mySkills,         setMySkills]         = useState([]);
  const [portfolioItems,   setPortfolioItems]   = useState([]);
  const [stats,            setStats]            = useState({
    avgRating: 0, totalReviews: 0, sessionsTaught: 0,
    avgClarity: 0, avgPatience: 0, avgRelevance: 0, avgProfessionalism: 0
  });
  const [activeTab,        setActiveTab]        = useState('Listings');
  const [isEditing,        setIsEditing]        = useState(false);

  const [showAddPortfolioModal,   setShowAddPortfolioModal]   = useState(false);
  const [isEditingPortfolioMode,  setIsEditingPortfolioMode]  = useState(false);
  const [editPortfolioId,         setEditPortfolioId]         = useState(null);
  const [portfolioCoverPreview,   setPortfolioCoverPreview]   = useState(null);
  const [newProject,              setNewProject]              = useState({ title: '', description: '', project_url: '', coverFile: null, attachmentFiles: [] });
  const [uploadingProject,        setUploadingProject]        = useState(false);
  const [selectedProject,         setSelectedProject]         = useState(null);

  useEffect(() => {
    let profileChannel = null;
    const fetchAllData = async () => {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { navigate('/login'); return; }
      setUser(currentUser);

      const { data: profileData } = await supabase.from('user_profiles').select('*').eq('id', currentUser.id).single();
      if (profileData) {
        setProfile({ full_name: profileData.full_name || '', bio: profileData.bio || '', avatar_url: profileData.avatar_url || '', credits_balance: profileData.credits_balance || 0, role: profileData.role || 'User', created_at: currentUser.created_at, availability_schedule: profileData.availability_schedule || '', contact_info: profileData.contact_info || '' });
      }

      const { data: reviewData } = await supabase.from('reviews').select('*').eq('instructor_id', currentUser.id).order('created_at', { ascending: false });
      let calculatedAvg = 0, sumClarity = 0, sumPatience = 0, sumRelevance = 0, sumProfessionalism = 0, totalOverallSum = 0;
      if (reviewData && reviewData.length > 0) {
        const enrichedReviews = await Promise.all(reviewData.map(async (rev) => {
          const { data: stud } = await supabase.from('user_profiles').select('full_name, avatar_url').eq('id', rev.student_id).single();
          const { data: skl }  = await supabase.from('skills').select('title').eq('id', rev.skill_id).single();
          return { ...rev, student: stud, skill: skl };
        }));
        setReviews(enrichedReviews);
        reviewData.forEach(r => {
          const base = Number(r.rating || 0), q1 = Number(r.q1_clarity || 0), q2 = Number(r.q2_patience || 0), q3 = Number(r.q3_relevance || 0), q4 = Number(r.q4_professionalism || 0);
          totalOverallSum += (base + q1 + q2 + q3 + q4) / 5;
          sumClarity += q1; sumPatience += q2; sumRelevance += q3; sumProfessionalism += q4;
        });
        calculatedAvg = parseFloat((totalOverallSum / reviewData.length).toFixed(1));
      }

      const totalRevCount = reviewData?.length || 0;
      const { count: taughtCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('instructor_id', currentUser.id).eq('status', 'completed');
      
      // 🚨 UPDATED QUERY: Added .eq('is_active', true) and .eq('status', 'approved')
      const { data: skillsData } = await supabase
        .from('skills')
        .select('*')
        .eq('instructor_id', currentUser.id)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
        
      if (skillsData) setMySkills(skillsData);
      
      const { data: portfolioData } = await supabase.from('portfolio_items').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
      if (portfolioData) setPortfolioItems(portfolioData);

      setStats({ avgRating: calculatedAvg, totalReviews: totalRevCount, sessionsTaught: taughtCount || 0, avgClarity: totalRevCount > 0 ? (sumClarity / totalRevCount).toFixed(1) : '0.0', avgPatience: totalRevCount > 0 ? (sumPatience / totalRevCount).toFixed(1) : '0.0', avgRelevance: totalRevCount > 0 ? (sumRelevance / totalRevCount).toFixed(1) : '0.0', avgProfessionalism: totalRevCount > 0 ? (sumProfessionalism / totalRevCount).toFixed(1) : '0.0' });
      setLoading(false);

      profileChannel = supabase.channel(`profile_page_${currentUser.id}`);
      profileChannel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${currentUser.id}` }, (payload) => {
        if (payload.new) setProfile(prev => ({ ...prev, credits_balance: payload.new.credits_balance, avatar_url: payload.new.avatar_url, bio: payload.new.bio, full_name: payload.new.full_name, availability_schedule: payload.new.availability_schedule, contact_info: payload.new.contact_info }));
      }).subscribe();
    };
    fetchAllData();
    return () => { if (profileChannel) supabase.removeChannel(profileChannel); };
  }, [navigate]);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('File size exceeds 5MB limit.');
    setPendingAvatarFile(file); setPendingAvatarUrl(URL.createObjectURL(file));
  };
  const cancelAvatarUpload = () => { setPendingAvatarFile(null); setPendingAvatarUrl(null); if (avatarInputRef.current) avatarInputRef.current.value = ''; };
  const handleAvatarSave = async () => {
    if (!pendingAvatarFile || !user) return;
    setUploadingAvatar(true);
    try {
      const fileExt = pendingAvatarFile.name.split('.').pop();
      const filePath = `${user.id}/${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, pendingAvatarFile, { upsert: true });
      if (uploadError) throw new Error("Failed to upload.");
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      cancelAvatarUpload();
    } catch (error) { alert(error.message || 'Failed to upload image.'); }
    finally { setUploadingAvatar(false); }
  };

  const handleSaveProfile = async () => {
    if (!profile.full_name.trim()) return alert("Name cannot be empty.");
    setSaving(true);
    try {
      const { error } = await supabase.from('user_profiles').update({ full_name: profile.full_name, bio: profile.bio, availability_schedule: profile.availability_schedule, contact_info: profile.contact_info }).eq('id', user.id);
      if (error) throw error;
      setIsEditing(false);
    } catch { alert('Failed to update profile.'); }
    finally { setSaving(false); }
  };

  const handlePortfolioCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) { setNewProject({ ...newProject, coverFile: file }); setPortfolioCoverPreview(URL.createObjectURL(file)); }
  };
  const removePortfolioCover = () => { setNewProject({ ...newProject, coverFile: null }); setPortfolioCoverPreview(null); };
  const removeAttachment = (index) => { const nf = [...newProject.attachmentFiles]; nf.splice(index, 1); setNewProject({ ...newProject, attachmentFiles: nf }); };
  const openEditPortfolio = (item) => {
    setNewProject({ title: item.project_title || '', description: item.project_description || '', project_url: item.project_url || '', coverFile: null, attachmentFiles: [] });
    setPortfolioCoverPreview(item.image_url || null); setIsEditingPortfolioMode(true); setEditPortfolioId(item.id); setSelectedProject(null); setShowAddPortfolioModal(true);
  };
  const handleAddPortfolio = async (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) return alert("Title is required.");
    setUploadingProject(true);
    try {
      let coverUrl = isEditingPortfolioMode ? portfolioCoverPreview : '';
      const uploadedAttachments = [];
      if (newProject.coverFile) {
        const fileExt = newProject.coverFile.name.split('.').pop();
        const filePath = `${user.id}/cover_${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('portfolios').upload(filePath, newProject.coverFile);
        if (!uploadError) coverUrl = supabase.storage.from('portfolios').getPublicUrl(filePath).data.publicUrl;
      }
      if (newProject.attachmentFiles.length > 0) {
        for (let file of newProject.attachmentFiles) {
          const filePath = `${user.id}/doc_${crypto.randomUUID()}.${file.name.split('.').pop()}`;
          const { error: attError } = await supabase.storage.from('portfolios').upload(filePath, file);
          if (!attError) uploadedAttachments.push({ name: file.name, url: supabase.storage.from('portfolios').getPublicUrl(filePath).data.publicUrl, type: file.type });
        }
      }
      if (isEditingPortfolioMode) {
        await supabase.from('portfolio_items').update({ project_title: newProject.title, project_description: newProject.description, image_url: coverUrl, project_url: newProject.project_url }).eq('id', editPortfolioId);
      } else {
        await supabase.from('portfolio_items').insert([{ user_id: user.id, project_title: newProject.title, project_description: newProject.description, image_url: coverUrl, project_url: newProject.project_url, attachments: uploadedAttachments }]);
      }
      const { data: updatedPortfolio } = await supabase.from('portfolio_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (updatedPortfolio) setPortfolioItems(updatedPortfolio);
      setNewProject({ title: '', description: '', project_url: '', coverFile: null, attachmentFiles: [] }); setPortfolioCoverPreview(null); setShowAddPortfolioModal(false); setIsEditingPortfolioMode(false);
    } catch { alert('Failed to save portfolio item.'); }
    finally { setUploadingProject(false); }
  };
  const handleDeletePortfolio = async (projectId) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from('portfolio_items').delete().eq('id', projectId);
    setPortfolioItems(prev => prev.filter(item => item.id !== projectId)); setSelectedProject(null);
  };

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading profile" className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-[1000px] animate-pulse px-6 py-6 md:px-8">
        <div className="mb-4 h-3 w-24 rounded bg-emerald-100" />
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-8 lg:w-[260px]">
            <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-emerald-50 p-4 shadow-sm"><div className="mb-3 h-20 w-20 rounded-2xl bg-emerald-100" /><div className="mb-2 h-4 w-32 rounded bg-gray-200" /><div className="mb-3 h-5 w-20 rounded-full bg-white" /><div className="mb-3 h-3 w-28 rounded bg-gray-100" /><div className="mb-4 h-10 w-full rounded-xl bg-gray-100" /><div className="h-9 w-full rounded-xl bg-white" /></div>
            <div className="grid grid-cols-2 gap-2">{[0,1,2,3].map(item => <div key={item} className="flex h-28 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-4"><div className="mb-2 h-5 w-5 rounded bg-gray-100" /><div className="mb-2 h-7 w-12 rounded bg-gray-200" /><div className="h-2.5 w-16 rounded bg-gray-100" /></div>)}</div>
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4"><div className="h-3 w-28 rounded bg-gray-200" />{[0,1,2,3].map(item => <div key={item} className="flex items-center gap-2"><div className="h-3 w-20 rounded bg-gray-100" /><div className="h-1.5 flex-1 rounded bg-gray-100" /></div>)}</div>
          </aside>
          <section className="min-w-0 flex-1"><div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5"><div className="mb-3 h-3 w-12 rounded bg-gray-200" /><div className="space-y-2"><div className="h-3 w-full rounded bg-gray-100" /><div className="h-3 w-5/6 rounded bg-gray-100" /></div></div><div className="mb-5 flex gap-2"><div className="h-9 w-24 rounded-xl bg-gray-200" /><div className="h-9 w-24 rounded-xl bg-gray-100" /><div className="h-9 w-24 rounded-xl bg-gray-100" /></div><div className="mb-5 space-y-2"><div className="h-3 w-28 rounded bg-gray-200" /><div className="h-3 w-64 max-w-full rounded bg-gray-100" /></div>{[0,1,2].map(item => <div key={item} className="mb-3 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4"><div className="h-16 w-16 rounded-xl bg-gray-100" /><div className="flex-1 space-y-2"><div className="h-3 w-24 rounded-full bg-emerald-50" /><div className="h-4 w-40 rounded bg-gray-200" /><div className="h-3 w-28 rounded bg-gray-100" /></div><div className="h-8 w-20 rounded-xl bg-gray-100" /></div>)}</section>
        </div>
      </div>
    </div>
  );

  const renderStars = (rating) => (
    <div className="flex gap-0.5">{[1,2,3,4,5].map(star => <Star key={star} className={`h-3.5 w-3.5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}</div>
  );

  const TABS = [
    { id: 'Listings',  dot: 'bg-orange-400', count: mySkills.length },
    { id: 'Portfolio', dot: 'bg-purple-400', count: portfolioItems.length },
    { id: 'Reviews',   dot: 'bg-amber-400',  count: reviews.length },
  ];

  const statValues = {
    credits_balance: profile.credits_balance,
    sessionsTaught:  stats.sessionsTaught,
    skillsCount:     mySkills.length,
    avgRating:       stats.avgRating > 0 ? stats.avgRating : '0.0',
  };

  return (
    <div className="min-h-screen" style={{ background: '#faf9f6' }}>
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-6">
        <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-700 mb-4">My Profile</p>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[260px] shrink-0 lg:sticky lg:top-8 flex flex-col gap-4">
            <div className="bg-emerald-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
              <div className="relative w-20 h-20 rounded-2xl bg-emerald-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center group mb-2">
                {pendingAvatarUrl ? (
                  <img src={pendingAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-emerald-800 uppercase">{profile.full_name.charAt(0)}</span>
                )}
                {!pendingAvatarFile && (
                  <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition">
                    <Camera className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-bold">Edit Photo</span>
                  </button>
                )}
                <input type="file" ref={avatarInputRef} onChange={handleAvatarSelect} className="hidden" accept="image/*" />
              </div>
              {pendingAvatarFile && (
                <div className="flex gap-2 mb-3">
                  <button onClick={cancelAvatarUpload} disabled={uploadingAvatar} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition font-bold"><X className="h-4 w-4" /></button>
                  <button onClick={handleAvatarSave} disabled={uploadingAvatar} className="px-4 h-8 bg-emerald-700 text-white rounded-full text-[11px] font-bold hover:bg-emerald-800 transition">{uploadingAvatar ? 'Saving...' : 'Save'}</button>
                </div>
              )}

              {isEditing ? (
                <input type="text" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="w-full text-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-900 text-[15px] outline-none focus:border-emerald-400 mb-2" />
              ) : (
                <h2 className="font-bold text-[15px] text-gray-900 mb-1">{profile.full_name}</h2>
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white text-emerald-700 border border-emerald-200 px-3 py-0.5 rounded-full mb-2">{profile.role}</span>

              <div className="flex flex-wrap gap-1 justify-center text-[10px] text-gray-400 font-medium mb-3">
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>

              {!isEditing ? (
                <div className="w-full space-y-2">
                  {profile.availability_schedule && (
                    <div className="flex items-center gap-2 text-left bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                      <Clock3 className="h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Availability</p>
                        <p className="text-[11px] font-bold text-gray-800">{profile.availability_schedule}</p>
                      </div>
                    </div>
                  )}
                  {profile.contact_info && (
                    <div className="flex items-center gap-2 text-left bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                      <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Contact</p>
                        <p className="text-[11px] font-bold text-gray-800">{profile.contact_info}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 text-left">Availability</p>
                    <input type="text" value={profile.availability_schedule} onChange={e => setProfile({ ...profile, availability_schedule: e.target.value })} placeholder="e.g., Weekdays 5PM-9PM" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-800 outline-none focus:border-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 text-left">Contact / Handle</p>
                    <input type="text" value={profile.contact_info} onChange={e => setProfile({ ...profile, contact_info: e.target.value })} placeholder="@handle or email" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-800 outline-none focus:border-emerald-400" />
                  </div>
                </div>
              )}

              <div className="mt-4 w-full">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-2 rounded-xl font-bold text-[11px] transition"><Pencil className="h-3.5 w-3.5 inline mr-1.5" />Edit Profile</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-[11px] transition">Cancel</button>
                    <button onClick={handleSaveProfile} disabled={saving} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold text-[11px] transition shadow-sm">{saving ? 'Saving...' : 'Save'}</button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {STAT_CONFIG.map(sc => (
                <div key={sc.key} className={`${sc.bg} border ${sc.border} rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:shadow-sm transition`}>
                  <sc.icon className={`h-5 w-5 mb-1 ${sc.color}`} strokeWidth={1.8} />
                  <span className={`text-2xl font-bold ${sc.color}`}>{statValues[sc.key]}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1 leading-tight">{sc.label}</span>
                </div>
              ))}
            </div>

            {stats.totalReviews > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Rating Breakdown</p>
                {RATING_DIMS.map(d => (
                  <div key={d.key} className="flex items-center gap-2 mb-2">
                    <d.icon className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.8} />
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-gray-500">{d.label}</span>
                        <span className="text-[10px] font-bold text-gray-800">{stats[d.key]}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(stats[d.key] / 5) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">About</p>
              {isEditing ? (
                <textarea value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-700 outline-none resize-none h-28 focus:border-emerald-400 transition" placeholder="Tell others about your expertise and skills..." />
              ) : (
                <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{profile.bio || 'No bio added yet. Click Edit Profile to introduce yourself to the community!'}</p>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 mb-5">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all ${
                      isActive ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : tab.dot}`} />
                    {tab.id}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-400'}`}>{tab.count}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'Listings' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Offered Skills</p>
                    <p className="text-[12px] text-gray-500">Manage the skills you offer on the platform</p>
                  </div>
                  <button onClick={() => navigate('/create-skill')} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[12px] font-bold shadow-sm transition">+ Create Listing</button>
                </div>

                {mySkills.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-2xl mb-3"><ClipboardList className="h-6 w-6 text-orange-500" /></div>
                    <p className="font-bold text-gray-900 mb-1">No listings yet</p>
                    <p className="text-[12px] text-gray-400 mb-4">Share your expertise with the community</p>
                    <button onClick={() => navigate('/create-skill')} className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-[12px] font-bold shadow-sm hover:bg-emerald-800 transition">Create First Listing</button>
                  </div>
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-3">
                      {mySkills.map(skill => (
                        <div key={skill.id} className="relative">
                          <div className="absolute -left-6 top-5 w-[18px] h-[18px] rounded-full border-2 border-white ring-2 ring-gray-100 bg-orange-400 shadow-sm z-10" />
                          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-[0_4px_16px_rgba(16,185,129,0.08)] hover:border-emerald-200 transition-all">
                            <div onClick={() => navigate(`/skill/${skill.id}`)} className="w-full sm:w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 cursor-pointer border border-gray-100">
                              {skill.cover_image_url ? <img src={skill.cover_image_url} alt={skill.title} className="w-full h-full object-cover hover:scale-105 transition" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase">No Cover</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {skill.category && <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">{skill.category}</span>}
                                {skill.status === 'approved' && <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">✅ Approved</span>}
                              </div>
                              <h4 onClick={() => navigate(`/skill/${skill.id}`)} className="font-bold text-[14px] text-gray-900 cursor-pointer hover:text-emerald-700 transition truncate">{skill.title}</h4>
                              <p className="text-[12px] text-gray-500 mt-0.5">{skill.credit_cost} cr/hr · {skill.mode || 'Online'}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => navigate(`/skill/${skill.id}`)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl text-[11px] font-bold transition">View</button>
                              <button onClick={() => navigate(`/edit-skill/${skill.id}`)} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold transition"><Pencil className="h-3.5 w-3.5 inline mr-1.5" />Edit</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Portfolio' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Portfolio & Showcase</p>
                    <p className="text-[12px] text-gray-500">Your work, projects, and achievements</p>
                  </div>
                  <button onClick={() => { setShowAddPortfolioModal(true); setIsEditingPortfolioMode(false); setNewProject({ title: '', description: '', project_url: '', coverFile: null, attachmentFiles: [] }); setPortfolioCoverPreview(null); }} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[12px] font-bold shadow-sm transition">+ Add Project</button>
                </div>

                {portfolioItems.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center text-2xl mb-3"><FolderOpen className="h-6 w-6 text-purple-500" /></div>
                    <p className="font-bold text-gray-900 mb-1">No portfolio items yet</p>
                    <p className="text-[12px] text-gray-400 mb-4">Showcase your best work to attract learners</p>
                    <button onClick={() => setShowAddPortfolioModal(true)} className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-[12px] font-bold shadow-sm hover:bg-emerald-800 transition">Add First Project</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {portfolioItems.map(item => (
                      <div key={item.id} onClick={() => setSelectedProject(item)} className="bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)] hover:border-emerald-200 transition-all group">
                        <div className="h-40 bg-gray-100 overflow-hidden relative">
                          {item.image_url ? <img src={item.image_url} alt={item.project_title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100"><FolderOpen className="h-10 w-10 text-purple-400" /></div>}
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-[14px] text-gray-900 truncate mb-1">{item.project_title}</h4>
                          <p className="text-[12px] text-gray-500 line-clamp-2">{item.project_description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Reviews' && (
              <div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Overall Performance</p>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-gray-900">{stats.avgRating > 0 ? stats.avgRating : '—'}</p>
                      <div className="flex justify-center mt-1">{renderStars(Math.round(stats.avgRating))}</div>
                      <p className="text-[11px] text-gray-400 font-medium mt-1">{stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}</p>
                    </div>
                    <div className="flex-1 min-w-[180px] space-y-2">
                      {RATING_DIMS.map(d => (
                        <div key={d.key} className="flex items-center gap-2">
                          <d.icon className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.8} />
                          <span className="text-[11px] font-bold text-gray-500 w-28">{d.label}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats[d.key] / 5) * 100}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 w-6 text-right">{stats[d.key]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center text-2xl mb-3"><Star className="h-6 w-6 fill-amber-400 text-amber-400" /></div>
                    <p className="font-bold text-gray-900 mb-1">No reviews yet</p>
                    <p className="text-[12px] text-gray-400">Complete sessions to receive student feedback</p>
                  </div>
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-4">
                      {reviews.map(review => (
                        <div key={review.id} className="relative">
                          <div className="absolute -left-6 top-5 w-[18px] h-[18px] rounded-full border-2 border-white ring-2 ring-gray-100 bg-amber-400 shadow-sm z-10" />
                          <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-[0_4px_16px_rgba(16,185,129,0.08)] hover:border-emerald-200 transition-all">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <div onClick={() => navigate(`/user/${review.student_id}`)} className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center overflow-hidden border border-emerald-100 cursor-pointer shrink-0">
                                  {review.student?.avatar_url ? <img src={review.student.avatar_url} className="w-full h-full object-cover" alt="" /> : review.student?.full_name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <p className="font-bold text-[13px] text-gray-900">{review.student?.full_name || 'Student'}</p>
                                  <p className="text-[11px] text-gray-400">{review.skill?.title || 'Session'}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                {renderStars(review.rating)}
                                <span className="text-[10px] text-gray-400 mt-0.5">{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            </div>
                            {review.comment && <p className="text-[13px] text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">{review.comment}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddPortfolioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-0.5">Portfolio</p><h3 className="text-xl font-bold text-gray-900">{isEditingPortfolioMode ? 'Edit Project' : 'Add New Project'}</h3></div>
              <button onClick={() => setShowAddPortfolioModal(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAddPortfolio} className="space-y-4">
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Project Title *</label><input type="text" value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold text-gray-800 outline-none focus:border-emerald-500" required /></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Description</label><textarea value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-800 outline-none resize-none focus:border-emerald-500" /></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Project URL</label><input type="url" value={newProject.project_url} onChange={e => setNewProject({ ...newProject, project_url: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-800 outline-none focus:border-emerald-500" placeholder="https://..." /></div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Cover Image</label>
                {portfolioCoverPreview ? (
                  <div className="relative h-40 rounded-xl overflow-hidden border border-gray-200">
                    <img src={portfolioCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                    <button type="button" onClick={removePortfolioCover} className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-[11px] font-bold"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 bg-gray-50 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-400 transition">
                    <Image className="h-7 w-7 mb-1" />
                    <span className="text-[12px] font-bold text-gray-500">Upload Cover Image</span>
                    <input type="file" accept="image/*" onChange={handlePortfolioCoverChange} className="hidden" />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Attachments</label>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-emerald-300 rounded-xl cursor-pointer text-[12px] font-bold text-gray-600 transition w-fit">
                  <Paperclip className="h-4 w-4" /> Attach Files
                  <input type="file" multiple onChange={e => setNewProject({ ...newProject, attachmentFiles: [...newProject.attachmentFiles, ...Array.from(e.target.files)] })} className="hidden" />
                </label>
                {newProject.attachmentFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {newProject.attachmentFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                        <span className="text-[11px] font-bold text-gray-700 truncate">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(i)} className="text-red-400 hover:text-red-600 font-bold text-sm ml-2"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddPortfolioModal(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[12px] font-bold transition">Cancel</button>
                <button type="submit" disabled={uploadingProject} className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[12px] font-bold shadow-sm transition">{uploadingProject ? 'Saving...' : isEditingPortfolioMode ? 'Update Project' : 'Add Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
            {selectedProject.image_url && <div className="h-52 overflow-hidden rounded-t-2xl"><img src={selectedProject.image_url} alt={selectedProject.project_title} className="w-full h-full object-cover" /></div>}
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-900">{selectedProject.project_title}</h3>
                <button onClick={() => setSelectedProject(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold shrink-0 ml-2"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed mb-4">{selectedProject.project_description}</p>
              {selectedProject.project_url && <a href={selectedProject.project_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 hover:underline mb-4"><ExternalLink className="h-3.5 w-3.5" />View Project</a>}
              {selectedProject.attachments?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Attachments</p>
                  {selectedProject.attachments.map((att, i) => <a key={i} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[12px] font-bold text-gray-700 hover:border-emerald-200 transition mb-1"><FileText className="h-4 w-4 shrink-0 text-gray-400" />{att.name}</a>)}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => openEditPortfolio(selectedProject)} className="flex-1 py-2.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-[12px] transition"><Pencil className="h-3.5 w-3.5 inline mr-1.5" />Edit</button>
                <button onClick={() => handleDeletePortfolio(selectedProject.id)} className="flex-1 py-2.5 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 rounded-xl font-bold text-[12px] transition"><Trash2 className="h-3.5 w-3.5 inline mr-1.5" />Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}