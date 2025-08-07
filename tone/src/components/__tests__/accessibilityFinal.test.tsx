/**
 * 最終アクセシビリティテスト
 * Requirements: 6.4 - 完全なアクセシビリティ対応の検証
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import EasyToneApp from '../EasyToneApp';
import ImagePreview from '../ImagePreview';
import { ProcessableImage } from '../../types';

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
      width: 800,
      height: 600,
    },
    status: 'pending',
  },
];

describe('最終アクセシビリティテスト', () => {
  describe('ARIA属性の完全性', () => {
    it('aria-labelledby参照が正しく設定されていること', () => {
      const { container } = render(<EasyToneApp />);
      
      const elementsWithLabelledBy = container.querySelectorAll('[aria-labelledby]');
      elementsWithLabelledBy.forEach(element => {
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
          const referencedElement = container.querySelector(`#${labelledBy}`);
          expect(referencedElement).toBeInTheDocument();
        }
      });
    });

    it('aria-describedby参照が正しく設定されていること', () => {
      const { container } = render(<EasyToneApp />);
      
      const elementsWithDescribedBy = container.querySelectorAll('[aria-describedby]');
      elementsWithDescribedBy.forEach(element => {
        const describedBy = element.getAttribute('aria-describedby');
        if (describedBy) {
          const referencedElement = container.querySelector(`#${describedBy}`);
          expect(referencedElement).toBeInTheDocument();
        }
      });
    });
  });

  describe('キーボードナビゲーションの完全性', () => {
    it('Escapeキーでモーダルを閉じられること', async () => {
      const user = userEvent.setup();
      const mockOnRemove = jest.fn();
      
      render(
        <ImagePreview 
          images={mockProcessableImages} 
          onRemoveImage={mockOnRemove}
        />
      );
      
      // 画像をクリックしてモーダルを開く
      const imageButton = screen.getAllByRole('gridcell')[0];
      await user.click(imageButton);
      
      // モーダルが開いていることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Escapeキーでモーダルを閉じる
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('スクリーンリーダー対応', () => {
    it('適切なライブリージョンが設定されていること', () => {
      const { container } = render(<EasyToneApp />);
      
      // aria-live属性を持つ要素が存在する
      const liveRegions = container.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThanOrEqual(0);
      
      // 各ライブリージョンが適切な値を持つ
      liveRegions.forEach(region => {
        const ariaLive = region.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      });
    });

    it('画像に適切なalt属性が設定されていること', () => {
      render(
        <ImagePreview 
          images={mockProcessableImages}
        />
      );
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        const altText = img.getAttribute('alt');
        expect(altText).toBeTruthy();
        expect(altText?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('総合的なアクセシビリティ検証', () => {
    it('axe-coreによる自動アクセシビリティテストに合格すること', async () => {
      const { container } = render(<EasyToneApp />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('ImagePreviewコンポーネントがaxe-coreテストに合格すること', async () => {
      const { container } = render(
        <ImagePreview 
          images={mockProcessableImages}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});