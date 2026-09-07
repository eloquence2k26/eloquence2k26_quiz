import express from 'express';
import { 
  getAllUsers, 
  createUser, 
  bulkCreateUsers, 
  updateUser, 
  toggleUserStatus, 
  deleteUser 
} from '../controllers/userController.js';

const router = express.Router();

// GET /api/users - Fetch all users
router.get('/', getAllUsers);

// POST /api/users - Create single user
router.post('/', createUser);

// POST /api/users/bulk - Bulk import users
router.post('/bulk', bulkCreateUsers);

// PUT /api/users/:id - Update user details
router.put('/:id', updateUser);

// PATCH /api/users/:id/status - Quick status toggle
router.patch('/:id/status', toggleUserStatus);

// DELETE /api/users/:id - Delete user
router.delete('/:id', deleteUser);

export default router;
