import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, BookOpen, Clock, CheckCircle2, ArrowRight, Award } from 'lucide-react';
import { Button } from '../components/Button';

export const UserDashboard = () => {
  const { user } = useAuth();

  const dummyQuizzes = [
    {
      id: 1,
      title: 'Eloquence Technical Quiz 2026',
      category: 'General Technology',
      questions: 15,
      duration: '20 mins',
      difficulty: 'Medium',
      status: 'Available'
    },
    {
      id: 2,
      title: 'Web Architecture & APIs',
      category: 'Software Engineering',
      questions: 10,
      duration: '15 mins',
      difficulty: 'Hard',
      status: 'Available'
    },
    {
      id: 3,
      title: 'Logic & Quantitative Aptitude',
      category: 'Aptitude',
      questions: 20,
      duration: '25 mins',
      difficulty: 'Easy',
      status: 'Completed'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Student Welcome Banner */}
      <section className="basic-card p-6 sm:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5" /> Student Dashboard
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back, {user?.name || user?.email} 👋
            </h2>
            <p className="text-slate-600 dark:text-zinc-400 text-sm mt-1">Ready to showcase your knowledge in the Eloquence 2K26 competition?</p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-zinc-900/90 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Your Rank</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">#4 in Leaderboard</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Quizzes Attended</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">1 / 3</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Total Points</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">185 pts</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Accuracy</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">92%</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Certificates</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">1 Earned</span>
          </div>
        </div>
      </section>

      {/* Available Quizzes */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Active Quiz Rounds
          </h3>
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">3 Rounds Total</span>
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
                <p className="text-xs text-slate-500 dark:text-zinc-400">Test your skills in modern technical concepts.</p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">{quiz.questions} Questions</span>
                <Button 
                  size="sm" 
                  variant={quiz.status === 'Completed' ? 'secondary' : 'primary'}
                  disabled={quiz.status === 'Completed'}
                  icon={quiz.status === 'Completed' ? CheckCircle2 : ArrowRight}
                >
                  {quiz.status === 'Completed' ? 'Completed' : 'Attempt Now'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
