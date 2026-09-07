import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { AdminQuizManagement } from './pages/AdminQuizManagement';
import { NextRoundFilterPage } from './pages/NextRoundFilterPage';
import { RestartTestPage } from './pages/RestartTestPage';
import { ParticipantQuizzesPage } from './pages/ParticipantQuizzesPage';
import { StrictQuizInterface } from './pages/StrictQuizInterface';
import { ScheduleEventsPage } from './pages/ScheduleEventsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50/70 dark:bg-black text-slate-900 dark:text-white transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}

function App() {
  const { user, role } = useAuth();

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Main Authenticated Layout Routes with Sidebar */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Protected Routes */}
      <Route
        path="/admin/quizzes"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <AdminQuizManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/next-round-filter"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <NextRoundFilterPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/restart-test"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <RestartTestPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/retests"
        element={<Navigate to="/admin/restart-test" replace />}
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Participant Protected Routes */}
      <Route
        path="/participant/quizzes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ParticipantQuizzesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Schedule Management Route */}
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ScheduleEventsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy route redirects to consolidated quiz management */}
      <Route
        path="/event-quiz"
        element={<Navigate to={role === 'admin' ? "/admin/quizzes" : "/participant/quizzes"} replace />}
      />
      <Route
        path="/quiz-schedule"
        element={<Navigate to="/schedule" replace />}
      />
      <Route
        path="/add-question"
        element={<Navigate to={role === 'admin' ? "/admin/quizzes" : "/participant/quizzes"} replace />}
      />

      {/* Strict Quiz Execution Player */}
      <Route
        path="/quiz-take/:id"
        element={
          <ProtectedRoute>
            <StrictQuizInterface />
          </ProtectedRoute>
        }
      />

      {/* Fallback Redirect */}
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;

