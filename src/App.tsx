import { useCallback, useState, useEffect, useRef } from 'react';
import type { TableData } from './types';
import { createDefaultTable, getTableStats, normalizeTables } from './utils/tables';
import { useTdaim } from './hooks/useTdaim';
import { getStoredItem, removeStoredItem, setStoredItem } from './utils/storage';
import TableEditor from './components/TableEditor';
import PrintModal from './components/PrintModal';
import PrintTable from './components/PrintTable';
import Kbd from './components/Kbd';
import { Plus, X, Sun, Moon, Download, Trash2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let earlyInstallPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    earlyInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('simple-table-install-prompt'));
  });
}

export default function App() {
  const { theme, toggleTheme } = useTdaim();
  const [showShortcutHint, setShowShortcutHint] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(earlyInstallPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };
    checkInstalled();
    const syncPrompt = () => setDeferredPrompt(earlyInstallPrompt);
    const installedHandler = () => {
      earlyInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };
    syncPrompt();
    window.addEventListener('simple-table-install-prompt', syncPrompt);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('simple-table-install-prompt', syncPrompt);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const check = () => setShowShortcutHint(mq.matches);
    check();
    mq.addEventListener?.('change', check);
    const onKey = () => {
      setShowShortcutHint(true);
      window.removeEventListener('keydown', onKey);
    };
    window.addEventListener('keydown', onKey, { once: true });
    return () => {
      mq.removeEventListener?.('change', check);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  const [tables, setTables] = useState<TableData[]>(() => {
    const saved = getStoredItem('exam-tables');
    if (saved) {
      try {
        return normalizeTables(JSON.parse(saved));
      } catch {
        return [createDefaultTable()];
      }
    }
    return [createDefaultTable()];
  });
  
  const [activeTableId, setActiveTableId] = useState<string>(() => tables[0]?.id || '');
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saving');
  const [tableStyle, setTableStyle] = useState<'classic' | 'soft' | 'compact'>(() => {
    const savedStyle = getStoredItem('exam-table-style');
    return savedStyle === 'soft' || savedStyle === 'compact' ? savedStyle : 'classic';
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printJob, setPrintJob] = useState<{ tableIds: string[] } | null>(null);
  const [tableTitleInput, setTableTitleInput] = useState(() => tables.find(t => t.id === activeTableId)?.name || '');

  const activeTable = tables.find(t => t.id === activeTableId);
  const latestTables = useRef(tables);
  const pendingSave = useRef(false);

  const persistTables = useCallback((nextTables: TableData[]) => {
    let payload: string;
    try {
      payload = JSON.stringify(nextTables);
    } catch {
      setSaveStatus('error');
      return;
    }
    const saved = setStoredItem('exam-tables', payload);
    pendingSave.current = !saved;
    setSaveStatus(saved ? 'saved' : 'error');
  }, []);

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
    latestTables.current = tables;
    pendingSave.current = true;
    const timer = window.setTimeout(() => persistTables(tables), 400);
    return () => window.clearTimeout(timer);
  }, [tables, persistTables]);

  useEffect(() => {
    const flush = () => {
      if (pendingSave.current) persistTables(latestTables.current);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [persistTables]);

  useEffect(() => {
    setStoredItem('exam-table-style', tableStyle);
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
    const printTimer = window.setTimeout(() => window.print(), 150);
    const resetTimer = window.setTimeout(finishPrint, 60_000);
    return () => {
      window.clearTimeout(printTimer);
      window.clearTimeout(resetTimer);
      window.removeEventListener('afterprint', finishPrint);
      document.title = originalTitle;
    };
  }, [printJob, tables]);

  const handleInstall = async () => {
    if (!deferredPrompt || isInstalled) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    earlyInstallPrompt = null;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') setIsInstalled(true);
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(tables, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simple-table-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateTables = useCallback((updater: (current: TableData[]) => TableData[]) => {
    setSaveStatus('saving');
    setTables(updater);
  }, []);

  const updateActiveTable = (updatedTable: TableData) => {
    updateTables(prev => prev.map(t => t.id === activeTableId ? updatedTable : t));
  };

  const renameActiveTable = (name: string) => {
    if (!activeTable) return;
    const updated = { ...activeTable, name };
    updateActiveTable(updated);
    setTableTitleInput(name);
  };

  const getNextTabName = (existing: TableData[]) => {
    const base = 'جدول جديد';
    const used = new Set(existing.map(t => t.name.trim()));
    if (!used.has(base)) return base;
    let index = 2;
    while (used.has(`${base} ${index}`)) index += 1;
    return `${base} ${index}`;
  };

  const addTab = () => {
    const newTable = createDefaultTable();
    newTable.name = getNextTabName(tables);
    updateTables(prev => [...prev, newTable]);
    setActiveTableId(newTable.id);
    setTableTitleInput(newTable.name);
  };

  const closeTab = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tables.length <= 1) return;
    const target = tables.find(t => t.id === tableId);
    const name = target?.name || 'هذا الجدول';
    const confirmed = window.confirm(`هل تريد إغلاق "${name}"؟`);
    if (!confirmed) return;

    const newTables = tables.filter(t => t.id !== tableId);
    updateTables(() => newTables);

    if (activeTableId === tableId) {
      setActiveTableId(newTables[0].id);
      setTableTitleInput(newTables[0].name);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const clearAllData = () => {
    const confirmed = window.confirm('سيتم حذف جميع الجداول المحفوظة على هذا الجهاز نهائياً. لا يمكن التراجع. هل أنت متأكد؟');
    if (!confirmed) return;
    removeStoredItem('exam-tables');
    const fresh = createDefaultTable();
    updateTables(() => [fresh]);
    setActiveTableId(fresh.id);
    setTableTitleInput(fresh.name);
    setShowPrintModal(false);
    setPrintJob(null);
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
              className="report-title flex-1 min-w-0 w-full sm:w-auto resize-none overflow-hidden text-lg md:text-xl font-bold bg-transparent border-none outline-hidden border-b-2 border-white/40 focus:border-white/80 pb-2 text-right leading-snug"
              placeholder="عنوان الجدول"
              aria-label="عنوان التقرير"
            />
            <div className="stats-grid grid grid-cols-2 sm:flex sm:flex-wrap gap-2 shrink-0 w-full sm:w-auto">
              <div className="bg-white/15 dark:bg-[#1e3a8a]/65 border border-white/30 dark:border-white/40 rounded-lg px-2 py-1 md:px-3 md:py-1.5 min-w-0 sm:min-w-[76px] md:min-w-[84px] text-center">
                <span className="block text-[10px] md:text-[11px] opacity-90 dark:opacity-100 font-semibold truncate">عدد الطلاب</span>
                <span key={stats.count} className="stat-value block text-base md:text-lg font-bold">{stats.count}</span>
              </div>
              <div className="bg-white/15 dark:bg-[#1e3a8a]/65 border border-white/30 dark:border-white/40 rounded-lg px-2 py-1 md:px-3 md:py-1.5 min-w-0 sm:min-w-[76px] md:min-w-[84px] text-center">
                <span className="block text-[10px] md:text-[11px] opacity-90 dark:opacity-100 font-semibold truncate">المعدل</span>
                <span key={stats.avg} className="stat-value block text-base md:text-lg font-bold">{stats.avg}</span>
              </div>
              <div className="bg-white/15 dark:bg-[#1e3a8a]/65 border border-white/30 dark:border-white/40 rounded-lg px-2 py-1 md:px-3 md:py-1.5 min-w-0 sm:min-w-[76px] md:min-w-[84px] text-center">
                <span className="block text-[10px] md:text-[11px] opacity-90 dark:opacity-100 font-semibold truncate">الأغلب</span>
                <span key={`${stats.mode}-${stats.modeCount}`} className="stat-value block text-base md:text-lg font-bold"><span className="text-[10px] md:text-[11px] mr-1">({stats.modeCount})</span>{stats.mode}</span>
              </div>
              <div className="bg-white/15 dark:bg-[#1e3a8a]/65 border border-white/30 dark:border-white/40 rounded-lg px-2 py-1 md:px-3 md:py-1.5 min-w-0 sm:min-w-[76px] md:min-w-[84px] text-center">
                <span className="block text-[10px] md:text-[11px] opacity-90 dark:opacity-100 font-semibold truncate">أعلى درجة</span>
                <span key={stats.max} className="stat-value block text-base md:text-lg font-bold">{stats.max}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span role="status" aria-live="polite" className="flex items-center gap-2">
                <span className={`save-dot w-2 h-2 rounded-full ${saveStatus === 'error' ? 'bg-red-500' : saveStatus === 'saving' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                  <span>
                    {saveStatus === 'error'
                      ? 'فشل الحفظ'
                      : saveStatus === 'saving'
                        ? 'جارٍ الحفظ...'
                        : 'محفوظ تلقائياً على هذا الجهاز'}
                  </span>
                  {showShortcutHint && (
                    <span dir="ltr" className="inline-flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 sm:text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Kbd>Shift</Kbd>
                        <span aria-hidden="true">+</span>
                        <Kbd>Numpad +</Kbd>
                        <span>إضافة صف</span>
                      </span>
                      <span aria-hidden="true">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Kbd>Shift</Kbd>
                        <span aria-hidden="true">+</span>
                        <Kbd>Numpad −</Kbd>
                        <span>حذف آخر صف</span>
                      </span>
                    </span>
                  )}
                </span>
              </span>
              {saveStatus === 'error' && (
                <button type="button" onClick={downloadBackup} className="toolbar-button !py-1 !px-2 text-xs">
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  تنزيل نسخة احتياطية
                </button>
              )}
            </div>
            <div className="toolbar-actions flex flex-wrap items-center gap-2">
              {deferredPrompt && !isInstalled && (
                <button
                  onClick={handleInstall}
                  className="toolbar-button"
                  aria-label="تثبيت التطبيق على هذا الجهاز"
                  title="تثبيت التطبيق على هذا الجهاز"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  تثبيت التطبيق
                </button>
              )}
              <button onClick={toggleTheme} className="toolbar-button" aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
              </button>
              <button onClick={clearAllData} className="toolbar-button toolbar-button-danger" aria-label="حذف البيانات">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                حذف البيانات
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-3 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="tabs-scroll flex gap-1.5 border-b border-slate-300 dark:border-gray-600 overflow-x-auto md:flex-wrap md:overflow-visible pb-px">
              {tables.map(table => (
                <div
                  key={table.id}
                  className={`flex items-center rounded-t-md transition-colors shrink-0 ${
                    activeTableId === table.id
                      ? 'bg-white dark:bg-gray-800 text-[#2563eb] dark:text-blue-400 border-t-2 border-[#2563eb]'
                      : 'bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTableId(table.id);
                      setTableTitleInput(table.name);
                    }}
                    aria-current={activeTableId === table.id ? 'page' : undefined}
                    className="px-3 py-1.5 text-sm font-semibold rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="block truncate max-w-[120px] md:max-w-[160px]">{table.name}</span>
                  </button>
                  {tables.length > 1 && (
                    <button
                      type="button"
                      aria-label={`إغلاق ${table.name}`}
                      onClick={(e) => closeTab(table.id, e)}
                      className="me-1.5 p-0.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addTab}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white rounded-t-md text-sm font-semibold flex items-center gap-1 transition-colors shrink-0"
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
