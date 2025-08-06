import { FilterConfig } from '../types/filter';

/**
 * Canvas APIを使用した画像フィルター処理ユーティリティ
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */

/**
 * 画像データに明度フィルターを適用
 * @param imageData - Canvas ImageData
 * @param brightness - 明度調整値 (-100 to 100)
 */
export function applyBrightness(imageData: ImageData, brightness: number): void {
  const data = imageData.data;
  const adjustment = (brightness / 100) * 255;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + adjustment));     // Red
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment)); // Green
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment)); // Blue
    // Alpha channel (i + 3) remains unchanged
  }
}

/**
 * 画像データにコントラストフィルターを適用
 * @param imageData - Canvas ImageData
 * @param contrast - コントラスト調整値 (-100 to 100)
 */
export function applyContrast(imageData: ImageData, contrast: number): void {
  const data = imageData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));     // Red
    data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128)); // Green
    data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128)); // Blue
  }
}

/**
 * 画像データに彩度フィルターを適用
 * @param imageData - Canvas ImageData
 * @param saturation - 彩度調整値 (-100 to 100)
 */
export function applySaturation(imageData: ImageData, saturation: number): void {
  const data = imageData.data;
  const factor = (saturation + 100) / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate grayscale value using luminance formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    data[i] = Math.max(0, Math.min(255, gray + factor * (r - gray)));
    data[i + 1] = Math.max(0, Math.min(255, gray + factor * (g - gray)));
    data[i + 2] = Math.max(0, Math.min(255, gray + factor * (b - gray)));
  }
}

/**
 * RGBをHSLに変換
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return [h * 360, s * 100, l * 100];
}

/**
 * HSLをRGBに変換
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let r: number, g: number, b: number;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * 画像データに色相フィルターを適用
 * @param imageData - Canvas ImageData
 * @param hue - 色相調整値 (-180 to 180)
 */
export function applyHue(imageData: ImageData, hue: number): void {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const newHue = (h + hue + 360) % 360;
    const [r, g, b] = hslToRgb(newHue, s, l);
    
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

/**
 * 画像データにシャープネスフィルターを適用
 * @param imageData - Canvas ImageData
 * @param sharpness - シャープネス調整値 (0 to 100)
 * @param width - 画像の幅
 * @param height - 画像の高さ
 */
export function applySharpness(imageData: ImageData, sharpness: number, width: number, height: number): void {
  if (sharpness === 0) return;
  
  const data = imageData.data;
  const originalData = new Uint8ClampedArray(data);
  const factor = sharpness / 100;
  
  // Unsharp mask kernel
  const kernel = [
    0, -factor, 0,
    -factor, 1 + 4 * factor, -factor,
    0, -factor, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels only
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += originalData[idx] * kernel[kernelIdx];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.max(0, Math.min(255, sum));
      }
    }
  }
}

/**
 * 画像データに暖かさ（色温度）フィルターを適用
 * @param imageData - Canvas ImageData
 * @param warmth - 暖かさ調整値 (-100 to 100)
 */
export function applyWarmth(imageData: ImageData, warmth: number): void {
  const data = imageData.data;
  const factor = warmth / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    if (factor > 0) {
      // Warmer: increase red, decrease blue
      data[i] = Math.max(0, Math.min(255, data[i] + factor * 30));     // Red
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - factor * 20)); // Blue
    } else {
      // Cooler: decrease red, increase blue
      data[i] = Math.max(0, Math.min(255, data[i] + factor * 20));     // Red
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - factor * 30)); // Blue
    }
  }
}

/**
 * FilterConfigに基づいて画像にフィルターを適用
 * @param canvas - Canvas要素
 * @param filterConfig - 適用するフィルター設定
 * @returns 処理済みのCanvas要素
 */
export function applyFilters(canvas: HTMLCanvasElement, filterConfig: FilterConfig): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context could not be obtained');
  }
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Apply filters in order
  if (filterConfig.brightness !== 0) {
    applyBrightness(imageData, filterConfig.brightness);
  }
  
  if (filterConfig.contrast !== 0) {
    applyContrast(imageData, filterConfig.contrast);
  }
  
  if (filterConfig.saturation !== 0) {
    applySaturation(imageData, filterConfig.saturation);
  }
  
  if (filterConfig.hue !== 0) {
    applyHue(imageData, filterConfig.hue);
  }
  
  if (filterConfig.sharpness !== 0) {
    applySharpness(imageData, filterConfig.sharpness, canvas.width, canvas.height);
  }
  
  if (filterConfig.warmth !== 0) {
    applyWarmth(imageData, filterConfig.warmth);
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * 画像ファイルをCanvasに読み込む
 * @param file - 画像ファイル
 * @returns Promise<HTMLCanvasElement>
 */
export function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context could not be obtained'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      resolve(canvas);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * CanvasをBlobに変換
 * @param canvas - Canvas要素
 * @param quality - JPEG品質 (0.0 to 1.0)
 * @returns Promise<Blob>
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/jpeg', quality);
  });
}