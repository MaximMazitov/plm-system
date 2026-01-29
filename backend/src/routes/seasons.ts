import express from 'express';
import { getSeasons, createSeason, deleteSeason } from '../controllers/seasonController';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = express.Router();

// Get all seasons
router.get('/', authenticateToken, checkPermission('can_view_models'), getSeasons);

// Create season
router.post('/', authenticateToken, checkPermission('can_edit_seasons'), createSeason);

// Delete season
router.delete('/:id', authenticateToken, checkPermission('can_edit_seasons'), deleteSeason);

export default router;
