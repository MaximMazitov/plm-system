import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image as ImageIcon, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui';
import { uploadFile, uploadMultipleFiles, type FileCategory, type UploadedFile } from '../services/uploadApi';
import { clsx } from 'clsx';

interface FileUploadProps {
  category?: FileCategory;
  modelId?: number;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  result?: UploadedFile;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <ImageIcon className="w-8 h-8 text-blue-500" />;
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="w-8 h-8 text-red-500" />;
  }
  return <File className="w-8 h-8 text-gray-500" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUpload = ({
  category = 'other',
  modelId,
  multiple = false,
  maxFiles = 10,
  maxSizeMB = 50,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  onUploadComplete,
  onError,
  className,
}: FileUploadProps) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `Файл слишком большой. Максимум ${maxSizeMB}MB`;
    }
    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileArray = Array.from(newFiles);
    const validFiles: FileWithProgress[] = [];

    for (const file of fileArray) {
      if (!multiple && files.length + validFiles.length >= 1) break;
      if (files.length + validFiles.length >= maxFiles) break;

      const error = validateFile(file);
      validFiles.push({
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      });
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, [files.length, maxFiles, maxSizeMB, multiple]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      if (multiple && pendingFiles.length > 1) {
        // Upload multiple files at once
        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
          )
        );

        const result = await uploadMultipleFiles(
          pendingFiles.map((f) => f.file),
          category,
          modelId,
          (progress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.status === 'uploading' ? { ...f, progress } : f
              )
            );
          }
        );

        if (result.success) {
          uploadedFiles.push(...result.data);
          setFiles((prev) =>
            prev.map((f) => {
              if (f.status === 'uploading') {
                const resultIndex = pendingFiles.findIndex((pf) => pf.file === f.file);
                return {
                  ...f,
                  status: 'success' as const,
                  progress: 100,
                  result: result.data[resultIndex],
                };
              }
              return f;
            })
          );
        } else {
          throw new Error(result.error || 'Ошибка загрузки');
        }
      } else {
        // Upload files one by one
        for (let i = 0; i < pendingFiles.length; i++) {
          const fileWithProgress = pendingFiles[i];

          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? { ...f, status: 'uploading' as const }
                : f
            )
          );

          try {
            const result = await uploadFile(
              fileWithProgress.file,
              category,
              modelId,
              (progress) => {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.file === fileWithProgress.file ? { ...f, progress } : f
                  )
                );
              }
            );

            if (result.success) {
              uploadedFiles.push(result.data);
              setFiles((prev) =>
                prev.map((f) =>
                  f.file === fileWithProgress.file
                    ? { ...f, status: 'success' as const, progress: 100, result: result.data }
                    : f
                )
              );
            } else {
              throw new Error(result.error || 'Ошибка загрузки');
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
            setFiles((prev) =>
              prev.map((f) =>
                f.file === fileWithProgress.file
                  ? { ...f, status: 'error' as const, error: errorMessage }
                  : f
              )
            );
            onError?.(errorMessage);
          }
        }
      }

      if (uploadedFiles.length > 0) {
        onUploadComplete?.(uploadedFiles);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  const hasErrors = files.some((f) => f.status === 'error');
  const hasPending = files.some((f) => f.status === 'pending');
  const hasSuccess = files.some((f) => f.status === 'success');

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">
          {isDragging
            ? 'Отпустите файлы здесь'
            : 'Перетащите файлы сюда или нажмите для выбора'}
        </p>
        <p className="text-sm text-gray-400">
          {multiple ? `До ${maxFiles} файлов, ` : ''}максимум {maxSizeMB}MB каждый
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, index) => (
            <div
              key={`${f.file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {getFileIcon(f.file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {f.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(f.file.size)}
                </p>
                {f.status === 'uploading' && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-primary-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.error && (
                  <p className="text-xs text-red-500 mt-1">{f.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {f.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                )}
                {f.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {f.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                {f.status !== 'uploading' && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex gap-2">
          {hasPending && (
            <Button
              onClick={uploadFiles}
              disabled={isUploading}
              isLoading={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Загрузить {files.filter((f) => f.status === 'pending').length} файл(ов)
            </Button>
          )}
          {hasSuccess && (
            <Button variant="secondary" onClick={clearCompleted}>
              Очистить загруженные
            </Button>
          )}
          {(hasErrors || hasPending) && !isUploading && (
            <Button variant="outline" onClick={() => setFiles([])}>
              Очистить все
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
