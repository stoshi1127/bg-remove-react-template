/**
 * LoadingSpinnerコンポーネントのテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('デフォルトプロパティで正しくレンダリングされる', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', '読み込み中...');
    
    const label = screen.getByText('読み込み中...');
    expect(label).toBeInTheDocument();
  });

  it('カスタムラベルが正しく表示される', () => {
    const customLabel = 'データを処理中...';
    render(<LoadingSpinner label={customLabel} />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', customLabel);
    
    const label = screen.getByText(customLabel);
    expect(label).toBeInTheDocument();
  });

  it('サイズプロパティが正しく適用される', () => {
    const { rerender } = render(<LoadingSpinner size="small" />);
    
    let spinnerElement = screen.getByRole('status').querySelector('[aria-hidden="true"]');
    expect(spinnerElement).toHaveClass('small');
    
    rerender(<LoadingSpinner size="large" />);
    spinnerElement = screen.getByRole('status').querySelector('[aria-hidden="true"]');
    expect(spinnerElement).toHaveClass('large');
  });

  it('カラープロパティが正しく適用される', () => {
    const { rerender } = render(<LoadingSpinner color="secondary" />);
    
    let spinnerElement = screen.getByRole('status').querySelector('[aria-hidden="true"]');
    expect(spinnerElement).toHaveClass('secondary');
    
    rerender(<LoadingSpinner color="neutral" />);
    spinnerElement = screen.getByRole('status').querySelector('[aria-hidden="true"]');
    expect(spinnerElement).toHaveClass('neutral');
  });

  it('カスタムクラス名が適用される', () => {
    const customClass = 'custom-spinner';
    render(<LoadingSpinner className={customClass} />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass(customClass);
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    
    const spinnerIcon = spinner.querySelector('[aria-hidden="true"]');
    expect(spinnerIcon).toBeInTheDocument();
  });
});