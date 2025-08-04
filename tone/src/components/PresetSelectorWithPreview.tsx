'use client';

import React from 'react';
import { ProcessableImage } from '../types/processing';
import { PresetSelector } from './PresetSelector';
import { PresetPreview } from './PresetPreview';
import { getPresetById, FILTER_PRESETS } from '../constants/presets';
import styles from './PresetSelectorWithPreview.module.css';

interface PresetSelectorWithPreviewProps {
  selectedPreset: string | null;
  onPresetSelect: (presetId: string) => void;
  previewImage?: File | null;
  disabled?: boolean;
  className?: string;
}

/**
 * プリセット選択とプレビューを統合したコンポーネント
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export const PresetSelectorWithPreview: React.FC<PresetSelectorWithPreviewProps> = ({
  selectedPreset,
  onPresetSelect,
  previewImage = null,
  disabled = false,
  className = ''
}) => {
  const selectedPresetData = selectedPreset ? getPresetById(selectedPreset) || null : null;

  return (
    <div className={`${styles['preset-selector-with-preview']} ${className}`}>
      <div className={styles['preset-selector-with-preview__layout']}>
        <div className={styles['preset-selector-with-preview__selector']}>
          <PresetSelector
            presets={FILTER_PRESETS}
            selectedPreset={selectedPreset}
            onPresetSelect={onPresetSelect}
            disabled={disabled}
          />
        </div>
        
        <div className={styles['preset-selector-with-preview__preview']}>
          <PresetPreview
            selectedPreset={selectedPresetData}
            previewImage={previewImage}
          />
        </div>
      </div>
    </div>
  );
};

export default PresetSelectorWithPreview;