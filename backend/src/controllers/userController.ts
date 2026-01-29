import { Response } from 'express';
import pool from '../database/connection';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

// Get all users (only for buyers)
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'buyer') {
      return res.status(403).json({
        success: false,
        error: 'Only buyers can view users list'
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        email,
        full_name,
        role,
        is_active,
        created_at
      FROM users
      ORDER BY created_at DESC`
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

// Create new user (only for buyers)
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'buyer') {
      return res.status(403).json({
        success: false,
        error: 'Only buyers can create users'
      });
    }

    const { email, password, full_name, role, permissions } = req.body;

    // Validate input
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, full name, and role are required'
      });
    }

    // Validate role
    const validRoles = ['designer', 'constructor', 'buyer', 'china_office'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, full_name, role, is_active, created_at`,
      [email, hashedPassword, full_name, role]
    );

    const newUser = result.rows[0];

    // Create permissions if provided
    if (permissions) {
      await pool.query(
        `INSERT INTO user_permissions (
          user_id,
          can_view_dashboard, can_view_models, can_create_models, can_edit_models,
          can_delete_models, can_edit_model_status, can_view_files, can_upload_files,
          can_delete_files, can_view_materials, can_edit_materials, can_delete_materials,
          can_view_comments, can_create_comments, can_edit_own_comments,
          can_delete_own_comments, can_delete_any_comments, can_view_collections,
          can_edit_collections, can_view_seasons, can_edit_seasons, can_view_users,
          can_create_users, can_edit_users, can_delete_users
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        ON CONFLICT (user_id) DO UPDATE SET
          can_view_dashboard = EXCLUDED.can_view_dashboard,
          can_view_models = EXCLUDED.can_view_models,
          can_create_models = EXCLUDED.can_create_models,
          can_edit_models = EXCLUDED.can_edit_models,
          can_delete_models = EXCLUDED.can_delete_models,
          can_edit_model_status = EXCLUDED.can_edit_model_status,
          can_view_files = EXCLUDED.can_view_files,
          can_upload_files = EXCLUDED.can_upload_files,
          can_delete_files = EXCLUDED.can_delete_files,
          can_view_materials = EXCLUDED.can_view_materials,
          can_edit_materials = EXCLUDED.can_edit_materials,
          can_delete_materials = EXCLUDED.can_delete_materials,
          can_view_comments = EXCLUDED.can_view_comments,
          can_create_comments = EXCLUDED.can_create_comments,
          can_edit_own_comments = EXCLUDED.can_edit_own_comments,
          can_delete_own_comments = EXCLUDED.can_delete_own_comments,
          can_delete_any_comments = EXCLUDED.can_delete_any_comments,
          can_view_collections = EXCLUDED.can_view_collections,
          can_edit_collections = EXCLUDED.can_edit_collections,
          can_view_seasons = EXCLUDED.can_view_seasons,
          can_edit_seasons = EXCLUDED.can_edit_seasons,
          can_view_users = EXCLUDED.can_view_users,
          can_create_users = EXCLUDED.can_create_users,
          can_edit_users = EXCLUDED.can_edit_users,
          can_delete_users = EXCLUDED.can_delete_users`,
        [
          newUser.id,
          permissions.can_view_dashboard,
          permissions.can_view_models,
          permissions.can_create_models,
          permissions.can_edit_models,
          permissions.can_delete_models,
          permissions.can_edit_model_status,
          permissions.can_view_files,
          permissions.can_upload_files,
          permissions.can_delete_files,
          permissions.can_view_materials,
          permissions.can_edit_materials,
          permissions.can_delete_materials,
          permissions.can_view_comments,
          permissions.can_create_comments,
          permissions.can_edit_own_comments,
          permissions.can_delete_own_comments,
          permissions.can_delete_any_comments,
          permissions.can_view_collections,
          permissions.can_edit_collections,
          permissions.can_view_seasons,
          permissions.can_edit_seasons,
          permissions.can_view_users,
          permissions.can_create_users,
          permissions.can_edit_users,
          permissions.can_delete_users
        ]
      );
    }

    return res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
};

// Update user (only for buyers)
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'buyer') {
      return res.status(403).json({
        success: false,
        error: 'Only buyers can update users'
      });
    }

    const { userId } = req.params;
    const { full_name, role, is_active, password, permissions } = req.body;

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['designer', 'constructor', 'buyer', 'china_office'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role'
        });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0 && !permissions) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    let updatedUser;
    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, full_name, role, is_active, created_at, updated_at
      `;

      const result = await pool.query(query, values);
      updatedUser = result.rows[0];
    }

    // Update permissions if provided
    if (permissions) {
      await pool.query(
        `INSERT INTO user_permissions (
          user_id,
          can_view_dashboard, can_view_models, can_create_models, can_edit_models,
          can_delete_models, can_edit_model_status, can_view_files, can_upload_files,
          can_delete_files, can_view_materials, can_edit_materials, can_delete_materials,
          can_view_comments, can_create_comments, can_edit_own_comments,
          can_delete_own_comments, can_delete_any_comments, can_view_collections,
          can_edit_collections, can_view_seasons, can_edit_seasons, can_view_users,
          can_create_users, can_edit_users, can_delete_users
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        ON CONFLICT (user_id) DO UPDATE SET
          can_view_dashboard = EXCLUDED.can_view_dashboard,
          can_view_models = EXCLUDED.can_view_models,
          can_create_models = EXCLUDED.can_create_models,
          can_edit_models = EXCLUDED.can_edit_models,
          can_delete_models = EXCLUDED.can_delete_models,
          can_edit_model_status = EXCLUDED.can_edit_model_status,
          can_view_files = EXCLUDED.can_view_files,
          can_upload_files = EXCLUDED.can_upload_files,
          can_delete_files = EXCLUDED.can_delete_files,
          can_view_materials = EXCLUDED.can_view_materials,
          can_edit_materials = EXCLUDED.can_edit_materials,
          can_delete_materials = EXCLUDED.can_delete_materials,
          can_view_comments = EXCLUDED.can_view_comments,
          can_create_comments = EXCLUDED.can_create_comments,
          can_edit_own_comments = EXCLUDED.can_edit_own_comments,
          can_delete_own_comments = EXCLUDED.can_delete_own_comments,
          can_delete_any_comments = EXCLUDED.can_delete_any_comments,
          can_view_collections = EXCLUDED.can_view_collections,
          can_edit_collections = EXCLUDED.can_edit_collections,
          can_view_seasons = EXCLUDED.can_view_seasons,
          can_edit_seasons = EXCLUDED.can_edit_seasons,
          can_view_users = EXCLUDED.can_view_users,
          can_create_users = EXCLUDED.can_create_users,
          can_edit_users = EXCLUDED.can_edit_users,
          can_delete_users = EXCLUDED.can_delete_users`,
        [
          userId,
          permissions.can_view_dashboard,
          permissions.can_view_models,
          permissions.can_create_models,
          permissions.can_edit_models,
          permissions.can_delete_models,
          permissions.can_edit_model_status,
          permissions.can_view_files,
          permissions.can_upload_files,
          permissions.can_delete_files,
          permissions.can_view_materials,
          permissions.can_edit_materials,
          permissions.can_delete_materials,
          permissions.can_view_comments,
          permissions.can_create_comments,
          permissions.can_edit_own_comments,
          permissions.can_delete_own_comments,
          permissions.can_delete_any_comments,
          permissions.can_view_collections,
          permissions.can_edit_collections,
          permissions.can_view_seasons,
          permissions.can_edit_seasons,
          permissions.can_view_users,
          permissions.can_create_users,
          permissions.can_edit_users,
          permissions.can_delete_users
        ]
      );
    }

    return res.json({
      success: true,
      data: updatedUser || { id: userId },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
};

// Get current user's own permissions
export const getMyPermissions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Buyers have all permissions by default
    if (req.user?.role === 'buyer') {
      return res.json({
        success: true,
        data: {
          can_view_dashboard: true,
          can_view_models: true,
          can_create_models: true,
          can_edit_models: true,
          can_delete_models: true,
          can_edit_model_status: true,
          can_view_files: true,
          can_upload_files: true,
          can_delete_files: true,
          can_view_materials: true,
          can_edit_materials: true,
          can_delete_materials: true,
          can_view_comments: true,
          can_create_comments: true,
          can_edit_own_comments: true,
          can_delete_own_comments: true,
          can_delete_any_comments: true,
          can_view_collections: true,
          can_edit_collections: true,
          can_view_seasons: true,
          can_edit_seasons: true,
          can_view_users: true,
          can_create_users: true,
          can_edit_users: true,
          can_delete_users: true,
          can_approve_as_buyer: true,
          can_approve_as_constructor: false
        }
      });
    }

    // Get permissions from database
    const result = await pool.query(
      `SELECT
        can_view_dashboard, can_view_models, can_create_models, can_edit_models,
        can_delete_models, can_edit_model_status, can_view_files, can_upload_files,
        can_delete_files, can_view_materials, can_edit_materials, can_delete_materials,
        can_view_comments, can_create_comments, can_edit_own_comments,
        can_delete_own_comments, can_delete_any_comments, can_view_collections,
        can_edit_collections, can_view_seasons, can_edit_seasons, can_view_users,
        can_create_users, can_edit_users, can_delete_users,
        can_approve_as_buyer, can_approve_as_constructor
      FROM user_permissions
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Permissions not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions'
    });
  }
};

// Get user permissions (only for buyers)
export const getUserPermissions = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'buyer') {
      return res.status(403).json({
        success: false,
        error: 'Only buyers can view user permissions'
      });
    }

    const { userId } = req.params;

    const result = await pool.query(
      `SELECT
        can_view_dashboard, can_view_models, can_create_models, can_edit_models,
        can_delete_models, can_edit_model_status, can_view_files, can_upload_files,
        can_delete_files, can_view_materials, can_edit_materials, can_delete_materials,
        can_view_comments, can_create_comments, can_edit_own_comments,
        can_delete_own_comments, can_delete_any_comments, can_view_collections,
        can_edit_collections, can_view_seasons, can_edit_seasons, can_view_users,
        can_create_users, can_edit_users, can_delete_users,
        can_approve_as_buyer, can_approve_as_constructor
      FROM user_permissions
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Permissions not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user permissions'
    });
  }
};

// Delete user (only for buyers)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const currentUserId = req.user?.id;

    if (userRole !== 'buyer') {
      return res.status(403).json({
        success: false,
        error: 'Only buyers can delete users'
      });
    }

    const { userId } = req.params;

    // Prevent deleting yourself
    if (parseInt(userId) === currentUserId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};
