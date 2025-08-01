import { FilterPreset } from '../types/filter';

/**
 * 4つのフィルタープリセット定義
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'crisp-product',
    name: '商品をくっきりと',
    description: 'コントラストとシャープネスを適度に上げて、商品の輪郭をはっきりと表現します',
    icon: '📦',
    filters: {
      brightness: 10,
      contrast: 20,
      saturation: 5,
      hue: 0,
      sharpness: 30,
      warmth: 0
    }
  },
  {
    id: 'bright-clear',
    name: '明るくクリアに',
    description: '全体を明るくし、清潔感と透明感を演出します',
    icon: '✨',
    filters: {
      brightness: 25,
      contrast: 10,
      saturation: 10,
      hue: 0,
      sharpness: 10,
      warmth: 5
    }
  },
  {
    id: 'warm-cozy',
    name: '暖かみのある雰囲気',
    description: '暖色系のトーンで温かく親しみやすい印象に調整します',
    icon: '🌅',
    filters: {
      brightness: 5,
      contrast: 5,
      saturation: 15,
      hue: 10,
      sharpness: 0,
      warmth: 30
    }
  },
  {
    id: 'cool-urban',
    name: 'クールで都会的',
    description: '寒色系のクールな印象で、洗練された都会的な雰囲気を演出します',
    icon: '🏙️',
    filters: {
      brightness: 0,
      contrast: 15,
      saturation: -5,
      hue: -10,
      sharpness: 20,
      warmth: -20
    }
  }
];

/**
 * プリセットIDからプリセットを取得する
 */
export const getPresetById = (id: string): FilterPreset | undefined => {
  return FILTER_PRESETS.find(preset => preset.id === id);
};