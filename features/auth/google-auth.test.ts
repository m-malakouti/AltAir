import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  token: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { id: 'test-extension' },
    identity: {
      getAuthToken: mocks.token,
      removeCachedAuthToken: mocks.remove,
      clearAllCachedAuthTokens: mocks.clear,
    },
    storage: { session: { get: mocks.get, set: mocks.set, remove: mocks.remove } },
  },
}));
import { parseGoogleProfile } from './google-auth';
beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.stubEnv('WXT_GOOGLE_OAUTH_CLIENT_ID', 'example.apps.googleusercontent.com');
  vi.resetModules();
});
describe('Google sign in', () => {
  it('rejects missing identity and unverified emails', () => {
    expect(() => parseGoogleProfile({ email: 'a@example.com', email_verified: true })).toThrow();
    expect(() =>
      parseGoogleProfile({ sub: '123', email: 'a@example.com', email_verified: false }),
    ).toThrow();
  });
  it('uses the stable Google subject and supports accounts without a name', () => {
    expect(
      parseGoogleProfile({ sub: '123', email: 'a@example.com', email_verified: true }),
    ).toEqual({ sub: '123', email: 'a@example.com', name: 'a@example.com' });
  });
  it('does not save a session when the user cancels', async () => {
    mocks.token.mockRejectedValue(new Error('cancelled'));
    const { signInGoogle } = await import('./google-auth');
    await expect(signInGoogle()).rejects.toThrow('ورود گوگل کامل نشد');
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('validates the profile with Google before saving only a connection flag', async () => {
    mocks.token.mockResolvedValue({ token: 'private-token' });
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          sub: '123',
          email: 'a@example.com',
          email_verified: true,
          name: 'Name',
        }),
    });
    vi.stubGlobal('fetch', fetcher);
    const { signInGoogle } = await import('./google-auth');
    expect((await signInGoogle()).sub).toBe('123');
    expect(fetcher).toHaveBeenCalledWith(
      'https://openidconnect.googleapis.com/v1/userinfo',
      expect.objectContaining({
        headers: { Authorization: 'Bearer private-token' },
        redirect: 'error',
      }),
    );
    expect(mocks.set).toHaveBeenCalledWith({ 'altAir.auth.google': true });
  });
  it('does not restore a session after logout', async () => {
    mocks.get.mockResolvedValue({});
    const { restoreGoogle, signOutGoogle } = await import('./google-auth');
    await signOutGoogle();
    expect(await restoreGoogle()).toBeNull();
    expect(mocks.clear).toHaveBeenCalled();
    expect(mocks.token).not.toHaveBeenCalled();
  });
});
