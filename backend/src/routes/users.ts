import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserPermissions,
  getMyPermissions
} from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get current user's permissions
router.get('/me/permissions', getMyPermissions);

// Get all users (only buyers)
router.get('/', getUsers);

// Create new user (only buyers)
router.post('/', createUser);

// Get user permissions (only buyers)
router.get('/:userId/permissions', getUserPermissions);

// Update user (only buyers)
router.put('/:userId', updateUser);

// Delete user (only buyers)
router.delete('/:userId', deleteUser);

export default router;
