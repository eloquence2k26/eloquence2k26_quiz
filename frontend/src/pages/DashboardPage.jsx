import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { UserDashboard } from './UserDashboard';

export const DashboardPage = () => {
  const { role } = useAuth();

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
};
