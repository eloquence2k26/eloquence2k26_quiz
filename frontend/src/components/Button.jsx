import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
  icon: Icon
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-md shadow-blue-600/20 dark:shadow-[0_0_15px_rgba(37,99,235,0.35)]',
    admin: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-md shadow-blue-600/20 dark:shadow-[0_0_15px_rgba(37,99,235,0.35)]',
    secondary: 'bg-white hover:bg-blue-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 hover:text-blue-700 dark:text-zinc-200 dark:hover:text-blue-400 border border-slate-200 hover:border-blue-300 dark:border-zinc-800 dark:hover:border-blue-700 focus:ring-blue-500 shadow-sm',
    outline: 'bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/30 text-slate-700 hover:text-blue-700 dark:text-zinc-200 dark:hover:text-blue-300 border border-slate-300 hover:border-blue-400 dark:border-zinc-700 dark:hover:border-blue-600 focus:ring-blue-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm'
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
