import { FILTER_PRESETS, getPresetById } from '../presets';
import { FilterPreset } from '../../types/filter';

describe('Preset Constants', () => {
  describe('FILTER_PRESETS', () => {
    it('should contain exactly 4 presets', () => {
      expect(FILTER_PRESETS).toHaveLength(4);
    });

    it('should have all required preset IDs', () => {
      const presetIds = FILTER_PRESETS.map(preset => preset.id);
      expect(presetIds).toContain('crisp-product');
      expect(presetIds).toContain('bright-clear');
      expect(presetIds).toContain('warm-cozy');
      expect(presetIds).toContain('cool-urban');
    });

    it('should have all presets with required properties', () => {
      FILTER_PRESETS.forEach((preset: FilterPreset) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('icon');
        expect(preset).toHaveProperty('filters');
        
        // フィルター設定の検証
        expect(preset.filters).toHaveProperty('brightness');
        expect(preset.filters).toHaveProperty('contrast');
        expect(preset.filters).toHaveProperty('saturation');
        expect(preset.filters).toHaveProperty('hue');
        expect(preset.filters).toHaveProperty('sharpness');
        expect(preset.filters).toHaveProperty('warmth');
      });
    });

    describe('Individual Preset Configurations', () => {
      it('should have correct crisp-product preset configuration', () => {
        const preset = FILTER_PRESETS.find(p => p.id === 'crisp-product');
        expect(preset).toBeDefined();
        expect(preset!.name).toBe('商品をくっきりと');
        expect(preset!.icon).toBe('📦');
        expect(preset!.filters).toEqual({
          brightness: 10,
          contrast: 20,
          saturation: 5,
          hue: 0,
          sharpness: 30,
          warmth: 0
        });
      });

      it('should have correct bright-clear preset configuration', () => {
        const preset = FILTER_PRESETS.find(p => p.id === 'bright-clear');
        expect(preset).toBeDefined();
        expect(preset!.name).toBe('明るくクリアに');
        expect(preset!.icon).toBe('✨');
        expect(preset!.filters).toEqual({
          brightness: 25,
          contrast: 10,
          saturation: 10,
          hue: 0,
          sharpness: 10,
          warmth: 5
        });
      });

      it('should have correct warm-cozy preset configuration', () => {
        const preset = FILTER_PRESETS.find(p => p.id === 'warm-cozy');
        expect(preset).toBeDefined();
        expect(preset!.name).toBe('暖かみのある雰囲気');
        expect(preset!.icon).toBe('🌅');
        expect(preset!.filters).toEqual({
          brightness: 5,
          contrast: 5,
          saturation: 15,
          hue: 10,
          sharpness: 0,
          warmth: 30
        });
      });

      it('should have correct cool-urban preset configuration', () => {
        const preset = FILTER_PRESETS.find(p => p.id === 'cool-urban');
        expect(preset).toBeDefined();
        expect(preset!.name).toBe('クールで都会的');
        expect(preset!.icon).toBe('🏙️');
        expect(preset!.filters).toEqual({
          brightness: 0,
          contrast: 15,
          saturation: -5,
          hue: -10,
          sharpness: 20,
          warmth: -20
        });
      });
    });

    describe('Filter Value Ranges', () => {
      it('should have filter values within valid ranges', () => {
        FILTER_PRESETS.forEach(preset => {
          const { filters } = preset;
          
          // brightness: -100 to 100
          expect(filters.brightness).toBeGreaterThanOrEqual(-100);
          expect(filters.brightness).toBeLessThanOrEqual(100);
          
          // contrast: -100 to 100
          expect(filters.contrast).toBeGreaterThanOrEqual(-100);
          expect(filters.contrast).toBeLessThanOrEqual(100);
          
          // saturation: -100 to 100
          expect(filters.saturation).toBeGreaterThanOrEqual(-100);
          expect(filters.saturation).toBeLessThanOrEqual(100);
          
          // hue: -180 to 180
          expect(filters.hue).toBeGreaterThanOrEqual(-180);
          expect(filters.hue).toBeLessThanOrEqual(180);
          
          // sharpness: 0 to 100
          expect(filters.sharpness).toBeGreaterThanOrEqual(0);
          expect(filters.sharpness).toBeLessThanOrEqual(100);
          
          // warmth: -100 to 100
          expect(filters.warmth).toBeGreaterThanOrEqual(-100);
          expect(filters.warmth).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('getPresetById', () => {
    it('should return the correct preset for valid ID', () => {
      const preset = getPresetById('crisp-product');
      expect(preset).toBeDefined();
      expect(preset!.id).toBe('crisp-product');
      expect(preset!.name).toBe('商品をくっきりと');
    });

    it('should return undefined for invalid ID', () => {
      const preset = getPresetById('non-existent-preset');
      expect(preset).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const preset = getPresetById('');
      expect(preset).toBeUndefined();
    });

    it('should work for all valid preset IDs', () => {
      const validIds = ['crisp-product', 'bright-clear', 'warm-cozy', 'cool-urban'];
      
      validIds.forEach(id => {
        const preset = getPresetById(id);
        expect(preset).toBeDefined();
        expect(preset!.id).toBe(id);
      });
    });
  });
});