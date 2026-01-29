import { Response } from 'express';
import pool from '../database/connection';
import type { AuthRequest } from '../middleware/auth';

export const getCollections = async (req: AuthRequest, res: Response) => {
  try {
    const { season_id, type, gender, age_group } = req.query;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (season_id) {
      whereConditions.push(`c.season_id = $${paramIndex++}`);
      params.push(season_id);
    }

    if (type) {
      whereConditions.push(`c.type = $${paramIndex++}`);
      params.push(type);
    }

    if (gender) {
      whereConditions.push(`c.gender = $${paramIndex++}`);
      params.push(gender);
    }

    if (age_group) {
      whereConditions.push(`c.age_group = $${paramIndex++}`);
      params.push(age_group);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await pool.query(`
      SELECT
        c.*,
        s.code as season_code,
        s.name as season_name,
        COUNT(m.id) as model_count
      FROM collections c
      LEFT JOIN seasons s ON s.id = c.season_id
      LEFT JOIN models m ON m.collection_id = c.id
      ${whereClause}
      GROUP BY c.id, s.code, s.name
      ORDER BY c.created_at DESC
    `, params);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get collections error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch collections'
    });
  }
};

export const createCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { season_id, type, gender, age_group, name, description } = req.body;

    const result = await pool.query(
      `INSERT INTO collections (season_id, type, gender, age_group, name, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [season_id, type, gender, age_group, name, description]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create collection error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create collection'
    });
  }
};

export const updateCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Collection name is required'
      });
    }

    const result = await pool.query(
      `UPDATE collections
       SET name = $1, description = $2
       WHERE id = $3
       RETURNING *`,
      [name.trim(), description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Collection updated successfully'
    });
  } catch (error) {
    console.error('Update collection error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update collection'
    });
  }
};

export const deleteCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if collection has models
    const modelsCheck = await pool.query(
      'SELECT COUNT(*) FROM models WHERE collection_id = $1',
      [id]
    );

    const modelCount = parseInt(modelsCheck.rows[0].count);

    if (modelCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete collection with ${modelCount} model(s). Please delete all models first.`
      });
    }

    // Delete collection
    const result = await pool.query(
      'DELETE FROM collections WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }

    return res.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    console.error('Delete collection error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete collection'
    });
  }
};
