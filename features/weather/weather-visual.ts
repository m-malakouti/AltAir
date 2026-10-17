export type WeatherVisual =
  'sun' | 'moon' | 'cloud' | 'partly' | 'fog' | 'rain' | 'snow' | 'storm' | 'unknown';
export function weatherVisual(code: number, isDay: boolean): WeatherVisual {
  if (code === 0) return isDay ? 'sun' : 'moon';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  return 'unknown';
}
