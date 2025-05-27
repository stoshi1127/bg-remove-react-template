"use client";
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import { getCroppedImg } from "./utils/cropImage";
import type { Area } from "react-easy-crop";
import UploadArea from "../../components/UploadArea";
import PrimaryButton from "../../components/PrimaryButton";
import RatioButton from "../../components/RatioButton";
import GuideCard from "../../components/GuideCard";
import Link from "next/link";

const aspectRatios = [
  { label: "1:1（メルカリ/汎用/SNSアイコン）", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "3:1（Xヘッダー）", value: 3 },
  { label: "4:5（Instagram投稿）", value: 4 / 5 },
  { label: "カスタム", value: "custom" },
];

const TrimPage = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number>(1);
  const [customWidth, setCustomWidth] = useState<string>("1");
  const [customHeight, setCustomHeight] = useState<string>("1");
  const [selectedPreset, setSelectedPreset] = useState<number | "custom">(1);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedImg = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImage(croppedImg);
    } catch {
      alert("トリミングに失敗しました");
    }
  }, [imageSrc, croppedAreaPixels]);

  React.useEffect(() => {
    if (selectedPreset === "custom" && customWidth !== "" && customHeight !== "" && Number(customWidth) > 0 && Number(customHeight) > 0) {
      setAspect(Number(customWidth) / Number(customHeight));
    } else if (typeof selectedPreset === "number") {
      setAspect(selectedPreset);
    }
  }, [selectedPreset, customWidth, customHeight]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      {/* --- 元々あったコード (Next.jsロゴなど) は削除またはコメントアウト --- */}
      {/* <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        ... (元のコード) ...
      </div> */}

      {/* --- ここにトリミングコンポーネントを配置 --- */}
      <h1 className="text-4xl font-bold mb-8 text-center">イージートリミング</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
        画像をかんたん・高精度にトリミングできる無料オンラインツールです。SNSアイコンやヘッダー、メルカリ・Instagram用など多彩な比率プリセットに対応。iPhoneのHEIC画像も自動変換。
      </p>
      <div className="w-full max-w-2xl mx-auto">
        <UploadArea
          onFileSelect={async (file) => {
            let fileToUse = file;
            if (
              file.type.includes("heic") ||
              file.type.includes("heif") ||
              /\.(heic|heif)$/i.test(file.name)
            ) {
              try {
                const { default: heic2any } = await import("heic2any");
                const converted = await heic2any({ blob: file, toType: "image/jpeg" });
                const blob = Array.isArray(converted) ? converted[0] : converted;
                fileToUse = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
              } catch {
                alert("HEIC/HEIF画像の変換に失敗しました");
                return;
              }
            }
            const reader = new FileReader();
            reader.addEventListener("load", () => setImageSrc(reader.result as string));
            reader.readAsDataURL(fileToUse);
          }}
          accept="image/*"
          label="クリックまたはドラッグ＆ドロップで画像を選択"
          description="画像ファイル (JPG, PNG, HEIC等) を1枚選択できます"
          shadow="shadow-2xl"
          previewImage={imageSrc}
        />
      </div>
      <div className="w-full max-w-2xl mx-auto mt-6">
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {aspectRatios.map((ratio) => (
            <RatioButton
              key={ratio.label}
              selected={selectedPreset === ratio.value}
              onClick={() => setSelectedPreset(ratio.value as number | "custom")}
            >
              {ratio.label}
            </RatioButton>
          ))}
        </div>
        {selectedPreset === "custom" && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <label className="text-sm">横</label>
            <input
              type="number"
              min={1}
              value={customWidth}
              onChange={e => setCustomWidth(e.target.value)}
              className="w-16 px-2 py-1 border rounded"
            />
            <span className="mx-1 text-gray-500">:</span>
            <label className="text-sm">縦</label>
            <input
              type="number"
              min={1}
              value={customHeight}
              onChange={e => setCustomHeight(e.target.value)}
              className="w-16 px-2 py-1 border rounded"
            />
          </div>
        )}
      </div>
      {imageSrc && (
        <div style={{ position: "relative", width: "100%", height: 400, marginTop: 16 }} className="rounded-lg overflow-hidden border border-gray-200 shadow-sm max-w-2xl mx-auto">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
      )}
      {imageSrc && (
        <div className="mt-4 flex flex-col items-center">
          <div className="w-full max-w-xs">
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(_: Event, value: number | number[]) => setZoom(value as number)}
            />
          </div>
          <PrimaryButton onClick={showCroppedImage} className="mt-4">
            トリミング
          </PrimaryButton>
        </div>
      )}
      {croppedImage && (
        <div className="mt-8 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">トリミング結果</h2>
          <img src={croppedImage} alt="cropped" className="max-w-full mx-auto rounded-lg border border-gray-200 shadow" />
          <a href={croppedImage} download="cropped.png">
            <PrimaryButton variant="outline" className="mt-4">ダウンロード</PrimaryButton>
          </a>
        </div>
      )}
      {/* 使い方ガイド */}
      <section className="container mx-auto px-4 py-12 mt-16">
        <h2 className="text-3xl font-bold mb-8 text-center">使い方ガイド</h2>
        <p className="mb-12 text-center text-lg text-gray-600 max-w-3xl mx-auto">
          イージートリミングを使って画像をトリミングする基本的な手順を分かりやすく説明します。数ステップで簡単にトリミング画像を作成できます。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GuideCard
            title="1. 画像をアップロード"
            icon={
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            }
            color="bg-blue-100"
            footer={<>対応形式: JPG, PNG, HEIC/HEIF など</>}
          >
            トリミングしたい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。HEIC/HEIF画像も自動変換されます。
          </GuideCard>
          <GuideCard
            title="2. トリミング範囲を調整"
            icon={
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h8M12 8v8" />
              </svg>
            }
            color="bg-green-100"
            footer={<>比率プリセットやカスタム比率も選択可能</>}
          >
            画像が表示されたら、トリミングしたい範囲をドラッグして調整します。SNSアイコンやヘッダー用など、用途に合わせて比率プリセットも選べます。
          </GuideCard>
          <GuideCard
            title="3. トリミング＆ダウンロード"
            icon={
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
            }
            color="bg-purple-100"
            footer={<>トリミング画像はPNG形式で保存されます</>}
          >
            「トリミング」ボタンを押すと、指定範囲で画像が切り抜かれます。ダウンロードボタンから保存できます。
          </GuideCard>
        </div>
      </section>
      {/* 便利な機能セクション */}
      <section className="container mx-auto px-4 mt-8 mb-16">
        <div className="bg-gray-50 p-8 rounded-xl max-w-3xl mx-auto">
          <h3 className="text-2xl font-semibold mb-6 text-center">その他の便利な機能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <div className="bg-amber-100 p-2 rounded-full mr-4 mt-1">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-2">HEIC/HEIF形式への対応</h4>
                <p className="text-gray-700">iPhoneで撮影したHEIC/HEIF形式の画像も自動変換して処理します。特別な事前変換は不要です。</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-teal-100 p-2 rounded-full mr-4 mt-1">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium mb-2">比率プリセット・カスタム比率</h4>
                <p className="text-gray-700">SNSアイコンやXヘッダー、Instagram投稿など用途に合わせた比率プリセットや、自由なカスタム比率でトリミングできます。</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* 背景透過機能への誘導セクション */}
      <div className="container mx-auto px-4 mt-12 mb-16 text-center">
        <p className="text-lg text-gray-700 mb-4">
          画像の背景透過をしたい場合は、こちらのツールをご利用ください。
        </p>
        <Link href="/">
          <button className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300">
            イージーカットを使ってみる
          </button>
        </Link>
      </div>
      <p className="mt-12 text-center text-gray-600">
        ご不明な点がありましたら、<a href="/privacy-policy" className="text-blue-600 hover:underline font-medium">プライバシーポリシー</a>をご確認ください。
      </p>
    </main>
  );
};

export default TrimPage; 