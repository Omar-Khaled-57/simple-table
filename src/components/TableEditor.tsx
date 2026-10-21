import { useEffect, useRef, useState } from 'react';
import type { TableData, TableRow } from '../types';
import { generateId } from '../utils/tdaim';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus, X, Minus, Maximize2, ImagePlus, Edit3, Printer, ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronDown, Palette, Check } from 'lucide-react';

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

  const handleImageSelection = (file?: File) => {
    if (!file || !imageTarget) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') updateCellImage(imageTarget.rowId, imageTarget.cellId, reader.result);
      setImageTarget(null);
    };
    reader.readAsDataURL(file);
  };

  const addRow = () => {
    const newRow: TableRow = {
      id: generateId(),
      cells: table.columns.map(col => ({
        id: generateId(),
        value: '',
        type: col.type === 'grade' ? 'grade' as const : 'text' as const
      }))
    };
    updateTable({ rows: [...table.rows, newRow] });
  };

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
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
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
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', stopResize);
    window.removeEventListener('pointercancel', stopResize);
  };

  const getTier = (value: string) => {
    if (value === '#') return 'tier-a';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    if (num >= 18) return 'tier-a';
    if (num >= 14) return 'tier-b';
    if (num >= 10) return 'tier-c';
    return 'tier-d';
  };

  const normalizeGrade = (v: string) => {
    const s = v.trim();
    if (s === '' || s === '.') return '';
    if (s === '#') return '#';
    const n = parseFloat(s);
    if (isNaN(n)) return s;
    return n === 0 ? '#' : String(n);
  };

  const sanitizeGrade = (v: string) => {
    let s = v;
    if (s.includes('#')) return '0';
    s = s.replace(/[^0-9.]/g, '');
    const dot = s.indexOf('.');
    if (dot !== -1) {
      s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
    }
    return s;
  };

  const totalColumnWidth = table.columns.reduce((sum, column) => sum + (column.width || 150), 0);

  const totalTableWidth = 56 + table.columns.reduce((sum, col) => sum + (col.width || 150), 0);

  return (
    <div className="w-full">
      <div className={`table-control-strip mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center p-2.5 rounded-xl border transition-colors ${editMode ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900' : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700'}`}>
          <button
            onClick={addRow}
            className="w-full lg:w-auto justify-center px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة صف
          </button>
          {onToggleEditMode && (
            <button
              onClick={onToggleEditMode}
              className={`w-full lg:w-auto justify-center px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors ${editMode ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
              aria-pressed={editMode}
            >
              <Edit3 className="w-4 h-4" /> {editMode ? 'إنهاء التعديل' : 'وضع التعديل'}
            </button>
          )}
          <button
            onClick={addColumn}
            disabled={!editMode}
            className={`edit-reveal${editMode ? '' : ' edit-reveal-hidden'} w-full lg:w-auto justify-center px-3.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-700 shadow-sm transition-colors`}
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
              className="w-full lg:w-auto justify-center px-3.5 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
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
                className="w-full lg:w-auto justify-center px-3.5 py-2 bg-slate-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-800 shadow-sm transition-colors dark:bg-slate-600 dark:hover:bg-slate-500"
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
            <button onClick={onPrint} className={`${!editMode ? 'col-span-2 sm:col-span-2 lg:col-span-1' : ''} w-full lg:w-auto justify-center px-3.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-700 shadow-sm transition-colors`}>
              <Printer className="w-4 h-4" /> طباعة
            </button>
          )}
          <span aria-hidden={!editMode} className={`edit-reveal${editMode ? '' : ' edit-reveal-hidden'} col-span-2 sm:col-span-3 lg:col-span-1 py-1 text-center text-xs text-amber-700 dark:text-amber-300 self-center`}>وضع التعديل نشط</span>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={event => {
          handleImageSelection(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div className="table-scroll overflow-x-auto overscroll-x-contain rounded-lg">
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
            <th className="table-heading sticky-col border border-slate-200 dark:border-gray-700 px-2 py-2.5 bg-gradient-to-b from-blue-50 to-slate-200 dark:from-gray-800 dark:to-gray-800 text-slate-700 dark:text-slate-100 font-semibold text-sm sticky top-0 z-10">
              #
            </th>
            {table.columns.map((col, colIndex) => (
              <th
                key={col.id}
                className="table-heading border border-slate-200 dark:border-gray-700 px-2 py-2.5 bg-gradient-to-b from-blue-50 to-slate-200 dark:from-gray-800 dark:to-gray-800 text-slate-700 dark:text-slate-100 font-semibold text-sm sticky top-0 z-10 relative group"
              >
                {editMode ? (
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => renameColumn(colIndex, e.target.value)}
                    className="w-full bg-transparent border-none outline-none font-semibold text-right text-slate-700 dark:text-slate-100 rounded px-1 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-400"
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
                    title="اسحب لتغيير العرض"
                    aria-label="تغيير عرض العمود"
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
                const tier = col?.type === 'grade' ? getTier(cell.value) : '';
                const isNameCell = col?.name.trim() === 'الاسم' || cellIndex === 1;
                const tags = cell.tags || [];
                return (
                  <td
                    key={cell.id}
                    className={`grade-cell border border-slate-200 dark:border-gray-700 px-2 py-1.5 text-sm ${col?.type === 'grade' ? 'text-center' : 'text-right'}`}
                  >
                    <div className={col?.type === 'grade' ? '' : 'name-cell-wrapper'}>
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
                      readOnly={!editMode && col?.type !== 'grade'}
                      className={`${cell.image && isNameCell ? 'hidden' : ''} ${col?.type === 'grade'
                        ? `grade-value ${tier} w-[52px] border outline-none rounded-full px-0 py-0.5 text-center font-bold ${tier === 'tier-a' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700' : tier === 'tier-b' ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/70 dark:text-blue-200 dark:border-blue-700' : tier === 'tier-c' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/70 dark:text-amber-200 dark:border-amber-700' : tier === 'tier-d' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-rose-900/70 dark:text-rose-200 dark:border-rose-700' : 'bg-transparent border-transparent text-slate-700 dark:text-slate-100'}`
                        : `w-full border-none outline-none bg-transparent text-right text-slate-700 dark:text-slate-100 ${editMode ? 'focus:bg-yellow-50 dark:focus:bg-gray-700 focus:px-1 rounded' : 'cursor-default'}`}`}
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
                        <button type="button" className="image-cell-button" title={cell.image ? 'تغيير الصورة' : 'إضافة صورة'} aria-label={cell.image ? 'تغيير الصورة' : 'إضافة صورة'} onClick={() => pickImage(row.id, cell.id)}>
                          <ImagePlus className="w-4 h-4" />
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
        <tfoot>
          <tr>
            <td colSpan={table.columns.length + 1} className="signature-cell border-0 px-2 py-4 pr-6 sm:pr-8 text-left text-[#1e3a8a] dark:text-blue-300 font-bold">
              {editMode ? (
                <input
                  type="text"
                  value={table.signature ?? 'عمر'}
                  onChange={(e) => onUpdate({ ...table, signature: e.target.value })}
                  className="signature-input"
                  aria-label="التوقيع"
                />
              ) : (
                table.signature || 'عمر'
              )}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}
