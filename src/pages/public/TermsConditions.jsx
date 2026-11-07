import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, BookOpenCheck, ShieldCheck, Wallet, MessageCircle } from "lucide-react";

const sections = [
  { title:"Using SkillCredit", text:"SkillCredit is a skill-sharing platform where users can publish teaching listings, explore available skills, request sessions, and participate in learning activities. By using the platform, users agree to follow its account, booking, and community rules as displayed in the application." },
  { title:"Accounts and responsibilities", text:"Keep your account information accurate and protect your sign-in credentials. Use the service respectfully, and do not impersonate others, manipulate credits, misuse another user's information, or interfere with platform operations." },
  { title:"Skills and teaching", text:"Skill creators are responsible for accurately describing what they teach, including the format, duration, outcomes, and credit cost. Listings may require review and approval before they become available. SkillCredit does not independently guarantee a particular learning outcome or instructor qualification." },
  { title:"Sessions and credit balances", text:"Sessions and credit amounts are governed by the booking, completion, cancellation, and eligibility rules enforced in the app. Review the current listing and booking information before confirming. Credit balances are in-platform units for SkillCredit features and are not represented as cash or a bank balance." },
  { title:"Payments and top-ups", text:"Where top-ups are available, payments are processed through the configured third-party checkout provider. The applicable amount and transaction status are shown in the payment flow and wallet records. For a payment concern or a disputed credit movement, use Support rather than assuming a refund or reversal is guaranteed." },
  { title:"Community conduct and safety", text:"Users should avoid harassment, fraud, spam, prohibited content, and misuse of community, messaging, and review features. The platform includes reporting, restriction, and moderation processes. Decisions depend on the case and the platform's current rules." },
  { title:"AI-assisted content", text:"SkillCredit AI can help explain features, find listings, and draft text. AI-generated responses can be incomplete or inaccurate. Users must review AI-generated skill descriptions, prices, and other form details before submission; an AI draft does not itself publish a listing." },
  { title:"Changes and assistance", text:"Platform features and these terms may change as the capstone project develops. For booking, wallet, account, or safety concerns, registered users can sign in and open the existing Support feature. See the Privacy Policy for the application's data-use overview." },
];

export default function TermsConditions(){
  return (
    <div className="min-h-screen w-full bg-[#faf8f4] text-[#173326]">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d8e6da] bg-white px-4 text-sm font-bold text-[#2d6a4f] hover:bg-[#edf6ef] focus-visible:outline-2 focus-visible:outline-[#2d6a4f]"><ArrowLeft size={16}/> Back to Home</Link>
        <header className="mt-8 rounded-[28px] bg-gradient-to-br from-[#163c2e] to-[#367b59] px-6 py-9 text-white shadow-xl shadow-[#204c34]/10 sm:px-12 sm:py-12">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-[#d7f2df]"><FileText size={16}/> PLATFORM GUIDELINES</span>
          <h1 className="font-['Fraunces'] text-4xl font-black tracking-tight sm:text-5xl">Terms & Conditions</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#e3f1e8] sm:text-base">The basics of learning, teaching, earning credits, and participating responsibly in SkillCredit.</p>
          <p className="mt-5 text-xs font-semibold text-[#d4eadc]">Last updated: November 7, 2026</p>
        </header>
        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_245px]">
          <article className="min-w-0 rounded-3xl border border-[#e1e9dd] bg-white px-5 py-7 shadow-sm sm:px-9 sm:py-9">
            <p className="mb-7 rounded-2xl bg-[#f0f7ef] px-5 py-4 text-sm leading-7 text-[#3e634c]">These are draft platform terms reflecting the current SkillCredit capstone workflows. Team SkillCredit should review the wording, dispute rules, and relevant legal requirements before treating them as final production terms.</p>
            {sections.map(({title,text}, i) => (
              <section key={title} className={`py-5 ${i!==sections.length-1?'border-b border-[#e9f0e8]':''}`}>
                <h2 className="text-lg font-extrabold text-[#1e4732] sm:text-xl"><span className="mr-2 text-[#2d6a4f]">{String(i+1).padStart(2,'0')}</span>{title}</h2>
                <p className="mt-3 text-sm leading-8 text-[#52665a] sm:text-[15px]">{text}</p>
              </section>
            ))}
          </article>
          <aside className="h-fit rounded-3xl border border-[#dce9db] bg-[#eff6ed] p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-2 text-[#2d6a4f]"><BookOpenCheck size={19}/></span><h2 className="font-extrabold">Before you book</h2></div>
            <p className="mt-3 text-sm leading-7 text-[#536c59]">Review the details of the teaching listing and your available credits. If you need help, the Support feature is available after sign-in.</p>
            <Link to="/contact" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2d6a4f] px-4 text-sm font-bold text-white hover:bg-[#21543d]">Contact Us <ArrowRight size={16}/></Link>
            <div className="mt-6 space-y-3 border-t border-[#d4e3d4] pt-5 text-sm text-[#506a58]"><p className="flex items-center gap-2"><Wallet size={16}/> Credits & payments</p><p className="flex items-center gap-2"><ShieldCheck size={16}/> Safe participation</p><p className="flex items-center gap-2"><MessageCircle size={16}/> Support when needed</p></div>
          </aside>
        </div>
        <footer className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[#e1e9dd] pt-6 text-sm text-[#597362]"><span>© 2026 SkillCredit · Team SkillCredit</span><nav className="flex flex-wrap gap-5"><Link to="/privacy" className="font-semibold hover:text-[#2d6a4f]">Privacy</Link><Link to="/contact" className="font-semibold hover:text-[#2d6a4f]">Contact</Link><Link to="/" className="font-semibold hover:text-[#2d6a4f]">Home</Link></nav></footer>
      </div>
    </div>
  );
}
