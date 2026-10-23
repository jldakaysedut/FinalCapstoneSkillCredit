import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import supabase from "../../supabaseClient";
​
// 🚨 ADDED: Imported all necessary modern Lucide Icons
import {
  GraduationCap, MessageSquare, CheckCircle, ShieldCheck,
  ChefHat, Leaf, Hammer, Scissors, Gamepad2, Dumbbell,
  Wrench, BookOpen, PenTool, MessageCircle, Mic, Palette,
  Video, Wallet, Briefcase, Layout, Code, UserPlus,
  CalendarCheck, Award, Trophy, Star, Rocket, Code2, 
  MessageCircleQuestion, Music, Smartphone, Globe, Heart
} from "lucide-react";
​
// 🚨 REPLACED emojis with Lucide Icons and added them to data arrays
const mockCards = [
  { type:"listing",   title:"Python for Absolute Beginners",               teacher:"Maria S.",  credits:15, rating:4.9, color:"#e8f4e8", accent:"#2d6a4f", Icon: Code2 },
  { type:"community", title:"How do I center a div in CSS? I've tried everything 😭", upvotes:47, answers:12, color:"#f0f4ff", accent:"#3730a3", Icon: MessageCircleQuestion },
  { type:"listing",   title:"UI/UX Design Fundamentals with Figma",              teacher:"Reina C.", credits:12, rating:5.0, color:"#fdf0f8", accent:"#9d174d", Icon: Layout },
  { type:"listing",   title:"Guitar Basics — From zero to your first song",      teacher:"Sam R.",   credits:10, rating:4.7, color:"#fef9f0", accent:"#92400e", Icon: Music },
  { type:"community", title:"Best practices for React Native folder structure?", upvotes:32, answers:8,  color:"#f0f4ff", accent:"#3730a3", Icon: Smartphone },
  { type:"listing",   title:"English Conversation Practice — Job-ready fluency", teacher:"Lisa M.",  credits:8,  rating:4.8, color:"#f0fdf4", accent:"#166534", Icon: Globe },
];
​
const features = [
  { Icon: GraduationCap, title:"1-on-1 Sessions",   desc:"Book private sessions with verified skill teachers. Credits held in escrow until you're satisfied.", color:"#2d6a4f", bg:"#e8f4e8" },
  { Icon: MessageSquare, title:"Community Forum",   desc:"Ask questions, share knowledge, and build connections with other learners.", color:"#3730a3", bg:"#f0f4ff" },
  { Icon: CheckCircle,   title:"Skill Verification",desc:"Quality learning through peer reviews and rating systems so you know who's qualified.", color:"#d97706", bg:"#fef3c7" },
  { Icon: ShieldCheck,   title:"Escrow Protection", desc:"Credits are locked safely until both parties confirm the session is fully complete.", color:"#0f766e", bg:"#ccfbf1" },
];
​
const learnTopics = [
  { Icon: ChefHat,   label:"Cooking & Baking", accent:"#ea580c", soft:"#fff7ed" },
  { Icon: Leaf,      label:"Gardening & Farming", accent:"#16a34a", soft:"#f0fdf4" },
  { Icon: Hammer,    label:"Home & DIY", accent:"#ca8a04", soft:"#fefce8" },
  { Icon: Scissors,  label:"Beauty & Grooming", accent:"#db2777", soft:"#fdf2f8" },
  { Icon: Gamepad2,  label:"Gaming & Hobbies", accent:"#7c3aed", soft:"#f5f3ff" },
  { Icon: Dumbbell,  label:"Health & Fitness", accent:"#dc2626", soft:"#fef2f2" },
  { Icon: Wrench,    label:"Appliance & Repair", accent:"#2563eb", soft:"#eff6ff" },
  { Icon: BookOpen,  label:"School & Tutoring", accent:"#4f46e5", soft:"#eef2ff" },
  { Icon: PenTool,   label:"Writing & Content", accent:"#0f766e", soft:"#f0fdfa" },
  { Icon: Mic,       label:"Languages & Speaking", accent:"#0891b2", soft:"#ecfeff" },
  { Icon: Music,     label:"Singing & Instruments", accent:"#c026d3", soft:"#fdf4ff" },
  { Icon: Palette,   label:"Art & Graphic Design", accent:"#e11d48", soft:"#fff1f2" },
  { Icon: Video,     label:"Video & Animation", accent:"#d97706", soft:"#fffbeb" },
  { Icon: Wallet,    label:"Financial Literacy", accent:"#059669", soft:"#ecfdf5" },
  { Icon: Briefcase, label:"Business & Freelance", accent:"#475569", soft:"#f8fafc" },
  { Icon: Layout,    label:"UI/UX Design", accent:"#0284c7", soft:"#f0f9ff" },
  { Icon: Code,      label:"Coding & Tech", accent:"#4d7c0f", soft:"#f7fee7" },
];
​
function getInitials(name) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "U";
}
​
export default function Home() {
  const [topSessions, setTopSessions] = useState([]);
  const [topRated, setTopRated] = useState([]);
​
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
​
  // Fetching Logic for Weekly Leaderboards
  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const isoDate = sevenDaysAgo.toISOString();
​
        // 1. Aggregate Weekly Top Sessions
        const { data: sessionData } = await supabase
          .from("sessions")
          .select("instructor_id, instructor:user_profiles!sessions_instructor_id_fkey(id, full_name, avatar_url)")
          .eq("status", "completed")
          .gte("created_at", isoDate);
​
        if (sessionData) {
          const counts = {};
          sessionData.forEach(s => {
            if (!s.instructor) return;
            const id = s.instructor.id;
            if (!counts[id]) counts[id] = { ...s.instructor, count: 0 };
            counts[id].count += 1;
          });
          const topS = Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(u => ({ ...u, metric_value: `${u.count} sessions` }));
          setTopSessions(topS);
        }
​
        // 2. Aggregate Weekly Top Rated
        const { data: reviewData } = await supabase
          .from("reviews")
          .select("instructor_id, rating, instructor:user_profiles!reviews_instructor_id_fkey(id, full_name, avatar_url)")
          .gte("created_at", isoDate);
​
        if (reviewData) {
          const ratings = {};
          reviewData.forEach(r => {
            if (!r.instructor) return;
            const id = r.instructor.id;
            if (!ratings[id]) ratings[id] = { ...r.instructor, sum: 0, count: 0 };
            ratings[id].sum += r.rating;
            ratings[id].count += 1;
          });
          const topR = Object.values(ratings)
            .map(u => ({ ...u, avg: (u.sum / u.count).toFixed(1) }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 3)
            .map(u => ({ ...u, metric_value: `⭐ ${u.avg}` }));
          setTopRated(topR);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboards:", error);
      }
    };
    fetchLeaderboards();
  }, []);
​
  return (
    <div className="home-page" style={{ background:"#faf8f4", fontFamily:"'DM Sans',sans-serif", overflowX:"hidden", width: "100%" }}>
      <style>{`
        @keyframes fadeUp      {from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes pulse       {0%,100%{opacity:1}50%{opacity:0.4}}
        
        .reveal{opacity:0;transform:translateY(36px);transition:opacity .7s ease,transform .7s ease}
        .reveal.visible{opacity:1;transform:none}
​
        .hero-tag{animation:fadeUp .5s ease both}
        .hero-h1{animation:fadeUp .5s .08s ease both}
        .hero-p{animation:fadeUp .5s .16s ease both}
        .hero-btns{animation:fadeUp .5s .24s ease both}
        .hero-proof{animation:fadeUp .5s .32s ease both}
        .preview-col{animation:fadeUp .6s .18s ease both}
​
        .feature-card{transition:transform .2s,box-shadow .2s}
        .feature-card:hover{transform:translateY(-5px);box-shadow:0 14px 40px rgba(0,0,0,0.06)!important}
        .topic-pill{transition:all .2s}
        .topic-pill:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.08)}
        .explore-pill-cloud-v1{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:1080px;margin:0 auto}
        .explore-pill-v1{max-width:100%;transition:transform .2s,box-shadow .2s}
        .explore-pill-v1:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(45,106,79,.10)!important}
        @media(max-width:480px){.explore-pill-cloud-v1{gap:8px}.explore-pill-v1{padding:8px 11px!important;font-size:12px!important}}
​
        .hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
        .features-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .community-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
        .problem-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:24px;align-items:center;max-width:700px;margin:0 auto}
        .leaderboard-display-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:960px;margin:0 auto}
        .footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
​
        @media(max-width:1024px){
          .features-grid{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:768px){
          .hero-grid{grid-template-columns:1fr;gap:36px}
          .steps-grid{grid-template-columns:1fr;gap:14px}
          .community-grid{grid-template-columns:1fr;gap:32px}
          .problem-grid{grid-template-columns:1fr;gap:16px}
          .leaderboard-display-grid{grid-template-columns:1fr;gap:20px}
          .preview-col{display:none}
          .section-pad{padding:60px 20px!important}
          .footer-inner{flex-direction:column;text-align:center}
        }
        @media(max-width:480px){
          .features-grid{grid-template-columns:1fr}
          .hero-h1-text{font-size:40px!important}
          .hero-btns-wrap{flex-direction:column}
          .hero-btns-wrap a{width:100%;text-align:center;justify-content:center}
        }
​
        /* Responsive refinements: presentation only; component/data logic is unchanged. */
        .home-page, .home-page * { box-sizing:border-box; }
        .home-page { min-width:0; }
        .home-page img { max-width:100%; }
        .home-page .hero-container { min-width:0; }
        .home-page .hero-proof { width:100%; max-width:420px; }
        .home-page .hero-proof > div:last-child { min-width:0; }
        .home-page .leaderboard-display-grid > div { min-width:0; }
        .home-page .leaderboard-display-grid > div > div:last-child > div { min-width:0; }
        .home-page .leaderboard-display-grid > div > div:last-child > div > div:first-child { min-width:0; }
        .home-page .leaderboard-display-grid > div > div:last-child > div > div:first-child > div:last-child { min-width:0; overflow-wrap:anywhere; }
        .home-page .footer-inner > div { min-width:0; }
        .home-page .footer-inner { display:grid!important; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); align-items:center; gap:16px; }
        .home-page .footer-inner > div:nth-child(2) { justify-self:center; transform:none!important; max-width:100%; }
        .home-page .footer-inner > div:last-child { justify-self:end; flex-wrap:wrap; align-items:center; }
        .home-page a.cta-btn { white-space:normal; text-align:center; justify-content:center; line-height:1.35; }
​
        @media(max-width:768px){
          .home-page .hero-section { min-height:auto!important; padding:48px 0!important; }
          .home-page .hero-container { padding-left:24px!important; padding-right:24px!important; }
          .home-page .section-pad { padding:56px 24px!important; }
          .home-page section h2 { font-size:clamp(28px,5.4vw,38px)!important; line-height:1.15!important; }
          .home-page .hero-h1-text { font-size:clamp(38px,8vw,54px)!important; }
          .home-page .hero-grid { gap:32px; }
          .home-page .hero-proof { max-width:100%; }
          .home-page .problem-grid > div:nth-child(2) { transform:rotate(90deg); justify-self:center; }
          .home-page .leaderboard-display-grid > div { padding:22px!important; }
          .home-page footer { padding:28px 24px!important; }
          .home-page .footer-inner { grid-template-columns:minmax(0,1fr); justify-items:center; text-align:center; }
          .home-page .footer-inner > div:first-child,
          .home-page .footer-inner > div:nth-child(2),
          .home-page .footer-inner > div:last-child { justify-self:center; }
          .home-page footer .footer-inner > div:nth-child(2) { transform:none!important; }
          .home-page footer .footer-inner > div:last-child { flex-wrap:wrap; justify-content:center; }
        }
​
        @media(max-width:480px){
          .home-page .hero-section { padding:40px 0!important; }
          .home-page .hero-container { padding-left:20px!important; padding-right:20px!important; }
          .home-page .section-pad { padding:48px 20px!important; }
          .home-page section h2 { font-size:clamp(26px,7.2vw,32px)!important; line-height:1.16!important; }
          .home-page .hero-h1-text { font-size:clamp(36px,10vw,42px)!important; line-height:1.08!important; }
          .home-page .hero-p { font-size:16px!important; }
          .home-page .hero-btns-wrap { width:100%; gap:10px; }
          .home-page .hero-btns-wrap a { width:100%; min-height:50px; padding:14px 16px!important; }
          .home-page .hero-proof { align-items:flex-start!important; padding:12px!important; gap:10px!important; }
          .home-page .hero-proof > div:last-child > div:first-child { font-size:12px!important; }
          .home-page .hero-proof > div:last-child > div:last-child { font-size:10px!important; line-height:1.45; }
          .home-page .problem-grid { gap:12px; }
          .home-page .problem-grid > div:not(:nth-child(2)) { padding:22px 18px!important; }
          .home-page .steps-grid { gap:12px; }
          .home-page .steps-grid > div { padding:24px 20px!important; }
          .home-page .features-grid { gap:12px; }
          .home-page .feature-card { padding:22px!important; }
          .home-page .leaderboard-display-grid { gap:14px; }
          .home-page .leaderboard-display-grid > div { padding:18px!important; }
          .home-page .leaderboard-display-grid > div > div:first-child { gap:10px!important; margin-bottom:18px!important; }
          .home-page .leaderboard-display-grid > div > div:last-child > div { gap:8px; padding:11px 10px!important; }
          .home-page .leaderboard-display-grid > div > div:last-child > div > div:first-child { gap:8px!important; }
          .home-page .leaderboard-display-grid > div > div:last-child > div > div:last-child { font-size:11px!important; padding:4px 7px!important; white-space:nowrap; }
          .home-page .explore-pill-cloud-v1 { gap:8px; }
          .home-page .explore-pill-v1 { padding:8px 11px!important; font-size:12px!important; }
          .home-page .cta-btn { width:100%; min-height:50px; padding:14px 16px!important; font-size:15px!important; }
          .home-page footer { padding:26px 20px!important; }
          .home-page footer .footer-inner { gap:18px; }
          .home-page footer .footer-inner > div:nth-child(2) { width:100%; }
          .home-page footer .footer-inner > div:nth-child(2) > div { gap:10px!important; flex-wrap:wrap; justify-content:center; }
          .home-page footer .footer-inner > div:nth-child(2) > div { max-width:100%; border-radius:16px!important; }
          .home-page footer .footer-inner > div:last-child { gap:14px; }
        }
​
        @media(max-width:360px){
          .home-page .hero-container { padding-left:16px!important; padding-right:16px!important; }
          .home-page .section-pad { padding-left:16px!important; padding-right:16px!important; }
          .home-page section h2 { font-size:26px!important; }
          .home-page .hero-proof { gap:8px!important; }
          .home-page .leaderboard-display-grid > div { padding:15px!important; }
          .home-page .leaderboard-display-grid > div > div:last-child > div > div:first-child > div:first-child { width:20px!important; }
        }
​
        @media(prefers-reduced-motion:reduce){
          .home-page *, .home-page *::before, .home-page *::after { animation-duration:.01ms!important; animation-iteration-count:1!important; scroll-behavior:auto!important; transition-duration:.01ms!important; }
        }
      `}</style>
​
      {/* ── HERO ── */}
      <section className="hero-section" style={{ minHeight:"calc(100vh - 64px)", display:"flex", alignItems:"center", width:"100%", padding:"40px 0" }}>
        <div className="hero-container" style={{ maxWidth:1200, margin:"0 auto", padding:"0 48px", width:"100%" }}>
          <div className="hero-grid">
            <div>
              <div className="hero-tag" style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#e8f4e8", border:"1.5px solid #b7e4c7", padding:"6px 16px", borderRadius:999, marginBottom:24 }}>
                <Rocket size={14} color="#2d6a4f" style={{ animation:"pulse 2s infinite" }} />
                <span style={{ fontSize:12, color:"#2d6a4f", fontWeight:700 }}>Early Access — Join the first learners</span>
              </div>
              <h1 className="hero-h1">
                <span className="hero-h1-text" style={{ fontFamily:"'Fraunces',serif", fontSize:62, fontWeight:900, color:"#111", lineHeight:1.05, display:"block", marginBottom:20, letterSpacing:"-0.02em" }}>
                  Share skills.<br /><em style={{ color:"#2d6a4f", fontStyle:"italic" }}>Earn credits.</em><br />Keep learning.
                </span>
              </h1>
              <p className="hero-p" style={{ fontSize:17, color:"#555", lineHeight:1.75, marginBottom:32, maxWidth:460 }}>
                Learn any skill by spending credits — or <strong style={{ color:"#2d6a4f" }}>earn credits by teaching what you know</strong>. No cash needed. Ever.
              </p>
              <div className="hero-btns">
                <div className="hero-btns-wrap" style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:12 }}>
                  <Link to="/register" className="cta-btn" style={{ background:"#2d6a4f", color:"#fff", padding:"16px 32px", borderRadius:14, fontWeight:800, fontSize:16, boxShadow:"0 6px 24px rgba(45,106,79,0.3)", display:"inline-flex", alignItems:"center", gap:8 }}>
                    Get 20 free credits — join now
                  </Link>
                  <Link to="/login" style={{ background:"#f0ece4", color:"#444", padding:"16px 26px", borderRadius:14, fontWeight:700, fontSize:16, display:"inline-flex", alignItems:"center", gap:8 }}>
                    Log in →
                  </Link>
                </div>
                <p style={{ fontSize:12, color:"#aaa", marginBottom:28 }}>No credit card required · Free forever to start</p>
              </div>
​
              <div className="hero-proof" style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", border:"1.5px solid #e8e2d9", borderRadius:16, padding:"14px 18px", boxShadow:"0 2px 12px rgba(0,0,0,.04)", maxWidth:420 }}>
                <div style={{ display:"flex", marginRight:4 }}>
                  {["#2d6a4f","#b45309","#9d174d","#3730a3","#166534"].map((c,i) => (
                    <div key={i} style={{ width:28, height:28, borderRadius:"50%", background:c, border:"2px solid #fff", marginLeft:i===0?0:-8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#fff", fontWeight:900 }}>
                      {["M","S","R","J","L"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#111", lineHeight:1.2 }}>Be among the first learners</div>
                  <div style={{ fontSize:11, color:"#999", marginTop:2 }}>Early access is open — grab your 20 free credits now</div>
                </div>
              </div>
            </div>
​
            {/* Right — preview */}
            <div className="preview-col" style={{ position:"relative" }}>
              <div style={{ position:"absolute", top:"10%", left:"10%", width:"80%", height:"80%", background:"radial-gradient(ellipse,rgba(45,106,79,0.1) 0%,transparent 70%)", pointerEvents:"none", borderRadius:"50%" }} />
              
              <div style={{ position:"relative", borderRadius:24, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.14),0 0 0 1.5px #e8e2d9", background:"#fff" }}>
                
                {/* Fake Browser Header */}
                <div style={{ background:"#f5f0e8", padding:"10px 16px", display:"flex", alignItems:"center", gap:8, borderBottom:"1.5px solid #e8e2d9" }}>
                  <div style={{ display:"flex", gap:5 }}>
                    {["#fc605b","#fdbc40","#34c84a"].map(c => <div key={c} style={{ width:11, height:11, borderRadius:"50%", background:c }} />)}
                  </div>
                  <div style={{ flex:1, background:"#fff", borderRadius:6, padding:"4px 12px", fontSize:11, color:"#aaa", fontWeight:600 }}>skillcredit.ph</div>
                </div>
​
                {/* Container for Cards */}
                <div style={{ padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {mockCards.map((card,i) => (
                      <div key={i} style={{ background:card.color, borderRadius:13, padding:13, border:"1px solid rgba(0,0,0,.05)", animation:`fadeUp .5s ${i*.07}s ease both`, transition:"transform .2s,box-shadow .2s" }}
                        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 16px rgba(0,0,0,.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
                          {/* 🚨 RENDER LUCIDE ICON INSTEAD OF EMOJI */}
                          <card.Icon size={14} color={card.accent} strokeWidth={2.5} />
                          <span style={{ fontSize:9, fontWeight:800, color:card.accent, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                            {card.type==="listing"?"Skill":"Forum"}
                          </span>
                        </div>
                        <p style={{ fontFamily:"'Fraunces',serif", fontSize:11, fontWeight:800, color:"#111", lineHeight:1.3, marginBottom:4 }}>{card.title}</p>
                        {card.type==="listing"   && <p style={{ fontSize:10, color:"#888" }}>{card.teacher} · <strong style={{ color:card.accent }}>{card.credits} cr</strong></p>}
                        {card.type==="community" && <p style={{ fontSize:10, color:"#888" }}>▲ {card.upvotes} · 💬 {card.answers}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
​
          </div>
        </div>
      </section>
​
      {/* ── WHY THIS EXISTS (ABOUT) ── */}
      <section id="about" className="section-pad reveal" style={{ background:"#111", padding:"80px 48px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", textAlign:"center" }}>
          <span style={{ fontSize:12, fontWeight:800, color:"#52b788", letterSpacing:"0.12em", textTransform:"uppercase" }}>The Problem</span>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:40, fontWeight:900, color:"#fff", marginTop:10, marginBottom:16, letterSpacing:"-0.02em", lineHeight:1.15 }}>
            Learning is expensive.<br /><em style={{ color:"#52b788", fontStyle:"italic" }}>But everyone knows something valuable.</em>
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.5)", lineHeight:1.8, maxWidth:600, margin:"0 auto 48px" }}>
            Courses cost thousands. Tutors are hard to find. Most skills stay locked inside people who never get to share them.
          </p>
          <div className="problem-grid">
            <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:20, padding:"28px 24px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ marginBottom:12, display:"flex", justifyContent:"center" }}>
                <Wallet size={36} color="#ef4444" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#fff", marginBottom:8 }}>Before SkillCredit</h3>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", lineHeight:1.7 }}>Pay ₱500/hr for tutors. Watch YouTube and hope. Can't afford online courses.</p>
            </div>
            <div style={{ fontSize:28, color:"#52b788", fontWeight:900 }}>→</div>
            <div style={{ background:"rgba(82,183,136,0.1)", borderRadius:20, padding:"28px 24px", border:"1.5px solid rgba(82,183,136,0.25)" }}>
              <div style={{ marginBottom:12, display:"flex", justifyContent:"center" }}>
                <Globe size={36} color="#52b788" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#52b788", marginBottom:8 }}>With SkillCredit</h3>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.7 }}>Teach guitar, earn credits. Spend them to learn Python. No cash needed.</p>
            </div>
          </div>
        </div>
      </section>
​
      {/* ── WHAT CAN YOU LEARN (EXPLORE) ── */}
      <section id="explore" className="section-pad reveal" style={{ background:"#faf8f4", padding:"72px 48px" }}>
        <div style={{ maxWidth:1080, margin:"0 auto", textAlign:"center" }}>
          <span style={{ fontSize:12, fontWeight:800, color:"#2d6a4f", letterSpacing:"0.12em", textTransform:"uppercase" }}>Explore by interest · 17 categories</span>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:36, fontWeight:900, color:"#111", marginTop:10, marginBottom:8, letterSpacing:"-0.02em" }}>Anything the community knows</h2>
          <p style={{ fontSize:15, color:"#666", marginBottom:32, lineHeight:1.7 }}>From everyday skills to creative work, find a topic you’re excited to learn or teach.</p>
          <div className="explore-pill-cloud-v1">
            {learnTopics.map(topic => (
              <div key={topic.label} className="topic-pill explore-pill-v1" style={{ display:"flex", alignItems:"center", gap:9, background:"#fff", border:"1.5px solid #e8e2d9", borderRadius:999, padding:"10px 16px", fontSize:13, fontWeight:700, color:"#333", boxShadow:"0 2px 8px rgba(0,0,0,.04)", cursor:"default" }}>
                <span style={{ width:28, height:28, flex:"0 0 28px", display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background:topic.soft }}>
                  {/* 🚨 RENDER COLORED LUCIDE ICON */}
                  <topic.Icon size={14} color={topic.accent} strokeWidth={2.5} />
                </span>
                <span style={{ minWidth:0, overflowWrap:"anywhere", lineHeight:1.25 }}>{topic.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
​
      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="section-pad reveal" style={{ background:"#fff", padding:"80px 48px", borderTop:"1px solid #e8e2d9", borderBottom:"1px solid #e8e2d9" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#2d6a4f", letterSpacing:"0.12em", textTransform:"uppercase" }}>How it works</span>
            <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:40, fontWeight:900, color:"#111", marginTop:10, letterSpacing:"-0.02em" }}>Simple. Fair. Powerful.</h2>
          </div>
          <div className="steps-grid">
            {[
              { Icon: UserPlus, num:"01", title:"Sign up & get 20 credits",      desc:"Create your profile, list skills you can teach and skills you want to learn. 20 free credits land in your wallet instantly." },
              { Icon: CalendarCheck, num:"02", title:"Book a session",                desc:"Find a teacher from the community listings and book a 1-on-1 session to start learning immediately." },
              { Icon: Award, num:"03", title:"Teach & earn",                  desc:"Every session you teach earns you credits. Spend those earned credits to keep learning — forever." },
            ].map(item => (
              <div key={item.num} style={{ background:"#faf8f4", borderRadius:20, padding:"32px 28px", border:"1.5px solid #e8e2d9", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-16, right:-16, width:80, height:80, borderRadius:"50%", background:"#e8f4e8", opacity:.7 }} />
                <span style={{ display:"block", marginBottom:14 }}>
                  <item.Icon size={32} color="#2d6a4f" strokeWidth={1.5} />
                </span>
                <span style={{ fontSize:11, fontWeight:900, color:"#2d6a4f", letterSpacing:"0.1em" }}>STEP {item.num}</span>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#111", margin:"8px 0 10px" }}>{item.title}</h3>
                <p style={{ fontSize:14, color:"#666", lineHeight:1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
​
      {/* ── FEATURES ── */}
      <section id="features" className="section-pad reveal" style={{ padding:"80px 48px", background:"#faf8f4" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#2d6a4f", letterSpacing:"0.12em", textTransform:"uppercase" }}>Platform Features</span>
            <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:40, fontWeight:900, color:"#111", marginTop:10, letterSpacing:"-0.02em" }}>Everything you need to learn safely</h2>
          </div>
          <div className="features-grid">
            {features.map((f,i) => (
              <div key={i} className="feature-card" style={{ background:"#fff", borderRadius:18, padding:"28px", border:"1.5px solid #e8e2d9", boxShadow:"0 2px 10px rgba(0,0,0,.02)" }}>
                <div style={{ width:48, height:48, borderRadius:14, background:f.bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                  <f.Icon size={24} color={f.color} strokeWidth={2} />
                </div>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:900, color:"#111", marginBottom:8 }}>{f.title}</h3>
                <p style={{ fontSize:13, color:"#666", lineHeight:1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
​
      {/* ── CLEAN CORPORATE LEADERBOARD ── */}
      <section className="section-pad reveal" style={{ background:"#ffffff", padding:"80px 48px", borderTop:"1px solid #e8e2d9", borderBottom:"1px solid #e8e2d9" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#2d6a4f", letterSpacing:"0.12em", textTransform:"uppercase" }}>Community Excellence</span>
            <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:38, fontWeight:900, color:"#111", marginTop:10, lineHeight:1.15 }}>
              This Week's Top Performers
            </h2>
            <p style={{ fontSize:15, color:"#666", marginTop:12 }}>Recognizing the most active and highly-rated teachers on SkillCredit.</p>
          </div>
​
          <div className="leaderboard-display-grid">
            {/* Column 1: Most Sessions Taught */}
            <div style={{ background:"#fff", borderRadius:20, padding:"28px", border:"1px solid #e2e8f0", boxShadow:"0 4px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, paddingBottom:16, borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ width:48, height:48, borderRadius:14, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Trophy size={24} color="#3b82f6" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#0f172a", fontFamily:"'Fraunces',serif" }}>Teaching Activity</div>
                  <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Most sessions completed this week</div>
                </div>
              </div>
              
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {topSessions.length === 0 ? (
                  <p style={{ color:"#94a3b8", fontSize:13, textAlign:"center", padding:"20px 0" }}>Gathering activities...</p>
                ) : (
                  topSessions.map((user, idx) => (
                    <div key={user.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f8fafc", padding:"14px 16px", borderRadius:14, border:"1px solid #f1f5f9", transition:"background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background="#f8fafc"}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ fontSize:15, fontWeight:900, color:idx === 0 ? "#d97706" : idx === 1 ? "#64748b" : "#b45309", width: 24 }}>
                          #{idx + 1}
                        </div>
                        <div style={{ width:36, height:36, borderRadius:10, background:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", color:"#475569", fontSize:12, fontWeight:900, overflow:"hidden" }}>
                          {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : getInitials(user.full_name)}
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#334155" }}>{user.full_name}</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:800, color:"#2563eb", background:"#dbeafe", padding:"4px 10px", borderRadius:8 }}>
                        {user.metric_value}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
​
            {/* Column 2: Highest Rated */}
            <div style={{ background:"#fff", borderRadius:20, padding:"28px", border:"1px solid #e2e8f0", boxShadow:"0 4px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, paddingBottom:16, borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ width:48, height:48, borderRadius:14, background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Star size={24} color="#d97706" fill="#f59e0b" strokeWidth={1} />
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#0f172a", fontFamily:"'Fraunces',serif" }}>Student Ratings</div>
                  <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Highest rated by learners this week</div>
                </div>
              </div>
​
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {topRated.length === 0 ? (
                  <p style={{ color:"#94a3b8", fontSize:13, textAlign:"center", padding:"20px 0" }}>Calculating scores...</p>
                ) : (
                  topRated.map((user, idx) => (
                    <div key={user.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f8fafc", padding:"14px 16px", borderRadius:14, border:"1px solid #f1f5f9", transition:"background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background="#f8fafc"}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ fontSize:15, fontWeight:900, color:idx === 0 ? "#d97706" : idx === 1 ? "#64748b" : "#b45309", width: 24 }}>
                          #{idx + 1}
                        </div>
                        <div style={{ width:36, height:36, borderRadius:10, background:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", color:"#475569", fontSize:12, fontWeight:900, overflow:"hidden" }}>
                          {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : getInitials(user.full_name)}
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#334155" }}>{user.full_name}</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:800, color:"#d97706", background:"#fef3c7", padding:"4px 10px", borderRadius:8 }}>
                        {user.metric_value}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
​
      {/* ── FINAL CTA ── */}
      <section className="section-pad reveal" style={{ background:"linear-gradient(135deg,#1a3d2e 0%,#2d6a4f 50%,#1a4a35 100%)", padding:"96px 48px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-60, left:"10%", width:300, height:300, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        <div style={{ position:"absolute", bottom:-80, right:"15%", width:400, height:400, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }} />
        <div style={{ position:"relative" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:999, padding:"6px 18px", marginBottom:24, fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>
            <Rocket size={14} color="#fff" /> Limited early access — join now
          </div>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:48, fontWeight:900, color:"#fff", marginBottom:16, letterSpacing:"-0.02em", lineHeight:1.1 }}>
            Ready to start your<br /><em style={{ fontStyle:"italic", color:"#b7e4c7" }}>skill journey?</em>
          </h2>
          <p style={{ fontSize:17, color:"rgba(255,255,255,0.65)", maxWidth:500, margin:"0 auto 40px" }}>
            Join the first learners building the SkillCredit community. It's free, it's fair, and it starts today.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:16 }}>
            <Link to="/register" className="cta-btn" style={{ background:"#fff", color:"#2d6a4f", padding:"18px 40px", borderRadius:14, fontWeight:900, fontSize:17, display:"inline-flex", alignItems:"center", gap:8 }}>
              Create free account — get 20 credits
            </Link>
          </div>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>No credit card required · 20 free credits on signup · Cancel anytime</p>
        </div>
      </section>
​
      {/* ── FOOTER ── */}
      <footer style={{ background:"#111", padding:"32px 48px" }}>
        <div className="footer-inner">
          <div style={{ display:"flex", alignItems:"center" }}>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#2d6a4f" }}>Skill</span>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#fff" }}>Credit</span>
          </div>
          <div style={{ textAlign: "center", transform: "translateX(35px)" }}>
            <p style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>
              Built with ❤️ for learners and teachers
            </p>
​
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 20,
                background: "linear-gradient(135deg,#1a3d2e,#2d6a4f)",
                border: "1px solid rgba(45,106,79,0.4)",
                borderRadius: 999,
                padding: "6px 16px",
              }}
            >
              <span><Heart size={14} color="#fff" /></span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                Developed by
              </span>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>
                Team SkillCredit
              </span>
            </div>
          </div>
          <div style={{ display:"flex", gap:16 }}>
            {["Privacy","Terms","Contact"].map(l => (
              <a key={l} href="#" style={{ fontSize:13, color:"#555", fontWeight:600, transition:"color .15s" }}
                onMouseOver={e => (e.currentTarget.style.color="#fff")}
                onMouseOut={e  => (e.currentTarget.style.color="#555")}>{l}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop:"1px solid #222", marginTop:24, paddingTop:20, textAlign:"center" }}>
          <p style={{ fontSize:11, color:"#333" }}>© 2026 SkillCredit · All rights reserved · Thesis Project</p>
        </div>
      </footer>
    </div>
  );
}