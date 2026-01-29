import { Response, NextFunction } from 'express';
import pool from '../database/connection';
import { AuthRequest } from './auth';

// List of valid permission columns
const VALID_PERMISSIONS = [
  'can_view_dashboard',
  'can_view_models',
  'can_create_models',
  'can_edit_models',
  'can_delete_models',
  'can_edit_model_status',
  'can_view_files',
  'can_upload_files',
  'can_delete_files',
  'can_view_materials',
  'can_edit_materials',
  'can_delete_materials',
  'can_view_comments',
  'can_create_comments',
  'can_edit_own_comments',
  'can_delete_own_comments',
  'can_delete_any_comments',
  'can_view_collections',
  'can_edit_collections',
  'can_view_seasons',
  'can_edit_seasons',
  'can_view_users',
  'can_create_users',
  'can_edit_users',
  'can_delete_users'
];

export const checkPermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      console.log(`[Permissions] Checking permission '${permission}' for user ${userId} with role '${userRole}'`);

      if (!userId) {
        console.log('[Permissions] No userId - returning 401');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Buyers always have all permissions
      if (userRole === 'buyer') {
        console.log('[Permissions] User is buyer - granting access');
        return next();
      }

      // Validate permission name to prevent SQL injection
      if (!VALID_PERMISSIONS.includes(permission)) {
        console.error(`[Permissions] Invalid permission name: ${permission}`);
        return res.status(500).json({
          success: false,
          error: 'Invalid permission check'
        });
      }

      // Check permission in database
      const result = await pool.query(
        `SELECT ${permission} FROM user_permissions WHERE user_id = $1`,
        [userId]
      );

      console.log(`[Permissions] Query result:`, result.rows);

      if (result.rows.length === 0) {
        console.log(`[Permissions] No permissions record found for user ${userId}, creating default permissions`);

        // Create default permissions for user based on role
        await pool.query(`
          INSERT INTO user_permissions (
            user_id,
            can_view_dashboard,
            can_view_models,
            can_create_models,
            can_edit_models,
            can_delete_models,
            can_edit_model_status,
            can_view_files,
            can_upload_files,
            can_delete_files,
            can_view_materials,
            can_edit_materials,
            can_delete_materials,
            can_view_comments,
            can_create_comments,
            can_edit_own_comments,
            can_delete_own_comments,
            can_delete_any_comments,
            can_view_collections,
            can_edit_collections,
            can_view_seasons,
            can_edit_seasons,
            can_view_users,
            can_create_users,
            can_edit_users,
            can_delete_users
          )
          SELECT
            $1,
            true, -- can_view_dashboard
            true, -- can_view_models
            CASE WHEN $2 IN ('designer', 'buyer') THEN true ELSE false END,
            CASE WHEN $2 IN ('designer', 'constructor', 'buyer') THEN true ELSE false END,
            CASE WHEN $2 = 'buyer' THEN true ELSE false END,
            CASE WHEN $2 = 'buyer' THEN true ELSE false END,
            true, -- can_view_files
            CASE WHEN $2 IN ('designer', 'constructor', 'china_office', 'buyer') THEN true ELSE false END,
            CASE WHEN $2 IN ('buyer', 'designer') THEN true ELSE false END,
            true, -- can_view_materials
            CASE WHEN $2 IN ('designer', 'constructor', 'buyer') THEN true ELSE false END,
            CASE WHEN $2 IN ('buyer', 'designer') THEN true ELSE false END,
            true, -- can_view_comments
            true, -- can_create_comments
            true, -- can_edit_own_comments
            true, -- can_delete_own_comments
            CASE WHEN $2 = 'buyer' THEN true ELSE false END,
            true, -- can_view_collections
            CASE WHEN $2 = 'buyer' THEN true ELSE false END,
            true, -- can_view_seasons
            CASE WHEN $2 = 'buyer' THEN true ELSE false END,
            CASE WHEN $2 = 'buyer' THEN true ELSE false END,
            CASE WHEN $2 = 'buyer' THEN true ELSE false END,
            CASE WHEN $2 = 'buyer' THEN true ELSE false END,
            CASE WHEN $2 = 'buyer' THEN true ELSE false END
          ON CONFLICT (user_id) DO NOTHING
        `, [userId, userRole]);

        // Re-check permission after creating defaults
        const newResult = await pool.query(
          `SELECT ${permission} FROM user_permissions WHERE user_id = $1`,
          [userId]
        );

        if (newResult.rows.length === 0 || !newResult.rows[0][permission]) {
          console.log(`[Permissions] Permission '${permission}' denied for user ${userId}`);
          return res.status(403).json({
            success: false,
            error: 'У вас нет прав для выполнения этого действия'
          });
        }

        console.log(`[Permissions] Permission '${permission}' granted for user ${userId}`);
        return next();
      }

      if (!result.rows[0][permission]) {
        console.log(`[Permissions] Permission '${permission}' denied for user ${userId}`);
        return res.status(403).json({
          success: false,
          error: 'У вас нет прав для выполнения этого действия'
        });
      }

      console.log(`[Permissions] Permission '${permission}' granted for user ${userId}`);
      next();
    } catch (error) {
      console.error('[Permissions] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check permissions'
      });
    }
  };
};
