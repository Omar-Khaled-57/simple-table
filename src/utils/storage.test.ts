import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStoredItem, removeStoredItem, setStoredItem } from './storage';

const makeStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
    map,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('storage helpers', () => {
  it('reads, writes and removes values', () => {
    const localStorage = makeStorage();
    vi.stubGlobal('window', { localStorage });
    expect(getStoredItem('missing')).toBeNull();
    expect(setStoredItem('key', 'value')).toBe(true);
    expect(getStoredItem('key')).toBe('value');
    expect(removeStoredItem('key')).toBe(true);
    expect(getStoredItem('key')).toBeNull();
  });

  it('returns safe fallbacks when storage throws', () => {
    const localStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    vi.stubGlobal('window', { localStorage });
    expect(getStoredItem('key')).toBeNull();
    expect(setStoredItem('key', 'value')).toBe(false);
    expect(removeStoredItem('key')).toBe(false);
  });

  it('returns safe fallbacks when window is unavailable', () => {
    vi.stubGlobal('window', undefined);
    expect(getStoredItem('key')).toBeNull();
    expect(setStoredItem('key', 'value')).toBe(false);
    expect(removeStoredItem('key')).toBe(false);
  });
});
