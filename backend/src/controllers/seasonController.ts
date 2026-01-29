import { Response } from 'express';
import pool from '../database/connection';
import type { AuthRequest } from '../middleware/auth';

export const getSeasons = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        s.*,
        COUNT(DISTINCT c.id) as collection_count
      FROM seasons s
      LEFT JOIN collections c ON c.season_id = s.id
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY s.year DESC, s.season_type DESC
    `);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get seasons error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch seasons'
    });
  }
};

export const createSeason = async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, year, season_type } = req.body;

    const result = await pool.query(
      `INSERT INTO seasons (code, name, year, season_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [code, name, year, season_type]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create season error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create season'
    });
  }
};

export const deleteSeason = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Проверяем, есть ли коллекции в этом сезоне
    const collectionsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM collections WHERE season_id = $1',
      [id]
    );

    if (parseInt(collectionsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Невозможно удалить сезон с коллекциями. Сначала удалите все коллекции.'
      });
    }

    // Удаляем сезон (soft delete через is_active = false)
    const result = await pool.query(
      `UPDATE seasons SET is_active = false WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Сезон не найден'
      });
    }

    return res.json({
      success: true,
      message: 'Сезон успешно удалён'
    });
  } catch (error) {
    console.error('Delete season error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete season'
    });
  }
};
