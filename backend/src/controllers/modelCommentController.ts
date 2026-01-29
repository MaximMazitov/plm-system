import { Response } from 'express';
import pool from '../database/connection';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for comment images
const commentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/comments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'comment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const commentUpload = multer({
  storage: commentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Get all comments for a model (with nested replies)
export const getModelComments = async (req: AuthRequest, res: Response) => {
  try {
    const { modelId } = req.params;

    // Get all comments with user information
    const result = await pool.query(
      `SELECT
        c.id,
        c.model_id,
        c.user_id,
        c.parent_id,
        c.comment_text,
        c.image_url,
        c.created_at,
        c.updated_at,
        u.email as username,
        u.full_name,
        u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.model_id = $1
      ORDER BY c.created_at ASC`,
      [modelId]
    );

    // Organize comments into tree structure
    const comments = result.rows;
    const commentMap = new Map();
    const rootComments: any[] = [];

    // First pass: create map of all comments
    comments.forEach((comment: any) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach((comment: any) => {
      const commentWithReplies = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return res.json({
      success: true,
      data: rootComments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
};

// Create a new comment
export const createModelComment = async (req: AuthRequest, res: Response) => {
  try {
    const { modelId } = req.params;
    const { comment_text, parent_id } = req.body;
    const userId = req.user?.id;
    const imageFile = req.file;

    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required'
      });
    }

    // Check if model exists
    const modelCheck = await pool.query(
      'SELECT id FROM models WHERE id = $1',
      [modelId]
    );

    if (modelCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    // If parent_id is provided, check if parent comment exists
    if (parent_id) {
      const parentCheck = await pool.query(
        'SELECT id FROM comments WHERE id = $1 AND model_id = $2',
        [parent_id, modelId]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }
    }

    const imageUrl = imageFile ? `/uploads/comments/${imageFile.filename}` : null;

    // Insert comment
    const result = await pool.query(
      `INSERT INTO comments (model_id, user_id, parent_id, comment_text, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [modelId, userId, parent_id || null, comment_text.trim(), imageUrl]
    );

    // Get comment with user information
    const commentWithUser = await pool.query(
      `SELECT
        c.*,
        u.email as username,
        u.full_name,
        u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1`,
      [result.rows[0].id]
    );

    return res.status(201).json({
      success: true,
      data: commentWithUser.rows[0],
      message: 'Comment created successfully'
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    });
  }
};

// Update a comment
export const updateModelComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { comment_text } = req.body;
    const userId = req.user?.id;

    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required'
      });
    }

    // Check if comment exists and belongs to user
    const commentCheck = await pool.query(
      'SELECT * FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Only comment owner can update
    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own comments'
      });
    }

    const result = await pool.query(
      `UPDATE comments
       SET comment_text = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [comment_text.trim(), commentId]
    );

    // Get comment with user information
    const commentWithUser = await pool.query(
      `SELECT
        c.*,
        u.email as username,
        u.full_name,
        u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1`,
      [result.rows[0].id]
    );

    return res.json({
      success: true,
      data: commentWithUser.rows[0],
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update comment'
    });
  }
};

// Delete a comment
export const deleteModelComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check if comment exists
    const commentCheck = await pool.query(
      'SELECT * FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    const comment = commentCheck.rows[0];

    // Only comment owner or buyer can delete
    if (comment.user_id !== userId && userRole !== 'buyer') {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own comments'
      });
    }

    // Delete image file if exists
    if (comment.image_url) {
      const imagePath = path.join(__dirname, '../../', comment.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete comment (CASCADE will delete replies)
    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);

    return res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
};
