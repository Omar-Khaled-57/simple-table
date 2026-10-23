import { describe, expect, it } from 'vitest';
import { generateId } from './tdaim';

describe('generateId', () => {
  it('returns unique, non-empty identifiers', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
    expect([...ids].every(id => id.length > 0)).toBe(true);
  });

  it('uses UUIDs when available', () => {
    expect(generateId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
