"use client";

import { useState } from "react";
// import { removeBackground } from "@imgly/background-removal"; // Removed
// import { env as ortEnv } from "onnxruntime-web"; // Removed
// ortEnv.wasm.simd = false; // Removed
// ortEnv.wasm.proxy = false; // Removed

// heic2any は必要な時だけ動的 import します

type InFile  = { blob: File | Blob; name: string };
type OutFile = { url: string; name: string };

export default function BgRemoverMulti() {
  /* ------------ state --------------- */
  const [inputs,  setInputs]  = useState<InFile[]>([]);
  const [outputs, setOutputs] = useState<OutFile[]>([]);
  const [busy,    setBusy]    = useState(false); // isLoading と同義
  const [msg,     setMsg]     = useState<string | null>(null);

  /* ------------ ① ファイル選択（複数 OK） --------------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setInputs([]); setOutputs([]); setMsg(null);
    const processed: InFile[] = [];

    for (const file of files) {
      const heic = file.type.includes("heic")
        || /\.(heic|heif)$/i.test(file.name)
        || (file.type === "" && /\.(heic|heif)$/i.test(file.name));

      if (heic) {
        try {
          const { default: heic2any } = await import("heic2any");
          const conv = await heic2any({ blob: file, toType: "image/png" });
          processed.push({
            blob: Array.isArray(conv) ? conv[0] : conv,
            name: file.name.replace(/\.[^.]+$/, ".png"),
          });
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (err?.code === 1) {
            processed.push({ blob: file, name: file.name });
          } else {
            console.error("HEIC 変換エラー:", err);
            setMsg("HEIC 変換に失敗したファイルがあります。");
          }
        }
      } else {
        processed.push({ blob: file, name: file.name });
      }
    }
    setInputs(processed);
  };

  /* ------------ ② 背景除去：API経由で順次実行 --------------- */
  const handleRemove = async () => {
    if (busy || inputs.length === 0) return;

    setBusy(true);
    setMsg(null);
    setOutputs([]);
    const newOutputs: OutFile[] = [];

    try {
      for (const { blob, name } of inputs) {
        const formData = new FormData();
        formData.append("file", blob, name);

        const response = await fetch("/api/remove-bg", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "不明なエラー" }));
          throw new Error(`背景除去エラー（${name}）: ${errorData.error || response.statusText}`);
        }

        const imageBlob = await response.blob();
        const url = URL.createObjectURL(imageBlob);
        newOutputs.push({ url, name });
        setOutputs([...newOutputs]); // 逐次結果を表示
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(err);
      setMsg(err.message || "背景除去中にエラーが発生しました。");
    } finally {
      setBusy(false);
    }
  };

  /* ------------ UI --------------- */
  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow">
      {/* ファイル入力 */}
      <input
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={handleFileChange}
        disabled={busy}
        className="block w-full text-sm text-gray-600 file:mr-3 file:bg-blue-50 file:px-3 file:py-2 file:rounded file:border-0 file:text-blue-700 hover:file:bg-blue-100"
      />

      {/* 背景除去ボタン */}
      <button
        onClick={handleRemove}
        disabled={busy || inputs.length === 0}
        className="w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
      >
        {busy ? "処理中…" : `背景を透過する（${inputs.length} 枚）`}
      </button>

      {/* メッセージ */}
      {msg && <p className="text-red-600">{msg}</p>}

      {/* 結果一覧 */}
      {outputs.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {outputs.map(o => (
            <div key={o.url} className="border p-4 rounded-lg text-center">
              <img src={o.url} className="mx-auto mb-2 max-h-48 object-contain" />
              <a
                href={o.url}
                download={o.name.replace(/\.[^.]+$/, "") + "-bg-removed.png"}
                className="block mt-2 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
              >
                ダウンロード
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
