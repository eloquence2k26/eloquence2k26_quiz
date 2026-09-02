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
        <label htmlFor={id} className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
          {label} {required && <span className="text-zinc-500">*</span>}
        </label>
      )}
      
      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
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
          className={`block w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
            Icon ? 'pl-11' : 'pl-4'
          } ${
            rightElement ? 'pr-11' : 'pr-4'
          } py-3 ${
            error 
              ? 'border-zinc-900 dark:border-zinc-100 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20' 
              : 'border-zinc-300 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10'
          }`}
        />
        
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-zinc-900 dark:text-zinc-100 font-semibold pl-1">{error}</p>
      )}
    </div>
  );
};
