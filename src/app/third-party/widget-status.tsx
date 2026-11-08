'use client';

import { useSyncExternalStore } from 'react';

declare global {
  interface Window { widgetLoaded?: boolean }
}

const subscribe = (notify: () => void) => {
  window.addEventListener('widget:loaded', notify);
  return () => window.removeEventListener('widget:loaded', notify);
};

export function WidgetStatus() {
  const loaded = useSyncExternalStore(subscribe, () => window.widgetLoaded === true, () => false);
  return (
    <p className="status" role="status">
      {loaded ? 'Widget loaded under the strict policy.' : 'Loading widget…'}
    </p>
  );
}
