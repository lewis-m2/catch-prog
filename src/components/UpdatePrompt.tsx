import { useRegisterSW } from 'virtual:pwa-register/react';
import { BigButton } from './BigButton';

/** Registers the service worker, and tells the coach when the app is ready offline or has an update. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  const dismiss = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div role="status" className="flex shrink-0 items-center gap-2 border-t-2 border-surface bg-bg p-2">
      <p className="flex-1 pl-2 text-base font-semibold">{needRefresh ? 'New version available' : 'Ready to work offline'}</p>
      {needRefresh && <BigButton onClick={() => void updateServiceWorker(true)}>Reload</BigButton>}
      <BigButton variant="secondary" onClick={dismiss}>
        {needRefresh ? 'Later' : 'OK'}
      </BigButton>
    </div>
  );
}
