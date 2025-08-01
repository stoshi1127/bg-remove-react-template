import { renderHook, act } from '@testing-library/react';
import { usePresetSelection } from '../usePresetSelection';
import { FILTER_PRESETS } from '../../constants/presets';

describe('usePresetSelection', () => {
  const mockPreset = FILTER_PRESETS[0]; // crisp-product

  describe('Initial State', () => {
    it('should initialize with null selection when no initial preset provided', () => {
      const { result } = renderHook(() => usePresetSelection());
      
      expect(result.current.selectedPreset).toBeNull();
      expect(result.current.selectedPresetData).toBeNull();
    });

    it('should initialize with provided initial preset', () => {
      const { result } = renderHook(() => usePresetSelection('crisp-product'));
      
      expect(result.current.selectedPreset).toBe('crisp-product');
      expect(result.current.selectedPresetData).toBeNull(); // データは別途設定が必要
    });
  });

  describe('selectPreset', () => {
    it('should update selected preset and data', () => {
      const { result } = renderHook(() => usePresetSelection());
      
      act(() => {
        result.current.selectPreset(mockPreset.id, mockPreset);
      });
      
      expect(result.current.selectedPreset).toBe(mockPreset.id);
      expect(result.current.selectedPresetData).toEqual(mockPreset);
    });

    it('should update selection when called multiple times', () => {
      const { result } = renderHook(() => usePresetSelection());
      const secondPreset = FILTER_PRESETS[1]; // bright-clear
      
      // 最初の選択
      act(() => {
        result.current.selectPreset(mockPreset.id, mockPreset);
      });
      
      expect(result.current.selectedPreset).toBe(mockPreset.id);
      
      // 2回目の選択
      act(() => {
        result.current.selectPreset(secondPreset.id, secondPreset);
      });
      
      expect(result.current.selectedPreset).toBe(secondPreset.id);
      expect(result.current.selectedPresetData).toEqual(secondPreset);
    });
  });

  describe('clearSelection', () => {
    it('should clear both preset ID and data', () => {
      const { result } = renderHook(() => usePresetSelection());
      
      // 最初に選択を設定
      act(() => {
        result.current.selectPreset(mockPreset.id, mockPreset);
      });
      
      expect(result.current.selectedPreset).toBe(mockPreset.id);
      expect(result.current.selectedPresetData).toEqual(mockPreset);
      
      // 選択をクリア
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedPreset).toBeNull();
      expect(result.current.selectedPresetData).toBeNull();
    });

    it('should work when no selection exists', () => {
      const { result } = renderHook(() => usePresetSelection());
      
      // 初期状態でクリアを実行
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedPreset).toBeNull();
      expect(result.current.selectedPresetData).toBeNull();
    });
  });

  describe('isPresetSelected', () => {
    it('should return true for selected preset', () => {
      const { result } = renderHook(() => usePresetSelection());
      
      act(() => {
        result.current.selectPreset(mockPreset.id, mockPreset);
      });
      
      expect(result.current.isPresetSelected(mockPreset.id)).toBe(true);
    });

    it('should return false for non-selected preset', () => {
      const { result } = renderHook(() => usePresetSelection());
      const secondPreset = FILTER_PRESETS[1];
      
      act(() => {
        result.current.selectPreset(mockPreset.id, mockPreset);
      });
      
      expect(result.current.isPresetSelected(secondPreset.id)).toBe(false);
    });

    it('should return false when no preset is selected', () => {
      const { result } = renderHook(() => usePresetSelection());
      
      expect(result.current.isPresetSelected(mockPreset.id)).toBe(false);
    });

    it('should return false for empty string', () => {
      const { result } = renderHook(() => usePresetSelection());
      
      act(() => {
        result.current.selectPreset(mockPreset.id, mockPreset);
      });
      
      expect(result.current.isPresetSelected('')).toBe(false);
    });
  });

  describe('Function Stability', () => {
    it('should maintain function references across re-renders', () => {
      const { result, rerender } = renderHook(() => usePresetSelection());
      
      const initialSelectPreset = result.current.selectPreset;
      const initialClearSelection = result.current.clearSelection;
      const initialIsPresetSelected = result.current.isPresetSelected;
      
      rerender();
      
      expect(result.current.selectPreset).toBe(initialSelectPreset);
      expect(result.current.clearSelection).toBe(initialClearSelection);
      expect(result.current.isPresetSelected).toBe(initialIsPresetSelected);
    });
  });
});