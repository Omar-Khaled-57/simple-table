import type { ReactNode } from 'react';

interface KbdProps {
  children: ReactNode;
}

export default function Kbd({ children }: KbdProps) {
  return (
    <kbd
      dir="ltr"
      className="inline-flex min-w-[1.4rem] items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-slate-600 shadow-[inset_0_-1px_0_rgba(15,23,42,0.12)] sm:text-[11px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:shadow-[inset_0_-1px_0_rgba(0,0,0,0.5)]"
    >
      {children}
    </kbd>
  );
}
