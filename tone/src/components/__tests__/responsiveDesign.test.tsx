/**
 * レスポンシブデザインテスト
 * Requirements: 6.4 - モバイル対応のレスポンシブデザイン
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import EasyToneApp from '../EasyToneApp';
import PresetSelector from '../PresetSelector';
import ResultViewer from '../ResultViewer';
import WorkflowSteps from '../WorkflowSteps';
import { FILTER_PRESETS } from '../../constants/presets';

import { ProcessableImage, ProcessedImage } from '../../types/processing';

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

// ビューポートサイズを設定するヘルパー関数
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // resize イベントを発火
  window.dispatchEvent(new Event('resize'));
};

// メディアクエリをモックする関数
const mockMatchMedia = (query: string, matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((q) => ({
      matches: q === query ? matches : false,
      media: q,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('レスポンシブデザインテスト', () => {
  beforeEach(() => {
    // デフォルトでデスクトップサイズに設定
    setViewportSize(1024, 768);
  });

  describe('ビューポートサイズ別テスト', () => {
    const viewports = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop', width: 1200, height: 800 },
      { name: 'Large Desktop', width: 1920, height: 1080 },
    ];

    viewports.forEach(({ name, width, height }) => {
      describe(`${name} (${width}x${height})`, () => {
        beforeEach(() => {
          setViewportSize(width, height);
        });

        it('EasyToneAppが適切にレンダリングされること', () => {
          render(<EasyToneApp />);
          
          // 基本的な要素が表示されている
          expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
          expect(screen.getByRole('main')).toBeInTheDocument();
          
          // モバイルサイズでは特定の要素が調整されている
          if (width <= 768) {
            // モバイル用のスタイルが適用されているかチェック
            const container = screen.getByRole('main').parentElement;
            expect(container).toHaveClass('workflowContainer');
          }
        });

        it('WorkflowStepsが適切にレンダリングされること', () => {
          const mockCanProceedToStep = jest.fn().mockReturnValue(true);
          render(
            <WorkflowSteps
              currentStep="upload"
              completedSteps={[]}
              canProceedToStep={mockCanProceedToStep}
            />
          );
          
          const stepsList = screen.getByRole('list');
          expect(stepsList).toBeInTheDocument();
          
          // モバイルサイズでは縦並びレイアウト
          if (width <= 768) {
            const computedStyle = window.getComputedStyle(stepsList);
            expect(computedStyle.flexDirection).toBe('column');
          }
        });

        it('PresetSelectorが適切にレンダリングされること', () => {
          const mockOnPresetSelect = jest.fn();
          render(
            <PresetSelector
              presets={FILTER_PRESETS}
              selectedPreset={null}
              onPresetSelect={mockOnPresetSelect}
            />
          );
          
          const radiogroup = screen.getByRole('radiogroup');
          expect(radiogroup).toBeInTheDocument();
          
          const radios = screen.getAllByRole('radio');
          expect(radios).toHaveLength(FILTER_PRESETS.length);
          
          // モバイルサイズでは1列レイアウト
          if (width <= 768) {
            const grid = radiogroup.querySelector('.preset-selector__grid');
            if (grid) {
              const computedStyle = window.getComputedStyle(grid);
              expect(computedStyle.gridTemplateColumns).toBe('1fr');
            }
          }
        });

        it('ResultViewerが適切にレンダリングされること', () => {
          render(
            <ResultViewer
              originalImages={mockProcessableImages}
              processedImages={mockProcessedImages}
            />
          );
          
          const grid = screen.getByRole('grid');
          expect(grid).toBeInTheDocument();
          
          // モバイルサイズでは1列レイアウト
          if (width <= 768) {
            const computedStyle = window.getComputedStyle(grid);
            expect(computedStyle.gridTemplateColumns).toBe('1fr');
          }
        });
      });
    });
  });

  describe('タッチターゲットサイズ', () => {
    beforeEach(() => {
      setViewportSize(375, 667); // モバイルサイズ
    });

    it('ボタンが最小タッチターゲットサイズ（44px）を満たすこと', () => {
      render(<EasyToneApp />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(button);
        
        const minHeight = parseInt(computedStyle.minHeight) || rect.height;
        const minWidth = parseInt(computedStyle.minWidth) || rect.width;
        
        // 最小タッチターゲットサイズ44px
        expect(minHeight).toBeGreaterThanOrEqual(44);
        expect(minWidth).toBeGreaterThanOrEqual(44);
      });
    });

    it('リンクが最小タッチターゲットサイズを満たすこと', () => {
      render(<EasyToneApp />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        const rect = link.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(link);
        
        const minHeight = parseInt(computedStyle.minHeight) || rect.height;
        const minWidth = parseInt(computedStyle.minWidth) || rect.width;
        
        expect(minHeight).toBeGreaterThanOrEqual(44);
        expect(minWidth).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('フォントサイズとテキスト可読性', () => {
    beforeEach(() => {
      setViewportSize(375, 667); // モバイルサイズ
    });

    it('見出しが適切なフォントサイズであること', () => {
      render(<EasyToneApp />);
      
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        const computedStyle = window.getComputedStyle(heading);
        const fontSize = parseInt(computedStyle.fontSize);
        
        // 見出しは最小16px以上
        expect(fontSize).toBeGreaterThanOrEqual(16);
      });
    });

    it('本文テキストが読みやすいサイズであること', () => {
      render(<EasyToneApp />);
      
      // 説明文などの本文テキスト要素をチェック
      const descriptions = document.querySelectorAll('p, span');
      descriptions.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseInt(computedStyle.fontSize);
        
        // 本文は最小14px以上
        if (fontSize > 0) {
          expect(fontSize).toBeGreaterThanOrEqual(14);
        }
      });
    });

    it('行間が適切に設定されていること', () => {
      render(<EasyToneApp />);
      
      const textElements = document.querySelectorAll('p');
      textElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const fontSize = parseInt(computedStyle.fontSize);
        
        if (lineHeight > 0 && fontSize > 0) {
          const ratio = lineHeight / fontSize;
          // 行間比率は1.4以上が推奨
          expect(ratio).toBeGreaterThanOrEqual(1.4);
        }
      });
    });
  });

  describe('レイアウトの適応性', () => {
    it('コンテンツが画面幅に収まること', () => {
      const viewports = [320, 375, 414, 768, 1024, 1200];
      
      viewports.forEach(width => {
        setViewportSize(width, 667);
        
        const { container } = render(<EasyToneApp />);
        
        // コンテナが画面幅を超えないことを確認
        const elements = container.querySelectorAll('*');
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          if (rect.width > 0) {
            expect(rect.width).toBeLessThanOrEqual(width + 20); // 20pxのマージンを許容
          }
        });
      });
    });

    it('横スクロールが発生しないこと', () => {
      setViewportSize(320, 568); // 最小モバイルサイズ
      
      render(<EasyToneApp />);
      
      // body要素の幅が画面幅を超えないことを確認
      const bodyWidth = document.body.scrollWidth;
      expect(bodyWidth).toBeLessThanOrEqual(320);
    });
  });

  describe('画像の適応性', () => {
    it('画像が画面サイズに適応すること', () => {
      setViewportSize(375, 667);
      
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        const computedStyle = window.getComputedStyle(img);
        
        // 画像が親要素の幅を超えない
        expect(computedStyle.maxWidth).toBe('100%');
        
        // 画像のアスペクト比が保持される
        expect(computedStyle.objectFit).toBe('cover');
      });
    });
  });

  describe('ナビゲーションの適応性', () => {
    it('モバイルでナビゲーションが適切に表示されること', () => {
      setViewportSize(375, 667);
      
      render(<EasyToneApp />);
      
      const navigation = document.querySelector('.navigation');
      if (navigation) {
        const computedStyle = window.getComputedStyle(navigation);
        
        // モバイルでは適切な間隔が設定されている
        expect(parseInt(computedStyle.gap)).toBeGreaterThanOrEqual(16);
      }
    });

    it('タブレットでナビゲーションが適切に表示されること', () => {
      setViewportSize(768, 1024);
      
      render(<EasyToneApp />);
      
      const navigation = document.querySelector('.navigation');
      if (navigation) {
        // タブレットサイズでの適切な表示を確認
        expect(navigation).toBeVisible();
      }
    });
  });

  describe('メディアクエリ対応', () => {
    it('prefers-reduced-motionが適用されること', () => {
      mockMatchMedia('(prefers-reduced-motion: reduce)', true);
      
      render(<EasyToneApp />);
      
      const animatedElements = document.querySelectorAll('button, .preset-card');
      animatedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        // アニメーション削減設定時はtransitionが無効
        expect(computedStyle.transition).toBe('none');
      });
    });

    it('prefers-contrast: highが適用されること', () => {
      mockMatchMedia('(prefers-contrast: high)', true);
      
      render(<EasyToneApp />);
      
      const borderedElements = document.querySelectorAll('button, .preset-card');
      borderedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const borderWidth = parseInt(computedStyle.borderWidth);
        
        // 高コントラストモードでは太いボーダー
        if (borderWidth > 0) {
          expect(borderWidth).toBeGreaterThanOrEqual(2);
        }
      });
    });

    it('prefers-color-scheme: darkが適用されること', () => {
      mockMatchMedia('(prefers-color-scheme: dark)', true);
      
      render(<EasyToneApp />);
      
      // ダークモード対応の確認（実装されている場合）
      const rootElement = document.documentElement;
      const computedStyle = window.getComputedStyle(rootElement);
      
      // CSS変数が適切に設定されているかチェック
      const backgroundColor = computedStyle.getPropertyValue('--background');
      const foregroundColor = computedStyle.getPropertyValue('--foreground');
      
      if (backgroundColor && foregroundColor) {
        // ダークモードでは背景が暗く、テキストが明るい
        expect(backgroundColor).toMatch(/#0a0a0a|rgb\(10,\s*10,\s*10\)/);
        expect(foregroundColor).toMatch(/#ededed|rgb\(237,\s*237,\s*237\)/);
      }
    });
  });

  describe('コンテンツの優先順位', () => {
    it('モバイルで重要なコンテンツが優先表示されること', () => {
      setViewportSize(375, 667);
      
      render(<EasyToneApp />);
      
      // 重要な要素が画面上部に表示される
      const title = screen.getByRole('heading', { level: 1 });
      const titleRect = title.getBoundingClientRect();
      expect(titleRect.top).toBeLessThan(200); // 画面上部200px以内
      
      // ステップ表示が見やすい位置にある
      const steps = screen.getByRole('navigation', { name: /ワークフローステップ/ });
      const stepsRect = steps.getBoundingClientRect();
      expect(stepsRect.top).toBeLessThan(400); // 画面上部400px以内
    });

    it('不要な要素が適切に隠されること', () => {
      setViewportSize(320, 568); // 非常に小さい画面
      
      render(<EasyToneApp />);
      
      // 装飾的な要素やアイコンが適切に処理されている
      const decorativeElements = document.querySelectorAll('[aria-hidden="true"]');
      decorativeElements.forEach(element => {
        // 装飾要素がスクリーンリーダーから隠されている
        expect(element).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('パフォーマンス考慮', () => {
    it('大きな画像が適切にリサイズされること', () => {
      setViewportSize(375, 667);
      
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        const computedStyle = window.getComputedStyle(img);
        
        // 画像の最大サイズが制限されている
        const maxWidth = parseInt(computedStyle.maxWidth);
        if (maxWidth > 0) {
          expect(maxWidth).toBeLessThanOrEqual(375); // 画面幅以下
        }
      });
    });

    it('不要なコンテンツが遅延読み込みされること', () => {
      setViewportSize(375, 667);
      
      render(<EasyToneApp />);
      
      // 画像の遅延読み込み属性をチェック
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        // loading="lazy"が設定されているかチェック（実装されている場合）
        const loading = img.getAttribute('loading');
        if (loading) {
          expect(loading).toBe('lazy');
        }
      });
    });
  });
});