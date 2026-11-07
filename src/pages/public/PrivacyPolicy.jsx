import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ShieldCheck, Database, LockKeyhole, Eye,
  Mail, RefreshCcw, ChevronRight
} from 'lucide-react';

// Public information only. Confirm the final legal text with Team SkillCredit before publication.
const sections = [
  {
    id: 'information', title: 'Information we process',
    paragraphs: [
      'SkillCredit uses information needed to provide accounts, skill sharing, learning sessions, and platform support. The information depends on the features you choose to use.',
    ],
    bullets: [
      'Account and profile details, including your name, email, avatar, profile description, interests, and information you choose to publish.',
      'Skill listings, learning outcomes, portfolio entries, bookings, reviews, community posts, and messages you submit.',
      'Credit balances, daily-reward claims, session credit amounts, and top-up records such as payment amounts and transaction statuses.',
      'Questions and conversations you send to the SkillCredit AI assistant.',
    ],
  },
  {
    id: 'purposes', title: 'How we use information',
    paragraphs: [
      'We use this information to operate sign-in, profiles, learning and teaching features, credits, notifications, moderation, and support. We also use the information you provide to display your listings and help other users find suitable learning opportunities.',
      'Content that you deliberately publish in profiles, skill listings, reviews, and the community may be visible to other users. Private account information is intended for authorized access only.',
    ],
  },
  {
    id: 'services', title: 'Services that support SkillCredit',
    paragraphs: [
      'The application uses Supabase for account authentication and platform data, PayMongo for supported payment checkout flows, and Groq to generate AI assistant responses. Information required to provide a feature may be processed through the relevant service.',
      'Payment checkout takes place through the configured payment provider. SkillCredit maintains relevant transaction records, but this page does not claim that the application stores complete payment-card details.',
    ],
  },
  {
    id: 'sharing', title: 'Visibility and access',
    paragraphs: [
      'Information is displayed to other users when it is part of a public-facing feature, such as a profile, approved skill listing, or public community contribution. The platform also has moderation and support workflows that require authorized staff access.',
      'Please avoid submitting sensitive passwords, payment-card numbers, or unnecessary personal information in public posts or support inquiries.',
    ],
  },
  {
    id: 'choices', title: 'Your choices and requests',
    paragraphs: [
      'You can review and update supported profile information from within the application. Some account actions may require authentication and may be subject to existing account, session, or transaction checks.',
      'For concerns about your account or personal information, use the Contact page. Logged-in users may also use the in-app Support feature. Requests about deletion, correction, or access should be reviewed according to the actual data-handling procedures in place.',
    ],
  },
  {
    id: 'security', title: 'Security, retention, and updates',
    paragraphs: [
      'SkillCredit uses account authentication and database access controls. No online service can promise absolute security.',
      'Records may need to be retained for platform operations, dispute handling, or other applicable requirements. Team SkillCredit should confirm specific retention periods and formal request procedures before publishing this as its definitive policy.',
      'This policy may be revised as the platform changes. The revision date is shown above.',
    ],
  },
];

const navItems = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/contact', label: 'Contact Us' },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1a3325]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-7 sm:px-7 sm:pb-24 sm:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dce7da] bg-white px-4 text-sm font-semibold text-[#275e43] transition hover:bg-[#eff7ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a4f]">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Home
          </Link>
          <nav aria-label="Information pages" className="flex flex-wrap items-center gap-1 rounded-full border border-[#e0e9de] bg-white p-1 text-xs font-semibold sm:text-sm">
            {navItems.map(item => <Link key={item.to} to={item.to} aria-current={item.to === '/privacy' ? 'page' : undefined} className={`rounded-full px-3 py-2 transition ${item.to === '/privacy' ? 'bg-[#2d6a4f] text-white' : 'text-[#516b58] hover:bg-[#eff6ef]'}`}>{item.label}</Link>)}
          </nav>
        </div>

        <header className="relative mt-7 overflow-hidden rounded-[26px] bg-[#173d2c] px-6 py-9 text-white sm:rounded-[32px] sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[48px] border-white/5" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.13em] text-[#d7eddf]"><ShieldCheck size={15} /> Trust & transparency</span>
            <h1 className="mt-5 font-['Fraunces'] text-4xl font-black tracking-tight sm:text-5xl">Privacy Policy</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#dcece2] sm:text-base">Learn what information SkillCredit uses, how it supports the service, and where to ask questions about your data.</p>
            <p className="mt-6 text-xs font-medium text-[#cce4d4]">Draft updated November 7, 2026</p>
          </div>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[245px_minmax(0,1fr)] lg:gap-8">
          <aside className="rounded-2xl border border-[#e1e9dd] bg-white p-5 shadow-sm lg:sticky lg:top-20">
            <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#729079]">On this page</p>
            <nav aria-label="Privacy Policy sections" className="mt-3 space-y-1">
              {sections.map((section, i) => <a key={section.id} href={`#${section.id}`} className="flex min-h-10 items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-[#4d6855] transition hover:bg-[#f0f7ef] hover:text-[#275e43]"><span className="w-6 text-xs text-[#80988a]">{String(i + 1).padStart(2,'0')}</span><span className="flex-1">{section.title}</span><ChevronRight size={14}/></a>)}
            </nav>
            <div className="mt-6 border-t border-[#e7eee5] pt-5">
              <div className="flex items-center gap-2 text-[#2d6a4f]"><Mail size={17}/><span className="text-sm font-bold">Need assistance?</span></div>
              <p className="mt-2 text-xs leading-6 text-[#657a6a]">Contact our team with a privacy-related question.</p>
              <Link to="/contact" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#2d6a4f] hover:underline">Contact Us <ArrowRight size={14}/></Link>
            </div>
          </aside>

          <article className="min-w-0 rounded-[24px] border border-[#e1e9dd] bg-white px-5 py-6 shadow-sm sm:px-9 sm:py-10">
            <div className="mb-4 border-b border-[#ebf0e9] pb-7">
              <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#2d6a4f]">At a glance</p>
              <h2 className="mt-2 font-['Fraunces'] text-2xl font-bold text-[#193a29] sm:text-3xl">Your information matters.</h2>
              <p className="mt-3 text-sm leading-7 text-[#607363]">This notice describes the current SkillCredit application's data practices. The final policy should be reviewed by Team SkillCredit against its deployed configuration and applicable requirements before official publication.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { Icon: Database, title: 'Platform records', text: 'Accounts, bookings & credits' },
                  { Icon: LockKeyhole, title: 'Account controls', text: 'Authenticated access' },
                  { Icon: Eye, title: 'Public content', text: 'Visible where you publish' },
                ].map(({ Icon, title, text }) => <div key={title} className="rounded-xl border border-[#e2eadf] bg-[#f8fbf7] p-3"><Icon size={18} className="text-[#2d6a4f]"/><h3 className="mt-2 text-sm font-bold text-[#274433]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#718073]">{text}</p></div>)}
              </div>
            </div>
            {sections.map((section, index) => <section key={section.id} id={section.id} className={`scroll-mt-24 py-7 ${index < sections.length - 1 ? 'border-b border-[#ebf0e9]' : ''}`}>
              <div className="flex items-start gap-3"><span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#edf6ee] text-xs font-extrabold text-[#2d6a4f]">{String(index + 1).padStart(2, '0')}</span><h2 className="font-['Fraunces'] text-xl font-bold leading-snug text-[#1c432e] sm:text-2xl">{section.title}</h2></div>
              {section.paragraphs.map(p => <p key={p} className="mt-4 text-sm leading-8 text-[#536b5d] sm:text-[15px]">{p}</p>)}
              {section.bullets && <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[#536b5d] sm:text-[15px]">{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
            </section>)}
            <div className="mt-3 flex flex-wrap gap-3 rounded-xl bg-[#eff7ef] p-4 text-sm text-[#42634b]"><RefreshCcw size={18} className="mt-0.5 shrink-0 text-[#2d6a4f]"/><p className="flex-1 leading-6">Questions or correction requests? Visit our <Link to="/contact" className="font-bold text-[#286648] underline underline-offset-2">Contact page</Link>.</p></div>
          </article>
        </div>
        <footer className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[#e2eade] pt-6 text-xs text-[#6e806f] sm:text-sm"><p>© 2026 SkillCredit · Team SkillCredit</p><nav className="flex flex-wrap gap-5"><Link to="/terms" className="hover:text-[#2d6a4f]">Terms</Link><Link to="/contact" className="hover:text-[#2d6a4f]">Contact</Link><Link to="/" className="hover:text-[#2d6a4f]">Home</Link></nav></footer>
      </div>
    </div>
  );
}
