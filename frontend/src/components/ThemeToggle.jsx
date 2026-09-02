import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      className="p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center bg-white hover:bg-blue-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-slate-200 hover:border-blue-300 dark:border-zinc-800 dark:hover:border-blue-700 text-slate-700 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-blue-400 shadow-sm cursor-pointer active:scale-95"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4 text-amber-400" />
      )}
    </button>
  );
};
