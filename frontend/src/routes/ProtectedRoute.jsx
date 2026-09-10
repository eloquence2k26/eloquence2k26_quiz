import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Verifying credentials..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If Admin/Staff trying to access Participant page -> go to Admin Dashboard
    if (user.role !== 'PARTICIPANT') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // If Participant trying to access Admin page -> go to Participant Dashboard
    return <Navigate to="/participant/dashboard" replace />;
  }

  return <Outlet />;
}
