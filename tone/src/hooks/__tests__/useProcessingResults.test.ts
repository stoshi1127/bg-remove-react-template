import { renderHook, act } from '@testing-library/react';
import { useProcessingResults, getProcessingStats, exportProcessingResults } from '../useProcessingResults';
import { ProcessableImage, ProcessedImage, ProcessingError, BatchProcessingResult } from '../../types/processing';
import { FilterPreset } from '../../types/filter';

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

describe('useProcessingResults', () => {
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

  const createMockProcessableImage = (id: string, name: string): ProcessableImage => ({
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

  const createMockProcessedImage = (originalImage: ProcessableImage): ProcessedImage => ({
    id: originalImage.id,
    originalImage,
    processedUrl: 'mock-processed-url',
    processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
    appliedPreset: mockPreset.id,
    processingTime: 1000,
    fileSize: 2048
  });

  const mockImages: ProcessableImage[] = [
    createMockProcessableImage('1', 'image1.jpg'),
    createMockProcessableImage('2', 'image2.jpg'),
    createMockProcessableImage('3', 'image3.jpg')
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [state] = result.current;

      expect(state.processedImages).toEqual([]);
      expect(state.originalImages).toEqual([]);
      expect(state.isProcessing).toBe(false);
      expect(state.progress.totalImages).toBe(0);
      expect(state.progress.processedImages).toBe(0);
      expect(state.progress.progress).toBe(0);
      expect(state.batchResult).toBeNull();
      expect(state.errors).toEqual([]);
    });
  });

  describe('Processing Management', () => {
    it('should start processing correctly', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
      });

      const [state] = result.current;
      expect(state.originalImages).toEqual(mockImages);
      expect(state.isProcessing).toBe(true);
      expect(state.progress.totalImages).toBe(3);
      expect(state.progress.processedImages).toBe(0);
      expect(state.processedImages).toEqual([]);
      expect(state.errors).toEqual([]);
    });

    it('should update progress correctly', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
      });

      const mockProgress = {
        totalImages: 3,
        processedImages: 1,
        currentImage: 'image1.jpg',
        progress: 33.33,
        errors: []
      };

      act(() => {
        actions.updateProgress(mockProgress);
      });

      const [state] = result.current;
      expect(state.progress).toEqual(mockProgress);
    });

    it('should add processed images correctly', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
      });

      const processedImage = createMockProcessedImage(mockImages[0]);

      act(() => {
        actions.addProcessedImage(processedImage);
      });

      const [state] = result.current;
      expect(state.processedImages).toHaveLength(1);
      expect(state.processedImages[0]).toEqual(processedImage);
      
      // Original image status should be updated
      const updatedOriginalImage = state.originalImages.find(img => img.id === mockImages[0].id);
      expect(updatedOriginalImage?.status).toBe('completed');
    });

    it('should update existing processed image when adding duplicate', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
      });

      const processedImage1 = createMockProcessedImage(mockImages[0]);
      const processedImage2 = { ...processedImage1, processingTime: 2000 };

      act(() => {
        actions.addProcessedImage(processedImage1);
      });

      act(() => {
        actions.addProcessedImage(processedImage2);
      });

      const [state] = result.current;
      expect(state.processedImages).toHaveLength(1);
      expect(state.processedImages[0].processingTime).toBe(2000);
    });

    it('should complete processing correctly', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
      });

      const batchResult: BatchProcessingResult = {
        processedImages: [createMockProcessedImage(mockImages[0])],
        errors: [],
        totalProcessingTime: 3000,
        successCount: 1,
        errorCount: 0
      };

      act(() => {
        actions.completeProcessing(batchResult);
      });

      const [state] = result.current;
      expect(state.isProcessing).toBe(false);
      expect(state.batchResult).toEqual(batchResult);
      expect(state.progress.progress).toBe(100);
      expect(state.progress.currentImage).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should add errors correctly', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
      });

      const error: ProcessingError = {
        imageId: mockImages[0].id,
        imageName: mockImages[0].file.name,
        error: 'Processing failed',
        timestamp: Date.now()
      };

      act(() => {
        actions.addError(error);
      });

      const [state] = result.current;
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toEqual(error);
      expect(state.progress.errors).toHaveLength(1);
      
      // Original image status should be updated
      const updatedOriginalImage = state.originalImages.find(img => img.id === mockImages[0].id);
      expect(updatedOriginalImage?.status).toBe('error');
      expect(updatedOriginalImage?.error).toBe('Processing failed');
    });
  });

  describe('State Management', () => {
    it('should reset results correctly', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      // Set up some state
      act(() => {
        actions.startProcessing(mockImages, mockPreset);
        actions.addProcessedImage(createMockProcessedImage(mockImages[0]));
      });

      // Reset
      act(() => {
        actions.resetResults();
      });

      const [state] = result.current;
      expect(state.processedImages).toEqual([]);
      expect(state.originalImages).toEqual([]);
      expect(state.isProcessing).toBe(false);
      expect(state.progress.totalImages).toBe(0);
      expect(state.batchResult).toBeNull();
      expect(state.errors).toEqual([]);
    });

    it('should remove processed image correctly', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
        actions.addProcessedImage(createMockProcessedImage(mockImages[0]));
        actions.addProcessedImage(createMockProcessedImage(mockImages[1]));
      });

      act(() => {
        actions.removeProcessedImage(mockImages[0].id);
      });

      const [state] = result.current;
      expect(state.processedImages).toHaveLength(1);
      expect(state.processedImages[0].id).toBe(mockImages[1].id);
      expect(state.originalImages).toHaveLength(2);
      expect(state.originalImages.find(img => img.id === mockImages[0].id)).toBeUndefined();
    });

    it('should update processed image correctly', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
        actions.addProcessedImage(createMockProcessedImage(mockImages[0]));
      });

      const updates = { processingTime: 5000, fileSize: 4096 };

      act(() => {
        actions.updateProcessedImage(mockImages[0].id, updates);
      });

      const [state] = result.current;
      const updatedImage = state.processedImages.find(img => img.id === mockImages[0].id);
      expect(updatedImage?.processingTime).toBe(5000);
      expect(updatedImage?.fileSize).toBe(4096);
    });

    it('should update batch result when removing processed image', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      const processedImage = createMockProcessedImage(mockImages[0]);
      const batchResult: BatchProcessingResult = {
        processedImages: [processedImage],
        errors: [],
        totalProcessingTime: 3000,
        successCount: 1,
        errorCount: 0
      };

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
        actions.addProcessedImage(processedImage);
        actions.completeProcessing(batchResult);
      });

      act(() => {
        actions.removeProcessedImage(mockImages[0].id);
      });

      const [state] = result.current;
      expect(state.batchResult?.processedImages).toHaveLength(0);
      expect(state.batchResult?.successCount).toBe(0);
    });

    it('should update batch result when updating processed image', () => {
      const { result } = renderHook(() => useProcessingResults());
      const [, actions] = result.current;

      const processedImage = createMockProcessedImage(mockImages[0]);
      const batchResult: BatchProcessingResult = {
        processedImages: [processedImage],
        errors: [],
        totalProcessingTime: 3000,
        successCount: 1,
        errorCount: 0
      };

      act(() => {
        actions.startProcessing(mockImages, mockPreset);
        actions.addProcessedImage(processedImage);
        actions.completeProcessing(batchResult);
      });

      const updates = { processingTime: 5000 };

      act(() => {
        actions.updateProcessedImage(mockImages[0].id, updates);
      });

      const [state] = result.current;
      const updatedBatchImage = state.batchResult?.processedImages.find(img => img.id === mockImages[0].id);
      expect(updatedBatchImage?.processingTime).toBe(5000);
    });
  });

  describe('Helper Functions', () => {
    describe('getProcessingStats', () => {
      it('should calculate stats correctly', () => {
        const { result } = renderHook(() => useProcessingResults());
        const [, actions] = result.current;

        act(() => {
          actions.startProcessing(mockImages, mockPreset);
          actions.addProcessedImage(createMockProcessedImage(mockImages[0]));
          actions.addProcessedImage(createMockProcessedImage(mockImages[1]));
          actions.addError({
            imageId: mockImages[2].id,
            imageName: mockImages[2].file.name,
            error: 'Processing failed',
            timestamp: Date.now()
          });
        });

        const [state] = result.current;
        const stats = getProcessingStats(state);

        expect(stats.totalImages).toBe(3);
        expect(stats.successfulImages).toBe(2);
        expect(stats.failedImages).toBe(1);
        expect(stats.pendingImages).toBe(0);
        expect(stats.successRate).toBe(67); // 2/3 * 100 rounded
        expect(stats.totalFileSize).toBe(4096); // 2 * 2048
        expect(stats.averageProcessingTime).toBe(1000);
      });

      it('should handle empty state', () => {
        const { result } = renderHook(() => useProcessingResults());
        const [state] = result.current;
        const stats = getProcessingStats(state);

        expect(stats.totalImages).toBe(0);
        expect(stats.successfulImages).toBe(0);
        expect(stats.failedImages).toBe(0);
        expect(stats.pendingImages).toBe(0);
        expect(stats.successRate).toBe(0);
        expect(stats.totalFileSize).toBe(0);
        expect(stats.averageProcessingTime).toBe(0);
      });
    });

    describe('exportProcessingResults', () => {
      it('should export results correctly', () => {
        const { result } = renderHook(() => useProcessingResults());
        const [, actions] = result.current;

        const processedImage = createMockProcessedImage(mockImages[0]);
        const error: ProcessingError = {
          imageId: mockImages[1].id,
          imageName: mockImages[1].file.name,
          error: 'Processing failed',
          timestamp: Date.now()
        };

        act(() => {
          actions.startProcessing(mockImages.slice(0, 2), mockPreset);
          actions.addProcessedImage(processedImage);
          actions.addError(error);
        });

        const [state] = result.current;
        const exported = exportProcessingResults(state);

        expect(exported.summary.totalImages).toBe(2);
        expect(exported.summary.successfulImages).toBe(1);
        expect(exported.summary.failedImages).toBe(1);
        expect(exported.summary.successRate).toBe(50);

        expect(exported.processedImages).toHaveLength(1);
        expect(exported.processedImages[0].originalFileName).toBe('image1.jpg');
        expect(exported.processedImages[0].appliedPreset).toBe(mockPreset.id);

        expect(exported.errors).toHaveLength(1);
        expect(exported.errors[0].imageName).toBe('image2.jpg');
        expect(exported.errors[0].error).toBe('Processing failed');
      });
    });
  });
});