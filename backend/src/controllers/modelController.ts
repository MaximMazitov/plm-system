import { Response } from 'express';
import pool from '../database/connection';
import { AuthRequest } from '../middleware/auth';

export const createModel = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      collection_id,
      model_number,
      model_name,
      product_type,
      category,
      fit_type,
      product_group,
      prototype_number,
      brand,
      colors // массив цветов [{pantone_code, color_name}]
    } = req.body;

    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check if model number already exists in this collection
    const existing = await client.query(
      'SELECT id FROM models WHERE collection_id = $1 AND model_number = $2',
      [collection_id, model_number]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Model number already exists in this collection'
      });
    }

    // Product_group can only be set by buyers
    const finalProductGroup = userRole === 'buyer' ? product_group : null;

    // Create model
    const result = await client.query(
      `INSERT INTO models (
        collection_id, model_number, model_name, product_type,
        category, fit_type, product_group, prototype_number, brand,
        status, designer_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11)
      RETURNING *`,
      [
        collection_id, model_number, model_name, product_type,
        category, fit_type, finalProductGroup, prototype_number, brand,
        userId, userId
      ]
    );

    const model = result.rows[0];

    // Add colors if provided
    if (colors && Array.isArray(colors) && colors.length > 0) {
      for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        await client.query(
          `INSERT INTO model_colors (model_id, pantone_code, color_name, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [model.id, color.pantone_code, color.color_name || null, i]
        );
      }
    }

    // Log status change
    await client.query(
      `INSERT INTO status_history (model_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, 'draft', $2)`,
      [model.id, userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: model,
      message: 'Model created successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create model error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  } finally {
    client.release();
  }
};

export const getModels = async (req: AuthRequest, res: Response) => {
  try {
    const {
      collection_id,
      status,
      product_type,
      model_id,
      page = 1,
      limit = 20
    } = req.query;

    const userRole = req.user?.role;
    const factoryId = req.user?.factory_id;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Filter by specific model ID
    if (model_id) {
      whereConditions.push(`m.id = $${paramIndex++}`);
      params.push(model_id);
    }

    // Factory users can only see their assigned models
    if (userRole === 'factory' && factoryId) {
      whereConditions.push(`m.assigned_factory_id = $${paramIndex++}`);
      params.push(factoryId);
      // Only show approved models to factory
      whereConditions.push(`m.status IN ('approved', 'ds_stage', 'pps_stage', 'in_production', 'shipped')`);
    }

    if (collection_id) {
      whereConditions.push(`m.collection_id = $${paramIndex++}`);
      params.push(collection_id);
    }

    if (status) {
      whereConditions.push(`m.status = $${paramIndex++}`);
      params.push(status);
    }

    if (product_type) {
      whereConditions.push(`m.product_type = $${paramIndex++}`);
      params.push(product_type);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const offset = (Number(page) - 1) * Number(limit);

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM models m ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get models with collection info and sketch
    const result = await pool.query(
      `SELECT
        m.*,
        c.name as collection_name,
        c.type as collection_type,
        s.code as season_code,
        u.full_name as designer_name,
        f.name as factory_name,
        mf.file_url as sketch_url
       FROM models m
       LEFT JOIN collections c ON m.collection_id = c.id
       LEFT JOIN seasons s ON c.season_id = s.id
       LEFT JOIN users u ON m.designer_id = u.id
       LEFT JOIN factories f ON m.assigned_factory_id = f.id
       LEFT JOIN LATERAL (
         SELECT file_url
         FROM model_files
         WHERE model_id = m.id AND file_type = 'sketch'
         ORDER BY uploaded_at DESC
         LIMIT 1
       ) mf ON true
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get models error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const getModelById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const factoryId = req.user?.factory_id;

    const result = await pool.query(
      `SELECT
        m.*,
        c.name as collection_name,
        c.type as collection_type,
        c.age_group,
        s.code as season_code,
        s.name as season_name,
        u.full_name as designer_name,
        f.name as factory_name,
        f.contact_email as factory_email
       FROM models m
       LEFT JOIN collections c ON m.collection_id = c.id
       LEFT JOIN seasons s ON c.season_id = s.id
       LEFT JOIN users u ON m.designer_id = u.id
       LEFT JOIN factories f ON m.assigned_factory_id = f.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    const model = result.rows[0];

    // Check factory access
    if (userRole === 'factory') {
      if (model.assigned_factory_id !== factoryId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    // Get additional data
    const [colors, fabrics, accessories, prints] = await Promise.all([
      pool.query('SELECT * FROM model_colors WHERE model_id = $1', [id]),
      pool.query(
        `SELECT mf.*, f.name as fabric_name, fw.weight
         FROM model_fabrics mf
         LEFT JOIN fabrics f ON mf.fabric_id = f.id
         LEFT JOIN fabric_weights fw ON mf.fabric_weight_id = fw.id
         WHERE mf.model_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT ma.*, a.name as accessory_name, a.category, a.image_url
         FROM model_accessories ma
         LEFT JOIN accessories a ON ma.accessory_id = a.id
         WHERE ma.model_id = $1`,
        [id]
      ),
      pool.query('SELECT * FROM model_prints WHERE model_id = $1', [id])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...model,
        colors: colors.rows,
        fabrics: fabrics.rows,
        accessories: accessories.rows,
        prints: prints.rows
      }
    });
  } catch (error) {
    console.error('Get model by ID error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const updateModel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const {
      model_name,
      product_type,
      category,
      fit_type,
      product_group,
      product_group_code,
      status
    } = req.body;

    // Get current model
    const current = await pool.query('SELECT * FROM models WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    const currentModel = current.rows[0];

    // Check permissions
    if (userRole === 'factory') {
      return res.status(403).json({
        success: false,
        error: 'Factories cannot edit models'
      });
    }

    // Only buyers can update product_group
    const finalProductGroup = userRole === 'buyer' ? product_group : undefined;
    const finalProductGroupCode = userRole === 'buyer' ? product_group_code : undefined;

    const result = await pool.query(
      `UPDATE models
       SET model_name = COALESCE($1, model_name),
           product_type = COALESCE($2, product_type),
           category = COALESCE($3, category),
           fit_type = COALESCE($4, fit_type),
           product_group = COALESCE($5, product_group),
           product_group_code = COALESCE($6, product_group_code),
           status = COALESCE($7, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [model_name, product_type, category, fit_type, finalProductGroup, finalProductGroupCode, status, id]
    );

    // Log status change
    if (status && status !== currentModel.status) {
      await pool.query(
        `INSERT INTO status_history (model_id, from_status, to_status, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [id, currentModel.status, status, userId]
      );
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Model updated successfully'
    });
  } catch (error) {
    console.error('Update model error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const deleteModel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;

    // Only buyer can delete models
    if (userRole !== 'buyer') {
      return res.status(403).json({
        success: false,
        error: 'Only buyers can delete models'
      });
    }

    const result = await pool.query('DELETE FROM models WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Model deleted successfully'
    });
  } catch (error) {
    console.error('Delete model error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const assignFactory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { factory_id } = req.body;
    const userId = req.user?.id;

    const result = await pool.query(
      `UPDATE models
       SET assigned_factory_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [factory_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    // Log history
    await pool.query(
      `INSERT INTO model_history (model_id, changed_by_user_id, change_type, description)
       VALUES ($1, $2, 'factory_assigned', $3)`,
      [id, userId, `Factory assigned: ${factory_id}`]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Factory assigned successfully'
    });
  } catch (error) {
    console.error('Assign factory error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Обновить статус согласования байера
export const updateBuyerApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approval_status, comment } = req.body;
    const userId = req.user?.id;

    if (!['not_approved', 'approved', 'approved_with_comments'].includes(approval_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid approval status'
      });
    }

    const result = await pool.query(
      `UPDATE models
       SET buyer_approval = $1,
           buyer_approval_comment = $2,
           buyer_approved_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [approval_status, comment || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    // Log history
    await pool.query(
      `INSERT INTO model_history (model_id, changed_by_user_id, change_type, description)
       VALUES ($1, $2, 'buyer_approval', $3)`,
      [id, userId, `Buyer approval: ${approval_status}`]
    );

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update buyer approval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update buyer approval'
    });
  }
};

// Обновить статус согласования конструктора
export const updateConstructorApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approval_status, comment } = req.body;
    const userId = req.user?.id;

    if (!['not_approved', 'approved', 'approved_with_comments'].includes(approval_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid approval status'
      });
    }

    const result = await pool.query(
      `UPDATE models
       SET constructor_approval = $1,
           constructor_approval_comment = $2,
           constructor_approved_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [approval_status, comment || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    // Log history
    await pool.query(
      `INSERT INTO model_history (model_id, changed_by_user_id, change_type, description)
       VALUES ($1, $2, 'constructor_approval', $3)`,
      [id, userId, `Constructor approval: ${approval_status}`]
    );

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update constructor approval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update constructor approval'
    });
  }
};
