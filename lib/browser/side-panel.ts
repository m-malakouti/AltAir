import { browser } from 'wxt/browser';

export async function openSidePanel(): Promise<void> {
  if (typeof browser.sidePanel?.open !== 'function') {
    throw new Error('Side Panel API is unavailable.');
  }

  const currentWindow = await browser.windows.getCurrent();
  if (currentWindow.id === undefined) {
    throw new Error('Current browser window is unavailable.');
  }

  await browser.sidePanel.open({ windowId: currentWindow.id });
}
