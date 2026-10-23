import type { TableCell, TableColumn, TableData, TableRow } from '../types';
import { generateId } from './tdaim';

const LEGACY_SEED_HASH = 2277752915;
const LEGACY_SEED_ROW_COUNT = 23;

const COLUMN_TYPES = new Set(['text', 'number', 'grade', 'code']);
const CELL_TYPES = new Set(['text', 'number', 'grade', 'note']);

export const createDefaultTable = (): TableData => {
  const columns: TableColumn[] = [
    { id: generateId(), name: 'الكود', type: 'code', width: 140 },
    { id: generateId(), name: 'الاسم', width: 550 },
    { id: generateId(), name: 'الدرجة / 25', type: 'grade', width: 240 },
  ];

  return {
    id: generateId(),
    name: 'كشف نتيجة الامتحان الشامل الأول',
    columns,
    rows: [],
    signature: 'عمر',
  };
};

const hashSeedRows = (entries: string[]) => {
  let hash = 0x811c9dc5;
  for (const entry of entries) {
    for (let index = 0; index < entry.length; index++) {
      hash ^= entry.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    hash ^= 0x1f;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

const isLegacySeedTable = (table: TableData) => {
  if (table.columns.length !== 3) return false;
  const entries = table.rows
    .map(row => [
      row.cells[0]?.value.trim() ?? '',
      row.cells[1]?.value.trim() ?? '',
      row.cells[2]?.value.trim() ?? '',
    ])
    .filter(([code]) => code !== '')
    .map(([code, name, grade]) => `${code}|${name}|${grade}`);
  if (entries.length !== LEGACY_SEED_ROW_COUNT) return false;
  return hashSeedRows(entries) === LEGACY_SEED_HASH;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const asWidth = (value: unknown): number | undefined => {
  const width = typeof value === 'number' ? value : Number.parseFloat(asText(value));
  if (!Number.isFinite(width)) return undefined;
  return Math.min(800, Math.max(60, Math.round(width)));
};

const inferColumnType = (rawType: unknown, name: string): TableColumn['type'] => {
  if (typeof rawType === 'string' && COLUMN_TYPES.has(rawType)) {
    return rawType as TableColumn['type'];
  }
  if (name.includes('درجة')) return 'grade';
  if (name.includes('كود')) return 'code';
  return undefined;
};

const normalizeColumns = (rawColumns: unknown, rowCellCounts: number[]): TableColumn[] => {
  const columns: TableColumn[] = [];
  if (Array.isArray(rawColumns)) {
    rawColumns.forEach((rawColumn, index) => {
      const column = asRecord(rawColumn);
      if (!column) return;
      const name = asText(column.name).trim() || `عمود ${index + 1}`;
      const width = asWidth(column.width);
      const type = inferColumnType(column.type, name);
      columns.push({
        id: asText(column.id) || generateId(),
        name,
        ...(width === undefined ? {} : { width }),
        ...(type === undefined ? {} : { type }),
      });
    });
  }

  if (columns.length === 0) {
    return createDefaultTable().columns;
  }

  const widestRow = rowCellCounts.reduce((max, count) => Math.max(max, count), columns.length);
  for (let index = columns.length; index < widestRow; index++) {
    columns.push({ id: generateId(), name: `عمود ${index + 1}`, width: 150 });
  }
  return columns;
};

const normalizeCell = (rawCell: unknown, column: TableColumn, cellTypeHint: unknown): TableCell => {
  const cell = asRecord(rawCell);
  const image = asText(cell?.image);
  const tags = Array.isArray(cell?.tags)
    ? cell.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 30)
    : undefined;
  const rawType = typeof cellTypeHint === 'string' && CELL_TYPES.has(cellTypeHint) ? cellTypeHint : cell?.type;
  const type = typeof rawType === 'string' && CELL_TYPES.has(rawType)
    ? (rawType as TableCell['type'])
    : column.type === 'grade'
      ? 'grade'
      : undefined;

  return {
    id: asText(cell?.id) || generateId(),
    value: asText(cell?.value),
    ...(type === undefined ? {} : { type }),
    ...(image.startsWith('data:image/') ? { image } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
  };
};

const normalizeTable = (rawTable: unknown, fallbackName: string): TableData | null => {
  const table = asRecord(rawTable);
  if (!table) return null;

  const rawRows = Array.isArray(table.rows) ? table.rows : [];
  const normalizedRawRows = rawRows.map(row => asRecord(row));
  const rowCellCounts = normalizedRawRows.map(row => {
    const cells = row?.cells;
    return Array.isArray(cells) ? cells.length : 0;
  });
  const hasUsableColumns = Array.isArray(table.columns) && table.columns.some(rawColumn => {
    const column = asRecord(rawColumn);
    if (!column) return false;
    return Boolean(asText(column.name).trim() || (typeof column.type === 'string' && COLUMN_TYPES.has(column.type)));
  });
  if (!hasUsableColumns && !rowCellCounts.some(count => count > 0)) return null;
  const columns = normalizeColumns(table.columns, rowCellCounts);

  const rows: TableRow[] = [];
  normalizedRawRows.forEach(rawRow => {
    if (!rawRow) return;
    const rawCells = Array.isArray(rawRow.cells) ? rawRow.cells : [];
    const cells = columns.map((column, cellIndex) =>
      normalizeCell(rawCells[cellIndex], column, asRecord(rawCells[cellIndex])?.type)
    );
    rows.push({ id: asText(rawRow.id) || generateId(), cells });
  });

  const normalized: TableData = {
    id: asText(table.id) || generateId(),
    name: asText(table.name).trim() || fallbackName,
    columns,
    rows,
    signature: asText(table.signature) || undefined,
  };

  if (isLegacySeedTable(normalized)) normalized.rows = [];
  return normalized;
};

export function normalizeTables(input: unknown): TableData[] {
  if (!Array.isArray(input)) return [createDefaultTable()];
  const tables: TableData[] = [];
  const usedIds = new Set<string>();

  input.forEach((rawTable, index) => {
    const table = normalizeTable(rawTable, index === 0 ? 'كشف نتيجة الامتحان الشامل الأول' : `جدول جديد ${index + 1}`);
    if (!table) return;
    if (usedIds.has(table.id)) table.id = generateId();
    usedIds.add(table.id);
    tables.push(table);
  });

  return tables.length > 0 ? tables : [createDefaultTable()];
}

export function getGradeColumnIndex(table: TableData): number {
  const byType = table.columns.findIndex(column => column.type === 'grade');
  if (byType >= 0) return byType;
  const byName = table.columns.findIndex(column => column.name.includes('درجة'));
  if (byName >= 0) return byName;
  return table.rows[0]?.cells.findIndex(cell => cell.type === 'grade') ?? -1;
}

export function getTableStats(table: TableData) {
  const gradeColumnIndex = getGradeColumnIndex(table);
  const grades = table.rows
    .map(row => {
      if (gradeColumnIndex < 0) return NaN;
      const value = row.cells[gradeColumnIndex]?.value.trim() ?? '';
      if (value === '') return NaN;
      if (value === '#') return 0;
      return Number.parseFloat(value);
    })
    .filter(Number.isFinite);

  const counts = new Map<number, number>();
  grades.forEach(grade => counts.set(grade, (counts.get(grade) || 0) + 1));
  let mode: number | null = null;
  let modeCount = 0;
  counts.forEach((count, grade) => {
    if (count > modeCount || (count === modeCount && (mode === null || grade > mode))) {
      mode = grade;
      modeCount = count;
    }
  });

  return {
    count: table.rows.length,
    avg: grades.length ? (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1) : '0.0',
    max: grades.length ? Math.max(...grades) : 0,
    mode: mode ?? 0,
    modeCount,
  };
}
