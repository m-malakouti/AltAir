import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');
const themes = [...css.matchAll(/:root\[data-theme='(dark|light)'\]\s*\{([\s\S]*?)\}/g)].map(
  (match) => ({
    name: match[1],
    tokens: Object.fromEntries(
      [...match[2]!.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)].map(
        (token) => [token[1]!, token[2]!] as const,
      ),
    ),
  }),
);

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}
function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
describe('semantic color contrast', () => {
  it('finds both theme palettes', () => {
    expect(themes.map((theme) => theme.name)).toEqual(['dark', 'light']);
  });
  for (const theme of themes) {
    it(`${theme.name} text and semantic notices meet WCAG AA normal-text contrast`, () => {
      const pairs: [string, string][] = [];
      for (const foreground of ['--color-text', '--color-muted', '--color-accent']) {
        for (const background of ['--color-bg', '--color-surface-solid', '--color-surface-soft'])
          pairs.push([foreground, background]);
      }
      pairs.push(
        ['--color-on-primary', '--color-primary'],
        ['--color-on-primary', '--color-primary-hover'],
      );
      for (const tone of ['success', 'warning', 'error'])
        pairs.push([`--color-${tone}`, `--color-${tone}-bg`]);
      for (const [foreground, background] of pairs) {
        const ratio = contrast(theme.tokens[foreground]!, theme.tokens[background]!);
        expect(
          ratio,
          `${theme.name}: ${foreground} on ${background} (${ratio.toFixed(2)}:1)`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`${theme.name} focus indicator meets non-text contrast`, () => {
      for (const background of ['--color-bg', '--color-surface-solid', '--color-surface-soft']) {
        expect(
          contrast(theme.tokens['--color-ring']!, theme.tokens[background]!),
        ).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
