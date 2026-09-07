import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, BookOpen, Clock, CheckCircle2, ArrowRight, Award, PlayCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { API_PARTICIPANT_URL } from '../config/apiConfig';

export const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState({
    attendedCount: 0,
    totalQuizzesCount: 0,
    totalScore: 0,
    accuracy: 0,
    certificates: 0,
    rank: 'Unranked'
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Real-time synchronization ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-user-id': user?.id || user?.email || 'user-demo-1' };
      const [qRes, sRes] = await Promise.all([
        fetch(`${API_PARTICIPANT_URL}/quizzes`, { headers }),
        fetch(`${API_PARTICIPANT_URL}/stats`, { headers })
      ]);

      let fetchedQuizzes = [];
      if (qRes.ok) {
        const qData = await qRes.json();
        fetchedQuizzes = qData.quizzes || [];
        setQuizzes(fetchedQuizzes);
      }

      if (sRes.ok) {
        const sData = await sRes.json();
        setStats({
          attendedCount: sData.attendedCount || 0,
          totalQuizzesCount: sData.totalQuizzesCount || fetchedQuizzes.length,
          totalScore: sData.totalScore || 0,
          accuracy: sData.accuracy || 0,
          certificates: sData.certificates || 0,
          rank: sData.rank || 'Unranked'
        });
      }
    } catch (err) {
      console.error('Fetch student dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

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
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {stats.rank === 'Unranked' ? 'Unranked' : `${stats.rank} in Leaderboard`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid with Real Live DB Data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Quizzes Attended</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.attendedCount} / {Math.max(stats.totalQuizzesCount, quizzes.length)}
            </span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Total Points</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalScore} pts</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Accuracy</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.accuracy}%</span>
          </div>
          <div className="bg-slate-50/80 dark:bg-zinc-900/90 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Certificates</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.certificates} Earned</span>
          </div>
        </div>
      </section>

      {/* Real Assigned Active Quizzes */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Active Quiz Rounds
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              {quizzes.length} Round(s) Assigned
            </span>
            <button
              onClick={fetchDashboardData}
              className="p-1.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Refresh Quizzes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-zinc-400 text-sm font-semibold">
            Loading your assigned symposium quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
              No event quizzes assigned to your account yet.
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              When an administrator grants you access to a quiz, it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const startDate = new Date(quiz.start_date_time);
              const endDate = new Date(quiz.end_date_time);

              const isUpcoming = now < startDate;
              const isClosed = now > endDate;
              const isLive = !isUpcoming && !isClosed;
              const isCompleted = quiz.accessStatus === 'completed' && !quiz.approvedRetest;

              return (
                <div key={quiz.id} className="basic-card p-6 transition-all flex flex-col justify-between space-y-4 hover:border-blue-400 dark:hover:border-blue-600">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {quiz.category || 'General Technology'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5" /> {quiz.duration} Mins
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{quiz.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                      {quiz.description || 'Eloquence 2K26 Technical Symposium Quiz'}
                    </p>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Start Time:</span>
                        <strong className="text-slate-800 dark:text-zinc-200">
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({startDate.toLocaleDateString()})
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Total Qs:</span>
                        <strong className="text-slate-800 dark:text-zinc-200">
                          {quiz.total_questions || quiz.questions_count} Questions
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                      {quiz.marks_per_question || 1} mark/qn
                    </span>

                    {isUpcoming ? (
                      <Button size="sm" variant="secondary" disabled className="text-[11px]">
                        Starts {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Button>
                    ) : isClosed ? (
                      <Button size="sm" variant="secondary" disabled className="text-[11px]">
                        Expired
                      </Button>
                    ) : isCompleted ? (
                      <Button size="sm" variant="secondary" disabled icon={CheckCircle2} className="text-[11px]">
                        Completed
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={PlayCircle}
                        className="text-[11px]"
                        onClick={() => navigate('/participant/quizzes')}
                      >
                        Attempt Now
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
