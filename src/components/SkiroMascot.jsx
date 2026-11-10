// Skiro's visual personality. Presentation only: no API calls or chat state.
// Static SVG identity + compositor-friendly CSS reactions for 4 UI states.
import { memo } from 'react';
import './SkiroMascot.css';

const LABELS = {
  idle: 'waiting',
  typing: 'listening while you type',
  thinking: 'thinking',
  replying: 'replying',
};

function SkiroMascot({ size = 40, status = 'idle', animated = true, decorative = false, className = '' }) {
  const emotion = Object.prototype.hasOwnProperty.call(LABELS, status) ? status : 'idle';
  return (
    <span
      className={`skiro-mascot skiro-mascot--${emotion} ${animated ? 'skiro-mascot--animated' : 'skiro-mascot--still'} ${className}`.trim()}
      style={{ width: size, height: size }}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Skiro AI ${LABELS[emotion]}`}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="30" fill="#059669" />
        <circle cx="32" cy="32" r="29.2" fill="none" stroke="#ffffff" strokeOpacity=".09" strokeWidth="1.6" />
        {/* Keep the original sparkle at the heart of the logo. */}
        <g className="skiro-mascot__spark" fill="none" stroke="white" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 9.5 34.2 20.5 44.8 24.7 34.2 28.9 30 39.7 25.8 28.9 15.2 24.7 25.8 20.5Z" />
          <path d="M47 9.7v9.4m-4.7-4.7h9.4" strokeWidth="2.8" />
        </g>
        {/* Expressions are drawn in SVG, not emoji fonts, so Android/desktop match. */}
        <g className="skiro-mascot__eyes skiro-mascot__eyes--smile" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18.7 45.5q4-5 8 0" />
          <path d="M37.3 45.5q4-5 8 0" />
        </g>
        <g className="skiro-mascot__eyes skiro-mascot__eyes--curious" fill="white">
          <ellipse cx="23.2" cy="45.1" rx="2.3" ry="3.1" />
          <ellipse cx="41" cy="45.1" rx="2.3" ry="3.1" />
        </g>
        <g className="skiro-mascot__eyes skiro-mascot__eyes--thinking" fill="white">
          <ellipse cx="23.2" cy="43.3" rx="2.1" ry="2.5" />
          <ellipse cx="41" cy="43.3" rx="2.1" ry="2.5" />
        </g>
        <path className="skiro-mascot__mouth skiro-mascot__mouth--smile" d="M27.4 52.2q4.7 4.5 9.4 0" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <circle className="skiro-mascot__mouth skiro-mascot__mouth--curious" cx="32" cy="53.2" r="1.8" fill="white" />
        <ellipse className="skiro-mascot__mouth skiro-mascot__mouth--thinking" cx="32" cy="53.3" rx="2.4" ry="3" fill="none" stroke="white" strokeWidth="2.1" />
        <path className="skiro-mascot__mouth skiro-mascot__mouth--replying" d="M24.7 50.8q7.3 11.6 14.6 0Z" fill="white" />
        <g className="skiro-mascot__cheeks" fill="none" stroke="#a7f3d0" strokeWidth="1.6" strokeLinecap="round" opacity=".82">
          <path d="m15.3 49.3-1.7 2.4M18.8 50l-1.6 2.4M47 50l-1.6 2.4M50.5 49.3l-1.7 2.4" />
        </g>
        <g className="skiro-mascot__thought" fill="#d1fae5">
          <circle cx="52" cy="36" r="2" />
          <circle cx="56.5" cy="30.3" r="1.5" />
          <circle cx="57.2" cy="24.5" r="1" />
        </g>
        <g className="skiro-mascot__excitement" fill="#a7f3d0">
          <path d="M9.8 30l1.4 3.2 3.2 1.3-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.3Z" />
          <circle cx="55" cy="42" r="1.7" />
        </g>
      </svg>
    </span>
  );
}

export default memo(SkiroMascot);
