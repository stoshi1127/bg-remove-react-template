/**
 * プリセット選択コンポーネント
 */

'use client';

import React, { useState } from 'react';
import { FilterPreset, ProcessableImage, ProcessedImage, ProcessingProgress } from '../../types/tone';

interface PresetSelectorProps {
  previewImages: ProcessableImage[];
  onPresetSelected: (preset: FilterPreset) => void;
  selectedPreset: FilterPreset | null;
  onProcessStart: () => void;
  onProcessingComplete: (results: ProcessedImage[]) => void;
  onProcessingError: (error: string) => void;
  isProcessing: boolean;
}

// プリセットフィルターの定義
const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'natural',
    name: 'ナチュラル',
    description: '自然な色合いを保ちながら明るさを調整',
    icon: '🌿',
    filters: {
      brightness: 1.1,
      contrast: 1.05,
      saturation: 1.0,
      hue: 0,
      sharpness: 1.0,
      warmth: 1.0,
    },
  },
  {
    id: 'warm',
    name: 'ウォーム',
    description: '暖かみのある色調で温かい印象に',
    icon: '🌅',
    filters: {
      brightness: 1.05,
      contrast: 1.1,
      saturation: 1.15,
      hue: 5,
      sharpness: 1.0,
      warmth: 1.2,
    },
  },
  {
    id: 'cool',
    name: 'クール',
    description: '涼しげで洗練された印象に',
    icon: '❄️',
    filters: {
      brightness: 1.0,
      contrast: 1.15,
      saturation: 0.95,
      hue: -5,
      sharpness: 1.1,
      warmth: 0.9,
    },
  },
  {
    id: 'vintage',
    name: 'ヴィンテージ',
    description: 'レトロで味のある仕上がりに',
    icon: '📷',
    filters: {
      brightness: 0.95,
      contrast: 1.2,
      saturation: 0.8,
      hue: 10,
      sharpness: 0.9,
      warmth: 1.3,
    },
  },
  {
    id: 'vivid',
    name: 'ビビッド',
    description: '鮮やかで印象的な色彩に',
    icon: '🌈',
    filters: {
      brightness: 1.1,
      contrast: 1.25,
      saturation: 1.4,
      hue: 0,
      sharpness: 1.15,
      warmth: 1.05,
    },
  },
  {
    id: 'monochrome',
    name: 'モノクローム',
    description: 'モダンな白黒写真風に',
    icon: '⚫',
    filters: {
      brightness: 1.0,
      contrast: 1.3,
      saturation: 0.0,
      hue: 0,
      sharpness: 1.1,
      warmth: 1.0,
    },
  },
];

const PresetSelector: React.FC<PresetSelectorProps> = ({
  previewImages,
  onPresetSelected,
  selectedPreset,
  onProcessStart,
  onProcessingComplete,
  onProcessingError,
  isProcessing,
}) => {
  const [previewPreset, setPreviewPreset] = useState<FilterPreset | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);

  const handlePresetClick = (preset: FilterPreset) => {
    onPresetSelected(preset);
  };

  const handlePresetHover = (preset: FilterPreset) => {
    setPreviewPreset(preset);
  };

  const handlePresetLeave = () => {
    setPreviewPreset(null);
  };

  const getFilterStyle = (preset: FilterPreset) => {
    const { brightness, contrast, saturation, hue, warmth } = preset.filters;
    
    return {
      filter: `
        brightness(${brightness})
        contrast(${contrast})
        saturate(${saturation})
        hue-rotate(${hue}deg)
        sepia(${warmth > 1 ? (warmth - 1) * 0.3 : 0})
      `.trim(),
    };
  };

  const applyFilterToCanvas = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    preset: FilterPreset
  ) => {
    const { brightness, contrast, saturation, hue, warmth } = preset.filters;
    
    // CSS filtersをcanvasに適用
    ctx.filter = `
      brightness(${brightness})
      contrast(${contrast})
      saturate(${saturation})
      hue-rotate(${hue}deg)
      sepia(${warmth > 1 ? (warmth - 1) * 0.3 : 0})
    `.trim();
  };

  const processImage = async (image: ProcessableImage, preset: FilterPreset): Promise<ProcessedImage> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Canvas context not available');
          }

          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // フィルターを適用
          applyFilterToCanvas(canvas, ctx, preset);
          
          // 画像を描画
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            const processedUrl = URL.createObjectURL(blob);
            const processingTime = Date.now() - startTime;

            resolve({
              id: `processed-${image.id}`,
              originalImage: image,
              processedUrl,
              processedBlob: blob,
              appliedPreset: preset.id,
              processingTime,
              fileSize: blob.size,
            });
          }, 'image/jpeg', 0.9);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = image.originalUrl;
    });
  };

  const handleStartProcessing = async () => {
    if (!selectedPreset) return;
    
    onProcessStart();
    
    try {
      const results: ProcessedImage[] = [];
      
      for (let i = 0; i < previewImages.length; i++) {
        const image = previewImages[i];
        
        setProgress({
          current: i + 1,
          total: previewImages.length,
          fileName: image.metadata.name,
          progress: ((i + 1) / previewImages.length) * 100,
        });

        const processedImage = await processImage(image, selectedPreset);
        results.push(processedImage);
      }

      onProcessingComplete(results);
      setProgress(null);
    } catch (error) {
      console.error('Processing error:', error);
      
      // より詳細なエラーメッセージを表示
      let errorMessage = '画像の処理中にエラーが発生しました。';
      if (error instanceof Error) {
        if (error.message.includes('Canvas context not available')) {
          errorMessage = 'ブラウザの制限により画像処理ができませんでした。ページを再読み込みして再試行してください。';
        } else if (error.message.includes('Failed to load image')) {
          errorMessage = '画像の読み込みに失敗しました。画像ファイルが破損している可能性があります。';
        } else if (error.message.includes('Failed to create blob')) {
          errorMessage = 'メモリ不足により処理に失敗しました。画像サイズを小さくするか、一度に処理する画像数を減らしてください。';
        }
      }
      
      setProgress(null);
      onProcessingError(errorMessage);
    }
  };

  const currentPreset = previewPreset || selectedPreset;

  return (
    <div className="space-y-6">
      {/* 複数画像プレビュー */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {previewImages.length}枚の画像にプレビューを適用
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-2 bg-gray-50 rounded-lg">
          {previewImages.map((image, index) => (
            <div key={image.id} className="relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <img
                src={image.originalUrl}
                alt={`プレビュー ${index + 1}: ${image.metadata.name}`}
                className="w-full h-24 md:h-32 object-cover transition-all duration-300"
                style={currentPreset ? getFilterStyle(currentPreset) : {}}
              />
              <div className="absolute top-1 left-1 bg-black bg-opacity-70 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                {index + 1}
              </div>
              {currentPreset && (
                <div className="absolute bottom-1 left-1 bg-blue-600 bg-opacity-90 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                  {currentPreset.name}
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white px-1.5 py-0.5 rounded text-xs">
                {image.metadata.name.length > 8 ? `${image.metadata.name.substring(0, 8)}...` : image.metadata.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* プリセット選択 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {FILTER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset)}
            onMouseEnter={() => handlePresetHover(preset)}
            onMouseLeave={handlePresetLeave}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedPreset?.id === preset.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">{preset.icon}</span>
              <span className="font-medium text-gray-900">{preset.name}</span>
            </div>
            <p className="text-sm text-gray-600">{preset.description}</p>
          </button>
        ))}
      </div>

      {selectedPreset && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{selectedPreset.icon}</span>
            <span className="font-medium text-blue-900">{selectedPreset.name}</span>
            <span className="text-sm text-blue-600">が選択されています</span>
          </div>
          <p className="text-sm text-blue-700 mb-4">{selectedPreset.description}</p>
          
          {/* 処理開始ボタン */}
          {!isProcessing ? (
            <button
              onClick={handleStartProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              処理を開始 ({previewImages.length}枚の画像を処理)
            </button>
          ) : (
            <div className="space-y-4">
              {/* 進行状況 */}
              {progress && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      処理中: {progress.fileName}
                    </span>
                    <span className="text-sm text-gray-600">
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <div className="text-center mt-2 text-sm text-gray-600">
                    {Math.round(progress.progress)}% 完了
                  </div>
                </div>
              )}

              {/* 処理中表示 */}
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">画像を処理しています...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PresetSelector;