import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Plus, Users, Settings, CheckCircle2, UserPlus, BookOpen, ShieldAlert, Award } from 'lucide-react';
import { Button } from '../components/Button';
import { Link } from 'react-router-dom';
import { API_ADMIN_URL } from '../config/apiConfig';

export const AdminDashboard = () => {
  const { user, registeredUsers } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const [qRes, rRes, vRes] = await Promise.all([
          fetch(`${API_ADMIN_URL}/quizzes`),
          fetch(`${API_ADMIN_URL}/results`),
          fetch(`${API_ADMIN_URL}/violations`)
        ]);

        if (qRes.ok) {
          const qData = await qRes.json();
          setQuizzes(qData.quizzes || []);
        }
        if (rRes.ok) {
          const rData = await rRes.json();
          setResults(rData.results || []);
        }
        if (vRes.ok) {
          const vData = await vRes.json();
          setViolations(vData.violations || []);
        }
      } catch (err) {
        console.error('Dashboard stats fetch error:', err);
      }
    };

    fetchDashboardStats();
  }, []);

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
            <p className="text-slate-600 dark:text-zinc-400 text-sm mt-1">Manage Eloquence 2K26 quiz sessions, participant access, questions, and security logs.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/quizzes">
              <Button variant="primary" icon={Plus}>
                Create Quiz Event
              </Button>
            </Link>
            <Link to="/users">
              <Button variant="secondary" icon={UserPlus}>
                Register User
              </Button>
            </Link>
          </div>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Total Registered Users</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{registeredUsers?.length || 0} Users</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Quiz Events</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{quizzes.length} Quizzes</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Completed Attempts</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{results.length} Attempts</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Security Violations</span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{violations.length} Logged</span>
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
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quiz Events & Questions</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Create quiz events, set schedules, duration, instructions, manage MCQ questions (2, 3, 4 options), positive & negative marks.
          </p>
          <Link to="/admin/quizzes">
            <Button variant="secondary" size="sm" className="w-full mt-2">
              Manage Quizzes & Questions
            </Button>
          </Link>
        </div>

        {/* User Directory & Access Control Card */}
        <div className="basic-card p-6 space-y-4 hover:border-blue-400 dark:hover:border-blue-600">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 rounded-xl w-fit text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Participant Access & User Directory</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Grant or revoke student quiz access per event, view registered participants, and register new accounts.
          </p>
          <Link to="/admin/quizzes">
            <Button variant="secondary" size="sm" className="w-full mt-2">
              Manage Access & Registrations
            </Button>
          </Link>
        </div>

        {/* Retests & Security Violations Card */}
        <div className="basic-card p-6 space-y-4 hover:border-blue-400 dark:hover:border-blue-600">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 rounded-xl w-fit text-blue-600 dark:text-blue-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Violations & Retests</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Monitor anti-cheating audit logs, tab switch events, terminated attempts, and grant/deny retest permissions.
          </p>
          <Link to="/admin/quizzes">
            <Button variant="secondary" size="sm" className="w-full mt-2">
              View Audit & Retests
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

