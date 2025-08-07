import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PresetImagePreview } from '../PresetImagePreview';
import { ProcessableImage } from '../../types/processing';
import { FilterPreset } from '../../types/filter';
import * as imageFilters from '../../utils/imageFilters';

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

const mockLoadImageToCanvas = imageFilters.loadImageToCanvas as jest.MockedFunction<typeof imageFilters.loadImageToCanvas>;
const mockApplyFilters = imageFilters.applyFilters as jest.MockedFunction<typeof imageFilters.applyFilters>;

// Import mocked optimization utilities
import * as previewOptimization from '../../utils/previewOptimization';
const mockGlobalPreviewCache = previewOptimization.globalPreviewCache as jest.Mocked<typeof previewOptimization.globalPreviewCache>;
const mockPreviewProcessingSemaphore = previewOptimization.previewProcessingSemaphore as jest.Mocked<typeof previewOptimization.previewProcessingSemaphore>;

describe('PresetImagePreview', () => {
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

  const mockImages: ProcessableImage[] = [mockImage];

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
    } as CanvasRenderingContext2D;
    
    mockCanvas.getContext = jest.fn(() => mockContext);
    mockCanvas.toDataURL = jest.fn(() => 'data:image/jpeg;base64,processed');
    
    mockLoadImageToCanvas.mockResolvedValue(mockCanvas);
    mockApplyFilters.mockReturnValue(mockCanvas);
    
    // Mock cache behavior
    mockGlobalPreviewCache.get.mockReturnValue(null); // No cache by default
    mockGlobalPreviewCache.set.mockImplementation(() => {});
    
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('プリセットが選択されていない場合、プレースホルダーを表示する', () => {
    render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={null}
      />
    );

    expect(screen.getByText('プリセットを選択すると、全ての画像のプレビューが表示されます')).toBeInTheDocument();
  });

  it('画像がアップロードされていない場合、プレースホルダーを表示する', () => {
    render(
      <PresetImagePreview
        uploadedImages={[]}
        selectedPreset={mockPreset}
      />
    );

    expect(screen.getByText('画像をアップロードしてください')).toBeInTheDocument();
  });

  it('プリセットと画像が選択されている場合、プレビューを表示する', async () => {
    render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={mockPreset}
      />
    );

    // ヘッダーの確認
    expect(screen.getByText('🧪')).toBeInTheDocument();
    expect(screen.getByText('テストプリセット - プレビュー')).toBeInTheDocument();
    expect(screen.getByText('1枚の画像に「テストプリセット」を適用した結果')).toBeInTheDocument();

    // 画像の確認
    expect(screen.getByAltText('test.jpg - 処理前')).toBeInTheDocument();
    
    // 処理中の表示を確認
    expect(screen.getByText('処理中...')).toBeInTheDocument();

    // プレビュー生成完了を待つ
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
    }, { timeout: 3000 });

    // フィルター適用が呼ばれたことを確認
    expect(mockLoadImageToCanvas).toHaveBeenCalledWith(mockImage.file);
    expect(mockApplyFilters).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), mockPreset.filters);
    expect(mockGlobalPreviewCache.set).toHaveBeenCalled();
  });

  it('複数の画像に対してプレビューを生成する', async () => {
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

    render(
      <PresetImagePreview
        uploadedImages={mockImages2}
        selectedPreset={mockPreset}
      />
    );

    expect(screen.getByText('2枚の画像に「テストプリセット」を適用した結果')).toBeInTheDocument();
    
    // 両方の画像の処理前が表示されることを確認
    expect(screen.getByAltText('test.jpg - 処理前')).toBeInTheDocument();
    expect(screen.getByAltText('test2.jpg - 処理前')).toBeInTheDocument();

    // プレビュー生成完了を待つ
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
      expect(screen.getByAltText('test2.jpg - テストプリセット適用後')).toBeInTheDocument();
    }, { timeout: 3000 });

    // 両方の画像に対してフィルター適用が呼ばれたことを確認
    expect(mockLoadImageToCanvas).toHaveBeenCalledTimes(2);
    expect(mockApplyFilters).toHaveBeenCalledTimes(2);
    expect(mockGlobalPreviewCache.set).toHaveBeenCalledTimes(2);
  });

  it('プレビュー生成エラー時にエラーメッセージを表示する', async () => {
    // エラーを発生させる
    mockLoadImageToCanvas.mockRejectedValue(new Error('Canvas loading failed'));

    render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={mockPreset}
      />
    );

    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('プレビュー生成に失敗しました')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('長いファイル名を適切に切り詰める', () => {
    const longNameImage: ProcessableImage = {
      ...mockImage,
      metadata: {
        ...mockImage.metadata,
        name: 'very-long-filename-that-should-be-truncated.jpg'
      }
    };

    render(
      <PresetImagePreview
        uploadedImages={[longNameImage]}
        selectedPreset={mockPreset}
      />
    );

    expect(screen.getByText('very-long-filename-t...')).toBeInTheDocument();
  });

  it('カスタムクラス名を適用する', () => {
    const { container } = render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={mockPreset}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('プリセット変更時にキャッシュが適切に動作する', async () => {
    const { rerender } = render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={mockPreset}
      />
    );

    // 最初のプレビュー生成完了を待つ
    await waitFor(() => {
      expect(mockLoadImageToCanvas).toHaveBeenCalledTimes(1);
    });

    const newPreset: FilterPreset = {
      ...mockPreset,
      id: 'new-preset',
      name: '新しいプリセット'
    };

    // プリセットを変更
    rerender(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={newPreset}
      />
    );

    // 新しいプリセットでプレビューが再生成されることを確認
    await waitFor(() => {
      expect(mockLoadImageToCanvas).toHaveBeenCalledTimes(2);
    });
  });

  it('キャッシュされたプレビューを使用する', async () => {
    // キャッシュにプレビューが存在する場合をモック
    mockGlobalPreviewCache.get.mockReturnValue('data:image/jpeg;base64,cached');

    render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={mockPreset}
      />
    );

    // キャッシュから取得されることを確認
    await waitFor(() => {
      expect(mockGlobalPreviewCache.get).toHaveBeenCalledWith(mockImage.id, mockPreset.id);
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
    });

    // 新しい処理は行われないことを確認
    expect(mockLoadImageToCanvas).not.toHaveBeenCalled();
  });

  it('アクセシビリティ属性が適切に設定される', () => {
    render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={mockPreset}
      />
    );

    // アイコンがaria-hiddenに設定されていることを確認
    const icon = screen.getByText('🧪');
    expect(icon).toHaveAttribute('aria-hidden', 'true');

    // グリッドのアクセシビリティ属性を確認
    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', '画像プレビューグリッド');
    expect(grid).toHaveAttribute('aria-rowcount');
    expect(grid).toHaveAttribute('aria-colcount', '2');

    // 画像ボタンのアクセシビリティ属性を確認
    const imageButtons = screen.getAllByRole('button');
    expect(imageButtons[0]).toHaveAttribute('aria-label');
    expect(imageButtons[0]).toHaveAttribute('aria-describedby');
  });

  it('ホバー効果とクリック拡大機能が動作する', async () => {
    render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={mockPreset}
      />
    );

    // プレビュー生成完了を待つ
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
    });

    // 画像ボタンをクリック
    const imageButton = screen.getAllByRole('button')[0];
    fireEvent.click(imageButton);

    // モーダルが開くことを確認
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
  });

  it('キーボードナビゲーションが動作する', async () => {
    render(
      <PresetImagePreview
        uploadedImages={[mockImage, { ...mockImage, id: 'test-image-2', metadata: { ...mockImage.metadata, name: 'test2.jpg' } }]}
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

    // Escキーでモーダルを閉じる
    fireEvent.keyDown(modal, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('モバイル用のタッチイベントが動作する', async () => {
    render(
      <PresetImagePreview
        uploadedImages={mockImages}
        selectedPreset={mockPreset}
      />
    );

    // プレビュー生成完了を待つ
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg - テストプリセット適用後')).toBeInTheDocument();
    });

    const imageWrapper = screen.getAllByRole('button')[0];
    
    // タッチイベントをシミュレート
    fireEvent.touchStart(imageWrapper);
    fireEvent.touchEnd(imageWrapper);
    
    // タッチイベントが処理されることを確認（エラーが発生しないことを確認）
    expect(imageWrapper).toBeInTheDocument();
  });
});