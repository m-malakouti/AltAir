import { useEffect } from 'react';

export function NewTabReady() {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    let stopped = false;
    let fontsReady = false;
    let quiet = 0;
    let frame = 0;
    const reveal = () => {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(quiet);
      window.clearTimeout(limit);
      cancelAnimationFrame(frame);
      mutations.disconnect();
      sizes.disconnect();
      delete document.documentElement.dataset.starting;
    };
    const settle = () => {
      if (stopped || !fontsReady) return;
      window.clearTimeout(quiet);
      cancelAnimationFrame(frame);
      quiet = window.setTimeout(() => {
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(reveal);
        });
      }, 180);
    };
    const mutations = new MutationObserver(settle);
    mutations.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    const sizes = new ResizeObserver(settle);
    sizes.observe(root);
    // Slow network data must not keep the workspace hidden indefinitely.
    const limit = window.setTimeout(reveal, 2500);
    void document.fonts.ready.then(() => {
      fontsReady = true;
      settle();
    });
    return () => {
      stopped = true;
      window.clearTimeout(quiet);
      window.clearTimeout(limit);
      cancelAnimationFrame(frame);
      mutations.disconnect();
      sizes.disconnect();
    };
  }, []);
  return null;
}
