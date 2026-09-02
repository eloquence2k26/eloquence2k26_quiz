import React from 'react';

export const Input = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  rightElement,
  error,
  required = false,
  autoComplete
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon className="h-5 w-5" />
          </div>
        )}
        
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`block w-full rounded-xl bg-white dark:bg-zinc-900 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 transition-all duration-150 ${
            Icon ? 'pl-11' : 'pl-4'
          } ${
            rightElement ? 'pr-11' : 'pr-4'
          } py-2.5 ${
            error 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-200' 
              : 'border-slate-300 dark:border-zinc-800 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-blue-500/20'
          }`}
        />
        
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium pl-1">{error}</p>
      )}
    </div>
  );
};
