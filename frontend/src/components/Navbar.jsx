import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { BrainCircuit, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user, role, logout } = useAuth();

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex justify-between items-center">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2.5 bg-zinc-900 dark:bg-zinc-100 rounded-xl shadow-md group-hover:scale-105 transition-transform">
            <BrainCircuit className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
              Eloquence 2K26
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider uppercase">Quiz Platform</p>
          </div>
        </Link>

        {/* User Info / Controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.name || user.email}</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800">
                  {role === 'admin' ? 'Administrator' : 'Student Participant'}
                </span>
              </div>

              <button
                onClick={logout}
                title="Log Out"
                className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800 rounded-xl transition-all flex items-center gap-1 text-xs font-bold"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Log Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <User className="w-4 h-4" /> Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
