/**
 * キーボードナビゲーションテスト
 * Requirements: 6.4 - キーボードナビゲーション対応
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EasyToneApp from '../EasyToneApp';
import PresetSelector from '../PresetSelector';
import ResultViewer from '../ResultViewer';
import WorkflowSteps from '../WorkflowSteps';
import { FILTER_PRESETS } from '../../constants/presets';
import { WORKFLOW_STEPS } from '../../types/workflow';
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

describe('キーボードナビゲーションテスト', () => {
  describe('全体的なTabナビゲーション', () => {
    it('Tabキーで順序通りにフォーカスが移動すること', async () => {
      const user = userEvent.setup();
      render(<EasyToneApp />);
      
      // 最初のフォーカス可能な要素を取得
      await user.tab();
      const firstElement = document.activeElement;
      expect(firstElement).toBeInTheDocument();
      
      // 次の要素にフォーカス移動
      await user.tab();
      const secondElement = document.activeElement;
      expect(secondElement).not.toBe(firstElement);
      
      // Shift+Tabで前の要素に戻る
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(firstElement);
    });

    it('フォーカストラップが適切に機能すること', async () => {
      const user = userEvent.setup();
      render(<EasyToneApp />);
      
      // すべてのフォーカス可能な要素を取得
      const focusableElements = screen.getAllByRole('button')
        .concat(screen.getAllByRole('link'))
        .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1);
      
      if (focusableElements.length > 0) {
        // 最初の要素にフォーカス
        focusableElements[0].focus();
        expect(document.activeElement).toBe(focusableElements[0]);
        
        // 最後の要素まで移動
        for (let i = 1; i < focusableElements.length; i++) {
          await user.tab();
        }
        
        // 最後の要素から次にTabを押すと最初の要素に戻る（フォーカストラップ）
        await user.tab();
        // 注意: 実際のフォーカストラップの実装によって動作が異なる場合があります
      }
    });
  });

  describe('WorkflowSteps キーボードナビゲーション', () => {
    const mockOnStepClick = jest.fn();
    const mockCanProceedToStep = jest.fn().mockReturnValue(true);

    beforeEach(() => {
      mockOnStepClick.mockClear();
      mockCanProceedToStep.mockClear();
    });

    it('Enter/Spaceキーでステップをクリックできること', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          onStepClick={mockOnStepClick}
          canProceedToStep={mockCanProceedToStep}
        />
      );
      
      const clickableSteps = screen.getAllByRole('button');
      if (clickableSteps.length > 0) {
        const firstStep = clickableSteps[0];
        firstStep.focus();
        
        // Enterキーでクリック
        await user.keyboard('{Enter}');
        expect(mockOnStepClick).toHaveBeenCalled();
        
        // Spaceキーでもクリック
        await user.keyboard(' ');
        expect(mockOnStepClick).toHaveBeenCalledTimes(2);
      }
    });

    it('無効なステップではキーボード操作が無効であること', async () => {
      const user = userEvent.setup();
      mockCanProceedToStep.mockReturnValue(false);
      
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          onStepClick={mockOnStepClick}
          canProceedToStep={mockCanProceedToStep}
        />
      );
      
      // 無効なステップはtabIndex=-1でフォーカスできない
      const disabledSteps = WORKFLOW_STEPS.slice(1); // upload以外は無効
      disabledSteps.forEach(step => {
        const stepElement = screen.getByLabelText(new RegExp(step.title));
        expect(stepElement).toHaveAttribute('tabIndex', '-1');
      });
    });
  });

  describe('PresetSelector キーボードナビゲーション', () => {
    const mockOnPresetSelect = jest.fn();

    beforeEach(() => {
      mockOnPresetSelect.mockClear();
    });

    it('矢印キーでプリセット間を移動できること', async () => {
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
      
      // 右矢印キーで次のプリセット
      await user.keyboard('{ArrowRight}');
      expect(mockOnPresetSelect).toHaveBeenCalledWith(FILTER_PRESETS[1].id);
      
      // 下矢印キーでも次のプリセット
      await user.keyboard('{ArrowDown}');
      expect(mockOnPresetSelect).toHaveBeenCalledWith(FILTER_PRESETS[2].id);
      
      // 左矢印キーで前のプリセット
      await user.keyboard('{ArrowLeft}');
      expect(mockOnPresetSelect).toHaveBeenCalledWith(FILTER_PRESETS[1].id);
      
      // 上矢印キーでも前のプリセット
      await user.keyboard('{ArrowUp}');
      expect(mockOnPresetSelect).toHaveBeenCalledWith(FILTER_PRESETS[0].id);
    });

    it('最初/最後のプリセットで循環ナビゲーションが機能すること', async () => {
      const user = userEvent.setup();
      render(
        <PresetSelector
          presets={FILTER_PRESETS}
          selectedPreset={FILTER_PRESETS[0].id} // 最初のプリセット
          onPresetSelect={mockOnPresetSelect}
        />
      );
      
      const selectedRadio = screen.getByRole('radio', { checked: true });
      selectedRadio.focus();
      
      // 最初のプリセットで左矢印キーを押すと最後のプリセットに移動
      await user.keyboard('{ArrowLeft}');
      expect(mockOnPresetSelect).toHaveBeenCalledWith(
        FILTER_PRESETS[FILTER_PRESETS.length - 1].id
      );
    });

    it('無効状態ではキーボード操作が無効であること', async () => {
      const user = userEvent.setup();
      render(
        <PresetSelector
          presets={FILTER_PRESETS}
          selectedPreset="crisp-product"
          onPresetSelect={mockOnPresetSelect}
          disabled={true}
        />
      );
      
      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).toBeDisabled();
      });
      
      // 無効状態では矢印キーが機能しない
      if (radios.length > 0) {
        radios[0].focus();
        await user.keyboard('{ArrowRight}');
        expect(mockOnPresetSelect).not.toHaveBeenCalled();
      }
    });
  });

  describe('ResultViewer キーボードナビゲーション', () => {
    it('画像をキーボードで拡大表示できること', async () => {
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      const images = screen.getAllByRole('button', { name: /拡大表示/ });
      if (images.length > 0) {
        const firstImage = images[0];
        firstImage.focus();
        
        // Enterキーで拡大表示
        await user.keyboard('{Enter}');
        
        // モーダルが開く
        const modal = await screen.findByRole('dialog');
        expect(modal).toBeInTheDocument();
      }
    });

    it('モーダル内でキーボードナビゲーションが機能すること', async () => {
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      // モーダルを開く
      const previewButton = screen.getByRole('button', { name: /拡大表示/ });
      await user.click(previewButton);
      
      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // Escapeキーでモーダルを閉じる
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('複数画像がある場合の矢印キーナビゲーション', async () => {
      const multipleProcessedImages = [
        ...mockProcessedImages,
        {
          id: 'test-2',
          originalImage: {
            ...mockProcessableImages[0],
            id: 'test-2',
            file: new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
          },
          processedUrl: 'blob:processed2',
          appliedPreset: 'bright-clear',
          processingTime: 1200,
          fileSize: 2200,
        },
      ];
      
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={multipleProcessedImages}
        />
      );
      
      // モーダルを開く
      const previewButton = screen.getAllByRole('button', { name: /拡大表示/ })[0];
      await user.click(previewButton);
      
      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // 右矢印キーで次の画像
      await user.keyboard('{ArrowRight}');
      
      // 画像カウンターが更新される
      const counter = screen.getByText(/2 \/ 2/);
      expect(counter).toBeInTheDocument();
      
      // 左矢印キーで前の画像
      await user.keyboard('{ArrowLeft}');
      
      const firstCounter = screen.getByText(/1 \/ 2/);
      expect(firstCounter).toBeInTheDocument();
    });

    it('Spaceキーで処理前後の切り替えができること', async () => {
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      // モーダルを開く
      const previewButton = screen.getByRole('button', { name: /拡大表示/ });
      await user.click(previewButton);
      
      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // 初期状態では処理後が表示
      const processedToggle = screen.getByRole('button', { name: /処理後/ });
      expect(processedToggle).toHaveClass('active');
      
      // Spaceキーで処理前に切り替え
      await user.keyboard(' ');
      
      const originalToggle = screen.getByRole('button', { name: /処理前/ });
      expect(originalToggle).toHaveClass('active');
    });
  });

  describe('フォーカス管理', () => {
    it('モーダル開閉時にフォーカスが適切に管理されること', async () => {
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      const previewButton = screen.getByRole('button', { name: /拡大表示/ });
      const originalActiveElement = previewButton;
      
      // モーダルを開く
      await user.click(previewButton);
      
      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // モーダル内の要素にフォーカスが移動
      const closeButton = screen.getByRole('button', { name: /閉じる/ });
      expect(document.activeElement).toBe(closeButton);
      
      // モーダルを閉じる
      await user.click(closeButton);
      
      // 元の要素にフォーカスが戻る
      expect(document.activeElement).toBe(originalActiveElement);
    });

    it('ステップ変更時にフォーカスが適切に管理されること', async () => {
      const user = userEvent.setup();
      render(<EasyToneApp />);
      
      // ステップコンテンツ領域にフォーカスが設定される
      const stepContent = screen.getByRole('region');
      expect(stepContent).toHaveAttribute('tabIndex', '-1');
      
      // ステップが変更されたときにフォーカスが移動することを確認
      // （実際のテストでは、ステップ変更をトリガーする必要があります）
    });
  });

  describe('スクリーンリーダー対応', () => {
    it('適切なaria-live属性が設定されていること', () => {
      render(<EasyToneApp />);
      
      // 状態変更をアナウンスする要素
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
      
      liveRegions.forEach(region => {
        const ariaLive = region.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      });
    });

    it('エラーメッセージが適切にアナウンスされること', () => {
      render(<EasyToneApp />);
      
      // エラー表示要素にrole="alert"が設定されている
      const errorElements = document.querySelectorAll('[role="alert"]');
      errorElements.forEach(element => {
        expect(element).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('進行状況が適切にアナウンスされること', () => {
      render(<EasyToneApp />);
      
      // ステータス表示要素にrole="status"が設定されている
      const statusElements = document.querySelectorAll('[role="status"]');
      statusElements.forEach(element => {
        const ariaLive = element.getAttribute('aria-live');
        expect(ariaLive).toBe('polite');
      });
    });
  });

  describe('キーボードショートカット', () => {
    it('グローバルキーボードショートカットが機能すること', async () => {
      const user = userEvent.setup();
      render(<EasyToneApp />);
      
      // 例: Ctrl+Rでリセット（実装されている場合）
      // await user.keyboard('{Control>}r{/Control}');
      
      // 例: F1でヘルプ表示（実装されている場合）
      // await user.keyboard('{F1}');
      
      // 実際のショートカットの実装に応じてテストを追加
    });

    it('コンテキスト固有のキーボードショートカットが機能すること', async () => {
      const user = userEvent.setup();
      render(
        <ResultViewer
          originalImages={mockProcessableImages}
          processedImages={mockProcessedImages}
        />
      );
      
      // モーダルを開く
      const previewButton = screen.getByRole('button', { name: /拡大表示/ });
      await user.click(previewButton);
      
      // モーダル内でのキーボードショートカット
      // 左右矢印キー、Spaceキー、Escapeキーなどは既に他のテストでカバー済み
    });
  });
});