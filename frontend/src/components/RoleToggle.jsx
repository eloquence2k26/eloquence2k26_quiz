import React from 'react';
import { User, ShieldCheck } from 'lucide-react';

export const RoleToggle = ({ activeRole, onRoleChange }) => {
  return (
    <div className="bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shadow-inner transition-colors duration-200">
      <button
        type="button"
        onClick={() => onRoleChange('user')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
          activeRole === 'user'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60'
        }`}
      >
        <User className="w-4 h-4" />
        <span>Participant Login</span>
      </button>

      <button
        type="button"
        onClick={() => onRoleChange('admin')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
          activeRole === 'admin'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60'
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Admin Login</span>
      </button>
    </div>
  );
};
