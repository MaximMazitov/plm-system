import { Response } from 'express';
import pool from '../database/connection';
import type { AuthRequest } from '../middleware/auth';

// Получить все значения для определенной категории справочника
export const getReferenceData = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.params;

    const result = await pool.query(
      `SELECT id, value, label, code, sort_order
       FROM reference_data
       WHERE category = $1 AND is_active = true
       ORDER BY sort_order, label`,
      [category]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get reference data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reference data'
    });
  }
};

// Получить все категории справочников
export const getAllReferenceData = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, category, code, value, label, sort_order
       FROM reference_data
       WHERE is_active = true
       ORDER BY category, sort_order, label`
    );

    // Группируем по категориям
    const grouped = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.category]) {
        acc[row.category] = [];
      }
      acc[row.category].push({
        id: row.id,
        code: row.code,
        value: row.value,
        label: row.label,
        sort_order: row.sort_order
      });
      return acc;
    }, {});

    return res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Get all reference data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reference data'
    });
  }
};

// Создать новое значение в справочнике (только админ)
export const createReferenceData = async (req: AuthRequest, res: Response) => {
  try {
    const { category, code, value, label, sort_order } = req.body;

    const result = await pool.query(
      `INSERT INTO reference_data (category, code, value, label, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [category, code || null, value, label, sort_order || 0]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Create reference data error:', error);

    if (error.code === '23505') { // unique violation
      return res.status(400).json({
        success: false,
        error: 'This value already exists in the reference data'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create reference data'
    });
  }
};

// Обновить значение в справочнике (только админ)
export const updateReferenceData = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, value, label, sort_order, is_active } = req.body;

    const result = await pool.query(
      `UPDATE reference_data
       SET code = COALESCE($1, code),
           value = COALESCE($2, value),
           label = COALESCE($3, label),
           sort_order = COALESCE($4, sort_order),
           is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING *`,
      [code, value, label, sort_order, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reference data not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update reference data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update reference data'
    });
  }
};

// Удалить значение из справочника (мягкое удаление - делаем is_active = false)
export const deleteReferenceData = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE reference_data
       SET is_active = false
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reference data not found'
      });
    }

    return res.json({
      success: true,
      message: 'Reference data deleted successfully'
    });
  } catch (error) {
    console.error('Delete reference data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete reference data'
    });
  }
};
