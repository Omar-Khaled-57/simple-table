import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isOpen) return;
    setPrintOption(activeTableId ? 'current' : 'all');
    setSelectedTables(activeTableId ? [activeTableId] : tables.map(table => table.id));
  }, [isOpen, activeTableId, tables]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

  return (
    <div className="print-modal-overlay fixed inset-0 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="print-dialog-title" className="font-cairo bg-white dark:bg-gray-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto border border-slate-200 dark:border-gray-700">
        <div className="bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#3b82f6] text-white px-6 py-5 flex items-center justify-between">
          <h2 id="print-dialog-title" className="text-xl font-bold">طباعة الجداول</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors" aria-label="إغلاق نافذة الطباعة">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">خيارات الطباعة</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 dark:border-gray-700 p-3 hover:bg-slate-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="printOption"
                  value="all"
                  checked={printOption === 'all'}
                  onChange={(e) => {
                    setPrintOption(e.target.value as 'all' | 'some' | 'current');
                    setSelectedTables(tables.map(t => t.id));
                  }}
                  className="w-4 h-4 accent-blue-600"
                />
                <span>طباعة جميع الجداول</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 dark:border-gray-700 p-3 hover:bg-slate-50 dark:hover:bg-gray-800">
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
                  className="w-4 h-4 accent-blue-600"
                />
                <span>طباعة الجدول الحالي فقط</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 dark:border-gray-700 p-3 hover:bg-slate-50 dark:hover:bg-gray-800">
                <input
                  type="radio"
                  name="printOption"
                  value="some"
                  checked={printOption === 'some'}
                  onChange={(e) => setPrintOption(e.target.value as 'all' | 'some' | 'current')}
                  className="w-4 h-4 accent-blue-600"
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
                  <label key={table.id} className="flex items-center gap-3 cursor-pointer rounded-md p-2 hover:bg-slate-50 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(table.id)}
                      onChange={() => toggleTableSelection(table.id)}
                      className="w-4 h-4 accent-blue-600"
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-gray-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
          >
            طباعة
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-800 dark:text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
