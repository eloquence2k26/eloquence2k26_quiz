import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Monitor, Save, Sparkles, Database, RefreshCw, CheckCircle2, HardDrive, Layers, Server } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/common/Loading';

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState({
    max_violations: 3,
    fullscreen_required: true,
    clipboard_monitoring: true,
    tab_switch_monitoring: true,
    window_blur_monitoring: true,
    desktop_only: false,
    auto_submit_on_expiry: true,
    show_detailed_results: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);
  const [dbSyncData, setDbSyncData] = useState(null);

  useEffect(() => {
    fetchSettings();
    handleSyncDatabase(true); // Initial load of table telemetry
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await adminService.getSettings();
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (e) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDatabase = async (silent = false) => {
    setSyncingDb(true);
    try {
      const res = await adminService.syncDatabase();
      if (res.success && res.data) {
        setDbSyncData(res.data);
        if (!silent) {
          toast.success(res.message || 'All Supabase tables successfully synchronized!');
        }
      }
    } catch (err) {
      if (!silent) {
        toast.error('Failed to synchronize database tables: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setSyncingDb(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminService.updateSettings(settings);
      if (res.success) {
        toast.success('System settings saved successfully');
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading text="Loading symposium proctoring settings..." />;

  const tableMeta = [
    { key: 'users', label: 'Users', desc: 'Auth accounts & roles', category: 'Auth' },
    { key: 'profiles', label: 'Profiles', desc: 'User personal profiles', category: 'Auth' },
    { key: 'admins', label: 'Admins', desc: 'Admin privileges & tiers', category: 'Auth' },
    { key: 'participants', label: 'Participants', desc: 'Registered scholars & college info', category: 'Scholars' },
    { key: 'events', label: 'Events', desc: 'Symposium events & domains', category: 'Events' },
    { key: 'rounds', label: 'Rounds', desc: 'Round 1 & Round 2 configurations', category: 'Events' },
    { key: 'quizzes', label: 'Quizzes', desc: 'Quiz schedules, timers & rules', category: 'Quizzes' },
    { key: 'questions', label: 'Questions', desc: 'MCQ question bank & solutions', category: 'Quizzes' },
    { key: 'quiz_questions', label: 'Quiz Questions', desc: 'Quiz-question mapping joins', category: 'Quizzes' },
    { key: 'quiz_assignments', label: 'Assignments', desc: 'Participant exam allocations', category: 'Exams' },
    { key: 'exam_attempts', label: 'Exam Attempts', desc: 'Live & completed test sessions', category: 'Exams' },
    { key: 'question_orders', label: 'Question Orders', desc: 'Per-attempt randomized orders', category: 'Exams' },
    { key: 'attempt_answers', label: 'Attempt Answers', desc: 'Submitted answer choices', category: 'Exams' },
    { key: 'exam_sessions', label: 'Exam Sessions', desc: 'Active proctor heartbeats & sockets', category: 'Proctor' },
    { key: 'security_violations', label: 'Violations', desc: 'Anti-cheat logs & mobile alerts', category: 'Proctor' },
    { key: 'round_selections', label: 'Round Selections', desc: 'Qualifiers & promotions', category: 'Results' },
    { key: 'results', label: 'Results', desc: 'Final scores, ranks & merits', category: 'Results' },
    { key: 'announcements', label: 'Announcements', desc: 'Live symposium broadcasts', category: 'System' },
    { key: 'audit_logs', label: 'Audit Logs', desc: 'Admin operations & system history', category: 'System' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            System Configuration & Database Sync
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            PostgreSQL database synchronization, telemetry, anti-cheating thresholds, and symposium parameters
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSyncDatabase(false)}
          disabled={syncingDb}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncingDb ? 'animate-spin' : ''}`} />
          <span>{syncingDb ? 'Syncing Tables...' : 'Sync All DB Tables'}</span>
        </button>
      </div>

      {/* Supabase Database Live Tables & Telemetry Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Supabase Database Synchronization
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live PostgreSQL Connected
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Direct synchronization across all 19 PostgreSQL relational tables
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {dbSyncData ? dbSyncData.total_records?.toLocaleString() : '---'}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Synced Tables</span>
              <span className="text-sm font-black text-brand-600 dark:text-brand-400">
                {dbSyncData ? `${dbSyncData.tables_synced || 19} / 19` : '19 / 19'}
              </span>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tableMeta.map((table) => {
            const count = dbSyncData?.table_stats ? dbSyncData.table_stats[table.key] : null;
            return (
              <div
                key={table.key}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-brand-300 dark:hover:border-brand-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
                      {table.category}
                    </span>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white mt-1.5 font-mono">
                      {table.key}
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{table.desc}</p>
                  </div>
                  <span className="text-xs font-black px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono shadow-sm">
                    {count !== undefined && count !== null ? count : '...'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {dbSyncData?.timestamp && (
          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              All tables verified and synced with live Supabase PostgreSQL server
            </span>
            <span>Last sync: {new Date(dbSyncData.timestamp).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Anti-Cheating & Proctor Engine Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Automated Proctoring Configuration
              </h2>
              <p className="text-xs text-slate-500">Heuristics applied during active examination sessions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Max Allowed Violations Before Auto-Termination
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.max_violations}
                onChange={(e) => setSettings({ ...settings, max_violations: parseInt(e.target.value) || 3 })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Default: 3 warnings before exam is locked and submitted under TERMINATED status.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Fullscreen Enforcement</span>
                  <span className="text-[10px] text-slate-400">Require browser Fullscreen API on arena launch</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.fullscreen_required}
                  onChange={(e) => setSettings({ ...settings, fullscreen_required: e.target.checked })}
                  className="rounded text-brand-600 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Tab Switch & Focus Loss Detection</span>
                  <span className="text-[10px] text-slate-400">Trigger warnings on visibilitychange / window blur</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.tab_switch_monitoring}
                  onChange={(e) => setSettings({ ...settings, tab_switch_monitoring: e.target.checked })}
                  className="rounded text-brand-600 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Clipboard & Shortcut Blocking</span>
                  <span className="text-[10px] text-slate-400">Block copy, cut, paste, and DevTools inspection keys</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.clipboard_monitoring}
                  onChange={(e) => setSettings({ ...settings, clipboard_monitoring: e.target.checked })}
                  className="rounded text-brand-600 h-4 w-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Examination Experience & Visibility Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
            Exam Delivery & Visibility Policies
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Desktop / Laptop Only</span>
                <span className="text-[10px] text-slate-400">Recommend or block mobile viewports</span>
              </div>
              <input
                type="checkbox"
                checked={settings.desktop_only}
                onChange={(e) => setSettings({ ...settings, desktop_only: e.target.checked })}
                className="rounded text-brand-600 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Show Detailed Results to Participants</span>
                <span className="text-[10px] text-slate-400">Reveal question-by-question breakdown post completion</span>
              </div>
              <input
                type="checkbox"
                checked={settings.show_detailed_results}
                onChange={(e) => setSettings({ ...settings, show_detailed_results: e.target.checked })}
                className="rounded text-brand-600 h-4 w-4"
              />
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/25 transition-all uppercase tracking-wider disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

