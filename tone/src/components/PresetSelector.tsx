'use client';

import React from 'react';
import { FilterPreset } from '../types/filter';
import styles from './PresetSelector.module.css';

interface PresetSelectorProps {
  presets: FilterPreset[];
  selectedPreset: string | null;
  onPresetSelect: (presetId: string) => void;
  disabled?: boolean;
}

/**
 * プリセット選択コンポーネント
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  selectedPreset,
  onPresetSelect,
  disabled = false
}) => {
  return (
    <div className={styles['preset-selector']}>
      <h2 
        id="preset-selector-title"
        className={styles['preset-selector__title']}
      >
        フィルタープリセットを選択
      </h2>
      <p 
        id="preset-selector-description"
        className={styles['preset-selector__description']}
      >
        お好みのスタイルを選んで、すべての画像に統一感のある処理を適用します
      </p>
      
      <div 
        className={styles['preset-selector__grid']}
        role="radiogroup"
        aria-labelledby="preset-selector-title"
        aria-describedby="preset-selector-description"
      >
        {presets.map((preset, index) => (
          <button
            key={preset.id}
            className={`${styles['preset-card']} ${
              selectedPreset === preset.id ? styles['preset-card--selected'] : ''
            } ${disabled ? styles['preset-card--disabled'] : ''}`}
            onClick={() => !disabled && onPresetSelect(preset.id)}
            disabled={disabled}
            role="radio"
            aria-checked={selectedPreset === preset.id}
            aria-describedby={`preset-${preset.id}-description`}
            aria-label={`${preset.name}プリセット`}
            tabIndex={selectedPreset === preset.id ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                const nextIndex = (index + 1) % presets.length;
                onPresetSelect(presets[nextIndex].id);
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevIndex = index === 0 ? presets.length - 1 : index - 1;
                onPresetSelect(presets[prevIndex].id);
              }
            }}
          >
            <div className={styles['preset-card__icon']} aria-hidden="true">
              {preset.icon}
            </div>
            <h3 className={styles['preset-card__name']}>
              {preset.name}
            </h3>
            <p 
              className={styles['preset-card__description']}
              id={`preset-${preset.id}-description`}
            >
              {preset.description}
            </p>
            {selectedPreset === preset.id && (
              <div className={styles['preset-card__selected-indicator']} aria-hidden="true">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PresetSelector;