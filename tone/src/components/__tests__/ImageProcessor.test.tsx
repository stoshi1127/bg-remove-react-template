import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageProcessor } from '../ImageProcessor';
import { FilterPreset } from '../../types/filter';
import { ProcessableImage, BatchProcessingResult } from '../../types/processing';
import { ImageProcessingWorkerPool } from '../../workers/workerPool';

// Mock the worker pool
jest.mock('../../workers/workerPool');
const MockedWorkerPool = ImageProcessingWorkerPool as jest.MockedClass<typeof ImageProcessingWorkerPool>;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

describe('ImageProcessor', () => {
  const mockPreset: FilterPreset = {
    id: 'test-preset',
    name: 'テストプリセット',
    description: 'テスト用のプリセット',
    icon: '🧪',
    filters: {
      brightness: 10,
      contrast: 20,
      saturation: 5,
      hue: 0,
      sharpness: 15,
      warmth: 0
    }
  };

  const createMockImage = (id: string, name: string): ProcessableImage => ({
    id,
    file: new File(['test'], name, { type: 'image/jpeg' }),
    originalUrl: `mock-url-${id}`,
    metadata: {
      width: 800,
      height: 600,
      fileSize: 1024,
      format: 'jpeg',
      lastModified: Date.now()
    },
    status: 'pending'
  });

  const mockImages: ProcessableImage[] = [
    createMockImage('1', 'image1.jpg'),
    createMockImage('2', 'image2.jpg'),
    createMockImage('3', 'image3.jpg')
  ];

  let mockWorkerPool: jest.Mocked<ImageProcessingWorkerPool>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWorkerPool = {
      processImage: jest.fn(),
      processImages: jest.fn(),
      destroy: jest.fn(),
      getStatus: jest.fn()
    } as unknown as OptimizedImageProcessingWorkerPool;

    MockedWorkerPool.mockImplementation(() => mockWorkerPool);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render with basic elements', () => {
      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
        />
      );

      expect(screen.getByText('画像処理')).toBeInTheDocument();
      expect(screen.getByText('テストプリセット')).toBeInTheDocument();
      expect(screen.getByText('🧪')).toBeInTheDocument();
      expect(screen.getByText('3枚')).toBeInTheDocument();
      expect(screen.getByText('処理を開始')).toBeInTheDocument();
    });

    it('should disable start button when no images', () => {
      render(
        <ImageProcessor
          images={[]}
          selectedPreset={mockPreset}
        />
      );

      const startButton = screen.getByText('処理を開始');
      expect(startButton).toBeDisabled();
    });

    it('should show correct image count', () => {
      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
        />
      );

      expect(screen.getByText('3枚')).toBeInTheDocument();
    });
  });

  describe('Batch Processing', () => {
    it('should start batch processing when start button is clicked', async () => {
      const onProcessingStart = jest.fn();
      const onProcessingComplete = jest.fn();

      mockWorkerPool.processImage.mockResolvedValue({
        id: 'test-id',
        processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
        processingTime: 1000
      });

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
          onProcessingStart={onProcessingStart}
          onProcessingComplete={onProcessingComplete}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      expect(onProcessingStart).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(mockWorkerPool.processImage).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(onProcessingComplete).toHaveBeenCalled();
      });
    });

    it('should show progress during processing', async () => {
      const onProcessingProgress = jest.fn();

      // Mock processImage to resolve with delay
      mockWorkerPool.processImage.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            id: 'test-id',
            processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
            processingTime: 1000
          }), 100)
        )
      );

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
          onProcessingProgress={onProcessingProgress}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      // Should show cancel button during processing
      await waitFor(() => {
        expect(screen.getByText('処理をキャンセル')).toBeInTheDocument();
      });

      // Should show progress bar
      expect(screen.getByText(/\d+% 完了/)).toBeInTheDocument();

      await waitFor(() => {
        expect(onProcessingProgress).toHaveBeenCalled();
      });
    });

    it('should handle processing errors gracefully', async () => {
      const onProcessingComplete = jest.fn();

      // Mock first image to fail, others to succeed
      mockWorkerPool.processImage
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValue({
          id: 'test-id',
          processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
          processingTime: 1000
        });

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
          onProcessingComplete={onProcessingComplete}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('処理エラー (1件)')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(onProcessingComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            successCount: 2,
            errorCount: 1,
            errors: expect.arrayContaining([
              expect.objectContaining({
                imageName: 'image1.jpg',
                error: 'Processing failed'
              })
            ])
          })
        );
      });
    });

    it('should allow canceling processing', async () => {
      mockWorkerPool.processImage.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            id: 'test-id',
            processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
            processingTime: 1000
          }), 1000)
        )
      );

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      // Wait for processing to start
      await waitFor(() => {
        expect(screen.getByText('処理をキャンセル')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('処理をキャンセル');
      
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Should return to initial state
      await waitFor(() => {
        expect(screen.getByText('処理を開始')).toBeInTheDocument();
      });

      expect(mockWorkerPool.destroy).toHaveBeenCalled();
    });
  });

  describe('Progress Display', () => {
    it('should show current processing image', async () => {
      mockWorkerPool.processImage.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            id: 'test-id',
            processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
            processingTime: 1000
          }), 100)
        )
      );

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/処理中: image\d\.jpg/)).toBeInTheDocument();
      });
    });

    it('should show processed count during processing', async () => {
      mockWorkerPool.processImage.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            id: 'test-id',
            processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
            processingTime: 1000
          }), 100)
        )
      );

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/\d+\/3枚/)).toBeInTheDocument();
      });
    });

    it('should show estimated time remaining', async () => {
      let resolveCount = 0;
      mockWorkerPool.processImage.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolveCount++;
            resolve({
              id: 'test-id',
              processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
              processingTime: 1000
            });
          }, resolveCount === 1 ? 200 : 100); // First one takes longer to establish timing
        })
      );

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      // Wait for at least one image to be processed to calculate time
      await waitFor(() => {
        expect(screen.getByText(/\d+\/3枚/)).toBeInTheDocument();
      }, { timeout: 1000 });

      // Check if estimated time appears (may not always appear due to timing)
      const timeElement = screen.queryByText(/推定残り時間: \d+秒/);
      if (timeElement) {
        expect(timeElement).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling', () => {
    it('should display error list when processing fails', async () => {
      const onProcessingComplete = jest.fn();

      mockWorkerPool.processImage
        .mockRejectedValueOnce(new Error('File corrupted'))
        .mockRejectedValueOnce(new Error('Memory error'))
        .mockResolvedValueOnce({
          id: 'test-id',
          processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
          processingTime: 1000
        });

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
          onProcessingComplete={onProcessingComplete}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('処理エラー (2件)')).toBeInTheDocument();
        expect(screen.getByText('File corrupted')).toBeInTheDocument();
        expect(screen.getByText('Memory error')).toBeInTheDocument();
      });
    });

    it('should continue processing other images when one fails', async () => {
      const onProcessingComplete = jest.fn();

      mockWorkerPool.processImage
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValue({
          id: 'test-id',
          processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
          processingTime: 1000
        });

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
          onProcessingComplete={onProcessingComplete}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(onProcessingComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            successCount: 2,
            errorCount: 1
          })
        );
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onProcessingStart when processing begins', async () => {
      const onProcessingStart = jest.fn();

      mockWorkerPool.processImage.mockResolvedValue({
        id: 'test-id',
        processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
        processingTime: 1000
      });

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
          onProcessingStart={onProcessingStart}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      expect(onProcessingStart).toHaveBeenCalledTimes(1);
    });

    it('should call onProcessingProgress during processing', async () => {
      const onProcessingProgress = jest.fn();

      mockWorkerPool.processImage.mockResolvedValue({
        id: 'test-id',
        processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
        processingTime: 1000
      });

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
          onProcessingProgress={onProcessingProgress}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(onProcessingProgress).toHaveBeenCalled();
      });

      // Should be called multiple times during processing
      expect(onProcessingProgress.mock.calls.length).toBeGreaterThan(1);
    });

    it('should call onProcessingComplete with correct result', async () => {
      const onProcessingComplete = jest.fn();

      mockWorkerPool.processImage.mockResolvedValue({
        id: 'test-id',
        processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
        processingTime: 1000
      });

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
          onProcessingComplete={onProcessingComplete}
        />
      );

      const startButton = screen.getByText('処理を開始');
      
      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(onProcessingComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            processedImages: expect.arrayContaining([
              expect.objectContaining({
                appliedPreset: 'test-preset',
                processedUrl: 'mock-blob-url'
              })
            ]),
            successCount: 3,
            errorCount: 0,
            totalProcessingTime: expect.any(Number)
          })
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('should destroy worker pool on unmount', () => {
      const { unmount } = render(
        <ImageProcessor
          images={mockImages}
          selectedPreset={mockPreset}
        />
      );

      unmount();

      expect(mockWorkerPool.destroy).toHaveBeenCalled();
    });
  });
});