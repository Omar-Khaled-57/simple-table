import { useState } from 'react';
import { getStoredItem, setStoredItem } from '../utils/storage';

type Theme = 'light' | 'dark';

const getInitialTheme = (): Theme => {
  const savedTheme = getStoredItem('tdaim-theme');
  const theme: Theme = savedTheme === 'dark' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  return theme;
};

export const useTdaim = () => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setStoredItem('tdaim-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  return { theme, toggleTheme };
};
