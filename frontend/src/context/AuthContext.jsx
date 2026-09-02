import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('eloquence_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [role, setRole] = useState(() => {
    return localStorage.getItem('eloquence_role') || null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && role) {
      localStorage.setItem('eloquence_user', JSON.stringify(user));
      localStorage.setItem('eloquence_role', role);
    } else {
      localStorage.removeItem('eloquence_user');
      localStorage.removeItem('eloquence_role');
    }
  }, [user, role]);

  const login = async (email, password, targetRole = 'user') => {
    setLoading(true);
    try {
      // 1. Attempt Supabase Auth if credentials match or are provided
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error && data?.user) {
          const authUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || (targetRole === 'admin' ? 'Admin User' : 'Student Participant')
          };
          setUser(authUser);
          setRole(targetRole);
          setLoading(false);
          return { success: true, user: authUser, role: targetRole };
        }
      }

      // 2. Demo fallback authentication for instant testing & development
      if (targetRole === 'admin') {
        if (password === 'admin123' || password === 'admin') {
          const adminUser = {
            id: 'admin-demo-1',
            email: email || 'admin@eloquence.com',
            name: 'Administrator'
          };
          setUser(adminUser);
          setRole('admin');
          setLoading(false);
          return { success: true, user: adminUser, role: 'admin' };
        } else {
          throw new Error('Invalid Admin password. (Demo Admin Password: admin123)');
        }
      } else {
        if (password === 'user123' || password === '123456' || password.length >= 6) {
          const studentUser = {
            id: 'user-demo-1',
            email: email || 'student@eloquence.com',
            name: email.split('@')[0] || 'Student Participant'
          };
          setUser(studentUser);
          setRole('user');
          setLoading(false);
          return { success: true, user: studentUser, role: 'user' };
        } else {
          throw new Error('Password must be at least 6 characters. (Demo Student Password: user123)');
        }
      }
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
