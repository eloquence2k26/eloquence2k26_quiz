import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Search, Filter } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { formatDateTime } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function ViolationsPage() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await adminService.getViolations();
      if (res.success) {
        setViolations(res.data || []);
      }
    } catch (e) {
      console.error('Error loading violations:', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading text="Loading security logs & proctoring anomalies..." />;

  let filtered = violations;
  if (filterType !== 'ALL') {
    filtered = filtered.filter((v) => v.violation_type === filterType);
  }
  if (filterSeverity !== 'ALL') {
    filtered = filtered.filter((v) => v.severity === filterSeverity);
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((v) =>
      v.participant_name.toLowerCase().includes(term) ||
      v.participant_code.toLowerCase().includes(term) ||
      v.violation_type.toLowerCase().includes(term) ||
      (v.description && v.description.toLowerCase().includes(term))
    );
  }

  const types = Array.from(new Set(violations.map((v) => v.violation_type).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Security Violations & Proctoring Audit
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Detailed immutable logs of fullscreen exits, tab switches, and suspicious activity
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by participant, ID, or violation..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="ALL">All Violation Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="ALL">All Severities</option>
          <option value="HIGH">High Severity</option>
          <option value="MEDIUM">Medium Severity</option>
          <option value="LOW">Low Severity</option>
        </select>
      </div>

      {/* Violations Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Quiz Examination</th>
                <th className="py-3 px-4">Violation Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Description & Heuristic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No security violations logged. Proctoring engine is reporting all clear.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {formatDateTime(v.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{v.participant_name}</p>
                      <p className="text-[10px] text-brand-600 font-mono">{v.participant_code}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                      {v.quiz_title}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {v.violation_type}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={v.severity === 'HIGH' ? 'danger' : v.severity === 'MEDIUM' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {v.severity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-md truncate">
                      {v.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
