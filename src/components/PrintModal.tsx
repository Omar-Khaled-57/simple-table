import { useEffect, useRef, useState } from 'react';
import type { TableData } from '../types';
import { X } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableData[];
  activeTableId: string | null;
  onPrint: (tableIds: string[]) => void;
}

export default function PrintModal({ isOpen, onClose, tables, activeTableId, onPrint }: PrintModalProps) {
  const [printOption, setPrintOption] = useState<'all' | 'some' | 'current'>(
    activeTableId ? 'current' : 'all'
  );
  const [selectedTables, setSelectedTables] = useState<string[]>(
    activeTableId ? [activeTableId] : []
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setPrintOption(activeTableId ? 'current' : 'all');
      setSelectedTables(activeTableId ? [activeTableId] : tables.map(table => table.id));
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !dialog.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.body.style.overflow = 'hidden';
    const appShell = document.querySelector<HTMLElement>('.app-shell');
    appShell?.setAttribute('inert', '');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
      appShell?.removeAttribute('inert');
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleTableSelection = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handlePrint = () => {
    const ids = printOption === 'current' && activeTableId
      ? [activeTableId]
      : printOption === 'all'
        ? tables.map(table => table.id)
        : selectedTables;
    onPrint(ids);
    onClose();
  };

  const optionClass = (isSelected: boolean, isDisabled = false) => [
    'flex items-center gap-3 rounded-lg border p-3 transition-colors',
    isDisabled
      ? 'cursor-not-allowed opacity-50 border-slate-200 dark:border-gray-700'
      : isSelected
        ? 'cursor-pointer border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40'
        : 'cursor-pointer border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800',
  ].join(' ');

  return (
    <div className="print-modal-overlay fixed inset-0 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center z-50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="print-dialog-title" className="modal-panel font-cairo bg-white dark:bg-gray-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto border border-slate-200 dark:border-gray-700">
        <div className="bg-linear-to-br from-[#1e3a8a] via-[#2563eb] to-[#3b82f6] dark:via-[#1e40af] dark:to-[#2563eb] text-white px-6 py-5 flex items-center justify-between">
          <h2 id="print-dialog-title" className="text-xl font-bold">طباعة الجداول</h2>
          <button ref={closeButtonRef} onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80" aria-label="إغلاق نافذة الطباعة">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">خيارات الطباعة</label>
            <div className="space-y-2">
              <label className={optionClass(printOption === 'all')}>
                <input
                  type="radio"
                  name="printOption"
                  value="all"
                  checked={printOption === 'all'}
                  onChange={(e) => {
                    setPrintOption(e.target.value as 'all' | 'some' | 'current');
                    setSelectedTables(tables.map(t => t.id));
                  }}
                  className="choice-radio"
                />
                <span>طباعة جميع الجداول</span>
              </label>
              <label className={optionClass(printOption === 'current', !activeTableId)}>
                <input
                  type="radio"
                  name="printOption"
                  value="current"
                  checked={printOption === 'current'}
                  onChange={(e) => {
                    setPrintOption(e.target.value as 'all' | 'some' | 'current');
                    if (activeTableId) setSelectedTables([activeTableId]);
                  }}
                  disabled={!activeTableId}
                  className="choice-radio"
                />
                <span>طباعة الجدول الحالي فقط</span>
              </label>
              <label className={optionClass(printOption === 'some')}>
                <input
                  type="radio"
                  name="printOption"
                  value="some"
                  checked={printOption === 'some'}
                  onChange={(e) => setPrintOption(e.target.value as 'all' | 'some' | 'current')}
                  className="choice-radio"
                />
                <span>طباعة جداول محددة</span>
              </label>
            </div>
          </div>

          {printOption === 'some' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">اختر الجداول</label>
              <div className="space-y-2 max-h-40 overflow-auto border border-slate-300 dark:border-gray-600 rounded-lg p-3">
                {tables.map(table => (
                  <label key={table.id} className={`flex items-center gap-3 cursor-pointer rounded-md p-2 transition-colors ${selectedTables.includes(table.id) ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-gray-800'}`}>
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(table.id)}
                      onChange={() => toggleTableSelection(table.id)}
                      className="choice-checkbox"
                    />
                    <span className="text-sm">{table.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-gray-700">
          <button
            onClick={handlePrint}
            disabled={printOption === 'some' && selectedTables.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:bg-slate-300 dark:disabled:bg-gray-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            طباعة
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-800 dark:text-white py-2.5 px-4 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
