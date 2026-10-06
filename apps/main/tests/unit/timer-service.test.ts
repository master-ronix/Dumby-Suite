import { test, expect, vi } from 'vitest';
import { TimerService } from '../../src/shared/utils/timer-service.js';

test('setTimeout runs the callback and drops the handle', () => {
  vi.useFakeTimers();
  try {
    const svc = new TimerService();
    const fn = vi.fn();
    svc.setTimeout(fn, 10);
    expect(svc.activeCount()).toBe(1);
    vi.advanceTimersByTime(10);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(svc.activeCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

test('setInterval fires repeatedly and clearAll cancels every timer', () => {
  vi.useFakeTimers();
  try {
    const svc = new TimerService();
    const fn = vi.fn();
    svc.setInterval(fn, 5);
    svc.setTimeout(() => {}, 1000);
    expect(svc.activeCount()).toBe(2);
    vi.advanceTimersByTime(10);
    expect(fn).toHaveBeenCalledTimes(2);
    svc.clearAll();
    expect(svc.activeCount()).toBe(0);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});

test('clear removes a single timer', () => {
  vi.useFakeTimers();
  try {
    const svc = new TimerService();
    const fn = vi.fn();
    const handle = svc.setTimeout(fn, 20);
    svc.clear(handle);
    expect(svc.activeCount()).toBe(0);
    vi.advanceTimersByTime(30);
    expect(fn).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
