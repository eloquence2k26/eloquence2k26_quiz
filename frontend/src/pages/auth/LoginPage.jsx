import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, UserCheck, Shield, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [loginType, setLoginType] = useState('PARTICIPANT'); // 'PARTICIPANT' | 'ADMIN'
  const [identifier, setIdentifier] = useState(''); // Email or Participant ID
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get('msg') === 'disabled' ? 'Your account has been disabled. Please contact symposium desk.' : ''
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const payload = {
        password,
        ...(identifier.includes('@') ? { email: identifier } : { participant_id: identifier })
      };

      const user = await login(payload);
      toast.success(`Welcome back, ${user.full_name}!`);

      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/participant/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid credentials';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role) => {
    if (role === 'ADMIN') {
      setLoginType('ADMIN');
      setIdentifier('admin@eloquence.com');
      setPassword('admin123');
    } else {
      setLoginType('PARTICIPANT');
      setIdentifier('alex.chen@university.edu');
      setPassword('participant123');
    }
  };

  return (
    <div className="space-y-6">
      {/* Login Role Toggle Tabs */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => {
            setLoginType('PARTICIPANT');
            setErrorMessage('');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            loginType === 'PARTICIPANT'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Participant</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginType('ADMIN');
            setErrorMessage('');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            loginType === 'ADMIN'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Admin Portal</span>
        </button>
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            {loginType === 'ADMIN' ? 'Admin Email Address' : 'Email or Participant ID'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={loginType === 'ADMIN' ? 'admin@eloquence.com' : 'e.g. alex.chen@university.edu or ELQ-2026-001'}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500 shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <span>Sign In to {loginType === 'ADMIN' ? 'Console' : 'Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Demo Credentials Quick Fill Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
          Quick Demo Credentials
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('ADMIN')}
            className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500"
          >
            Admin (admin@eloquence.com)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('PARTICIPANT')}
            className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500"
          >
            Participant (Alex Chen)
          </button>
        </div>
      </div>

      {/* Participant Registration Footer */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Not registered for the symposium quiz?{' '}
          <Link
            to="/register"
            className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
          >
            Register Here
          </Link>
        </p>
      </div>
    </div>
  );
}
