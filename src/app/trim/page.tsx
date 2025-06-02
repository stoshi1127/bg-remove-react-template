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
import Script from 'next/script';

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
  const [initialCroppedAreaPixels, setInitialCroppedAreaPixels] = useState<Area | undefined>(undefined);

  // Cropperコンテナへの参照
  const cropperContainerRef = React.useRef<HTMLDivElement>(null);

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

  // localStorageから画像とバウンディングボックスを読み込む
  React.useEffect(() => {
    const storedImage = localStorage.getItem('trimImage');
    const storedBoundingBox = localStorage.getItem('trimBoundingBox');

    if (storedImage) {
      setImageSrc(storedImage);

      if (storedBoundingBox) {
        try {
          const bbox = JSON.parse(storedBoundingBox);
          setInitialCroppedAreaPixels(bbox);

          if (bbox.width > 0 && bbox.height > 0) {
            const bboxAspect = bbox.width / bbox.height;
            setAspect(bboxAspect);
            setSelectedPreset("custom");
            setCustomWidth(bbox.width.toString());
            setCustomHeight(bbox.height.toString());
          } else {
             setAspect(1);
             setSelectedPreset(1);
             setCustomWidth("1");
             setCustomHeight("1");
          }

          localStorage.removeItem('trimImage');
          localStorage.removeItem('trimBoundingBox');
        } catch (e) {
          console.error("Failed to parse bounding box from localStorage", e);
          localStorage.removeItem('trimImage');
          localStorage.removeItem('trimBoundingBox');
          setInitialCroppedAreaPixels(undefined);
        }
      } else {
         localStorage.removeItem('trimImage');
         setInitialCroppedAreaPixels(undefined);
      }
    } else {
       if (storedBoundingBox) {
         localStorage.removeItem('trimBoundingBox');
       }
    }
    console.log("TrimPage: localStorage data loaded.", { storedImage: !!storedImage, storedBoundingBox: !!storedBoundingBox });
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "イージートリミング",
    "description": "画像をかんたん・高精度にトリミングできる無料オンラインツール。SNSアイコンやヘッダー、メルカリ・Instagram用など多彩な比率プリセットに対応。",
    "url": "https://bg.quicktools.jp/trim",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY"
    },
    "featureList": [
      "画像トリミング",
      "比率プリセット対応",
      "HEIC/HEIF形式対応",
      "SNSサイズ対応",
      "カスタム比率設定",
      "無料使用"
    ],
    "creator": {
      "@type": "Organization",
      "name": "QuickTools"
    }
  };

  return (
    <>
      <Script
        id="structured-data-trim"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* ヒーローセクション */}
      <section className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-100/30 rounded-full blur-3xl"></div>
        </div>

        {/* メインコンテンツ */}
        <div className="relative z-10 w-full max-w-6xl mx-auto text-center">
          {/* タイトルセクション */}
          <div className="mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-emerald-900 to-slate-900 bg-clip-text text-transparent">
              イージートリミング
            </h1>
            <p className="text-xl md:text-2xl text-slate-700 mb-12 max-w-4xl mx-auto leading-relaxed">
              高精度な画像トリミングツール。SNSアイコンやヘッダー、メルカリ・Instagram用など
              <span className="font-semibold text-emerald-700">多彩な比率プリセット</span>で簡単作成
            </p>
            
            {/* 特徴バッジ */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <span className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-slate-700 font-medium shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                完全無料
              </span>
              <span className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-slate-700 font-medium shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                比率プリセット
              </span>
              <span className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-slate-700 font-medium shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                高精度
              </span>
              <span className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full text-slate-700 font-medium shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                iPhone対応
              </span>
            </div>
          </div>

          {/* アップロードエリア */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50">
              <h2 className="text-2xl font-semibold mb-6 text-slate-800">
                今すぐ無料でトリミング
              </h2>
              <p className="text-slate-600 mb-8">
                登録不要・高精度・多彩な比率プリセットで理想のサイズに
              </p>
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
                shadow="shadow-lg"
                previewImage={imageSrc}
              />
            </div>
          </div>

          {/* 比率選択ボタン */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">比率を選択</h3>
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
                <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <label className="text-sm font-medium text-slate-700">横</label>
                  <input
                    type="number"
                    min={1}
                    value={customWidth}
                    onChange={e => setCustomWidth(e.target.value)}
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <span className="mx-2 text-slate-500 font-bold">:</span>
                  <label className="text-sm font-medium text-slate-700">縦</label>
                  <input
                    type="number"
                    min={1}
                    value={customHeight}
                    onChange={e => setCustomHeight(e.target.value)}
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* クロッパー */}
          {imageSrc && (
            <div className="max-w-4xl mx-auto mb-8">
              <div ref={cropperContainerRef} style={{ position: "relative", width: "100%", height: 400 }} className="rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  initialCroppedAreaPixels={initialCroppedAreaPixels}
                />
              </div>
            </div>
          )}

          {/* ズームスライダーとトリミングボタン */}
          {imageSrc && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">ズーム調整</label>
                  <Slider
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(_: Event, value: number | number[]) => setZoom(value as number)}
                    sx={{
                      color: '#10b981',
                      '& .MuiSlider-thumb': {
                        backgroundColor: '#10b981',
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: '#10b981',
                      },
                      '& .MuiSlider-rail': {
                        backgroundColor: '#d1fae5',
                      },
                    }}
                  />
                </div>
                <PrimaryButton onClick={showCroppedImage} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
                  トリミング実行
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* トリミング結果 */}
          {croppedImage && (
            <div className="max-w-4xl mx-auto mb-12">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50">
                <h2 className="text-2xl font-semibold mb-6 text-slate-800">
                  トリミング結果
                </h2>
                <img src={croppedImage} alt="cropped" className="max-w-full mx-auto rounded-xl border border-slate-200 shadow-lg mb-6" />
                <a href={croppedImage} download="cropped.png">
                  <PrimaryButton variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                    ダウンロード
                  </PrimaryButton>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 使い方ガイド */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
              使い方ガイド
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              イージートリミングを使って画像をトリミングする基本的な手順を分かりやすく説明します。
              数ステップで簡単にトリミング画像を作成できます。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <GuideCard
              title="1. 画像をアップロード"
              icon={
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              }
              color="bg-blue-50"
              footer={<>対応形式: JPG, PNG, HEIC/HEIF など</>}
            >
              トリミングしたい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。HEIC/HEIF画像も自動変換されます。
            </GuideCard>
            <GuideCard
              title="2. トリミング範囲を調整"
              icon={
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h8M12 8v8" />
                </svg>
              }
              color="bg-green-50"
              footer={<>比率プリセットやカスタム比率も選択可能</>}
            >
              画像が表示されたら、トリミングしたい範囲をドラッグして調整します。SNSアイコンやヘッダー用など、用途に合わせて比率プリセットも選べます。
            </GuideCard>
            <GuideCard
              title="3. トリミング＆ダウンロード"
              icon={
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              }
              color="bg-purple-50"
              footer={<>トリミング画像はPNG形式で保存されます</>}
            >
              「トリミング」ボタンを押すと、指定範囲で画像が切り抜かれます。ダウンロードボタンから保存できます。
            </GuideCard>
          </div>
        </div>
      </section>

      {/* 便利な機能セクション */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-3xl p-12 shadow-lg max-w-6xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold mb-8 text-center text-slate-900">
              その他の便利な機能
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start p-6 bg-amber-50 rounded-2xl">
                <div className="bg-amber-100 p-3 rounded-xl mr-6 mt-1">
                  <svg className="w-8 h-8 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-3 text-slate-800">HEIC/HEIF形式への対応</h4>
                  <p className="text-slate-700 leading-relaxed">iPhoneで撮影したHEIC/HEIF形式の画像も自動変換して処理します。特別な事前変換は不要です。</p>
                </div>
              </div>
              
              <div className="flex items-start p-6 bg-emerald-50 rounded-2xl">
                <div className="bg-emerald-100 p-3 rounded-xl mr-6 mt-1">
                  <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-3 text-slate-800">比率プリセット・カスタム比率</h4>
                  <p className="text-slate-700 leading-relaxed">SNSアイコンやXヘッダー、Instagram投稿など用途に合わせた比率プリセットや、自由なカスタム比率でトリミングできます。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 背景透過機能への誘導セクション */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-green-700">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            画像の背景透過も簡単に
          </h3>
          <p className="text-xl text-emerald-100 mb-8 max-w-3xl mx-auto">
            画像の背景透過をしたい場合は、イージーカットをご利用ください。
            AI技術で高精度な背景除去処理が可能です。
          </p>
          <Link href="/">
            <button className="bg-white text-emerald-600 font-semibold py-4 px-8 rounded-xl hover:bg-emerald-50 transition duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg">
              イージーカットを使ってみる
            </button>
          </Link>
        </div>
      </section>

      {/* SEO強化：FAQ・よくある質問セクション */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold mb-12 text-center text-slate-900">
              よくある質問（FAQ）
            </h3>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-l-4 border-emerald-500 pl-6 py-4 bg-emerald-50 rounded-r-lg">
                <h4 className="text-lg font-semibold mb-2 text-slate-800">無料で画像トリミングできますか？</h4>
                <p className="text-slate-700">はい、イージートリミングは完全無料で画像トリミング処理ができます。登録も不要で、すぐにご利用いただけます。</p>
              </div>
              <div className="border-l-4 border-green-500 pl-6 py-4 bg-green-50 rounded-r-lg">
                <h4 className="text-lg font-semibold mb-2 text-slate-800">iPhone（HEIC形式）の画像もトリミングできますか？</h4>
                <p className="text-slate-700">はい、iPhoneで撮影したHEIC/HEIF形式の画像も自動的にJPEG/PNG形式に変換してトリミングします。事前変換は不要です。</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-6 py-4 bg-blue-50 rounded-r-lg">
                <h4 className="text-lg font-semibold mb-2 text-slate-800">SNS用の比率でトリミングできますか？</h4>
                <p className="text-slate-700">はい、Instagram投稿（4:5）、Xヘッダー（3:1）、SNSアイコン（1:1）など、SNS用の比率プリセットを多数ご用意しています。</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-6 py-4 bg-orange-50 rounded-r-lg">
                <h4 className="text-lg font-semibold mb-2 text-slate-800">カスタム比率でトリミングできますか？</h4>
                <p className="text-slate-700">はい、カスタム比率設定で自由な縦横比でトリミングできます。用途に合わせて柔軟に調整可能です。</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-6 py-4 bg-purple-50 rounded-r-lg">
                <h4 className="text-lg font-semibold mb-2 text-slate-800">商用利用は可能ですか？</h4>
                <p className="text-slate-700">はい、商用利用も可能です。ECサイトの商品画像、SNS投稿、デザイン制作など、幅広い用途でご活用ください。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO強化：活用事例セクション */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">
              イージートリミングの活用事例
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-white p-6 rounded-2xl shadow-sm mb-4 hover:shadow-md transition-shadow">
                <h4 className="text-lg font-semibold mb-2 text-slate-800">SNS・ソーシャルメディア</h4>
                <p className="text-slate-600 text-sm">Instagram投稿、Xヘッダー、プロフィール画像、ストーリー用画像作成</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white p-6 rounded-2xl shadow-sm mb-4 hover:shadow-md transition-shadow">
                <h4 className="text-lg font-semibold mb-2 text-slate-800">ビジネス・ECサイト</h4>
                <p className="text-slate-600 text-sm">商品画像の統一、メルカリ出品画像、バナー制作、プレゼン資料</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white p-6 rounded-2xl shadow-sm mb-4 hover:shadow-md transition-shadow">
                <h4 className="text-lg font-semibold mb-2 text-slate-800">デザイン・クリエイティブ</h4>
                <p className="text-slate-600 text-sm">ロゴ作成、アイコンデザイン、Webサイト用画像、印刷物制作</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* キーワード密度向上のための関連ツール紹介 */}
      <section className="py-20 bg-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-semibold mb-4 text-slate-900">その他の画像編集ツール</h2>
          <p className="text-slate-600 mb-8 max-w-3xl mx-auto">
            画像トリミング以外にも、背景透過、HEIC変換、画像リサイズなど、様々な画像編集・画像加工機能をご提供しています。
            すべて無料でご利用いただけるオンライン画像処理ツールです。
          </p>
        </div>
      </section>

      <div className="py-8 text-center bg-slate-50">
        <p className="text-slate-600">
          ご不明な点がありましたら、<a href="/privacy-policy" className="text-blue-600 hover:underline font-medium">プライバシーポリシー</a>をご確認ください。
        </p>
      </div>
    </>
  );
};

export default TrimPage; 