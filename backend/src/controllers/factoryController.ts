import { Response } from 'express';
import pool from '../database/connection';
import type { AuthRequest } from '../middleware/auth';

// Получить список всех фабрик (для админки - включая неактивные)
export const getAllFactories = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, contact_email, contact_phone, address, is_active, created_at
       FROM factories
       ORDER BY name ASC`
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get all factories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch factories'
    });
  }
};

// Получить список активных фабрик (для выбора)
export const getFactories = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, contact_email, contact_phone, address
       FROM factories
       WHERE is_active = true
       ORDER BY name ASC`
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get factories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch factories'
    });
  }
};

// Создать новую фабрику
export const createFactory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, contact_email, contact_phone, address } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const result = await pool.query(
      `INSERT INTO factories (name, contact_email, contact_phone, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, contact_email || null, contact_phone || null, address || null]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create factory error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create factory'
    });
  }
};

// Обновить фабрику
export const updateFactory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact_email, contact_phone, address } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const result = await pool.query(
      `UPDATE factories
       SET name = $1, contact_email = $2, contact_phone = $3, address = $4
       WHERE id = $5
       RETURNING *`,
      [name, contact_email || null, contact_phone || null, address || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Factory not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update factory error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update factory'
    });
  }
};

// Удалить фабрику (soft delete)
export const deleteFactory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE factories
       SET is_active = false
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Factory not found'
      });
    }

    return res.json({
      success: true,
      message: 'Factory deleted successfully'
    });
  } catch (error) {
    console.error('Delete factory error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete factory'
    });
  }
};
