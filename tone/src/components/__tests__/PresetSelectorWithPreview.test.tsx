import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PresetSelectorWithPreview } from '../PresetSelectorWithPreview';
import { FILTER_PRESETS } from '../../constants/presets';
import { ProcessableImage } from '../../types/image';

// Canvas API のモック
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(400),
      width: 10,
      height: 10
    })),
    putImageData: jest.fn(),
  })),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mock-data-url'),
  width: 0,
  height: 0
};

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

describe('PresetSelectorWithPreview', () => {
  const mockOnPresetSelect = jest.fn();
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

  const defaultProps = {
    presets: FILTER_PRESETS,
    selectedPreset: null,
    onPresetSelect: mockOnPresetSelect,
    previewImage: mockPreviewImage,
  };

  beforeEach(() => {
    mockOnPresetSelect.mockClear();
    mockImage.onload = null;
    mockImage.onerror = null;
    mockImage.src = '';
  });

  describe('Component Integration', () => {
    it('should render both PresetSelector and PresetPreview components', () => {
      render(<PresetSelectorWithPreview {...defaultProps} />);
      
      // PresetSelector の要素を確認
      expect(screen.getByText('フィルタープリセットを選択')).toBeInTheDocument();
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      
      // PresetPreview の要素を確認
      expect(screen.getByText('プリセットを選択すると、プレビューが表示されます')).toBeInTheDocument();
    });

    it('should pass props correctly to child components', () => {
      render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          disabled={true}
        />
      );
      
      // PresetSelector が disabled になっていることを確認
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Preset Selection Integration', () => {
    it('should update preview when preset is selected', () => {
      render(<PresetSelectorWithPreview {...defaultProps} />);
      
      // プリセットを選択
      const crispProductButton = screen.getByText('商品をくっきりと').closest('button');
      fireEvent.click(crispProductButton!);
      
      expect(mockOnPresetSelect).toHaveBeenCalledWith('crisp-product');
    });

    it('should show selected preset in preview', () => {
      render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          selectedPreset="bright-clear"
        />
      );
      
      // プレビューエリアに選択されたプリセットの情報が表示されることを確認
      expect(screen.getAllByText('明るくクリアに')).toHaveLength(2); // セレクターとプレビューの両方
      expect(screen.getAllByText('✨')).toHaveLength(2);
      expect(screen.getAllByText(/清潔感と透明感/)).toHaveLength(2);
    });
  });

  describe('Preview Image Integration', () => {
    it('should show preview comparison when image is provided', () => {
      render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          selectedPreset="crisp-product"
        />
      );
      
      expect(screen.getByText('処理前')).toBeInTheDocument();
      expect(screen.getByText('処理後')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: '処理前のプレビュー' })).toBeInTheDocument();
    });

    it('should show no image message when preview image is not provided', () => {
      render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          previewImage={null}
          selectedPreset="crisp-product"
        />
      );
      
      expect(screen.getByText('画像をアップロードすると、プレビューが表示されます')).toBeInTheDocument();
    });
  });

  describe('State Synchronization', () => {
    it('should maintain selection state between selector and preview', () => {
      const { rerender } = render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          selectedPreset="warm-cozy"
        />
      );
      
      // セレクターで選択状態を確認
      const warmCozyButtons = screen.getAllByText('暖かみのある雰囲気');
      const warmCozyButton = warmCozyButtons[0].closest('button');
      expect(warmCozyButton).toHaveAttribute('aria-pressed', 'true');
      
      // プレビューで選択されたプリセット情報を確認
      expect(warmCozyButtons).toHaveLength(2); // セレクターとプレビューの両方
      expect(screen.getAllByText('🌅')).toHaveLength(2);
      
      // 別のプリセットに変更
      rerender(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          selectedPreset="cool-urban"
        />
      );
      
      // 新しい選択状態を確認
      const coolUrbanButtons = screen.getAllByText('クールで都会的');
      const coolUrbanButton = coolUrbanButtons[0].closest('button');
      expect(coolUrbanButton).toHaveAttribute('aria-pressed', 'true');
      expect(coolUrbanButtons).toHaveLength(2); // セレクターとプレビューの両方
      expect(screen.getAllByText('🏙️')).toHaveLength(2);
    });
  });

  describe('Layout and Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          className="custom-class"
        />
      );
      
      const mainElement = container.firstChild as HTMLElement;
      expect(mainElement).toHaveClass('custom-class');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid preset ID gracefully', () => {
      render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          selectedPreset="invalid-preset-id"
        />
      );
      
      // プレビューエリアに選択なしの状態が表示されることを確認
      expect(screen.getByText('プリセットを選択すると、プレビューが表示されます')).toBeInTheDocument();
    });

    it('should handle empty presets array', () => {
      render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          presets={[]}
        />
      );
      
      // エラーが発生せずにレンダリングされることを確認
      expect(screen.getByText('フィルタープリセットを選択')).toBeInTheDocument();
    });
  });

  describe('Requirements Compliance', () => {
    // Requirements 2.1-2.5: リアルタイムプレビュー機能
    it('should provide real-time preview functionality (Requirements 2.1-2.5)', () => {
      render(
        <PresetSelectorWithPreview 
          {...defaultProps} 
          selectedPreset="crisp-product"
        />
      );
      
      // プリセット選択UI
      expect(screen.getByText('フィルタープリセットを選択')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(4);
      
      // リアルタイムプレビュー
      expect(screen.getAllByText('商品をくっきりと')).toHaveLength(2); // セレクターとプレビューの両方
      expect(screen.getByText('処理前')).toBeInTheDocument();
      expect(screen.getByText('処理後')).toBeInTheDocument();
      
      // プリセット説明とアイコン
      expect(screen.getAllByText('📦')).toHaveLength(2);
      expect(screen.getAllByText(/コントラストとシャープネス/)).toHaveLength(2);
    });

    it('should display all preset options with descriptions and icons (Requirements 2.1-2.5)', () => {
      render(<PresetSelectorWithPreview {...defaultProps} />);
      
      // 4つのプリセットが表示されることを確認（セレクターのみ）
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      expect(screen.getByText('明るくクリアに')).toBeInTheDocument();
      expect(screen.getByText('暖かみのある雰囲気')).toBeInTheDocument();
      expect(screen.getByText('クールで都会的')).toBeInTheDocument();
      
      // アイコンが表示されることを確認（セレクターのみ）
      expect(screen.getByText('📦')).toBeInTheDocument();
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText('🌅')).toBeInTheDocument();
      expect(screen.getByText('🏙️')).toBeInTheDocument();
    });
  });
});