import { browser } from 'wxt/browser';

export function focusExtensionAvailable() {
  return Boolean(browser.runtime?.id);
}
export async function requestFocusNotifications() {
  if (!focusExtensionAvailable()) return false;
  return browser.permissions.request({ permissions: ['notifications'] });
}
export async function focusNotificationsAllowed() {
  return (
    focusExtensionAvailable() && browser.permissions.contains({ permissions: ['notifications'] })
  );
}
