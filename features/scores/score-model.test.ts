import { describe, expect, it } from 'vitest';
import { parseScoreboard, tehranDate, shiftDate } from './score-model';
const event = {
  id: '1',
  date: '2026-10-14T18:00:00Z',
  status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS' }, displayClock: "45'" },
  competitions: [
    {
      competitors: [
        { homeAway: 'away', team: { displayName: 'Away', logo: 'javascript:bad' }, score: '1' },
        {
          homeAway: 'home',
          team: { displayName: 'Home', logo: 'https://a.espncdn.com/team.png' },
          score: '2',
        },
      ],
    },
  ],
};
describe('live score data', () => {
  it('orders teams by homeAway and preserves actual scores', () => {
    const match = parseScoreboard({ events: [event] })[0]!;
    expect(match.home.name).toBe('Home');
    expect(match.home.score).toBe('2');
    expect(match.away.logo).toBeNull();
    expect(match.state).toBe('in');
  });
  it('distinguishes no games from malformed data', () => {
    expect(parseScoreboard({ events: [] })).toEqual([]);
    expect(() => parseScoreboard({})).toThrow();
    expect(() => parseScoreboard({ events: [{ ...event, competitions: [] }] })).toThrow();
  });
  it('uses the Tehran calendar day and shifts across year boundaries', () => {
    expect(tehranDate(new Date('2026-10-14T22:00:00Z'))).toBe('2026-10-15');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
  });
});
