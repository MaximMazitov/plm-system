import { Response, NextFunction } from 'express';
import pool from '../database/connection';
import { AuthRequest } from './auth';

export const checkPermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Buyers always have all permissions
      if (req.user?.role === 'buyer') {
        return next();
      }

      // Check permission in database
      const result = await pool.query(
        `SELECT ${permission} FROM user_permissions WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0][permission]) {
        return res.status(403).json({
          success: false,
          error: 'У вас нет прав для выполнения этого действия'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check permissions'
      });
    }
  };
};
