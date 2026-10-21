// TDAIM: Theme-Direction Aware Incremental Model
// This is a conceptual framework for state management - we'll implement it as utilities

export type ThemeMode = 'light' | 'dark' | 'auto';
export type Direction = 'ltr' | 'rtl';

export const detectDirection = (): Direction => {
  return document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl';
};

export const applyTheme = (theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
