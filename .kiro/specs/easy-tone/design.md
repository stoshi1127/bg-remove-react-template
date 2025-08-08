# Design Document

## Overview

イージートーン (EasyTone) は、ブラウザベースの画像処理Webアプリケーションとして設計されます。クライアントサイドでの完全な処理により、プライバシーを保護しながら高速な画像処理を実現します。React + Next.jsをベースとし、Canvas APIとWeb Workersを活用した並列処理により、複数画像の一括処理を効率的に行います。

## Architecture

### システム構成
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │  Image Processor │    │   File Manager  │
│   (React/Next)  │◄──►│  (Canvas/WebGL)  │◄──►│  (File API/ZIP) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   State Mgmt    │    │   Web Workers   │    │   Local Storage │
│   (Zustand)     │    │  (Parallel Proc)│    │   (Settings)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### ワークフロー構成
簡素化された2ステップワークフロー：
1. **ステップ1**: 画像アップロード
2. **ステップ2**: プリセット選択・処理実行・結果表示

### レイヤー構成
1. **Presentation Layer**: React コンポーネント、UI/UX
2. **Business Logic Layer**: 画像処理ロジック、プリセット管理
3. **Data Access Layer**: ファイル操作、ローカルストレージ
4. **Infrastructure Layer**: Web Workers、Canvas API

## Components and Interfaces

### Core Components

#### 1. ImageUploader Component
```typescript
interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  acceptedFormats: string[];
  maxFileSize: number;
}
```
- ドラッグ&ドロップ機能
- 複数ファイル選択
- HEIC形式の自動変換
- ファイル形式・サイズバリデーション

#### 2. PresetSelector Component
```typescript
interface PresetSelectorProps {
  presets: FilterPreset[];
  selectedPreset: string | null;
  uploadedImages: ProcessableImage[];
  onPresetSelect: (presetId: string) => void;
  onProcessStart: () => void;
  isProcessing: boolean;
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  filters: FilterConfig;
}
```
- 4つのプリセット表示
- アップロードされた全画像のプレビュー表示
- プリセット選択時のリアルタイムプレビュー機能
- 選択状態の管理
- 統合された「処理を開始」ボタン
- 処理中の状態表示

#### 3. ImageProcessor Component
```typescript
interface ImageProcessorProps {
  images: ProcessableImage[];
  selectedPreset: FilterPreset;
  onProcessingComplete: (results: ProcessedImage[]) => void;
}
```
- Web Workers による並列処理
- 進行状況の表示
- エラーハンドリング

#### 4. ResultViewer Component
```typescript
interface ResultViewerProps {
  originalImages: ProcessableImage[];
  processedImages: ProcessedImage[];
  onDownloadSingle: (imageId: string) => void;
  onDownloadAll: () => void;
}
```
- Before/After比較表示
- 拡大プレビュー機能
- ダウンロード機能

### Data Models

#### ProcessableImage
```typescript
interface ProcessableImage {
  id: string;
  file: File;
  originalUrl: string;
  metadata: ImageMetadata;
  status: 'pending' | 'processing' | 'completed' | 'error';
}
```

#### ProcessedImage
```typescript
interface ProcessedImage {
  id: string;
  originalImage: ProcessableImage;
  processedUrl: string;
  appliedPreset: string;
  processingTime: number;
  fileSize: number;
}
```

#### FilterConfig
```typescript
interface FilterConfig {
  brightness: number;    // -100 to 100
  contrast: number;      // -100 to 100
  saturation: number;    // -100 to 100
  hue: number;          // -180 to 180
  sharpness: number;    // 0 to 100
  warmth: number;       // -100 to 100 (color temperature)
}
```

## Architecture

### Image Processing Pipeline

1. **File Input Stage**
   - File validation and format conversion
   - HEIC to JPEG conversion using heic2any
   - Image metadata extraction
   - Thumbnail generation for preview

2. **Processing Stage**
   - Web Worker initialization
   - Canvas-based filter application
   - Parallel processing for multiple images
   - Progress tracking and error handling

3. **Output Stage**
   - Processed image generation
   - Quality optimization
   - Download preparation (individual/ZIP)

### Filter Implementation

#### Preset Configurations
```typescript
const PRESETS: Record<string, FilterConfig> = {
  'crisp-product': {
    brightness: 10,
    contrast: 20,
    saturation: 5,
    hue: 0,
    sharpness: 30,
    warmth: 0
  },
  'bright-clear': {
    brightness: 25,
    contrast: 10,
    saturation: 10,
    hue: 0,
    sharpness: 10,
    warmth: 5
  },
  'warm-cozy': {
    brightness: 5,
    contrast: 5,
    saturation: 15,
    hue: 10,
    sharpness: 0,
    warmth: 30
  },
  'cool-urban': {
    brightness: 0,
    contrast: 15,
    saturation: -5,
    hue: -10,
    sharpness: 20,
    warmth: -20
  }
};
```

### Performance Optimization

#### Web Workers Implementation
```typescript
// worker.ts
self.onmessage = function(e) {
  const { imageData, filterConfig } = e.data;
  const processedData = applyFilters(imageData, filterConfig);
  self.postMessage({ processedData });
};
```

#### Memory Management
- 画像処理後の即座なメモリ解放
- Canvas要素の適切なクリーンアップ
- 大きな画像の段階的処理

## Error Handling

### Error Types and Handling Strategy

1. **File Format Errors**
   - 未対応形式の検出と警告
   - HEIC変換失敗時のフォールバック

2. **Processing Errors**
   - 個別画像の処理失敗時の継続処理
   - メモリ不足時の画像サイズ調整

3. **Network/Browser Errors**
   - ブラウザ互換性チェック
   - Web Workers未対応時のフォールバック

### Error Recovery Mechanisms
```typescript
interface ErrorHandler {
  handleFileError: (file: File, error: Error) => void;
  handleProcessingError: (imageId: string, error: Error) => void;
  handleSystemError: (error: Error) => void;
}
```

## Testing Strategy

### Unit Testing
- **Filter Functions**: 各フィルターの数値計算テスト
- **File Validation**: ファイル形式・サイズ検証テスト
- **Data Transformation**: 画像データ変換テスト

### Integration Testing
- **Component Integration**: コンポーネント間の連携テスト
- **Worker Communication**: メインスレッドとWorker間の通信テスト
- **File Processing Pipeline**: アップロードから出力までの全体テスト

### Performance Testing
- **Load Testing**: 大量画像処理時のパフォーマンステスト
- **Memory Testing**: メモリリーク検出テスト
- **Browser Compatibility**: 主要ブラウザでの動作確認

### User Acceptance Testing
- **Usability Testing**: 3ステップワークフローの直感性テスト
- **Visual Quality Testing**: プリセット適用結果の品質確認
- **Accessibility Testing**: キーボードナビゲーション、スクリーンリーダー対応

### Testing Tools
- **Jest**: ユニットテスト・統合テスト
- **React Testing Library**: コンポーネントテスト
- **Playwright**: E2Eテスト
- **Lighthouse**: パフォーマンス・アクセシビリティ監査