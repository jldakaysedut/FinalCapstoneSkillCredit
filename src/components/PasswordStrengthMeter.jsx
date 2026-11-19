import React from 'react';

// Matches the Expo password-strength guide; Supabase Auth remains the final authority.
export const MIN_PASSWORD_LENGTH = 8;

export default function PasswordStrengthMeter({ password = '' }) {
  const lengthOK = password.length >= MIN_PASSWORD_LENGTH;
  const variety = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;

  const score = !password ? 0 : !lengthOK || variety <= 1 ? 1 : Math.min(variety, 4);
  const levels = [
    { label: 'No password', color: '#cbd5e1' },
    { label: 'Weak', color: '#dc2626' },
    { label: 'Fair', color: '#d97706' },
    { label: 'Good', color: '#2563eb' },
    { label: 'Strong', color: '#047857' },
  ];
  const active = levels[score];

  return (
    <div
      className="mt-2 mb-1"
      aria-label={`Password strength: ${active.label}. ${lengthOK ? 'Minimum length met' : 'At least 8 characters required'}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-500">Password strength</span>
        <span className="font-bold" style={{ color: score ? active.color : '#64748b' }} aria-live="polite">
          {password ? active.label : '—'}
        </span>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className="h-1.5 flex-1 rounded-full transition-colors duration-200"
            style={{ backgroundColor: score >= segment ? active.color : '#e2e8f0' }}
          />
        ))}
      </div>
      <p className={`mt-2 text-xs ${lengthOK ? 'text-emerald-700' : 'text-slate-500'}`}>
        {lengthOK ? '✓ Minimum 8 characters met' : 'At least 8 characters required'}
      </p>
      {!!password && lengthOK && score < 4 && (
        <p className="mt-1 text-xs text-slate-500">Tip: Mix uppercase, lowercase, numbers and symbols.</p>
      )}
    </div>
  );
}
