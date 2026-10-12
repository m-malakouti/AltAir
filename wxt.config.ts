
import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-react'],

    manifest: {
        name: 'Alt Air',
        short_name: 'Alt Air',
        description: 'Your personal browser workspace.',
        version: '0.1.0',
        minimum_chrome_version: '116',
    },
});
