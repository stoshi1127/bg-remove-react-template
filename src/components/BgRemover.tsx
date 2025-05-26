"use client";

import { useState, useCallback, useRef, useEffect } from "react";
// import { removeBackground } from "@imgly/background-removal"; // Removed
// import { env as ortEnv } from "onnxruntime-web"; // Removed
// ortEnv.wasm.simd = false; // Removed
// ortEnv.wasm.proxy = false; // Removed

// heic2any は必要な時だけ動的 import します

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
};

import UploadArea from "./UploadArea";
import PrimaryButton from "./PrimaryButton";

export default function BgRemoverMulti() {
  /* ------------ state --------------- */
  const [inputs,  setInputs]  = useState<InFile[]>([]);
  // outputs は inputs の中に outputUrl として統合するため、不要になる。
  // const [outputs, setOutputs] = useState<OutFile[]>([]); 
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false); // ドラッグ状態
  const fileInputRef = useRef<HTMLInputElement>(null); // ファイル入力への参照

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
          }
          return { ...input, status: newStatus, errorMessage: newMessage, outputUrl: newOutputUrl ?? input.outputUrl };
        } 
        return input;
      })
    );
  }, []);

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
        || /\\.(heic|heif)$/i.test(file.name)
        || (file.type === "" && /\\.(heic|heif)$/i.test(file.name));

      let previewUrl: string | undefined = undefined;
      if (file.type.startsWith("image/")) {
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
          const newName = input.originalFile.name.replace(/\\.[^.]+$/, ".jpg");
          
          // HEIC変換後のblobで新しいプレビューURLを生成するか検討
          // ここでは元のプレビューを維持し、変換後のblobは処理に使用
          setInputs(prev => prev.map(i => i.id === input.id ? {
            ...i,
            blob: finalBlob,
            name: newName,
            status: "ready"
            // HEIC変換後のプレビューが必要ならここで input.previewUrl も更新
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
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files);
    if (e.target) {
      e.target.value = '';
    }
  };
  
  // handleFileSelect: UploadArea用
  const handleFileSelect = async (file: File) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    await processFiles(dataTransfer.files);
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
    // setOutputs([]); // outputs は統合
    setProgress(0);
    setProcessedCount(0);
    // const newOutputs: OutFile[] = []; // outputs は統合
    let completedSuccessfullyCount = 0; // 正常完了したファイル数

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
                setMsg(prevMsg => prevMsg ? `${prevMsg}\\n${input.name}: ${errorMessage}` : `${input.name}: ${errorMessage}`);
            } else {
                updateInputStatus(input.id, "processing");
                const imageBlob = await response.blob();
                const url = URL.createObjectURL(imageBlob);
                // newOutputs.push({ url, name: input.name }); // outputs は統合
                // setOutputs([...newOutputs]); // outputs は統合
                updateInputStatus(input.id, "completed", undefined, url);
                completedSuccessfullyCount++;
            }
        } catch (fetchError: unknown) {
            console.error("Fetchエラー:", fetchError, input.name);
            const errorMessage = typeof fetchError === 'object' && fetchError !== null && 'message' in fetchError && typeof fetchError.message === 'string'
              ? `ネットワークエラーまたはサーバー接続不可: ${fetchError.message}`
              : "ネットワークエラーまたはサーバー接続不可（詳細不明）";
            updateInputStatus(input.id, "error", errorMessage);
            setMsg(prevMsg => prevMsg ? `${prevMsg}\\n${input.name}: ${errorMessage}` : `${input.name}: ${errorMessage}`);
        }
        
        setProcessedCount(prev => prev + 1);
        const currentProgress = Math.round(((i + 1) / filesToProcess.length) * 100);
        setProgress(currentProgress);
      }      
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
      const totalProcessed = filesToProcess.length;
      const anyErrors = inputs.some(input => input.status === "error");

      if (totalProcessed > 0) {
        if (anyErrors) {
            setMsg(prev => prev ? prev + "\n一部ファイルでエラーが発生しました。" : "一部のファイルでエラーが発生しました。詳細は各ファイルを確認してください。");
        } else if (completedSuccessfullyCount === totalProcessed) {
            setMsg("すべてのファイルの処理が正常に完了しました。");
        } else {
            // 全て成功でもなく、明確なエラーが記録されていないが、成功数と処理対象数が一致しない場合
            setMsg("一部ファイルの処理状況が不明です。リストを確認してください。");
        }
      } else if (inputs.length > 0 && totalProcessed === 0) {
        // msgがセットされていなければ（例えばHEIC変換待ちなどで処理対象が0だった場合）
        if (!msg) setMsg("処理対象となるファイルがありません。");
      }
    }
  };

  /* ------------ UI --------------- */
  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-xl shadow-2xl">
      {/* ファイル入力エリア (ドラッグ＆ドロップ対応) */}
      <UploadArea
        onFileSelect={handleFileSelect}
        accept="image/*,.heic,.heif"
        label="クリックまたはドラッグ＆ドロップでファイルを選択"
        description="画像ファイル (JPG, PNG, HEIC等) を複数選択できます"
        shadow="shadow-2xl"
        disabled={busy}
      />
      
      {/* 選択されたファイルリスト */}
      {inputs.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-lg font-semibold text-gray-800">選択されたファイル:</h3>
          <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 shadow-sm bg-white">
            {inputs.map(input => (
              <li key={input.id} className={`p-3 flex items-start space-x-3 transition-all duration-300 ease-in-out ${
                input.status === 'completed' ? 'bg-green-50' :
                input.status === 'error' ? 'bg-red-50' : 'bg-white'
              }`}>
                {(input.outputUrl || input.previewUrl) && (
                  <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    <img 
                      src={input.outputUrl ?? input.previewUrl} 
                      alt={`プレビュー ${input.name}`}
                      className="object-contain w-full h-full"
                    />
                  </div>
                )}
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
                  {input.errorMessage && <p className="text-xs text-red-600 mt-0.5">詳細: {input.errorMessage}</p>}
                </div>
                <div className="flex-shrink-0 flex flex-col items-end space-y-1">
                  {input.outputUrl && input.status === 'completed' && (
                    <a
                      href={input.outputUrl}
                      download={input.name.replace(/\\.[^.]+$/, "") + "-bg-removed.png"}
                      className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors whitespace-nowrap"
                    >
                      ダウンロード
                    </a>
                  )}
                  {input.status === 'error' && (
                    <button 
                      onClick={() => {
                          updateInputStatus(input.id, 'ready', undefined);
                          setMsg(null); 
                      }}
                      className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 transition-colors whitespace-nowrap"
                      title="このファイルで再試行（エラークリア）"
                    >
                      再試行
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 背景除去ボタン */}
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
