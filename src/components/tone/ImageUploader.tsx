/**
 * 画像アップロードコンポーネント
 */

'use client';

import React, { useCallback, useState } from 'react';
import { ProcessableImage, ImageMetadata } from '../../types/tone';

interface ImageUploaderProps {
  onImagesUploaded: (images: ProcessableImage[]) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesUploaded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const createImageMetadata = (file: File): Promise<ImageMetadata> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
        });
      };
      img.onerror = () => {
        resolve({
          width: 0,
          height: 0,
          size: file.size,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const processFiles = useCallback(async (files: FileList) => {
    setIsUploading(true);
    
    const validFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB制限
    );

    if (validFiles.length === 0) {
      alert('有効な画像ファイルを選択してください（10MB以下）');
      setIsUploading(false);
      return;
    }

    try {
      const processableImages: ProcessableImage[] = await Promise.all(
        validFiles.map(async (file) => {
          const metadata = await createImageMetadata(file);
          const url = URL.createObjectURL(file);
          
          return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            originalUrl: url,
            metadata,
            status: 'pending' as const,
          };
        })
      );

      onImagesUploaded(processableImages);
    } catch (error) {
      console.error('画像の処理中にエラーが発生しました:', error);
      alert('画像の処理中にエラーが発生しました');
    } finally {
      setIsUploading(false);
    }
  }, [onImagesUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  return (
    <div className="w-full px-6 pb-6">
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:shadow-lg'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
            {isUploading ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            ) : (
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          
          <div>
            <p className="text-xl font-bold text-gray-900 mb-2">
              {isUploading ? '画像を処理中...' : '画像をドラッグ&ドロップ'}
            </p>
            <p className="text-gray-600">
              または<span className="text-blue-600 font-semibold hover:text-blue-700 cursor-pointer">クリックして選択</span>
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
            <div className="flex items-center justify-center space-x-4">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                JPG, PNG, HEIC対応
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                複数ファイル選択可能
              </span>
            </div>
            <p className="text-center">最大ファイルサイズ: 10MB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;