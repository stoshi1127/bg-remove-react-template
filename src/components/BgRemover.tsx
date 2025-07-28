'use client'

import { useState, useCallback, useRef, useEffect } from "react";
// heic2any は必要な時だけ動的 import します
import Link from "next/link";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ファイルステータスの型定義
type FileStatus = 
  | "pending"        // 待機中（HEIC変換前または処理待ち）
  | "converting"     // HEIC変換中
  | "ready"          // 処理準備完了（HEIC変換後または元々JPEG/PNG）
  | "uploading"      // アップロード中
  | "processing"     // 背景除去処理中
  | "completed"      // 完了
  | "error";         // エラー発生

type InFile  = { 
  id: string;          // ユニークID
  originalFile: File;  // 元のファイルオブジェクト
  blob: File | Blob;   // 処理用Blob (HEIC変換後は変換後のBlob)
  name: string;        // ファイル名
  status: FileStatus;  // 現在のステータス
  previewUrl?: string; // 追加: 元ファイルのプレビュー用URL
  errorMessage?: string; // エラーメッセージ
  outputUrl?: string;   // 処理後の画像URL (背景除去成功時)
  boundingBox?: { x: number, y: number, width: number, height: number }; // 追加: 対象物のバウンディングボックス
};

import UploadArea from "./UploadArea";
import PrimaryButton from "./PrimaryButton";
import RatioButton from "./RatioButton";

// 背景テンプレートの定義
const templates = [
  { name: "白", src: "#FFFFFF" },
  { name: "グラデーション", src: "/templates/gradient-blue-purple.svg" },
  { name: "レンガ", src: "/templates/brick-wall.jpg" },
  { name: "ボケ", src: "/templates/bokeh-lights.jpg" },
  { name: "木目", src: "/templates/wood.jpg" },
  { name: "壁紙", src: "/templates/wallpaper.jpg" },
];

const aspectRatios = [
  { key: '1:1', label: '1:1 (正方形)' },
  { key: '16:9', label: '16:9 (ワイド)' },
  { key: '4:3', label: '4:3 (標準)' },
  { key: 'original', label: '元画像に合わせる' },
  { key: 'fit-subject', label: '被写体にフィット' }
];

export default function BgRemoverMulti() {
  
  /* ------------ state --------------- */
  const [inputs,  setInputs]  = useState<InFile[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState<string>('#FFFFFF');
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
  
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  

  // オブジェクトURLを管理するためのRef
  const objectUrlsRef = useRef<string[]>([]);

  // オブジェクトURLをクリーンアップする関数
  const cleanupObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  // 新しいオブジェクトURLを登録
  const registerObjectUrl = (url: string) => {
    objectUrlsRef.current.push(url);
  };

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      cleanupObjectUrls();
    };
  }, [cleanupObjectUrls]);

  // 特定の入力ファイルのステータスを更新するヘルパー関数
  const updateInputStatus = useCallback((id: string, newStatus: FileStatus, newMessage?: string, newOutputUrl?: string) => {
    setInputs(prevInputs => 
      prevInputs.map(input => {
        if (input.id === id) {
          if (newOutputUrl && newOutputUrl !== input.outputUrl) {
            // 新しい outputUrl が設定される場合、古いものがあれば解放候補（ただし現状はcleanupObjectUrlsで一括）
            // もし input.outputUrl が objectUrlsRef にあれば削除する処理も検討可能
            registerObjectUrl(newOutputUrl); // 新しいURLを登録
            // ここでバウンディングボックス計算をトリガー
            calculateBoundingBox(newOutputUrl).then(bbox => {
                setInputs(prev => prev.map(i => i.id === id ? { ...i, boundingBox: bbox } : i));
            }).catch(err => {
                console.error("Bounding box calculation failed:", err);
                // エラーハンドリング：必要に応じてエラーメッセージを表示するなど
            });
          }
          return { ...input, status: newStatus, errorMessage: newMessage, outputUrl: newOutputUrl ?? input.outputUrl };
        } 
        return input;
      })
    );
  }, []);

  // 画像合成関数
  const applyTemplate = async (
    originalImageUrl: string, 
    templateUrl: string, 
    ratio: string, 
    bbox: { x: number, y: number, width: number, height: number } | undefined
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not get canvas context'));
        }

        const originalImg = new Image();
        originalImg.crossOrigin = "anonymous";
        originalImg.onload = () => {
          const baseWidth = 1200;
          let targetWidth = baseWidth;
          let targetHeight = baseWidth;

          if (ratio === 'fit-subject') {
            if (bbox && bbox.width > 0 && bbox.height > 0) {
              targetWidth = bbox.width;
              targetHeight = bbox.height;
            } else {
              // フォールバック
              targetWidth = originalImg.naturalWidth;
              targetHeight = originalImg.naturalHeight;
            }
          } else if (ratio === 'original') {
            targetWidth = originalImg.naturalWidth;
            targetHeight = originalImg.naturalHeight;
          } else if (ratio === '16:9') {
            targetWidth = baseWidth; // 幅は固定
            targetHeight = Math.round(baseWidth * 9 / 16);
          } else if (ratio === '4:3') {
            targetWidth = baseWidth; // 幅は固定
            targetHeight = Math.round(baseWidth * 3 / 4);
          }
          // '1:1' はデフォルトの baseWidth x baseWidth

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const drawFinalImage = () => {
            if (ratio === 'fit-subject' && bbox && bbox.width > 0) {
              // 被写体のバウンディングボックスを使って元画像から切り出して描画
              ctx.drawImage(
                originalImg,
                bbox.x,
                bbox.y,
                bbox.width,
                bbox.height,
                0,
                0,
                targetWidth,
                targetHeight
              );
            } else {
              // それ以外の比率では、中央に余白をもって描画
              // 「元画像に合わせる」場合はパディングなし
              const padding = ratio === 'original' ? 0 : 100;
              const maxW = targetWidth - padding;
              const maxH = targetHeight - padding;
              const scale = Math.min(maxW / originalImg.width, maxH / originalImg.height);
              const w = originalImg.width * scale;
              const h = originalImg.height * scale;
              const x = (targetWidth - w) / 2;
              const y = (targetHeight - h) / 2;
              ctx.drawImage(originalImg, x, y, w, h);
            }
            resolve(canvas.toDataURL('image/png'));
          };

          // テンプレートが透明か、色か、画像かで処理を分岐
          if (templateUrl === 'transparent') {
            drawFinalImage();
          } else if (templateUrl.startsWith('#')) {
              ctx.fillStyle = templateUrl;
              ctx.fillRect(0, 0, targetWidth, targetHeight);
              drawFinalImage();
          } else { 
              const templateImg = new Image();
              templateImg.crossOrigin = "anonymous";
              templateImg.onload = () => {
                  // テンプレート画像を中央に描画（アスペクト比を維持して全体をカバー）
                  const templateAspectRatio = templateImg.width / templateImg.height;
                  const canvasAspectRatio = targetWidth / targetHeight;
                  let sx, sy, sWidth, sHeight;

                  if (templateAspectRatio > canvasAspectRatio) {
                      sHeight = templateImg.height;
                      sWidth = sHeight * canvasAspectRatio;
                      sx = (templateImg.width - sWidth) / 2;
                      sy = 0;
                  } else {
                      sWidth = templateImg.width;
                      sHeight = sWidth / canvasAspectRatio;
                      sx = 0;
                      sy = (templateImg.height - sHeight) / 2;
                  }
                  ctx.drawImage(templateImg, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
                  drawFinalImage();
              };
              templateImg.onerror = () => reject(new Error("Template image loading failed"));
              templateImg.src = templateUrl;
          }
        }
        originalImg.onerror = () => reject(new Error("Original image loading failed"));
        originalImg.src = originalImageUrl;
    });
  };

  // バウンディングボックスを計算する関数
  const calculateBoundingBox = async (imageUrl: string): Promise<{ x: number, y: number, width: number, height: number } | undefined> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject("Could not get canvas context");
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;
        let hasTransparent = false;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const alpha = pixels[idx + 3];

            if (alpha > 0) { // 透明でないピクセル
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            } else {
              hasTransparent = true;
            }
          }
        }

        // 透明な部分が全くない画像の場合は画像全体を返す
        if (!hasTransparent || (minX > maxX || minY > maxY)) {
             resolve({ x: 0, y: 0, width: canvas.width, height: canvas.height });
        } else {
             resolve({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
        }
      };
      img.onerror = (e) => reject("Image loading error for bounding box calculation" + e);
      img.src = imageUrl;
    });
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // 既存のオブジェクトURLをクリーンアップ
    cleanupObjectUrls(); 
    // inputs をクリアする前に、各 input の previewUrl と outputUrl も revoke することが望ましいが、
    // cleanupObjectUrls ですべてクリアしているので、ここでは setInputs のみ。

    setInputs([]);
    setMsg(null); setProgress(0); setProcessedCount(0);
    
    const newInputs: InFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = crypto.randomUUID();
      const isHeic = file.type.includes("heic")
        || /\.(heic|heif)$/i.test(file.name)
        || (file.type === "" && /\.(heic|heif)$/i.test(file.name));

      let previewUrl: string | undefined = undefined;
      if (file.type.startsWith("image/") || isHeic) {
        previewUrl = URL.createObjectURL(file);
        registerObjectUrl(previewUrl);
      }

      newInputs.push({ 
        id, 
        originalFile: file, 
        blob: file, 
        name: file.name, 
        status: isHeic ? "pending" : "ready",
        previewUrl, // 追加
      });
    }
    setInputs(newInputs);

    for (const input of newInputs) {
      if (input.status === "pending") { 
        updateInputStatus(input.id, "converting");
        try {
          const { default: heic2any } = await import("heic2any");
          const convertedBlob = await heic2any({ blob: input.originalFile, toType: "image/jpeg" });
          const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          const newName = input.originalFile.name.replace(/\.[^.]+$/, ".jpg");
          
          // HEIC変換後の新しいプレビューURLを生成
          const newPreviewUrl = URL.createObjectURL(finalBlob);
          registerObjectUrl(newPreviewUrl);
          
          setInputs(prev => prev.map(i => i.id === input.id ? {
            ...i,
            blob: finalBlob,
            name: newName,
            status: "ready",
            previewUrl: newPreviewUrl // HEIC変換後のプレビューURLに更新
          } : i));
        } catch (err: unknown) {
          console.error("HEIC 変換エラー:", err, input.name);
          let errMsg = "HEIC 変換エラー";
          if (typeof err === 'object' && err !== null && 'code' in err && err.code === 1) { 
             errMsg = "HEIC形式ではないか、サポートされていない形式です。";
          }
          const detailMsg = typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? `: ${err.message}` : '';
          updateInputStatus(input.id, "error", `${input.name}: ${errMsg}${detailMsg}`);
        }
      }
    }
  }, [updateInputStatus, cleanupObjectUrls]); // cleanupObjectUrls を依存配列に追加

  /* ------------ ① ファイル選択（複数 OK） --------------- */
  // handleFileSelect: UploadArea用（単一ファイル向け、後方互換性のため残す）
  const handleFileSelect = async (file: File) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    await processFiles(dataTransfer.files);
  };

  // handleFilesSelect: UploadArea用（複数ファイル向け）
  const handleFilesSelect = async (files: FileList) => {
    await processFiles(files);
  };
  
  /* ------------ ② 背景除去：API経由で順次実行 --------------- */
  const handleRemove = async () => {
    const filesToProcess = inputs.filter(input => input.status === "ready" || input.status === "error");
    if (busy || filesToProcess.length === 0) {
      if(filesToProcess.length === 0 && inputs.length > 0) {
        setMsg("処理可能なファイルがありません。HEIC変換が完了しているか、エラーが解消されているか確認してください。");
      }
      return;
    }

    setBusy(true);
    setMsg(null);
    setProgress(0);
    setProcessedCount(0);

    const processPromises: Promise<void>[] = [];

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const input = filesToProcess[i];
        if (input.status === 'error') {
            updateInputStatus(input.id, 'ready', undefined);
        }
        updateInputStatus(input.id, "uploading");
        const formData = new FormData();
        formData.append("file", input.blob, input.name);

        try {
            const response = await fetch("/api/remove-bg", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "不明なサーバーエラー" }));
                const errorMessage = `背景除去エラー: ${errorData.error || response.statusText}`;
                updateInputStatus(input.id, "error", errorMessage);
                setMsg(prevMsg => prevMsg ? `${prevMsg}\n${input.name}: ${errorMessage}` : `${input.name}: ${errorMessage}`);
            } else {
                updateInputStatus(input.id, "processing");
                const imageBlob = await response.blob();
                
                // BlobをData URLに変換し、必要であればテンプレートを適用するPromiseを作成
                const dataUrlPromise = new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const removedBgUrl = reader.result as string;
                            
                            // 背景除去後の画像から、まず被写体のバウンディングボックスを計算する
                            const subjectBbox = await calculateBoundingBox(removedBgUrl);

                            let finalUrl = removedBgUrl;
                            
                            // アスペクト比がデフォルトでない場合、またはテンプレートが選択されている場合は常に画像処理を行う
                            if (selectedRatio !== '1:1' || selectedTemplate) {
                              const templateUrl = selectedTemplate ?? 'transparent';
                              // 計算したバウンディングボックスをテンプレート適用関数に渡す
                              finalUrl = await applyTemplate(removedBgUrl, templateUrl, selectedRatio, subjectBbox);
                            }

                            updateInputStatus(input.id, "completed", undefined, finalUrl);
                            resolve();
                        } catch (e) {
                            console.error("Template application failed", e);
                            const errorMessage = e instanceof Error ? e.message : "不明なエラー";
                            updateInputStatus(input.id, "error", `テンプレート適用エラー: ${errorMessage}`);
                            setMsg(prev => prev ? `${prev}\n${input.name}: テンプレート適用エラー` : `${input.name}: テンプレート適用エラー`);
                            reject(e);
                        }
                    };
                    reader.onerror = (e) => {
                        console.error("Blob to Data URL conversion failed", e);
                        updateInputStatus(input.id, "error", `処理済み画像の読み込みエラー: ${input.name}`);
                        setMsg(prevMsg => prevMsg ? `${prevMsg}\n${input.name}: 処理済み画像の読み込みに失敗しました。` : `${input.name}: 処理済み画像の読み込みに失敗しました。`);
                        reject(e);
                    };
                    reader.readAsDataURL(imageBlob);
                });
                
                processPromises.push(dataUrlPromise);
            }
        } catch (fetchError: unknown) {
            console.error("Fetchエラー:", fetchError, input.name);
            const errorMessage = typeof fetchError === 'object' && fetchError !== null && 'message' in fetchError && typeof fetchError.message === 'string'
              ? `ネットワークエラーまたはサーバー接続不可: ${fetchError.message}`
              : "ネットワークエラーまたはサーバー接続不可（詳細不明）";
            updateInputStatus(input.id, "error", errorMessage);
            setMsg(prevMsg => prevMsg ? `${prevMsg}\n${input.name}: ${errorMessage}` : `${input.name}: ${errorMessage}`);
        }
        
        setProcessedCount(prev => prev + 1);
        const currentProgress = Math.round(((i + 1) / filesToProcess.length) * 100);
        setProgress(currentProgress);
      }
      
      // 全ての非同期処理の完了を待機
      await Promise.allSettled(processPromises);
      
    } catch (err: unknown) {
      console.error("全体的な処理エラー:", err);
      const generalErrorMessage = typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
        ? err.message : "背景除去中に予期せぬエラーが発生しました。詳細不明。";
      setMsg(generalErrorMessage);
      const currentlyProcessingFile = inputs.find(i => i.status === "uploading" || i.status === "processing");
      if (currentlyProcessingFile) {
        updateInputStatus(currentlyProcessingFile.id, "error", `予期せぬエラーにより処理中断: ${generalErrorMessage}`);
      }
    } finally {
      setBusy(false);
      
      // 少し待ってから状態を確認（React の状態更新が完了するまで）
      setTimeout(() => {
        setInputs(currentInputs => {
          const totalProcessed = filesToProcess.length;
          const actualCompletedCount = currentInputs.filter(input => input.status === "completed").length;
          const actualErrorCount = currentInputs.filter(input => input.status === "error").length;
          const anyErrors = actualErrorCount > 0;

          if (totalProcessed > 0) {
            if (anyErrors && actualCompletedCount > 0) {
                // 一部成功、一部エラー
                setMsg(`処理完了: ${actualCompletedCount}枚成功、${actualErrorCount}枚エラー。詳細は各ファイルを確認してください。`);
            } else if (anyErrors && actualCompletedCount === 0) {
                // 全てエラー
                setMsg("すべてのファイルでエラーが発生しました。詳細は各ファイルを確認してください。");
            } else if (actualCompletedCount === totalProcessed) {
                // 全て成功
                setMsg(`すべてのファイル（${actualCompletedCount}枚）の処理が正常に完了しました。`);
            } else {
                // 処理中や準備完了状態のファイルがある場合
                const processingCount = currentInputs.filter(input => 
                  input.status === "processing" || input.status === "uploading"
                ).length;
                if (processingCount > 0) {
                  setMsg(`処理中のファイルがあります。完了: ${actualCompletedCount}枚、処理中: ${processingCount}枚。`);
                } else {
                  setMsg(`処理完了: ${actualCompletedCount}枚。残りのファイルの状況を確認してください。`);
                }
            }
          } else if (currentInputs.length > 0 && totalProcessed === 0) {
            setMsg("処理対象となるファイルがありません。");
          }
          
          return currentInputs; // 状態は変更せず、メッセージのみ更新
        });
      }, 100);
    }
  };

  /* ------------ ③ 全てダウンロード --------------- */
  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const completedFiles = inputs.filter(input => input.status === 'completed' && input.outputUrl);

    if (completedFiles.length === 0) {
      setMsg("ダウンロード対象のファイルがありません。");
      return;
    }

    setMsg("ZIPファイルを準備中です...");
    setBusy(true);

    try {
      for (const input of completedFiles) {
        if (input.outputUrl) {
          // Data URLからBlobを生成
          const response = await fetch(input.outputUrl);
          const blob = await response.blob();
          // オリジナルのファイル名から拡張子を取り、.pngを付与
          const fileName = `processed_${input.name.replace(/\.[^.]+$/, ".png")}`;
          zip.file(fileName, blob);
        }
      }

      zip.generateAsync({ type: "blob" })
        .then(content => {
          saveAs(content, "processed_images.zip");
          setMsg("ZIPファイルのダウンロードが開始されました。");
        })
        .catch(err => {
          console.error("ZIP生成エラー:", err);
          setMsg(`ZIPファイルの生成に失敗しました: ${err.message}`);
        });

    } catch (err) {
      console.error("一括ダウンロード処理エラー:", err);
      const errorMessage = err instanceof Error ? err.message : "不明なエラー";
      setMsg(`エラーが発生しました: ${errorMessage}`);
    } finally {
      setBusy(false);
    }
  };

  /* ------------ UI --------------- */
  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-xl">
      {busy && (
        <div className="flex items-center justify-center my-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-4 border-blue-500 border-opacity-60"></div>
          <span className="ml-3 text-base font-medium text-blue-700">処理中...</span>
        </div>
      )}
      {/* ファイル入力エリア (ドラッグ＆ドロップ対応) */}
      <UploadArea
        onFileSelect={handleFileSelect}
        onFilesSelect={handleFilesSelect}
        multiple={true}
        accept="image/*,.heic,.heif"
        label="クリックまたはドラッグ＆ドロップでファイルを選択"
        description="背景を切り抜きたい画像 (JPG, PNG, HEIC等) を選択してください"
        shadow="shadow-2xl"
        disabled={busy}
      />

      {/* アスペクト比選択エリア */}
      {inputs.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-lg font-semibold text-gray-800">出力サイズを選択:</h3>
          <div className="flex flex-wrap gap-3">
            {aspectRatios.map(ratio => (
              <RatioButton
                key={ratio.key}
                label={ratio.label}
                isActive={selectedRatio === ratio.key}
                onClick={() => setSelectedRatio(ratio.key)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 背景テンプレート選択エリア */}
      {inputs.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-lg font-semibold text-gray-800">背景をカスタマイズ (オプション):</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {/* 「背景なし」オプション */}
            <div
              onClick={() => setSelectedTemplate(null)}
              className={`cursor-pointer rounded-lg border-2 ${!selectedTemplate ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-blue-400'} overflow-hidden relative aspect-square flex items-center justify-center bg-gray-100 transition-all`}
            >
              <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}></div>
              <span className="relative z-10 text-sm font-medium text-gray-600 bg-white bg-opacity-75 px-2 py-1 rounded">なし</span>
            </div>
            {/* カラーピッカー */}
            <div
              onClick={() => setSelectedTemplate(customColor)}
              className={`cursor-pointer rounded-lg border-2 ${selectedTemplate === customColor ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-blue-400'} overflow-hidden relative aspect-square flex items-center justify-center transition-all`}
              style={{ backgroundColor: customColor }}
            >
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setSelectedTemplate(e.target.value);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="color-picker"
                title="色を選択"
              />
              <label htmlFor="color-picker" className="relative z-10 text-sm font-medium text-black mix-blend-difference bg-white bg-opacity-75 px-2 py-1 rounded cursor-pointer">
                カスタム
              </label>
            </div>
            {/* テンプレート画像 */}
            {templates.map((template) => (
              <div
                key={template.src}
                onClick={() => setSelectedTemplate(template.src)}
                className={`cursor-pointer rounded-lg border-2 ${selectedTemplate === template.src ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent hover:border-blue-400'} overflow-hidden relative aspect-square transition-all`}
              >
                {template.src.startsWith('#') ? (
                  <div style={{ backgroundColor: template.src }} className="w-full h-full"></div>
                ) : (
                  <img src={template.src} alt={template.name} className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-0.5 font-semibold">{template.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 選択されたファイルリスト */}
      {inputs.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-lg font-semibold text-gray-800">選択されたファイル:</h3>
          <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 shadow-sm bg-white">
            {inputs.map(input => (
              <li key={input.id} className={`p-3 transition-all duration-300 ease-in-out ${
                input.status === 'completed' ? 'bg-green-50' :
                input.status === 'error' ? 'bg-red-50' : 'bg-white'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    {input.outputUrl ? (
                      <img 
                        src={input.outputUrl} 
                        alt={`処理済み ${input.name}`}
                        className="object-contain w-full h-full"
                      />
                    ) : input.previewUrl && (input.status === 'ready' || input.status === 'uploading' || input.status === 'processing' || input.status === 'completed') ? (
                      <img 
                        src={input.previewUrl} 
                        alt={`プレビュー ${input.name}`}
                        className="object-contain w-full h-full"
                        onError={(e) => {
                          // プレビューの読み込みエラー時（HEICファイルなど）はプレースホルダーを表示
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.fallback-icon')) {
                            const fallbackDiv = document.createElement('div');
                            fallbackDiv.className = 'fallback-icon flex flex-col items-center justify-center text-gray-500 w-full h-full';
                            fallbackDiv.innerHTML = `
                              <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span class="text-xs">画像</span>
                            `;
                            parent.appendChild(fallbackDiv);
                          }
                        }}
                      />
                    ) : input.status === 'converting' ? (
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-1"></div>
                        <span className="text-xs">変換中</span>
                      </div>
                    ) : input.status === 'pending' ? (
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">待機中</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">画像</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{input.name}</p>
                    <p className={`text-xs font-medium ${
                      input.status === 'error' ? 'text-red-700' :
                      input.status === 'completed' ? 'text-green-700' :
                      input.status === 'processing' || input.status === 'uploading' ? 'text-blue-600' :
                      'text-gray-500'
                    }`}>
                      ステータス: 
                      {input.status === 'pending' && '待機中'}
                      {input.status === 'converting' && 'HEIC変換中...'}
                      {input.status === 'ready' && '準備完了'}
                      {input.status === 'uploading' && 'アップロード中...'}
                      {input.status === 'processing' && '背景除去中...'}
                      {input.status === 'completed' && '完了 🎉'}
                      {input.status === 'error' && 'エラー'}
                    </p>
                    {input.errorMessage && <p className="text-xs text-red-600 mt-0.5 break-words">詳細: {input.errorMessage}</p>}
                  </div>
                </div>
                
                {/* ボタンエリア - スマホでは下に配置 */}
                {(input.outputUrl && input.status === 'completed') || input.status === 'error' ? (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    {input.outputUrl && input.status === 'completed' && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {/* ダウンロードボタン */}
                        <a href={input.outputUrl} download={`processed_${input.name.replace(/\.[^.]+$/, ".png")}`} className="flex-1 sm:flex-none">
                          <PrimaryButton variant="outline" size="sm" className="w-full sm:w-auto">
                            ダウンロード
                          </PrimaryButton>
                        </a>
                        {/* イージートリミングで編集ボタン - Linkを使用 */}
                        {input.boundingBox && input.outputUrl && (
                          <Link 
                            href="/trim"
                            onClick={() => {
                              // localStorageに画像URLとバウンディングボックスを保存
                              // outputUrlは既にData URLになっているはず
                              localStorage.setItem('trimImage', input.outputUrl || '');
                              localStorage.setItem('trimBoundingBox', JSON.stringify(input.boundingBox));
                              // ページ遷移はLinkコンポーネントが行う
                            }}
                            passHref // Next.js 13/14のLinkで子要素がインタラクティブな場合に使用が推奨
                            target="_blank" // ここで新しいタブで開く設定を追加
                            rel="noopener noreferrer" // セキュリティのために追加
                            className="flex-1 sm:flex-none"
                          >
                            <PrimaryButton size="sm" className="w-full sm:w-auto">
                              イージートリミングで編集
                            </PrimaryButton>
                          </Link>
                        )}
                      </div>
                    )}
                    {input.status === 'error' && (
                      <button 
                        onClick={() => {
                          updateInputStatus(input.id, 'ready', undefined);
                          setMsg(null); 
                        }}
                        className="w-full sm:w-auto px-3 py-1.5 rounded-md text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 transition-colors"
                        title="このファイルで再試行（エラークリア）"
                      >
                        再試行
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 背景除去・一括ダウンロードボタン */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {inputs.length > 0 && inputs.some(i => i.status === 'ready' || i.status === 'error') && (
          <PrimaryButton
            onClick={handleRemove}
            disabled={busy || inputs.filter(i => i.status === 'ready').length === 0}
          >
            {busy
              ? `処理中... (${processedCount}/${inputs.filter(i => i.status === 'ready' || i.status === 'uploading' || i.status === 'processing' || i.status === 'completed' || i.status === 'error').length}枚, ${progress}%)`
              : `選択した画像（${inputs.filter(i => i.status === 'ready').length}枚）の背景を透過する`}
          </PrimaryButton>
        )}
        {inputs.filter(input => input.status === 'completed').length > 1 && (
          <PrimaryButton onClick={handleDownloadAll} disabled={busy} variant="secondary">
            すべてダウンロード (.zip)
          </PrimaryButton>
        )}
      </div>

      {/* 進捗バー */}
      {busy && (
        <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 shadow-inner overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300 ease-out text-xs text-white text-center leading-none"
            style={{ width: `${progress}%` }}
          >
            {progress > 10 && `${progress}%`}
            </div>
        </div>
      )}

      {/* 全体メッセージ */}
      {msg && <p className={`text-sm p-3.5 rounded-md shadow ${inputs.some(i => i.status === 'error') && (msg.includes("エラー") || msg.includes("失敗")) ? 'text-red-800 bg-red-100 border border-red-300' : 'text-gray-800 bg-gray-100 border border-gray-300'}`}>{msg}</p>}
    </div>
  );
}