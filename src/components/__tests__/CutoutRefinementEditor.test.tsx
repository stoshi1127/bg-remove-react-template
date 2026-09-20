import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CutoutRefinementEditor from '../CutoutRefinementEditor';

describe('CutoutRefinementEditor', () => {
  const props = {
    sourceImageUrl: 'blob:source',
    transparentImageUrl: 'blob:transparent',
    imageName: 'sample.png',
    onApply: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows the core refinement controls', () => {
    render(<CutoutRefinementEditor {...props} />);

    expect(screen.getByRole('dialog', { name: '切り抜きを修正' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '透過' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '復元' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '移動' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('slider', { name: 'ブラシサイズ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '元に戻す' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'やり直す' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '元画像' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '修正を適用' })).toBeDisabled();
  });

  test('switches tools and closes from the cancel button', () => {
    render(<CutoutRefinementEditor {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '復元' }));
    expect(screen.getByRole('button', { name: '復元' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '移動' }));
    expect(screen.getByRole('button', { name: '移動' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '元画像' }));
    expect(screen.getByRole('button', { name: '✓ 元画像' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  test('keeps inline actions visible while tools and view controls can collapse', () => {
    render(<CutoutRefinementEditor {...props} presentation="inline" applyLabel="適用して次へ" />);

    expect(screen.getByRole('button', { name: '適用して次へ' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'ツール −' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'ツール −' }));
    expect(screen.queryByRole('button', { name: '透過' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '元に戻す' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '表示 ＋' }));
    expect(screen.getByRole('button', { name: '修正前と比較' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: '修正前と比較' }));
    expect(screen.getByRole('button', { name: '修正前と比較' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('closes with Escape', () => {
    render(<CutoutRefinementEditor {...props} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  test('applies a brush stroke as a PNG blob', async () => {
    const originalImage = global.Image;
    class LoadedImage {
      naturalWidth = 100;
      naturalHeight = 80;
      crossOrigin = '';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(_: string) {
        Promise.resolve().then(() => this.onload?.());
      }
    }
    Object.defineProperty(global, 'Image', { configurable: true, value: LoadedImage });

    const context = {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      createPattern: jest.fn(() => ({ setTransform: jest.fn() })),
      globalCompositeOperation: 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
    };
    (HTMLCanvasElement.prototype.getContext as jest.Mock).mockReturnValue(context);
    HTMLCanvasElement.prototype.setPointerCapture = jest.fn();
    HTMLCanvasElement.prototype.hasPointerCapture = jest.fn(() => true);
    HTMLCanvasElement.prototype.releasePointerCapture = jest.fn();
    HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
      left: 0, top: 0, width: 100, height: 80, right: 100, bottom: 80, x: 0, y: 0, toJSON: () => ({}),
    }));

    try {
      render(<CutoutRefinementEditor {...props} />);
      await waitFor(() => expect(screen.queryByText('編集画面を準備しています…')).not.toBeInTheDocument());
      const canvas = screen.getByLabelText('切り抜き修正キャンバス');
      fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 30, clientY: 30 });
      fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 50, clientY: 40 });
      fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 50, clientY: 40 });
      fireEvent.click(screen.getByRole('button', { name: '修正を適用' }));
      await waitFor(() => expect(props.onApply).toHaveBeenCalledTimes(1));
      expect(props.onApply.mock.calls[0][1]).toBe('erase');
    } finally {
      Object.defineProperty(global, 'Image', { configurable: true, value: originalImage });
    }
  });
});
