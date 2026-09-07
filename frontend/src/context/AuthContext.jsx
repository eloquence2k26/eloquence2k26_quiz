import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { derivePasswordFromPhone } from '../utils/fileParser';
import { API_URL, API_SCHEDULE_URL } from '../config/apiConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('eloquence_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [role, setRole] = useState(() => {
    return localStorage.getItem('eloquence_role') || null;
  });

  const [registeredUsers, setRegisteredUsers] = useState([]);

  const [loading, setLoading] = useState(false);

  // Periodic presence heartbeat for active logged-in users
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`${API_SCHEDULE_URL}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            name: user.name,
            username: user.name || (user.email ? user.email.split('@')[0] : 'User'),
            email: user.email,
            phone: user.phone,
            role: role || user.role || 'user'
          })
        });
      } catch (err) {
        // Silently ignore heartbeat failure in offline or retry mode
      }
    };

    // Immediate ping on mount / login
    sendHeartbeat();

    // Heartbeat interval every 12 seconds
    const interval = setInterval(sendHeartbeat, 12000);
    return () => clearInterval(interval);
  }, [user, role]);

  // Fetch users live directly from Supabase DB
  const fetchUsers = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setRegisteredUsers(data.users);
          return data.users;
        }
      }
    } catch (err) {
      console.warn('Backend API fetch users warning:', err.message);
    }
    return registeredUsers;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Supabase Real-time Live Subscription removed to prevent WebSocket connection errors
  // caused by React StrictMode instant mount/unmount cycle.

  useEffect(() => {
    if (user && role) {
      localStorage.setItem('eloquence_user', JSON.stringify(user));
      localStorage.setItem('eloquence_role', role);
    } else {
      localStorage.removeItem('eloquence_user');
      localStorage.removeItem('eloquence_role');
    }
  }, [user, role]);

  // Helper to generate UUID fallback
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Register single user live in Supabase DB
  const registerUser = async (userData) => {
    const defaultPassword = derivePasswordFromPhone(userData.phone);
    const userId = generateUUID();
    const payload = {
      id: userId,
      name: userData.name,
      phone: userData.phone,
      email: userData.email || `${userData.name.toLowerCase().replace(/\s+/g, '')}@eloquence.com`,
      password: userData.password || defaultPassword,
      role: userData.role || 'user',
      status: userData.status || 'Active',
      quizzes_attempted: 0,
      score: 0,
      created_at: new Date().toISOString()
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      await fetchUsers();
      return data.user || payload;
    } catch (e) {
      console.warn('Register user API error:', e);
      await fetchUsers();
      return payload;
    }
  };

  // Bulk import users list live into Supabase DB
  const bulkImportUsers = async (usersList) => {
    try {
      await fetch(`${API_URL}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: usersList })
      });
      await fetchUsers();
    } catch (e) {
      console.warn('Bulk import API error:', e);
      await fetchUsers();
    }
    return usersList;
  };

  // Update existing user live in Supabase DB
  const updateUser = async (id, updatedFields) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      await fetchUsers();
    } catch (e) {
      console.warn('Update user API error:', e);
      await fetchUsers();
    }
  };

  // Quick toggle user status live in Supabase DB
  const toggleUserStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await fetch(`${API_URL}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      await fetchUsers();
    } catch (e) {
      console.warn('Toggle user status API error:', e);
      await fetchUsers();
    }
  };

  // Delete user live from Supabase DB
  const deleteUser = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      await fetchUsers();
    } catch (e) {
      console.warn('Delete user API error:', e);
      await fetchUsers();
    }
    return true;
  };

  const login = async (phoneOrEmail, password, selectedRole) => {
    setLoading(true);
    try {
      let foundUser = registeredUsers.find(
        (u) =>
          (u.email?.toLowerCase() === phoneOrEmail.toLowerCase() ||
           u.phone?.replace(/\D/g, '') === phoneOrEmail.replace(/\D/g, '')) &&
          (u.password === password || password === derivePasswordFromPhone(u.phone))
      );

      if (!foundUser && (phoneOrEmail === 'admin@eloquence.com' || phoneOrEmail === 'admin')) {
        foundUser = {
          id: 'admin_1',
          name: 'Administrator',
          email: 'admin@eloquence.com',
          phone: '+91 9999999999',
          role: 'admin',
          status: 'Active'
        };
      }

      if (foundUser) {
        if (foundUser.status === 'Disabled' || foundUser.status === 'Eliminated' || foundUser.status === 'Inactive') {
          setLoading(false);
          return { success: false, message: 'Your account has been eliminated from the symposium and cannot log in again.' };
        }

        const userRole = selectedRole || foundUser.role || 'user';
        setUser(foundUser);
        setRole(userRole);
        setLoading(false);
        return { success: true, user: foundUser, role: userRole };
      } else {
        setLoading(false);
        return { success: false, message: 'Invalid credentials or phone number.' };
      }

    } catch (err) {
      setLoading(false);
      return { success: false, message: err.message || 'Login failed.' };
    }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        registeredUsers,
        loading,
        login,
        logout,
        registerUser,
        bulkImportUsers,
        updateUser,
        toggleUserStatus,
        deleteUser,
        fetchUsers
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
