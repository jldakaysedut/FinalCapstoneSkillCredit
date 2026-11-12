import { useState, useEffect, useLayoutEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function MainLayout() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // React Router keeps the old scroll position when switching public pages.
  // Start Privacy, Terms, Contact (and Home) at the top after navigation.
  // Keep section/hash navigation working as before.
  useLayoutEffect(() => {
    if (location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── ITO YUNG MAGIC PARA DUMULAS PABABA ANG SCROLL ──
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* GLOBAL STYLES & FONTS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;0,800;0,900;1,800&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        .nav-link { transition: color .15s, background .15s; }
        .nav-link:hover { color: #2d6a4f !important; background: #eef6ee !important; }
        .cta-btn { transition: transform .2s, box-shadow .2s; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(45,106,79,0.4) !important; }
        .main-nav { box-sizing:border-box; width:100%; gap:12px; }
        .main-nav-logo { flex:0 0 auto; min-width:0; }
        .main-nav-logo a { white-space:nowrap; gap:6px; }
        .main-nav-logo-mark { width:27px; height:27px; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; }
        .main-nav-logo-mark img { width:100%; height:100%; display:block; object-fit:contain; }
        .main-nav-wordmark { display:inline-flex; align-items:center; }
        /* Mobile public-page tabs remain in one row, even on narrow phones. */
        @media(max-width:540px){
          .public-info-tabs { display:grid!important; grid-template-columns:repeat(3,minmax(0,1fr)); width:100%; max-width:100%; gap:2px!important; border-radius:20px!important; }
          .public-info-tabs > a, .public-info-tabs > span { display:flex; align-items:center; justify-content:center; min-width:0; min-height:44px; text-align:center; padding:8px 3px!important; font-size:clamp(10px,2.7vw,12px)!important; line-height:1.25; white-space:normal; }
        }
        .main-nav-auth { flex:0 0 auto; white-space:nowrap; }
        .main-nav-auth a { box-sizing:border-box; display:inline-flex; flex:0 0 auto; min-height:40px; align-items:center; justify-content:center; white-space:nowrap; }
        @media(max-width:480px){
          .main-nav { height:60px!important; padding:0 14px!important; gap:6px!important; }
          .main-nav-logo .main-nav-wordmark span { font-size:clamp(15px,4.45vw,20px)!important; }
          .main-nav-logo-mark { width:23px; height:23px; }
          .main-nav-auth { gap:6px!important; }
          .main-nav-auth a { padding:8px 10px!important; font-size:12px!important; }
        }
        @media(max-width:360px){
          .main-nav { padding:0 10px!important; gap:4px!important; }
          .main-nav-logo .main-nav-wordmark span { font-size:clamp(14px,4.45vw,16px)!important; }
          .main-nav-logo a { gap:4px!important; }
          .main-nav-logo-mark { width:21px; height:21px; }
          .main-nav-auth a { padding:7px 8px!important; font-size:11px!important; }
        }
      `}</style>

      {/* ── PREMIUM STICKY NAVBAR ── */}
      <nav className="main-nav" style={{ 
        position: "sticky", top: 0, zIndex: 200, 
        background: scrolled ? "rgba(250,248,244,0.97)" : "transparent", 
        backdropFilter: scrolled ? "blur(16px)" : "none", 
        borderBottom: scrolled ? "1.5px solid #e8e2d9" : "1.5px solid transparent", 
        padding: "0 32px", height: 60, display: "flex", alignItems: "center", 
        justifyContent: "space-between", transition: "all .3s ease" 
      }}>
        {/* LOGO (Scroll to top) */}
        <div className="main-nav-logo" style={{ display: "flex", alignItems: "center" }}>
          <a href="/#" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <span className="main-nav-logo-mark" aria-hidden="true"><img src="/logo.png" alt="" /></span>
            <span className="main-nav-wordmark">
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: "#2d6a4f" }}>Skill</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: "#111" }}>Credit</span>
            </span>
          </a>
        </div>

        {/* ── ONE-PAGE NAVIGATION LINKS ── */}
        <div className="hidden md:flex gap-2 items-center" style={{ transform: "translateX(35px)" }}>
          {[
            { label: "Home", path: "/#" },
            { label: "Explore Skills", path: "/#explore" },
            { label: "About Us", path: "/#about" },
            { label: "Download App", path: "/#download-app" }
          ].map(link => {
            // Logic para mag-highlight kung nasaan kang section
            const isActive = location.hash === link.path.replace('/', '');
            const isHomeActive = location.pathname === '/' && !location.hash && link.label === "Home";
            const activeStyle = isActive || isHomeActive 
              ? { color: "#2d6a4f", background: "#eef6ee" } 
              : { color: "#555", background: "transparent" };
            
            return (
              <a 
                key={link.label} 
                href={link.path} 
                className="nav-link"
                style={{ 
                  padding: "7px 14px", borderRadius: 8, fontSize: 13, 
                  fontWeight: 600, textDecoration: "none", ...activeStyle
                }}
              >
                {link.label}
              </a>
            )
          })}
        </div>

        {/* AUTH BUTTONS */}
        <div className="main-nav-auth" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="main-nav-login" to="/login" style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #ccc", color: "#444", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            Log in
          </Link>
          <Link to="/register" className="cta-btn main-nav-signup" style={{ padding: "8px 18px", borderRadius: 10, background: "#2d6a4f", color: "#fff", fontWeight: 800, fontSize: 13, boxShadow: "0 4px 14px rgba(45,106,79,0.28)", textDecoration: "none" }}>
            Sign up free
          </Link>
        </div>
      </nav>

      {/* ── MAIN CONTENT OUTLET ── */}
      <main style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>
    </div>
  );
}