import { Response } from 'express';
import pool from '../database/connection';
import { AuthRequest } from '../middleware/auth';

export const addStageComment = async (req: AuthRequest, res: Response) => {
  try {
    const { model_id, stage, comment_text } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Validate stage
    if (!['ds', 'pps'].includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage. Must be "ds" or "pps"'
      });
    }

    // Check permissions based on role and stage
    if (stage === 'ds') {
      if (!['buyer', 'constructor', 'designer'].includes(userRole!)) {
        return res.status(403).json({
          success: false,
          error: 'Only buyers, constructors, and designers can comment on DS stage'
        });
      }
    } else if (stage === 'pps') {
      if (!['buyer', 'constructor'].includes(userRole!)) {
        return res.status(403).json({
          success: false,
          error: 'Only buyers and constructors can comment on PPS stage'
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO stage_comments (model_id, stage, user_id, user_role, comment_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [model_id, stage, userId, userRole, comment_text]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Add stage comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const getStageComments = async (req: AuthRequest, res: Response) => {
  try {
    const { model_id, stage } = req.query;

    let query = `
      SELECT sc.*, u.full_name as user_name
      FROM stage_comments sc
      LEFT JOIN users u ON sc.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (model_id) {
      query += ` AND sc.model_id = $${paramIndex++}`;
      params.push(model_id);
    }

    if (stage) {
      query += ` AND sc.stage = $${paramIndex++}`;
      params.push(stage);
    }

    query += ' ORDER BY sc.created_at DESC';

    const result = await pool.query(query, params);

    // Get attachments for each comment
    const commentsWithAttachments = await Promise.all(
      result.rows.map(async (comment) => {
        const attachments = await pool.query(
          `SELECT * FROM comment_attachments WHERE comment_id = $1`,
          [comment.id]
        );
        return {
          ...comment,
          attachments: attachments.rows
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: commentsWithAttachments
    });
  } catch (error) {
    console.error('Get stage comments error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const addCommentAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { comment_id, file_url, file_name, file_type } = req.body;
    const userId = req.user?.id;

    const result = await pool.query(
      `INSERT INTO comment_attachments (comment_id, file_url, file_name, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [comment_id, file_url, file_name, file_type, userId]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Attachment added successfully'
    });
  } catch (error) {
    console.error('Add comment attachment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const addChinaOfficeUpload = async (req: AuthRequest, res: Response) => {
  try {
    const { model_id, stage, upload_type, file_url, file_name, description } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole !== 'china_office') {
      return res.status(403).json({
        success: false,
        error: 'Only China Office can upload files'
      });
    }

    const result = await pool.query(
      `INSERT INTO china_office_uploads (model_id, stage, upload_type, file_url, file_name, description, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [model_id, stage, upload_type, file_url, file_name, description, userId]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Add China Office upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const getChinaOfficeUploads = async (req: AuthRequest, res: Response) => {
  try {
    const { model_id, stage } = req.query;

    let query = `
      SELECT cou.*, u.full_name as uploaded_by_name
      FROM china_office_uploads cou
      LEFT JOIN users u ON cou.uploaded_by = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (model_id) {
      query += ` AND cou.model_id = $${paramIndex++}`;
      params.push(model_id);
    }

    if (stage) {
      query += ` AND cou.stage = $${paramIndex++}`;
      params.push(stage);
    }

    query += ' ORDER BY cou.created_at DESC';

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get China Office uploads error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export const addPPSApproval = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { model_id, is_approved, comment } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!['buyer', 'constructor'].includes(userRole!)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Only buyers and constructors can approve PPS'
      });
    }

    // Check if this user already approved
    const existing = await client.query(
      'SELECT id FROM pps_approvals WHERE model_id = $1 AND approver_role = $2',
      [model_id, userRole]
    );

    if (existing.rows.length > 0) {
      // Update existing approval
      const result = await client.query(
        `UPDATE pps_approvals
         SET is_approved = $1, comment = $2, created_at = CURRENT_TIMESTAMP
         WHERE model_id = $3 AND approver_role = $4
         RETURNING *`,
        [is_approved, comment, model_id, userRole]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        data: result.rows[0],
        message: 'Approval updated successfully'
      });
    }

    // Insert new approval
    const result = await client.query(
      `INSERT INTO pps_approvals (model_id, approver_role, approver_id, is_approved, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [model_id, userRole, userId, is_approved, comment]
    );

    // Check if both buyer and constructor have approved
    const approvals = await client.query(
      `SELECT approver_role, is_approved
       FROM pps_approvals
       WHERE model_id = $1`,
      [model_id]
    );

    const buyerApproval = approvals.rows.find(a => a.approver_role === 'buyer');
    const constructorApproval = approvals.rows.find(a => a.approver_role === 'constructor');

    if (
      buyerApproval?.is_approved === true &&
      constructorApproval?.is_approved === true
    ) {
      // Both approved - move to production
      await client.query(
        `UPDATE models SET status = 'in_production', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [model_id]
      );

      await client.query(
        `INSERT INTO status_history (model_id, to_status, changed_by, comment)
         VALUES ($1, 'in_production', $2, 'PPS approved by both buyer and constructor')`,
        [model_id, userId]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Approval recorded successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add PPS approval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  } finally {
    client.release();
  }
};

export const getPPSApprovals = async (req: AuthRequest, res: Response) => {
  try {
    const { model_id } = req.query;

    const result = await pool.query(
      `SELECT pa.*, u.full_name as approver_name
       FROM pps_approvals pa
       LEFT JOIN users u ON pa.approver_id = u.id
       WHERE pa.model_id = $1
       ORDER BY pa.created_at DESC`,
      [model_id]
    );

    // Get attachments for each approval
    const approvalsWithAttachments = await Promise.all(
      result.rows.map(async (approval) => {
        const attachments = await pool.query(
          `SELECT * FROM approval_attachments WHERE approval_id = $1`,
          [approval.id]
        );
        return {
          ...approval,
          attachments: attachments.rows
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: approvalsWithAttachments
    });
  } catch (error) {
    console.error('Get PPS approvals error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
