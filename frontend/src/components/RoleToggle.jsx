import React from 'react';
import { User, ShieldCheck } from 'lucide-react';

export const RoleToggle = ({ activeRole, onRoleChange }) => {
  return (
    <div className="bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 transition-colors duration-200">
      <button
        type="button"
        onClick={() => onRoleChange('user')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          activeRole === 'user'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:shadow-[0_0_15px_rgba(37,99,235,0.35)]'
            : 'text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-zinc-800'
        }`}
      >
        <User className="w-4 h-4" />
        <span>Participant Login</span>
      </button>

      <button
        type="button"
        onClick={() => onRoleChange('admin')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          activeRole === 'admin'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:shadow-[0_0_15px_rgba(37,99,235,0.35)]'
            : 'text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-zinc-800'
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Admin Login</span>
      </button>
    </div>
  );
};
