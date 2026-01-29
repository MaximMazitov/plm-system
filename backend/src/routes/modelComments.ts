import express from 'express';
import {
  getModelComments,
  createModelComment,
  updateModelComment,
  deleteModelComment,
  commentUpload
} from '../controllers/modelCommentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all comments for a model
router.get('/:modelId', authenticateToken, getModelComments);

// Create a comment (with optional image)
router.post('/:modelId', authenticateToken, commentUpload.single('image'), createModelComment);

// Update a comment
router.put('/:commentId', authenticateToken, updateModelComment);

// Delete a comment
router.delete('/:commentId', authenticateToken, deleteModelComment);

export default router;
