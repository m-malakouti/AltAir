import { defineConfig } from 'wxt';
import { parseMarketEndpoint } from './features/market/market-endpoint';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: () => {
    const configuredEndpoint: unknown = import.meta.env.WXT_MARKET_API_URL;
    const endpoint = parseMarketEndpoint(configuredEndpoint);
    return {
      name: 'Alt Air',
      short_name: 'Alt Air',
      description: 'Your personal browser workspace.',
      version: '0.1.0',
      minimum_chrome_version: '116',
      action: { default_icon: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png' } },
      permissions: ['storage'],
      optional_permissions: ['topSites'],
      ...(endpoint ? { host_permissions: [`${endpoint.protocol}//${endpoint.host}/*`] } : {}),
    };
  },
});
