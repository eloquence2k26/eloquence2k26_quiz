import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { 
  LayoutDashboard, 
  Users, 
  BrainCircuit, 
  LogOut, 
  UserCircle,
  Settings,
  Filter,
  RotateCcw,
  Menu,
  X,
  BookOpen
} from 'lucide-react';

export const Sidebar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminNavItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Quiz Management',
      path: '/admin/quizzes',
      icon: Settings
    },
    {
      name: 'Next Round Filter',
      path: '/admin/next-round-filter',
      icon: Filter
    },
    {
      name: 'Restart Test',
      path: '/admin/restart-test',
      icon: RotateCcw
    },
    {
      name: 'User Register',
      path: '/users',
      icon: Users
    }
  ];

  const participantNavItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'My Quizzes',
      path: '/participant/quizzes',
      icon: BookOpen
    }
  ];

  const navItems = role === 'admin' ? adminNavItems : participantNavItems;

  return (
    <>
      {/* Mobile Top Header Toggle Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Eloquence 2K26</h1>
            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase">Quiz Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Sidebar (Desktop fixed sidebar + Mobile slide-out drawer) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-40 w-64 bg-white dark:bg-[#09090b] border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between h-screen transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & Brand */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Eloquence 2K26
                </h1>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Quiz Portal</p>
              </div>
            </div>

            <ThemeToggle />
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 pt-2 md:pt-4">
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-3 mb-2">
              {role === 'admin' ? 'Administrator Menu' : 'Participant Menu'}
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/80 dark:shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-zinc-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 space-y-3 bg-white dark:bg-[#09090b]">
          {user && (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
              <UserCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name || user.email}</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 hover:bg-red-50 dark:bg-zinc-900 dark:hover:bg-red-950/30 border border-slate-200 hover:border-red-200 dark:border-zinc-800 dark:hover:border-red-900 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

