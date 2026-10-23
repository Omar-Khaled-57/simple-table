import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Download, RefreshCw, Trash2 } from 'lucide-react';
import { getStoredItem, removeStoredItem } from '../utils/storage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error', error, info);
  }

  private downloadBackup = () => {
    const saved = getStoredItem('exam-tables');
    if (!saved) return;
    const blob = new Blob([saved], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simple-table-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  private clearData = () => {
    const confirmed = window.confirm(
      'سيتم حذف كل الجداول المحفوظة على هذا الجهاز نهائياً. هل تريد المتابعة؟'
    );
    if (!confirmed) return;
    removeStoredItem('exam-tables');
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main dir="rtl" className="min-h-screen bg-[#eef2f7] font-cairo text-slate-800 flex items-center justify-center p-4">
        <section role="alert" className="w-full max-w-lg bg-white rounded-2xl border border-red-200 shadow-xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-xl font-bold mb-2">حدث خطأ غير متوقع</h1>
          <p className="text-sm text-slate-600 mb-5">
            توقّف التطبيق عن العمل، لكن بياناتك المحفوظة على هذا الجهاز لم تُحذف. جرّب إعادة التحميل، أو نزّل نسخة احتياطية قبل أي إجراء آخر.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              إعادة التحميل
            </button>
            <button
              type="button"
              onClick={this.downloadBackup}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              تنزيل نسخة احتياطية
            </button>
            <button
              type="button"
              onClick={this.clearData}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-sm font-semibold"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              حذف البيانات
            </button>
          </div>
        </section>
      </main>
    );
  }
}
