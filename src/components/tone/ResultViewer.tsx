/**
 * 結果表示コンポーネント
 */

'use client';

import React, { useState } from 'react';
import { ProcessedImage } from '../../types/tone';
import { QuickToolsService, trackServiceNavigation, shareImageWithService } from '../../utils/quickToolsIntegration';

interface ResultViewerProps {
  processedImages: ProcessedImage[];
  recommendedServices: QuickToolsService[];
}

const ResultViewer: React.FC<ResultViewerProps> = ({
  processedImages,
  recommendedServices,
}) => {
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadSingle = async (image: ProcessedImage) => {
    try {
      const link = document.createElement('a');
      link.href = image.processedUrl;
      link.download = `easytone_${image.originalImage.metadata.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);

    try {
      for (const image of processedImages) {
        await handleDownloadSingle(image);
        // 少し待機してブラウザの負荷を軽減
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Batch download error:', error);
      alert('一括ダウンロードに失敗しました');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleServiceNavigation = (service: QuickToolsService) => {
    trackServiceNavigation('tone', service.id);

    if (processedImages.length > 0) {
      try {
        const imageData = {
          url: processedImages[0].processedUrl,
          name: processedImages[0].originalImage.metadata.name,
          metadata: processedImages[0].originalImage.metadata,
        };
        const sharedUrl = shareImageWithService(service.id, imageData);
        window.open(sharedUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.warn('Failed to share image with service:', error);
        window.open(service.url, '_blank', 'noopener,noreferrer');
      }
    } else {
      window.open(service.url, '_blank', 'noopener,noreferrer');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${Math.round(ms / 1000)}s`;
  };

  return (
    <div className="space-y-8">
      {/* 統計情報 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{processedImages.length}</div>
            <div className="text-sm text-green-700">処理完了</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {formatFileSize(processedImages.reduce((sum, img) => sum + img.fileSize, 0))}
            </div>
            <div className="text-sm text-green-700">総ファイルサイズ</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {formatProcessingTime(processedImages.reduce((sum, img) => sum + img.processingTime, 0))}
            </div>
            <div className="text-sm text-green-700">総処理時間</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <div className="text-sm text-green-700">成功率</div>
          </div>
        </div>
      </div>

      {/* ダウンロードボタン */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleDownloadAll}
          disabled={isDownloading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ダウンロード中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              すべてダウンロード ({processedImages.length}枚)
            </>
          )}
        </button>
      </div>

      {/* 処理結果一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedImages.map((image) => (
          <div key={image.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="relative">
              <img
                src={image.processedUrl}
                alt={image.originalImage.metadata.name}
                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(image)}
              />
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {formatFileSize(image.fileSize)}
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-medium text-gray-900 truncate mb-2">
                {image.originalImage.metadata.name}
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>処理時間: {formatProcessingTime(image.processingTime)}</div>
                <div>
                  サイズ: {image.originalImage.metadata.width} × {image.originalImage.metadata.height}
                </div>
              </div>

              <button
                onClick={() => handleDownloadSingle(image)}
                className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm"
              >
                ダウンロード
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 推奨サービス */}
      {recommendedServices.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            次におすすめのツール
          </h3>
          <p className="text-gray-600 mb-6">
            画像処理を続けて、さらにプロフェッショナルな仕上がりに
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedServices.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceNavigation(service)}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <span className="text-2xl mr-3">{service.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{service.name}</h4>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </div>
                <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 画像詳細モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedImage.originalImage.metadata.name}
                </h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <img
                src={selectedImage.processedUrl}
                alt={selectedImage.originalImage.metadata.name}
                className="w-full max-h-96 object-contain mb-4"
              />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">ファイルサイズ:</span> {formatFileSize(selectedImage.fileSize)}
                </div>
                <div>
                  <span className="font-medium">処理時間:</span> {formatProcessingTime(selectedImage.processingTime)}
                </div>
                <div>
                  <span className="font-medium">画像サイズ:</span> {selectedImage.originalImage.metadata.width} × {selectedImage.originalImage.metadata.height}
                </div>
                <div>
                  <span className="font-medium">適用設定:</span> {selectedImage.appliedPreset}
                </div>
              </div>

              <button
                onClick={() => handleDownloadSingle(selectedImage)}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                この画像をダウンロード
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultViewer;