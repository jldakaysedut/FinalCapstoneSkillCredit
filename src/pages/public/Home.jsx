import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import supabase from "../../supabaseClient";
import DownloadAppSection from "../../components/DownloadAppSection";

// 🚨 ADDED: Imported all necessary modern Lucide Icons
import {
  GraduationCap, MessageSquare, CheckCircle, ShieldCheck,
  ChefHat, Leaf, Hammer, Scissors, Dumbbell,
  Wrench, BookOpen, PenTool, MessageCircle, Mic, Palette,
  Video, Wallet, Briefcase, Layout, Code, UserPlus,
  CalendarCheck, Award, Star, Rocket, Code2, 
  MessageCircleQuestion, Music, Smartphone, Globe, Heart,
  PenLine, Music2, Film, PiggyBank, Monitor, Trophy, ArrowRight, Medal
} from "lucide-react";

// 🚨 REPLACED emojis with Lucide Icons and added them to data arrays
const mockCards = [
  { type:"listing",   title:"Python for Absolute Beginners",               teacher:"Maria S.",  credits:15, rating:4.9, color:"#e8f4e8", accent:"#2d6a4f", Icon: Code2 },
  { type:"community", title:"How do I center a div in CSS? I've tried everything 😭", upvotes:47, answers:12, color:"#f0f4ff", accent:"#3730a3", Icon: MessageCircleQuestion },
  { type:"listing",   title:"UI/UX Design Fundamentals with Figma",              teacher:"Reina C.", credits:12, rating:5.0, color:"#fdf0f8", accent:"#9d174d", Icon: Layout },
  { type:"listing",   title:"Guitar Basics — From zero to your first song",      teacher:"Sam R.",   credits:10, rating:4.7, color:"#fef9f0", accent:"#92400e", Icon: Music },
  { type:"community", title:"Best practices for React Native folder structure?", upvotes:32, answers:8,  color:"#f0f4ff", accent:"#3730a3", Icon: Smartphone },
  { type:"listing",   title:"English Conversation Practice — Job-ready fluency", teacher:"Lisa M.",  credits:8,  rating:4.8, color:"#f0fdf4", accent:"#166534", Icon: Globe },
];

const features = [
  { Icon: GraduationCap, title:"1-on-1 Sessions",   desc:"Explore approved skill listings, request a booking, and agree on a schedule with your teacher.", color:"#2d6a4f", bg:"#e8f4e8" },
  { Icon: MessageSquare, title:"Community Forum",   desc:"Ask questions, share knowledge, and build connections with other learners.", color:"#3730a3", bg:"#f0f4ff" },
  { Icon: CheckCircle,   title:"Listings & Reviews",desc:"Skill listings go through moderation, while learners can rate completed sessions.", color:"#d97706", bg:"#fef3c7" },
  { Icon: ShieldCheck,   title:"Session Credit Protection", desc:"Credits for a booked session are held until the required completion confirmations are received.", color:"#0f766e", bg:"#ccfbf1" },
];

const learnTopics = [
  { Icon: ChefHat, label:"Cooking & Baking", accent:"#f97316", soft:"#fff7ed" },
  { Icon: Leaf, label:"Gardening & Plant Care", accent:"#22c55e", soft:"#f0fdf4" },
  { Icon: Hammer, label:"Home Repair & DIY", accent:"#a78bfa", soft:"#fefce8" },
  { Icon: Dumbbell, label:"Fitness & Sports", accent:"#ef4444", soft:"#fef2f2" },
  { Icon: Scissors, label:"Beauty & Personal Care", accent:"#ec4899", soft:"#fdf2f8" },
  { Icon: Wrench, label:"Computer, Phone & Electronics Help", accent:"#64748b", soft:"#eff6ff" },
  { Icon: BookOpen, label:"School Subjects & Tutoring", accent:"#0ea5e9", soft:"#eef2ff" },
  { Icon: PenLine, label:"Writing & Editing", accent:"#8b5cf6", soft:"#f0fdfa" },
  { Icon: MessageCircle, label:"Languages & Public Speaking", accent:"#14b8a6", soft:"#ecfeff" },
  { Icon: Music2, label:"Music & Singing", accent:"#f43f5e", soft:"#fdf4ff" },
  { Icon: Palette, label:"Graphic Design & Digital Art", accent:"#f59e0b", soft:"#fff1f2" },
  { Icon: Film, label:"Video, Animation & AI Content Creation", accent:"#dc2626", soft:"#fffbeb" },
  { Icon: Briefcase, label:"Business, Entrepreneurship & Marketing", accent:"#0d9488", soft:"#f8fafc" },
  { Icon: PiggyBank, label:"Finance, Investing & Trading", accent:"#ca8a04", soft:"#ecfdf5" },
  { Icon: Monitor, label:"Website & App Design", accent:"#7c3aed", soft:"#f0f9ff" },
  { Icon: Code2, label:"Coding & Programming", accent:"#10b981", soft:"#f7fee7" },
];

function getInitials(name) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "U";
}

export default function Home() {
  const [topRated, setTopRated] = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [ratingsUnavailable, setRatingsUnavailable] = useState(false);
  const [ratingsSource, setRatingsSource] = useState("public");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: "0px 0px 45px 0px" }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Home Top Rated uses the SAME scoring, 3-review eligibility, and tie-breaks
  // as Leaderboard.jsx + skillcredit-leaderboard Edge Function.
  // The global Edge Function requires a logged-in user. For signed-out visitors,
  // compute the same scoring from publicly readable reviews without relaxing auth/RLS.
  useEffect(() => {
    let cancelled = false;
    const sortedTopThree = (rows) => [...rows]
      .filter(user => Number(user.totalReviews) >= 3)
      .sort((a, b) => b.avgRating - a.avgRating || b.totalReviews - a.totalReviews || a.id.localeCompare(b.id))
      .slice(0, 3);

    const publicRatingsPreview = async () => {
      // Read in pages, rather than silently truncating review history at 1,000 rows.
      const PAGE_SIZE = 750;
      const MAX_ROWS = 100000;
      const reviewers = new Map();
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("reviews")
          .select("id,instructor_id,rating,q1_clarity,q2_patience,q3_relevance,q4_professionalism,instructor:user_profiles!reviews_instructor_id_fkey(id,full_name,avatar_url,is_deleted)")
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        const rows = data || [];
        for (const review of rows) {
          const teacher = review.instructor;
          if (!teacher || teacher.is_deleted || !review.instructor_id) continue;
          const score = [review.rating, review.q1_clarity, review.q2_patience, review.q3_relevance, review.q4_professionalism]
            .reduce((total, value) => {
              const number = Number(value ?? 0);
              return total + (Number.isFinite(number) ? number : 0);
            }, 0) / 5;
          const prev = reviewers.get(review.instructor_id) || { ...teacher, id: review.instructor_id, sum: 0, totalReviews: 0 };
          prev.sum += score;
          prev.totalReviews += 1;
          reviewers.set(review.instructor_id, prev);
        }
        offset += rows.length;
        if (offset > MAX_ROWS) throw new Error("Public review preview exceeds safety limit");
        if (rows.length < PAGE_SIZE) break;
      }
      return sortedTopThree([...reviewers.values()].map(user => ({
        id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        totalReviews: user.totalReviews,
        avgRating: Number((user.sum / user.totalReviews).toFixed(1)),
      })));
    };

    const fetchTopRated = async () => {
      setRatingsLoading(true);
      setRatingsUnavailable(false);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        // Reuse the exact global dataset when already signed in.
        // Public visitors cannot invoke the authenticated function.
        if (session) {
          try {
            const { data, error } = await supabase.functions.invoke("skillcredit-leaderboard", { body: {} });
            if (error || !Array.isArray(data?.profiles)) throw error || new Error("Invalid global leaderboard payload");
            if (!cancelled) {
              setTopRated(sortedTopThree(data.profiles));
              setRatingsSource("global");
            }
            return;
          } catch (functionError) {
            console.warn("Home global ratings unavailable; using public review preview", functionError);
          }
        }
        const publicTop = await publicRatingsPreview();
        if (!cancelled) {
          setTopRated(publicTop);
          setRatingsSource("public");
        }
      } catch (error) {
        console.error("Home ratings preview unavailable", error);
        if (!cancelled) {
          setTopRated([]);
          setRatingsUnavailable(true);
        }
      } finally {
        if (!cancelled) setRatingsLoading(false);
      }
    };
    fetchTopRated();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="sc-home" style={{ fontFamily:"'DM Sans',sans-serif", overflowX:"hidden", width: "100%" }}>
      <style>{`
        .sc-home { color:#162b21; }
        .sc-home section { scroll-margin-top:75px; }
        .sc-home a:focus-visible { outline:3px solid #66b88d; outline-offset:4px; }
        .sc-home ::selection { background:#c7eed5; color:#10452d; }
        /* Shared soft-green background, visually matching the public auth pages.
           A single Home canvas keeps section boundaries clean and unbroken. */
        .sc-home {
          background:
            radial-gradient(circle at 0% 0%, rgba(208,234,199,.62) 0%, rgba(208,234,199,0) 29%),
            radial-gradient(circle at 100% 85%, rgba(214,240,208,.64) 0%, rgba(214,240,208,0) 34%),
            linear-gradient(180deg,#f3faee 0%,#eef6eb 48%,#f8fbf5 100%);
        }
        .sc-home .hero-section { position:relative; isolation:isolate; background:transparent; }
        /* Download section shares the same pastel canvas while retaining its mock phone/card layout. */
        .sc-home .sc-download-section { background:transparent; }
        .sc-home .home-soft-bubbles { position:relative; isolation:isolate; overflow:hidden; }
        /* Keep decorative shapes smaller than the content; they fade within each section. */
        .sc-home .home-soft-bubbles::before {
          content:"";
          position:absolute;
          top:0; left:0;
          width:clamp(155px,20vw,250px);
          height:clamp(108px,14vw,165px);
          pointer-events:none;
          z-index:0;
          background:
            radial-gradient(ellipse at -15% -5%,rgba(146,192,126,.26) 0 34%,transparent 69%),
            radial-gradient(ellipse at 15% -24%,rgba(205,236,193,.51) 0 52%,transparent 79%);
        }
        /* A single delicate gold arc like the Login/Register background. */
        .sc-home .home-soft-bubbles::after {
          content:"";
          position:absolute;
          top:0; left:0;
          width:clamp(165px,22vw,268px);
          height:clamp(105px,13vw,162px);
          background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 268 162'%3E%3Cpath d='M -24 156 C 28 93 99 91 145 53 S 225 14 285 -28' fill='none' stroke='%23d6b476' stroke-width='1.1' opacity='.65'/%3E%3C/svg%3E") no-repeat left top / 100% 100%;
          pointer-events:none;
          z-index:0;
          opacity:.55;
        }
        .sc-home .home-soft-bubbles > * { position:relative; z-index:1; }
        .sc-home #how-it-works.home-soft-bubbles::before,
        .sc-home #how-it-works.home-soft-bubbles::after,
        .sc-home .home-leaderboard.home-soft-bubbles::before,
        .sc-home .home-leaderboard.home-soft-bubbles::after {
          left:auto; right:0;
          transform:scaleX(-1);
        }
        @media(max-width:600px) {
          .sc-home .home-soft-bubbles::before { width:140px;height:102px; }
          .sc-home .home-soft-bubbles::after { width:144px;height:94px; }
        }
                .sc-home .hero-shell {max-width:1200px;margin:0 auto;padding:26px 48px;width:100%;}
        .sc-home .hero-download-link {display:inline-flex;align-items:center;gap:9px;margin-top:7px;font-size:13px;font-weight:800;color:#2d6a4f;text-decoration:none;border-bottom:1px solid transparent;transition:gap .2s,border-color .2s;}
        .sc-home .hero-download-link:hover {gap:14px;border-color:#2d6a4f;}
        .sc-home .hero-preview {transform:perspective(1100px) rotateY(-3deg);transition:transform .6s ease,box-shadow .6s ease;}
        .sc-home .hero-preview:hover {transform:perspective(1100px) rotateY(0) translateY(-5px);}
        .sc-home .section-pad h2 {text-wrap:balance;}
        .sc-home .feature-card {position:relative;overflow:hidden;}
        .sc-home .feature-card:before {content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,#2d6a4f,#93c8a5);opacity:0;transition:opacity .25s;}
        .sc-home .feature-card:hover:before {opacity:1;}
        .sc-home .topic-pill:hover {border-color:#9fd5b4!important;}
        .sc-home .site-footer a:focus-visible {outline-color:white;}
        .sc-home .home-anchor {display:inline-flex;gap:7px;align-items:center;text-decoration:none;font-weight:800;color:#297d50;font-size:13px;padding:10px 15px;border:1px solid #cfe3d2;border-radius:999px;background:white;transition:transform .2s,box-shadow .2s;}
        .sc-home .home-anchor:hover {transform:translateY(-3px);box-shadow:0 8px 20px rgba(45,106,79,.1);}
        @media(max-width:768px){.sc-home .hero-shell{padding:24px 22px}.sc-home .hero-section{min-height:unset!important;padding:55px 0 70px!important}.sc-home .hero-preview{transform:none}.sc-home .hero-h1-text{font-size:clamp(40px,9vw,58px)!important}.sc-home .section-pad h2{font-size:clamp(30px,7vw,42px)!important}}
        @media(prefers-reduced-motion:reduce){.sc-home *, .sc-home *:before, .sc-home *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}.sc-home .reveal{opacity:1;transform:none}}
        @keyframes fadeUp      {from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes pulse       {0%,100%{opacity:1}50%{opacity:0.4}}
        
        .reveal{opacity:0;transform:translateY(36px);transition:opacity .7s ease,transform .7s ease}
        .reveal.visible{opacity:1;transform:none}

        .hero-tag{animation:fadeUp .5s ease both}
        .hero-h1{animation:fadeUp .5s .08s ease both}
        .hero-p{animation:fadeUp .5s .16s ease both}
        .hero-btns{animation:fadeUp .5s .24s ease both}
        .hero-proof{animation:fadeUp .5s .32s ease both}
        .preview-col{animation:fadeUp .6s .18s ease both}

        .feature-card{transition:transform .2s,box-shadow .2s}
        .feature-card:hover{transform:translateY(-5px);box-shadow:0 14px 40px rgba(0,0,0,0.06)!important}
        .topic-pill{transition:all .2s}
        .topic-pill:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.08)}
        .explore-pill-cloud-v1{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:1080px;margin:0 auto}
        .explore-pill-v1{max-width:100%;transition:transform .2s,box-shadow .2s}
        .explore-pill-v1:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(45,106,79,.10)!important}
        @media(max-width:480px){.explore-pill-cloud-v1{gap:8px}.explore-pill-v1{padding:8px 11px!important;font-size:12px!important}}

        .hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
        .features-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .community-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
        .problem-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:24px;align-items:center;max-width:700px;margin:0 auto}
        /* Premium but restrained Top Rated spotlight — Home only. */
        .sc-home .home-leaderboard-inner{max-width:940px;margin:0 auto}
        .sc-home .home-leaderboard-kicker{display:inline-flex;align-items:center;gap:7px;color:#28734f;font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
        .sc-home .home-leaderboard-stage{display:grid;grid-template-columns:minmax(0,1.03fr) minmax(0,.97fr);gap:16px;align-items:stretch}
        .sc-home .home-leaderboard-champion{position:relative;min-width:0;overflow:hidden;border:1px solid #c6dfce;background:linear-gradient(140deg,#f4faf5 0%,#fff 75%);border-radius:23px;padding:26px 27px;box-shadow:0 14px 35px rgba(25,77,47,.07)}
        .sc-home .home-leaderboard-champion:before{content:"";position:absolute;top:-75px;right:-75px;height:225px;width:225px;border-radius:50%;background:radial-gradient(circle,#d5efd9 0%,transparent 70%);pointer-events:none}
        .sc-home .home-leaderboard-featured-tag{position:relative;z-index:1;display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:#e4f2e9;color:#245a3b;font-size:11px;font-weight:800}
        .sc-home .home-leaderboard-hero-person{position:relative;display:flex;align-items:center;gap:16px;min-width:0;margin:25px 0 22px}
        .sc-home .home-leaderboard-hero-avatar{width:76px;height:76px;flex:0 0 76px;display:grid;place-items:center;overflow:hidden;border:4px solid #fff;border-radius:22px;background:#d7e8dd;color:#275b41;font-size:22px;font-weight:800;box-shadow:0 5px 18px rgba(28,81,51,.10)}
        .sc-home .home-leaderboard-profile-photo{width:100%;height:100%;display:block;object-fit:cover}
        .sc-home .home-leaderboard-hero-name{margin:0;color:#1e3d2c;font-size:clamp(19px,2.1vw,24px);font-weight:850;line-height:1.22;overflow-wrap:anywhere}
        .sc-home .home-leaderboard-role{margin:6px 0 0;color:#6e8775;font-size:12px;font-weight:650}
        .sc-home .home-leaderboard-rating-panel{position:relative;display:flex;align-items:center;flex-wrap:wrap;gap:6px 11px;padding-top:19px;border-top:1px solid #e0eae2}
        .sc-home .home-leaderboard-hero-rating{display:inline-flex;align-items:center;gap:7px;color:#244c35;font-size:29px;font-weight:850;font-variant-numeric:tabular-nums;line-height:1}
        .sc-home .home-leaderboard-review-meta{color:#788879;font-size:12px;font-weight:600}
        .sc-home .home-leaderboard-others{min-width:0;border-radius:23px;border:1px solid #e2eae1;background:#fff;padding:17px 20px;display:flex;flex-direction:column;box-shadow:0 7px 26px rgba(25,77,47,.045)}
        .sc-home .home-leaderboard-others-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 1px 14px;color:#2d533b;font-size:13px;font-weight:800}
        .sc-home .home-leaderboard-row{display:flex;align-items:center;gap:12px;min-width:0;flex:1;padding:14px 2px;border-top:1px solid #edf2ed}
        .sc-home .home-leaderboard-rank{flex:0 0 25px;font-size:19px;color:#9ba99c;font-weight:900;font-variant-numeric:tabular-nums}
        .sc-home .home-leaderboard-avatar{flex:0 0 49px;width:49px;height:49px;border-radius:15px;background:#ebf2ee;display:grid;place-items:center;overflow:hidden;color:#436b53;font-size:14px;font-weight:800}
        .sc-home .home-leaderboard-person{flex:1;min-width:0}
        .sc-home .home-leaderboard-name{display:block;color:#263e30;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sc-home .home-leaderboard-review-count{display:block;color:#879587;font-size:11px;margin-top:4px}
        .sc-home .home-leaderboard-score{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;color:#805b23;font-size:14px;font-weight:850;font-variant-numeric:tabular-nums}
        .sc-home .home-leaderboard-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:18px}
        .sc-home .home-leaderboard-note{margin:0;color:#718074;font-size:11px;line-height:1.6}
        .sc-home .home-leaderboard-more{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;padding:10px 16px;border:1px solid #b9d7c0;background:#fff;color:#2c6e49;font-size:12px;font-weight:800;text-decoration:none;transition:transform .2s,box-shadow .2s}
        .sc-home .home-leaderboard-more:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(35,106,68,.09)}
        .sc-home .home-leaderboard-empty{grid-column:1/-1;text-align:center;border:1px dashed #cbdccf;background:#fff;border-radius:22px;padding:28px 20px;color:#728475;font-size:13px;line-height:1.65}
        @media(max-width:680px){
          .sc-home .home-leaderboard-stage{grid-template-columns:1fr;gap:11px}
          .sc-home .home-leaderboard-champion{padding:19px 19px 20px;border-radius:19px}
          .sc-home .home-leaderboard-hero-person{margin:18px 0;gap:13px}
          .sc-home .home-leaderboard-hero-avatar{width:62px;height:62px;flex-basis:62px;border-radius:19px}
          .sc-home .home-leaderboard-hero-name{font-size:20px}
          .sc-home .home-leaderboard-hero-rating{font-size:24px}
          .sc-home .home-leaderboard-others{padding:9px 15px;border-radius:18px}
          .sc-home .home-leaderboard-row{padding:13px 0;gap:10px}
          .sc-home .home-leaderboard-others-title{padding:7px 0 11px}
          .sc-home .home-leaderboard-footer{align-items:flex-start;flex-direction:column;gap:9px}
        }
        @media(max-width:350px){
          .sc-home .home-leaderboard-champion{padding:17px 14px}
          .sc-home .home-leaderboard-others{padding:8px 12px}
          .sc-home .home-leaderboard-avatar{width:39px;height:39px;flex-basis:39px;border-radius:12px}
          .sc-home .home-leaderboard-row{gap:8px}
          .sc-home .home-leaderboard-rank{flex-basis:19px}
          .sc-home .home-leaderboard-name{font-size:12px}
          .sc-home .home-leaderboard-score{font-size:12px}
        }
        .footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}

        @media(max-width:1024px){
          .features-grid{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:768px){
          .hero-grid{grid-template-columns:1fr;gap:36px}
          .steps-grid{grid-template-columns:1fr;gap:14px}
          .community-grid{grid-template-columns:1fr;gap:32px}
          .problem-grid{grid-template-columns:1fr;gap:16px}

          .preview-col{display:none}
          .section-pad{padding:60px 20px!important}
          .footer-inner{flex-direction:column;text-align:center}
        }
        @media(max-width:480px){
          .features-grid{grid-template-columns:1fr}
          .hero-h1-text{font-size:40px!important}
          .hero-btns-wrap{flex-direction:row;align-items:center;justify-content:center;flex-wrap:wrap}
          .hero-btns-wrap a{width:auto;text-align:center;justify-content:center}
        }

        /* Mobile Home layout polish: presentation only; all existing links and handlers remain unchanged. */
        .sc-home .home-final-cta-inner{max-width:680px;margin:0 auto;}
        .sc-home .home-final-cta-actions a,
        .sc-home .hero-btns-wrap a,
        .sc-home .home-anchor{min-height:44px;}

        @media(max-width:768px){
          .sc-home .site-footer{padding:30px 20px 22px!important;}
          .sc-home .footer-inner{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;text-align:center;width:100%;}
          .sc-home .footer-signature{transform:none!important;display:flex;align-items:center;flex-direction:column;justify-content:center;width:100%;max-width:100%;text-align:center!important;}
          .sc-home .footer-team-pill{max-width:100%;gap:10px!important;padding:8px 13px!important;justify-content:center;}
          .sc-home .footer-links{justify-content:center;flex-wrap:wrap;gap:12px 20px!important;}
          .sc-home .footer-signature > p{color:#b9c4be!important;margin-bottom:10px!important;}
          .sc-home .footer-team-pill span:nth-child(2){color:#d3e5dc!important;}
          .sc-home .footer-copyright{color:#9ca9a2!important;line-height:1.6;}
          .sc-home .home-final-cta{padding:58px 20px!important;}
          .sc-home .home-final-cta h2{font-size:clamp(28px,7vw,39px)!important;line-height:1.18!important;}
          .sc-home .home-final-cta p{font-size:clamp(12px,3.5vw,15px)!important;line-height:1.65;}
          .sc-home .home-final-cta-inner > p:last-child{color:rgba(255,255,255,.78)!important;}
          .sc-home .home-final-cta-actions{margin-bottom:14px!important;}
          .sc-home .home-final-cta-btn{width:auto!important;max-width:100%;min-height:44px;padding:12px 19px!important;font-size:clamp(12px,3.5vw,15px)!important;line-height:1.4;justify-content:center;text-align:center;white-space:normal;overflow-wrap:break-word;}
          .sc-home .hero-btns-wrap{gap:10px!important;}
          .sc-home .hero-btns-wrap a{max-width:100%;min-height:44px;padding:12px 18px!important;font-size:clamp(12px,3.5vw,15px)!important;line-height:1.35;text-align:center;justify-content:center;}
          .sc-home .hero-download-link{font-size:12px!important;line-height:1.5;}
          .sc-home .home-anchor{font-size:12px!important;padding:10px 13px!important;max-width:100%;}
        }
        @media(max-width:480px){
          .sc-home .hero-shell{padding:22px 20px!important;}
          .sc-home .hero-btns-wrap{align-items:center;justify-content:center;gap:8px!important;}
          .sc-home .hero-btns-wrap a{width:auto!important;flex:0 1 auto;align-self:auto;white-space:nowrap;padding:11px 13px!important;font-size:13px!important;min-height:44px;}
          .sc-home .home-final-cta-actions{gap:10px!important;}
          .sc-home .home-final-cta-btn{padding:12px 14px!important;}
          .sc-home .footer-team-pill{gap:8px!important;}
        }
        @media(max-width:350px){
          .sc-home .hero-shell{padding:20px 16px!important;}
          .sc-home .hero-btns-wrap a{font-size:12px!important;padding:11px 10px!important;}
          .sc-home .home-final-cta-btn{font-size:12px!important;padding:11px 12px!important;}
          .sc-home .site-footer{padding-left:16px!important;padding-right:16px!important;}
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="hero-section home-soft-bubbles" style={{ minHeight:"calc(100vh - 64px)", display:"flex", alignItems:"center", width:"100%", padding:"40px 0" }}>
        <div className="hero-shell">
          <div className="hero-grid">
            <div>
              <div className="hero-tag" style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#e8f4e8", border:"1.5px solid #b7e4c7", padding:"6px 16px", borderRadius:999, marginBottom:24 }}>
                <Rocket size={14} color="#2d6a4f" style={{ animation:"pulse 2s infinite" }} />
                <span style={{ fontSize:12, color:"#2d6a4f", fontWeight:700 }}>Learn, teach, and grow</span>
              </div>
              <h1 className="hero-h1">
                <span className="hero-h1-text" style={{ fontFamily:"'Fraunces',serif", fontSize:62, fontWeight:900, color:"#111", lineHeight:1.05, display:"block", marginBottom:20, letterSpacing:"-0.02em" }}>
                  Share skills.<br /><em style={{ color:"#2d6a4f", fontStyle:"italic" }}>Earn credits.</em><br />Keep learning.
                </span>
              </h1>
              <p className="hero-p" style={{ fontSize:17, color:"#555", lineHeight:1.75, marginBottom:32, maxWidth:460 }}>
                Discover skills you can learn with credits, and <strong style={{ color:"#2d6a4f" }}>earn credits by teaching what you know</strong>. Optional wallet top-ups are available.
              </p>
              <div className="hero-btns">
                <div className="hero-btns-wrap" style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:12 }}>
                  <Link to="/register" className="cta-btn hero-primary-btn" style={{ background:"#2d6a4f", color:"#fff", padding:"13px 20px", borderRadius:12, fontWeight:800, fontSize:14, boxShadow:"0 6px 20px rgba(45,106,79,0.2)", display:"inline-flex", alignItems:"center", gap:8 }}>
                    Join free · 20 credits
                  </Link>
                  <Link to="/login" className="hero-secondary-btn" style={{ background:"#f0ece4", color:"#444", padding:"13px 18px", borderRadius:12, fontWeight:700, fontSize:14, display:"inline-flex", alignItems:"center", gap:8 }}>
                    Log in
                  </Link>
                </div>
                <p style={{ fontSize:12, color:"#888", marginBottom:12 }}>No credit card required · Free to get started</p>
                <a href="#download-app" className="hero-download-link"><Smartphone size={16}/> Prefer mobile? Get the Android app <span aria-hidden="true">→</span></a>
              </div>

              <div className="hero-proof" style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", border:"1.5px solid #e8e2d9", borderRadius:16, padding:"14px 18px", boxShadow:"0 2px 12px rgba(0,0,0,.04)", maxWidth:420 }}>
                <div style={{ display:"flex", marginRight:4 }}>
                  {["#2d6a4f","#b45309","#9d174d","#3730a3","#166534"].map((c,i) => (
                    <div key={i} style={{ width:28, height:28, borderRadius:"50%", background:c, border:"2px solid #fff", marginLeft:i===0?0:-8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#fff", fontWeight:900 }}>
                      {["M","S","R","J","L"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#111", lineHeight:1.2 }}>Share what you know</div>
                  <div style={{ fontSize:11, color:"#999", marginTop:2 }}>Create an account and start with 20 SkillCredits</div>
                </div>
              </div>
            </div>

            {/* Right — preview */}
            <div className="preview-col" style={{ position:"relative" }}>
              <div style={{ position:"absolute", top:"10%", left:"10%", width:"80%", height:"80%", background:"radial-gradient(ellipse,rgba(45,106,79,0.1) 0%,transparent 70%)", pointerEvents:"none", borderRadius:"50%" }} />
              
              <div className="hero-preview" style={{ position:"relative", borderRadius:24, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.14),0 0 0 1.5px #e8e2d9", background:"#fff" }}>
                
                {/* Fake Browser Header */}
                <div style={{ background:"#f5f0e8", padding:"10px 16px", display:"flex", alignItems:"center", gap:8, borderBottom:"1.5px solid #e8e2d9" }}>
                  <div style={{ display:"flex", gap:5 }}>
                    {["#fc605b","#fdbc40","#34c84a"].map(c => <div key={c} style={{ width:11, height:11, borderRadius:"50%", background:c }} />)}
                  </div>
                  <div style={{ flex:1, background:"#fff", borderRadius:6, padding:"4px 12px", fontSize:11, color:"#aaa", fontWeight:600 }}>SkillCredit · Illustrative preview</div>
                </div>

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

          </div>
        </div>
      </section>

      {/* ── WHY THIS EXISTS (ABOUT) ── */}
      <section id="about" className="section-pad reveal" style={{ background:"#111", padding:"80px 48px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", textAlign:"center" }}>
          <span style={{ fontSize:12, fontWeight:800, color:"#52b788", letterSpacing:"0.12em", textTransform:"uppercase" }}>The Problem</span>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:40, fontWeight:900, color:"#fff", marginTop:10, marginBottom:16, letterSpacing:"-0.02em", lineHeight:1.15 }}>
            Learning is expensive.<br /><em style={{ color:"#52b788", fontStyle:"italic" }}>But everyone knows something valuable.</em>
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.5)", lineHeight:1.8, maxWidth:600, margin:"0 auto 48px" }}>
            Finding an affordable teacher can take time. SkillCredit helps people share the skills they know and learn from one another.
          </p>
          <div className="problem-grid">
            <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:20, padding:"28px 24px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ marginBottom:12, display:"flex", justifyContent:"center" }}>
                <Wallet size={36} color="#ef4444" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#fff", marginBottom:8 }}>Before SkillCredit</h3>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", lineHeight:1.7 }}>Lessons can be costly, and finding the right teacher may take extra time.</p>
            </div>
            <div style={{ fontSize:28, color:"#52b788", fontWeight:900 }}>→</div>
            <div style={{ background:"rgba(82,183,136,0.1)", borderRadius:20, padding:"28px 24px", border:"1.5px solid rgba(82,183,136,0.25)" }}>
              <div style={{ marginBottom:12, display:"flex", justifyContent:"center" }}>
                <Globe size={36} color="#52b788" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#52b788", marginBottom:8 }}>With SkillCredit</h3>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.7 }}>Teach a skill to earn credits after a completed session, then use those credits to book a lesson.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT CAN YOU LEARN (EXPLORE) ── */}
      <section id="explore" className="section-pad reveal home-soft-bubbles" style={{ background:"transparent", padding:"72px 48px" }}>
        <div style={{ maxWidth:1080, margin:"0 auto", textAlign:"center" }}>
          <span style={{ fontSize:12, fontWeight:800, color:"#2d6a4f", letterSpacing:"0.12em", textTransform:"uppercase" }}>Explore by interest · {learnTopics.length} categories</span>
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

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="section-pad reveal home-soft-bubbles" style={{ background:"transparent", padding:"80px 48px", borderTop:"1px solid rgba(151,180,158,.18)", borderBottom:"1px solid rgba(151,180,158,.18)" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#2d6a4f", letterSpacing:"0.12em", textTransform:"uppercase" }}>How it works</span>
            <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:40, fontWeight:900, color:"#111", marginTop:10, letterSpacing:"-0.02em" }}>Simple. Fair. Powerful.</h2>
          </div>
          <div className="steps-grid">
            {[
              { Icon: UserPlus, num:"01", title:"Sign up & get 20 credits",      desc:"Create your account, set up your interests, and start with 20 SkillCredits in your wallet." },
              { Icon: CalendarCheck, num:"02", title:"Book a session",                desc:"Find an approved skill listing, request a session, and confirm the schedule with your teacher." },
              { Icon: Award, num:"03", title:"Teach & earn",                  desc:"Complete a teaching session and confirm completion with your learner to receive credits." },
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

      {/* ── FEATURES ── */}
      <section id="features" className="section-pad reveal home-soft-bubbles" style={{ padding:"80px 48px", background:"transparent" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#2d6a4f", letterSpacing:"0.12em", textTransform:"uppercase" }}>Platform Features</span>
            <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:40, fontWeight:900, color:"#111", marginTop:10, letterSpacing:"-0.02em" }}>Tools to learn with confidence</h2>
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

      {/* ── TOP RATED SPOTLIGHT: same 5-question scoring + 3-review minimum ── */}
      <section className="section-pad reveal home-leaderboard home-soft-bubbles" style={{ background:"transparent", padding:"75px 48px", borderTop:"1px solid rgba(151,180,158,.18)", borderBottom:"1px solid rgba(151,180,158,.18)" }}>
        <div className="home-leaderboard-inner">
          <div style={{ textAlign:"center", marginBottom:30 }}>
            <span className="home-leaderboard-kicker"><Trophy size={14} /> Community Leaderboard</span>
            <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:"clamp(28px,4vw,37px)", fontWeight:900, color:"#162b21", marginTop:10, lineHeight:1.18 }}>
              The people learners rate highest.
            </h2>
            <p style={{ fontSize:14, color:"#68796d", margin:"11px auto 0", lineHeight:1.65, maxWidth:540 }}>
              A spotlight on instructors with at least 3 learner reviews, ranked by their overall review scores.
            </p>
          </div>

          <div className="home-leaderboard-stage" aria-label="Top rated instructors preview" aria-busy={ratingsLoading}>
            {ratingsLoading ? (
              <div className="home-leaderboard-empty" role="status">Checking eligible learner ratings…</div>
            ) : ratingsUnavailable ? (
              <div className="home-leaderboard-empty" role="status">Ratings are temporarily unavailable. Sign in to view the full leaderboard.</div>
            ) : topRated.length === 0 ? (
              <div className="home-leaderboard-empty">No eligible ratings are visible in this preview yet. Sign in to explore the full leaderboard.</div>
            ) : (
              <>
                <article className="home-leaderboard-champion">
                  <div className="home-leaderboard-featured-tag"><Trophy size={13} /> #1 · Top Rated</div>
                  <div className="home-leaderboard-hero-person">
                    <div className="home-leaderboard-hero-avatar">
                      {topRated[0].avatar_url ? <img className="home-leaderboard-profile-photo" src={topRated[0].avatar_url} alt="" /> : getInitials(topRated[0].full_name)}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <h3 className="home-leaderboard-hero-name">{topRated[0].full_name || 'SkillCredit member'}</h3>
                      <p className="home-leaderboard-role">Top Rated · Community member</p>
                    </div>
                  </div>
                  <div className="home-leaderboard-rating-panel">
                    <span className="home-leaderboard-hero-rating"><Star size={23} fill="#e4b457" color="#bd872c" aria-hidden="true" />{Number(topRated[0].avgRating).toFixed(1)}</span>
                    <span className="home-leaderboard-review-meta">/ 5 · {topRated[0].totalReviews} learner {topRated[0].totalReviews === 1 ? 'review' : 'reviews'}</span>
                  </div>
                </article>

                <div className="home-leaderboard-others">
                  <div className="home-leaderboard-others-title"><span>Also leading the way</span><Medal size={17} color="#8b997f" aria-hidden="true" /></div>
                  {topRated.slice(1).map((user, idx) => (
                    <div className="home-leaderboard-row" key={user.id}>
                      <span className="home-leaderboard-rank">{idx + 2}</span>
                      <span className="home-leaderboard-avatar">
                        {user.avatar_url ? <img className="home-leaderboard-profile-photo" src={user.avatar_url} alt="" /> : getInitials(user.full_name)}
                      </span>
                      <span className="home-leaderboard-person">
                        <span className="home-leaderboard-name" title={user.full_name || 'SkillCredit member'}>{user.full_name || 'SkillCredit member'}</span>
                        <span className="home-leaderboard-review-count">{user.totalReviews} learner reviews</span>
                      </span>
                      <span className="home-leaderboard-score"><Star size={15} fill="#e4b457" color="#bd872c" aria-hidden="true" />{Number(user.avgRating).toFixed(1)}</span>
                    </div>
                  ))}
                  {topRated.length === 1 && <p style={{ color:'#839184', fontSize:12, padding:'12px 2px' }}>More instructors will appear here as they earn 3 reviews.</p>}
                </div>
              </>
            )}
          </div>
          <div className="home-leaderboard-footer">
            <p className="home-leaderboard-note">5 review criteria · 3+ reviews to qualify{ratingsSource === 'public' ? ' · Public preview' : ' · Global ratings'}</p>
            <Link to="/login" className="home-leaderboard-more">Explore full leaderboard <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      {/* ── ANDROID APP DOWNLOAD — isolated reusable UI component ── */}
      <DownloadAppSection />

      {/* ── FINAL CTA ── */}
      <section className="section-pad reveal home-final-cta" style={{ background:"linear-gradient(135deg,#1a3d2e 0%,#2d6a4f 50%,#1a4a35 100%)", padding:"96px 48px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-60, left:"10%", width:300, height:300, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        <div style={{ position:"absolute", bottom:-80, right:"15%", width:400, height:400, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }} />
        <div className="home-final-cta-inner" style={{ position:"relative" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:999, padding:"6px 18px", marginBottom:24, fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>
            <Rocket size={14} color="#fff" /> Join the SkillCredit community
          </div>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:48, fontWeight:900, color:"#fff", marginBottom:16, letterSpacing:"-0.02em", lineHeight:1.1 }}>
            Ready to start your<br /><em style={{ fontStyle:"italic", color:"#b7e4c7" }}>skill journey?</em>
          </h2>
          <p style={{ fontSize:17, color:"rgba(255,255,255,0.65)", maxWidth:500, margin:"0 auto 40px" }}>
            Share what you know, explore skills you want to learn, and connect with the community.
          </p>
          <div className="home-final-cta-actions" style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:16 }}>
            <Link to="/register" className="cta-btn home-final-cta-btn" style={{ background:"#fff", color:"#2d6a4f", padding:"13px 22px", borderRadius:12, fontWeight:800, fontSize:14, display:"inline-flex", alignItems:"center", gap:8 }}>
              Join free · Get 20 credits
            </Link>
          </div>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>No credit card required to sign up · 20 starting credits · Optional paid top-ups</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="site-footer" style={{ background:"#111", padding:"32px 48px" }}>
        <div className="footer-inner">
          <div style={{ display:"flex", alignItems:"center" }}>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#2d6a4f" }}>Skill</span>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:900, color:"#fff" }}>Credit</span>
          </div>
          <div className="footer-signature" style={{ textAlign: "center", transform: "translateX(35px)" }}>
            <p style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>
              Built with ❤️ for learners and teachers
            </p>

            <div
              className="footer-team-pill"
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
          <div className="footer-links" style={{ display:"flex", gap:16 }}>
            {[
              { label: "Privacy", path: "/privacy" },
              { label: "Terms", path: "/terms" },
              { label: "Contact", path: "/contact" },
            ].map(({ label, path }) => (
              <Link key={path} to={path} style={{ fontSize:13, color:"#cbd5d1", fontWeight:600, transition:"color .15s" }}
                onMouseOver={e => (e.currentTarget.style.color="#fff")}
                onMouseOut={e  => (e.currentTarget.style.color="#cbd5d1")}>{label}</Link>
            ))}
          </div>
        </div>
        <div style={{ borderTop:"1px solid #222", marginTop:24, paddingTop:20, textAlign:"center" }}>
          <p className="footer-copyright" style={{ fontSize:11, color:"#333" }}>© 2026 SkillCredit · All rights reserved · Thesis Project</p>
        </div>
      </footer>
    </div>
  );
}