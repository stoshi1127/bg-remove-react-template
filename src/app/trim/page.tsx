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

  return (
    <>
      {/* ヒーローセクション */}
      <section className="bg-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="animate-fade-in-up mb-12">
            <h1 className="text-responsive-xl font-bold text-gray-900 mb-6">
              イージートリミング
            </h1>
            <p className="text-responsive-md text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              画像をかんたん・高精度にトリミングできる無料オンラインツールです。<br />
              <span className="font-semibold text-purple-600">SNSアイコンやヘッダー、メルカリ・Instagram用</span>など多彩な比率プリセットに対応。
            </p>
          </div>
          
          {/* CTAセクション */}
          <div className="animate-fade-in-up mb-12" style={{animationDelay: '0.1s'}}>
            <div className="bg-purple-50 border border-purple-100 p-6 rounded-2xl mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-purple-600 p-2 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="トリミングアイコン">
                    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h8M12 8v8" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  今すぐ無料でトリミング！
                </h2>
              </div>
              <p className="text-gray-700 mb-4">iPhoneのHEIC画像も自動変換・多彩な比率プリセット・カスタム比率対応</p>
              <div className="flex flex-wrap justify-center gap-3">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  完全無料
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                  </svg>
                  多彩な比率
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
                  </svg>
                  高精度
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* アップロードエリア - 強調セクション */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="bg-white border-2 border-purple-200 rounded-2xl p-8 shadow-soft">
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
          </div>
        </div>
      </section>

      {/* トリミング設定セクション */}
      {imageSrc && (
        <section className="bg-white py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* 比率選択 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">比率を選択</h3>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {aspectRatios.map((ratio) => (
                  <RatioButton
                    key={ratio.label}
                    isActive={selectedPreset === ratio.value}
                    onClick={() => setSelectedPreset(ratio.value as number | "custom")}
                    label={ratio.label}
                  />
                ))}
              </div>
              {selectedPreset === "custom" && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <label className="text-sm font-medium text-gray-700">横</label>
                  <input
                    type="number"
                    min={1}
                    value={customWidth}
                    onChange={e => setCustomWidth(e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <span className="mx-1 text-gray-500">:</span>
                  <label className="text-sm font-medium text-gray-700">縦</label>
                  <input
                    type="number"
                    min={1}
                    value={customHeight}
                    onChange={e => setCustomHeight(e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {/* トリミングエリア */}
            <div className="bg-gray-50 p-6 rounded-2xl">
              <div ref={cropperContainerRef} style={{ position: "relative", width: "100%", height: 400 }} className="rounded-lg overflow-hidden border border-gray-200 shadow-soft bg-white mb-6">
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

              {/* ズームコントロール */}
              <div className="flex flex-col items-center">
                <label className="text-sm font-medium text-gray-700 mb-2">ズーム調整</label>
                <div className="w-full max-w-xs mb-4">
                  <Slider
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(_: Event, value: number | number[]) => setZoom(value as number)}
                    sx={{
                      color: '#7c3aed',
                      '& .MuiSlider-thumb': {
                        backgroundColor: '#7c3aed',
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: '#7c3aed',
                      },
                      '& .MuiSlider-rail': {
                        backgroundColor: '#e5e7eb',
                      },
                    }}
                  />
                </div>
                <PrimaryButton onClick={showCroppedImage} colorVariant="purple">
                  トリミング実行
                </PrimaryButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* トリミング結果セクション */}
      {croppedImage && (
        <section className="bg-gray-50 py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">トリミング結果</h2>
            <div className="bg-white p-8 rounded-2xl shadow-soft border border-gray-200">
              <img src={croppedImage} alt="cropped" className="max-w-full mx-auto rounded-lg border border-gray-200 shadow-soft mb-6" />
              <a href={croppedImage} download="cropped.png">
                <PrimaryButton variant="outline" colorVariant="purple">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  ダウンロード
                </PrimaryButton>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* 使い方ガイド */}
      <section className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">使い方ガイド</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              イージートリミングを使って画像をトリミングする基本的な手順を分かりやすく説明します。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GuideCard
              title="1. 画像をアップロード"
              icon={
                <div className="bg-purple-600 p-3 rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              }
              footer={<span className="text-purple-600 font-medium">対応形式: JPG, PNG, HEIC/HEIF など</span>}
            >
              トリミングしたい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。
            </GuideCard>
            <GuideCard
              title="2. トリミング範囲を調整"
              icon={
                <div className="bg-green-600 p-3 rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h8M12 8v8" />
                  </svg>
                </div>
              }
              footer={<span className="text-green-600 font-medium">比率プリセットやカスタム比率も選択可能</span>}
            >
              画像が表示されたら、トリミングしたい範囲をドラッグして調整します。SNSアイコンやヘッダー用など、用途に合わせて比率プリセットも選べます。
            </GuideCard>
            <GuideCard
              title="3. トリミング＆ダウンロード"
              icon={
                <div className="bg-indigo-600 p-3 rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                </div>
              }
              footer={<span className="text-indigo-600 font-medium">トリミング画像はPNG形式で保存</span>}
            >
              「トリミング実行」ボタンを押すと、指定範囲で画像が切り抜かれます。ダウンロードボタンから保存できます。
            </GuideCard>
          </div>
        </div>
      </section>

      {/* 機能紹介セクション */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">その他の便利な機能</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-soft hover-lift">
              <div className="flex items-start">
                <div className="bg-amber-100 p-3 rounded-xl mr-4">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">HEIC/HEIF形式への対応</h4>
                  <p className="text-gray-600">
                    iPhoneで撮影したHEIC/HEIF形式の画像も自動変換して処理します。
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-soft hover-lift">
              <div className="flex items-start">
                <div className="bg-teal-100 p-3 rounded-xl mr-4">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">比率プリセット・カスタム比率</h4>
                  <p className="text-gray-600">
                    SNSアイコンやXヘッダー、Instagram投稿など用途に合わせた比率プリセットや、自由なカスタム比率でトリミングできます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 背景透過機能への誘導セクション */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="bg-blue-50 border border-blue-100 p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">画像の背景透過もできます</h3>
            <p className="text-gray-700 mb-6">
              トリミング後に背景透過をしたい場合は、イージーカットをご利用ください。<br />
              AIが自動で高精度に背景を除去します。
            </p>
            <Link href="/">
              <button className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                イージーカットを使ってみる
              </button>
            </Link>
          </div>
        </div>
      </section>

      <div className="py-8 px-4 text-center">
        <p className="text-gray-600">
          ご不明な点がありましたら、<a href="/privacy-policy" className="text-blue-600 hover:text-blue-700 font-medium">プライバシーポリシー</a>をご確認ください。
        </p>
      </div>
    </>
  );
};

export default TrimPage; 