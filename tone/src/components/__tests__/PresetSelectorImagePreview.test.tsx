import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PresetSelector } from '../PresetSelector';
import { FILTER_PRESETS } from '../../constants/presets';
import { ProcessableImage } from '../../types/processing';

// モック画像データ
const mockUploadedImages: ProcessableImage[] = [
  {
    id: '1',
    file: new File([''], 'test1.jpg', { type: 'image/jpeg' }),
    originalUrl: 'blob:test1',
    metadata: {
      name: 'test1.jpg',
      size: 1024,
      type: 'image/jpeg',
      lastModified: Date.now(),
      width: 800,
      height: 600
    },
    status: 'pending'
  },
  {
    id: '2',
    file: new File([''], 'test2.png', { type: 'image/png' }),
    originalUrl: 'blob:test2',
    metadata: {
      name: 'test2.png',
      size: 2048,
      type: 'image/png',
      lastModified: Date.now(),
      width: 1200,
      height: 800
    },
    status: 'pending'
  }
];

describe('PresetSelector - Image Preview Integration', () => {
  const mockOnPresetSelect = jest.fn();

  beforeEach(() => {
    mockOnPresetSelect.mockClear();
  });

  it('画像がアップロードされていない場合、プレビューセクションを表示しない', () => {
    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset={null}
        uploadedImages={[]}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    expect(screen.queryByText(/アップロードされた画像/)).not.toBeInTheDocument();
  });

  it('アップロードされた画像がある場合、プレビューセクションを表示する', () => {
    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset={null}
        uploadedImages={mockUploadedImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    expect(screen.getByText('アップロードされた画像 (2枚)')).toBeInTheDocument();
  });

  it('アップロードされた各画像のプレビューを表示する', () => {
    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset={null}
        uploadedImages={mockUploadedImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // 画像要素が表示されることを確認
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    
    // alt属性が正しく設定されていることを確認
    expect(screen.getByAltText('test1.jpg')).toBeInTheDocument();
    expect(screen.getByAltText('test2.png')).toBeInTheDocument();
  });

  it('長いファイル名を適切に省略表示する', () => {
    const longNameImage: ProcessableImage = {
      id: '3',
      file: new File([''], 'very-long-filename-that-should-be-truncated.jpg', { type: 'image/jpeg' }),
      originalUrl: 'blob:test3',
      metadata: {
        name: 'very-long-filename-that-should-be-truncated.jpg',
        size: 1024,
        type: 'image/jpeg',
        lastModified: Date.now(),
        width: 800,
        height: 600
      },
      status: 'pending'
    };

    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset={null}
        uploadedImages={[longNameImage]}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // 省略されたファイル名が表示されることを確認
    expect(screen.getByText('very-long-filen...')).toBeInTheDocument();
  });

  it('プリセット選択機能が正常に動作する', () => {
    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset={null}
        uploadedImages={mockUploadedImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // プリセットボタンをクリック
    const presetButton = screen.getByRole('radio', { name: /商品をくっきりと/ });
    presetButton.click();

    expect(mockOnPresetSelect).toHaveBeenCalledWith('crisp-product');
  });

  it('画像プレビューセクションが適切なアクセシビリティ属性を持つ', () => {
    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset={null}
        uploadedImages={mockUploadedImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // 画像要素が適切なalt属性を持つことを確認
    const images = screen.getAllByRole('img');
    images.forEach((img, index) => {
      expect(img).toHaveAttribute('alt', mockUploadedImages[index].metadata.name);
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  it('画像プレビューのレスポンシブレイアウトが適用される', () => {
    render(
      <PresetSelector
        presets={FILTER_PRESETS}
        selectedPreset={null}
        uploadedImages={mockUploadedImages}
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // 画像グリッドコンテナが存在することを確認
    const imageGrid = screen.getByText('アップロードされた画像 (2枚)').nextElementSibling;
    expect(imageGrid).toHaveClass('imageGrid');
  });
});