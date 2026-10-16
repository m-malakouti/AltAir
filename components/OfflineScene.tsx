import { useId } from 'react';
import { Icon } from './ui/Icon';

export function OfflineScene({
  confirmed,
  checking,
  onRetry,
}: {
  confirmed: boolean;
  checking: boolean;
  onRetry: () => void;
}) {
  const id = useId().replaceAll(':', '');
  return (
    <section className="offline-scene" aria-labelledby={`${id}-title`}>
      <svg className="offline-illustration" viewBox="0 0 440 240" fill="none" aria-hidden="true">
        <defs>
          <linearGradient
            id={`${id}-planet`}
            x1="48"
            y1="38"
            x2="122"
            y2="120"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#e2b6ff" />
            <stop offset="1" stopColor="#7b64e8" />
          </linearGradient>
          <linearGradient
            id={`${id}-cloud`}
            x1="170"
            y1="78"
            x2="283"
            y2="174"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fff" />
            <stop offset="1" stopColor="#c1c5f5" />
          </linearGradient>
          <linearGradient
            id={`${id}-panel`}
            x1="320"
            y1="45"
            x2="364"
            y2="88"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#9be6ff" />
            <stop offset="1" stopColor="#7594f5" />
          </linearGradient>
        </defs>
        <ellipse
          cx="220"
          cy="128"
          rx="180"
          ry="83"
          transform="rotate(-12 220 128)"
          stroke="#aaa0ec"
          strokeOpacity=".24"
          strokeDasharray="4 9"
        />
        <ellipse
          cx="220"
          cy="128"
          rx="148"
          ry="56"
          transform="rotate(16 220 128)"
          stroke="#aaa0ec"
          strokeOpacity=".12"
        />
        <g className="offline-planet">
          <circle cx="91" cy="75" r="34" fill={`url(#${id}-planet)`} />
          <path
            d="M57 69c-36 30 95 36 88-1"
            stroke="#d8c7ff"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="82" cy="62" r="8" fill="#fff" fillOpacity=".14" />
          <circle cx="105" cy="88" r="5" fill="#6852c9" fillOpacity=".28" />
        </g>
        <g className="offline-cloud">
          <ellipse cx="228" cy="190" rx="68" ry="9" fill="#030818" fillOpacity=".16" />
          <path
            d="M174 167a27 27 0 0 1-3-54 39 39 0 0 1 75-13 33 33 0 0 1 39 33 21 21 0 0 1-2 41H176"
            fill={`url(#${id}-cloud)`}
          />
          <path
            d="M194 115q27-23 54 0M204 128q17-14 34 0"
            stroke="#8f8bb9"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="221" cy="143" r="4" fill="#8f8bb9" />
          <path d="m204 104 37 43" stroke="#f4f3ff" strokeWidth="12" strokeLinecap="round" />
          <path d="m204 104 37 43" stroke="#9b8abc" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M187 173v17q0 16 19 16h2M250 173v17q0 16-19 16h-2"
            stroke="#c7c4f8"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect x="200" y="198" width="13" height="16" rx="4" fill="#c7c4f8" />
          <rect x="226" y="198" width="13" height="16" rx="4" fill="#c7c4f8" />
          <path
            d="M213 202h4M213 210h4M222 203v6"
            stroke="#c7c4f8"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="m218 188 3 5 3-5M218 223l3-5 3 5"
            stroke="#f9c9a8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <g className="offline-satellite" transform="rotate(22 346 73)">
          <rect x="311" y="58" width="23" height="30" rx="4" fill={`url(#${id}-panel)`} />
          <rect x="357" y="58" width="23" height="30" rx="4" fill={`url(#${id}-panel)`} />
          <path d="M322 60v26M313 73h19M368 60v26M359 73h19" stroke="#effaff" strokeOpacity=".45" />
          <rect x="336" y="61" width="19" height="24" rx="5" fill="#e2e5ff" />
          <path
            d="M346 61V46m-6 0h12M344 88v7"
            stroke="#e2e5ff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <g fill="#e8e3ff">
          <circle cx="164" cy="43" r="2" />
          <circle cx="302" cy="194" r="2" />
          <circle cx="365" cy="137" r="2" />
          <circle cx="61" cy="166" r="2" />
        </g>
        <path
          d="M274 37v10m-5-5h10M138 183v12m-6-6h12M390 106v8m-4-4h8"
          stroke="#e5d7ff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div className="offline-copy">
        <p className="offline-status" role="status" aria-live="polite">
          <span />
          {confirmed ? 'اینترنت قطع است' : 'دسترسی به اینترنت برقرار نیست'}
        </p>
        <h1 id={`${id}-title`}>کمی از مدار خارج شدیم.</h1>
        <p className="offline-description">یک مکث کوتاه؛ با برگشت اتصال، خودکار برمی‌گردیم.</p>
        <button type="button" className="offline-retry" onClick={onRetry} disabled={checking}>
          <Icon name="refresh" />
          <span>{checking ? 'در حال بررسی…' : 'بررسی دوباره'}</span>
        </button>
        <p className="offline-footnote">میزکارت همین‌جاست؛ حتی بدون اینترنت.</p>
      </div>
    </section>
  );
}
