import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { Mail, Lock, Eye, EyeOff, Sparkles, User, AlertCircle, BrainCircuit } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('student@eloquence.com');
  const [password, setPassword] = useState('user123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fillDemoCredentials = () => {
    setEmail('student@eloquence.com');
    setPassword('user123');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password, 'user');
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/80 dark:bg-black transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 dark:shadow-[0_0_20px_rgba(37,99,235,0.4)] mb-1">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div className="inline-block">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Eloquence 2K26 Quiz
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Sign In to Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-normal">Enter your credentials to access the quiz portal</p>
        </div>

        {/* Card Container */}
        <div className="basic-card p-6 sm:p-8 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="student@eloquence.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
              autoComplete="email"
            />

            <Input
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              required
              autoComplete="current-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isSubmitting || authLoading}
              icon={User}
            >
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick Demo Fill Shortcut */}
          <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 space-y-3 text-center">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Quick Demo Credentials</p>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full py-2.5 bg-slate-50 hover:bg-blue-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 hover:text-blue-700 dark:text-zinc-200 dark:hover:text-blue-400 border border-slate-200 hover:border-blue-300 dark:border-zinc-800 dark:hover:border-blue-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <User className="w-4 h-4" /> Fill Demo Student Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
