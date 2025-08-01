import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PresetPreview } from '../PresetPreview';
import { FILTER_PRESETS } from '../../constants/presets';
import { ProcessableImage } from '../../types/image';

// Canvas API のモック
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(400), // 10x10 画像のダミーデータ
      width: 10,
      height: 10
    })),
    putImageData: jest.fn(),
  })),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-data-url'),
  width: 0,
  height: 0
};

// HTMLCanvasElement のモック
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => mockCanvas.getContext()),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: jest.fn(() => mockCanvas.toDataURL()),
});

// Image のモック
const mockImage = {
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
  width: 100,
  height: 100
};

global.Image = jest.fn(() => mockImage) as any;

describe('PresetPreview', () => {
  const mockPreset = FILTER_PRESETS[0]; // crisp-product
  const mockPreviewImage: ProcessableImage = {
    id: 'test-image-1',
    file: new File([''], 'test.jpg', { type: 'image/jpeg' }),
    originalUrl: 'blob:mock-url',
    metadata: {
      width: 100,
      height: 100,
      size: 1000,
      type: 'image/jpeg',
      lastModified: Date.now()
    },
    status: 'pending'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Image のモックをリセット
    mockImage.onload = null;
    mockImage.onerror = null;
    mockImage.src = '';
  });

  describe('Rendering States', () => {
    it('should render placeholder when no preset is selected', () => {
      render(
        <PresetPreview
          selectedPreset={null}
          previewImage={mockPreviewImage}
        />
      );
      
      expect(screen.getByText('プリセットを選択すると、プレビューが表示されます')).toBeInTheDocument();
    });

    it('should render preset information when preset is selected', () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      expect(screen.getByText('📦')).toBeInTheDocument();
      expect(screen.getByText(/コントラストとシャープネス/)).toBeInTheDocument();
    });

    it('should render no image message when no preview image is provided', () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={null}
        />
      );
      
      expect(screen.getByText('画像をアップロードすると、プレビューが表示されます')).toBeInTheDocument();
    });

    it('should render before and after labels when preview image is provided', () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      expect(screen.getByText('処理前')).toBeInTheDocument();
      expect(screen.getByText('処理後')).toBeInTheDocument();
    });
  });

  describe('Preview Generation', () => {
    it('should show loading state during preview generation', () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      expect(screen.getByText('プレビュー生成中...')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: '処理前のプレビュー' })).toBeInTheDocument();
    });

    it('should generate preview when image loads successfully', async () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      // Image の onload を実行してプレビュー生成をシミュレート
      if (mockImage.onload) {
        mockImage.onload();
      }
      
      await waitFor(() => {
        expect(screen.getByRole('img', { name: '処理後のプレビュー' })).toBeInTheDocument();
      });
    });

    it('should show error message when preview generation fails', async () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      // Image の onerror を実行してエラーをシミュレート
      if (mockImage.onerror) {
        mockImage.onerror();
      }
      
      await waitFor(() => {
        expect(screen.getByText('プレビューを生成できませんでした')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Application', () => {
    it('should apply canvas filters when generating preview', async () => {
      const mockGetContext = jest.fn(() => ({
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({
          data: new Uint8ClampedArray(400),
          width: 10,
          height: 10
        })),
        putImageData: jest.fn(),
      }));
      
      HTMLCanvasElement.prototype.getContext = mockGetContext;
      
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      // Image の onload を実行
      if (mockImage.onload) {
        mockImage.onload();
      }
      
      await waitFor(() => {
        expect(mockGetContext).toHaveBeenCalledWith('2d');
      });
    });
  });

  describe('Different Presets', () => {
    it('should render bright-clear preset correctly', () => {
      const brightClearPreset = FILTER_PRESETS.find(p => p.id === 'bright-clear')!;
      
      render(
        <PresetPreview
          selectedPreset={brightClearPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      expect(screen.getByText('明るくクリアに')).toBeInTheDocument();
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText(/清潔感と透明感/)).toBeInTheDocument();
    });

    it('should render warm-cozy preset correctly', () => {
      const warmCozyPreset = FILTER_PRESETS.find(p => p.id === 'warm-cozy')!;
      
      render(
        <PresetPreview
          selectedPreset={warmCozyPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      expect(screen.getByText('暖かみのある雰囲気')).toBeInTheDocument();
      expect(screen.getByText('🌅')).toBeInTheDocument();
      expect(screen.getByText(/暖色系のトーン/)).toBeInTheDocument();
    });

    it('should render cool-urban preset correctly', () => {
      const coolUrbanPreset = FILTER_PRESETS.find(p => p.id === 'cool-urban')!;
      
      render(
        <PresetPreview
          selectedPreset={coolUrbanPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      expect(screen.getByText('クールで都会的')).toBeInTheDocument();
      expect(screen.getByText('🏙️')).toBeInTheDocument();
      expect(screen.getByText(/寒色系のクール/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      const icon = screen.getByText('📦');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have proper alt text for images', () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      expect(screen.getByRole('img', { name: '処理前のプレビュー' })).toBeInTheDocument();
    });
  });

  describe('Requirements Compliance', () => {
    // Requirement 2.1-2.5: プリセット効果のリアルタイムプレビュー
    it('should show real-time preview of preset effects (Requirements 2.1-2.5)', async () => {
      render(
        <PresetPreview
          selectedPreset={mockPreset}
          previewImage={mockPreviewImage}
        />
      );
      
      // プリセット情報が表示されることを確認
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      expect(screen.getByText(/コントラストとシャープネス/)).toBeInTheDocument();
      
      // Before/After比較が表示されることを確認
      expect(screen.getByText('処理前')).toBeInTheDocument();
      expect(screen.getByText('処理後')).toBeInTheDocument();
      
      // プレビュー生成中の表示を確認
      expect(screen.getByText('プレビュー生成中...')).toBeInTheDocument();
    });

    it('should display preset description and icon (Requirements 2.1-2.5)', () => {
      FILTER_PRESETS.forEach(preset => {
        const { rerender } = render(
          <PresetPreview
            selectedPreset={preset}
            previewImage={mockPreviewImage}
          />
        );
        
        expect(screen.getByText(preset.name)).toBeInTheDocument();
        expect(screen.getByText(preset.icon)).toBeInTheDocument();
        expect(screen.getByText(preset.description)).toBeInTheDocument();
        
        rerender(<div />); // クリーンアップ
      });
    });
  });
});