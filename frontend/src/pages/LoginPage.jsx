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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-950 transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-zinc-900 dark:bg-zinc-100 rounded-2xl shadow-lg mb-1">
            <BrainCircuit className="w-8 h-8 text-white dark:text-zinc-900" />
          </div>
          <div className="inline-block">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Eloquence 2K26 Quiz
            </div>
          </div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            Sign In to Account
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">Enter your credentials to access the quiz portal</p>
        </div>

        {/* Card Container */}
        <div className="glass-panel-light rounded-3xl p-6 sm:p-8 space-y-6 transition-all duration-200">
          {/* Error Alert */}
          {error && (
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 font-bold">
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
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1"
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
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 text-center">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Quick Demo Credentials</p>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <User className="w-4 h-4" /> Fill Demo Student Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
