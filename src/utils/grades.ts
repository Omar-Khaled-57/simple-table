export type GradeTier = '' | 'tier-a' | 'tier-b' | 'tier-c' | 'tier-d';

export function getGradeTier(value: string): GradeTier {
  if (value === '#') return 'tier-d';
  const grade = Number.parseFloat(value);
  if (!Number.isFinite(grade)) return '';
  if (grade >= 18) return 'tier-a';
  if (grade >= 14) return 'tier-b';
  if (grade >= 10) return 'tier-c';
  return 'tier-d';
}

export function normalizeGrade(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '.') return '';
  if (trimmed === '#') return '#';
  const grade = Number.parseFloat(trimmed);
  if (!Number.isFinite(grade)) return trimmed;
  return grade === 0 ? '#' : String(grade);
}

export function sanitizeGrade(value: string): string {
  if (value.includes('#')) return '0';
  const digitsOnly = value.replace(/[^0-9.]/g, '');
  const dot = digitsOnly.indexOf('.');
  if (dot === -1) return digitsOnly;
  return digitsOnly.slice(0, dot + 1) + digitsOnly.slice(dot + 1).replace(/\./g, '');
}
