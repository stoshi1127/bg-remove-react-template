import {
  downloadSingleImage,
  downloadAllImagesAsZip,
  generateFileName,
  generateZipFileName,
  generateProcessingInfo,
  checkFileSizeLimit,
  canDownload
} from '../downloadUtils';
import { ProcessedImage, ProcessableImage } from '../../types/processing';

// JSZipのモック
jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    file: jest.fn(),
    generateAsync: jest.fn().mockResolvedValue(new Blob(['mock zip content']))
  }));
});

// DOM APIのモック
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockRevokeObjectURL = jest.fn();
const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');

// documentのモック
const originalDocument = global.document;
const mockDocument = {
  createElement: mockCreateElement,
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild
  }
};

// URLのモック
const originalURL = global.URL;
const mockURL = {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL
};

// テスト用のモックデータ
const createMockProcessableImage = (id: string, fileName: string): ProcessableImage => ({
  id,
  file: new File(['mock content'], fileName, { type: 'image/jpeg' }),
  originalUrl: `blob:original-${id}`,
  metadata: {
    width: 800,
    height: 600,
    fileSize: 1024,
    format: 'jpeg',
    lastModified: Date.now()
  },
  status: 'completed'
});

const createMockProcessedImage = (id: string, fileName: string, preset: string): ProcessedImage => ({
  id,
  originalImage: createMockProcessableImage(id, fileName),
  processedUrl: `blob:processed-${id}`,
  processedBlob: new Blob(['processed content'], { type: 'image/jpeg' }),
  appliedPreset: preset,
  processingTime: 1000,
  fileSize: 2048
});

describe('downloadUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // グローバルオブジェクトのモック設定
    global.document = mockDocument as unknown as Document;
    global.URL = mockURL as unknown as typeof URL;
    
    // createElement のモック設定
    mockCreateElement.mockReturnValue({
      href: '',
      download: '',
      style: { display: '' },
      click: mockClick
    });
  });

  afterEach(() => {
    // 元のオブジェクトを復元
    global.document = originalDocument;
    global.URL = originalURL;
  });

  describe('generateFileName', () => {
    it('should generate correct filename with preset', () => {
      const result = generateFileName('photo.jpg', '商品をくっきりと');
      expect(result).toBe('photo_crisp-product.jpg');
    });

    it('should generate correct filename with index', () => {
      const result = generateFileName('photo.jpg', '明るくクリアに', 0);
      expect(result).toBe('photo_bright-clear_01.jpg');
    });

    it('should handle filename without extension', () => {
      const result = generateFileName('photo', '暖かみのある雰囲気');
      expect(result).toBe('photo_warm-cozy.jpg');
    });

    it('should handle unknown preset', () => {
      const result = generateFileName('photo.jpg', 'Custom Preset');
      expect(result).toBe('photo_custom-preset.jpg');
    });
  });

  describe('generateZipFileName', () => {
    it('should generate correct zip filename', () => {
      const processedImages = [
        createMockProcessedImage('1', 'photo1.jpg', '商品をくっきりと'),
        createMockProcessedImage('2', 'photo2.jpg', '商品をくっきりと')
      ];

      const result = generateZipFileName(processedImages);
      expect(result).toMatch(/^easytone_processed_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_商品をくっきりと_2images\.zip$/);
    });

    it('should handle multiple presets', () => {
      const processedImages = [
        createMockProcessedImage('1', 'photo1.jpg', '商品をくっきりと'),
        createMockProcessedImage('2', 'photo2.jpg', '明るくクリアに')
      ];

      const result = generateZipFileName(processedImages);
      expect(result).toMatch(/^easytone_processed_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_2images\.zip$/);
    });
  });

  describe('generateProcessingInfo', () => {
    it('should generate correct processing info', () => {
      const processedImages = [
        createMockProcessedImage('1', 'photo1.jpg', '商品をくっきりと'),
        createMockProcessedImage('2', 'photo2.jpg', '明るくクリアに')
      ];

      const result = generateProcessingInfo(processedImages);
      
      expect(result).toContain('EasyTone 処理結果情報');
      expect(result).toContain('処理画像数: 2枚');
      expect(result).toContain('商品をくっきりと: 1枚');
      expect(result).toContain('明るくクリアに: 1枚');
      expect(result).toContain('photo1.jpg');
      expect(result).toContain('photo2.jpg');
    });
  });

  describe('downloadSingleImage', () => {
    it('should download single image successfully', async () => {
      const processedImage = createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと');
      
      await downloadSingleImage(processedImage);
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(processedImage.processedBlob);
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should handle download error', async () => {
      const processedImage = createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと');
      mockCreateObjectURL.mockImplementationOnce(() => {
        throw new Error('Mock error');
      });

      await expect(downloadSingleImage(processedImage)).rejects.toThrow('画像のダウンロードに失敗しました');
    });
  });

  describe('downloadAllImagesAsZip', () => {
    it('should download all images as zip successfully', async () => {
      const processedImages = [
        createMockProcessedImage('1', 'photo1.jpg', '商品をくっきりと'),
        createMockProcessedImage('2', 'photo2.jpg', '明るくクリアに')
      ];

      await downloadAllImagesAsZip(processedImages);
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should handle empty images array', async () => {
      await expect(downloadAllImagesAsZip([])).rejects.toThrow('ダウンロードする画像がありません');
    });

    it('should use custom zip filename', async () => {
      const processedImages = [createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと')];
      const customFileName = 'custom.zip';

      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: mockClick
      };
      mockCreateElement.mockReturnValue(mockLink);

      await downloadAllImagesAsZip(processedImages, customFileName);
      
      expect(mockLink.download).toBe(customFileName);
    });
  });

  describe('checkFileSizeLimit', () => {
    it('should return true for images within limit', () => {
      const processedImages = [
        createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと') // 2KB
      ];

      const result = checkFileSizeLimit(processedImages, 1); // 1MB limit
      expect(result).toBe(true);
    });

    it('should return false for images exceeding limit', () => {
      const largeImage = createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと');
      largeImage.fileSize = 2 * 1024 * 1024; // 2MB

      const result = checkFileSizeLimit([largeImage], 1); // 1MB limit
      expect(result).toBe(false);
    });
  });

  describe('canDownload', () => {
    it('should return true when document is available', () => {
      const result = canDownload();
      expect(result).toBe(true);
    });

    it('should return false when document is not available', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      const result = canDownload();
      expect(result).toBe(false);

      // テストのafterEachで復元される
    });
  });
});