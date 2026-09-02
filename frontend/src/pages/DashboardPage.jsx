import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  HelpCircle, 
  CheckCircle2, 
  PlusCircle, 
  ArrowRight, 
  Trophy,
  BookOpen,
  Clock
} from 'lucide-react';
import { Button } from '../components/Button';

export const DashboardPage = () => {
  const { user } = useAuth();

  const dummyQuizzes = [
    {
      id: 1,
      title: 'Eloquence Technical Quiz 2026',
      category: 'General Technology',
      questions: 15,
      duration: '20 mins',
      status: 'Active'
    },
    {
      id: 2,
      title: 'Web Architecture & APIs',
      category: 'Software Engineering',
      questions: 10,
      duration: '15 mins',
      status: 'Active'
    },
    {
      id: 3,
      title: 'Logic & Quantitative Aptitude',
      category: 'Aptitude',
      questions: 20,
      duration: '25 mins',
      status: 'Completed'
    }
  ];

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Banner Header */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <LayoutDashboard className="w-3.5 h-3.5" /> Portal Overview
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back, {user?.name || 'Participant'} 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">Here is your current quiz platform status and quick actions.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/add-question">
              <Button icon={PlusCircle} variant="primary">
                Add Question
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1">
              <span className="text-xs font-semibold uppercase">Active Quizzes</span>
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">3 Live</span>
          </div>

          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1">
              <span className="text-xs font-semibold uppercase">Question Bank</span>
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">45 Items</span>
          </div>

          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1">
              <span className="text-xs font-semibold uppercase">Total Users</span>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">142 Users</span>
          </div>

          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-1">
              <span className="text-xs font-semibold uppercase">Attempts</span>
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">289 Done</span>
          </div>
        </div>
      </section>

      {/* Active Quizzes Overview */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Active Quiz Rounds
          </h3>
          <Link to="/users" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1">
            Manage Users <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dummyQuizzes.map((quiz) => (
            <div key={quiz.id} className="basic-card p-6 transition-all flex flex-col justify-between space-y-4 hover:border-blue-400 dark:hover:border-blue-600">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {quiz.category}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" /> {quiz.duration}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{quiz.title}</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Test your technical knowledge in round {quiz.id}.</p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">{quiz.questions} Questions</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {quiz.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
