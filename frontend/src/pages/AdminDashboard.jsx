import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Plus, Users, FileSpreadsheet, Settings, CheckCircle2, UserPlus } from 'lucide-react';
import { Button } from '../components/Button';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user, registeredUsers } = useAuth();

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Admin Welcome Banner */}
      <section className="basic-card p-6 sm:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Administrator Control Center
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Admin Portal: {user?.name || 'Administrator'}
            </h2>
            <p className="text-slate-600 dark:text-zinc-400 text-sm mt-1">Manage Eloquence 2K26 quiz sessions, user registration, and participant leaderboards.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/users">
              <Button variant="primary" icon={UserPlus}>
                Register User
              </Button>
            </Link>
          </div>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Total Registered Users</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{registeredUsers?.length || 5} Users</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Active Quizzes</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">3 Live</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Attempts Recorded</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">289</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Database Status</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Supabase Connected
            </span>
          </div>
        </div>
      </section>

      {/* Admin Action Sections */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quiz Management Card */}
        <div className="basic-card p-6 space-y-4 hover:border-blue-400 dark:hover:border-blue-600">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 rounded-xl w-fit text-blue-600 dark:text-blue-400">
            <Settings className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quiz Question Editor</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Add, update, or remove multiple choice questions, set timers, and set scoring multipliers.
          </p>
          <Link to="/add-question">
            <Button variant="secondary" size="sm" className="w-full mt-2">
              Manage Questions
            </Button>
          </Link>
        </div>

        {/* User Directory & Register Card */}
        <div className="basic-card p-6 space-y-4 hover:border-blue-400 dark:hover:border-blue-600">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 rounded-xl w-fit text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">User Directory & Register</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Register new participants with username and phone number, view registered accounts, and manage roles.
          </p>
          <Link to="/users">
            <Button variant="secondary" size="sm" className="w-full mt-2">
              Manage & Register Users
            </Button>
          </Link>
        </div>

        {/* Database Export Card */}
        <div className="basic-card p-6 space-y-4 hover:border-blue-400 dark:hover:border-blue-600">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 rounded-xl w-fit text-blue-600 dark:text-blue-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Export Results & CSV</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Download full quiz response logs, leaderboard data, and user feedback in CSV / JSON format.
          </p>
          <Button variant="secondary" size="sm" className="w-full">
            Export CSV Data
          </Button>
        </div>
      </section>
    </div>
  );
};
