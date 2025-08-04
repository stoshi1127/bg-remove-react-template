import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the heic converter before importing the component
jest.mock('../../utils/heicConverter', () => ({
  processFileForHeic: jest.fn(),
  isHeicFile: jest.fn(),
}));

import { ImageUploader } from '../ImageUploader';
import { processFileForHeic, isHeicFile } from '../../utils/heicConverter';

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(global.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
});
Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
});

// Mock Image constructor
let mockImageInstances: HTMLImageElement[] = [];

Object.defineProperty(global, 'Image', {
  value: jest.fn(() => {
    const img = {
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      src: '',
      naturalWidth: 1920,
      naturalHeight: 1080,
    };
    
    mockImageInstances.push(img);
    
    // Auto-trigger onload after a short delay to simulate image loading
    setTimeout(() => {
      if (img.onload) {
        img.onload();
      }
    }, 10);
    
    return img;
  }),
});

describe('ImageUploader with HEIC support', () => {
  const mockOnImagesSelected = jest.fn();
  const mockProcessFileForHeic = processFileForHeic as jest.MockedFunction<typeof processFileForHeic>;
  const mockIsHeicFile = isHeicFile as jest.MockedFunction<typeof isHeicFile>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockImageInstances = [];
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    mockProcessFileForHeic.mockImplementation(async (file) => file); // Default: return original file
    mockIsHeicFile.mockReturnValue(false); // Default: not HEIC
  });

  const createMockFile = (
    name: string,
    type: string,
    size: number = 1024 * 1024
  ): File => {
    const file = new File(['mock content'], name, {
      type,
      lastModified: Date.now(),
    });
    
    Object.defineProperty(file, 'size', {
      value: size,
      writable: false,
    });
    
    return file;
  };

  describe('HEIC File Processing', () => {
    it('should process HEIC files through converter', async () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      const convertedFile = createMockFile('test.jpg', 'image/jpeg');
      
      mockIsHeicFile.mockReturnValue(true);
      mockProcessFileForHeic.mockResolvedValue(convertedFile);

      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [heicFile],
        },
      });

      await waitFor(() => {
        expect(mockProcessFileForHeic).toHaveBeenCalledWith(heicFile);
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              file: convertedFile, // Should use converted file
            }),
          ])
        );
      }, { timeout: 3000 });
    });

    it('should handle HEIC conversion errors gracefully', async () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      
      mockIsHeicFile.mockReturnValue(true);
      mockProcessFileForHeic.mockRejectedValue(new Error('Conversion failed'));

      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [heicFile],
        },
      });

      await waitFor(() => {
        expect(mockProcessFileForHeic).toHaveBeenCalledWith(heicFile);
        // Should still create ProcessableImage with error status
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              file: heicFile, // Should use original file when conversion fails
              status: 'error',
            }),
          ])
        );
      }, { timeout: 3000 });
    });

    it('should accept HEIC files even when not in acceptedFormats', async () => {
      const heicFile = createMockFile('test.heic', 'image/heic');
      const convertedFile = createMockFile('test.jpg', 'image/jpeg');
      
      mockIsHeicFile.mockReturnValue(true);
      mockProcessFileForHeic.mockResolvedValue(convertedFile);

      render(
        <ImageUploader 
          onImagesSelected={mockOnImagesSelected}
          acceptedFormats={['image/jpeg', 'image/png']} // HEIC not included
        />
      );
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [heicFile],
        },
      });

      await waitFor(() => {
        expect(mockProcessFileForHeic).toHaveBeenCalledWith(heicFile);
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              file: convertedFile,
            }),
          ])
        );
        // Should not show format error
        expect(screen.queryByText(/サポートされていないファイル形式です/)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should not process non-HEIC files through converter', async () => {
      const jpegFile = createMockFile('test.jpg', 'image/jpeg');
      
      mockIsHeicFile.mockReturnValue(false);

      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [jpegFile],
        },
      });

      await waitFor(() => {
        expect(mockProcessFileForHeic).toHaveBeenCalledWith(jpegFile);
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              file: jpegFile, // Should use original file
            }),
          ])
        );
      }, { timeout: 3000 });
    });
  });

  describe('Preview Integration', () => {
    it('should show preview by default', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg');
      
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('アップロードされた画像 (1枚)')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should hide preview when showPreview is false', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg');
      
      render(
        <ImageUploader 
          onImagesSelected={mockOnImagesSelected}
          showPreview={false}
        />
      );
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(mockOnImagesSelected).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Should not show preview
      expect(screen.queryByText('アップロードされた画像')).not.toBeInTheDocument();
    });

    it('should update preview when images are removed', async () => {
      const file1 = createMockFile('test1.jpg', 'image/jpeg');
      const file2 = createMockFile('test2.jpg', 'image/jpeg');
      
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      // Upload first batch
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file1, file2],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('アップロードされた画像 (2枚)')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Remove one image
      const removeButton = screen.getAllByLabelText(/を削除$/)[0];
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText('アップロードされた画像 (1枚)')).toBeInTheDocument();
      });
    });

    it('should accumulate images from multiple uploads', async () => {
      const file1 = createMockFile('test1.jpg', 'image/jpeg');
      const file2 = createMockFile('test2.jpg', 'image/jpeg');
      
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      // First upload
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file1],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('アップロードされた画像 (1枚)')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Second upload - should add to existing images
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file2],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('アップロードされた画像 (2枚)')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Memory Management', () => {
    it('should revoke object URL when image is removed', async () => {
      const file = createMockFile('test.jpg', 'image/jpeg');
      
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('アップロードされた画像 (1枚)')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Remove the image
      const removeButton = screen.getByLabelText(/を削除$/);
      fireEvent.click(removeButton);

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});