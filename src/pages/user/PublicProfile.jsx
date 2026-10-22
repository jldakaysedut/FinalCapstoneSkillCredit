import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { ArrowLeft, ArrowRight, Briefcase, BookOpen, CalendarDays, CalendarPlus, Clock3, ClipboardList, Coins, Download, ExternalLink, FolderOpen, Heart, Lightbulb, Mail, Paperclip, SearchX, Star, Target, X } from 'lucide-react';

const STAT_CONFIG = [
  { key: 'credits_balance', label: 'Credits',       icon: Coins, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { key: 'sessionsTaught', label: 'Sessions Done', icon: BookOpen, color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-100'     },
  { key: 'skillsCount',    label: 'Listings',       icon: ClipboardList, color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-100'  },
  { key: 'avgRating',      label: 'Avg Rating',     icon: Star, color: 'text-amber-500',  bg: 'bg-amber-50',   border: 'border-amber-100'   },
];

const RATING_DIMS = [
  { key: 'avgClarity',         label: 'Clarity',         icon: Lightbulb },
  { key: 'avgPatience',        label: 'Patience',        icon: Heart },
  { key: 'avgRelevance',       label: 'Relevance',       icon: Target },
  { key: 'avgProfessionalism', label: 'Professionalism', icon: Briefcase },
];

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading,        setLoading]        = useState(true);
  const [profile,        setProfile]        = useState({ full_name:'',bio:'',avatar_url:'',credits_balance:0,role:'',created_at:'',availability_schedule:'',contact_info:'' });
  const [reviews,        setReviews]        = useState([]);
  const [userSkills,     setUserSkills]     = useState([]);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [stats,          setStats]          = useState({ avgRating:0,totalReviews:0,sessionsTaught:0,avgClarity:0,avgPatience:0,avgRelevance:0,avgProfessionalism:0 });
  const [activeTab,      setActiveTab]      = useState('Listings');
  const [selectedProject,setSelectedProject]= useState(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === id) { navigate('/profile', { replace: true }); return; }

      const { data: profileData, error } = await supabase.from('user_profiles').select('*').eq('id', id).eq('is_deleted', false).single();
      if (error || !profileData) { setLoading(false); return; }
      setProfile({
        full_name: profileData.full_name || 'Anonymous User',
        bio: profileData.bio || '',
        avatar_url: profileData.avatar_url || '',
        credits_balance: profileData.credits_balance || 0,
        role: profileData.role || 'Member',
        created_at: profileData.created_at || new Date().toISOString(),
        availability_schedule: profileData.availability_schedule || '',
        contact_info: profileData.contact_info || '',
      });

      const { data: reviewData } = await supabase.from('reviews').select('*').eq('instructor_id', id).order('created_at', { ascending: false });
      let avgR = 0, sC = 0, sP = 0, sRel = 0, sPro = 0;
      if (reviewData?.length > 0) {
        const enriched = await Promise.all(reviewData.map(async rev => {
          const { data: stud } = await supabase.from('user_profiles').select('full_name, avatar_url').eq('id', rev.student_id).single();
          const { data: skl }  = await supabase.from('skills').select('title').eq('id', rev.skill_id).single();
          return { ...rev, student: stud, skill: skl };
        }));
        setReviews(enriched);
        reviewData.forEach(r => {
          avgR += Number(r.rating || 0);
          sC   += Number(r.q1_clarity || 0);
          sP   += Number(r.q2_patience || 0);
          sRel += Number(r.q3_relevance || 0);
          sPro += Number(r.q4_professionalism || 0);
        });
        avgR = parseFloat((avgR / reviewData.length).toFixed(1));
      }
      const tc = reviewData?.length || 0;

      const { count: taughtCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('instructor_id', id).eq('status', 'completed');
      
      // 🚨 FIX: Ipakita lang ang mga Active at Approved na skills
      const { data: skillsData } = await supabase.from('skills')
        .select('*')
        .eq('instructor_id', id)
        .eq('is_active', true)
        .or('status.eq.approved,status.is.null') 
        .order('created_at', { ascending: false });
        
      const { data: portfolioData } = await supabase.from('portfolio_items').select('*').eq('user_id', id).order('created_at', { ascending: false });
      if (skillsData)    setUserSkills(skillsData);
      if (portfolioData) setPortfolioItems(portfolioData);

      setStats({
        avgRating: avgR, totalReviews: tc, sessionsTaught: taughtCount || 0,
        avgClarity:        tc > 0 ? (sC   / tc).toFixed(1) : '0.0',
        avgPatience:       tc > 0 ? (sP   / tc).toFixed(1) : '0.0',
        avgRelevance:      tc > 0 ? (sRel / tc).toFixed(1) : '0.0',
        avgProfessionalism:tc > 0 ? (sPro / tc).toFixed(1) : '0.0',
      });
      setLoading(false);
    };
    fetchPublicData();
  }, [id, navigate]);

  const renderStars = (r) => (
    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= r ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}</div>
  );

  const statValues = {
    credits_balance: profile.credits_balance,
    sessionsTaught:  stats.sessionsTaught,
    skillsCount:     userSkills.length,
    avgRating:       stats.avgRating > 0 ? stats.avgRating : '0.0',
  };

  const TABS = [
    { id: 'Listings',  dot: 'bg-orange-400', count: userSkills.length },
    { id: 'Portfolio', dot: 'bg-purple-400', count: portfolioItems.length },
    { id: 'Reviews',   dot: 'bg-amber-400',  count: reviews.length },
  ];

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Loading member profile" className="min-h-screen bg-[#faf9f6]">
      <div className="mx-auto max-w-[1000px] animate-pulse px-6 py-6 md:px-8">
        <div className="mb-4 flex items-center justify-between"><div className="h-3 w-28 rounded bg-emerald-100" /><div className="h-4 w-16 rounded bg-gray-100" /></div>
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-8 lg:w-[260px]">
            <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-emerald-50 p-4 shadow-sm"><div className="mb-3 h-20 w-20 rounded-2xl bg-emerald-100" /><div className="mb-2 h-4 w-32 rounded bg-gray-200" /><div className="mb-2 h-5 w-20 rounded-full bg-white" /><div className="mb-4 h-3 w-28 rounded bg-gray-100" /><div className="mb-4 h-16 w-full rounded-xl bg-gray-100" /><div className="h-10 w-full rounded-xl bg-emerald-100" /></div>
            <div className="grid grid-cols-2 gap-2">{[0,1,2,3].map(item => <div key={item} className="flex h-28 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-4"><div className="mb-2 h-5 w-5 rounded bg-gray-100" /><div className="mb-2 h-7 w-12 rounded bg-gray-200" /><div className="h-2.5 w-16 rounded bg-gray-100" /></div>)}</div>
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4"><div className="h-3 w-28 rounded bg-gray-200" />{[0,1,2,3].map(item => <div key={item} className="flex items-center gap-2"><div className="h-3 w-20 rounded bg-gray-100" /><div className="h-1.5 flex-1 rounded bg-gray-100" /></div>)}</div>
          </aside>
          <section className="min-w-0 flex-1"><div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5"><div className="mb-3 h-3 w-12 rounded bg-gray-200" /><div className="space-y-2"><div className="h-3 w-full rounded bg-gray-100" /><div className="h-3 w-5/6 rounded bg-gray-100" /></div></div><div className="mb-5 flex gap-2"><div className="h-9 w-24 rounded-xl bg-gray-200" /><div className="h-9 w-24 rounded-xl bg-gray-100" /><div className="h-9 w-24 rounded-xl bg-gray-100" /></div><div className="mb-5 space-y-2"><div className="h-3 w-28 rounded bg-gray-200" /><div className="h-3 w-64 max-w-full rounded bg-gray-100" /></div>{[0,1,2].map(item => <div key={item} className="mb-3 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4"><div className="h-16 w-16 rounded-xl bg-gray-100" /><div className="flex-1 space-y-2"><div className="h-3 w-24 rounded-full bg-emerald-50" /><div className="h-4 w-40 rounded bg-gray-200" /><div className="h-3 w-28 rounded bg-gray-100" /></div><div className="h-8 w-20 rounded-xl bg-gray-100" /></div>)}</section>
        </div>
      </div>
    </div>
  );

  if (!profile.full_name) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 bg-[#faf9f6]">
      <SearchX className="h-10 w-10 text-gray-300 mb-3" strokeWidth={1.7} />
      <h2 className="text-2xl font-bold text-gray-900 mb-1">User Not Found</h2>
      <p className="text-xs text-gray-500 mb-6">This profile does not exist or has been deactivated.</p>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition shadow-sm"><ArrowLeft className="h-4 w-4" />Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#faf9f6' }}>
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-700">Member Profile</p>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-emerald-700 transition"><ArrowLeft className="h-3.5 w-3.5" />Back</button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[260px] shrink-0 lg:sticky lg:top-8 flex flex-col gap-4">
            <div className="bg-emerald-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
              <div className="relative w-20 h-20 rounded-2xl bg-emerald-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center mb-2">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  : <span className="text-4xl font-bold text-emerald-800 uppercase">{profile.full_name.charAt(0)}</span>}
              </div>
              <h2 className="font-bold text-[15px] text-gray-900 mb-1">{profile.full_name}</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white text-emerald-700 border border-emerald-200 px-3 py-0.5 rounded-full mb-2">{profile.role}</span>
              <div className="flex flex-wrap gap-1 justify-center text-[10px] text-gray-400 font-medium mb-3">
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="w-full space-y-2 mb-4">
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
              <button
                onClick={() => {
                  if (userSkills.length > 0) navigate(`/skill/${userSkills[0].id}`);
                  else alert('This user has no active skill listings to book yet.');
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold text-[12px] transition shadow-sm flex items-center justify-center gap-1.5"
              ><CalendarPlus className="h-4 w-4" />Book a Session</button>
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
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                {profile.bio || 'This member has not added a bio yet.'}
              </p>
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
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>{tab.count}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'Listings' && (
              <div>
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Offered Skills</p>
                  <p className="text-[12px] text-gray-500">Explore the topics and lessons offered by {profile.full_name}.</p>
                </div>
                {userSkills.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-2xl mb-3"><ClipboardList className="h-6 w-6 text-orange-500" /></div>
                    <p className="font-bold text-gray-900 mb-1">No listings yet</p>
                    <p className="text-[12px] text-gray-400">This member has not shared any skills yet.</p>
                  </div>
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-3">
                      {userSkills.map(skill => (
                        <div key={skill.id} className="relative">
                          <div className="absolute -left-6 top-5 w-[18px] h-[18px] rounded-full border-2 border-white ring-2 ring-gray-100 bg-orange-400 shadow-sm z-10" />
                          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-[0_4px_16px_rgba(16,185,129,0.08)] hover:border-emerald-200 transition-all">
                            <div onClick={() => navigate(`/skill/${skill.id}`)} className="w-full sm:w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 cursor-pointer border border-gray-100">
                              {skill.cover_image_url
                                ? <img src={skill.cover_image_url} alt={skill.title} className="w-full h-full object-cover hover:scale-105 transition" />
                                : <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase">No Cover</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {skill.category && <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">{skill.category}</span>}
                                {skill.format   && <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full">{skill.format}</span>}
                              </div>
                              <h4 onClick={() => navigate(`/skill/${skill.id}`)} className="font-bold text-[14px] text-gray-900 cursor-pointer hover:text-emerald-700 transition truncate">{skill.title}</h4>
                              <p className="text-[12px] text-gray-500 mt-0.5">{skill.credit_cost} CR · {skill.mode || 'Online'}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => navigate(`/skill/${skill.id}`)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold transition shadow-sm">View & Book <ArrowRight className="h-3.5 w-3.5" /></button>
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
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Portfolio & Showcase</p>
                  <p className="text-[12px] text-gray-500">Past projects and accomplishments by {profile.full_name}.</p>
                </div>
                {portfolioItems.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center text-2xl mb-3"><FolderOpen className="h-6 w-6 text-purple-500" /></div>
                    <p className="font-bold text-gray-900 mb-1">No portfolio items yet</p>
                    <p className="text-[12px] text-gray-400">This member has not showcased any work yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {portfolioItems.map(item => (
                      <div key={item.id} onClick={() => setSelectedProject(item)}
                        className="bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)] hover:border-emerald-200 transition-all group">
                        <div className="h-40 bg-gray-100 overflow-hidden relative">
                          {item.image_url
                            ? <img src={item.image_url} alt={item.project_title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            : <div className="w-full h-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 text-[11px] font-bold"><FolderOpen className="h-5 w-5 shrink-0" />{item.project_title}</div>}
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-[14px] text-gray-900 mb-1 truncate">{item.project_title}</h4>
                          <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{item.project_description || 'No description.'}</p>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                            <span className="text-[10px] text-gray-400 font-bold">{new Date(item.created_at).toLocaleDateString()}</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">View Details <ArrowRight className="h-3.5 w-3.5" /></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Reviews' && (
              <div>
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Student Reviews</p>
                  <p className="text-[12px] text-gray-500">Feedback from learners who studied with {profile.full_name}.</p>
                </div>
                {reviews.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center text-2xl mb-3"><Star className="h-6 w-6 fill-amber-400 text-amber-400" /></div>
                    <p className="font-bold text-gray-900 mb-1">No reviews yet</p>
                    <p className="text-[12px] text-gray-400">Be the first to book a session with this member!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reviews.map(review => (
                      <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-[0_4px_16px_rgba(16,185,129,0.08)] hover:border-emerald-200 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center overflow-hidden shrink-0">
                              {review.student?.avatar_url
                                ? <img src={review.student.avatar_url} className="w-full h-full object-cover" />
                                : review.student?.full_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-[13px]">{review.student?.full_name || 'Anonymous'}</p>
                              <p className="text-[10px] text-gray-500 font-medium line-clamp-1">{review.skill?.title || 'Skill Session'}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {renderStars(review.rating)}
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(review.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {review.feedback
                          ? <p className="text-[12px] text-gray-600 italic bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100 leading-relaxed">&ldquo;{review.feedback}&rdquo;</p>
                          : <p className="text-[11px] text-gray-400 italic">No written feedback provided.</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Showcase Project</span>
              <button onClick={() => setSelectedProject(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold transition"><X className="h-4 w-4" /></button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedProject.project_title}</h2>
            <p className="text-[10px] text-gray-400 font-bold mb-5">
              {new Date(selectedProject.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {selectedProject.image_url && (
              <div className="h-64 rounded-2xl overflow-hidden mb-5 bg-gray-100 border border-gray-100">
                <img src={selectedProject.image_url} alt={selectedProject.project_title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-5">
              {selectedProject.project_description || 'No description provided.'}
            </div>
            {selectedProject.project_url && (
              <a href={selectedProject.project_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[12px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-100 transition mb-5">
                <ExternalLink className="h-4 w-4" />Visit Link
              </a>
            )}
            {selectedProject.attachments?.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Attachments</p>
                {selectedProject.attachments.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-[12px] font-bold text-blue-900 hover:bg-blue-100 transition">
                    <span className="truncate flex items-center gap-2"><Paperclip className="h-4 w-4 shrink-0" />{f.name}</span>
                    <span className="shrink-0 text-blue-600 underline ml-3 inline-flex items-center gap-1">Download <Download className="h-3.5 w-3.5" /></span>
                  </a>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button onClick={() => setSelectedProject(null)} className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-[12px] font-bold transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}