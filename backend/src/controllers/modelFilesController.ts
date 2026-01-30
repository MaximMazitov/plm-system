import { Response } from 'express';
import pool from '../database/connection';
import type { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import https from 'https';
import http from 'http';
import { uploadToR2, deleteFromR2, extractKeyFromUrl, isR2Configured } from '../services/r2Storage';

// Настройка multer - используем memory storage для R2
const storage = isR2Configured()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for large AI/pattern files
  }
});

// Получить файлы модели
export const getModelFiles = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM model_files
       WHERE model_id = $1
       ORDER BY file_type, uploaded_at DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get model files error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch model files'
    });
  }
};

// Загрузить файл модели
export const uploadModelFile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { file_type } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Декодируем имя файла, если оно содержит кириллицу
    const file_name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    let file_url: string;
    let r2_key: string | null = null;

    // Пробуем загрузить в R2
    console.log(`[Upload] Checking R2 configuration...`);
    console.log(`[Upload] isR2Configured: ${isR2Configured()}`);
    console.log(`[Upload] Has buffer: ${!!req.file.buffer}`);
    console.log(`[Upload] Buffer size: ${req.file.buffer?.length || 0}`);

    if (isR2Configured() && req.file.buffer) {
      console.log(`[Upload] Attempting R2 upload...`);
      const uploadResult = await uploadToR2(
        req.file.buffer,
        file_name,
        `models/${id}/${file_type || 'files'}`,
        req.file.mimetype
      );

      console.log(`[Upload] R2 result: ${JSON.stringify(uploadResult)}`);

      if (uploadResult.success && uploadResult.url) {
        file_url = uploadResult.url;
        r2_key = uploadResult.key || null;
        console.log(`[Upload] R2 upload successful: ${file_url}`);
      } else {
        // Fallback to local storage
        console.log(`[Upload] R2 upload failed: ${uploadResult.error}, falling back to local storage`);
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const localFilename = uniqueSuffix + path.extname(file_name);
        fs.writeFileSync(path.join(uploadDir, localFilename), req.file.buffer);
        file_url = `/uploads/${localFilename}`;
      }
    } else if (req.file.filename) {
      // Local storage (diskStorage)
      file_url = `/uploads/${req.file.filename}`;
    } else {
      return res.status(500).json({
        success: false,
        error: 'File upload failed - no file data'
      });
    }

    const result = await pool.query(
      `INSERT INTO model_files (model_id, file_name, file_url, file_type, r2_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, file_name, file_url, file_type, r2_key]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Upload model file error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload model file'
    });
  }
};

// Удалить файл модели
export const deleteModelFile = async (req: AuthRequest, res: Response) => {
  try {
    const { id, fileId } = req.params;

    // Получаем информацию о файле
    const fileResult = await pool.query(
      'SELECT file_url, r2_key FROM model_files WHERE id = $1 AND model_id = $2',
      [fileId, id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const { file_url, r2_key } = fileResult.rows[0];

    // Удаляем файл из R2 или с диска
    if (r2_key) {
      await deleteFromR2(r2_key);
    } else if (file_url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../', file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else {
      // Пробуем извлечь ключ из URL
      const key = extractKeyFromUrl(file_url);
      if (key) {
        await deleteFromR2(key);
      }
    }

    // Удаляем запись из БД
    await pool.query('DELETE FROM model_files WHERE id = $1', [fileId]);

    return res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete model file error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete model file'
    });
  }
};

// Helper function to download file from URL
function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Экспортировать все файлы модели в ZIP-архив
export const exportModelFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Получаем информацию о модели
    const modelResult = await pool.query(
      'SELECT model_number FROM models WHERE id = $1',
      [id]
    );

    if (modelResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Model not found'
      });
      return;
    }

    const modelNumber = modelResult.rows[0].model_number;

    // Получаем все файлы модели
    const filesResult = await pool.query(
      'SELECT file_name, file_url, file_type, r2_key FROM model_files WHERE model_id = $1',
      [id]
    );

    if (filesResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No files found for this model'
      });
      return;
    }

    // Создаем ZIP-архив
    const archive = archiver('zip', {
      zlib: { level: 9 } // Максимальное сжатие
    });

    // Устанавливаем заголовки для скачивания
    // Очищаем имя файла от недопустимых символов
    const sanitizedModelNumber = modelNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedModelNumber}_files.zip"`);

    // Передаем архив в response
    archive.pipe(res);

    // Группируем файлы по типам в папки
    const fileTypeMap: { [key: string]: string } = {
      sketch: 'Sketches',
      tech_pack: 'Artwork',
      print: 'Prints',
      pattern: 'Patterns',
      size_spec: 'Size_Specs'
    };

    // Добавляем файлы в архив
    for (const file of filesResult.rows) {
      const folderName = fileTypeMap[file.file_type] || 'Other';

      if (file.file_url.startsWith('/uploads/')) {
        // Локальный файл
        const filePath = path.join(__dirname, '../../', file.file_url);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `${folderName}/${file.file_name}` });
        }
      } else {
        // Файл в R2 - загружаем и добавляем
        try {
          const fileBuffer = await downloadFile(file.file_url);
          archive.append(fileBuffer, { name: `${folderName}/${file.file_name}` });
        } catch (downloadError) {
          console.error(`Failed to download file ${file.file_name}:`, downloadError);
        }
      }
    }

    // Обработка ошибок архивации
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Archive creation failed'
        });
      }
    });

    // Завершаем создание архива
    archive.finalize();
  } catch (error) {
    console.error('Export model files error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to export model files'
      });
    }
  }
};
