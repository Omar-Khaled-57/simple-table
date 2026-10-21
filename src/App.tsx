import { useState, useEffect, useRef } from 'react';
import type { TableData, TableColumn, TableRow } from './types';
import { generateId } from './utils/tdaim';
import { useTdaim } from './hooks/useTdaim';
import TableEditor from './components/TableEditor';
import PrintModal from './components/PrintModal';
import PrintTable from './components/PrintTable';
import { Plus, X, Sun, Moon } from 'lucide-react';

const createDefaultTable = (): TableData => {
  const columns: TableColumn[] = [
    { id: generateId(), name: 'الكود', type: 'code', width: 140 },
    { id: generateId(), name: 'الاسم', width: 550 },
    { id: generateId(), name: 'الدرجة / 25', type: 'grade', width: 240 }
  ];
  
  const rows: TableRow[] = [];

  return {
    id: generateId(),
    name: 'كشف نتيجة الامتحان الشامل الأول',
    columns,
    rows,
    signature: 'عمر'
  };
};

const LEGACY_SEED_HASH = 2277752915;
const LEGACY_SEED_ROW_COUNT = 23;

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

const stripLegacySeed = (tables: TableData[]) =>
  tables.map(table => (isLegacySeedTable(table) ? { ...table, rows: [] } : table));

const getTableStats = (table: TableData) => {
  const grades = table.rows
    .map(row => {
      const gradeCell = row.cells.find(cell => cell.type === 'grade');
      if (!gradeCell) return NaN;
      const value = gradeCell.value.trim();
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
};

export default function App() {
  const { theme, toggleTheme } = useTdaim();
  const [tables, setTables] = useState<TableData[]>(() => {
    const saved = localStorage.getItem('exam-tables');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TableData[];
        return Array.isArray(parsed) ? stripLegacySeed(parsed) : [createDefaultTable()];
      } catch {
        return [createDefaultTable()];
      }
    }
    return [createDefaultTable()];
  });
  
  const [activeTableId, setActiveTableId] = useState<string>(() => tables[0]?.id || '');
  const [editMode, setEditMode] = useState(false);
  const [tableStyle, setTableStyle] = useState<'classic' | 'soft' | 'compact'>(() =>
    (localStorage.getItem('exam-table-style') as 'classic' | 'soft' | 'compact' | null) || 'classic'
  );
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printJob, setPrintJob] = useState<{ tableIds: string[] } | null>(null);
  const [tableTitleInput, setTableTitleInput] = useState(() => tables.find(t => t.id === activeTableId)?.name || '');

  const activeTable = tables.find(t => t.id === activeTableId);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [tableTitleInput, activeTableId]);

  useEffect(() => {
    if (activeTable) {
      setTableTitleInput(activeTable.name);
    }
  }, [activeTableId, activeTable]);

  useEffect(() => {
    localStorage.setItem('exam-tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('exam-table-style', tableStyle);
  }, [tableStyle]);

  useEffect(() => {
    if (!printJob) return;
    const originalTitle = document.title;
    const finishPrint = () => {
      document.title = originalTitle;
      setPrintJob(null);
    };
    const printNames = tables
      .filter(table => printJob.tableIds.includes(table.id))
      .map(table => table.name)
      .join(' - ');
    document.title = printNames || originalTitle;
    window.addEventListener('afterprint', finishPrint, { once: true });
    const timer = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finishPrint);
      document.title = originalTitle;
    };
  }, [printJob, tables]);

  const updateActiveTable = (updatedTable: TableData) => {
    setTables(prev => prev.map(t => t.id === activeTableId ? updatedTable : t));
  };

  const renameActiveTable = (name: string) => {
    if (!activeTable) return;
    const updated = { ...activeTable, name };
    updateActiveTable(updated);
    setTableTitleInput(name);
  };

  const addTab = () => {
    const newTable = createDefaultTable();
    newTable.name = `جدول جديد ${tables.length + 1}`;
    setTables(prev => [...prev, newTable]);
    setActiveTableId(newTable.id);
  };

  const closeTab = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tables.length <= 1) return;
    
    const newTables = tables.filter(t => t.id !== tableId);
    setTables(newTables);
    
    if (activeTableId === tableId) {
      setActiveTableId(newTables[0].id);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const getStats = () => {
    return activeTable ? getTableStats(activeTable) : { count: 0, avg: '0.0', max: 0, mode: 0, modeCount: 0 };
  };

  const stats = getStats();

  return (
    <main className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 font-cairo transition-colors" dir="rtl">
      <h1 className="sr-only">كشف نتيجة الامتحان | Simple Table</h1>
      <div className="w-full max-w-[1200px] mx-auto px-4 py-6 md:py-10">
        <div className="app-shell bg-white dark:bg-gray-900 rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.28)] p-4 md:p-7 relative border border-slate-200/80 dark:border-gray-800">
          {/* Title Band - matching original */}
          <div className="report-band text-white rounded-xl p-4 md:p-5 mb-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_10px_26px_-10px_rgba(37,99,235,0.65)]">
            <textarea
              ref={titleRef}
              value={tableTitleInput}
              rows={1}
              onChange={(e) => { setTableTitleInput(e.target.value); autoGrow(e.target); }}
              onBlur={() => renameActiveTable(tableTitleInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="report-title flex-1 min-w-0 w-full sm:w-auto resize-none overflow-hidden text-lg md:text-xl font-bold bg-transparent border-none outline-none border-b-2 border-white/40 focus:border-white/80 pb-2 text-right leading-snug"
              placeholder="عنوان الجدول"
              aria-label="عنوان التقرير"
            />
            <div className="stats-grid grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-shrink-0 w-full sm:w-auto">
              <div className="bg-white/15 border border-white/30 rounded-lg px-2 py-1 md:px-3 md:py-1.5 min-w-0 sm:min-w-[76px] md:min-w-[84px] text-center">
                <span className="block text-[10px] md:text-[11px] opacity-90 font-semibold truncate">عدد الطلاب</span>
                <span key={stats.count} className="stat-value block text-base md:text-lg font-bold">{stats.count}</span>
              </div>
              <div className="bg-white/15 border border-white/30 rounded-lg px-2 py-1 md:px-3 md:py-1.5 min-w-0 sm:min-w-[76px] md:min-w-[84px] text-center">
                <span className="block text-[10px] md:text-[11px] opacity-90 font-semibold truncate">المعدل</span>
                <span key={stats.avg} className="stat-value block text-base md:text-lg font-bold">{stats.avg}</span>
              </div>
              <div className="bg-white/15 border border-white/30 rounded-lg px-2 py-1 md:px-3 md:py-1.5 min-w-0 sm:min-w-[76px] md:min-w-[84px] text-center">
                <span className="block text-[10px] md:text-[11px] opacity-90 font-semibold truncate">الأغلب</span>
                <span key={`${stats.mode}-${stats.modeCount}`} className="stat-value block text-base md:text-lg font-bold"><span className="text-[10px] md:text-[11px] mr-1">({stats.modeCount})</span>{stats.mode}</span>
              </div>
              <div className="bg-white/15 border border-white/30 rounded-lg px-2 py-1 md:px-3 md:py-1.5 min-w-0 sm:min-w-[76px] md:min-w-[84px] text-center">
                <span className="block text-[10px] md:text-[11px] opacity-90 font-semibold truncate">أعلى درجة</span>
                <span key={stats.max} className="stat-value block text-base md:text-lg font-bold">{stats.max}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="save-dot w-2 h-2 rounded-full bg-emerald-500" />
              محفوظ تلقائياً على هذا الجهاز
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={toggleTheme} className="toolbar-button" aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-3 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="tabs-scroll flex gap-1.5 border-b border-slate-300 dark:border-gray-600 overflow-x-auto md:flex-wrap md:overflow-visible pb-px">
              {tables.map(table => (
                <div
                  key={table.id}
                  onClick={() => setActiveTableId(table.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer text-sm font-semibold transition-colors shrink-0 ${
                    activeTableId === table.id
                      ? 'bg-white dark:bg-gray-800 text-[#2563eb] dark:text-blue-400 border-t-2 border-[#2563eb]'
                      : 'bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="truncate max-w-[120px] md:max-w-[160px]">{table.name}</span>
                  {tables.length > 1 && (
                    <button
                      onClick={(e) => closeTab(table.id, e)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addTab}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-t-md text-sm font-semibold flex items-center gap-1 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                إضافة تبويب
              </button>
            </div>
          </div>

          {/* Table */}
          {activeTable && (
            <div className="print-content">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 print-only-title hidden text-center">
                {activeTable.name}
              </h2>
              <TableEditor
                table={activeTable}
                editMode={editMode}
                tableStyle={tableStyle}
                onUpdate={updateActiveTable}
                onToggleEditMode={toggleEditMode}
                onPrint={() => setShowPrintModal(true)}
                onTableStyleChange={setTableStyle}
              />
            </div>
          )}
        </div>
      </div>

      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        tables={tables}
        activeTableId={activeTableId}
        onPrint={(tableIds) => setPrintJob({ tableIds })}
      />
      {printJob && (
        <div className="print-batch hidden">
          {tables.filter(table => printJob.tableIds.includes(table.id)).map((table, index) => {
            const printStats = getTableStats(table);
            return (
              <section className="print-sheet" key={table.id}>
                <header className="print-title-band">
                  <div className="print-title-copy">
                    <h1>{table.name}</h1>
                  </div>
                  <div className="print-stat-list">
                    <div className="print-stat"><span>عدد الطلاب</span><strong>{printStats.count}</strong></div>
                    <div className="print-stat"><span>المعدل</span><strong>{printStats.avg}</strong></div>
                    <div className="print-stat"><span>الأغلب</span><strong><small>({printStats.modeCount})</small>{printStats.mode}</strong></div>
                    <div className="print-stat"><span>أعلى درجة</span><strong>{printStats.max}</strong></div>
                  </div>
                </header>
                <PrintTable table={table} tableStyle={tableStyle} />
                {index < printJob.tableIds.length - 1 && <div className="print-page-break" />}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
