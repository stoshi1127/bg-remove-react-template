/**
 * Notificationコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Notification from '../Notification';

// タイマーをモック
jest.useFakeTimers();

describe('Notification', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('成功通知が正しくレンダリングされる', () => {
    render(
      <Notification
        type="success"
        title="成功"
        message="操作が完了しました"
      />
    );
    
    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
    
    const title = screen.getByText('成功');
    expect(title).toBeInTheDocument();
    
    const message = screen.getByText('操作が完了しました');
    expect(message).toBeInTheDocument();
  });

  it('エラー通知が正しくレンダリングされる', () => {
    render(
      <Notification
        type="error"
        title="エラー"
        message="操作に失敗しました"
      />
    );
    
    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
    
    const title = screen.getByText('エラー');
    expect(title).toBeInTheDocument();
    
    const message = screen.getByText('操作に失敗しました');
    expect(message).toBeInTheDocument();
  });

  it('警告通知が正しくレンダリングされる', () => {
    render(
      <Notification
        type="warning"
        message="注意が必要です"
      />
    );
    
    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
    
    const message = screen.getByText('注意が必要です');
    expect(message).toBeInTheDocument();
  });

  it('情報通知が正しくレンダリングされる', () => {
    render(
      <Notification
        type="info"
        message="情報をお知らせします"
      />
    );
    
    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
    
    const message = screen.getByText('情報をお知らせします');
    expect(message).toBeInTheDocument();
  });

  it('タイトルなしでも正しくレンダリングされる', () => {
    render(
      <Notification
        type="info"
        message="メッセージのみの通知"
      />
    );
    
    const message = screen.getByText('メッセージのみの通知');
    expect(message).toBeInTheDocument();
    
    // タイトルが存在しないことを確認
    const titles = screen.queryAllByRole('heading');
    expect(titles).toHaveLength(0);
  });

  it('閉じるボタンが機能する', () => {
    const onClose = jest.fn();
    render(
      <Notification
        type="info"
        message="テストメッセージ"
        onClose={onClose}
        duration={0} // 自動閉じを無効化
      />
    );
    
    const closeButton = screen.getByLabelText('通知を閉じる');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    
    // アニメーション時間後にonCloseが呼ばれることを確認
    jest.advanceTimersByTime(300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('指定時間後に自動的に閉じる', () => {
    const onClose = jest.fn();
    render(
      <Notification
        type="info"
        message="自動閉じテスト"
        duration={3000}
        onClose={onClose}
      />
    );
    
    // 指定時間前はまだ表示されている
    jest.advanceTimersByTime(2000);
    expect(screen.getByText('自動閉じテスト')).toBeInTheDocument();
    
    // 指定時間後に閉じる処理が開始される
    jest.advanceTimersByTime(1000);
    
    // アニメーション時間後にonCloseが呼ばれる
    jest.advanceTimersByTime(300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('duration=0の場合は自動的に閉じない', () => {
    const onClose = jest.fn();
    render(
      <Notification
        type="info"
        message="手動閉じのみ"
        duration={0}
        onClose={onClose}
      />
    );
    
    // 長時間経過しても自動的に閉じない
    jest.advanceTimersByTime(10000);
    expect(screen.getByText('手動閉じのみ')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('カスタムクラス名が適用される', () => {
    const customClass = 'custom-notification';
    render(
      <Notification
        type="info"
        message="カスタムクラステスト"
        className={customClass}
      />
    );
    
    const notification = screen.getByRole('alert');
    expect(notification).toHaveClass(customClass);
  });

  it('適切なアクセシビリティ属性が設定される', () => {
    render(
      <Notification
        type="success"
        message="アクセシビリティテスト"
      />
    );
    
    const notification = screen.getByRole('alert');
    expect(notification).toHaveAttribute('aria-live', 'polite');
    
    const closeButton = screen.getByLabelText('通知を閉じる');
    expect(closeButton).toHaveAttribute('type', 'button');
  });

  it('各タイプで適切なアイコンが表示される', () => {
    const { rerender } = render(
      <Notification type="success" message="成功" />
    );
    
    let icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toBeInTheDocument();
    
    rerender(<Notification type="error" message="エラー" />);
    icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toBeInTheDocument();
    
    rerender(<Notification type="warning" message="警告" />);
    icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toBeInTheDocument();
    
    rerender(<Notification type="info" message="情報" />);
    icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});