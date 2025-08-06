'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { FilterPreset, FilterConfig } from '../types/filter';
import { DEFAULT_BLUR_DATA_URL, getResponsiveImageSizes } from '../utils/imageOptimization';

import styles from './PresetPreview.module.css';

interface PresetPreviewProps {
  selectedPreset: FilterPreset | null;
  previewImage: File | null;
  className?: string;
}

/**
 * プリセットプレビューコンポーネント
 * 選択されたプリセットの効果をリアルタイムでプレビュー表示
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export const PresetPreview: React.FC<PresetPreviewProps> = ({
  selectedPreset,
  previewImage,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewImage) {
      setOriginalImageUrl(null);
      setPreviewUrl(null);
      return;
    }

    // Create URL for the original image
    const imageUrl = URL.createObjectURL(previewImage);
    setOriginalImageUrl(imageUrl);

    // Cleanup function to revoke the URL
    return () => {
      URL.revokeObjectURL(imageUrl);
    };
  }, [previewImage]);

  useEffect(() => {
    if (!selectedPreset || !previewImage || !canvasRef.current) {
      setPreviewUrl(null);
      return;
    }

    const applyPresetPreview = async () => {
      setIsProcessing(true);
      try {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 画像を読み込み
        const img = new window.Image();
        img.onload = () => {
          // キャンバスサイズを設定（プレビュー用に小さくする）
          const maxSize = 300;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;

          // 画像を描画
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // フィルターを適用
          applyFiltersToCanvas(ctx, canvas, selectedPreset.filters);

          // プレビューURLを生成
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPreviewUrl(dataUrl);
          setIsProcessing(false);
        };

        img.onerror = () => {
          setIsProcessing(false);
        };

        img.src = originalImageUrl!;
      } catch (error) {
        console.error('Preview generation failed:', error);
        setIsProcessing(false);
      }
    };

    applyPresetPreview();
  }, [selectedPreset, previewImage, originalImageUrl]);

  if (!selectedPreset) {
    return (
      <div className={`${styles['preset-preview']} ${className}`}>
        <div className={styles['preset-preview__placeholder']}>
          <p>
            プリセットを選択すると、プレビューが表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles['preset-preview']} ${className}`}>
      <div className={styles['preset-preview__header']}>
        <div className={styles['preset-preview__title']}>
          <span className={styles['preset-preview__icon']} aria-hidden="true">
            {selectedPreset.icon}
          </span>
          <h3 className={styles['preset-preview__name']}>
            {selectedPreset.name}
          </h3>
        </div>
        <p className={styles['preset-preview__description']}>
          {selectedPreset.description}
        </p>
      </div>

      <div className={styles['preset-preview__content']}>
        {previewImage ? (
          <div className={styles['preset-preview__comparison']}>
            <div className={styles['preset-preview__before']}>
              <h4 className={styles['preset-preview__label']}>処理前</h4>
              <Image
                src={originalImageUrl!}
                alt="処理前のプレビュー"
                width={300}
                height={200}
                className={styles['preset-preview__image']}
                priority={false}
                placeholder="blur"
                blurDataURL={DEFAULT_BLUR_DATA_URL}
                sizes={getResponsiveImageSizes('preview')}
              />
            </div>
            
            <div className={styles['preset-preview__after']}>
              <h4 className={styles['preset-preview__label']}>処理後</h4>
              <div className={styles['preset-preview__image-container']}>
                {isProcessing ? (
                  <div className={styles['preset-preview__loading']}>
                    <div className={styles['preset-preview__spinner']} />
                    <p>プレビュー生成中...</p>
                  </div>
                ) : previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="処理後のプレビュー"
                    width={300}
                    height={200}
                    className={styles['preset-preview__image']}
                    priority={false}
                    placeholder="blur"
                    blurDataURL={DEFAULT_BLUR_DATA_URL}
                    sizes={getResponsiveImageSizes('preview')}
                  />
                ) : (
                  <div className={styles['preset-preview__error']}>
                    <p>プレビューを生成できませんでした</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles['preset-preview__no-image']}>
            <p>
              画像をアップロードすると、プレビューが表示されます
            </p>
          </div>
        )}
      </div>

      {/* 非表示のキャンバス（プレビュー生成用） */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
};

/**
 * キャンバスにフィルターを適用する関数
 */
const applyFiltersToCanvas = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  filters: FilterConfig
) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 明度調整
    if (filters.brightness !== 0) {
      const brightness = filters.brightness * 2.55; // -100~100 を -255~255 に変換
      r = Math.max(0, Math.min(255, r + brightness));
      g = Math.max(0, Math.min(255, g + brightness));
      b = Math.max(0, Math.min(255, b + brightness));
    }

    // コントラスト調整
    if (filters.contrast !== 0) {
      const contrast = (filters.contrast + 100) / 100; // -100~100 を 0~2 に変換
      r = Math.max(0, Math.min(255, ((r - 128) * contrast) + 128));
      g = Math.max(0, Math.min(255, ((g - 128) * contrast) + 128));
      b = Math.max(0, Math.min(255, ((b - 128) * contrast) + 128));
    }

    // 彩度調整
    if (filters.saturation !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const saturation = (filters.saturation + 100) / 100; // -100~100 を 0~2 に変換
      r = Math.max(0, Math.min(255, gray + (r - gray) * saturation));
      g = Math.max(0, Math.min(255, gray + (g - gray) * saturation));
      b = Math.max(0, Math.min(255, gray + (b - gray) * saturation));
    }

    // 色温度調整（暖かみ）
    if (filters.warmth !== 0) {
      const warmth = filters.warmth / 100; // -100~100 を -1~1 に変換
      if (warmth > 0) {
        // 暖色系に調整
        r = Math.max(0, Math.min(255, r + warmth * 30));
        b = Math.max(0, Math.min(255, b - warmth * 20));
      } else {
        // 寒色系に調整
        r = Math.max(0, Math.min(255, r + warmth * 20));
        b = Math.max(0, Math.min(255, b - warmth * 30));
      }
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
};

export default PresetPreview;