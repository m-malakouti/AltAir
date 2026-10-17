import type { CSSProperties } from 'react';
import { weatherVisual } from '../weather-visual';
export function AnimatedWeather({
  code,
  isDay,
  paused = false,
  atmosphere = false,
}: {
  code: number;
  isDay: boolean;
  paused?: boolean;
  atmosphere?: boolean;
}) {
  const kind = weatherVisual(code, isDay);
  const cloud = ['partly', 'cloud', 'rain', 'snow', 'storm'].includes(kind);
  const sun = kind === 'sun' || (kind === 'partly' && isDay);
  const moon = kind === 'moon' || (kind === 'partly' && !isDay);
  return (
    <span
      className={`animated-weather animated-weather--${kind} ${paused ? 'animated-weather--paused' : ''}`}
      aria-hidden="true"
    >
      <svg className="animated-weather-icon" viewBox="0 0 100 100" fill="none">
        {sun && (
          <g className="weather-sun" style={{ transformOrigin: '43px 39px' }}>
            <circle cx="43" cy="39" r="17" fill="#ffcf60" />
            <g stroke="#ffe4a0" strokeWidth="3.5" strokeLinecap="round">
              {Array.from({ length: 8 }, (_, i) => (
                <path key={i} d="M43 10v-5" transform={`rotate(${i * 45} 43 39)`} />
              ))}
            </g>
          </g>
        )}
        {moon && (
          <g className="weather-moon">
            <path d="M59 16a28 28 0 1 0 23 40A28 28 0 0 1 59 16Z" fill="#d8e7ff" />
            <circle cx="24" cy="20" r="2" fill="#fff" />
            <circle cx="80" cy="28" r="2.5" fill="#fff" />
          </g>
        )}
        {cloud && (
          <g className="weather-cloud">
            <path
              d="M24 67a15 15 0 1 1 0-30 22 22 0 0 1 42-6 18 18 0 1 1 9 36Z"
              fill={kind === 'storm' ? '#9dabc5' : '#e4effb'}
            />
            <path d="M24 67h51" stroke="#b8d3ef" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
        {(kind === 'rain' || kind === 'storm') &&
          [32, 50, 68].map((x, i) => (
            <path
              key={x}
              className="weather-icon-drop"
              style={{ animationDelay: `${i * -0.3}s` }}
              d={`M${x} 76l-4 10`}
              stroke="#78d2ff"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
        {kind === 'snow' &&
          [28, 49, 70].map((x, i) => (
            <g
              key={x}
              className="weather-icon-flake"
              style={{ animationDelay: `${i * -0.8}s` }}
              stroke="#e9faff"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d={`M${x} 76v12m-5-9 10 6m-10 0 10-6`} />
            </g>
          ))}
        {kind === 'storm' && (
          <path
            className="weather-lightning"
            d="m56 60-12 19h10l-6 17 22-25H58l7-11Z"
            fill="#ffe18c"
          />
        )}
        {kind === 'fog' && (
          <g className="weather-fog" stroke="#d4e9f5" strokeWidth="5" strokeLinecap="round">
            <path d="M20 32h60M12 49h65M26 66h62" />
          </g>
        )}
        {kind === 'unknown' && (
          <circle cx="50" cy="50" r="22" stroke="#d4e9f5" strokeWidth="3" strokeDasharray="5 9" />
        )}
      </svg>
      {atmosphere && ['rain', 'snow', 'storm', 'fog', 'sun'].includes(kind) && (
        <span className={`weather-atmosphere weather-atmosphere--${kind}`}>
          {['rain', 'snow', 'storm'].includes(kind) &&
            Array.from({ length: kind === 'snow' ? 28 : 42 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    '--particle-x': `${(i * 37 + 7) % 100}%`,
                    '--particle-delay': `${-(i * 0.43)}s`,
                    '--particle-duration': `${kind === 'snow' ? 9 + (i % 8) : 0.9 + (i % 7) * 0.17}s`,
                    '--particle-size': `${3 + (i % 5)}px`,
                  } as CSSProperties
                }
              />
            ))}
        </span>
      )}
    </span>
  );
}
