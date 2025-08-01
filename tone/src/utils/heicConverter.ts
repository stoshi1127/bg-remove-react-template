import heic2any from 'heic2any';

/**
 * HEIC画像をJPEGに変換する
 * @param file HEIC形式のファイル
 * @returns 変換されたJPEGファイル
 */
export const convertHeicToJpeg = async (file: File): Promise<File> => {
  try {
    // heic2anyを使用してHEICをJPEGに変換
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9, // 高品質を維持
    });

    // Blobの配列が返される場合があるので、最初の要素を取得
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    // 新しいファイル名を生成（.heic/.heif を .jpg に変更）
    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');

    // 新しいFileオブジェクトを作成
    const convertedFile = new File([blob], newFileName, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });

    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error(`HEIC変換に失敗しました: ${file.name}`);
  }
};

/**
 * ファイルがHEIC形式かどうかを判定する
 * @param file チェックするファイル
 * @returns HEIC形式の場合true
 */
export const isHeicFile = (file: File): boolean => {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
};

/**
 * HEIC変換が必要な場合は変換し、そうでなければ元のファイルを返す
 * @param file 処理するファイル
 * @returns 処理されたファイル
 */
export const processFileForHeic = async (file: File): Promise<File> => {
  if (isHeicFile(file)) {
    return await convertHeicToJpeg(file);
  }
  return file;
};