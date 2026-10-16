import { backgroundPhotos } from './background-photos';
export const backgroundOptions = [
  { id: 'sky', label: 'آسمان شب' },
  { id: 'aurora', label: 'شفق' },
  { id: 'sunset', label: 'غروب' },
  { id: 'plain', label: 'هماهنگ با تم' },
  { id: 'custom', label: 'رنگ دلخواه' },
  ...backgroundPhotos.map(({ id, label }) => ({ id, label })),
] as const;

export type BackgroundId = (typeof backgroundOptions)[number]['id'];
export interface BackgroundPreference {
  id: BackgroundId;
  color: string;
}
export function parseBackground(value: unknown): BackgroundPreference {
  const raw = value as Partial<BackgroundPreference> | null;
  return {
    id: backgroundOptions.some((option) => option.id === raw?.id) ? raw!.id! : 'sky',
    color:
      typeof raw?.color === 'string' && /^#[\da-f]{6}$/i.test(raw.color) ? raw.color : '#182341',
  };
}
