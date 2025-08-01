import JSZip from 'jszip';
import { ProcessedImage } from '../types/processing';

/**
 * ダウンロード関連のユーティリティ関数
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

/**
 * 個別画像のダウンロード機能
 * Requirements: 5.1, 5.3
 */
export const downloadSingleImage = async (processedImage: ProcessedImage): Promise<void> => {
  try {
    // 元の画像品質を維持したファイル生成
    const blob = processedImage.processedBlob;
    
    // ファイル名を生成（元のファイル名 + プリセット名）
    const originalName = processedImage.originalImage.file.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const extension = originalName.substring(originalName.lastIndexOf('.')) || '.jpg';
    const fileName = `${nameWithoutExt}_${processedImage.appliedPreset}${extension}`;
    
    // ダウンロード実行
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // メモリクリーンアップ
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('個別ダウンロードエラー:', error);
    throw new Error(`画像のダウンロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};

/**
 * 分かりやすいファイル名の自動生成
 * Requirements: 5.4
 */
export const generateFileName = (originalName: string, preset: string, index?: number): string => {
  const lastDotIndex = originalName.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '.jpg';
  
  // プリセット名を日本語から英語に変換
  const presetMap: Record<string, string> = {
    '商品をくっきりと': 'crisp-product',
    '明るくクリアに': 'bright-clear',
    '暖かみのある雰囲気': 'warm-cozy',
    'クールで都会的': 'cool-urban'
  };
  
  const presetSuffix = presetMap[preset] || preset.toLowerCase().replace(/\s+/g, '-');
  const indexSuffix = typeof index === 'number' ? `_${String(index + 1).padStart(2, '0')}` : '';
  
  return `${nameWithoutExt}_${presetSuffix}${indexSuffix}${extension}`;
};

/**
 * 一括ダウンロード（ZIP）機能
 * Requirements: 5.2, 5.4
 */
export const downloadAllImagesAsZip = async (
  processedImages: ProcessedImage[],
  zipFileName?: string
): Promise<void> => {
  if (processedImages.length === 0) {
    throw new Error('ダウンロードする画像がありません');
  }

  try {
    const zip = new JSZip();
    
    // 各画像をZIPに追加
    for (let i = 0; i < processedImages.length; i++) {
      const processedImage = processedImages[i];
      const fileName = generateFileName(
        processedImage.originalImage.file.name,
        processedImage.appliedPreset,
        i
      );
      
      // BlobをZIPに追加
      zip.file(fileName, processedImage.processedBlob);
    }
    
    // 処理情報ファイルを追加
    const processingInfo = generateProcessingInfo(processedImages);
    zip.file('processing_info.txt', processingInfo);
    
    // ZIPファイルを生成
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
    
    // ダウンロード実行
    const finalZipFileName = zipFileName || generateZipFileName(processedImages);
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalZipFileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // メモリクリーンアップ
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('一括ダウンロードエラー:', error);
    throw new Error(`ZIPファイルの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};

/**
 * ZIPファイル名の自動生成
 * Requirements: 5.4
 */
export const generateZipFileName = (processedImages: ProcessedImage[]): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  // 適用されたプリセットを取得
  const presets = [...new Set(processedImages.map(img => img.appliedPreset))];
  const presetSuffix = presets.length === 1 ? `_${presets[0]}` : '';
  
  return `easytone_processed_${dateStr}_${timeStr}${presetSuffix}_${processedImages.length}images.zip`;
};

/**
 * 処理情報ファイルの生成
 * Requirements: 5.4
 */
export const generateProcessingInfo = (processedImages: ProcessedImage[]): string => {
  const now = new Date();
  const totalSize = processedImages.reduce((sum, img) => sum + img.fileSize, 0);
  const totalProcessingTime = processedImages.reduce((sum, img) => sum + img.processingTime, 0);
  const averageProcessingTime = Math.round(totalProcessingTime / processedImages.length);
  
  let info = `EasyTone 処理結果情報\n`;
  info += `=====================================\n\n`;
  info += `処理日時: ${now.toLocaleString('ja-JP')}\n`;
  info += `処理画像数: ${processedImages.length}枚\n`;
  info += `総ファイルサイズ: ${Math.round(totalSize / 1024)}KB\n`;
  info += `総処理時間: ${totalProcessingTime}ms\n`;
  info += `平均処理時間: ${averageProcessingTime}ms\n\n`;
  
  // 適用されたプリセット情報
  const presetCounts = processedImages.reduce((acc, img) => {
    acc[img.appliedPreset] = (acc[img.appliedPreset] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  info += `適用プリセット:\n`;
  Object.entries(presetCounts).forEach(([preset, count]) => {
    info += `  - ${preset}: ${count}枚\n`;
  });
  
  info += `\n個別画像情報:\n`;
  info += `=====================================\n`;
  
  processedImages.forEach((img, index) => {
    info += `${index + 1}. ${img.originalImage.file.name}\n`;
    info += `   プリセット: ${img.appliedPreset}\n`;
    info += `   処理時間: ${img.processingTime}ms\n`;
    info += `   ファイルサイズ: ${Math.round(img.fileSize / 1024)}KB\n`;
    info += `   元ファイルサイズ: ${Math.round(img.originalImage.file.size / 1024)}KB\n\n`;
  });
  
  return info;
};

/**
 * ダウンロード進行状況の管理
 */
export interface DownloadProgress {
  current: number;
  total: number;
  fileName: string;
  progress: number; // 0-100
}

/**
 * 進行状況付きの一括ダウンロード
 * Requirements: 5.2
 */
export const downloadAllImagesAsZipWithProgress = async (
  processedImages: ProcessedImage[],
  onProgress?: (progress: DownloadProgress) => void,
  zipFileName?: string
): Promise<void> => {
  if (processedImages.length === 0) {
    throw new Error('ダウンロードする画像がありません');
  }

  try {
    const zip = new JSZip();
    const total = processedImages.length + 1; // +1 for processing info file
    
    // 各画像をZIPに追加（進行状況付き）
    for (let i = 0; i < processedImages.length; i++) {
      const processedImage = processedImages[i];
      const fileName = generateFileName(
        processedImage.originalImage.file.name,
        processedImage.appliedPreset,
        i
      );
      
      onProgress?.({
        current: i + 1,
        total,
        fileName,
        progress: Math.round(((i + 1) / total) * 100)
      });
      
      zip.file(fileName, processedImage.processedBlob);
    }
    
    // 処理情報ファイルを追加
    onProgress?.({
      current: total,
      total,
      fileName: 'processing_info.txt',
      progress: 100
    });
    
    const processingInfo = generateProcessingInfo(processedImages);
    zip.file('processing_info.txt', processingInfo);
    
    // ZIPファイルを生成
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
    
    // ダウンロード実行
    const finalZipFileName = zipFileName || generateZipFileName(processedImages);
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalZipFileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // メモリクリーンアップ
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('一括ダウンロードエラー:', error);
    throw new Error(`ZIPファイルの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};

/**
 * ダウンロード可能かチェック
 */
export const canDownload = (): boolean => {
  return typeof document !== 'undefined' && document !== null && 'createElement' in document;
};

/**
 * ファイルサイズの制限チェック
 */
export const checkFileSizeLimit = (processedImages: ProcessedImage[], maxSizeMB: number = 100): boolean => {
  const totalSize = processedImages.reduce((sum, img) => sum + img.fileSize, 0);
  const totalSizeMB = totalSize / (1024 * 1024);
  return totalSizeMB <= maxSizeMB;
};