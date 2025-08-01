'use client';

import React, { useCallback, useState, useRef } from 'react';
import { ProcessableImage, ImageMetadata } from '../types';
import { processFileForHeic, isHeicFile } from '../utils/heicConverter';
import ImagePreview from './ImagePreview';

interface ImageUploaderProps {
  onImagesSelected: (images: ProcessableImage[]) => void;
  acceptedFormats?: string[];
  maxFileSize?: number;
  className?: string;
  showPreview?: boolean;
}

const DEFAULT_ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesSelected,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  className = '',
  showPreview = true,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessableImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル形式の検証（HEIC形式も考慮）
  const validateFileFormat = (file: File): boolean => {
    // HEIC形式の場合は常に受け入れる（後でJPEGに変換される）
    if (isHeicFile(file)) {
      return true;
    }
    
    return acceptedFormats.some(format => 
      file.type === format || 
      file.name.toLowerCase().endsWith(format.replace('image/', '.'))
    );
  };

  // ファイルサイズの検証
  const validateFileSize = (file: File): boolean => {
    return file.size <= maxFileSize;
  };

  // 画像メタデータの抽出
  const extractImageMetadata = async (file: File): Promise<ImageMetadata> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const metadata: ImageMetadata = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSize: file.size,
          format: file.type || `image/${file.name.split('.').pop()?.toLowerCase()}`,
          lastModified: file.lastModified,
        };
        URL.revokeObjectURL(url);
        resolve(metadata);
      };
      
      img.onerror = () => {
        // エラーの場合はデフォルト値を返す
        const metadata: ImageMetadata = {
          width: 0,
          height: 0,
          fileSize: file.size,
          format: file.type || `image/${file.name.split('.').pop()?.toLowerCase()}`,
          lastModified: file.lastModified,
        };
        URL.revokeObjectURL(url);
        resolve(metadata);
      };
      
      img.src = url;
    });
  };

  // ProcessableImageオブジェクトの作成（HEIC変換を含む）
  const createProcessableImage = async (file: File): Promise<ProcessableImage> => {
    try {
      // HEIC形式の場合はJPEGに変換
      const processedFile = await processFileForHeic(file);
      const metadata = await extractImageMetadata(processedFile);
      const originalUrl = URL.createObjectURL(processedFile);
      
      return {
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substr(2, 9)}`,
        file: processedFile, // 変換後のファイルを使用
        originalUrl,
        metadata,
        status: 'pending',
      };
    } catch (error) {
      console.error('Error creating processable image:', error);
      // エラーの場合は元のファイルでProcessableImageを作成
      const metadata = await extractImageMetadata(file);
      const originalUrl = URL.createObjectURL(file);
      
      return {
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        originalUrl,
        metadata,
        status: 'error',
      };
    }
  };

  // ファイル処理のメイン関数
  const processFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    setErrors([]);
    
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    // ファイル検証
    fileArray.forEach((file) => {
      if (!validateFileFormat(file)) {
        newErrors.push(`${file.name}: サポートされていないファイル形式です`);
        return;
      }
      
      if (!validateFileSize(file)) {
        newErrors.push(`${file.name}: ファイルサイズが大きすぎます (最大: ${Math.round(maxFileSize / 1024 / 1024)}MB)`);
        return;
      }
      
      validFiles.push(file);
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    }

    if (validFiles.length > 0) {
      try {
        // ProcessableImageオブジェクトの作成（HEIC変換を含む）
        const processableImages = await Promise.all(
          validFiles.map(file => createProcessableImage(file))
        );
        
        // プレビュー用の状態を更新
        const updatedImages = [...processedImages, ...processableImages];
        setProcessedImages(updatedImages);
        
        onImagesSelected(updatedImages);
      } catch (error) {
        console.error('Error processing files:', error);
        setErrors(prev => [...prev, 'ファイルの処理中にエラーが発生しました']);
      }
    }
    
    setIsProcessing(false);
  }, [acceptedFormats, maxFileSize, onImagesSelected]);

  // ドラッグ&ドロップのハンドラー
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // ファイル選択のハンドラー
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // ファイル入力をリセット（同じファイルを再選択可能にする）
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  // ファイル選択ダイアログを開く
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 画像を削除する
  const handleRemoveImage = useCallback((imageId: string) => {
    const updatedImages = processedImages.filter(img => img.id !== imageId);
    setProcessedImages(updatedImages);
    onImagesSelected(updatedImages);
    
    // 削除された画像のURLを解放
    const removedImage = processedImages.find(img => img.id === imageId);
    if (removedImage) {
      URL.revokeObjectURL(removedImage.originalUrl);
    }
  }, [processedImages, onImagesSelected]);

  return (
    <div className={`image-uploader ${className}`}>
      {/* プレビューエリア */}
      {showPreview && processedImages.length > 0 && (
        <div className="mb-6">
          <ImagePreview 
            images={processedImages}
            onRemoveImage={handleRemoveImage}
          />
        </div>
      )}

      {/* ドラッグ&ドロップエリア */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFileDialog();
          }
        }}
        aria-label="画像ファイルをアップロード。クリックまたはEnter/Spaceキーでファイル選択ダイアログを開く、またはファイルをドラッグ&ドロップ"
        aria-describedby="upload-instructions"
      >
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">ファイルを処理中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2">
              画像をドラッグ&ドロップ
            </p>
            <p className="text-sm text-gray-500 mb-4">
              または、クリックしてファイルを選択
            </p>
            <p id="upload-instructions" className="text-xs text-gray-400">
              対応形式: JPG, PNG, HEIC | 最大サイズ: {Math.round(maxFileSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* エラー表示 */}
      {errors.length > 0 && (
        <div 
          className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <h4 className="text-sm font-medium text-red-800 mb-2">
            以下のエラーが発生しました:
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2" aria-hidden="true">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;