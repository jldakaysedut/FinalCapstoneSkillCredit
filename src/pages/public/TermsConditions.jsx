import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ChevronRight, BookOpenCheck, Wallet, UsersRound } from 'lucide-react';

// Draft reflects verified platform features, not a substitute for final legal review.
const sections = [
  { id:'platform', title:'About SkillCredit', paragraphs:[
    'SkillCredit is a platform where members can share skills, browse teaching listings, and participate in learning sessions using in-platform credits. These terms describe expected use of the application and its existing features.',
    'By using the platform, you are expected to follow the rules, controls, and notices presented in the application.'
  ]},
  { id:'accounts', title:'Your account and responsibilities', paragraphs:[
    'Provide accurate information where required, keep your sign-in credentials private, and do not misuse another person’s account. You are responsible for the content you choose to submit.',
    'Impersonation, fraudulent activity, intentional credit manipulation, harassment, spam, and interference with the service are not permitted.'
  ]},
  { id:'skills', title:'Skill listings and teaching', paragraphs:[
    'Skill creators should accurately describe the subject, format, duration, learning outcomes, and credit cost of a listing. Listings may be reviewed before they become available to learners.',
    'A listing, review, or profile is not an independent guarantee that an instructor holds a specific qualification or that a particular learning outcome will be achieved.'
  ]},
  { id:'sessions', title:'Sessions and bookings', paragraphs:[
    'Before requesting a session, review the listing information, schedule, and required credits. Booking, completion, cancellation, and other status changes are governed by the current application flow.',
    'If a booking or cancellation is disputed, contact Support with the relevant details. Do not assume that a credit adjustment is automatic unless the system confirms it.'
  ]},
  { id:'credits', title:'Credits, top-ups, and payments', paragraphs:[
    'SkillCredit credits are units used by the platform for eligible features. A displayed credit balance is not a cash account or bank balance.',
    'Where credit top-ups are offered, checkout is handled through the configured payment provider. The price, credit amount, and transaction status should be reviewed in the checkout and wallet experience.',
    'Refunds, reversals, and disputed transactions depend on the actual payment and platform procedures. This draft does not promise refunds or transfers that have not been implemented.'
  ]},
  { id:'community', title:'Community, reviews, and safety', paragraphs:[
    'Users are expected to engage respectfully through messages, community content, ratings, and reviews. Misleading content, harassment, prohibited content, and attempts to evade moderation may result in review or account restrictions.',
    'The platform provides reporting and moderation features. Any resulting action depends on the context of the report and available evidence.'
  ]},
  { id:'ai', title:'AI-assisted features', paragraphs:[
    'SkillCredit AI can help users understand platform features, discover skills, and prepare editable drafts. AI-generated content may be incomplete or inaccurate and should be reviewed before use.',
    'Generated skill descriptions and suggested details do not publish a listing automatically. Users are responsible for checking and manually confirming any final submission.'
  ]},
  { id:'updates', title:'Updates and getting assistance', paragraphs:[
    'SkillCredit may revise these terms as features and procedures change. Team SkillCredit should review this text, including any final dispute, payment, eligibility, and legal provisions, before treating it as definitive production terms.',
    'For help with accounts, bookings, credits, or reporting concerns, use the public Contact page. Signed-in users can also access the in-app Support workflow.'
  ]},
];

const navItems = [{to:'/privacy', label:'Privacy Policy'}, {to:'/terms', label:'Terms & Conditions'}, {to:'/contact', label:'Contact Us'}];

export default function TermsConditions() {
  return <div className="min-h-screen bg-[#faf8f4] text-[#1a3325]">
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-7 sm:px-7 sm:pb-24 sm:pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dce7da] bg-white px-4 text-sm font-semibold text-[#275e43] transition hover:bg-[#eff7ef]"><ArrowLeft size={16}/> Back to Home</Link>
        <nav aria-label="Information pages" className="public-info-tabs flex flex-wrap items-center gap-1 rounded-full border border-[#e0e9de] bg-white p-1 text-xs font-semibold sm:text-sm">
          {navItems.map(item => item.to === '/terms'
            ? <span key={item.to} aria-current="page" className="rounded-full bg-[#2d6a4f] px-3 py-2 text-white">{item.label}</span>
            : <Link key={item.to} to={item.to} className="rounded-full px-3 py-2 text-[#516b58] transition hover:bg-[#eff6ef]">{item.label}</Link>)}
        </nav>
      </div>
      <header className="relative mt-7 overflow-hidden rounded-[26px] bg-[#173d2c] px-6 py-9 text-white sm:rounded-[32px] sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[48px] border-white/5" aria-hidden="true"/>
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.13em] text-[#d7eddf]"><FileText size={15}/> Platform guidelines</span>
          <h1 className="mt-5 font-['Fraunces'] text-4xl font-black tracking-tight sm:text-5xl">Terms & Conditions</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#dcece2] sm:text-base">Clear expectations for learning, teaching, using credits, and taking part in the SkillCredit community.</p>
          <p className="mt-6 text-xs font-medium text-[#cce4d4]">Draft updated November 7, 2026</p>
        </div>
      </header>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[245px_minmax(0,1fr)] lg:gap-8">
        <aside className="rounded-2xl border border-[#e1e9dd] bg-white p-5 shadow-sm lg:sticky lg:top-20">
          <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#729079]">On this page</p>
          <nav aria-label="Terms sections" className="mt-3 space-y-1">{sections.map((section, i)=><a key={section.id} href={`#${section.id}`} className="flex min-h-10 items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-[#4d6855] transition hover:bg-[#f0f7ef] hover:text-[#275e43]"><span className="w-6 text-xs text-[#80988a]">{String(i+1).padStart(2,'0')}</span><span className="flex-1">{section.title}</span><ChevronRight size={14}/></a>)}</nav>

        </aside>
        <article className="min-w-0 rounded-[24px] border border-[#e1e9dd] bg-white px-5 py-6 shadow-sm sm:px-9 sm:py-10">
          <div className="border-b border-[#ebf0e9] pb-7">
            <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#2d6a4f]">Before you begin</p><h2 className="mt-2 font-['Fraunces'] text-2xl font-bold text-[#193a29] sm:text-3xl">Learn and teach responsibly.</h2>
            <p className="mt-3 text-sm leading-7 text-[#607363]">This is a draft explaining the current SkillCredit workflows. It should be reviewed by Team SkillCredit before being presented as final legal terms.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">{[
              {Icon:BookOpenCheck,title:'Skills & sessions',text:'Review listings before booking'},
              {Icon:Wallet,title:'Credits & payments',text:'Check amounts and statuses'},
              {Icon:UsersRound,title:'Community conduct',text:'Respect other members'}
            ].map(({Icon,title,text})=><div key={title} className="rounded-xl border border-[#e2eadf] bg-[#f8fbf7] p-3"><Icon size={18} className="text-[#2d6a4f]"/><h3 className="mt-2 text-sm font-bold text-[#274433]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#718073]">{text}</p></div>)}</div>
          </div>
          {sections.map((section,i)=><section key={section.id} id={section.id} className={`scroll-mt-24 py-7 ${i < sections.length - 1 ? 'border-b border-[#ebf0e9]' : ''}`}><div className="flex items-start gap-3"><span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#edf6ee] text-xs font-extrabold text-[#2d6a4f]">{String(i+1).padStart(2,'0')}</span><h2 className="font-['Fraunces'] text-xl font-bold leading-snug text-[#1c432e] sm:text-2xl">{section.title}</h2></div>{section.paragraphs.map(p=><p key={p} className="mt-4 text-sm leading-8 text-[#536b5d] sm:text-[15px]">{p}</p>)}</section>)}

        </article>
      </div>
      <footer className="mt-9 border-t border-[#e2eade] pt-6 text-xs text-[#6e806f] sm:text-sm">© 2026 SkillCredit · Team SkillCredit</footer>
    </div>
  </div>;
}
