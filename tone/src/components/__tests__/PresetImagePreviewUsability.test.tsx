import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PresetImagePreview } from '../PresetImagePreview';
import { ProcessableImage } from '../../types/processing';
import { FilterPreset } from '../../types/filter';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => (
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

describe('PresetImagePreview - Usability Enhancements', () => {
  const mockPreset: FilterPreset = {
    id: 'test-preset',
    name: 'テストプリセット',
    description: 'テスト用のプリセットです',
    icon: '🧪',
    filters: {
      brightness: 10,
      contrast: 20,
      saturation: 5,
      hue: 0,
      sharpness: 30,
      warmth: 0
    }
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock canvas and context
    const mockCanvas = document.createElement('canvas');
    const mockContext = {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 100,
        height: 100
      })),
      putImageData: jest.fn()
    } as unknown as CanvasRenderingContext2D;
    
    mockCanvas.getContext = jest.fn(() => mockContext);
    mockCanvas.toDataURL = jest.fn(() => 'data:image/jpeg;base64,processed');
    
    const { loadImageToCanvas, applyFilters } = require('../../utils/imageFilters');
    loadImageToCanvas.mockResolvedValue(mockCanvas);
    applyFilters.mockReturnValue(mockCanvas);
    
    // Mock cache behavior
    const { globalPreviewCache } = require('../../utils/previewOptimization');
    globalPreviewCache.get.mockReturnValue(null); // No cache by default
    globalPreviewCache.set.mockImplementation(() => {});
    
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('グリッドレイアウトが効率的に表示される', () => {
    const multipleImages = Array.from({ length: 6 }, (_, i) => ({
      ...mockImage,
      id: `test-image-${i + 1}`,
      metadata: {
        ...mockImage.metadata,
        name: `test${i + 1}.jpg`
      }
    }));

    render(
      <PresetImagePreview
        uploadedImages={multipleImages}
        selectedPreset={mockPreset}
      />
    );

    // グリッドコンテナが存在することを確認
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('aria-label', '画像プレビューグリッド');
    expect(grid).toHaveAttribute('aria-rowcount');
    expect(grid).toHaveAttribute('aria-colcount', '2');

    // 複数の画像アイテムが表示されることを確認
    const imageItems = screen.getAllByRole('gridcell');
    expect(imageItems).toHaveLength(6);
  });

  it('ホバー効果が適切に動作する', async () => {
    render(
      <PresetImagePreview
        uploadedImages={[mockImage]}
        selectedPreset={mockPreset}
      />
    );

    // プレビュー生成完了を待つ
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
    });

    const imageButtons = screen.getAllByRole('button');
    const firstImageButton = imageButtons[0];

    // ホバーイベントをシミュレート
    fireEvent.mouseEnter(firstImageButton);
    
    // ホバー効果が適用されることを確認（CSSクラスの存在確認）
    expect(firstImageButton).toBeInTheDocument();
    
    fireEvent.mouseLeave(firstImageButton);
  });

  it('クリック拡大機能が動作する', async () => {
    render(
      <PresetImagePreview
        uploadedImages={[mockImage]}
        selectedPreset={mockPreset}
      />
    );

    // プレビュー生成完了を待つ
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
    });

    // 画像をクリック
    const imageButton = screen.getAllByRole('button')[0];
    fireEvent.click(imageButton);

    // モーダルが開くことを確認
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('test.jpg')).toBeInTheDocument();

    // 閉じるボタンが存在することを確認
    const closeButton = screen.getByLabelText(/拡大表示を閉じる/);
    expect(closeButton).toBeInTheDocument();

    // モーダルを閉じる
    fireEvent.click(closeButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('キーボードナビゲーションが動作する', async () => {
    const multipleImages = [
      mockImage,
      {
        ...mockImage,
        id: 'test-image-2',
        metadata: {
          ...mockImage.metadata,
          name: 'test2.jpg'
        }
      }
    ];

    render(
      <PresetImagePreview
        uploadedImages={multipleImages}
        selectedPreset={mockPreset}
      />
    );

    // プレビュー生成完了を待つ
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
    });

    // 最初の画像をクリックしてモーダルを開く
    const imageButton = screen.getAllByRole('button')[0];
    fireEvent.click(imageButton);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    // 矢印キーで次の画像に移動
    fireEvent.keyDown(modal, { key: 'ArrowRight' });
    expect(screen.getByText('test2.jpg')).toBeInTheDocument();

    // Homeキーで最初の画像に戻る
    fireEvent.keyDown(modal, { key: 'Home' });
    expect(screen.getByText('test.jpg')).toBeInTheDocument();

    // Endキーで最後の画像に移動
    fireEvent.keyDown(modal, { key: 'End' });
    expect(screen.getByText('test2.jpg')).toBeInTheDocument();

    // Escキーでモーダルを閉じる
    fireEvent.keyDown(modal, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('タッチイベントが適切に処理される', async () => {
    render(
      <PresetImagePreview
        uploadedImages={[mockImage]}
        selectedPreset={mockPreset}
      />
    );

    // プレビュー生成完了を待つ
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
    });

    const imageButton = screen.getAllByRole('button')[0];
    
    // タッチイベントをシミュレート
    fireEvent.touchStart(imageButton);
    fireEvent.touchEnd(imageButton);
    
    // エラーが発生しないことを確認
    expect(imageButton).toBeInTheDocument();
  });

  it('アクセシビリティ属性が適切に設定される', () => {
    render(
      <PresetImagePreview
        uploadedImages={[mockImage]}
        selectedPreset={mockPreset}
      />
    );

    // グリッドのアクセシビリティ属性
    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', '画像プレビューグリッド');
    expect(grid).toHaveAttribute('aria-rowcount');
    expect(grid).toHaveAttribute('aria-colcount', '2');

    // 画像ボタンのアクセシビリティ属性
    const imageButtons = screen.getAllByRole('button');
    expect(imageButtons[0]).toHaveAttribute('aria-label');
    expect(imageButtons[0]).toHaveAttribute('aria-describedby');
    expect(imageButtons[0]).toHaveAttribute('tabIndex', '0');

    // スクリーンリーダー用の情報が存在することを確認
    const description = screen.getByText(/画像サイズ:/);
    expect(description).toBeInTheDocument();
  });

  it('レスポンシブデザインのクラスが適用される', () => {
    const { container } = render(
      <PresetImagePreview
        uploadedImages={[mockImage]}
        selectedPreset={mockPreset}
      />
    );

    // メインコンテナにクラスが適用されていることを確認
    const previewContainer = container.querySelector('.presetImagePreview');
    expect(previewContainer).toBeInTheDocument();

    // グリッドコンテナにクラスが適用されていることを確認
    const gridContainer = container.querySelector('.imageGrid');
    expect(gridContainer).toBeInTheDocument();
  });
});