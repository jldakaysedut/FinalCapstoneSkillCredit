import { ArrowDownToLine, ArrowUpRight, Check, Download, GraduationCap, MessageCircle, ShieldCheck, Smartphone, Sparkles, Wifi } from 'lucide-react';

// Update this link when you publish a new production APK or a permanent download URL.
// This currently opens the previously supplied Expo EAS build page, not a direct APK binary.
const ANDROID_BUILD_URL = 'https://expo.dev/accounts/jldakay/projects/skillcredit-mobile/builds/55b17488-a1a4-4ad5-8bdc-923ec6b1d90b?fbclid=IwY2xjawVeeM9leHRuA2FlbQIxMABwZG9mAWJyaWQRMXA2MElvSjlveVZxbDYydmdzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEfcGj2feucnneWv5SgDAara4G2Y5fAu4-wPBpiy1tyTdnHQ2H2TGZNxIUFYDM_aem_O1x5uIG4lqmsilw9lAHiaA';

const perks = [
  { Icon: MessageCircle, label: 'Stay connected', detail: 'Keep up with your learning community.' },
  { Icon: GraduationCap, label: 'Learn on the go', detail: 'Explore skills and manage your sessions.' },
  { Icon: ShieldCheck, label: 'Your same account', detail: 'Sign in using your SkillCredit credentials.' },
];

export default function DownloadAppSection() {
  return (
    <section id="download-app" className="sc-download-section" aria-labelledby="sc-download-title">
      <style>{`
        .sc-download-section{position:relative;padding:105px 32px;overflow:hidden;isolation:isolate;scroll-margin-top:82px;background:#edf7ed}
        .sc-download-section::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 80% 25%,rgba(107,190,143,.28),transparent 40%),radial-gradient(circle at 10% 100%,rgba(255,255,255,.95),transparent 45%)}
        .sc-download-inner{max-width:1120px;margin:auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
        .sc-download-kicker{display:inline-flex;gap:8px;align-items:center;padding:8px 14px;border:1px solid #b8dfc4;background:white;border-radius:999px;color:#17623c;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
        .sc-download-title{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(36px,4.5vw,58px);letter-spacing:-.035em;color:#123b2a;line-height:1.12;margin:20px 0}
        .sc-download-title em{color:#26865a;font-style:italic}
        .sc-download-description{font-size:16px;line-height:1.85;color:#527365;max-width:510px}
        .sc-download-perks{display:grid;gap:18px;margin:28px 0 32px}
        .sc-download-perk{display:flex;align-items:center;gap:14px}
        .sc-download-perk-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:#fff;border:1px solid #d8eadd;color:#26774f;flex:none}
        .sc-download-actions{display:flex;flex-wrap:wrap;align-items:center;gap:14px}
        .sc-download-btn{display:inline-flex;gap:10px;align-items:center;justify-content:center;background:#176e49;color:white;text-decoration:none;font-weight:800;font-size:15px;padding:17px 23px;border-radius:14px;box-shadow:0 12px 30px rgba(23,110,73,.22);transition:transform .2s ease,box-shadow .2s ease,background .2s ease}
        .sc-download-btn:hover{transform:translateY(-3px);background:#0f5738;box-shadow:0 18px 38px rgba(23,110,73,.3)}
        .sc-download-btn:focus-visible{outline:3px solid #83c8a5;outline-offset:4px}
        .sc-download-note{color:#6d8577;font-size:12px;line-height:1.6;margin-top:14px;max-width:430px}
        .sc-phone-scene{display:flex;justify-content:center;align-items:center;position:relative;min-height:540px}
        .sc-phone-aura{position:absolute;width:min(100%,450px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(37,136,82,.18),transparent 70%);filter:blur(4px)}
        .sc-phone-shell{position:relative;width:264px;height:510px;border:8px solid #21372e;box-shadow:0 28px 65px rgba(14,55,33,.27),0 0 0 2px rgba(255,255,255,.7);background:#fafcf9;border-radius:38px;overflow:hidden;transform:rotate(6deg);animation:scPhoneFloat 5s ease-in-out infinite}
        .sc-phone-notch{width:90px;height:22px;position:absolute;z-index:2;top:0;left:50%;transform:translateX(-50%);background:#21372e;border-radius:0 0 15px 15px}
        .sc-phone-head{background:linear-gradient(135deg,#166840,#2e9560);color:white;padding:42px 20px 25px}
        .sc-phone-card{background:white;border:1px solid #e5eee7;border-radius:14px;padding:13px;box-shadow:0 4px 12px rgba(16,70,40,.05)}
        .sc-floating-chip{position:absolute;display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #deebe1;border-radius:15px;padding:11px 14px;box-shadow:0 14px 35px rgba(28,85,53,.12);font-size:12px;font-weight:800;color:#285a41;animation:scChipFloat 5s ease-in-out infinite}
        .sc-chip-top{top:14%;left:0}.sc-chip-bottom{bottom:15%;right:0;animation-delay:-2.5s}
        @keyframes scPhoneFloat{0%,100%{transform:translateY(0) rotate(6deg)}50%{transform:translateY(-12px) rotate(4deg)}}
        @keyframes scChipFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        @media(max-width:900px){.sc-download-inner{grid-template-columns:1fr;gap:25px}.sc-phone-scene{min-height:440px}.sc-phone-shell{width:238px;height:460px}.sc-chip-top{left:12%}.sc-chip-bottom{right:9%}}
        @media(max-width:520px){.sc-download-section{padding:68px 20px}.sc-download-title{font-size:38px}.sc-download-actions{align-items:stretch}.sc-download-btn{width:100%}.sc-phone-scene{min-height:400px;transform:scale(.83);transform-origin:top center;margin-bottom:-55px}.sc-chip-top{left:-9%}.sc-chip-bottom{right:-10%}}
        @media(prefers-reduced-motion:reduce){.sc-phone-shell,.sc-floating-chip{animation:none}.sc-download-btn{transition:none}.sc-download-btn:hover{transform:none}}
      `}</style>
      <div className="sc-download-inner">
        <div className="reveal">
          <span className="sc-download-kicker"><Smartphone size={15} /> SKILLCREDIT FOR ANDROID</span>
          <h2 id="sc-download-title" className="sc-download-title">A world of skills,<br /><em>right in your pocket.</em></h2>
          <p className="sc-download-description">Your SkillCredit community goes wherever you go. Explore what others are teaching, connect with learners, and keep your skill journey moving.</p>
          <div className="sc-download-perks">
            {perks.map(({ Icon, label, detail }) => <div className="sc-download-perk" key={label}>
              <div className="sc-download-perk-icon"><Icon size={20} /></div>
              <div><div style={{ fontSize:14, fontWeight:800, color:'#17452f' }}>{label}</div><div style={{ fontSize:12, color:'#6b8172', marginTop:3 }}>{detail}</div></div>
            </div>)}
          </div>
          <div className="sc-download-actions">
            <a className="sc-download-btn" href={ANDROID_BUILD_URL} target="_blank" rel="noopener noreferrer" aria-label="Open the SkillCredit Android APK build page">
              <Download size={19} /> Get the Android APK <ArrowUpRight size={16}/>
            </a>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#3e7555', fontWeight:700, fontSize:13 }}><Check size={17}/> Free to download</span>
          </div>
          <p className="sc-download-note">Android APK • Opens the Expo build page. Android may ask you to allow installation from your browser. Download only from the official link.</p>
        </div>
        <div className="sc-phone-scene reveal" aria-label="Illustration of SkillCredit mobile app" role="img">
          <div className="sc-phone-aura"/>
          <div className="sc-phone-shell">
            <div className="sc-phone-notch"/>
            <div className="sc-phone-head">
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}><span style={{ fontSize:16,fontWeight:900 }}>SkillCredit</span><Wifi size={16}/></div>
              <div style={{ fontSize:12,opacity:.82 }}>Your learning journey</div>
              <div style={{ fontFamily:"'Fraunces',serif",fontSize:23,fontWeight:900,marginTop:6 }}>Keep growing.</div>
            </div>
            <div style={{ padding:14,display:'grid',gap:11 }}>
              <div className="sc-phone-card" style={{ background:'#eef8f0' }}><div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}><div><span style={{ fontSize:10,color:'#588367' }}>YOUR COMMUNITY</span><div style={{ color:'#1e6540',fontWeight:900,fontSize:17,marginTop:4 }}>Learn & share</div></div><Sparkles size={26} color="#2b8a57"/></div></div>
              <div style={{ fontSize:11,color:'#7b8c81',fontWeight:800,marginTop:4 }}>DISCOVER SKILLS</div>
              {[['Design essentials','Creative skills'],['Coding basics','Technology'],['Cooking together','Everyday skills']].map(([a,b],i)=><div className="sc-phone-card" key={a} style={{ display:'flex',gap:10,alignItems:'center' }}><div style={{ width:35,height:35,borderRadius:10,display:'grid',placeItems:'center',background:['#e4f1ea','#e9ecfb','#fff3e4'][i],color:['#1b7950','#515db5','#ae7629'][i] }}><GraduationCap size={17}/></div><div><div style={{ fontSize:12,fontWeight:800,color:'#244334' }}>{a}</div><div style={{ fontSize:10,color:'#94a69a',marginTop:3 }}>{b}</div></div></div>)}
            </div>
            <div style={{ position:'absolute',bottom:0,left:0,right:0,background:'white',borderTop:'1px solid #e5eee7',padding:'13px 20px',display:'flex',justifyContent:'space-around',color:'#609b79' }}><GraduationCap size={18}/><MessageCircle size={18}/><Smartphone size={18}/></div>
          </div>
          <div className="sc-floating-chip sc-chip-top"><Sparkles size={17} color="#1d965b"/> Explore new skills</div>
          <div className="sc-floating-chip sc-chip-bottom"><ArrowDownToLine size={17} color="#1d965b"/> Learn anywhere</div>
        </div>
      </div>
    </section>
  );
}
