import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageUploader } from '../ImageUploader';
import { ProcessableImage } from '../../types';

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
let mockImageInstances: any[] = [];

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

describe('ImageUploader', () => {
  const mockOnImagesSelected = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockImageInstances = [];
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    
    // Mock file size
    Object.defineProperty(file, 'size', {
      value: size,
      writable: false,
    });
    
    return file;
  };

  describe('Rendering', () => {
    it('should render upload area with correct text', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      expect(screen.getByText('画像をドラッグ&ドロップ')).toBeInTheDocument();
      expect(screen.getByText('または、クリックしてファイルを選択')).toBeInTheDocument();
      expect(screen.getByText(/対応形式: JPG, PNG, HEIC/)).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <ImageUploader 
          onImagesSelected={mockOnImagesSelected} 
          className="custom-class"
        />
      );
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle file input change', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const file = createMockFile('test.jpg', 'image/jpeg');
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              file,
              status: 'pending',
              metadata: expect.objectContaining({
                width: 1920,
                height: 1080,
                fileSize: file.size,
                format: 'image/jpeg',
              }),
            }),
          ])
        );
      }, { timeout: 3000 });
    });

    it('should handle multiple file selection', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const file1 = createMockFile('test1.jpg', 'image/jpeg');
      const file2 = createMockFile('test2.png', 'image/png');
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ file: file1 }),
            expect.objectContaining({ file: file2 }),
          ])
        );
      }, { timeout: 3000 });
    });

    it('should open file dialog when upload area is clicked', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = jest.spyOn(input, 'click');
      
      fireEvent.click(uploadArea);
      
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should open file dialog when Enter key is pressed', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = jest.spyOn(input, 'click');
      
      fireEvent.keyDown(uploadArea, { key: 'Enter' });
      
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag enter and leave events', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      // Drag enter
      fireEvent.dragEnter(uploadArea);
      expect(uploadArea).toHaveClass('border-blue-500', 'bg-blue-50');
      
      // Drag leave
      fireEvent.dragLeave(uploadArea);
      expect(uploadArea).not.toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should handle file drop', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const file = createMockFile('test.jpg', 'image/jpeg');
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              file,
              status: 'pending',
            }),
          ])
        );
      }, { timeout: 3000 });
    });

    it('should prevent default drag over behavior', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      const event = new Event('dragover', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      fireEvent(uploadArea, event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('File Validation', () => {
    it('should accept valid file formats', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const validFiles = [
        createMockFile('test.jpg', 'image/jpeg'),
        createMockFile('test.png', 'image/png'),
        createMockFile('test.heic', 'image/heic'),
      ];
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: validFiles,
        },
      });
      
      await waitFor(() => {
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining(
            validFiles.map(file => 
              expect.objectContaining({ file })
            )
          )
        );
      }, { timeout: 3000 });
    });

    it('should reject invalid file formats', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const invalidFile = createMockFile('test.gif', 'image/gif');
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [invalidFile],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText(/サポートされていないファイル形式です/)).toBeInTheDocument();
        expect(mockOnImagesSelected).not.toHaveBeenCalled();
      });
    });

    it('should reject files that are too large', async () => {
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      render(
        <ImageUploader 
          onImagesSelected={mockOnImagesSelected} 
          maxFileSize={maxFileSize}
        />
      );
      
      const largeFile = createMockFile('large.jpg', 'image/jpeg', 20 * 1024 * 1024); // 20MB
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [largeFile],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText(/ファイルサイズが大きすぎます/)).toBeInTheDocument();
        expect(mockOnImagesSelected).not.toHaveBeenCalled();
      });
    });

    it('should handle mixed valid and invalid files', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const validFile = createMockFile('valid.jpg', 'image/jpeg');
      const invalidFile = createMockFile('invalid.gif', 'image/gif');
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [validFile, invalidFile],
        },
      });
      
      await waitFor(() => {
        // Should show error for invalid file
        expect(screen.getByText(/サポートされていないファイル形式です/)).toBeInTheDocument();
        
        // Should still process valid file
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ file: validFile }),
          ])
        );
      }, { timeout: 3000 });
    });
  });

  describe('Custom Props', () => {
    it('should use custom accepted formats', async () => {
      const customFormats = ['image/jpeg', 'image/png'];
      render(
        <ImageUploader 
          onImagesSelected={mockOnImagesSelected}
          acceptedFormats={customFormats}
        />
      );
      
      const heicFile = createMockFile('test.heic', 'image/heic');
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [heicFile],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText(/サポートされていないファイル形式です/)).toBeInTheDocument();
        expect(mockOnImagesSelected).not.toHaveBeenCalled();
      });
    });

    it('should use custom max file size', () => {
      const customMaxSize = 5 * 1024 * 1024; // 5MB
      render(
        <ImageUploader 
          onImagesSelected={mockOnImagesSelected}
          maxFileSize={customMaxSize}
        />
      );
      
      expect(screen.getByText(/最大サイズ: 5MB/)).toBeInTheDocument();
    });
  });

  describe('ProcessableImage Creation', () => {
    it('should create ProcessableImage with unique ID', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const file = createMockFile('test.jpg', 'image/jpeg');
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(mockOnImagesSelected).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.stringMatching(/^test\.jpg-\d+-[a-z0-9]+$/),
              file,
              originalUrl: 'blob:mock-url',
              status: 'pending',
            }),
          ])
        );
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    it('should display multiple errors', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const invalidFile1 = createMockFile('test.gif', 'image/gif');
      const invalidFile2 = createMockFile('test.bmp', 'image/bmp');
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [invalidFile1, invalidFile2],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('以下のエラーが発生しました:')).toBeInTheDocument();
        expect(screen.getByText(/test\.gif.*サポートされていないファイル形式です/)).toBeInTheDocument();
        expect(screen.getByText(/test\.bmp.*サポートされていないファイル形式です/)).toBeInTheDocument();
      });
    });

    it('should clear previous errors on new upload', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      
      // First upload with invalid file
      const invalidFile = createMockFile('test.gif', 'image/gif');
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [invalidFile],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText(/サポートされていないファイル形式です/)).toBeInTheDocument();
      });
      
      // Second upload with valid file
      const validFile = createMockFile('test.jpg', 'image/jpeg');
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [validFile],
        },
      });
      
      await waitFor(() => {
        expect(screen.queryByText(/サポートされていないファイル形式です/)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      expect(uploadArea).toHaveAttribute('tabIndex', '0');
      expect(uploadArea).toHaveAttribute('aria-label', '画像ファイルをアップロード');
    });

    it('should handle keyboard navigation', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadArea = screen.getByRole('button', { name: /画像ファイルをアップロード/ });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      const clickSpy = jest.spyOn(input, 'click');
      
      // Test Enter key
      fireEvent.keyDown(uploadArea, { key: 'Enter' });
      expect(clickSpy).toHaveBeenCalled();
      
      clickSpy.mockClear();
      
      // Test Space key
      fireEvent.keyDown(uploadArea, { key: ' ' });
      expect(clickSpy).toHaveBeenCalled();
      
      clickSpy.mockClear();
      
      // Test other keys (should not trigger)
      fireEvent.keyDown(uploadArea, { key: 'Tab' });
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should hide file input from screen readers', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toHaveAttribute('aria-hidden', 'true');
    });
  });
});