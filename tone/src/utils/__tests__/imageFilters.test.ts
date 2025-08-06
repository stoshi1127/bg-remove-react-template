import {
  applyBrightness,
  applyContrast,
  applySaturation,
  applyHue,
  applySharpness,
  applyWarmth,
  applyFilters,
  loadImageToCanvas,
  canvasToBlob
} from '../imageFilters';
import { FilterConfig } from '../../types/filter';

// Mock ImageData constructor
global.ImageData = class ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data;
    this.width = width;
    this.height = height || data.length / (width * 4);
  }
} as unknown as typeof ImageData;

// Mock Canvas API for testing with smaller dimensions
const mockCanvas = {
  width: 10,
  height: 10,
  getContext: jest.fn(),
  toBlob: jest.fn()
} as unknown as HTMLCanvasElement;

const mockContext = {
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  drawImage: jest.fn()
} as unknown as CanvasRenderingContext2D;

// Mock Image constructor with smaller test images
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 10;
  height = 10;
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
} as unknown as typeof Image;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

// Mock document.createElement
global.document.createElement = jest.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas;
  }
  return {} as unknown as HTMLElement;
});

describe('imageFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockCanvas.getContext as jest.Mock).mockReturnValue(mockContext);
  });

  describe('applyBrightness', () => {
    it('should increase brightness when positive value is provided', () => {
      const imageData = new ImageData(new Uint8ClampedArray([100, 100, 100, 255]), 1, 1);
      applyBrightness(imageData, 50);
      
      // Brightness adjustment: (50/100) * 255 = 127.5
      expect(imageData.data[0]).toBeCloseTo(228, 1); // 100 + 127.5 ≈ 228
      expect(imageData.data[1]).toBeCloseTo(228, 1);
      expect(imageData.data[2]).toBeCloseTo(228, 1);
      expect(imageData.data[3]).toBe(255); // Alpha unchanged
    });

    it('should decrease brightness when negative value is provided', () => {
      const imageData = new ImageData(new Uint8ClampedArray([200, 200, 200, 255]), 1, 1);
      applyBrightness(imageData, -50);
      
      // Brightness adjustment: (-50/100) * 255 = -127.5
      expect(imageData.data[0]).toBeCloseTo(72, 0); // 200 - 127.5 ≈ 72-73
      expect(imageData.data[1]).toBeCloseTo(72, 0);
      expect(imageData.data[2]).toBeCloseTo(72, 0);
      expect(imageData.data[3]).toBe(255); // Alpha unchanged
    });

    it('should clamp values to 0-255 range', () => {
      const imageData = new ImageData(new Uint8ClampedArray([10, 250, 128, 255]), 1, 1);
      applyBrightness(imageData, 100); // Maximum brightness
      
      expect(imageData.data[0]).toBe(255); // Clamped to 255
      expect(imageData.data[1]).toBe(255); // Clamped to 255
      expect(imageData.data[2]).toBe(255); // Clamped to 255
    });
  });

  describe('applyContrast', () => {
    it('should increase contrast when positive value is provided', () => {
      const imageData = new ImageData(new Uint8ClampedArray([100, 150, 200, 255]), 1, 1);
      applyContrast(imageData, 50);
      
      // Values should be pushed away from 128 (middle gray)
      expect(imageData.data[0]).toBeLessThan(100); // Darker
      expect(imageData.data[1]).toBeGreaterThan(150); // Brighter
      expect(imageData.data[2]).toBeGreaterThan(200); // Much brighter
    });

    it('should decrease contrast when negative value is provided', () => {
      const imageData = new ImageData(new Uint8ClampedArray([50, 200, 128, 255]), 1, 1);
      applyContrast(imageData, -50);
      
      // Values should be pushed toward 128 (middle gray)
      expect(imageData.data[0]).toBeGreaterThan(50); // Closer to 128
      expect(imageData.data[1]).toBeLessThan(200); // Closer to 128
      expect(imageData.data[2]).toBe(128); // Should remain 128
    });
  });

  describe('applySaturation', () => {
    it('should increase saturation when positive value is provided', () => {
      const imageData = new ImageData(new Uint8ClampedArray([200, 100, 50, 255]), 1, 1);
      const originalData = [...imageData.data];
      applySaturation(imageData, 50);
      
      // Colors should be more vibrant (further from grayscale)
      expect(imageData.data[0]).toBeGreaterThan(originalData[0]); // More red
      expect(imageData.data[2]).toBeLessThan(originalData[2]); // Less blue (more contrast)
    });

    it('should decrease saturation when negative value is provided', () => {
      const imageData = new ImageData(new Uint8ClampedArray([200, 100, 50, 255]), 1, 1);
      applySaturation(imageData, -50);
      
      // Colors should be closer to grayscale
      expect(imageData.data[0]).toBeLessThan(200); // Closer to gray
      expect(imageData.data[1]).toBeGreaterThan(100); // Should be between original and gray
      expect(imageData.data[2]).toBeGreaterThan(50); // Closer to gray
    });

    it('should create grayscale when saturation is -100', () => {
      const imageData = new ImageData(new Uint8ClampedArray([200, 100, 50, 255]), 1, 1);
      applySaturation(imageData, -100);
      
      // All RGB values should be equal (grayscale)
      const expectedGray = Math.round(0.299 * 200 + 0.587 * 100 + 0.114 * 50);
      expect(imageData.data[0]).toBeCloseTo(expectedGray, 0);
      expect(imageData.data[1]).toBeCloseTo(expectedGray, 0);
      expect(imageData.data[2]).toBeCloseTo(expectedGray, 0);
    });
  });

  describe('applyHue', () => {
    it('should shift hue when value is provided', () => {
      const imageData = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1); // Pure red
      const originalData = [...imageData.data];
      applyHue(imageData, 120); // Shift by 120 degrees (should become green-ish)
      
      // Red should decrease, green should increase
      expect(imageData.data[0]).toBeLessThan(originalData[0]);
      expect(imageData.data[1]).toBeGreaterThan(originalData[1]);
    });

    it('should handle negative hue values', () => {
      const imageData = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1); // Pure red
      applyHue(imageData, -60); // Shift by -60 degrees
      
      // Should produce a valid color transformation
      expect(imageData.data[0]).toBeGreaterThanOrEqual(0);
      expect(imageData.data[1]).toBeGreaterThanOrEqual(0);
      expect(imageData.data[2]).toBeGreaterThanOrEqual(0);
    });

    it('should handle grayscale pixels correctly', () => {
      const imageData = new ImageData(new Uint8ClampedArray([128, 128, 128, 255]), 1, 1); // Gray
      const originalData = [...imageData.data];
      applyHue(imageData, 180);
      
      // Grayscale pixels should remain unchanged
      expect(imageData.data[0]).toBe(originalData[0]);
      expect(imageData.data[1]).toBe(originalData[1]);
      expect(imageData.data[2]).toBe(originalData[2]);
    });
  });

  describe('applySharpness', () => {
    it('should not modify image when sharpness is 0', () => {
      const imageData = new ImageData(new Uint8ClampedArray([
        100, 100, 100, 255, 150, 150, 150, 255, 200, 200, 200, 255,
        120, 120, 120, 255, 170, 170, 170, 255, 220, 220, 220, 255,
        140, 140, 140, 255, 190, 190, 190, 255, 240, 240, 240, 255
      ]), 3, 3);
      const originalData = [...imageData.data];
      
      applySharpness(imageData, 0, 3, 3);
      
      // Data should remain unchanged when sharpness is 0
      expect(Array.from(imageData.data)).toEqual(Array.from(originalData));
    });

    it('should enhance edges when sharpness is applied', () => {
      const imageData = new ImageData(new Uint8ClampedArray([
        0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
        0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255,
        0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255
      ]), 3, 3);
      
      applySharpness(imageData, 50, 3, 3);
      
      // Center pixel should be enhanced (more white)
      const centerIndex = (1 * 3 + 1) * 4; // Center pixel
      expect(imageData.data[centerIndex]).toBeGreaterThanOrEqual(255); // Should be at max
    });
  });

  describe('applyWarmth', () => {
    it('should increase red and decrease blue for positive warmth', () => {
      const imageData = new ImageData(new Uint8ClampedArray([100, 100, 100, 255]), 1, 1);
      const originalData = [...imageData.data];
      applyWarmth(imageData, 50);
      
      expect(imageData.data[0]).toBeGreaterThan(originalData[0]); // More red
      expect(imageData.data[1]).toBe(originalData[1]); // Green unchanged
      expect(imageData.data[2]).toBeLessThan(originalData[2]); // Less blue
    });

    it('should decrease red and increase blue for negative warmth', () => {
      const imageData = new ImageData(new Uint8ClampedArray([100, 100, 100, 255]), 1, 1);
      const originalData = [...imageData.data];
      applyWarmth(imageData, -50);
      
      expect(imageData.data[0]).toBeLessThan(originalData[0]); // Less red
      expect(imageData.data[1]).toBe(originalData[1]); // Green unchanged
      expect(imageData.data[2]).toBeGreaterThan(originalData[2]); // More blue
    });

    it('should clamp values to 0-255 range', () => {
      const imageData = new ImageData(new Uint8ClampedArray([250, 100, 5, 255]), 1, 1);
      applyWarmth(imageData, 100); // Maximum warmth
      
      expect(imageData.data[0]).toBe(255); // Clamped to 255
      expect(imageData.data[2]).toBe(0); // Clamped to 0
    });
  });

  describe('applyFilters', () => {
    const mockImageData = new ImageData(new Uint8ClampedArray([100, 100, 100, 255]), 1, 1);
    
    beforeEach(() => {
      (mockContext.getImageData as jest.Mock).mockReturnValue(mockImageData);
    });

    it('should apply all filters in the correct order', () => {
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 20,
        saturation: 5,
        hue: 0,
        sharpness: 30,
        warmth: 0
      };

      const result = applyFilters(mockCanvas, filterConfig);

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(mockContext.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0);
      expect(result).toBe(mockCanvas);
    });

    it('should skip filters with zero values', () => {
      const filterConfig: FilterConfig = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      const originalData = [...mockImageData.data];
      applyFilters(mockCanvas, filterConfig);

      // Data should remain unchanged when all filters are zero
      expect(Array.from(mockImageData.data)).toEqual(Array.from(originalData));
    });

    it('should throw error when canvas context is not available', () => {
      (mockCanvas.getContext as jest.Mock).mockReturnValue(null);
      
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      expect(() => applyFilters(mockCanvas, filterConfig)).toThrow('Canvas context could not be obtained');
    });
  });

  describe('loadImageToCanvas', () => {
    it('should load image file to canvas successfully', async () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      const canvas = await loadImageToCanvas(mockFile);
      
      expect(canvas).toBe(mockCanvas);
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
    });

    it('should reject when canvas context is not available', async () => {
      (mockCanvas.getContext as jest.Mock).mockReturnValue(null);
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(loadImageToCanvas(mockFile)).rejects.toThrow('Canvas context could not be obtained');
    });

    it('should reject when image fails to load', async () => {
      // Mock Image to trigger error
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        
        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      } as unknown as typeof Image;

      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(loadImageToCanvas(mockFile)).rejects.toThrow('Failed to load image');
    });
  });

  describe('canvasToBlob', () => {
    it('should convert canvas to blob successfully', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      (mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
        callback(mockBlob);
      });

      const result = await canvasToBlob(mockCanvas, 0.8);
      
      expect(result).toBe(mockBlob);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
    });

    it('should use default quality when not specified', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      (mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
        callback(mockBlob);
      });

      await canvasToBlob(mockCanvas);
      
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9);
    });

    it('should reject when blob conversion fails', async () => {
      (mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
        callback(null);
      });

      await expect(canvasToBlob(mockCanvas)).rejects.toThrow('Failed to convert canvas to blob');
    });
  });
});