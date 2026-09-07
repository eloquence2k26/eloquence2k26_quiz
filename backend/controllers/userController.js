import crypto from 'crypto';
import { 
  getUsersFromDB, 
  insertUserToDB, 
  bulkInsertUsersToDB, 
  updateUserInDB, 
  deleteUserFromDB 
} from '../config/db.js';

// Helper to derive default password: first 4 digits of phone number
const derivePassword = (phone, fallbackPassword) => {
  if (fallbackPassword && fallbackPassword !== 'user123') {
    return fallbackPassword;
  }
  if (!phone) return '1234';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? digits.substring(0, 4) : (digits || '1234');
};

// GET /api/users - Fetch all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await getUsersFromDB();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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

// POST /api/users - Create single user

export const createUser = async (req, res) => {
  try {
    const { id, name, phone, email, password, role, status } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and Phone number are required' });
    }

    const calculatedPassword = derivePassword(phone, password);
    const userRole = role || 'user';
    const userStatus = status || 'Active';
    const userEmail = email || `${name.toLowerCase().replace(/\s+/g, '')}@eloquence.com`;

    // Ensure valid UUID format for Supabase compatibility
    const isValidUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const userId = isValidUUID ? id : generateUUID();

    const newUser = {
      id: userId,
      name,
      phone,
      email: userEmail,
      password: calculatedPassword,
      role: userRole,
      status: userStatus,
      quizzes_attempted: 0,
      score: 0,
      created_at: new Date().toISOString()
    };

    const savedUser = await insertUserToDB(newUser);
    res.status(201).json({ success: true, user: savedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/bulk - Bulk import users
export const bulkCreateUsers = async (req, res) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'A non-empty array of users is required' });
    }

    const preparedUsers = users.map((u) => {
      const calculatedPassword = derivePassword(u.phone, u.password);
      const userEmail = u.email || `${(u.name || 'user').toLowerCase().replace(/\s+/g, '')}@eloquence.com`;
      const isValidUUID = u.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id);
      return {
        id: isValidUUID ? u.id : generateUUID(),
        name: u.name || 'Participant',
        phone: u.phone || '0000000000',
        email: userEmail,
        password: calculatedPassword,
        role: u.role || 'user',
        status: u.status || 'Active',
        quizzes_attempted: u.quizzes_attempted || 0,
        score: u.score || 0,
        created_at: new Date().toISOString()
      };
    });

    const mergedUsers = await bulkInsertUsersToDB(preparedUsers);
    res.status(201).json({ success: true, count: preparedUsers.length, users: mergedUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id - Update user details
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, password, role, status } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) {
      updates.phone = phone;
      if (!password) {
        updates.password = derivePassword(phone);
      }
    }
    if (email !== undefined) updates.email = email;
    if (password !== undefined) updates.password = password;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    const updatedUser = await updateUserInDB(id, updates);
    if (updatedUser) {
      return res.json({ success: true, user: updatedUser });
    }

    res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/users/:id/status - Quick status toggle
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'Valid status ("Active" or "Inactive") is required' });
    }

    const updatedUser = await updateUserInDB(id, { status });
    if (updatedUser) {
      return res.json({ success: true, user: updatedUser });
    }

    res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/:id - Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUserFromDB(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
