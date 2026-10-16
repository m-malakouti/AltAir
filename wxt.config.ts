import { defineConfig } from 'wxt';
import { parseMarketEndpoint } from './features/market/market-endpoint';
import { CONNECTIVITY_ORIGINS } from './lib/browser/connectivity';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => {
    const configuredEndpoint: unknown = import.meta.env.WXT_MARKET_API_URL;
    const endpoint = parseMarketEndpoint(configuredEndpoint);
    return {
      name: 'AltAir360',
      short_name: 'AltAir360',
      description: 'Your personal browser workspace.',
      version: '0.1.0',
      minimum_chrome_version: '116',
      action: { default_icon: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png' } },
      permissions: ['storage', 'alarms'],
      optional_permissions: ['topSites', 'notifications'],
      host_permissions: [
        ...CONNECTIVITY_ORIGINS.map((origin) => `${origin}/*`),
        'https://site.api.espn.com/*',
        ...(import.meta.env.WXT_NESHAN_MAP_KEY ? ['https://*.neshan.org/*'] : []),
        ...(endpoint ? [`${endpoint.protocol}//${endpoint.host}/*`] : []),
      ],
    };
  },
});
