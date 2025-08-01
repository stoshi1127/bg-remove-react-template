import { convertHeicToJpeg, isHeicFile, processFileForHeic } from '../heicConverter';

// Mock heic2any
jest.mock('heic2any', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import heic2any from 'heic2any';

describe('heicConverter', () => {
  const mockHeic2any = heic2any as jest.MockedFunction<typeof heic2any>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockFile = (name: string, type: string): File => {
    return new File(['mock content'], name, {
      type,
      lastModified: Date.now(),
    });
  };

  const createMockBlob = (): Blob => {
    return new Blob(['converted content'], { type: 'image/jpeg' });
  };

  describe('isHeicFile', () => {
    it('should return true for HEIC files by MIME type', () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      expect(isHeicFile(heicFile)).toBe(true);
    });

    it('should return true for HEIF files by MIME type', () => {
      const heifFile = createMockFile('test.heif', 'image/heif');
      expect(isHeicFile(heifFile)).toBe(true);
    });

    it('should return true for HEIC files by extension', () => {
      const heicFile = createMockFile('test.HEIC', 'application/octet-stream');
      expect(isHeicFile(heicFile)).toBe(true);
    });

    it('should return true for HEIF files by extension', () => {
      const heifFile = createMockFile('test.heif', 'application/octet-stream');
      expect(isHeicFile(heifFile)).toBe(true);
    });

    it('should return false for non-HEIC files', () => {
      const jpegFile = createMockFile('test.jpg', 'image/jpeg');
      expect(isHeicFile(jpegFile)).toBe(false);
    });

    it('should be case insensitive for extensions', () => {
      const heicFile = createMockFile('test.HeIc', 'application/octet-stream');
      expect(isHeicFile(heicFile)).toBe(true);
    });
  });

  describe('convertHeicToJpeg', () => {
    it('should convert HEIC file to JPEG successfully', async () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      const mockBlob = createMockBlob();
      
      mockHeic2any.mockResolvedValue(mockBlob);

      const result = await convertHeicToJpeg(heicFile);

      expect(mockHeic2any).toHaveBeenCalledWith({
        blob: heicFile,
        toType: 'image/jpeg',
        quality: 0.9,
      });

      expect(result.name).toBe('test.jpg');
      expect(result.type).toBe('image/jpeg');
      expect(result.lastModified).toBe(heicFile.lastModified);
    });

    it('should handle array of blobs from heic2any', async () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      const mockBlob = createMockBlob();
      
      mockHeic2any.mockResolvedValue([mockBlob]);

      const result = await convertHeicToJpeg(heicFile);

      expect(result.name).toBe('test.jpg');
      expect(result.type).toBe('image/jpeg');
    });

    it('should preserve original filename with different extension', async () => {
      const heicFile = createMockFile('my-photo.HEIC', 'image/heic');
      const mockBlob = createMockBlob();
      
      mockHeic2any.mockResolvedValue(mockBlob);

      const result = await convertHeicToJpeg(heicFile);

      expect(result.name).toBe('my-photo.jpg');
    });

    it('should throw error when conversion fails', async () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      const error = new Error('Conversion failed');
      
      mockHeic2any.mockRejectedValue(error);

      await expect(convertHeicToJpeg(heicFile)).rejects.toThrow('HEIC変換に失敗しました: test.heic');
    });

    it('should handle files without HEIC extension', async () => {
      const heicFile = createMockFile('test', 'image/heic');
      const mockBlob = createMockBlob();
      
      mockHeic2any.mockResolvedValue(mockBlob);

      const result = await convertHeicToJpeg(heicFile);

      expect(result.name).toBe('test'); // No extension change if no .heic/.heif extension
    });
  });

  describe('processFileForHeic', () => {
    it('should convert HEIC files', async () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      const mockBlob = createMockBlob();
      
      mockHeic2any.mockResolvedValue(mockBlob);

      const result = await processFileForHeic(heicFile);

      expect(mockHeic2any).toHaveBeenCalled();
      expect(result.name).toBe('test.jpg');
      expect(result.type).toBe('image/jpeg');
    });

    it('should return original file for non-HEIC files', async () => {
      const jpegFile = createMockFile('test.jpg', 'image/jpeg');

      const result = await processFileForHeic(jpegFile);

      expect(mockHeic2any).not.toHaveBeenCalled();
      expect(result).toBe(jpegFile);
    });

    it('should convert HEIF files', async () => {
      const heifFile = createMockFile('test.heif', 'image/heif');
      const mockBlob = createMockBlob();
      
      mockHeic2any.mockResolvedValue(mockBlob);

      const result = await processFileForHeic(heifFile);

      expect(mockHeic2any).toHaveBeenCalled();
      expect(result.name).toBe('test.jpg');
      expect(result.type).toBe('image/jpeg');
    });

    it('should handle conversion errors gracefully', async () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      const error = new Error('Conversion failed');
      
      mockHeic2any.mockRejectedValue(error);

      await expect(processFileForHeic(heicFile)).rejects.toThrow('HEIC変換に失敗しました: test.heic');
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow for HEIC file', async () => {
      const heicFile = createMockFile('photo.HEIC', 'image/heic');
      const mockBlob = createMockBlob();
      
      mockHeic2any.mockResolvedValue(mockBlob);

      // Check if file is HEIC
      expect(isHeicFile(heicFile)).toBe(true);

      // Process the file
      const result = await processFileForHeic(heicFile);

      expect(result.name).toBe('photo.jpg');
      expect(result.type).toBe('image/jpeg');
      expect(mockHeic2any).toHaveBeenCalledWith({
        blob: heicFile,
        toType: 'image/jpeg',
        quality: 0.9,
      });
    });

    it('should handle complete workflow for non-HEIC file', async () => {
      const jpegFile = createMockFile('photo.jpg', 'image/jpeg');

      // Check if file is HEIC
      expect(isHeicFile(jpegFile)).toBe(false);

      // Process the file
      const result = await processFileForHeic(jpegFile);

      expect(result).toBe(jpegFile);
      expect(mockHeic2any).not.toHaveBeenCalled();
    });
  });
});