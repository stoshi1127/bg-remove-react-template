/**
 * 自動遷移機能の簡単なテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EasyToneApp from '../EasyToneApp';

describe('AutoTransition Simple Tests', () => {
  test('アプリケーションが正常にレンダリングされる', () => {
    render(<EasyToneApp />);
    
    // 基本的な要素が表示されることを確認
    expect(screen.getByText('イージートーン')).toBeInTheDocument();
    expect(screen.getByText('画像アップロード')).toBeInTheDocument();
    expect(screen.getByText('フィルター選択・処理')).toBeInTheDocument();
    expect(screen.getByText('完了')).toBeInTheDocument();
  });

  test('ワークフロー進行状況が正しく表示される', () => {
    render(<EasyToneApp />);
    
    // ワークフロー要素が存在することを確認
    const steps = screen.getAllByText('1');
    const step2Elements = screen.getAllByText('2');
    const checkmarks = screen.getAllByText('✓');
    
    expect(steps.length).toBeGreaterThan(0);
    expect(step2Elements.length).toBeGreaterThan(0);
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  test('画像アップロードセクションが表示される', () => {
    render(<EasyToneApp />);
    
    // 画像アップロードセクションが表示されることを確認
    expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
  });

  test('使い方ガイドが表示される', () => {
    render(<EasyToneApp />);
    
    // 使い方ガイドが表示されることを確認
    expect(screen.getByText('イージートーンの使い方ガイド')).toBeInTheDocument();
    expect(screen.getByText('1. 画像をアップロード')).toBeInTheDocument();
    expect(screen.getByText('2. フィルター選択・処理実行')).toBeInTheDocument();
  });

  test('QuickToolsブランド統合セクションが表示される', () => {
    render(<EasyToneApp />);
    
    // ブランド統合セクションが表示されることを確認
    expect(screen.getByText('トーン調整＋背景透過で完璧な仕上がり')).toBeInTheDocument();
    expect(screen.getByText('イージーカットを使ってみる')).toBeInTheDocument();
  });

  test('CTAセクションの機能バッジが表示される', () => {
    render(<EasyToneApp />);
    
    // 機能バッジが表示されることを確認
    expect(screen.getByText('完全無料')).toBeInTheDocument();
    expect(screen.getByText('高速処理')).toBeInTheDocument();
    expect(screen.getByText('安全・安心')).toBeInTheDocument();
    expect(screen.getByText('複数画像対応')).toBeInTheDocument();
  });
});