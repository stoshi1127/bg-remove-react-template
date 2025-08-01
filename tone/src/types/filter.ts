/**
 * フィルター設定の型定義
 */
export interface FilterConfig {
  brightness: number;    // -100 to 100
  contrast: number;      // -100 to 100
  saturation: number;    // -100 to 100
  hue: number;          // -180 to 180
  sharpness: number;    // 0 to 100
  warmth: number;       // -100 to 100 (color temperature)
}

/**
 * フィルタープリセットの型定義
 */
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  filters: FilterConfig;
}