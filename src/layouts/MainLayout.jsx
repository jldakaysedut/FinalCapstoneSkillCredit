import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
​
export default function MainLayout() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
​
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
​
  // ── ITO YUNG MAGIC PARA DUMULAS PABABA ANG SCROLL ──
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    }
  }, []);
​
  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* GLOBAL STYLES & FONTS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;0,800;0,900;1,800&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        .nav-link { transition: color .15s, background .15s; }
        .nav-link:hover { color: #2d6a4f !important; background: #eef6ee !important; }
        .cta-btn { transition: transform .2s, box-shadow .2s; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(45,106,79,0.4) !important; }
      `}</style>
​
      {/* ── PREMIUM STICKY NAVBAR ── */}
      <nav style={{ 
        position: "sticky", top: 0, zIndex: 200, 
        background: scrolled ? "rgba(250,248,244,0.97)" : "transparent", 
        backdropFilter: scrolled ? "blur(16px)" : "none", 
        borderBottom: scrolled ? "1.5px solid #e8e2d9" : "1.5px solid transparent", 
        padding: "0 32px", height: 60, display: "flex", alignItems: "center", 
        justifyContent: "space-between", transition: "all .3s ease" 
      }}>
        {/* LOGO (Scroll to top) */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <a href="/#" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: "#2d6a4f" }}>Skill</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: "#111" }}>Credit</span>
          </a>
        </div>
​
        {/* ── ONE-PAGE NAVIGATION LINKS ── */}
        <div className="hidden md:flex gap-2 items-center" style={{ transform: "translateX(35px)" }}>
          {[
            { label: "Home", path: "/#" },
            { label: "Explore Skills", path: "/#explore" },
            { label: "About Us", path: "/#about" }
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
​
        {/* AUTH BUTTONS */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link to="/login" style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #ccc", color: "#444", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            Log in
          </Link>
          <Link to="/register" className="cta-btn" style={{ padding: "8px 18px", borderRadius: 10, background: "#2d6a4f", color: "#fff", fontWeight: 800, fontSize: 13, boxShadow: "0 4px 14px rgba(45,106,79,0.28)", textDecoration: "none" }}>
            Sign up free
          </Link>
        </div>
      </nav>
​
      {/* ── MAIN CONTENT OUTLET ── */}
      <main style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>
    </div>
  );
}