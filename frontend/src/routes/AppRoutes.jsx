import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import ParticipantLayout from '../layouts/ParticipantLayout';
import ExamLayout from '../layouts/ExamLayout';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';

// Participant Pages
import ParticipantDashboard from '../pages/participant/ParticipantDashboard';
import AvailableQuizzesPage from '../pages/participant/AvailableQuizzesPage';
import RoundStatusPage from '../pages/participant/RoundStatusPage';
import ResultsHistoryPage from '../pages/participant/ResultsHistoryPage';

// Exam Arena Pages
import ExamInstructionsPage from '../pages/exam/ExamInstructionsPage';
import ExamArenaPage from '../pages/exam/ExamArenaPage';
import ExamSubmittedPage from '../pages/exam/ExamSubmittedPage';
import ExamTerminatedPage from '../pages/exam/ExamTerminatedPage';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import ParticipantsPage from '../pages/admin/ParticipantsPage';
import UserRegistrationPage from '../pages/admin/UserRegistrationPage';
import QuizzesPage from '../pages/admin/QuizzesPage';
import QuestionsPage from '../pages/admin/QuestionsPage';
import QuizSchedulePage from '../pages/admin/QuizSchedulePage';
import LiveExamsPage from '../pages/admin/LiveExamsPage';
import ResultsPage from '../pages/admin/ResultsPage';
import RoundSelectionPage from '../pages/admin/RoundSelectionPage';
import RoundsPage from '../pages/admin/RoundsPage';
import AnnouncementsPage from '../pages/admin/AnnouncementsPage';
import ViolationsPage from '../pages/admin/ViolationsPage';
import ReportsPage from '../pages/admin/ReportsPage';
import SettingsPage from '../pages/admin/SettingsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes - Registration only handled via Admin portal */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Participant Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['PARTICIPANT']} />}>
        <Route element={<ParticipantLayout />}>
          <Route path="/participant/dashboard" element={<ParticipantDashboard />} />
          <Route path="/participant/quizzes" element={<AvailableQuizzesPage />} />
          <Route path="/participant/round-status" element={<RoundStatusPage />} />
          <Route path="/participant/results" element={<ResultsHistoryPage />} />
        </Route>

        {/* Examination Arena */}
        <Route element={<ExamLayout />}>
          <Route path="/exam/instructions/:quizId" element={<ExamInstructionsPage />} />
          <Route path="/exam/arena/:quizId" element={<ExamArenaPage />} />
          <Route path="/exam/submitted/:attemptId" element={<ExamSubmittedPage />} />
          <Route path="/exam/terminated/:quizId" element={<ExamTerminatedPage />} />
        </Route>
      </Route>

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/participants" element={<ParticipantsPage />} />
          <Route path="/admin/user-register" element={<UserRegistrationPage />} />
          <Route path="/admin/register-participants" element={<UserRegistrationPage />} />
          <Route path="/admin/quizzes" element={<QuizzesPage />} />
          <Route path="/admin/questions" element={<QuestionsPage />} />
          <Route path="/admin/schedule" element={<QuizSchedulePage />} />
          <Route path="/admin/live-exams" element={<LiveExamsPage />} />
          <Route path="/admin/results" element={<ResultsPage />} />
          <Route path="/admin/round-selection" element={<RoundSelectionPage />} />
          <Route path="/admin/rounds" element={<RoundsPage />} />
          <Route path="/admin/second-round" element={<Navigate to="/admin/rounds" replace />} />
          <Route path="/admin/announcements" element={<AnnouncementsPage />} />
          <Route path="/admin/violations" element={<ViolationsPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Route Aliases */}
      <Route path="/dashboard" element={<Navigate to="/participant/dashboard" replace />} />
      <Route path="/quizzes" element={<Navigate to="/participant/quizzes" replace />} />
      <Route path="/results" element={<Navigate to="/participant/results" replace />} />
      <Route path="/round-status" element={<Navigate to="/participant/round-status" replace />} />

      {/* Root redirection */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
