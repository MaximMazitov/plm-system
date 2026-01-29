import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

// Cloudflare R2 конфигурация
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'plm-files';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// S3 совместимый клиент для Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Загружает файл в Cloudflare R2
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  originalFilename: string,
  folder: string = 'files',
  contentType?: string
): Promise<UploadResult> {
  try {
    // Проверяем настройки
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.error('R2 storage not configured - using local storage fallback');
      return { success: false, error: 'R2 storage not configured' };
    }

    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalFilename);
    const key = `${folder}/${uniqueSuffix}${ext}`;

    // Определяем content type
    const mimeType = contentType || getMimeType(ext);

    // Загружаем в R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    // Формируем публичный URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    console.log(`File uploaded to R2: ${key}`);

    return {
      success: true,
      url: publicUrl,
      key: key,
    };
  } catch (error: any) {
    console.error('R2 upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/**
 * Удаляет файл из Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.error('R2 storage not configured');
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`File deleted from R2: ${key}`);
    return true;
  } catch (error) {
    console.error('R2 delete error:', error);
    return false;
  }
}

/**
 * Получает presigned URL для временного доступа к файлу
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return null;
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('R2 presigned URL error:', error);
    return null;
  }
}

/**
 * Извлекает ключ файла из URL
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    if (!url) return null;

    // Если это локальный путь
    if (url.startsWith('/uploads/')) {
      return null;
    }

    // Извлекаем ключ из R2 URL
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Убираем ведущий слеш
    return pathname.startsWith('/') ? pathname.substring(1) : pathname;
  } catch {
    return null;
  }
}

/**
 * Проверяет, настроено ли R2 хранилище
 */
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

/**
 * Определяет MIME тип по расширению файла
 */
function getMimeType(ext: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.ai': 'application/postscript',
    '.psd': 'image/vnd.adobe.photoshop',
    '.eps': 'application/postscript',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
  };

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

export default {
  uploadToR2,
  deleteFromR2,
  getPresignedUrl,
  extractKeyFromUrl,
  isR2Configured,
};
