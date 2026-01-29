import express from 'express';
import { getCollections, createCollection, deleteCollection, updateCollection } from '../controllers/collectionController';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = express.Router();

// Get collections with filters
router.get('/', authenticateToken, checkPermission('can_view_models'), getCollections);

// Create collection
router.post('/', authenticateToken, checkPermission('can_edit_collections'), createCollection);

// Update collection
router.put('/:id', authenticateToken, checkPermission('can_edit_collections'), updateCollection);

// Delete collection
router.delete('/:id', authenticateToken, checkPermission('can_edit_collections'), deleteCollection);

export default router;
