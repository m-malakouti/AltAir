import { browser } from 'wxt/browser';
import { FOCUS_KEY, readFocus, reconcileFocus, updateFocus } from '@/features/focus/focus-store';
const alarmName = 'altAir.focus.deadline';
export function initializeFocusBackground() {
  async function sync() {
    await navigator.locks.request('altAir.focus.scheduler', async () => {
      const data = await reconcileFocus();
      const session = data.session;
      if (session?.status === 'running' && session.deadline !== null) {
        const existing = await browser.alarms.get(alarmName);
        if (existing?.scheduledTime !== session.deadline)
          await browser.alarms.create(alarmName, { when: session.deadline });
      } else await browser.alarms.clear(alarmName);
      if (
        session?.status !== 'finished' ||
        !data.settings.notifications ||
        data.notifiedId === session.id ||
        Date.now() - (session.endedAt ?? 0) > 300_000 ||
        Date.now() < (session.endedAt ?? 0) ||
        !(await browser.permissions.contains({ permissions: ['notifications'] }))
      )
        return;
      let claimed = false;
      await updateFocus((latest) => {
        if (
          latest.session?.id !== session.id ||
          latest.notifiedId === session.id ||
          latest.session.status !== 'finished' ||
          !latest.settings.notifications
        )
          return latest;
        claimed = true;
        return { ...latest, notifiedId: session.id };
      });
      if (claimed)
        await browser.notifications.create(`focus-${session.id}`, {
          type: 'basic',
          iconUrl: browser.runtime.getURL('/icon/128.png'),
          title: session.phase === 'focus' ? 'زمان تمرکز تمام شد' : 'استراحت تمام شد',
          message: 'برای ادامهٔ جلسه، فضای AltAir360 را باز کن.',
          silent: !data.settings.sound,
        });
    });
  }
  const run = () => {
    void sync().catch(() => console.warn('Focus reminder could not be synchronized.'));
  };
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === alarmName) run();
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && FOCUS_KEY in changes) run();
  });
  browser.runtime.onStartup.addListener(run);
  browser.runtime.onInstalled.addListener(run);
  browser.permissions.onRemoved.addListener((removed) => {
    if (!removed.permissions?.includes('notifications')) return;
    void readFocus()
      .then((data) => {
        if (data.settings.notifications)
          return updateFocus((current) => ({
            ...current,
            settings: { ...current.settings, notifications: false },
          }));
      })
      .catch(() => console.warn('Focus notification preference could not be updated.'));
  });
  let notificationListener = false;
  function listenForNotifications() {
    if (notificationListener || !browser.notifications?.onClicked) return;
    browser.notifications.onClicked.addListener((notificationId) => {
      if (notificationId.startsWith('focus-')) {
        void browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') });
        void browser.notifications.clear(notificationId);
      }
    });
    notificationListener = true;
  }
  browser.permissions.onAdded.addListener(() => {
    listenForNotifications();
    run();
  });
  listenForNotifications();
  run();
}
