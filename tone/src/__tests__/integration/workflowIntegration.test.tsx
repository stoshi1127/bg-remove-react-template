/**
 * Integration tests for the complete 3-step workflow
 * Tests the user journey through upload -> preset selection -> processing -> download
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { EasyToneApp } from '@/components/EasyToneApp';

// Mock file utilities
const createMockFile = (name: string, type: string = 'image/jpeg'): File => {
  const content = 'mock image content';
  return new File([content], name, { type });
};

// Mock canvas and image processing
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 100,
      height: 100
    })),
    putImageData: jest.fn(),
    canvas: { toBlob: jest.fn((callback) => callback(new Blob())) }
  })),
  width: 100,
  height: 100
};

beforeAll(() => {
  global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
  global.URL.revokeObjectURL = jest.fn();
  global.Image = class MockImage {
    onload: (() => void) | null = null;
    src: string = '';
    width: number = 100;
    height: number = 100;
    
    constructor() {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 10);
    }
  } as unknown as typeof Worker;
});

describe('Workflow Integration Tests', () => {
  describe('3-Step Workflow Navigation', () => {
    test('should navigate through all workflow steps correctly', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Initially should be on step 1
      expect(screen.getByText('ステップ 1')).toBeInTheDocument();
      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
      
      // Step 2 and 3 should be disabled
      const step2 = screen.getByText('ステップ 2');
      const step3 = screen.getByText('ステップ 3');
      expect(step2.closest('button')).toBeDisabled();
      expect(step3.closest('button')).toBeDisabled();

      // Upload files to enable step 2
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(step2.closest('button')).not.toBeDisabled();
        expect(screen.getByText('プリセット選択')).toBeInTheDocument();
      });

      // Select preset to enable step 3
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      await waitFor(() => {
        expect(step3.closest('button')).not.toBeDisabled();
        expect(screen.getByText('処理・ダウンロード')).toBeInTheDocument();
      });

      // Process images
      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('should allow navigation back to previous steps', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Complete step 1
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('プリセット選択')).toBeInTheDocument();
      });

      // Complete step 2
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      await waitFor(() => {
        expect(screen.getByText('処理・ダウンロード')).toBeInTheDocument();
      });

      // Navigate back to step 1
      const step1Button = screen.getByText('ステップ 1');
      await user.click(step1Button);

      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test.jpg')).toBeInTheDocument();

      // Navigate to step 2
      const step2Button = screen.getByText('ステップ 2');
      await user.click(step2Button);

      expect(screen.getByText('プリセット選択')).toBeInTheDocument();
      expect(screen.getByText('商品をくっきりと')).toHaveClass('selected');
    });

    test('should maintain state when navigating between steps', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload multiple files
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [
        createMockFile('test1.jpg'),
        createMockFile('test2.png')
      ];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('2 枚の画像がアップロードされました')).toBeInTheDocument();
      });

      // Select preset
      const presetButton = screen.getByText('明るくクリアに');
      await user.click(presetButton);

      // Navigate back to step 1
      const step1Button = screen.getByText('ステップ 1');
      await user.click(step1Button);

      // Verify files are still there
      expect(screen.getByText('2 枚の画像がアップロードされました')).toBeInTheDocument();

      // Navigate back to step 2
      const step2Button = screen.getByText('ステップ 2');
      await user.click(step2Button);

      // Verify preset selection is maintained
      expect(screen.getByText('明るくクリアに')).toHaveClass('selected');
    });
  });

  describe('Workflow Progress Indicators', () => {
    test('should show correct progress indicators for each step', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Step 1 should be active
      const step1 = screen.getByText('ステップ 1').closest('.step');
      expect(step1).toHaveClass('active');

      // Upload files
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        const step1Completed = screen.getByText('ステップ 1').closest('.step');
        expect(step1Completed).toHaveClass('completed');
        
        const step2Active = screen.getByText('ステップ 2').closest('.step');
        expect(step2Active).toHaveClass('active');
      });

      // Select preset
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      await waitFor(() => {
        const step2Completed = screen.getByText('ステップ 2').closest('.step');
        expect(step2Completed).toHaveClass('completed');
        
        const step3Active = screen.getByText('ステップ 3').closest('.step');
        expect(step3Active).toHaveClass('active');
      });
    });

    test('should show processing progress during step 3', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Complete steps 1 and 2
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [
        createMockFile('test1.jpg'),
        createMockFile('test2.jpg'),
        createMockFile('test3.jpg')
      ];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      // Start processing
      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Verify progress indicators
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText('処理中...')).toBeInTheDocument();
      });

      // Verify completion
      await waitFor(() => {
        expect(screen.getByText('3 / 3 完了')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Workflow Error Handling', () => {
    test('should handle errors without breaking workflow navigation', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Try to upload invalid file
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      await user.upload(fileInput, [invalidFile]);

      // Should show error but stay on step 1
      await waitFor(() => {
        expect(screen.getByText(/サポートされていないファイル形式/)).toBeInTheDocument();
      });

      expect(screen.getByText('ステップ 1').closest('.step')).toHaveClass('active');
      expect(screen.getByText('ステップ 2').closest('button')).toBeDisabled();

      // Upload valid file
      const validFile = createMockFile('test.jpg');
      await user.upload(fileInput, [validFile]);

      await waitFor(() => {
        expect(screen.getByText('ステップ 2').closest('button')).not.toBeDisabled();
      });
    });

    test('should handle processing errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock processing error
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn(() => {
        throw new Error('Processing failed');
      });

      render(<EasyToneApp />);

      // Complete steps 1 and 2
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/処理中にエラーが発生しました/)).toBeInTheDocument();
      });

      // Should allow retry or going back to previous steps
      expect(screen.getByText('ステップ 1').closest('button')).not.toBeDisabled();
      expect(screen.getByText('ステップ 2').closest('button')).not.toBeDisabled();

      // Restore original function
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });
  });

  describe('Workflow Accessibility', () => {
    test('should support keyboard navigation through workflow steps', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload files first
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('ステップ 2').closest('button')).not.toBeDisabled();
      });

      // Navigate using keyboard
      const step2Button = screen.getByText('ステップ 2').closest('button');
      step2Button?.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('プリセット選択')).toBeInTheDocument();

      // Navigate through presets using keyboard
      const firstPreset = screen.getByText('商品をくっきりと');
      firstPreset.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('ステップ 3').closest('button')).not.toBeDisabled();
      });
    });

    test('should announce workflow progress to screen readers', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Check ARIA labels and live regions
      expect(screen.getByRole('region', { name: /ワークフロー/ })).toBeInTheDocument();
      expect(screen.getByLabelText('現在のステップ: 1')).toBeInTheDocument();

      // Upload files
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByLabelText('現在のステップ: 2')).toBeInTheDocument();
      });

      // Select preset
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      await waitFor(() => {
        expect(screen.getByLabelText('現在のステップ: 3')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Performance', () => {
    test('should handle large number of files efficiently', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload many files
      const files = Array.from({ length: 20 }, (_, i) => 
        createMockFile(`test${i + 1}.jpg`, 'image/jpeg')
      );
      
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, files);

      // Should handle large uploads without freezing
      await waitFor(() => {
        expect(screen.getByText('20 枚の画像がアップロードされました')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should enable step 2
      expect(screen.getByText('ステップ 2').closest('button')).not.toBeDisabled();

      // Select preset
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      // Should enable step 3
      await waitFor(() => {
        expect(screen.getByText('ステップ 3').closest('button')).not.toBeDisabled();
      });
    });

    test('should show appropriate loading states during transitions', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload files
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      // Should show loading during file processing
      expect(screen.getByText('処理中...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('プリセット選択')).toBeInTheDocument();
      });

      // Select preset
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      // Should show loading during preset application
      expect(screen.getByText('プリセットを適用中...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('処理・ダウンロード')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Reset and Restart', () => {
    test('should allow restarting workflow from any step', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Complete full workflow
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Reset workflow
      const resetButton = screen.getByText('新しい画像をアップロード');
      await user.click(resetButton);

      // Should return to step 1
      expect(screen.getByText('ステップ 1').closest('.step')).toHaveClass('active');
      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
      expect(screen.getByText('ステップ 2').closest('button')).toBeDisabled();
      expect(screen.getByText('ステップ 3').closest('button')).toBeDisabled();
    });
  });
});