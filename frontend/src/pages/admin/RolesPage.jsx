import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  KeyRound,
  Users,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function RolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await adminService.getRoles();
      if (res.success && res.data) {
        setRoles(res.data);
      }
      if (isManual) toast.success('Roles and permissions refreshed');
    } catch (err) {
      toast.error('Failed to load roles: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <Loading text="Loading authorization roles & permissions..." />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Roles & Permissions Hierarchy
            </h1>
            <button
              type="button"
              onClick={() => fetchRoles(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              title="Refresh Roles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Role-based access control (RBAC) tiers, operational privileges, and security boundaries
          </p>
        </div>
      </div>

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-brand-300 dark:hover:border-brand-800 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${role.color} text-white flex items-center justify-center shadow-md shadow-brand-500/20`}>
                  <Shield className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {role.badge}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-3 font-mono">
                {role.name}
              </h2>
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                {role.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {role.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Privileges & Scope
              </span>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions?.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>{p}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
