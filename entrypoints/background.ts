import { defineBackground } from 'wxt/utils/define-background';
import { initializeFocusBackground } from '@/lib/browser/focus-background';
export default defineBackground(() => {
  initializeFocusBackground();
});
