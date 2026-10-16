/** Count forward through 9 -> 0 using the second copy of the digit reel. */
export function nextDigitPosition(previous: number, next: number): number {
  return previous + ((next - previous + 10) % 10);
}
