import { describe, expect, it, vi } from 'vitest';
import { keepAwake, type WakeLockEnv, type WakeLockStatus } from './wake-lock';

function fakeLock() {
  let onRelease = () => {};
  return {
    release: vi.fn(async () => {}),
    addEventListener: (_type: 'release', listener: () => void) => {
      onRelease = listener;
    },
    /** Simulates the browser dropping the lock, e.g. when the screen locks. */
    drop: () => onRelease(),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve));

function setup(request: () => Promise<ReturnType<typeof fakeLock>>) {
  let visible = true;
  let visibilityListener = () => {};
  const removeListener = vi.fn();
  const statuses: WakeLockStatus[] = [];
  const env: WakeLockEnv = {
    wakeLock: { request },
    isVisible: () => visible,
    onVisibilityChange: (listener) => {
      visibilityListener = listener;
      return removeListener;
    },
  };
  return {
    env,
    statuses,
    removeListener,
    onStatus: (status: WakeLockStatus) => {
      statuses.push(status);
    },
    setVisible: async (value: boolean) => {
      visible = value;
      visibilityListener();
      await flush();
    },
  };
}

describe('keepAwake', () => {
  it('reports unsupported and does not throw when the API is missing', () => {
    const statuses: WakeLockStatus[] = [];
    const stop = keepAwake({ isVisible: () => true, onVisibilityChange: () => () => {} }, (status) => {
      statuses.push(status);
    });
    expect(statuses).toEqual(['unsupported']);
    expect(stop).not.toThrow();
  });

  it('acquires the lock straight away', async () => {
    const request = vi.fn(async () => fakeLock());
    const t = setup(request);

    keepAwake(t.env, t.onStatus);
    await flush();

    expect(request).toHaveBeenCalledTimes(1);
    expect(t.statuses).toEqual(['on']);
  });

  it('re-acquires when the app becomes visible after the lock was dropped', async () => {
    const lock = fakeLock();
    const request = vi.fn(async () => lock);
    const t = setup(request);

    keepAwake(t.env, t.onStatus);
    await flush();

    lock.drop();
    await t.setVisible(false);
    expect(request).toHaveBeenCalledTimes(1); // no request while hidden

    await t.setVisible(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(t.statuses).toEqual(['on', 'off', 'on']);
  });

  it('does not request a second lock while it already holds one', async () => {
    const request = vi.fn(async () => fakeLock());
    const t = setup(request);

    keepAwake(t.env, t.onStatus);
    await flush();
    await t.setVisible(true);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reports failure without throwing, then retries on next visibility', async () => {
    const request = vi
      .fn<() => Promise<ReturnType<typeof fakeLock>>>()
      .mockRejectedValueOnce(new Error('low battery'))
      .mockImplementation(async () => fakeLock());
    const t = setup(request);

    keepAwake(t.env, t.onStatus);
    await flush();
    expect(t.statuses).toEqual(['failed']);

    await t.setVisible(true);
    expect(t.statuses).toEqual(['failed', 'on']);
  });

  it('releases the lock and stops listening on stop', async () => {
    const lock = fakeLock();
    const t = setup(async () => lock);

    const stop = keepAwake(t.env, t.onStatus);
    await flush();
    stop();

    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(t.removeListener).toHaveBeenCalledTimes(1);
    expect(t.statuses).toEqual(['on', 'off']);
  });

  it('releases a lock that arrives after stop was called', async () => {
    const lock = fakeLock();
    const t = setup(async () => lock);

    const stop = keepAwake(t.env, t.onStatus);
    stop();
    await flush();

    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(t.statuses).toEqual(['off']);
  });
});
