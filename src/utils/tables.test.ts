import { describe, expect, it } from 'vitest';
import type { TableData } from '../types';
import { createDefaultTable, getGradeColumnIndex, getTableStats, normalizeTables } from './tables';

const makeTable = (overrides: Partial<TableData> = {}): TableData => ({
  ...createDefaultTable(),
  ...overrides,
});

describe('createDefaultTable', () => {
  it('starts with the expected Arabic columns and no rows', () => {
    const table = createDefaultTable();
    expect(table.columns.map(column => column.name)).toEqual(['الكود', 'الاسم', 'الدرجة / 25']);
    expect(table.columns.map(column => column.type)).toEqual(['code', undefined, 'grade']);
    expect(table.rows).toEqual([]);
    expect(table.signature).toBe('عمر');
    expect(table.id).toBeTruthy();
    expect(new Set(table.columns.map(column => column.id)).size).toBe(3);
  });
});

describe('normalizeTables', () => {
  it('falls back to a fresh table for unusable input', () => {
    for (const input of [null, undefined, 'nope', 42, {}, []]) {
      const tables = normalizeTables(input);
      expect(tables).toHaveLength(1);
      expect(tables[0].columns).toHaveLength(3);
      expect(tables[0].rows).toEqual([]);
    }
  });

  it('salvages partial tables instead of discarding them', () => {
    const tables = normalizeTables([{
      id: 't1',
      name: '  ',
      columns: [
        { id: 'c1', name: 'الاسم', width: 9999 },
        { id: 'c2', name: 'الدرجة', width: 'abc' },
      ],
      rows: [
        { id: 'r1', cells: [{ value: 'سارة' }, { value: '19.5' }] },
        { id: 'r2', cells: [] },
      ],
    }]);

    expect(tables).toHaveLength(1);
    const table = tables[0];
    expect(table.name).toBe('كشف نتيجة الامتحان الشامل الأول');
    expect(table.columns[0].width).toBe(800);
    expect(table.columns[1].width).toBeUndefined();
    expect(table.columns[1].type).toBe('grade');
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].cells[0].value).toBe('سارة');
    expect(table.rows[0].cells[1].value).toBe('19.5');
    expect(table.rows[1].cells).toHaveLength(2);
    expect(table.rows[1].cells[0].value).toBe('');
  });

  it('adds columns when rows have more cells than the header', () => {
    const tables = normalizeTables([{
      columns: [{ name: 'الاسم' }],
      rows: [{ cells: [{ value: 'أ' }, { value: 'ب' }, { value: 'ج' }] }],
    }]);
    expect(tables[0].columns).toHaveLength(3);
    expect(tables[0].columns[2].name).toBe('عمود 3');
    expect(tables[0].rows[0].cells).toHaveLength(3);
  });

  it('skips malformed tables and de-duplicates ids', () => {
    const tables = normalizeTables([
      { id: 'same', columns: [{ name: 'الاسم' }], rows: [] },
      null,
      [],
      { id: 'same', columns: [{ name: 'الكود' }], rows: [] },
    ]);
    expect(tables).toHaveLength(2);
    expect(tables[0].id).toBe('same');
    expect(tables[1].id).not.toBe('same');
  });

  it('rejects cells with non-data image urls and keeps safe data urls', () => {
    const tables = normalizeTables([{
      columns: [{ name: 'الاسم' }],
      rows: [{ cells: [{ value: 'أ', image: 'https://evil.test/x.png', tags: ['a', 3, 'b'] }] }],
    }]);
    expect(tables[0].rows[0].cells[0].image).toBeUndefined();
    expect(tables[0].rows[0].cells[0].tags).toEqual(['a', 'b']);

    const withImage = normalizeTables([{
      columns: [{ name: 'الاسم' }],
      rows: [{ cells: [{ value: 'أ', image: 'data:image/jpeg;base64,abc' }] }],
    }]);
    expect(withImage[0].rows[0].cells[0].image).toBe('data:image/jpeg;base64,abc');
  });

  it('normalizes cell shapes and types', () => {
    const tables = normalizeTables([{
      columns: [{ name: 'الملاحظات', type: 'grade' }],
      rows: [{ cells: [{ value: 12, type: 'note' }, 'ضائع'] }],
    }]);
    expect(tables[0].rows[0].cells[0].value).toBe('12');
    expect(tables[0].rows[0].cells[0].type).toBe('note');
    expect(tables[0].rows[0].cells[1].value).toBe('');
  });
});

describe('getGradeColumnIndex', () => {
  it('prefers a typed grade column', () => {
    const table = makeTable({
      columns: [
        { id: 'a', name: 'الدرجة / 25' },
        { id: 'b', name: 'x', type: 'grade' },
      ],
      rows: [],
    });
    expect(getGradeColumnIndex(table)).toBe(1);
  });

  it('falls back to a column name containing درجة', () => {
    const table = makeTable({ columns: [{ id: 'a', name: 'الدرجة' }], rows: [] });
    expect(getGradeColumnIndex(table)).toBe(0);
  });

  it('falls back to the first grade cell', () => {
    const table = makeTable({
      columns: [{ id: 'a', name: 'x' }],
      rows: [{ id: 'r', cells: [{ id: 'c', value: '12', type: 'grade' }] }],
    });
    expect(getGradeColumnIndex(table)).toBe(0);
  });

  it('returns -1 when no grade can be found', () => {
    const table = makeTable({ columns: [{ id: 'a', name: 'x' }], rows: [] });
    expect(getGradeColumnIndex(table)).toBe(-1);
  });
});

describe('getTableStats', () => {
  it('counts rows, averages numeric grades, and treats # as zero', () => {
    const table = makeTable({
      columns: [
        { id: 'name', name: 'الاسم' },
        { id: 'grade', name: 'الدرجة', type: 'grade' },
      ],
      rows: [
        { id: '1', cells: [{ id: 'a', value: 'أ' }, { id: 'b', value: '20' }] },
        { id: '2', cells: [{ id: 'c', value: 'ب' }, { id: 'd', value: '#' }] },
        { id: '3', cells: [{ id: 'e', value: 'ج' }, { id: 'f', value: '' }] },
        { id: '4', cells: [{ id: 'g', value: 'د' }, { id: 'h', value: 'نص' }] },
      ],
    });
    const stats = getTableStats(table);
    expect(stats.count).toBe(4);
    expect(stats.avg).toBe('10.0');
    expect(stats.max).toBe(20);
    expect(stats.mode).toBe(20);
    expect(stats.modeCount).toBe(1);
  });

  it('uses the highest grade when all counts tie', () => {
    const table = makeTable({
      columns: [{ id: 'grade', name: 'الدرجة', type: 'grade' }],
      rows: [
        { id: '1', cells: [{ id: 'a', value: '12' }] },
        { id: '2', cells: [{ id: 'b', value: '16' }] },
      ],
    });
    expect(getTableStats(table).mode).toBe(16);
    expect(getTableStats(table).modeCount).toBe(1);
  });

  it('returns zeros for an empty table', () => {
    expect(getTableStats(makeTable({ rows: [] }))).toEqual({
      count: 0,
      avg: '0.0',
      max: 0,
      mode: 0,
      modeCount: 0,
    });
  });
});
