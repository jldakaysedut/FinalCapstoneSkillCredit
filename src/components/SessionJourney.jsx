import { Check, Clock3, Info } from 'lucide-react';

const STEPS = [
  { label: 'Requested', hint: 'Booking submitted' },
  { label: 'Confirmed', hint: 'Schedule agreed' },
  { label: 'In progress', hint: 'Session started' },
  { label: 'Completed', hint: 'Both confirmed done' },
];

const ACTIVE_STEP = {
  pending: 0,
  reschedule_proposed: 0,
  upcoming: 1,
  active: 2,
  completed: 3,
};

/** Presentation-only status tracker. Existing booking and credit logic is untouched. */
export default function SessionJourney({ status, instructorCompleted, studentCompleted }) {
  if (status === 'cancelled' || status === 'disputed') {
    return (
      <div className="my-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600" role="status">
        <Info className="mr-1.5 inline h-3.5 w-3.5" />
        {status === 'disputed'
          ? 'This session is under dispute review. The normal journey is paused.'
          : 'This booking was cancelled. The session journey has ended.'}
      </div>
    );
  }
  const current = ACTIVE_STEP[status];
  if (current === undefined) return null;
  const confirmationCount = Number(Boolean(instructorCompleted)) + Number(Boolean(studentCompleted));
  return (
    <section aria-label="Session progress" className="sc-session-journey my-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-3 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">Session Journey</h4>
        <span className="text-[11px] font-semibold text-emerald-700">
          {status === 'reschedule_proposed' ? 'New schedule awaiting a response' :
            status === 'active' && confirmationCount > 0 ? `${confirmationCount} of 2 marked done` : STEPS[current].hint}
        </span>
      </div>
      <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {STEPS.map((step, index) => {
          const reached = current >= index;
          const isCurrent = current === index;
          return (
            <li key={step.label} aria-current={isCurrent ? 'step' : undefined} className="min-w-0">
              <div className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors duration-200 ${
                reached ? 'border-emerald-600 bg-emerald-700 text-white' : 'border-gray-200 bg-white text-gray-400'
              }`}>
                {reached && !isCurrent ? <Check className="h-3.5 w-3.5" /> : isCurrent ? <Clock3 className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <p className={`text-[10px] font-semibold leading-4 sm:text-xs ${reached ? 'text-emerald-800' : 'text-gray-400'}`}>{step.label}</p>
            </li>
          );
        })}
      </ol>
      {status === 'reschedule_proposed' && (
        <p className="mt-2 text-[11px] text-purple-700">A proposed schedule is not confirmed until accepted.</p>
      )}
      {status === 'active' && confirmationCount > 0 && (
        <p className="mt-2 text-[11px] text-emerald-700">Completion still requires both participants to confirm.</p>
      )}
    </section>
  );
}
