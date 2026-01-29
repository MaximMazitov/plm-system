import express from 'express';
import {
  getFactories,
  getAllFactories,
  createFactory,
  updateFactory,
  deleteFactory
} from '../controllers/factoryController';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = express.Router();

// Get all active factories (for selection)
router.get('/', authenticateToken, getFactories);

// Get all factories including inactive (for admin panel)
router.get('/all', authenticateToken, checkPermission('can_manage_users'), getAllFactories);

// Create factory
router.post('/', authenticateToken, checkPermission('can_manage_users'), createFactory);

// Update factory
router.put('/:id', authenticateToken, checkPermission('can_manage_users'), updateFactory);

// Delete factory (soft delete)
router.delete('/:id', authenticateToken, checkPermission('can_manage_users'), deleteFactory);

export default router;
