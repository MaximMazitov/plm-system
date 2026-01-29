import express from 'express';
import {
  getReferenceData,
  getAllReferenceData,
  createReferenceData,
  updateReferenceData,
  deleteReferenceData
} from '../controllers/referenceDataController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Get all reference data (grouped by category)
router.get('/', authenticateToken, getAllReferenceData);

// Get reference data for specific category
router.get('/:category', authenticateToken, getReferenceData);

// Create new reference data (buyer only)
router.post('/', authenticateToken, authorizeRoles('buyer'), createReferenceData);

// Update reference data (buyer only)
router.put('/:id', authenticateToken, authorizeRoles('buyer'), updateReferenceData);

// Delete reference data (buyer only)
router.delete('/:id', authenticateToken, authorizeRoles('buyer'), deleteReferenceData);

export default router;
