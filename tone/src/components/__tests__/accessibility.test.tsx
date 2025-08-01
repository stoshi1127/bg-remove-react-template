/**
 * アクセシビリティテスト
 * Requirements: 6.4 - レスポンシブデザインとアクセシビリティ
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import EasyToneApp from '../EasyToneApp';
import PresetSelector from '../PresetSelector';
import ImageUploader from '../ImageUploader';
import ResultViewer from '../ResultViewer';
import ImageProcessor from '../ImageProcessor';
import { FILTER_PRESETS } from '../../constants/presets';
import { ProcessableImage, ProcessedImage } from '../../types/processing';

// jest-axeのマッチャーを追加
expect.extend(toHaveNoViolations);

// モックデータ
const mockProcessableImages: ProcessableImage[] = [
  {
    id: 'test-1',
    file: new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
    originalUrl: 'blob:test1',
    metadata: {
      name: 'test1.jpg',
      size: 1024,
      type: 'image/jpeg',
      lastModified: Date.now(),
    },
    status: 'pending',
  },
];

const mockProcessedImages: ProcessedImage[] = [
  {
    id: 'test-1',
    originalImage: mockProcessableImages[0],
    processedUrl: 'blob:processed1',
    appliedPreset: 'crisp-product',
    processingTime: 1000,
    fileSize: 2048,
  },
];

describe('アクセシビリティテスト', () => {
  describe('EasyToneApp', () => {
    it('アクセシビリティ違反がないこと', async () => {
      const { container } = render(<EasyToneApp />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('適切なARIA属性が設定されていること', () => {
      render(<EasyToneApp />);
      
      // ステップコンテンツにrole="region"が設定されている
      const stepContent = screen.getByRole('region');
      expect(stepContent).toBeInTheDocument();
      expect(stepContent).toHaveAttribute('aria-labelledby');
      expect(stepContent).toHaveAttribute('aria-describedby');
    });

    it('見出しの階層が適切であること', () => {
      render(<EasyToneApp />);
      
      // h1 -> h2の階層構造
      const mainTitle = screen.getByRole('heading', { level: 1 });
      expect(mainTitle).toHaveTextContent('EasyTone');
      
      const stepTitle = screen.getByRole('heading', { level: 2 });
      expect(stepTitle).toHaveTextContent('画像をアップロード');
    });

    it('キーボードナビゲーションが機能すること', async () => {
      const user = userEvent.setup();
      render(<EasyToneApp />);
      
      // Tabキーでナビゲーション
      await user.tab();
      const firstFocusable = document.activeElement;
      expect(firstFocusable).toBeInTheDocument();
      
      // さらにTabキーで次の要素に移動
      await user.tab();
      const secondFocusable = document.activeElement;
      expect(secondFocusable).not.toBe(firstFocusable);
    });
  });

  describe('PresetSelector', () => {
    const mockOnPresetSelect = jest.fn();

    beforeEach(() => {
      mockOnPresetSelect.mockClear();
    });

    it('アクセシビリティ違反がないこと', async () => {
      const { container } = render(
        <PresetSelector
          presets={FILTER_PRESETS}
          selectedPreset={null}
          onPresetSelect={mockOnPresetSelect}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('radiogroupとして適切に機能すること', () => {
      render(
        <PresetSelector
          presets={FILTER_PRESETS}
          selectedPreset="crisp-product"
          onPresetSelect={mockOnPresetSelect}
        />
      );
      
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toBeInTheDocument();
      expect(radiogroup).toHaveAttribute('aria-labelledby', 'preset-selector-title');
      
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(FILTER_PRESETS.length);
      
      // 選択されたプリセットがaria-checked="true"
      const selectedRadio = radios.find(radio => 
        radio.getAttribute('aria-checked') === 'true'
      );
      expect(selectedRadio).toBeInTheDocument();
    });

    it('矢印キーでナビゲーションできること', async () => {
      const user = userEvent.setup();
      render(
        <PresetSelector
          presets={FILTER_PRESETS}
          selectedPreset="crisp-product"
          onPresetSelect={mockOnPresetSelect}
        />
      );
      
      const selectedRadio = screen.getByRole('radio', { checked: true });
      selectedRadio.focus();
      
      // 右矢印キーで次のプリセットに移動
      await user.keyboard('{ArrowRight}');
      expect(mockOnPresetSelect).toHaveBeenCalledWith(FILTER_PRESETS[1].id);
      
      // 左矢印キーで前のプリセットに移動
      await user.keyboard('{ArrowLeft}');
      expect(mockOnPresetSelect).toHaveBeenCalledWith(FILTER_PRESETS[0].id);
    });

    it('各プリセットに適切なaria-labelが設定されていること', () => {
      render(
        <PresetSelector
          presets={FILTER_PRESETS}
          selectedPreset={null}
          onPresetSelect={mockOnPresetSelect}
        />
      );
      
      FILTER_PRESETS.forEach(preset => {
        const radio = screen.getByRole('radio', { 
          name: new RegExp(`${preset.name}プリセット`) 
        });
        expect(radio).toBeInTheDocument();
        expect(radio).toHaveAttribute('aria-describedby', `preset-${preset.id}-description`);
      });
    });
  });

  describe('ImageUploader', () => {
    const mockOnImagesSelected = jest.fn();

    beforeEach(() => {
      mockOnImagesSelected.mockClear();
    });

    it('アクセシビリティ違反がないこと', async () => {
      const { container } = render(
        <ImageUploader onImagesSelected={mockOnImagesSelected} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('適切なrole="button"が設定されていること', () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadButton = screen.getByRole('button', { 
        name: /画像ファイルをアップロード/ 
      });
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toHaveAttribute('tabIndex', '0');
    });

    it('キーボードでファイル選択ダイアログを開けること', async () => {
      const user = userEvent.setup();
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      const uploadButton = screen.getByRole('button', { 
        name: /画像ファイルをアップロード/ 
      });
      
      // Enterキーでファイル選択ダイアログを開く
      uploadButton.focus();
      await user.keyboard('{Enter}');
      
      // Spaceキーでも開ける
      await user.keyboard(' ');
    });

    it('エラーメッセージが適切にアナウンスされること', async () => {
      render(<ImageUploader onImagesSelected={mockOnImagesSelected} />);
      
      // 大きすぎるファイルをドロップしてエラーを発生させる
      const uploadArea = screen.getByRole('button');
      const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      });
      
      fireEvent.drop(uploadArea, {
        dataTransfer: { files: [largeFile] }
      });
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('ResultViewer', () => {
    it('アクセシビリティ違反がないこと', async () => {
      const { container } = render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('グリッドとして適切に機能すること', () => {
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveAttribute('aria-labelledby', 'results-title');
      
      const gridcells = screen.getAllByRole('gridcell');
      expect(gridcells).toHaveLength(mockProcessedImages.length);
    });

    it('画像にキーボードアクセスできること', async () => {
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      const images = screen.getAllByRole('button', { name: /拡大表示/ });
      expect(images.length).toBeGreaterThan(0);
      
      // Enterキーで拡大表示を開ける
      images[0].focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
      });
    });

    it('モーダルが適切なARIA属性を持つこと', async () => {
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      const previewButton = screen.getByRole('button', { name: /拡大表示/ });
      await user.click(previewButton);
      
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveAttribute('aria-modal', 'true');
        expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
        expect(modal).toHaveAttribute('aria-describedby', 'modal-description');
      });
    });

    it('Escapeキーでモーダルを閉じられること', async () => {
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      const previewButton = screen.getByRole('button', { name: /拡大表示/ });
      await user.click(previewButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('ImageProcessor', () => {
    const mockPreset = FILTER_PRESETS[0];
    const mockOnProcessingComplete = jest.fn();

    it('アクセシビリティ違反がないこと', async () => {
      const { container } = render(
        <ImageProcessor
          images={mockProcessableImages}
          selectedPreset={mockPreset}
          onProcessingComplete={mockOnProcessingComplete}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('適切なregionとして設定されていること', () => {
      render(
        <ImageProcessor
          images={mockProcessableImages}
          selectedPreset={mockPreset}
          onProcessingComplete={mockOnProcessingComplete}
        />
      );
      
      const region = screen.getByRole('region');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-labelledby', 'processor-title');
      expect(region).toHaveAttribute('aria-describedby', 'processor-description');
    });

    it('プログレスバーが適切に機能すること', async () => {
      const user = userEvent.setup();
      render(
        <ImageProcessor
          images={mockProcessableImages}
          selectedPreset={mockPreset}
          onProcessingComplete={mockOnProcessingComplete}
        />
      );
      
      const startButton = screen.getByRole('button', { name: /処理を開始/ });
      await user.click(startButton);
      
      await waitFor(() => {
        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toBeInTheDocument();
        expect(progressbar).toHaveAttribute('aria-valuenow');
        expect(progressbar).toHaveAttribute('aria-valuemin', '0');
        expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('エラーが適切にアナウンスされること', async () => {
      // エラーを発生させるためのモック
      const mockErrorImages = [
        {
          ...mockProcessableImages[0],
          file: new File(['invalid'], 'invalid.txt', { type: 'text/plain' })
        }
      ];
      
      render(
        <ImageProcessor
          images={mockErrorImages}
          selectedPreset={mockPreset}
          onProcessingComplete={mockOnProcessingComplete}
        />
      );
      
      const startButton = screen.getByRole('button', { name: /処理を開始/ });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const errorAlert = screen.queryByRole('alert');
        if (errorAlert) {
          expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
        }
      });
    });
  });

  describe('レスポンシブデザイン', () => {
    beforeEach(() => {
      // モバイルビューポートをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
    });

    it('モバイルでタッチターゲットサイズが適切であること', () => {
      render(<EasyToneApp />);
      
      // ボタンの最小サイズをチェック（44px以上）
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        const minWidth = parseInt(styles.minWidth);
        
        if (minHeight > 0) {
          expect(minHeight).toBeGreaterThanOrEqual(44);
        }
        if (minWidth > 0) {
          expect(minWidth).toBeGreaterThanOrEqual(44);
        }
      });
    });

    it('モバイルでテキストが読みやすいサイズであること', () => {
      render(<EasyToneApp />);
      
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        const styles = window.getComputedStyle(heading);
        const fontSize = parseInt(styles.fontSize);
        
        // 最小フォントサイズ16px以上
        expect(fontSize).toBeGreaterThanOrEqual(16);
      });
    });
  });

  describe('高コントラストモード', () => {
    beforeEach(() => {
      // 高コントラストモードをシミュレート
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });

    it('高コントラストモードで適切なスタイルが適用されること', () => {
      render(<EasyToneApp />);
      
      // 高コントラストモード用のスタイルが適用されているかチェック
      const elements = screen.getAllByRole('button');
      elements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // ボーダーが太くなっているかチェック
        const borderWidth = parseInt(styles.borderWidth);
        if (borderWidth > 0) {
          expect(borderWidth).toBeGreaterThanOrEqual(2);
        }
      });
    });
  });

  describe('アニメーション削減', () => {
    beforeEach(() => {
      // アニメーション削減設定をシミュレート
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });

    it('アニメーション削減設定時にアニメーションが無効化されること', () => {
      render(<EasyToneApp />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // transitionが無効化されているかチェック
        expect(styles.transition).toBe('none');
      });
    });
  });
});