import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImagePreview } from '../ImagePreview';
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

describe('ImagePreview', () => {
  const mockOnRemoveImage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  const createMockProcessableImage = (
    id: string,
    name: string,
    status: ProcessableImage['status'] = 'pending'
  ): ProcessableImage => {
    const file = new File(['mock content'], name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return {
      id,
      file,
      originalUrl: `blob:mock-url-${id}`,
      metadata: {
        width: 1920,
        height: 1080,
        fileSize: 1024 * 1024,
        format: 'image/jpeg',
        lastModified: file.lastModified,
      },
      status,
    };
  };

  describe('Rendering', () => {
    it('should render nothing when no images provided', () => {
      const { container } = render(<ImagePreview images={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render image count correctly', () => {
      const images = [
        createMockProcessableImage('1', 'test1.jpg'),
        createMockProcessableImage('2', 'test2.jpg'),
      ];

      render(<ImagePreview images={images} />);
      
      expect(screen.getByText('アップロードされた画像 (2枚)')).toBeInTheDocument();
    });

    it('should render all images in grid', () => {
      const images = [
        createMockProcessableImage('1', 'test1.jpg'),
        createMockProcessableImage('2', 'test2.jpg'),
        createMockProcessableImage('3', 'test3.jpg'),
      ];

      render(<ImagePreview images={images} />);
      
      expect(screen.getByAltText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByAltText('test2.jpg')).toBeInTheDocument();
      expect(screen.getByAltText('test3.jpg')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      const { container } = render(
        <ImagePreview images={images} className="custom-class" />
      );
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show processing indicator for processing status', () => {
      const images = [createMockProcessableImage('1', 'test.jpg', 'processing')];
      render(<ImagePreview images={images} />);
      
      const indicator = document.querySelector('.animate-pulse');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('bg-blue-500');
    });

    it('should show completed indicator for completed status', () => {
      const images = [createMockProcessableImage('1', 'test.jpg', 'completed')];
      render(<ImagePreview images={images} />);
      
      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show error indicator for error status', () => {
      const images = [createMockProcessableImage('1', 'test.jpg', 'error')];
      render(<ImagePreview images={images} />);
      
      const indicator = document.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should not show indicator for pending status', () => {
      const images = [createMockProcessableImage('1', 'test.jpg', 'pending')];
      render(<ImagePreview images={images} />);
      
      const processingIndicator = document.querySelector('.animate-pulse');
      const completedIndicator = document.querySelector('.bg-green-500');
      const errorIndicator = document.querySelector('.bg-red-500');
      
      expect(processingIndicator).not.toBeInTheDocument();
      expect(completedIndicator).not.toBeInTheDocument();
      expect(errorIndicator).not.toBeInTheDocument();
    });
  });

  describe('Remove Functionality', () => {
    it('should show remove button when onRemoveImage is provided', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} onRemoveImage={mockOnRemoveImage} />);
      
      const removeButton = screen.getByLabelText('test.jpgを削除');
      expect(removeButton).toBeInTheDocument();
    });

    it('should not show remove button when onRemoveImage is not provided', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} />);
      
      const removeButton = screen.queryByLabelText('test.jpgを削除');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should call onRemoveImage when remove button is clicked', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} onRemoveImage={mockOnRemoveImage} />);
      
      const removeButton = screen.getByLabelText('test.jpgを削除');
      fireEvent.click(removeButton);
      
      expect(mockOnRemoveImage).toHaveBeenCalledWith('1');
    });

    it('should not trigger image selection when remove button is clicked', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} onRemoveImage={mockOnRemoveImage} />);
      
      const removeButton = screen.getByLabelText('test.jpgを削除');
      fireEvent.click(removeButton);
      
      // Modal should not open
      expect(screen.queryByText('画像情報')).not.toBeInTheDocument();
    });
  });

  describe('Image Selection and Modal', () => {
    it('should open modal when image is clicked', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} />);
      
      const image = screen.getByAltText('test.jpg');
      fireEvent.click(image.closest('.cursor-pointer')!);
      
      expect(screen.getByText('画像情報')).toBeInTheDocument();
      // Check that the modal header contains the filename
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('test.jpg');
    });

    it('should close modal when close button is clicked', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} />);
      
      // Open modal
      const image = screen.getByAltText('test.jpg');
      fireEvent.click(image.closest('.cursor-pointer')!);
      
      // Close modal
      const closeButton = screen.getByLabelText('閉じる');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('画像情報')).not.toBeInTheDocument();
    });

    it('should close modal when backdrop is clicked', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} />);
      
      // Open modal
      const image = screen.getByAltText('test.jpg');
      fireEvent.click(image.closest('.cursor-pointer')!);
      
      // Click backdrop
      const backdrop = document.querySelector('.bg-black.bg-opacity-75');
      fireEvent.click(backdrop!);
      
      expect(screen.queryByText('画像情報')).not.toBeInTheDocument();
    });

    it('should not close modal when modal content is clicked', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} />);
      
      // Open modal
      const image = screen.getByAltText('test.jpg');
      fireEvent.click(image.closest('.cursor-pointer')!);
      
      // Click modal content
      const modalContent = document.querySelector('.bg-white.rounded-lg');
      fireEvent.click(modalContent!);
      
      expect(screen.getByText('画像情報')).toBeInTheDocument();
    });
  });

  describe('Modal Content', () => {
    it('should display correct image metadata', () => {
      const image = createMockProcessableImage('1', 'test-image.jpg');
      render(<ImagePreview images={[image]} />);
      
      // Open modal
      const imageElement = screen.getByAltText('test-image.jpg');
      fireEvent.click(imageElement.closest('.cursor-pointer')!);
      
      // Check metadata - check the modal header specifically
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('test-image.jpg');
      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
      expect(screen.getByText('image/jpeg')).toBeInTheDocument();
    });

    it('should display correct status badges', () => {
      const images = [
        createMockProcessableImage('1', 'pending.jpg', 'pending'),
        createMockProcessableImage('2', 'processing.jpg', 'processing'),
        createMockProcessableImage('3', 'completed.jpg', 'completed'),
        createMockProcessableImage('4', 'error.jpg', 'error'),
      ];

      render(<ImagePreview images={images} />);
      
      // Test pending status
      fireEvent.click(screen.getByAltText('pending.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('待機中')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('閉じる'));
      
      // Test processing status
      fireEvent.click(screen.getByAltText('processing.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('処理中')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('閉じる'));
      
      // Test completed status
      fireEvent.click(screen.getByAltText('completed.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('完了')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('閉じる'));
      
      // Test error status
      fireEvent.click(screen.getByAltText('error.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('エラー')).toBeInTheDocument();
    });

    it('should show remove button in modal when onRemoveImage is provided', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} onRemoveImage={mockOnRemoveImage} />);
      
      // Open modal
      const image = screen.getByAltText('test.jpg');
      fireEvent.click(image.closest('.cursor-pointer')!);
      
      expect(screen.getByText('この画像を削除')).toBeInTheDocument();
    });

    it('should call onRemoveImage and close modal when delete button in modal is clicked', () => {
      const images = [createMockProcessableImage('1', 'test.jpg')];
      render(<ImagePreview images={images} onRemoveImage={mockOnRemoveImage} />);
      
      // Open modal
      const image = screen.getByAltText('test.jpg');
      fireEvent.click(image.closest('.cursor-pointer')!);
      
      // Click delete button
      const deleteButton = screen.getByText('この画像を削除');
      fireEvent.click(deleteButton);
      
      expect(mockOnRemoveImage).toHaveBeenCalledWith('1');
      expect(screen.queryByText('画像情報')).not.toBeInTheDocument();
    });
  });

  describe('File Size Formatting', () => {
    it('should format file sizes correctly', () => {
      const images = [
        {
          ...createMockProcessableImage('1', 'small.jpg'),
          metadata: {
            ...createMockProcessableImage('1', 'small.jpg').metadata,
            fileSize: 1024, // 1 KB
          },
        },
        {
          ...createMockProcessableImage('2', 'medium.jpg'),
          metadata: {
            ...createMockProcessableImage('2', 'medium.jpg').metadata,
            fileSize: 1024 * 1024, // 1 MB
          },
        },
        {
          ...createMockProcessableImage('3', 'large.jpg'),
          metadata: {
            ...createMockProcessableImage('3', 'large.jpg').metadata,
            fileSize: 1024 * 1024 * 1024, // 1 GB
          },
        },
      ];

      render(<ImagePreview images={images} />);
      
      // Test KB formatting
      fireEvent.click(screen.getByAltText('small.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('1 KB')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('閉じる'));
      
      // Test MB formatting
      fireEvent.click(screen.getByAltText('medium.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('1 MB')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('閉じる'));
      
      // Test GB formatting
      fireEvent.click(screen.getByAltText('large.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('1 GB')).toBeInTheDocument();
    });

    it('should handle zero file size', () => {
      const image = {
        ...createMockProcessableImage('1', 'zero.jpg'),
        metadata: {
          ...createMockProcessableImage('1', 'zero.jpg').metadata,
          fileSize: 0,
        },
      };

      render(<ImagePreview images={[image]} />);
      
      fireEvent.click(screen.getByAltText('zero.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('0 Bytes')).toBeInTheDocument();
    });
  });

  describe('Dimensions Formatting', () => {
    it('should format dimensions correctly', () => {
      const image = createMockProcessableImage('1', 'test.jpg');
      render(<ImagePreview images={[image]} />);
      
      fireEvent.click(screen.getByAltText('test.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
    });

    it('should handle zero dimensions', () => {
      const image = {
        ...createMockProcessableImage('1', 'test.jpg'),
        metadata: {
          ...createMockProcessableImage('1', 'test.jpg').metadata,
          width: 0,
          height: 0,
        },
      };

      render(<ImagePreview images={[image]} />);
      
      fireEvent.click(screen.getByAltText('test.jpg').closest('.cursor-pointer')!);
      expect(screen.getByText('不明')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format last modified date correctly', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const image = {
        ...createMockProcessableImage('1', 'test.jpg'),
        metadata: {
          ...createMockProcessableImage('1', 'test.jpg').metadata,
          lastModified: testDate.getTime(),
        },
      };

      render(<ImagePreview images={[image]} />);
      
      fireEvent.click(screen.getByAltText('test.jpg').closest('.cursor-pointer')!);
      
      // Check that some date string is displayed (exact format may vary by locale)
      const dateElement = screen.getByText(/2024/);
      expect(dateElement).toBeInTheDocument();
    });
  });
});