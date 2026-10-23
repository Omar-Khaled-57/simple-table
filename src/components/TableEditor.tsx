import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { TableData, TableRow } from '../types';
import { generateId } from '../utils/tdaim';
import { compressImage } from '../utils/image';
import { getGradeTier, normalizeGrade, sanitizeGrade } from '../utils/grades';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus, X, Minus, Maximize2, ImagePlus, Edit3, Printer, ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronDown, Palette, Check, Loader2, Trash2 } from 'lucide-react';

interface TableEditorProps {
  table: TableData;
  editMode: boolean;
  tableStyle: 'classic' | 'soft' | 'compact';
  onUpdate: (table: TableData) => void;
  onToggleEditMode?: () => void;
  onPrint?: () => void;
  onTableStyleChange?: (style: 'classic' | 'soft' | 'compact') => void;
}

export default function TableEditor({ table, editMode, tableStyle, onUpdate, onToggleEditMode, onPrint, onTableStyleChange }: TableEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ colIndex: number; startX: number; startWidth: number; rtl: boolean } | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'grade'>('grade');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [openMenu, setOpenMenu] = useState<'sort' | 'style' | null>(null);
  const toggleMenu = (menu: 'sort' | 'style') => setOpenMenu(current => (current === menu ? null : menu));
  useEffect(() => {
    if (!openMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !target.closest('.sort-menu, .style-menu, [aria-haspopup="menu"]')) setOpenMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);
  const [imageTarget, setImageTarget] = useState<{ rowId: string; cellId: string } | null>(null);
  const [rowDialogOpen, setRowDialogOpen] = useState(false);
  useEffect(() => () => {
    document.body.classList.remove('is-resizing');
  }, []);

  const [imageError, setImageError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const updateTable = (updates: Partial<TableData>) => {
    onUpdate({ ...table, ...updates });
  };

  const updateCell = (rowId: string, cellId: string, value: string) => {
    const row = table.rows.find(r => r.id === rowId);
    if (!row) return;
    updateTable({
      rows: table.rows.map(r => 
        r.id === rowId 
          ? { ...r, cells: r.cells.map(cell => cell.id === cellId ? { ...cell, value } : cell) }
          : r
      )
    });
  };

  const updateCellImage = (rowId: string, cellId: string, image?: string) => {
    updateTable({
      rows: table.rows.map(row => row.id === rowId
        ? { ...row, cells: row.cells.map(cell => cell.id === cellId ? { ...cell, image } : cell) }
        : row)
    });
  };

  const updateCellTags = (rowId: string, cellId: string, tags: string[]) => {
    updateTable({
      rows: table.rows.map(row => row.id === rowId
        ? { ...row, cells: row.cells.map(cell => cell.id === cellId ? { ...cell, tags } : cell) }
        : row)
    });
  };

  const pickImage = (rowId: string, cellId: string) => {
    setImageTarget({ rowId, cellId });
    imageInputRef.current?.click();
  };

  const handleImageSelection = async (file?: File) => {
    const target = imageTarget;
    if (!file || !target) return;
    setImageError(null);
    setIsProcessingImage(true);
    try {
      const dataUrl = await compressImage(file);
      updateCellImage(target.rowId, target.cellId, dataUrl);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'تعذّر معالجة الصورة. جرّب صورة أخرى.');
    } finally {
      setIsProcessingImage(false);
      setImageTarget(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const addRows = (count: number) => {
    const amount = Math.max(1, Math.floor(count));
    const newRows: TableRow[] = Array.from({ length: amount }, () => ({
      id: generateId(),
      cells: table.columns.map(col => ({
        id: generateId(),
        value: '',
        type: col.type === 'grade' ? 'grade' as const : 'text' as const
      }))
    }));
    updateTable({ rows: [...table.rows, ...newRows] });
  };

  const removeLastRow = () => {
    if (table.rows.length === 0) return;
    updateTable({ rows: table.rows.slice(0, -1) });
  };

  const setTotalRows = (count: number) => {
    const target = Math.max(0, Math.floor(count));
    if (target === table.rows.length) return;
    if (target < table.rows.length) {
      updateTable({ rows: table.rows.slice(0, target) });
      return;
    }
    addRows(target - table.rows.length);
  };

  const addRowsRef = useRef(addRows);
  const removeLastRowRef = useRef(removeLastRow);

  useEffect(() => {
    addRowsRef.current = addRows;
    removeLastRowRef.current = removeLastRow;
  });

  const handleAddRowClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1) return;
    addRowsRef.current(1);
  };

  const handleAddRowDoubleClick = () => {
    removeLastRowRef.current();
    setRowDialogOpen(true);
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!event.shiftKey || (event.code !== 'NumpadAdd' && event.code !== 'NumpadSubtract')) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      if (event.code === 'NumpadAdd') addRowsRef.current(1);
      else removeLastRowRef.current();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const sortRows = (key: 'name' | 'grade') => {
    const gradeColumnIndex = table.columns.findIndex(column => column.type === 'grade');
    const nameColumnIndex = table.columns.findIndex(column => column.name.trim() === 'الاسم');
    const resolvedNameIndex = nameColumnIndex >= 0 ? nameColumnIndex : 1;
    if (key === 'grade' && gradeColumnIndex < 0) return;
    const direction = key === sortKey && sortDirection === 'desc' ? 'asc' : 'desc';
    const sortedRows = table.rows.map((row, index) => {
      const value = (key === 'grade' ? row.cells[gradeColumnIndex] : row.cells[resolvedNameIndex])?.value.trim() || '';
      return { row, index, value, grade: value === '#' ? 0 : Number.parseFloat(value) };
    }).sort((a, b) => {
      const aValid = key === 'grade' ? Number.isFinite(a.grade) : a.value.length > 0;
      const bValid = key === 'grade' ? Number.isFinite(b.grade) : b.value.length > 0;
      if (!aValid && !bValid) return a.index - b.index;
      if (!aValid) return 1;
      if (!bValid) return -1;
      const difference = key === 'grade'
        ? (direction === 'desc' ? b.grade - a.grade : a.grade - b.grade)
        : (direction === 'desc' ? b.value.localeCompare(a.value, 'ar') : a.value.localeCompare(b.value, 'ar'));
      return difference || a.index - b.index;
    }).map(item => item.row);
    updateTable({ rows: sortedRows });
    setSortKey(key);
    setSortDirection(direction);
    setOpenMenu(null);
  };

  const removeRow = (rowId: string) => {
    updateTable({ rows: table.rows.filter(r => r.id !== rowId) });
  };

  const moveRowUp = (rowIndex: number) => {
    if (rowIndex <= 0) return;
    const newRows = [...table.rows];
    [newRows[rowIndex - 1], newRows[rowIndex]] = [newRows[rowIndex], newRows[rowIndex - 1]];
    updateTable({ rows: newRows });
  };

  const moveRowDown = (rowIndex: number) => {
    if (rowIndex >= table.rows.length - 1) return;
    const newRows = [...table.rows];
    [newRows[rowIndex + 1], newRows[rowIndex]] = [newRows[rowIndex], newRows[rowIndex + 1]];
    updateTable({ rows: newRows });
  };

  const addColumn = () => {
    const newCol = { id: generateId(), name: 'عمود جديد', width: 150 };
    const newRows: TableRow[] = table.rows.map(row => ({
      ...row,
      cells: [...row.cells, { id: generateId(), value: '', type: 'text' as const }]
    }));
    updateTable({
      columns: [...table.columns, newCol],
      rows: newRows
    });
  };

  const removeColumn = (colIndex: number) => {
    if (table.columns.length <= 1) return;
    const newCols = table.columns.filter((_, i) => i !== colIndex);
    const newRows: TableRow[] = table.rows.map(row => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== colIndex)
    }));
    updateTable({ columns: newCols, rows: newRows });
  };

  const moveColumnLeft = (colIndex: number) => {
    if (colIndex <= 0) return;
    const newCols = [...table.columns];
    [newCols[colIndex - 1], newCols[colIndex]] = [newCols[colIndex], newCols[colIndex - 1]];
    const newRows: TableRow[] = table.rows.map(row => {
      const newCells = [...row.cells];
      [newCells[colIndex - 1], newCells[colIndex]] = [newCells[colIndex], newCells[colIndex - 1]];
      return { ...row, cells: newCells };
    });
    updateTable({ columns: newCols, rows: newRows });
  };

  const moveColumnRight = (colIndex: number) => {
    if (colIndex >= table.columns.length - 1) return;
    const newCols = [...table.columns];
    [newCols[colIndex + 1], newCols[colIndex]] = [newCols[colIndex], newCols[colIndex + 1]];
    const newRows: TableRow[] = table.rows.map(row => {
      const newCells = [...row.cells];
      [newCells[colIndex + 1], newCells[colIndex]] = [newCells[colIndex], newCells[colIndex + 1]];
      return { ...row, cells: newCells };
    });
    updateTable({ columns: newCols, rows: newRows });
  };

  const renameColumn = (colIndex: number, name: string) => {
    const newCols = table.columns.map((col, i) => i === colIndex ? { ...col, name } : col);
    updateTable({ columns: newCols });
  };

  const resizeColumn = (colIndex: number, delta: number) => {
    const newCols = table.columns.map((col, i) => 
      i === colIndex ? { ...col, width: Math.max(60, (col.width || 100) + delta) } : col
    );
    updateTable({ columns: newCols });
  };

  const startResize = (e: React.PointerEvent, colIndex: number) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget as HTMLElement;
    const th = handle.closest('th');
    const startWidth = table.columns[colIndex].width || th?.offsetWidth || 150;
    const rtl = getComputedStyle(handle).direction === 'rtl';
    resizeRef.current = { colIndex, startX: e.clientX, startWidth, rtl };
    document.body.classList.add('is-resizing');
    handle.setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  };

  const onResizeMove = (e: PointerEvent) => {
    const state = resizeRef.current;
    if (!state) return;
    const delta = state.rtl ? (state.startX - e.clientX) : (e.clientX - state.startX);
    const newWidth = Math.max(50, Math.round(state.startWidth + delta));
    const newCols = table.columns.map((col, i) => i === state.colIndex ? { ...col, width: newWidth } : col);
    onUpdate({ ...table, columns: newCols });
  };

  const stopResize = () => {
    resizeRef.current = null;
    document.body.classList.remove('is-resizing');
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', stopResize);
    window.removeEventListener('pointercancel', stopResize);
  };

  const totalColumnWidth = table.columns.reduce((sum, column) => sum + (column.width || 150), 0);

  const totalTableWidth = 56 + table.columns.reduce((sum, col) => sum + (col.width || 150), 0);

  return (
    <div className="w-full">
      <div className={`table-control-strip mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center p-2.5 rounded-xl border transition-colors ${editMode ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900' : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700'}`}>
          <button
            onClick={handleAddRowClick}
            onDoubleClick={handleAddRowDoubleClick}
            title="انقر مرتين لتحديد عدد الصفوف"
            className="w-full lg:w-auto justify-center px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة صف
          </button>
          <button
            onClick={removeLastRow}
            disabled={table.rows.length === 0}
            className="delete-last-row-button w-full lg:w-auto justify-center px-3.5 py-2 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 disabled:cursor-not-allowed shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            حذف آخر صف
          </button>
          {onToggleEditMode && (
            <button
              onClick={onToggleEditMode}
              className={`w-full lg:w-auto justify-center px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors ${editMode ? 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800' : 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-800'}`}
              aria-pressed={editMode}
            >
              <Edit3 className="w-4 h-4" /> {editMode ? 'إنهاء التعديل' : 'وضع التعديل'}
            </button>
          )}
          <button
            onClick={addColumn}
            disabled={!editMode}
            className={`edit-reveal${editMode ? '' : ' edit-reveal-hidden'} w-full lg:w-auto justify-center px-3.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-700 shadow-xs`}
          >
            <Plus className="w-4 h-4" />
            إضافة عمود
          </button>
          <div className="relative w-full lg:w-auto">
            <button
              onClick={() => toggleMenu('sort')}
              onDoubleClick={() => sortRows(sortKey)}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'sort'}
              className="w-full lg:w-auto justify-center px-3.5 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
              title="خيارات الترتيب"
            >
              {sortDirection === 'asc' ? <ArrowUpWideNarrow className="w-4 h-4" /> : <ArrowDownWideNarrow className="w-4 h-4" />}
              {sortDirection ? `ترتيب ${sortKey === 'grade' ? 'الدرجة' : 'الاسم'} ${sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}` : 'ترتيب حسب'}
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>
            <div className={`dropdown-menu sort-menu absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800${openMenu === 'sort' ? ' is-open' : ''}`} role="menu" aria-label="ترتيب الجدول">
              <button type="button" role="menuitemradio" aria-checked={sortKey === 'name'} onClick={() => sortRows('name')} className="sort-menu-item" dir="rtl">
                <span>الاسم</span>
                <span className="sort-menu-direction">{sortKey === 'name' && sortDirection ? (sortDirection === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓') : 'تنازلي أولاً'}</span>
              </button>
              <button type="button" role="menuitemradio" aria-checked={sortKey === 'grade'} disabled={!table.columns.some(column => column.type === 'grade')} onClick={() => sortRows('grade')} className="sort-menu-item" dir="rtl">
                <span>الدرجة</span>
                <span className="sort-menu-direction">{sortKey === 'grade' && sortDirection ? (sortDirection === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓') : 'تنازلي أولاً'}</span>
              </button>
            </div>
          </div>
          {onTableStyleChange && (
            <div className="relative w-full lg:w-auto">
              <button
                onClick={() => toggleMenu('style')}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'style'}
                className="w-full lg:w-auto justify-center px-3.5 py-2 bg-slate-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-800 shadow-xs transition-colors dark:bg-slate-600 dark:hover:bg-slate-500"
              >
                <Palette className="w-4 h-4" /> <span className="portrait:hidden">تنسيق</span>{tableStyle === 'classic' ? 'كلاسيكي' : tableStyle === 'soft' ? 'ناعم' : 'مضغوط'}
                <ChevronDown className="w-4 h-4 opacity-80" />
              </button>
              <div className={`dropdown-menu style-menu absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800${openMenu === 'style' ? ' is-open' : ''}`} role="menu" aria-label="تنسيق الجدول">
                {(['classic', 'soft', 'compact'] as const).map(style => (
                  <button key={style} type="button" role="menuitemradio" aria-checked={tableStyle === style} onClick={() => { onTableStyleChange(style); setOpenMenu(null); }} className="style-menu-item" dir="rtl">
                    <span>{style === 'classic' ? 'كلاسيكي' : style === 'soft' ? 'ناعم' : 'مضغوط'}</span>
                    {tableStyle === style && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          {onPrint && (
            <button onClick={onPrint} className={`${editMode ? 'col-span-2 sm:col-span-3' : ''} w-full lg:w-auto justify-center px-3.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-700 shadow-xs transition-colors`}>
              <Printer className="w-4 h-4" /> طباعة
            </button>
          )}
          <span aria-hidden={!editMode} className={`edit-reveal edit-reveal-status${editMode ? '' : ' edit-reveal-hidden'} col-span-2 sm:col-span-3 lg:col-span-1 py-1 text-center text-xs text-amber-700 dark:text-amber-300 self-center`}>وضع التعديل نشط</span>
          {imageError && (
            <p role="alert" className="col-span-2 sm:col-span-3 lg:basis-full w-full rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              {imageError}
            </p>
          )}
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={event => {
          void handleImageSelection(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div className="table-scroll overflow-x-auto overscroll-x-contain rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-gray-900">
      <table
        className={`grade-table ${tableStyle} w-full border-collapse table-fixed`}
        id="gradeTable"
        style={{ minWidth: totalTableWidth }}
      >
        <colgroup>
          <col style={{ width: '7%' }} />
          {table.columns.map(col => (
            <col key={col.id} style={{ width: `${((col.width || 150) / totalColumnWidth) * 93}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="table-heading sticky-col border border-slate-300 dark:border-slate-600 px-2 py-2.5 bg-linear-to-b from-blue-50 to-slate-200 dark:from-gray-800 dark:to-gray-800 text-slate-700 dark:text-slate-100 font-semibold text-sm sticky top-0 z-10">
              #
            </th>
            {table.columns.map((col, colIndex) => (
              <th
                key={col.id}
                className="table-heading border border-slate-300 dark:border-slate-600 px-2 py-2.5 bg-linear-to-b from-blue-50 to-slate-200 dark:from-gray-800 dark:to-gray-800 text-slate-700 dark:text-slate-100 font-semibold text-sm sticky top-0 z-10 relative group"
              >
                {editMode ? (
                  <input
                    type="text"
                    value={col.name}
                    aria-label={`اسم العمود ${colIndex + 1}`}
                    onChange={(e) => renameColumn(colIndex, e.target.value)}
                    className="w-full bg-transparent border-none outline-hidden font-semibold text-right text-slate-700 dark:text-slate-100 rounded-sm px-1 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-400"
                  />
                ) : (
                  <div className="text-right">{col.name}</div>
                )}
                <div className={`table-edit-tools edit-reveal-v flex flex-wrap gap-1 mt-2 justify-center${editMode ? '' : ' edit-reveal-v-hidden'}`} aria-hidden={!editMode}>
                    <button
                      onClick={() => moveColumnLeft(colIndex)}
                      disabled={!editMode || colIndex === 0}
                      className="edit-icon-button disabled:opacity-30"
                      title="تحريك لليسار"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveColumnRight(colIndex)}
                      disabled={!editMode || colIndex === table.columns.length - 1}
                      className="edit-icon-button disabled:opacity-30"
                      title="تحريك لليمين"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => resizeColumn(colIndex, -15)}
                      disabled={!editMode}
                      className="edit-icon-button disabled:opacity-30"
                      title="تقليل العرض"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => resizeColumn(colIndex, 15)}
                      disabled={!editMode}
                      className="edit-icon-button disabled:opacity-30"
                      title="زيادة العرض"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeColumn(colIndex)}
                      disabled={!editMode || table.columns.length <= 1}
                      className="edit-icon-button edit-icon-danger disabled:opacity-30"
                      title="حذف العمود"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                {editMode && (
                  <div
                    className="column-resize-handle"
                    onPointerDown={(e) => startResize(e, colIndex)}
                    onKeyDown={(e) => {
                      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                      e.preventDefault();
                      const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
                      const direction = (e.key === 'ArrowLeft' ? 1 : -1) * (rtl ? 1 : -1);
                      resizeColumn(colIndex, direction * 10);
                    }}
                    title="اسحب أو استخدم الأسهم لتغيير العرض"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`تغيير عرض العمود: ${col.name}`}
                    aria-valuemin={60}
                    aria-valuemax={800}
                    aria-valuenow={Math.round(col.width || 150)}
                    aria-valuetext={`${Math.round(col.width || 150)} بكسل`}
                    tabIndex={0}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={row.id} className="grade-row">
              <td className="grade-cell sticky-col border border-slate-200 dark:border-gray-700 px-2 py-1.5 text-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                {rowIndex + 1}
                <div className={`edit-reveal-v flex flex-col gap-0.5 mt-1${editMode ? '' : ' edit-reveal-v-hidden'}`} aria-hidden={!editMode}>
                    <button
                      onClick={() => moveRowUp(rowIndex)}
                      disabled={!editMode || rowIndex === 0}
                      className="edit-icon-button disabled:opacity-30 mx-auto"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveRowDown(rowIndex)}
                      disabled={!editMode || rowIndex === table.rows.length - 1}
                      className="edit-icon-button disabled:opacity-30 mx-auto"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={!editMode}
                      className="edit-icon-button edit-icon-danger disabled:opacity-30 mx-auto"
                      title="حذف الصف"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
              </td>
              {row.cells.map((cell, cellIndex) => {
                const col = table.columns[cellIndex];
                const tier = col?.type === 'grade' ? getGradeTier(cell.value) : '';
                const isNameCell = col?.name.trim() === 'الاسم' || cellIndex === 1;
                const tags = cell.tags || [];
                return (
                  <td
                    key={cell.id}
                    onDoubleClick={(event) => {
                      const target = event.target instanceof Element ? event.target : null;
                      if (target?.closest('input, button, textarea, select, img, a')) return;
                      const input = event.currentTarget.querySelector<HTMLInputElement>('input[type="text"]');
                      if (!input || input.classList.contains('hidden')) return;
                      input.focus();
                      input.select();
                    }}
                    className={`grade-cell border border-slate-200 dark:border-gray-700 px-2 py-1.5 text-sm ${col?.type === 'grade' ? 'text-center' : 'text-right'}`}
                  >
                    <div className={col?.type === 'grade' ? '' : `name-cell-wrapper items-center justify-between${cell.image ? ' has-student-image' : ''}`}>
                    {isNameCell && cell.image && (
                      <img
                        src={cell.image}
                        alt={cell.value ? `صورة ${cell.value}` : 'صورة الطالب'}
                        className="student-image"
                        title="انقر مرتين لإزالة الصورة"
                        onDoubleClick={() => updateCellImage(row.id, cell.id)}
                      />
                    )}
                    <input
                      type="text"
                      value={cell.value}
                      aria-label={`${col?.name || `عمود ${cellIndex + 1}`}، الصف ${rowIndex + 1}`}
                      inputMode={col?.type === 'grade' ? 'decimal' : undefined}
                      onChange={(e) => {
                        if (col?.type === 'grade') {
                          const cleaned = sanitizeGrade(e.target.value);
                          updateCell(row.id, cell.id, cleaned);
                        } else {
                          updateCell(row.id, cell.id, e.target.value);
                        }
                      }}
                      onBlur={(e) => {
                        if (col?.type === 'grade') {
                          updateCell(row.id, cell.id, normalizeGrade(e.target.value));
                        }
                      }}
                      className={`${cell.image && isNameCell ? 'hidden' : ''} ${col?.type === 'grade'
                        ? `grade-value ${tier} w-[52px] border outline-hidden rounded-full px-0 py-0.5 text-center font-bold ${tier === 'tier-a' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700' : tier === 'tier-b' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/70 dark:text-blue-200 dark:border-blue-700' : tier === 'tier-c' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/70 dark:text-amber-200 dark:border-amber-700' : tier === 'tier-d' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-rose-900/70 dark:text-rose-200 dark:border-rose-700' : 'bg-transparent border-transparent text-slate-700 dark:text-slate-100'}`
                        : `w-full border-none outline-hidden bg-transparent text-right text-slate-700 dark:text-slate-100 ${editMode ? 'focus:bg-yellow-50 dark:focus:bg-gray-700 focus:px-1 rounded-sm' : 'cursor-text focus:bg-yellow-50/70 dark:focus:bg-gray-700/70 focus:px-1 rounded-sm'}`}`}
                    />
                    {isNameCell && tags.length > 0 && (
                      <div className="tag-list">
                        {tags.map((tag, tagIndex) => (
                          <span className="student-tag" key={`${cell.id}-tag-${tagIndex}`}>
                            {editMode ? (
                              <input
                                value={tag}
                                aria-label={`وسم ${tagIndex + 1}`}
                                onChange={event => updateCellTags(row.id, cell.id, tags.map((item, index) => index === tagIndex ? event.target.value : item))}
                                className="student-tag-input"
                              />
                            ) : <span>{tag}</span>}
                            {editMode && (
                              <button type="button" className="tag-remove-button" title="حذف هذا الوسم" aria-label={`حذف الوسم ${tagIndex + 1}`} onClick={() => updateCellTags(row.id, cell.id, tags.filter((_, index) => index !== tagIndex))}>
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {editMode && isNameCell && (
                      <div className="name-cell-actions">
                        <button type="button" className="image-cell-button" title={cell.image ? 'تغيير الصورة' : 'إضافة صورة'} aria-label={cell.image ? 'تغيير الصورة' : 'إضافة صورة'} aria-busy={isProcessingImage} disabled={isProcessingImage} onClick={() => pickImage(row.id, cell.id)}>
                          {isProcessingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                        </button>
                        <button type="button" className="tag-add-button" title="إضافة وسم" aria-label="إضافة وسم" onClick={() => updateCellTags(row.id, cell.id, [...tags, 'وسم'])}>
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {rowDialogOpen && (
        <RowCountModal
          currentCount={table.rows.length}
          onClose={() => setRowDialogOpen(false)}
          onAddRows={count => { addRows(count); setRowDialogOpen(false); }}
          onSetTotalRows={count => { setTotalRows(count); setRowDialogOpen(false); }}
        />
      )}
      <div className="signature-cell px-2 pt-3 pr-6 sm:pr-8 text-left text-[#1e3a8a] dark:text-blue-300 font-bold">
        {editMode ? (
          <input
            type="text"
            value={table.signature || 'عمر'}
            onChange={(e) => onUpdate({ ...table, signature: e.target.value })}
            className="signature-input"
            aria-label="التوقيع"
          />
        ) : (
          table.signature || 'عمر'
        )}
      </div>
    </div>
  );
}

interface RowCountModalProps {
  currentCount: number;
  onClose: () => void;
  onAddRows: (count: number) => void;
  onSetTotalRows: (count: number) => void;
}

function RowCountModal({ currentCount, onClose, onAddRows, onSetTotalRows }: RowCountModalProps) {
  const [mode, setMode] = useState<'add' | 'total'>('add');
  const [value, setValue] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter(el => !el.hasAttribute('disabled'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last || !dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const parsed = Number.parseInt(value, 10);
  const isValid = Number.isFinite(parsed) && (mode === 'add' ? parsed >= 1 : parsed >= 0);
  const count = isValid ? Math.min(parsed, 1000) : 0;
  const totalAfter = mode === 'add' ? currentCount + count : count;

  const chooseMode = (nextMode: 'add' | 'total') => {
    setMode(nextMode);
    setValue(nextMode === 'add' ? '1' : String(currentCount));
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  return (
    <div
      className="row-modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="row-count-title"
        className="modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        dir="rtl"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!isValid) return;
            if (mode === 'add') onAddRows(count);
            else onSetTotalRows(count);
          }}
        >
        <div className="flex items-start justify-between gap-3 bg-linear-to-l from-[#1e3a8a] to-[#2563eb] px-5 py-4 text-white dark:from-[#1e3a8a] dark:to-[#1e40af]">
          <div>
            <h2 id="row-count-title" className="text-base font-bold">عدد الصفوف</h2>
            <p className="mt-0.5 text-xs text-blue-100">أضف صفوفًا جديدة أو حدّد العدد الإجمالي للصفوف.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-blue-100 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <fieldset>
            <legend className="sr-only">طريقة تعديل الصفوف</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${mode === 'add' ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300'}`}>
                <input type="radio" name="row-count-mode" className="choice-radio" checked={mode === 'add'} onChange={() => chooseMode('add')} />
                إضافة صفوف
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${mode === 'total' ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300'}`}>
                <input type="radio" name="row-count-mode" className="choice-radio" checked={mode === 'total'} onChange={() => chooseMode('total')} />
                العدد الإجمالي
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor="row-count-input" className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
              {mode === 'add' ? 'كم عدد الصفوف التي تريد إضافتها؟' : 'كم عدد الصفوف الإجمالي الذي تريده؟'}
            </label>
            <input
              ref={inputRef}
              id="row-count-input"
              type="number"
              min={mode === 'add' ? 1 : 0}
              max={1000}
              step={1}
              inputMode="numeric"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-lg font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800/60">
            <span className="text-slate-600 dark:text-slate-300">الإجمالي الحالي: <strong className="text-slate-800 dark:text-white">{currentCount}</strong></span>
            <span className="text-slate-600 dark:text-slate-300">بعد التطبيق: <strong className="text-blue-700 dark:text-blue-300">{totalAfter}</strong></span>
          </div>

          {mode === 'total' && totalAfter < currentCount && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              سيتم حذف {currentCount - totalAfter} من الصفوف الأخيرة.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              تطبيق
            </button>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
}
