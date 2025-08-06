'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ProcessableImage } from '../types';
import { DEFAULT_BLUR_DATA_URL, getResponsiveImageSizes } from '../utils/imageOptimization';

interface ImagePreviewProps {
  images: ProcessableImage[];
  onRemoveImage?: (imageId: string) => void;
  className?: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  onRemoveImage,
  className = '',
}) => {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  if (images.length === 0) {
    return null;
  }

  const selectedImage = selectedImageId 
    ? images.find(img => img.id === selectedImageId)
    : null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDimensions = (width: number, height: number): string => {
    if (width === 0 || height === 0) return '不明';
    return `${width} × ${height}`;
  };

  return (
    <div className={`image-preview ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          アップロードされた画像 ({images.length}枚)
        </h3>
      </div>

      {/* 画像グリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group cursor-pointer"
            onClick={() => setSelectedImageId(image.id)}
          >
            {/* 画像サムネイル */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-300 transition-colors">
              <Image
                src={image.originalUrl}
                alt={image.file.name}
                width={200}
                height={200}
                className="w-full h-full object-cover"
                priority={false}
                placeholder="blur"
                blurDataURL={DEFAULT_BLUR_DATA_URL}
                sizes={getResponsiveImageSizes('thumbnail')}
              />
            </div>

            {/* ステータスインジケーター */}
            <div className="absolute top-2 left-2">
              {image.status === 'processing' && (
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              )}
              {image.status === 'completed' && (
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {image.status === 'error' && (
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* 削除ボタン */}
            {onRemoveImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(image.id);
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                aria-label={`${image.file.name}を削除`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {/* ファイル名 */}
            <div className="mt-2">
              <p className="text-xs text-gray-600 truncate" title={image.file.name}>
                {image.file.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 詳細モーダル */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImageId(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="text-lg font-medium text-gray-900 truncate">
                {selectedImage.file.name}
              </h4>
              <button
                onClick={() => setSelectedImageId(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="閉じる"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row">
              {/* 画像表示エリア */}
              <div className="flex-1 p-4">
                <div className="flex items-center justify-center bg-gray-50 rounded-lg min-h-96">
                  <Image
                    src={selectedImage.originalUrl}
                    alt={selectedImage.file.name}
                    width={800}
                    height={600}
                    className="max-w-full max-h-96 object-contain"
                    priority={true}
                    placeholder="blur"
                    blurDataURL={DEFAULT_BLUR_DATA_URL}
                    sizes={getResponsiveImageSizes('fullsize')}
                  />
                </div>
              </div>

              {/* メタデータ表示エリア */}
              <div className="w-full lg:w-80 p-4 border-t lg:border-t-0 lg:border-l bg-gray-50">
                <h5 className="text-sm font-medium text-gray-900 mb-3">画像情報</h5>
                
                <div className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">ファイル名</dt>
                    <dd className="text-sm text-gray-900 break-all">{selectedImage.file.name}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-xs font-medium text-gray-500">ファイルサイズ</dt>
                    <dd className="text-sm text-gray-900">{formatFileSize(selectedImage.metadata.size)}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-xs font-medium text-gray-500">画像サイズ</dt>
                    <dd className="text-sm text-gray-900">
                      {selectedImage.metadata.width && selectedImage.metadata.height 
                        ? formatDimensions(selectedImage.metadata.width, selectedImage.metadata.height)
                        : '不明'}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-xs font-medium text-gray-500">形式</dt>
                    <dd className="text-sm text-gray-900">{selectedImage.metadata.type}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-xs font-medium text-gray-500">最終更新</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(selectedImage.metadata.lastModified).toLocaleString('ja-JP')}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-xs font-medium text-gray-500">ステータス</dt>
                    <dd className="text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedImage.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedImage.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        selectedImage.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedImage.status === 'pending' && '待機中'}
                        {selectedImage.status === 'processing' && '処理中'}
                        {selectedImage.status === 'completed' && '完了'}
                        {selectedImage.status === 'error' && 'エラー'}
                      </span>
                    </dd>
                  </div>
                </div>

                {/* 削除ボタン */}
                {onRemoveImage && (
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        onRemoveImage(selectedImage.id);
                        setSelectedImageId(null);
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                    >
                      この画像を削除
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePreview;