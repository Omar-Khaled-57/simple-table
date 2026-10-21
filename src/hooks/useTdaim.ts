import { useState } from 'react';

export const useTdaim = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('tdaim-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      return savedTheme;
    }
    document.documentElement.classList.remove('dark');
    return 'light';
  });
  
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(() => {
    const savedDir = localStorage.getItem('tdaim-direction') as 'ltr' | 'rtl' | null;
    if (savedDir) {
      document.documentElement.dir = savedDir;
      return savedDir;
    }
    document.documentElement.dir = 'rtl';
    return 'rtl';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('tdaim-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const toggleDirection = () => {
    const newDir = direction === 'rtl' ? 'ltr' : 'rtl';
    setDirection(newDir);
    localStorage.setItem('tdaim-direction', newDir);
    document.documentElement.dir = newDir;
  };

  return { theme, direction, toggleTheme, toggleDirection };
};
