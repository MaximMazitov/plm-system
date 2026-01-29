import AWS from 'aws-sdk';
import { Readable } from 'stream';

// Configure Cloudflare R2 (S3-compatible)
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const s3 = new AWS.S3({
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: 'auto',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'plm-system-files';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

export const storageService = {
  /**
   * Upload file to Yandex Object Storage
   */
  async uploadFile(
    file: Buffer | Readable,
    key: string,
    contentType: string
  ): Promise<UploadResult> {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'private',
    };

    const result = await s3.upload(params).promise();

    return {
      key: result.Key,
      url: result.Location,
      size: Buffer.isBuffer(file) ? file.length : 0,
    };
  },

  /**
   * Get signed URL for file download (valid for 1 hour)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
    };

    return s3.getSignedUrlPromise('getObject', params);
  },

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<void> {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
  },

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const params: AWS.S3.DeleteObjectsRequest = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    };

    await s3.deleteObjects(params).promise();
  },

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await s3.headObject({ Bucket: BUCKET_NAME, Key: key }).promise();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput | null> {
    try {
      return await s3.headObject({ Bucket: BUCKET_NAME, Key: key }).promise();
    } catch {
      return null;
    }
  },

  /**
   * List files in a directory/prefix
   */
  async listFiles(prefix: string): Promise<AWS.S3.Object[]> {
    const params: AWS.S3.ListObjectsV2Request = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    const result = await s3.listObjectsV2(params).promise();
    return result.Contents || [];
  },

  /**
   * Copy file within storage
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const params: AWS.S3.CopyObjectRequest = {
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
    };

    await s3.copyObject(params).promise();
  },

  /**
   * Generate key for model files
   */
  generateModelFileKey(modelId: string, filename: string, type: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `models/${modelId}/${type}/${timestamp}_${sanitizedFilename}`;
  },
};

export default storageService;
