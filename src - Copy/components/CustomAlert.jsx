import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';

// A single centered dialog for ordinary alerts and explicit async confirmations.
// Business callbacks remain in their original page components.
export default function CustomAlert() {
  const [dialog, setDialog] = useState(null);
  const queued = useRef([]);
  const active = useRef(null);

  useEffect(() => {
    const originalAlert = window.alert;
    const showNext = () => {
      if (active.current || !queued.current.length) return;
      active.current = queued.current.shift();
      setDialog(active.current);
    };
    window.alert = (message) => {
      queued.current.push({ type: 'alert', title: 'SkillCredit Notification', message: String(message ?? '') });
      showNext();
    };
    const onConfirm = ({ detail }) => {
      queued.current.push({ type: 'confirm', title: detail.title || 'Please confirm', message: detail.message, resolve: detail.resolve });
      showNext();
    };
    window.addEventListener('skillcredit:confirm', onConfirm);
    return () => {
      window.alert = originalAlert;
      window.removeEventListener('skillcredit:confirm', onConfirm);
      if (active.current?.resolve) active.current.resolve(false);
      queued.current.forEach(d => d.resolve?.(false));
      queued.current = [];
      active.current = null;
    };
  }, []);

  const close = (confirmed = false) => {
    if (active.current?.resolve) active.current.resolve(confirmed);
    active.current = null;
    const next = queued.current.shift() ?? null;
    active.current = next;
    setDialog(next);
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // close uses the current active ref; dialog change rebinds the handler.
  }, [dialog]);

  if (!dialog) return null;
  const confirmation = dialog.type === 'confirm';
  const Icon = confirmation ? HelpCircle : (/(error|failed|unable|invalid|cannot|could not)/i.test(dialog.message) ? AlertCircle : CheckCircle2);
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="skillcredit-dialog-title" aria-describedby="skillcredit-dialog-message" className="relative w-full max-w-sm rounded-3xl border border-emerald-100 bg-white px-6 pb-6 pt-7 text-center shadow-2xl">
        <button type="button" onClick={() => close(false)} aria-label="Close dialog" className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={25}/></div>
        <h2 id="skillcredit-dialog-title" className="mb-2 text-center text-lg font-bold text-slate-900">{dialog.title}</h2>
        <p id="skillcredit-dialog-message" className="mb-6 whitespace-pre-line break-words text-center text-sm leading-6 text-slate-600">{dialog.message}</p>
        <div className={`flex ${confirmation ? 'gap-2' : ''}`}>
          {confirmation && <button autoFocus type="button" onClick={() => close(false)} className="flex-1 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Cancel</button>}
          <button autoFocus={!confirmation} type="button" onClick={() => close(true)} className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">{confirmation ? 'Confirm' : 'OK'}</button>
        </div>
      </div>
    </div>
  );
}
