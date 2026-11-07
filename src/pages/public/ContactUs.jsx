import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, MessageSquareText, HelpCircle, UserRound, ExternalLink, Info, CheckCircle2 } from 'lucide-react';

// VITE_PUBLIC_CONTACT_EMAIL is a PUBLIC inbox address, not an API key.
// The form opens the user's email application. It does not send on its own.
const publicEmail = (import.meta.env.VITE_PUBLIC_CONTACT_EMAIL || '').trim();
const hasPublicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail);
const topicChoices = ['General inquiry', 'Account & registration', 'Privacy or data concern', 'Bookings & credits', 'Other'];

const inputClass = 'mt-2 w-full min-h-12 rounded-xl border border-[#dce6db] bg-[#fbfdfb] px-4 py-3 text-sm text-[#213d2b] outline-none transition placeholder:text-[#91a394] focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/15';

export default function ContactUs() {
  const [form, setForm] = useState({ name:'', email:'', topic:'General inquiry', message:'' });
  const [emailOpened, setEmailOpened] = useState(false);
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  function handleCompose(event) {
    event.preventDefault();
    if (!hasPublicEmail) return;
    const subject = `[SkillCredit Contact] ${form.topic}`;
    const body = [
      `Name: ${form.name.trim()}`,
      `Reply-to email: ${form.email.trim()}`,
      `Topic: ${form.topic}`,
      '', form.message.trim(), '',
      '— Prepared using the SkillCredit Contact page',
    ].join('\n');
    // Explicit user action only. The visitor must send the email from their own client.
    const mailto = `mailto:${publicEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setEmailOpened(true);
    window.location.href = mailto;
  }

  return <div className="min-h-screen bg-[#faf8f4] text-[#1a3325]">
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-7 sm:px-7 sm:pb-24 sm:pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dce7da] bg-white px-4 text-sm font-semibold text-[#275e43] transition hover:bg-[#eff7ef]"><ArrowLeft size={16}/> Back to Home</Link>
        <nav aria-label="Information pages" className="flex flex-wrap items-center gap-1 rounded-full border border-[#e0e9de] bg-white p-1 text-xs font-semibold sm:text-sm">
          {[["/privacy","Privacy Policy"],["/terms","Terms & Conditions"],["/contact","Contact Us"]].map(([to,label]) => to === '/contact'
            ? <span key={to} aria-current="page" className="rounded-full bg-[#2d6a4f] px-3 py-2 text-white">{label}</span>
            : <Link key={to} to={to} className="rounded-full px-3 py-2 text-[#516b58] transition hover:bg-[#eff6ef]">{label}</Link>)}
        </nav>
      </div>
      <header className="relative mt-7 overflow-hidden rounded-[26px] bg-[#173d2c] px-6 py-9 text-white sm:rounded-[32px] sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[48px] border-white/5" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.13em] text-[#d7eddf]"><MessageSquareText size={15}/> Contact our team</span>
          <h1 className="mt-5 font-['Fraunces'] text-4xl font-black tracking-tight sm:text-5xl">How can we help?</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#dcece2] sm:text-base">Questions before signing up, issues accessing your account, or feedback about SkillCredit? Here are your contact options.</p>
        </div>
      </header>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(275px,0.85fr)] lg:gap-8">
        <section className="min-w-0 rounded-[24px] border border-[#e1e9dd] bg-white px-5 py-7 shadow-sm sm:px-9 sm:py-9" aria-labelledby="public-inquiry-title">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff7ef] text-[#2d6a4f]"><Mail size={21}/></span><div><h2 id="public-inquiry-title" className="font-['Fraunces'] text-2xl font-bold text-[#1c432e]">Send an inquiry</h2><p className="mt-1 text-sm leading-6 text-[#6b8071]">For visitors and registered members</p></div></div>
          {hasPublicEmail ? <>
            <p className="mt-5 text-sm leading-7 text-[#5c705f]">Fill in the details below. Selecting <strong>Open email app</strong> prepares your message for review and sending in your own email application.</p>
            <form onSubmit={handleCompose} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-bold text-[#2e503b]">Full name <span className="text-[#b43f3f]">*</span><input className={inputClass} type="text" required maxLength={100} autoComplete="name" value={form.name} onChange={e=>update('name', e.target.value)} placeholder="Your name" /></label>
                <label className="block text-sm font-bold text-[#2e503b]">Email address <span className="text-[#b43f3f]">*</span><input className={inputClass} type="email" required maxLength={200} autoComplete="email" value={form.email} onChange={e=>update('email', e.target.value)} placeholder="you@example.com" /></label>
              </div>
              <label className="block text-sm font-bold text-[#2e503b]">What is this about? <span className="text-[#b43f3f]">*</span><select className={inputClass} value={form.topic} onChange={e=>update('topic',e.target.value)}>{topicChoices.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
              <label className="block text-sm font-bold text-[#2e503b]">Your message <span className="text-[#b43f3f]">*</span><textarea className={`${inputClass} min-h-40 resize-y`} required maxLength={3000} value={form.message} onChange={e=>update('message',e.target.value)} placeholder="Tell us how we can assist you..." /></label>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xs text-xs leading-5 text-[#738575]">Never include your password, complete card details, or other sensitive credentials.</p><button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2d6a4f] px-6 text-sm font-bold text-white transition hover:bg-[#22533d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6a4f]">Open email app <ExternalLink size={16}/></button></div>
              {emailOpened && <p role="status" className="flex items-start gap-2 rounded-xl border border-[#d4e8d7] bg-[#f0f8f0] px-4 py-3 text-xs leading-6 text-[#41674a]"><CheckCircle2 size={17} className="mt-0.5 shrink-0"/>Your email application should open. Please review the message and press Send there. Nothing has been submitted from this webpage.</p>}
            </form>
            <p className="mt-6 border-t border-[#ecf1e9] pt-5 text-sm text-[#5f7464]">Official contact email: <span className="break-all font-semibold text-[#2d6a4f]">{publicEmail}</span></p>
          </> : <div className="mt-6 rounded-2xl border border-[#d9e7d8] bg-[#f5faf4] px-5 py-5">
            <div className="flex items-start gap-3"><Info size={21} className="mt-0.5 shrink-0 text-[#2d6a4f]"/><div><h3 className="text-base font-extrabold text-[#234831]">Public email contact is being configured</h3><p className="mt-2 text-sm leading-7 text-[#58715e]">The team has not yet added a verified public email address. An email form cannot send messages until an official inbox is configured. Registered users can still contact Support from the User Dashboard.</p></div></div>
          </div>}
        </section>
        <aside className="space-y-5">
          <section className="rounded-[24px] border border-[#e1e9dd] bg-white p-6 shadow-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff7ef] text-[#2d6a4f]"><UserRound size={21}/></span>
            <h2 className="mt-4 font-['Fraunces'] text-xl font-bold text-[#1d432e]">Already a member?</h2>
            <p className="mt-3 text-sm leading-7 text-[#667b6c]">Sign in and use the floating Support button on your User Dashboard for booking, wallet, and account concerns.</p>
            <Link to="/login" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2d6a4f] px-4 text-sm font-bold text-white hover:bg-[#24543e]">Sign in to SkillCredit <ArrowRight size={16}/></Link>
          </section>
          <section className="rounded-[24px] border border-[#dce9db] bg-[#edf6ec] p-6">
            <div className="flex items-center gap-2 text-[#2d6a4f]"><HelpCircle size={20}/><h2 className="text-base font-extrabold text-[#234732]">Common inquiries</h2></div>
            <div className="mt-4 space-y-4 text-sm text-[#597261]">{[
              ['Account access','Registration, login, and profile questions'],
              ['Learning & bookings','Sessions, teacher listings, and scheduling'],
              ['Credits & payments','Wallet, top-ups, and transaction concerns'],
              ['Privacy & safety','Data inquiries and reports'],
            ].map(([title,desc])=><div key={title} className="border-b border-[#d6e5d5] pb-3 last:border-b-0 last:pb-0"><p className="font-bold text-[#274c35]">{title}</p><p className="mt-1 text-xs leading-5">{desc}</p></div>)}</div>

          </section>
        </aside>
      </div>
      <footer className="mt-9 border-t border-[#e2eade] pt-6 text-xs text-[#6e806f] sm:text-sm">© 2026 SkillCredit · Team SkillCredit</footer>
    </div>
  </div>;
}
