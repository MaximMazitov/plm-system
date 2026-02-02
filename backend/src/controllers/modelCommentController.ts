import { Response } from 'express';
import pool from '../database/connection';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadToR2, deleteFromR2, extractKeyFromUrl, isR2Configured } from '../services/r2Storage';

// Configure multer - use memory storage for R2
const commentStorage = isR2Configured()
  ? multer.memoryStorage()
  : multer.diskStorage({
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

// Allowed file extensions and MIME types
const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
const allowedDocTypes = /xlsx|xls|pdf|doc|docx|csv|txt/;
const allowedMimeTypes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/pdf',
  'application/msword', // doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'text/csv',
  'text/plain'
];

export const commentUpload = multer({
  storage: commentStorage,
  limits: { fileSize: 70 * 1024 * 1024 }, // 70MB for large files
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isAllowedExt = allowedImageTypes.test(ext) || allowedDocTypes.test(ext);
    const isAllowedMime = allowedMimeTypes.includes(file.mimetype);

    if (isAllowedExt || isAllowedMime) {
      return cb(null, true);
    } else {
      cb(new Error('Allowed file types: images (jpeg, jpg, png, gif, webp) and documents (xlsx, xls, pdf, doc, docx, csv, txt)'));
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
        c.file_name,
        c.file_type,
        c.r2_key,
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

    // Get all files for comments in this model
    const commentIds = result.rows.map((c: any) => c.id);
    let filesResult: any = { rows: [] };
    if (commentIds.length > 0) {
      filesResult = await pool.query(
        `SELECT id, comment_id, file_url, file_name, file_type
         FROM comment_files
         WHERE comment_id = ANY($1)`,
        [commentIds]
      );
    }

    // Group files by comment_id
    const filesByComment = new Map();
    filesResult.rows.forEach((file: any) => {
      if (!filesByComment.has(file.comment_id)) {
        filesByComment.set(file.comment_id, []);
      }
      filesByComment.get(file.comment_id).push(file);
    });

    // Organize comments into tree structure
    const comments = result.rows;
    const commentMap = new Map();
    const rootComments: any[] = [];

    // First pass: create map of all comments with their files
    comments.forEach((comment: any) => {
      commentMap.set(comment.id, {
        ...comment,
        files: filesByComment.get(comment.id) || [],
        replies: []
      });
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
    const imageFiles = req.files as Express.Multer.File[] | undefined;

    // Allow comment with just files (no text required)
    const hasFiles = imageFiles && imageFiles.length > 0;
    const hasText = comment_text && comment_text.trim();

    if (!hasText && !hasFiles) {
      return res.status(400).json({
        success: false,
        error: 'Comment must have text or files'
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

    // Insert comment first (without files for backwards compatibility)
    const commentTextValue = hasText ? comment_text.trim() : '';
    const result = await pool.query(
      `INSERT INTO comments (model_id, user_id, parent_id, comment_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [modelId, userId, parent_id || null, commentTextValue]
    );

    const commentId = result.rows[0].id;
    const uploadedFiles: any[] = [];

    // Handle multiple file uploads
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        let fileUrl: string | null = null;
        let r2Key: string | null = null;

        if (isR2Configured() && file.buffer) {
          // Upload to R2
          const uploadResult = await uploadToR2(
            file.buffer,
            file.originalname,
            `comments/${modelId}/${commentId}`,
            file.mimetype
          );

          if (uploadResult.success && uploadResult.url) {
            fileUrl = uploadResult.url;
            r2Key = uploadResult.key || null;
          } else {
            // Fallback to local storage
            const uploadDir = path.join(__dirname, '../../uploads/comments');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const localFilename = 'comment-' + uniqueSuffix + path.extname(file.originalname);
            fs.writeFileSync(path.join(uploadDir, localFilename), file.buffer);
            fileUrl = `/uploads/comments/${localFilename}`;
          }
        } else if (file.filename) {
          // Local storage (diskStorage)
          fileUrl = `/uploads/comments/${file.filename}`;
        }

        // Insert file record into comment_files table
        if (fileUrl) {
          const fileResult = await pool.query(
            `INSERT INTO comment_files (comment_id, file_url, file_name, file_type, r2_key)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [commentId, fileUrl, file.originalname, file.mimetype, r2Key]
          );
          uploadedFiles.push(fileResult.rows[0]);
        }
      }
    }

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
      [commentId]
    );

    return res.status(201).json({
      success: true,
      data: { ...commentWithUser.rows[0], files: uploadedFiles },
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

    // Get all files for this comment (and any nested replies due to CASCADE)
    const filesResult = await pool.query(
      `SELECT file_url, r2_key FROM comment_files WHERE comment_id = $1`,
      [commentId]
    );

    // Delete files from R2 or local storage
    for (const file of filesResult.rows) {
      if (file.r2_key) {
        await deleteFromR2(file.r2_key);
      } else if (file.file_url && file.file_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '../../', file.file_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } else if (file.file_url) {
        const key = extractKeyFromUrl(file.file_url);
        if (key) {
          await deleteFromR2(key);
        }
      }
    }

    // Delete old single image from R2 or local storage (backwards compatibility)
    if (comment.r2_key) {
      await deleteFromR2(comment.r2_key);
    } else if (comment.image_url) {
      if (comment.image_url.startsWith('/uploads/')) {
        const imagePath = path.join(__dirname, '../../', comment.image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } else {
        const key = extractKeyFromUrl(comment.image_url);
        if (key) {
          await deleteFromR2(key);
        }
      }
    }

    // Delete comment (CASCADE will delete replies and comment_files)
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
