import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShieldCheck, Database, LockKeyhole, UserRoundCheck } from "lucide-react";

const sections = [
  {
    title: "Information used by SkillCredit",
    body: "When you use SkillCredit, the platform processes information needed to run your account and its features.",
    items: [
      "Account details such as your name, email address, profile picture, interests, and information you choose to add to your profile.",
      "Skill listings, portfolios, reviews, community contributions, messages, session bookings, and support requests that you create.",
      "Credit balances, daily reward claims, session-related credit amounts, and payment transaction records such as top-up amounts and statuses.",
      "Messages you send to SkillCredit AI when you use the assistant."
    ]
  },
  {
    title: "Why the information is used",
    body: "SkillCredit uses the information to provide authentication, profiles, skill discovery, bookings, messaging, credits, notifications, safety reviews, and support. Information you publish in a public profile, listing, review, or community post may be visible to other platform users."
  },
  {
    title: "Services involved",
    body: "The current implementation uses Supabase for authentication and platform data, PayMongo for supported payment checkout flows, and Groq to generate AI assistant responses. Relevant information may be transmitted to those services when their features are used. Payment methods are handled within the payment provider's checkout experience."
  },
  {
    title: "Your account and choices",
    body: "You can update supported profile information in the app and use Settings for account-related controls. Account deletion is subject to the application's existing checks and may deactivate the profile rather than immediately erase every related record. To request assistance with personal information, contact the platform through the logged-in Support feature."
  },
  {
    title: "Security, retention, and changes",
    body: "The application uses account authentication and database access controls. No internet service can guarantee absolute security. How long information must be retained depends on the purpose of the record and applicable obligations. This notice may be updated as SkillCredit evolves; review the date shown at the top."
  }
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen w-full bg-[#faf8f4] text-[#173326]">
      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d8e6da] bg-white px-4 text-sm font-bold text-[#2d6a4f] transition hover:bg-[#edf6ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a4f]"><ArrowLeft size={16}/> Back to Home</Link>
        <header className="mt-8 rounded-[28px] bg-gradient-to-br from-[#153d2d] via-[#256347] to-[#357a58] px-6 py-9 text-white shadow-xl shadow-[#204c34]/10 sm:px-12 sm:py-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-[#d1f2df]"><ShieldCheck size={16}/> YOUR INFORMATION</div>
          <h1 className="font-['Fraunces'] text-4xl font-black tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#e4f3e9] sm:text-base">A clear overview of the information SkillCredit handles as learners and teachers use the platform.</p>
          <p className="mt-5 text-xs font-semibold text-[#d4eadc]">Last updated: November 7, 2026</p>
        </header>
        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_245px]">
          <article className="min-w-0 rounded-3xl border border-[#e1e9dd] bg-white px-5 py-7 shadow-sm sm:px-9 sm:py-9">
            <p className="mb-8 rounded-2xl border border-[#d2e8d6] bg-[#f0f8f0] px-5 py-4 text-sm leading-7 text-[#345a43]">This page describes the current SkillCredit capstone application's general data practices. For an official production policy, Team SkillCredit should confirm actual retention periods, contact details, and applicable legal requirements before publication.</p>
            {sections.map(({title,body,items}, index) => (
              <section key={title} className={`py-6 ${index===0?'pt-0':''} ${index!==sections.length-1?'border-b border-[#ebf0ea]':''}`}>
                <h2 className="text-xl font-extrabold tracking-tight text-[#1e4732] sm:text-2xl">{String(index+1).padStart(2,'0')} <span className="ml-1">{title}</span></h2>
                <p className="mt-3 text-sm leading-8 text-[#52665a] sm:text-[15px]">{body}</p>
                {items && <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[#52665a] sm:text-[15px]">{items.map(item => <li key={item}>{item}</li>)}</ul>}
              </section>
            ))}
          </article>
          <aside className="h-fit rounded-3xl border border-[#dfebdf] bg-[#eff6ed] p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-2 text-[#2d6a4f]"><LockKeyhole size={19}/></span><h2 className="font-extrabold">Questions about your data?</h2></div>
            <p className="mt-3 text-sm leading-7 text-[#536c59]">Sign in and use the existing Support feature for account or privacy-related concerns.</p>
            <Link to="/contact" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2d6a4f] px-4 text-sm font-bold text-white transition hover:bg-[#21543d]">Contact Us <ArrowRight size={16}/></Link>
            <div className="mt-6 space-y-3 border-t border-[#d4e3d4] pt-5 text-sm text-[#506a58]"><p className="flex items-center gap-2"><Database size={16}/> Account & platform records</p><p className="flex items-center gap-2"><UserRoundCheck size={16}/> Authenticated support</p></div>
          </aside>
        </div>
        <footer className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[#e1e9dd] pt-6 text-sm text-[#597362]"><span>© 2026 SkillCredit · Team SkillCredit</span><nav className="flex flex-wrap gap-5"><Link to="/terms" className="font-semibold hover:text-[#2d6a4f]">Terms</Link><Link to="/contact" className="font-semibold hover:text-[#2d6a4f]">Contact</Link><Link to="/" className="font-semibold hover:text-[#2d6a4f]">Home</Link></nav></footer>
      </div>
    </div>
  );
}
