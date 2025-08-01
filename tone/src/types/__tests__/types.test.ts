import type {
  ImageMetadata,
  ProcessableImage,
  ProcessedImage,
  FilterConfig,
  FilterPreset,
} from '../index';

// 型定義のテスト用サンプルデータ
describe('Type Definitions', () => {
  test('ImageMetadata type should be correctly defined', () => {
    const metadata: ImageMetadata = {
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      format: 'jpeg',
      lastModified: Date.now(),
    };
    
    expect(typeof metadata.width).toBe('number');
    expect(typeof metadata.height).toBe('number');
    expect(typeof metadata.fileSize).toBe('number');
    expect(typeof metadata.format).toBe('string');
    expect(typeof metadata.lastModified).toBe('number');
  });

  test('FilterConfig type should be correctly defined', () => {
    const filterConfig: FilterConfig = {
      brightness: 10,
      contrast: 20,
      saturation: 5,
      hue: 0,
      sharpness: 30,
      warmth: 0,
    };
    
    expect(typeof filterConfig.brightness).toBe('number');
    expect(typeof filterConfig.contrast).toBe('number');
    expect(typeof filterConfig.saturation).toBe('number');
    expect(typeof filterConfig.hue).toBe('number');
    expect(typeof filterConfig.sharpness).toBe('number');
    expect(typeof filterConfig.warmth).toBe('number');
  });

  test('FilterPreset type should be correctly defined', () => {
    const preset: FilterPreset = {
      id: 'crisp-product',
      name: '商品をくっきりと',
      description: 'コントラストとシャープネスを適度に上げる',
      icon: '📸',
      filters: {
        brightness: 10,
        contrast: 20,
        saturation: 5,
        hue: 0,
        sharpness: 30,
        warmth: 0,
      },
    };
    
    expect(typeof preset.id).toBe('string');
    expect(typeof preset.name).toBe('string');
    expect(typeof preset.description).toBe('string');
    expect(typeof preset.icon).toBe('string');
    expect(typeof preset.filters).toBe('object');
  });
});