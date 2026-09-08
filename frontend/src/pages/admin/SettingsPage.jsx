import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Monitor, Save, Sparkles } from 'lucide-react';
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

  useEffect(() => {
    fetchSettings();
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Examination & Proctoring Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Global symposium parameters, anti-cheating thresholds, and result visibility controls
        </p>
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
