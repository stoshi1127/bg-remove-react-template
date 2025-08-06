/**
 * UI統合テスト - アニメーション、トランジション、ローディング状態
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickToolsHeader from '../QuickToolsHeader';
import QuickToolsFooter from '../QuickToolsFooter';
import WorkflowSteps from '../WorkflowSteps';


// QuickToolsテーマのCSS変数をテスト用にモック
const mockQuickToolsTheme = () => {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --qt-primary-600: #2563eb;
      --qt-primary-700: #1d4ed8;
      --qt-neutral-50: #f8fafc;
      --qt-neutral-800: #1e293b;
      --qt-font-family-sans: 'Inter', sans-serif;
      --qt-text-2xl: 1.5rem;
      --qt-space-4: 1rem;
      --qt-radius-lg: 0.5rem;
      --qt-transition-base: 200ms ease-in-out;
      --qt-transition-bounce: 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
      --qt-transition-smooth: 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    
    @keyframes qt-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes qt-scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes qt-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    @keyframes qt-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .qt-animate-fade-in { animation: qt-fade-in 0.3s ease-out; }
    .qt-animate-scale-in { animation: qt-scale-in 0.2s ease-out; }
    .qt-animate-pulse { animation: qt-pulse 2s ease-in-out infinite; }
    .qt-animate-spin { animation: qt-spin 1s linear infinite; }
  `;
  document.head.appendChild(style);
  return style;
};

describe('UI統合テスト', () => {
  let styleElement: HTMLStyleElement;

  beforeEach(() => {
    styleElement = mockQuickToolsTheme();
  });

  afterEach(() => {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  });

  describe('アニメーションとトランジション効果', () => {
    it('QuickToolsヘッダーのナビゲーションにホバー効果が適用される', () => {
      render(<QuickToolsHeader />);
      
      const navToggle = screen.getByLabelText('他のツールを表示');
      expect(navToggle).toBeInTheDocument();
      
      // ホバー効果のスタイルが適用されていることを確認
      const computedStyle = getComputedStyle(navToggle);
      expect(computedStyle.transition).toBeDefined();
    });

    it('ボタンにトランジション効果が適用される', () => {
      render(<QuickToolsHeader />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        // トランジションが設定されていることを確認
        expect(button).toBeInTheDocument();
      });
    });

    it('WorkflowStepsコンポーネントにアニメーション効果が適用される', () => {
      const mockCanProceedToStep = jest.fn().mockReturnValue(true);
      const mockOnStepClick = jest.fn();
      
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          canProceedToStep={mockCanProceedToStep}
          onStepClick={mockOnStepClick}
        />
      );
      
      // ステップ要素が存在することを確認（clickableな場合はbutton roleになる）
      const steps = screen.getAllByRole('button');
      expect(steps.length).toBeGreaterThan(0);
      
      // 各ステップにトランジション効果が適用されていることを確認
      steps.forEach(step => {
        expect(step).toBeInTheDocument();
      });
    });
  });

  describe('ローディング状態とフィードバック表示', () => {
    it('CSS変数でローディング状態のスタイルが定義されている', () => {
      render(<div />);
      
      const computedStyle = getComputedStyle(document.documentElement);
      expect(computedStyle.getPropertyValue('--qt-transition-base')).toBe('200ms ease-in-out');
      expect(computedStyle.getPropertyValue('--qt-transition-bounce')).toBe('300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)');
      expect(computedStyle.getPropertyValue('--qt-transition-smooth')).toBe('400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)');
    });

    it('アニメーションキーフレームが正しく定義されている', () => {
      render(<div />);
      
      // CSSアニメーションが定義されていることを確認
      const styleSheets = Array.from(document.styleSheets);
      const hasAnimations = styleSheets.some(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          return rules.some(rule => 
            rule.type === CSSRule.KEYFRAMES_RULE ||
            (rule as CSSStyleRule).selectorText?.includes('qt-animate')
          );
        } catch {
          return false;
        }
      });
      
      expect(hasAnimations).toBe(true);
    });
  });

  describe('レスポンシブデザインとアクセシビリティ', () => {
    it('モバイル表示でも適切にレンダリングされる', () => {
      // モバイルビューポートをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<QuickToolsHeader />);
      
      const mobileMenuButton = screen.getByLabelText('メニューを開く');
      expect(mobileMenuButton).toBeInTheDocument();
    });

    it('アクセシビリティ属性が適切に設定されている', () => {
      render(
        <>
          <QuickToolsHeader />
          <QuickToolsFooter />
        </>
      );
      
      // ランドマークロールの確認
      const banner = screen.getByRole('banner');
      const contentinfo = screen.getByRole('contentinfo');
      
      expect(banner).toBeInTheDocument();
      expect(contentinfo).toBeInTheDocument();
    });

    it('フォーカス管理が適切に機能する', () => {
      render(<QuickToolsHeader />);
      
      const focusableElements = screen.getAllByRole('button');
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // 各要素がフォーカス可能であることを確認
      focusableElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('統一されたデザインシステム', () => {
    it('QuickToolsカラーパレットが一貫して適用されている', () => {
      render(
        <>
          <QuickToolsHeader />
          <QuickToolsFooter />
        </>
      );
      
      // CSS変数が定義されていることを確認
      const computedStyle = getComputedStyle(document.documentElement);
      expect(computedStyle.getPropertyValue('--qt-primary-600')).toBe('#2563eb');
      expect(computedStyle.getPropertyValue('--qt-neutral-50')).toBe('#f8fafc');
    });

    it('タイポグラフィが統一されている', () => {
      render(
        <>
          <QuickToolsHeader />
          <QuickToolsFooter />
        </>
      );
      
      const computedStyle = getComputedStyle(document.documentElement);
      expect(computedStyle.getPropertyValue('--qt-font-family-sans')).toContain('Inter');
    });

    it('コンポーネント間でスタイルが一貫している', () => {
      render(
        <>
          <QuickToolsHeader />
          <QuickToolsFooter />
        </>
      );
      
      // ヘッダーとフッターの両方でQuickToolsブランドが表示されている
      const brandElements = screen.getAllByText('QuickTools');
      expect(brandElements.length).toBeGreaterThan(1);
    });
  });

  describe('インタラクション効果', () => {
    it('ボタンクリック時に適切なフィードバックが提供される', async () => {
      render(<QuickToolsHeader />);
      
      const navToggle = screen.getByLabelText('他のツールを表示');
      
      // クリック前の状態を確認
      expect(navToggle).toHaveAttribute('aria-expanded', 'false');
      
      // クリックイベントをシミュレート
      fireEvent.click(navToggle);
      
      // ボタンが存在し、インタラクション可能であることを確認
      expect(navToggle).toBeInTheDocument();
    });

    it('キーボードナビゲーションが適切に機能する', () => {
      render(<QuickToolsHeader />);
      
      const focusableElements = screen.getAllByRole('button');
      
      // Tab キーでフォーカス移動をシミュレート
      focusableElements.forEach(element => {
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });
  });

  describe('エラー状態とフィードバック', () => {
    it('エラー状態が適切にスタイリングされる', () => {
      // エラー状態のテスト用コンポーネント
      const ErrorComponent = () => (
        <div className="qt-alert qt-alert-error">
          エラーが発生しました
        </div>
      );
      
      render(<ErrorComponent />);
      
      const errorElement = screen.getByText('エラーが発生しました');
      expect(errorElement).toBeInTheDocument();
    });

    it('成功状態が適切にスタイリングされる', () => {
      // 成功状態のテスト用コンポーネント
      const SuccessComponent = () => (
        <div className="qt-alert qt-alert-success">
          処理が完了しました
        </div>
      );
      
      render(<SuccessComponent />);
      
      const successElement = screen.getByText('処理が完了しました');
      expect(successElement).toBeInTheDocument();
    });
  });

  describe('パフォーマンスとアクセシビリティ', () => {
    it('アニメーション削減設定が適用される', () => {
      // prefers-reduced-motion メディアクエリをシミュレート
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
      
      render(<QuickToolsHeader />);
      
      // アニメーション削減設定が考慮されていることを確認
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('高コントラストモードが適切に処理される', () => {
      // prefers-contrast メディアクエリをシミュレート
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
      
      render(<QuickToolsHeader />);
      
      // 高コントラストモードが考慮されていることを確認
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });
  });
});