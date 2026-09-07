import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { BrainCircuit, LogOut, User, UserPlus, Sparkles, CalendarClock } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

export const Navbar = () => {
  const { user, role, logout } = useAuth();

  return (
    <nav className="border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-black/90 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex justify-between items-center">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Eloquence 2K26
            </h1>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase">Quiz Platform</p>
          </div>
        </Link>

        {/* Quick Nav for Admin */}
        {role === 'admin' && (
          <div className="hidden lg:flex items-center gap-2">
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                }`
              }
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>User Register & Import</span>
            </NavLink>

            <NavLink
              to="/event-quiz"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                }`
              }
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Event Quiz</span>
            </NavLink>

            <NavLink
              to="/schedule"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                }`
              }
            >
              <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Schedule</span>
            </NavLink>
          </div>
        )}

        {/* User Info / Controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{user.name || user.email}</span>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {role === 'admin' ? 'Administrator' : 'Student Participant'}
                </span>
              </div>

              <button
                onClick={logout}
                title="Log Out"
                className="p-2 bg-slate-100 hover:bg-red-50 dark:bg-zinc-900 dark:hover:bg-red-950/30 text-slate-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400 border border-slate-200 hover:border-red-200 dark:border-zinc-800 dark:hover:border-red-900 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Log Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-600/20 dark:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all flex items-center gap-2"
            >
              <User className="w-4 h-4" /> Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
