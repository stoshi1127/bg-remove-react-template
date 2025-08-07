import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PresetSelector } from '../PresetSelector';
import { FILTER_PRESETS } from '../../constants/presets';
import { ProcessableImage } from '../../types/processing';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={props.src} alt={props.alt} />
  )
}));

// Mock image optimization utilities
jest.mock('../../utils/imageOptimization', () => ({
  DEFAULT_BLUR_DATA_URL: 'data:image/jpeg;base64,test',
  getResponsiveImageSizes: jest.fn(() => '150px')
}));

// Mock image filters
jest.mock('../../utils/imageFilters', () => ({
  loadImageToCanvas: jest.fn(),
  applyFilters: jest.fn()
}));

// Mock preview optimization utilities
jest.mock('../../utils/previewOptimization', () => ({
  globalPreviewCache: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn()
  },
  previewProcessingSemaphore: {
    acquire: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  },
  calculatePreviewSize: jest.fn(() => ({ width: 200, height: 200 })),
  estimateDataUrlSize: jest.fn(() => 1024),
  PREVIEW_CONFIG: {
    MAX_PREVIEW_SIZE: 200,
    JPEG_QUALITY: 0.8,
    MAX_CONCURRENT_PROCESSING: 4,
    MAX_CACHE_SIZE: 50
  },
  startMemoryMonitoring: jest.fn(() => jest.fn())
}));

describe('PresetImagePreview Integration', () => {
  const mockImage: ProcessableImage = {
    id: 'test-image-1',
    file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    originalUrl: 'blob:test-url-1',
    metadata: {
      name: 'test.jpg',
      size: 1024,
      type: 'image/jpeg',
      lastModified: Date.now(),
      width: 800,
      height: 600
    },
    status: 'pending'
  };

  const mockImages: ProcessableImage[] = [mockImage];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('プリセット選択時にリアルタイムプレビューが表示される', async () => {
    const mockOnPresetSelect = jest.fn();

    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset={null}
        uploadedImages={mockImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // 最初はプレビューが表示されていないことを確認
    expect(screen.queryByText('プリセットを選択すると、全ての画像のプレビューが表示されます')).toBeInTheDocument();

    // プリセットを選択
    const crispProductButton = screen.getByRole('radio', { name: '商品をくっきりとプリセット' });
    await userEvent.click(crispProductButton);

    expect(mockOnPresetSelect).toHaveBeenCalledWith('crisp-product');
  });

  it('画像がアップロードされている場合、プリセット選択画面に画像プレビューが表示される', () => {
    const mockOnPresetSelect = jest.fn();

    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset="crisp-product"
        uploadedImages={mockImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // リアルタイムプレビューセクションが表示されることを確認
    expect(screen.getByText('商品をくっきりと - プレビュー')).toBeInTheDocument();
    expect(screen.getByText('1枚の画像に「商品をくっきりと」を適用した結果')).toBeInTheDocument();
  });

  it('複数の画像がアップロードされている場合、すべての画像のプレビューが表示される', () => {
    const mockImages2: ProcessableImage[] = [
      mockImage,
      {
        ...mockImage,
        id: 'test-image-2',
        file: new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
        originalUrl: 'blob:test-url-2',
        metadata: {
          ...mockImage.metadata,
          name: 'test2.jpg'
        }
      }
    ];

    const mockOnPresetSelect = jest.fn();

    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset="bright-clear"
        uploadedImages={mockImages2}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // 複数画像のプレビューが表示されることを確認
    expect(screen.getByText('明るくクリアに - プレビュー')).toBeInTheDocument();
    expect(screen.getByText('2枚の画像に「明るくクリアに」を適用した結果')).toBeInTheDocument();
  });

  it('プリセット選択時にキーボードナビゲーションが正しく動作する', async () => {
    const mockOnPresetSelect = jest.fn();

    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset="crisp-product"
        uploadedImages={mockImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    const crispProductButton = screen.getByRole('radio', { name: '商品をくっきりとプリセット' });
    crispProductButton.focus();

    // 右矢印キーで次のプリセットに移動
    await userEvent.keyboard('{ArrowRight}');
    expect(mockOnPresetSelect).toHaveBeenCalledWith('bright-clear');

    // 左矢印キーで前のプリセットに移動
    await userEvent.keyboard('{ArrowLeft}');
    expect(mockOnPresetSelect).toHaveBeenCalledWith('crisp-product');
  });

  it('アクセシビリティ属性が適切に設定される', () => {
    const mockOnPresetSelect = jest.fn();

    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset="warm-cozy"
        uploadedImages={mockImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // radiogroup の role が設定されていることを確認
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toBeInTheDocument();
    expect(radioGroup).toHaveAttribute('aria-labelledby', 'preset-selector-title');
    expect(radioGroup).toHaveAttribute('aria-describedby', 'preset-selector-description');

    // 各プリセットボタンが radio role を持つことを確認
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(FILTER_PRESETS.length);

    // 選択されたプリセットが aria-checked="true" を持つことを確認
    const selectedButton = screen.getByRole('radio', { name: '暖かみのある雰囲気プリセット' });
    expect(selectedButton).toHaveAttribute('aria-checked', 'true');
  });
});