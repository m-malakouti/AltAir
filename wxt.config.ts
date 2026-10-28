import { defineConfig } from 'wxt';
import { parseMarketEndpoint } from './features/market/market-endpoint';
import { CONNECTIVITY_ORIGINS } from './lib/browser/connectivity';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => {
    const configuredEndpoint: unknown = import.meta.env.WXT_MARKET_API_URL;
    const endpoint = parseMarketEndpoint(configuredEndpoint);
    const googleClient: unknown = import.meta.env.WXT_GOOGLE_OAUTH_CLIENT_ID;
    const googleClientId = typeof googleClient === 'string' ? googleClient.trim() : '';
    return {
      name: 'AltAir360',
      short_name: 'AltAir360',
      description: 'Your personal browser workspace.',
      version: '0.1.0',
      minimum_chrome_version: '116',
      action: { default_icon: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png' } },
      permissions: ['storage', 'alarms', ...(googleClientId ? ['identity' as const] : [])],
      ...(googleClientId
        ? {
            oauth2: { client_id: googleClientId, scopes: ['openid', 'email', 'profile'] },
          }
        : {}),
      optional_permissions: ['topSites', 'notifications'],
      content_security_policy: {
        extension_pages:
          "script-src 'self'; object-src 'self'; frame-src https://www.google.com https://castbox.fm;",
      },
      host_permissions: [
        ...CONNECTIVITY_ORIGINS.map((origin) => `${origin}/*`),
        'https://site.api.espn.com/*',
        ...(googleClientId ? ['https://openidconnect.googleapis.com/*'] : []),
        ...(endpoint ? [`${endpoint.protocol}//${endpoint.host}/*`] : []),
      ],
    };
  },
});
