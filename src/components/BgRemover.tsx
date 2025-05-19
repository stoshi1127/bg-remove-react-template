"use client";

import { useState, useCallback, useRef } from "react";
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
  errorMessage?: string; // エラーメッセージ
  outputUrl?: string;   // 処理後の画像URL (背景除去成功時)
};
// OutFile は InFile に統合されたため不要になる可能性あり。一旦残す。
type OutFile = { url: string; name: string }; 

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

  // 特定の入力ファイルのステータスを更新するヘルパー関数
  const updateInputStatus = useCallback((id: string, newStatus: FileStatus, newMessage?: string, newOutputUrl?: string) => {
    setInputs(prevInputs => 
      prevInputs.map(input => 
        input.id === id 
          ? { ...input, status: newStatus, errorMessage: newMessage, outputUrl: newOutputUrl ?? input.outputUrl } 
          : input
      )
    );
  }, []);

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setInputs([]);
    setMsg(null); setProgress(0); setProcessedCount(0);
    
    const newInputs: InFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = crypto.randomUUID();
      const isHeic = file.type.includes("heic")
        || /\\.(heic|heif)$/i.test(file.name)
        || (file.type === "" && /\\.(heic|heif)$/i.test(file.name));

      newInputs.push({ 
        id, 
        originalFile: file, 
        blob: file, 
        name: file.name, 
        status: isHeic ? "pending" : "ready"
      });
    }
    setInputs(newInputs);

    for (const input of newInputs) {
      if (input.status === "pending") { // "pending" は HEIC の可能性があるもの
        updateInputStatus(input.id, "converting");
        try {
          const { default: heic2any } = await import("heic2any");
          const convertedBlob = await heic2any({ blob: input.originalFile, toType: "image/jpeg" });
          const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          const newName = input.originalFile.name.replace(/\\.[^.]+$/, ".jpg");
          
          setInputs(prev => prev.map(i => i.id === input.id ? {
            ...i,
            blob: finalBlob,
            name: newName,
            status: "ready"
          } : i));
        } catch (err: any) {
          console.error("HEIC 変換エラー:", err, input.name);
          let errMsg = "HEIC 変換エラー";
          if (err?.code === 1) { 
             errMsg = "HEIC形式ではないか、サポートされていない形式です。";
          }
          updateInputStatus(input.id, "error", `${input.name}: ${errMsg}`);
        }
      }
    }
  }, [updateInputStatus]);

  /* ------------ ① ファイル選択（複数 OK） --------------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files);
    // ファイル選択後にinputの値をクリアして同じファイルを選択できるようにする
    if (e.target) {
      e.target.value = '';
    }
  };
  
  // ドラッグアンドドロップハンドラ
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 必要であればここでドロップエフェクトを設定 (e.dataTransfer.dropEffect)
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [processFiles]);

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
        } catch (fetchError: any) {
            console.error("Fetchエラー:", fetchError, input.name);
            const errorMessage = `ネットワークエラーまたはサーバー接続不可: ${fetchError.message}`;
            updateInputStatus(input.id, "error", errorMessage);
            setMsg(prevMsg => prevMsg ? `${prevMsg}\\n${input.name}: ${errorMessage}` : `${input.name}: ${errorMessage}`);
        }
        
        setProcessedCount(prev => prev + 1);
        const currentProgress = Math.round(((i + 1) / filesToProcess.length) * 100);
        setProgress(currentProgress);
      }
    } catch (err: any) {
      console.error("全体的な処理エラー:", err);
      setMsg(err.message || "背景除去中に予期せぬエラーが発生しました。");
      const currentlyProcessingFile = inputs.find(i => i.status === "uploading" || i.status === "processing");
      if (currentlyProcessingFile) {
        updateInputStatus(currentlyProcessingFile.id, "error", "予期せぬエラーにより処理中断");
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
      <div 
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()} // divクリックでinput発火
        className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out 
                    ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          id="file-upload" // ラベルとの紐付けは残す
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          onChange={handleFileChange}
          disabled={busy}
          className="hidden" // input自体は非表示に
        />
        <div className="flex flex-col items-center justify-center space-y-2 text-gray-600">
          <svg className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p className="text-lg font-medium">
            {isDragging ? "ここにファイルをドロップ" : "クリックまたはドラッグ＆ドロップでファイルを選択"}
          </p>
          <p className="text-xs text-gray-500">画像ファイル (JPG, PNG, HEIC等) を複数選択できます</p>
        </div>
      </div>
      
      {/* 選択されたファイルリスト */}
      {inputs.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-lg font-semibold text-gray-800">選択されたファイル:</h3>
          <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 shadow-sm bg-white">
            {inputs.map(input => (
              <li key={input.id} className={`p-3 flex justify-between items-center transition-all duration-300 ease-in-out ${
                input.status === 'completed' ? 'bg-green-50' :
                input.status === 'error' ? 'bg-red-50' : 'bg-white'
              }`}>
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
                {input.outputUrl && input.status === 'completed' && (
                  <a
                    href={input.outputUrl}
                    download={input.name.replace(/\\.[^.]+$/, "") + "-bg-removed.png"}
                    className="ml-4 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    ダウンロード
                  </a>
                )}
                 {input.status === 'error' && (
                  <button 
                    onClick={() => {
                        updateInputStatus(input.id, 'ready', undefined);
                        setMsg(null); // 個別リトライ時は全体メッセージを一旦クリア
                    }}
                    className="ml-4 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 transition-colors"
                    title="このファイルで再試行（エラークリア）"
                   >
                     再試行
                   </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 背景除去ボタン */}
      {inputs.length > 0 && inputs.some(i => i.status === 'ready' || i.status === 'error') && (
        <button
          onClick={handleRemove}
          disabled={busy || inputs.filter(i => i.status === 'ready').length === 0}
          className="w-full py-3.5 px-4 rounded-lg font-bold text-white shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-100"
        >
          {busy 
            ? `処理中... (${processedCount}/${inputs.filter(i => i.status === 'ready' || i.status === 'uploading' || i.status === 'processing' || i.status === 'completed' || i.status === 'error').length}枚, ${progress}%)` 
            : `選択した画像（${inputs.filter(i => i.status === 'ready').length}枚）の背景を透過する`}
        </button>
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
