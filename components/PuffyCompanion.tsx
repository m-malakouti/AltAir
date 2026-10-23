import { useEffect, useRef, useState } from 'react';
import { WeatherMascot } from '@/features/weather/ui/WeatherMascot';
import { parseCity, parseWeather, type WeatherNow } from '@/features/weather/weather-model';
import {
  readWeatherCache,
  readWeatherCity,
  watchWeatherCache,
  watchWeatherCity,
} from '@/lib/browser/weather-storage';
import { story, type PuffyScene } from '@/features/workspace/puffy-story';
import { readTasks, TASKS_KEY, type Task } from '@/features/tasks/tasks-store';
import { watchWorkspaceValue } from '@/lib/browser/workspace-storage';
import './puffy-companion.css';
import { usePuffyDrag } from '@/features/workspace/use-puffy-drag';

export function PuffyCompanion({
  active = true,
  motionEnabled = true,
  dragEnabled = true,
  horizontalRange = 48,
}: {
  active?: boolean;
  motionEnabled?: boolean;
  dragEnabled?: boolean;
  horizontalRange?: number;
}) {
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [scene, setScene] = useState<PuffyScene>('hello');
  const [tasks, setTasks] = useState<Task[]>([]);
  const previousTasks = useRef<Task[] | null>(null);
  const [arrivedAt] = useState(Date.now);
  const remindAfter = useRef(arrivedAt + 60_000);
  const rounds = useRef(0);
  const [message, setMessage] = useState<string>();
  const [visible, setVisible] = useState(() => !document.hidden);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const rapid = useRef({ time: 0, count: 0 });
  const { stage, actor, held, start, keyboard, consumeDragClick } = usePuffyDrag(
    active && visible && dragEnabled,
    () => setScene('rest'),
    horizontalRange,
  );

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    let alive = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      let next: WeatherNow | null = null;
      try {
        const [rawCity, rawCache] = await Promise.all([readWeatherCity(), readWeatherCache()]);
        const city = parseCity(rawCity);
        if (
          typeof rawCache === 'object' &&
          rawCache &&
          'key' in rawCache &&
          'weather' in rawCache &&
          rawCache.key === `${city.latitude},${city.longitude}`
        ) {
          const parsed = parseWeather(rawCache.weather);
          if (Date.now() - Date.parse(parsed.observedAt) < 3_600_000) next = parsed;
        }
      } catch {
        /* The companion stays alive without a configured weather service. */
      }
      if (alive && current === revision) setWeather(next);
    };
    const refresh = () => {
      void load();
    };
    const stopCity = watchWeatherCity(refresh);
    const stopCache = watchWeatherCache(refresh);
    const interval = setInterval(refresh, 60_000);
    refresh();
    return () => {
      alive = false;
      stopCity();
      stopCache();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function load() {
      const current = ++revision;
      try {
        const next = await readTasks();
        if (!alive || current !== revision) return;
        if (
          previousTasks.current &&
          next.some(
            (task) =>
              task.done && previousTasks.current!.some((old) => old.id === task.id && !old.done),
          )
        ) {
          setScene('celebrate');
          setMessage(undefined);
        }
        previousTasks.current = next;
        setTasks(next);
      } catch {
        /* Task storage failure must not stop play. */
      }
    }
    void load();
    const stop = watchWorkspaceValue(TASKS_KEY, () => {
      void load();
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const task = tasks
    .filter((item) => !item.done && (!item.due || item.due <= today))
    .sort(
      (a, b) =>
        Number(b.priority === 'high') - Number(a.priority === 'high') ||
        (a.due || '9999').localeCompare(b.due || '9999'),
    )[0];
  useEffect(() => {
    if (!active || !visible || held || !motionEnabled) return;
    timer.current = setTimeout(() => {
      setMessage(undefined);
      if (scene === 'rest' && task && Date.now() >= remindAfter.current) {
        remindAfter.current = Date.now() + 20 * 60_000;
        setScene('remind');
      } else if (scene === 'juggle' && ++rounds.current % 2 === 0) setScene('proud');
      else setScene(story[scene].next);
    }, story[scene].duration);
    return () => clearTimeout(timer.current);
  }, [active, visible, held, scene, task, motionEnabled]);

  function react() {
    if (consumeDragClick()) return;
    const now = Date.now();
    rapid.current = {
      time: now,
      count: now - rapid.current.time < 700 ? rapid.current.count + 1 : 1,
    };
    setMessage(undefined);
    if (rapid.current.count >= 4) setScene('hug');
    else if (scene === 'juggle') {
      setScene('miss');
      setMessage('این پاس بود یا حواس‌پرت‌کُن؟!');
    } else if (scene === 'sleep') {
      setScene('hello');
      setMessage('من بیدار بودم! فقط چشمام استراحت می‌کردن!');
    } else setScene('love');
  }
  const snow = weather && [71, 73, 75, 77, 85, 86].includes(weather.code);
  const wet = weather && [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.code);
  const line =
    message ??
    (scene === 'miss' && snow
      ? 'عه! توپم برفی بود!'
      : scene === 'rest' && wet
        ? 'چتر برای دوتامون جا نداره؛ توپم خیس نشه!'
        : story[scene].text);
  return (
    <div
      ref={stage}
      className={`puffy-companion puffy-scene--${scene}${held ? ' puffy-companion--held' : ''}${snow ? ' puffy-snowball' : ''}${!active || !visible || !motionEnabled ? ' puffy-companion--inactive' : ''}`}
      data-scene={scene}
    >
      <div className="puffy-actor" ref={actor}>
        <div className="puffy-motion">
          <button
            type="button"
            className="puffy-interact"
            aria-label="بازی با پوفی"
            aria-description="برای جابه‌جایی بکشید یا از کلیدهای چپ و راست استفاده کنید"
            onClick={react}
            onPointerDown={dragEnabled ? start : undefined}
            onKeyDown={dragEnabled ? keyboard : undefined}
          >
            <WeatherMascot
              code={weather?.code ?? -1}
              isDay={weather?.isDay ?? true}
              mood={held ? 'surprised' : story[scene].mood}
              paused={!active || !visible || held || !motionEnabled}
              message={line}
              showCaption={false}
              hanging={held}
            />
          </button>
          <button
            type="button"
            className="puffy-ball"
            aria-label="پاس دادن توپ به پوفی"
            onClick={() => {
              setScene('prepare');
              setMessage('پاس قشنگی بود! حالا منو ببین!');
            }}
          >
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="#f3f4e9" stroke="#819099" strokeWidth="1.5" />
              <path
                d="m20 11 8 6-3 9H15l-3-9Zm-15 2 7 4-3 10-6-2m29-12-4 4 3 10 6-2M14 36l1-10m10 0 3 10M20 2v9"
                fill="#354958"
                stroke="#354958"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>
      </div>
      {scene === 'remind' && task && (
        <div className="puffy-reminder" role="status">
          <span>یه قدم کوچولو؟ {task.title}</span>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('altair:show-task', { detail: task.id }));
              setScene('rest');
            }}
          >
            نمایش کار
          </button>
          <button
            type="button"
            onClick={() => {
              remindAfter.current = Date.now() + 30 * 60_000;
              setScene('rest');
              setMessage('باشه رفیق؛ هر وقت آماده بودی.');
            }}
          >
            بعداً
          </button>
        </div>
      )}
    </div>
  );
}
