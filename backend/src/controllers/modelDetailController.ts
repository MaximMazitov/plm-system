import { Response } from 'express';
import pool from '../database/connection';
import type { AuthRequest } from '../middleware/auth';

// Получить изображения модели
export const getModelImages = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM model_images
       WHERE model_id = $1
       ORDER BY is_primary DESC, uploaded_at DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get model images error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch model images'
    });
  }
};

// Получить материалы модели
export const getModelMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        id,
        material_type,
        name,
        brand as fabric_type
       FROM model_materials
       WHERE model_id = $1
       ORDER BY
         CASE material_type
           WHEN 'main' THEN 1
           WHEN 'upper' THEN 2
           WHEN 'lining' THEN 3
           WHEN 'hood_lining' THEN 4
           WHEN 'insulation' THEN 5
           ELSE 6
         END`,
      [id]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get model materials error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch model materials'
    });
  }
};

// Получить спецификации модели
export const getModelSpecifications = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM model_specifications
       WHERE model_id = $1
       ORDER BY spec_type`,
      [id]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get model specifications error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch model specifications'
    });
  }
};

// Получить историю изменений модели
export const getModelHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        mh.id,
        u.full_name as changed_by,
        mh.changed_at,
        mh.change_type,
        mh.description
       FROM model_history mh
       JOIN users u ON mh.changed_by_user_id = u.id
       WHERE mh.model_id = $1
       ORDER BY mh.changed_at DESC
       LIMIT 50`,
      [id]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get model history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch model history'
    });
  }
};

// Загрузить изображение модели
export const uploadModelImage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { image_url, is_primary } = req.body;

    // Если это основное изображение, сбрасываем флаг у остальных
    if (is_primary) {
      await pool.query(
        'UPDATE model_images SET is_primary = false WHERE model_id = $1',
        [id]
      );
    }

    const result = await pool.query(
      `INSERT INTO model_images (model_id, image_url, is_primary)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, image_url, is_primary || false]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Upload model image error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload model image'
    });
  }
};

// Добавить материал к модели
export const addModelMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { material_type, name, fabric_type } = req.body;

    // Проверяем, есть ли уже материал такого типа для модели
    const existingMaterial = await pool.query(
      'SELECT id FROM model_materials WHERE model_id = $1 AND material_type = $2',
      [id, material_type]
    );

    let result;
    if (existingMaterial.rows.length > 0) {
      // Обновляем существующий материал (fabric_type хранится в колонке brand)
      result = await pool.query(
        `UPDATE model_materials
         SET name = $1, brand = $2
         WHERE model_id = $3 AND material_type = $4
         RETURNING id, model_id, material_type, name, brand as fabric_type`,
        [name, fabric_type || '', id, material_type]
      );
    } else {
      // Создаем новый материал (fabric_type хранится в колонке brand)
      result = await pool.query(
        `INSERT INTO model_materials (model_id, material_type, name, brand)
         VALUES ($1, $2, $3, $4)
         RETURNING id, model_id, material_type, name, brand as fabric_type`,
        [id, material_type, name, fabric_type || '']
      );
    }

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Add model material error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add model material'
    });
  }
};

// Обновить материал модели
export const updateModelMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id, materialId } = req.params;
    const { name, fabric_type } = req.body;

    const result = await pool.query(
      `UPDATE model_materials
       SET name = $1, brand = $2
       WHERE id = $3 AND model_id = $4
       RETURNING id, model_id, material_type, name, brand as fabric_type`,
      [name, fabric_type || '', materialId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update model material error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update model material'
    });
  }
};

// Удалить материал модели
export const deleteModelMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id, materialId } = req.params;

    const result = await pool.query(
      'DELETE FROM model_materials WHERE id = $1 AND model_id = $2 RETURNING *',
      [materialId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }

    return res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Delete model material error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete model material'
    });
  }
};

// Добавить спецификацию к модели
export const addModelSpecification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { spec_type, spec_value } = req.body;

    const result = await pool.query(
      `INSERT INTO model_specifications (model_id, spec_type, spec_value)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, spec_type, spec_value]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Add model specification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add model specification'
    });
  }
};

// Получить цвета модели
export const getModelColors = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        id,
        pantone_code,
        color_name,
        zone,
        hex_color,
        sort_order
       FROM model_colors
       WHERE model_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get model colors error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch model colors'
    });
  }
};

// Добавить цвет к модели
export const addModelColor = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { pantone_code, color_name, hex_color, zone } = req.body;

    if (!pantone_code) {
      return res.status(400).json({
        success: false,
        error: 'Pantone code is required'
      });
    }

    // Получаем максимальный sort_order для этой модели
    const maxSortResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM model_colors WHERE model_id = $1',
      [id]
    );
    const nextSortOrder = maxSortResult.rows[0].max_sort + 1;

    const result = await pool.query(
      `INSERT INTO model_colors (model_id, pantone_code, color_name, hex_color, zone, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, pantone_code, color_name || null, hex_color || null, zone || null, nextSortOrder]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Add model color error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add model color'
    });
  }
};

// Обновить цвет модели
export const updateModelColor = async (req: AuthRequest, res: Response) => {
  try {
    const { id, colorId } = req.params;
    const { pantone_code, color_name, hex_color, zone } = req.body;

    if (!pantone_code) {
      return res.status(400).json({
        success: false,
        error: 'Pantone code is required'
      });
    }

    const result = await pool.query(
      `UPDATE model_colors
       SET pantone_code = $1, color_name = $2, hex_color = $3, zone = $4
       WHERE id = $5 AND model_id = $6
       RETURNING *`,
      [pantone_code, color_name || null, hex_color || null, zone || null, colorId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Color not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update model color error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update model color'
    });
  }
};

// Удалить цвет модели
export const deleteModelColor = async (req: AuthRequest, res: Response) => {
  try {
    const { id, colorId } = req.params;

    const result = await pool.query(
      'DELETE FROM model_colors WHERE id = $1 AND model_id = $2 RETURNING *',
      [colorId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Color not found'
      });
    }

    return res.json({
      success: true,
      message: 'Color deleted successfully'
    });
  } catch (error) {
    console.error('Delete model color error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete model color'
    });
  }
};
