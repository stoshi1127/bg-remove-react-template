import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultViewer from '../ResultViewer';
import { ProcessableImage, ProcessedImage } from '../../types/processing';

// useDownloadフックのモック
jest.mock('../../hooks/useDownload', () => ({
  useDownload: () => ({
    isDownloading: false,
    downloadType: null,
    progress: null,
    error: null,
    downloadSingle: jest.fn(),
    downloadAll: jest.fn(),
    clearError: jest.fn()
  })
}));

// モックデータの作成
const createMockOriginalImage = (id: string, fileName: string): ProcessableImage => ({
  id,
  file: new File(['test'], fileName, { type: 'image/jpeg' }),
  originalUrl: `blob:original-${id}`,
  metadata: {
    width: 800,
    height: 600,
    fileSize: 100000,
    format: 'jpeg',
    lastModified: Date.now()
  },
  status: 'completed'
});

const createMockProcessedImage = (id: string, originalImage: ProcessableImage, preset: string): ProcessedImage => ({
  id,
  originalImage,
  processedUrl: `blob:processed-${id}`,
  processedBlob: new Blob(['processed'], { type: 'image/jpeg' }),
  appliedPreset: preset,
  processingTime: 1500,
  fileSize: 95000
});

describe('ResultViewer', () => {
  const mockOriginalImages: ProcessableImage[] = [
    createMockOriginalImage('1', 'test1.jpg'),
    createMockOriginalImage('2', 'test2.jpg'),
    createMockOriginalImage('3', 'test3.jpg')
  ];

  const mockProcessedImages: ProcessedImage[] = [
    createMockProcessedImage('1', mockOriginalImages[0], '商品をくっきりと'),
    createMockProcessedImage('2', mockOriginalImages[1], '明るくクリアに'),
    createMockProcessedImage('3', mockOriginalImages[2], '暖かみのある雰囲気')
  ];

  const mockOnDownloadSingle = jest.fn();
  const mockOnDownloadAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本的な表示機能', () => {
    test('処理済み画像が正しく表示される', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // タイトルの確認
      expect(screen.getByText('処理結果')).toBeInTheDocument();
      
      // 処理済み画像数の確認
      expect(screen.getByText('3枚の画像を処理しました')).toBeInTheDocument();
      
      // すべてダウンロードボタンの確認
      expect(screen.getByText('すべてダウンロード')).toBeInTheDocument();
    });

    test('Before/After比較表示が正しく動作する', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 処理前の画像の確認
      const beforeImages = screen.getAllByAltText(/処理前:/);
      expect(beforeImages).toHaveLength(3);
      
      // 処理後の画像の確認
      const afterImages = screen.getAllByAltText(/処理後:/);
      expect(afterImages).toHaveLength(3);

      // 画像のsrc属性の確認
      expect(beforeImages[0]).toHaveAttribute('src', 'blob:original-1');
      expect(afterImages[0]).toHaveAttribute('src', 'blob:processed-1');
    });

    test('画像情報が正しく表示される', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // ファイル名の確認
      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();
      expect(screen.getByText('test3.jpg')).toBeInTheDocument();

      // プリセット名の確認
      expect(screen.getByText('適用プリセット: 商品をくっきりと')).toBeInTheDocument();
      expect(screen.getByText('適用プリセット: 明るくクリアに')).toBeInTheDocument();
      expect(screen.getByText('適用プリセット: 暖かみのある雰囲気')).toBeInTheDocument();

      // メタデータの確認
      expect(screen.getAllByText(/処理時間: 1500ms/)).toHaveLength(3);
      expect(screen.getAllByText(/ファイルサイズ: 93KB/)).toHaveLength(3);
    });
  });

  describe('拡大プレビュー機能', () => {
    test('画像クリックで拡大プレビューが開く', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 処理後の画像をクリック
      const afterImage = screen.getAllByAltText(/処理後:/)[0];
      fireEvent.click(afterImage);

      // モーダルが開くことを確認
      await waitFor(() => {
        expect(screen.getByLabelText('閉じる')).toBeInTheDocument();
        expect(screen.getByAltText('処理後の画像')).toBeInTheDocument();
      });
    });

    test('拡大表示ボタンで拡大プレビューが開く', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示ボタンをクリック
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      // モーダルが開くことを確認
      await waitFor(() => {
        expect(screen.getByLabelText('閉じる')).toBeInTheDocument();
        expect(screen.getByAltText('処理後の画像')).toBeInTheDocument();
      });
    });

    test('拡大プレビューで処理前後の切り替えができる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByAltText('処理後の画像')).toBeInTheDocument();
      });

      // モーダル内の処理前ボタンをクリック（toggleButtonsクラス内のボタンを特定）
      const toggleButtons = document.querySelector('[class*="toggleButtons"]');
      const beforeButton = toggleButtons?.querySelector('button:nth-child(2)') as HTMLButtonElement;
      if (beforeButton) {
        fireEvent.click(beforeButton);
      }

      await waitFor(() => {
        expect(screen.getByAltText('処理前の画像')).toBeInTheDocument();
      });

      // モーダル内の処理後ボタンをクリック
      const afterButton = toggleButtons?.querySelector('button:nth-child(1)') as HTMLButtonElement;
      if (afterButton) {
        fireEvent.click(afterButton);
      }

      await waitFor(() => {
        expect(screen.getByAltText('処理後の画像')).toBeInTheDocument();
      });
    });

    test('切り替えボタンで処理前後の表示が変わる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('処理前を表示')).toBeInTheDocument();
      });

      // 切り替えボタンをクリック
      const toggleButton = screen.getByText('処理前を表示');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('処理後を表示')).toBeInTheDocument();
        expect(screen.getByAltText('処理前の画像')).toBeInTheDocument();
      });
    });

    test('閉じるボタンでモーダルが閉じる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('閉じる')).toBeInTheDocument();
      });

      // 閉じるボタンをクリック
      const closeButton = screen.getByLabelText('閉じる');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByLabelText('閉じる')).not.toBeInTheDocument();
      });
    });

    test('モーダル背景クリックでモーダルが閉じる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('閉じる')).toBeInTheDocument();
      });

      // モーダル背景をクリック（モーダルコンテンツ以外の部分）
      const modal = document.querySelector('[class*="modal"]');
      if (modal) {
        fireEvent.click(modal);
      }

      await waitFor(() => {
        expect(screen.queryByLabelText('閉じる')).not.toBeInTheDocument();
      });
    });
  });

  describe('ナビゲーション機能', () => {
    test('画像カウンターが正しく表示される', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      });
    });

    test('適用プリセット名が表示される', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        // モーダルヘッダー内のプリセット情報を確認
        const modalHeader = document.querySelector('[class*="modalHeader"]');
        expect(modalHeader).toContainHTML('適用プリセット: 商品をくっきりと');
      });
    });

    test('次の画像ボタンで画像が切り替わる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
        const modalHeader = document.querySelector('[class*="modalHeader"]');
        expect(modalHeader).toContainHTML('適用プリセット: 商品をくっきりと');
      });

      // 次の画像ボタンをクリック
      const nextButtons = screen.getAllByLabelText('次の画像');
      fireEvent.click(nextButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
        const modalHeader = document.querySelector('[class*="modalHeader"]');
        expect(modalHeader).toContainHTML('適用プリセット: 明るくクリアに');
      });
    });

    test('前の画像ボタンで画像が切り替わる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く（2番目の画像）
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
        const modalHeader = document.querySelector('[class*="modalHeader"]');
        expect(modalHeader).toContainHTML('適用プリセット: 明るくクリアに');
      });

      // 前の画像ボタンをクリック
      const prevButtons = screen.getAllByLabelText('前の画像');
      fireEvent.click(prevButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
        const modalHeader = document.querySelector('[class*="modalHeader"]');
        expect(modalHeader).toContainHTML('適用プリセット: 商品をくっきりと');
      });
    });

    test('最後の画像から次へ進むと最初の画像に戻る', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く（最後の画像）
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[2]);

      await waitFor(() => {
        expect(screen.getByText('3 / 3')).toBeInTheDocument();
        const modalHeader = document.querySelector('[class*="modalHeader"]');
        expect(modalHeader).toContainHTML('適用プリセット: 暖かみのある雰囲気');
      });

      // 次の画像ボタンをクリック
      const nextButtons = screen.getAllByLabelText('次の画像');
      fireEvent.click(nextButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
        const modalHeader = document.querySelector('[class*="modalHeader"]');
        expect(modalHeader).toContainHTML('適用プリセット: 商品をくっきりと');
      });
    });

    test('最初の画像から前へ戻ると最後の画像になる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く（最初の画像）
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      });

      // 前の画像ボタンをクリック
      const prevButtons = screen.getAllByLabelText('前の画像');
      fireEvent.click(prevButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('3 / 3')).toBeInTheDocument();
        const modalHeader = document.querySelector('[class*="modalHeader"]');
        expect(modalHeader).toContainHTML('適用プリセット: 暖かみのある雰囲気');
      });
    });

    test('キーボードショートカットヒントが表示される', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('← → : 画像切り替え')).toBeInTheDocument();
        expect(screen.getByText('Space : 処理前後切り替え')).toBeInTheDocument();
        expect(screen.getByText('Esc : 閉じる')).toBeInTheDocument();
      });
    });

    test('単一画像の場合はナビゲーションボタンが表示されない', async () => {
      render(
        <ResultViewer
          originalImages={[mockOriginalImages[0]]}
          processedImages={[mockProcessedImages[0]]}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('1 / 1')).toBeInTheDocument();
        expect(screen.queryByLabelText('次の画像')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('前の画像')).not.toBeInTheDocument();
      });
    });
  });

  describe('キーボードナビゲーション', () => {
    test('右矢印キーで次の画像に移動する', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      });

      // 右矢印キーを押す
      fireEvent.keyDown(document, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
      });
    });

    test('左矢印キーで前の画像に移動する', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く（2番目の画像）
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
      });

      // 左矢印キーを押す
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      });
    });

    test('Escapeキーでモーダルが閉じる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('閉じる')).toBeInTheDocument();
      });

      // Escapeキーを押す
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByLabelText('閉じる')).not.toBeInTheDocument();
      });
    });

    test('スペースキーで処理前後が切り替わる', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByAltText('処理後の画像')).toBeInTheDocument();
      });

      // スペースキーを押す
      fireEvent.keyDown(document, { key: ' ' });

      await waitFor(() => {
        expect(screen.getByAltText('処理前の画像')).toBeInTheDocument();
      });
    });

    test('モーダルが閉じているときはキーボードナビゲーションが無効', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // モーダルが閉じた状態でキーを押す
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      fireEvent.keyDown(document, { key: 'Escape' });

      // 何も起こらないことを確認（モーダルが開かない）
      expect(screen.queryByLabelText('閉じる')).not.toBeInTheDocument();
    });
  });

  describe('ダウンロード機能', () => {
    test('個別ダウンロードボタンが正しく動作する', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 個別ダウンロードボタンをクリック
      const downloadButtons = screen.getAllByText('ダウンロード');
      fireEvent.click(downloadButtons[0]);

      expect(mockOnDownloadSingle).toHaveBeenCalledWith('1');
    });

    test('一括ダウンロードボタンが正しく動作する', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 一括ダウンロードボタンをクリック
      const downloadAllButton = screen.getByText('すべてダウンロード');
      fireEvent.click(downloadAllButton);

      expect(mockOnDownloadAll).toHaveBeenCalled();
    });

    test('モーダル内のダウンロードボタンが正しく動作する', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText('閉じる')).toBeInTheDocument();
      });

      // モーダル内のダウンロードボタンをクリック
      const modalDownloadButtons = screen.getAllByText('ダウンロード');
      const modalDownloadButton = modalDownloadButtons.find(button => 
        button.closest('[class*="modalActions"]')
      );
      
      if (modalDownloadButton) {
        fireEvent.click(modalDownloadButton);
        expect(mockOnDownloadSingle).toHaveBeenCalledWith('1');
      }
    });
  });

  describe('エッジケース', () => {
    test('処理済み画像が空の場合、空の状態が表示される', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={[]}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      expect(screen.getByText('処理済みの画像がありません')).toBeInTheDocument();
      expect(screen.getByText('0枚の画像を処理しました')).toBeInTheDocument();
    });

    test('対応する元画像がない処理済み画像は表示されない', () => {
      const mismatchedProcessedImage = createMockProcessedImage(
        '999', 
        createMockOriginalImage('999', 'nonexistent.jpg'), 
        'テストプリセット'
      );

      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={[...mockProcessedImages, mismatchedProcessedImage]}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 元の3枚の画像のみ表示される
      expect(screen.getAllByText(/適用プリセット:/).length).toBe(3);
      expect(screen.queryByText('nonexistent.jpg')).not.toBeInTheDocument();
    });

    test('ダウンロードボタンは常に表示される（内蔵ダウンロード機能）', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
        />
      );

      // 内蔵ダウンロード機能により、ボタンは常に表示される
      expect(screen.getAllByText('ダウンロード')).toHaveLength(3);
      expect(screen.getByText('すべてダウンロード')).toBeInTheDocument();
    });

    test('外部コールバックが提供された場合も正常に動作する', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      expect(screen.getAllByText('ダウンロード')).toHaveLength(3);
      expect(screen.getByText('すべてダウンロード')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なalt属性が設定されている', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 処理前の画像のalt属性
      expect(screen.getByAltText('処理前: test1.jpg')).toBeInTheDocument();
      
      // 処理後の画像のalt属性
      expect(screen.getByAltText('処理後: test1.jpg')).toBeInTheDocument();
    });

    test('閉じるボタンに適切なaria-labelが設定されている', async () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      // 拡大表示を開く
      const previewButtons = screen.getAllByText('拡大表示');
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('閉じる');
        expect(closeButton).toBeInTheDocument();
        expect(closeButton).toHaveAttribute('aria-label', '閉じる');
      });
    });

    test('ボタンに適切なtype属性が設定されている', () => {
      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});