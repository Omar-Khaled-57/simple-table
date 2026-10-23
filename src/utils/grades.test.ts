import { describe, expect, it } from 'vitest';
import { getGradeTier, normalizeGrade, sanitizeGrade } from './grades';

describe('getGradeTier', () => {
  it('returns the correct tier at each boundary', () => {
    expect(getGradeTier('18')).toBe('tier-a');
    expect(getGradeTier('17.9')).toBe('tier-b');
    expect(getGradeTier('14')).toBe('tier-b');
    expect(getGradeTier('13.9')).toBe('tier-c');
    expect(getGradeTier('10')).toBe('tier-c');
    expect(getGradeTier('9.9')).toBe('tier-d');
  });

  it('treats an absent mark as the lowest tier', () => {
    expect(getGradeTier('#')).toBe('tier-d');
  });

  it('returns no tier for empty or invalid values', () => {
    expect(getGradeTier('')).toBe('');
    expect(getGradeTier('   ')).toBe('');
    expect(getGradeTier('abc')).toBe('');
  });
});

describe('normalizeGrade', () => {
  it('stores zero as the absent mark', () => {
    expect(normalizeGrade('0')).toBe('#');
    expect(normalizeGrade('0.0')).toBe('#');
    expect(normalizeGrade('#')).toBe('#');
  });

  it('drops empty values and a lone decimal point', () => {
    expect(normalizeGrade('')).toBe('');
    expect(normalizeGrade('   ')).toBe('');
    expect(normalizeGrade('.')).toBe('');
  });

  it('keeps valid numeric values and trims whitespace', () => {
    expect(normalizeGrade(' 12.5 ')).toBe('12.5');
    expect(normalizeGrade('18')).toBe('18');
  });

  it('keeps unparseable text untouched', () => {
    expect(normalizeGrade('غائب')).toBe('غائب');
  });
});

describe('sanitizeGrade', () => {
  it('turns an absent mark into zero', () => {
    expect(sanitizeGrade('#')).toBe('0');
    expect(sanitizeGrade('1#')).toBe('0');
  });

  it('keeps only the first decimal point', () => {
    expect(sanitizeGrade('1.2.3')).toBe('1.23');
    expect(sanitizeGrade('12..5')).toBe('12.5');
  });

  it('strips invalid characters', () => {
    expect(sanitizeGrade('abc12.5x')).toBe('12.5');
    expect(sanitizeGrade('١٢')).toBe('');
  });
});
