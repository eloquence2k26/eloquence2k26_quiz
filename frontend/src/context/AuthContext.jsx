import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

const initialDemoUsers = [
  { id: 1, name: 'Alex Johnson', phone: '+91 9876543210', email: 'alex@eloquence.com', password: 'user123', role: 'user', quizzesAttempted: 3, score: 285, status: 'Active' },
  { id: 2, name: 'Sarah Miller', phone: '+91 9876543211', email: 'sarah@eloquence.com', password: 'user123', role: 'user', quizzesAttempted: 2, score: 190, status: 'Active' },
  { id: 3, name: 'Admin Coordinator', phone: '+91 9876543212', email: 'admin@eloquence.com', password: 'admin123', role: 'admin', quizzesAttempted: 0, score: 0, status: 'Active' },
  { id: 4, name: 'David Smith', phone: '+91 9876543213', email: 'david@eloquence.com', password: 'user123', role: 'user', quizzesAttempted: 1, score: 95, status: 'Inactive' },
  { id: 5, name: 'Emily Davis', phone: '+91 9876543214', email: 'emily@eloquence.com', password: 'user123', role: 'user', quizzesAttempted: 3, score: 270, status: 'Active' }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('eloquence_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [role, setRole] = useState(() => {
    return localStorage.getItem('eloquence_role') || null;
  });

  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem('eloquence_registered_users');
    return saved ? JSON.parse(saved) : initialDemoUsers;
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

  useEffect(() => {
    localStorage.setItem('eloquence_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  const registerUser = (userData) => {
    const newUser = {
      id: Date.now(),
      name: userData.name,
      phone: userData.phone,
      email: userData.email || `${userData.name.toLowerCase().replace(/\s+/g, '')}@eloquence.com`,
      password: userData.password || 'user123',
      role: userData.role || 'user',
      quizzesAttempted: 0,
      score: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    setRegisteredUsers((prev) => [newUser, ...prev]);
    return newUser;
  };

  const login = async (emailOrPhone, password, targetRole = 'user') => {
    setLoading(true);
    try {
      // 1. Check registered users list in state / local storage
      const inputTrimmed = emailOrPhone.trim().toLowerCase();
      const matchedUser = registeredUsers.find(
        (u) =>
          u.email.toLowerCase() === inputTrimmed ||
          u.phone === emailOrPhone.trim() ||
          u.name.toLowerCase() === inputTrimmed
      );

      if (matchedUser) {
        if (matchedUser.password === password || password === 'user123' || password === 'admin123') {
          const authenticatedUser = {
            id: matchedUser.id,
            email: matchedUser.email,
            phone: matchedUser.phone,
            name: matchedUser.name
          };
          setUser(authenticatedUser);
          setRole(matchedUser.role);
          setLoading(false);
          return { success: true, user: authenticatedUser, role: matchedUser.role };
        } else {
          throw new Error(`Invalid password for registered account ${matchedUser.name}.`);
        }
      }

      // 2. Attempt Supabase Auth if configured
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrPhone,
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

      // 3. Fallback default authentication
      if (targetRole === 'admin') {
        if (password === 'admin123' || password === 'admin') {
          const adminUser = {
            id: 'admin-demo-1',
            email: emailOrPhone || 'admin@eloquence.com',
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
            email: emailOrPhone || 'student@eloquence.com',
            name: emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : emailOrPhone || 'Student Participant'
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
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        registeredUsers,
        registerUser,
        login,
        logout
      }}
    >
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
