import { weatherVisual, type WeatherVisual } from '../weather-visual';
import './weather-mascot.css';

const quips: Record<WeatherVisual, string> = {
  rain: 'من که گفتم چتر برداریم!',
  snow: 'من پنگوئن نیستم! ب‌ب‌برف…',
  storm: 'این دیگه صدای شکمم نبود!',
  sun: 'ضدآفتاب زدم؛ آمادهٔ فتوسنتزم!',
  moon: 'شیفت نگهبانی ستاره‌ها با منه…',
  partly: 'آفتاب قایم‌باشک بازی می‌کنه!',
  cloud: 'خورشید رفته مرخصی؟',
  fog: 'من اینجام… شما کجایین؟',
  unknown: 'هنوز دارم هوا رو بو می‌کشم…',
};

/** Local vector character: no remote assets, timers, or extra weather requests. */
export function WeatherMascot({
  code,
  isDay,
  paused = false,
  stale = false,
  mood = 'idle',
  message,
}: {
  code: number;
  isDay: boolean;
  paused?: boolean;
  stale?: boolean;
  mood?: 'idle' | 'happy' | 'love' | 'surprised' | 'sleepy' | 'curious' | 'grumpy';
  message?: string;
}) {
  const kind = weatherVisual(code, isDay);
  const wet = kind === 'rain' || kind === 'storm';
  const cold = kind === 'snow';
  const sleepy = mood === 'sleepy' || (mood === 'idle' && kind === 'moon');
  return (
    <figure
      className={`weather-mascot weather-mascot--${kind} mascot-mood--${mood}${paused ? ' weather-mascot--paused' : ''}`}
    >
      <svg viewBox="0 0 200 170" fill="none" aria-hidden="true">
        <ellipse cx="100" cy="153" rx="53" ry="8" fill={wet ? '#79d5f9' : '#8baec6'} opacity=".2" />
        {wet &&
          [25, 51, 148, 173].map((x, i) => (
            <path
              key={x}
              className="mascot-rain"
              style={{ animationDelay: `${i * -0.3}s` }}
              d={`M${x} 25l-5 15m9 30-5 15`}
              stroke="#87dcff"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        {cold &&
          [28, 61, 146, 177].map((x, i) => (
            <path
              key={x}
              className="mascot-snow"
              style={{ animationDelay: `${i * -0.7}s` }}
              d={`M${x} 20v12m-6-6h12m-10-4 8 8m-8 0 8-8`}
              stroke="#dbf6ff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        {kind === 'sun' && (
          <g className="mascot-sun">
            <circle cx="158" cy="32" r="14" fill="#ffcd69" />
            <path
              d="M158 10V6m0 52v-4m22-22h4m-52 0h4m38-16 3-3m-35 35-3 3m35-3 3 3m-35-35-3-3"
              stroke="#ffcd69"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}
        {sleepy && (
          <g className="mascot-sleep" fill="#e2e6ff">
            <path d="M156 17a17 17 0 1 0 17 23 19 19 0 0 1-17-23Z" />
            <path d="m40 31 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
          </g>
        )}
        <g className="mascot-body">
          <path
            d="m78 137-5 13h17"
            stroke="#6688a0"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="mascot-kicking-foot"
            d="m114 137 5 13h-17"
            stroke="#6688a0"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M64 96Q46 100 44 116m91-20q16 4 20-12"
            stroke={cold ? '#a5d4ee' : '#b5e7de'}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M62 77Q53 42 77 49Q99 32 123 49Q147 43 138 78L143 113Q143 140 101 141Q57 140 57 113Z"
            fill={cold ? '#b7dcf4' : '#bce9dc'}
            stroke="#477f85"
            strokeWidth="2.5"
          />
          <ellipse cx="99" cy="121" rx="25" ry="13" fill="#e7f7ec" opacity=".65" />
          <ellipse cx="73" cy="99" rx="9" ry="5" fill={cold ? '#8ebbe0' : '#f1a8a4'} opacity=".8" />
          <ellipse
            cx="126"
            cy="99"
            rx="9"
            ry="5"
            fill={cold ? '#8ebbe0' : '#f1a8a4'}
            opacity=".8"
          />
          {mood === 'love' ? (
            <g fill="#e87c99">
              <path d="M84 94 75 85q-5-9 4-9 5 0 5 5 2-8 8-4 7 5-8 17ZM115 94l-9-9q-5-9 4-9 5 0 5 5 2-8 8-4 7 5-8 17Z" />
            </g>
          ) : mood === 'happy' ? (
            <path
              d="M77 88q7-12 14 0m16 0q7-12 14 0"
              stroke="#254358"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : mood === 'grumpy' ? (
            <path
              d="m77 81 14 6-14 4m44-10-14 6 14 4"
              stroke="#254358"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : kind === 'sun' && mood === 'idle' ? (
            <g fill="#254358" stroke="#254358" strokeWidth="3">
              <path d="M70 81h24v9q-12 16-24 0Zm35 0h24v9q-12 16-24 0Z" />
              <path d="M94 84h11" />
            </g>
          ) : sleepy ? (
            <path
              d="M77 87q7 8 14 0m16 0q7 8 14 0"
              stroke="#254358"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : (
            <g className="mascot-eyes" fill="#254358">
              <ellipse cx="84" cy="87" rx="4" ry="7" />
              <ellipse cx="115" cy="87" rx="4" ry="7" />
              <circle cx="85" cy="85" r="1.4" fill="white" />
              <circle cx="116" cy="85" r="1.4" fill="white" />
            </g>
          )}
          {mood === 'happy' || mood === 'love' ? (
            <path d="M90 102q10 19 20 0Z" fill="#254358" />
          ) : mood === 'surprised' ? (
            <ellipse cx="100" cy="105" rx="7" ry="9" fill="#254358" />
          ) : cold ? (
            <path
              d="m90 104 4-3 4 4 4-4 5 3"
              stroke="#426788"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : kind === 'storm' || sleepy ? (
            <ellipse cx="100" cy="105" rx="5" ry="7" fill="#254358" />
          ) : (
            <path
              d={wet ? 'M92 108q8-9 16 0' : 'M91 102q9 12 18 0'}
              stroke="#254358"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
          {cold && (
            <g>
              <path d="M62 66q2-29 38-29t38 29Z" fill="#ef9d83" />
              <rect x="59" y="61" width="82" height="12" rx="6" fill="#ffc0a2" />
              <circle cx="100" cy="32" r="9" fill="#ffd5b5" />
              <path d="M64 115q36 14 72 0" stroke="#ed9c82" strokeWidth="12" />
              <path d="m120 121-5 21" stroke="#ffc0a2" strokeWidth="12" />
            </g>
          )}
          {wet && <path className="mascot-drip" d="M70 72q-9 13 0 13t0-13" fill="#52bce8" />}
        </g>
        {wet && (
          <g className="mascot-umbrella">
            <path
              d="M151 57v48q0 10-8 10t-8-8"
              stroke="#efd09d"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M111 59q40-67 79 0-13-10-26 0-13-10-26 0-14-10-27 0Z"
              fill="#eea67f"
              stroke="#f8d1a6"
              strokeWidth="2"
            />
            <path d="M151 26q-13 10-13 33m13-33q13 10 13 33" stroke="#f8d1a6" strokeWidth="2" />
          </g>
        )}
        {kind === 'storm' && <path d="m37 42-12 21h10l-3 14 20-25H41l7-10Z" fill="#ffd67d" />}
        {kind === 'fog' && (
          <g
            className="mascot-mist"
            stroke="#c8e0e9"
            strokeWidth="9"
            strokeLinecap="round"
            opacity=".55"
          >
            <path d="M24 94h66m24 22h61M33 137h88" />
          </g>
        )}
        {(kind === 'cloud' || kind === 'partly') && (
          <g className="mascot-cloud">
            <path d="M135 36q-10-15 5-19 5-16 20-9 15-5 19 10 17 11 0 18Z" fill="#e0eaf3" />
            {kind === 'partly' && (
              <circle cx="135" cy="15" r="10" fill={isDay ? '#ffcf76' : '#c4cef7'} />
            )}
          </g>
        )}
      </svg>
      <figcaption>
        <span className="weather-mascot-name">پوفی می‌گه</span>
        {message ?? (stale ? 'خبر تازه ندارم؛ این حال‌وهوای قبلیه!' : quips[kind])}
      </figcaption>
    </figure>
  );
}
