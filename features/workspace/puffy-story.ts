export type PuffyScene =
  | 'hello'
  | 'rest'
  | 'prepare'
  | 'juggle'
  | 'miss'
  | 'chase'
  | 'proud'
  | 'sleep'
  | 'love'
  | 'hug'
  | 'celebrate'
  | 'remind';
export const story: Record<
  PuffyScene,
  {
    next: PuffyScene;
    duration: number;
    text: string;
    mood: 'idle' | 'happy' | 'love' | 'surprised' | 'sleepy' | 'curious';
  }
> = {
  hello: { next: 'rest', duration: 4500, text: 'عه! اومدی؟ جاتو نگه داشتم!', mood: 'happy' },
  rest: { next: 'prepare', duration: 12000, text: '', mood: 'idle' },
  prepare: { next: 'juggle', duration: 2000, text: 'ببین این دفعه چندتا می‌زنم…', mood: 'curious' },
  juggle: { next: 'miss', duration: 6000, text: '', mood: 'idle' },
  miss: { next: 'chase', duration: 1500, text: 'اوپس! توپم!', mood: 'surprised' },
  chase: { next: 'proud', duration: 2500, text: '', mood: 'curious' },
  proud: { next: 'sleep', duration: 4500, text: 'دیدی؟ پنج‌تا شد! تقریباً…', mood: 'happy' },
  sleep: { next: 'rest', duration: 16000, text: '', mood: 'sleepy' },
  love: { next: 'rest', duration: 4000, text: 'یه کلیک تو، یه عالمه ذوق من!', mood: 'love' },
  hug: { next: 'rest', duration: 4500, text: 'یه لحظه! بذار نفس بگیرم!', mood: 'surprised' },
  celebrate: { next: 'rest', duration: 5000, text: 'گل شد! یکی کمتر! دمت گرم!', mood: 'happy' },
  remind: { next: 'rest', duration: 14000, text: 'یکی‌یکی می‌ریم جلو، من هستم.', mood: 'curious' },
};
