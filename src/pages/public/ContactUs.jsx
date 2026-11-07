import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Headset, MessageSquareText, HelpCircle, ShieldCheck, Wallet, BookOpen, Clock3, UserRound } from "lucide-react";

const topics = [
  {Icon: Wallet, title:"Credits & payments", desc:"Questions about credit balances, top-ups, or transaction statuses."},
  {Icon: BookOpen, title:"Bookings & learning", desc:"Session scheduling, learning listings, or teaching concerns."},
  {Icon: ShieldCheck, title:"Safety & reports", desc:"Report inappropriate behavior or other platform concerns."},
  {Icon: UserRound, title:"Account assistance", desc:"Help with account access, profile settings, or your information."},
];

export default function ContactUs(){
  return (
    <div className="min-h-screen w-full bg-[#faf8f4] text-[#173326]">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d8e6da] bg-white px-4 text-sm font-bold text-[#2d6a4f] hover:bg-[#edf6ef] focus-visible:outline-2 focus-visible:outline-[#2d6a4f]"><ArrowLeft size={16}/> Back to Home</Link>
        <header className="mt-8 rounded-[28px] bg-gradient-to-br from-[#163c2e] to-[#367b59] px-6 py-9 text-white shadow-xl shadow-[#204c34]/10 sm:px-12 sm:py-12">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-[#d7f2df]"><Headset size={16}/> HERE TO HELP</span>
          <h1 className="font-['Fraunces'] text-4xl font-black tracking-tight sm:text-5xl">Contact Us</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#e3f1e8] sm:text-base">Need help with your SkillCredit account, sessions, or credits? Here's how to reach our existing Support team.</p>
        </header>
        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0 rounded-3xl border border-[#e1e9dd] bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-8">
            <div className="inline-flex items-center gap-3"><span className="rounded-xl bg-[#eaf6ec] p-3 text-[#2d6a4f]"><MessageSquareText size={23}/></span><div><h2 className="text-xl font-extrabold">Use SkillCredit Support</h2><p className="mt-1 text-sm text-[#64806c]">Support requests are handled inside your account</p></div></div>
            <ol className="mt-7 space-y-4">
              {[
                ["Sign in to your account", "Use your SkillCredit login. If you're new, create a free account first."],
                ["Open your User Dashboard", "Look for the floating Support button available in the signed-in User interface."],
                ["Submit a Support ticket", "Describe your concern and attach supporting information if needed. You can follow up in the app."],
              ].map(([title,desc],index)=>(
                <li key={title} className="flex gap-4 rounded-2xl border border-[#e4ebe0] bg-[#fbfcfa] p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e3f1e7] text-sm font-extrabold text-[#2d6a4f]">{index+1}</span>
                  <div><h3 className="font-bold text-[#1c3e2e]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#607467]">{desc}</p></div>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2d6a4f] px-6 text-sm font-bold text-white shadow-md shadow-green-900/10 hover:bg-[#21543d]">Sign In <ArrowRight size={16}/></Link>
              <Link to="/dashboard" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cfe1d2] bg-[#f0f7ef] px-6 text-sm font-bold text-[#2d6a4f] hover:bg-[#e1f0e3]">Go to User Dashboard <ArrowRight size={16}/></Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-[#61766a]">Currently, public visitors cannot submit a Support ticket without an account. No public contact email has been configured in the source code, so this page does not claim one.</p>
          </div>
          <aside className="h-fit rounded-3xl border border-[#dfebdf] bg-[#eff6ed] p-6">
            <div className="flex items-center gap-2 text-[#2d6a4f]"><HelpCircle size={20}/><h2 className="text-lg font-extrabold text-[#173326]">What can we help with?</h2></div>
            <div className="mt-5 space-y-5">
              {topics.map(({Icon,title,desc})=>(
                <div key={title} className="flex gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2d6a4f]"><Icon size={18}/></span><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-[#597261]">{desc}</p></div></div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-2 border-t border-[#d4e3d4] pt-5 text-xs leading-6 text-[#587160]"><Clock3 className="mt-1 shrink-0" size={16}/> Support replies are handled in the app; no response time is guaranteed.</div>
          </aside>
        </div>
        <footer className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[#e1e9dd] pt-6 text-sm text-[#597362]"><span>© 2026 SkillCredit · Team SkillCredit</span><nav className="flex flex-wrap gap-5"><Link to="/privacy" className="font-semibold hover:text-[#2d6a4f]">Privacy</Link><Link to="/terms" className="font-semibold hover:text-[#2d6a4f]">Terms</Link><Link to="/" className="font-semibold hover:text-[#2d6a4f]">Home</Link></nav></footer>
      </div>
    </div>
  );
}
