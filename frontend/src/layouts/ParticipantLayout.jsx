import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  BookOpen,
  Award,
  Layers,
  Bell,
  LogOut,
  User,
  Menu,
  X,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/common/ThemeToggle';

export default function ParticipantLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/participant/dashboard' },
    { label: 'Available Quizzes', icon: BookOpen, path: '/participant/quizzes' },
    { label: 'Round Qualification', icon: Layers, path: '/participant/round-status' },
    { label: 'Results & Ranks', icon: Award, path: '/participant/results' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {/* Top Participant Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/participant/dashboard" className="flex items-center gap-3 group">
            <img
              src="/eloquence-logo.png"
              alt="Eloquence '26 Logo"
              className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(34,197,94,0.4)] transition-transform group-hover:scale-105"
            />
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Eloquence <span className="text-brand-600 dark:text-brand-400">'26</span>
              </span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Participant Console</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-900/50 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Profile & Controls */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user?.full_name || 'Participant'}</p>
                <p className="text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                  {user?.participant?.participant_id || 'ID Verified'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Eloquence '26 National Technical Symposium • Online Examination Portal
      </footer>
    </div>
  );
}
