import { useState, useCallback } from 'react';
import { FilterPreset } from '../types/filter';

/**
 * プリセット選択状態を管理するカスタムフック
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export const usePresetSelection = (initialPreset?: string) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    initialPreset || null
  );
  const [selectedPresetData, setSelectedPresetData] = useState<FilterPreset | null>(null);

  const selectPreset = useCallback((presetId: string, presetData: FilterPreset) => {
    setSelectedPreset(presetId);
    setSelectedPresetData(presetData);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPreset(null);
    setSelectedPresetData(null);
  }, []);

  const isPresetSelected = useCallback((presetId: string) => {
    return selectedPreset === presetId;
  }, [selectedPreset]);

  return {
    selectedPreset,
    selectedPresetData,
    selectPreset,
    clearSelection,
    isPresetSelected
  };
};