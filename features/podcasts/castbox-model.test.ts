import { describe, expect, it } from 'vitest';
import {
  castboxPage,
  castboxPlayer,
  emptyLibrary,
  parseCastboxLink,
  parseLibrary,
} from './castbox-model';

describe('Castbox links', () => {
  it('accepts official channel, episode and player links', () => {
    expect(parseCastboxLink('https://castbox.fm/channel/Example-id1768345?country=us')).toEqual({
      id: '1768345:channel',
      channel: '1768345',
      episode: null,
    });
    expect(parseCastboxLink('https://www.castbox.fm/channel/1768345').channel).toBe('1768345');
    const episode = parseCastboxLink('https://castbox.fm/episode/Example-id1768345-id112620794');
    expect(episode.episode).toBe('112620794');
    expect(parseCastboxLink(castboxPage({ ...episode, title: 'Test' }))).toEqual(episode);
    expect(
      parseCastboxLink(
        '<iframe src="https://castbox.fm/app/castbox/player/id1768345/id112620794?autoplay=1&amp;hide_list=0"></iframe>',
      ),
    ).toEqual(episode);
    expect(castboxPlayer({ ...episode, title: 'Test' }, false)).toBe(
      'https://castbox.fm/app/castbox/player/id1768345/id112620794?autoplay=0&hide_list=1',
    );
  });
  it('rejects unsafe hosts, credentials, schemes and malformed IDs', () => {
    for (const link of [
      'https://castbox.fm.evil.test/channel/id1',
      'https://evil.test/castbox.fm/channel/id1',
      'http://castbox.fm/channel/id1',
      'https://user:password@castbox.fm/channel/id1',
      'https://castbox.fm:8080/channel/id1',
      'javascript:alert(1)',
      'https://castbox.fm/vb/example',
      'https://castbox.fm/app/castbox/player/id0',
      '<script src="https://castbox.fm/channel/id1"></script>',
    ])
      expect(() => parseCastboxLink(link)).toThrow();
  });
});
describe('Castbox library', () => {
  const item = { ...parseCastboxLink('https://castbox.fm/channel/id1768345'), title: 'Test' };
  it('restores only validated local preferences and content', () => {
    expect(parseLibrary(null)).toEqual(emptyLibrary());
    const library = { ...emptyLibrary(), items: [item], selected: item.id };
    expect(parseLibrary(library)).toEqual(library);
  });
  it('rejects duplicates, stale selection, unknown versions and excessive imports', () => {
    for (const library of [
      { ...emptyLibrary(), items: [item, item] },
      { ...emptyLibrary(), selected: 'missing' },
      { ...emptyLibrary(), version: 2 },
      { ...emptyLibrary(), items: Array.from({ length: 51 }, () => item) },
      { ...emptyLibrary(), items: [{ ...item, channel: '../../evil' }] },
    ])
      expect(() => parseLibrary(library)).toThrow();
  });
});
