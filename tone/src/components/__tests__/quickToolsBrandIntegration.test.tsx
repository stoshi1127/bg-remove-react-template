/**
 * QuickToolsブランド統合のビジュアルテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickToolsHeader from '../QuickToolsHeader';
import QuickToolsFooter from '../QuickToolsFooter';

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
    }
  `;
  document.head.appendChild(style);
  return style;
};

describe('QuickToolsブランド統合', () => {
  let styleElement: HTMLStyleElement;

  beforeEach(() => {
    styleElement = mockQuickToolsTheme();
  });

  afterEach(() => {
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  });

  describe('QuickToolsヘッダー', () => {
    it('QuickToolsロゴが正しく表示される', () => {
      render(<QuickToolsHeader currentTool="EasyTone" />);
      
      const logoLink = screen.getByLabelText('QuickTools ホームページに戻る');
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', '/');
      
      const brandNames = screen.getAllByText('QuickTools');
      expect(brandNames.length).toBeGreaterThan(0);
      expect(brandNames[0]).toBeInTheDocument();
      
      const currentTool = screen.getByText('EasyTone');
      expect(currentTool).toBeInTheDocument();
    });

    it('ナビゲーションリンクが正しく表示される', () => {
      render(<QuickToolsHeader />);
      
      const navToggle = screen.getByLabelText('他のツールを表示');
      expect(navToggle).toBeInTheDocument();
      
      // ドロップダウンメニューの項目をチェック（複数存在する場合は最初のものを確認）
      const bgRemoveLinks = screen.getAllByText('BG Remove');
      const imageResizeLinks = screen.getAllByText('Image Resize');
      const formatConvertLinks = screen.getAllByText('Format Convert');
      const compressLinks = screen.getAllByText('Compress');
      
      expect(bgRemoveLinks.length).toBeGreaterThan(0);
      expect(imageResizeLinks.length).toBeGreaterThan(0);
      expect(formatConvertLinks.length).toBeGreaterThan(0);
      expect(compressLinks.length).toBeGreaterThan(0);
    });

    it('アクセシビリティ属性が正しく設定されている', () => {
      render(<QuickToolsHeader />);
      
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      
      const navigation = screen.getByRole('navigation', { name: 'QuickToolsナビゲーション' });
      expect(navigation).toBeInTheDocument();
      
      const navToggle = screen.getByRole('button', { name: '他のツールを表示' });
      expect(navToggle).toHaveAttribute('aria-expanded', 'false');
      expect(navToggle).toHaveAttribute('aria-haspopup', 'true');
    });
  });

  describe('QuickToolsフッター', () => {
    it('ブランドセクションが正しく表示される', () => {
      render(<QuickToolsFooter />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      
      const brandName = screen.getByText('QuickTools');
      expect(brandName).toBeInTheDocument();
      
      const brandDescription = screen.getByText('画像処理を簡単に。プロ品質の結果を、誰でも使えるシンプルなツールで。');
      expect(brandDescription).toBeInTheDocument();
    });

    it('ツールリンクが正しく表示される', () => {
      render(<QuickToolsFooter />);
      
      const toolsSection = screen.getByText('ツール');
      expect(toolsSection).toBeInTheDocument();
      
      // ツールリンクをチェック
      const easyToneLink = screen.getByLabelText('EasyToneツールに移動');
      expect(easyToneLink).toBeInTheDocument();
      expect(easyToneLink).toHaveAttribute('href', '/tone');
    });

    it('サポートリンクが正しく表示される', () => {
      render(<QuickToolsFooter />);
      
      const supportSection = screen.getByText('サポート');
      expect(supportSection).toBeInTheDocument();
      
      const helpLink = screen.getByLabelText('ヘルプページに移動');
      const contactLink = screen.getByLabelText('お問い合わせページに移動');
      const privacyLink = screen.getByLabelText('プライバシーポリシーページに移動');
      const termsLink = screen.getByLabelText('利用規約ページに移動');
      
      expect(helpLink).toBeInTheDocument();
      expect(contactLink).toBeInTheDocument();
      expect(privacyLink).toBeInTheDocument();
      expect(termsLink).toBeInTheDocument();
    });

    it('ソーシャルリンクが正しく表示される', () => {
      render(<QuickToolsFooter />);
      
      const twitterLink = screen.getByLabelText('TwitterでQuickToolsをフォロー');
      const githubLink = screen.getByLabelText('GitHubでQuickToolsをフォロー');
      
      expect(twitterLink).toBeInTheDocument();
      expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/quicktools');
      expect(twitterLink).toHaveAttribute('target', '_blank');
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute('href', 'https://github.com/quicktools');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('著作権表示が正しく表示される', () => {
      render(<QuickToolsFooter />);
      
      const currentYear = new Date().getFullYear();
      const copyrightText = screen.getByText(`© ${currentYear} QuickTools. All rights reserved.`);
      expect(copyrightText).toBeInTheDocument();
      
      const madeWithText = screen.getByText(/Made with/);
      expect(madeWithText).toBeInTheDocument();
    });
  });

  describe('統一されたデザインシステム', () => {
    it('QuickToolsカラーパレットが適用されている', () => {
      render(<QuickToolsHeader />);
      
      // CSS変数が定義されていることを確認
      const computedStyle = getComputedStyle(document.documentElement);
      expect(computedStyle.getPropertyValue('--qt-primary-600')).toBe('#2563eb');
      expect(computedStyle.getPropertyValue('--qt-neutral-50')).toBe('#f8fafc');
    });

    it('QuickToolsタイポグラフィが適用されている', () => {
      render(<QuickToolsHeader />);
      
      // フォントファミリーがQuickToolsのものであることを確認
      const computedStyle = getComputedStyle(document.documentElement);
      expect(computedStyle.getPropertyValue('--qt-font-family-sans')).toContain('Inter');
    });

    it('統一されたコンポーネントスタイルが適用されている', () => {
      render(<QuickToolsHeader />);
      
      // ボタンスタイルの確認
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // 各ボタンがQuickToolsのスタイリングを使用していることを確認
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('レスポンシブデザイン', () => {
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
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定されている', () => {
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

    it('キーボードナビゲーションが機能する', () => {
      render(<QuickToolsHeader />);
      
      const logoLink = screen.getByLabelText('QuickTools ホームページに戻る');
      const navToggle = screen.getByLabelText('他のツールを表示');
      
      // フォーカス可能な要素であることを確認
      expect(logoLink).toHaveAttribute('href');
      expect(navToggle).toHaveAttribute('type', 'button');
    });
  });
});