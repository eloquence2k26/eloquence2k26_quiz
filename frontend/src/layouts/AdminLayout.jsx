import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  HelpCircle,
  Calendar,
  Activity,
  Award,
  Filter,
  Layers,
  Bell,
  ShieldAlert,
  RotateCcw,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/common/ThemeToggle';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Event Manager Sub-items definition
  const eventManagerItems = [
    { label: 'Event Management', icon: BookOpen, path: '/admin/quizzes', desc: 'Manage events & quizzes' },
    { label: 'Questions', icon: HelpCircle, path: '/admin/questions', desc: 'MCQ question bank' },
    { label: 'Quiz Schedule', icon: Calendar, path: '/admin/schedule', desc: 'Timeline & entry windows' },
    { label: 'Rounds', icon: Layers, path: '/admin/rounds', desc: 'Round 1 & Round 2 setup' },
    { label: 'Round Selection', icon: Filter, path: '/admin/round-selection', desc: 'Qualifiers & promotion' },
    { label: 'Results', icon: Award, path: '/admin/results', desc: 'Scores & leaderboards' }
  ];

  // Primary menu items
  const primaryItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Participants', icon: Users, path: '/admin/participants' },
    { label: 'User Registration', icon: UserPlus, path: '/admin/user-register' }
  ];

  // Operations & proctoring items
  const operationsItems = [
    { label: 'Live Exams', icon: Activity, path: '/admin/live-exams' },
    { label: 'Exam Restarts', icon: RotateCcw, path: '/admin/restarts' },
    { label: 'Announcements', icon: Bell, path: '/admin/announcements' },
    { label: 'Security Violations', icon: ShieldAlert, path: '/admin/violations' },
    { label: 'Reports', icon: FileSpreadsheet, path: '/admin/reports' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' }
  ];

  // Check if current route is inside Event Manager
  const isEventManagerActive = eventManagerItems.some((item) => location.pathname === item.path);

  // Sidebar Event Manager Accordion Dropdown State
  const [eventManagerOpen, setEventManagerOpen] = useState(true);

  // Top Navbar Event Manager Dropdown State
  const [topEventMenuOpen, setTopEventMenuOpen] = useState(false);
  const topDropdownRef = useRef(null);

  // Auto-expand Event Manager section when user navigates to any of its subpages
  useEffect(() => {
    if (isEventManagerActive) {
      setEventManagerOpen(true);
    }
  }, [location.pathname, isEventManagerActive]);

  // Click outside listener for top header dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (topDropdownRef.current && !topDropdownRef.current.contains(event.target)) {
        setTopEventMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Eloquence <span className="text-brand-600 dark:text-brand-400">'26</span>
              </h1>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Admin Portal</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Main Group */}
          <div className="space-y-1">
            <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Overview & Scholars
            </p>
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-900/50 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Event Manager Section & Dropdown */}
          <div className="pt-1">
            <div className="px-3.5 mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Competition Hub
              </span>
            </div>

            {/* Event Manager Accordion Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setEventManagerOpen(!eventManagerOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 border ${
                isEventManagerActive
                  ? 'bg-brand-50/80 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-900/60 shadow-sm'
                  : 'bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isEventManagerActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <FolderKanban className="w-3.5 h-3.5" />
                </div>
                <span className="font-extrabold tracking-tight">Event Manager</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                  6
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    eventManagerOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </div>
            </button>

            {/* Event Manager Dropdown Items */}
            {eventManagerOpen && (
              <div className="mt-1.5 ml-3 pl-3 border-l-2 border-brand-200 dark:border-brand-900/50 space-y-1">
                {eventManagerItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-brand-600 text-white font-bold shadow-sm shadow-brand-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operations & Security Group */}
          <div className="space-y-1 pt-1">
            <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Proctoring & System
            </p>
            {operationsItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-900/50 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-xs">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <ThemeToggle className="scale-90" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="h-16 sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Event Manager Switcher Dropdown in Top Header */}
            <div className="relative" ref={topDropdownRef}>
              <button
                type="button"
                onClick={() => setTopEventMenuOpen(!topEventMenuOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                  isEventManagerActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Event Manager</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${topEventMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {topEventMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Event Manager Modules</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-brand-100 dark:bg-brand-950 text-brand-600 font-mono">6 Sections</span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {eventManagerItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setTopEventMenuOpen(false)}
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all ${
                            isActive
                              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-900/60'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                          <div>
                            <p className="text-xs font-bold leading-none">{item.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:block text-xs font-medium text-slate-400">
              Department of CSE • Symposium Examination Console
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/restarts"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Exam Restarts</span>
            </Link>

            <Link
              to="/admin/user-register"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold hover:bg-brand-100 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Users</span>
            </Link>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Proctor Active
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
