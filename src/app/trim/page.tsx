"use client";
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import { getCroppedImg } from "./utils/cropImage";
import type { Area } from "react-easy-crop";
import UploadArea from "../../components/UploadArea";
import PrimaryButton from "../../components/PrimaryButton";
import RatioButton from "../../components/RatioButton";

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
  const [customWidth, setCustomWidth] = useState(1);
  const [customHeight, setCustomHeight] = useState(1);
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
    if (selectedPreset === "custom" && customWidth > 0 && customHeight > 0) {
      setAspect(customWidth / customHeight);
    } else if (typeof selectedPreset === "number") {
      setAspect(selectedPreset);
    }
  }, [selectedPreset, customWidth, customHeight]);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-xl mt-12">
      <h1 className="text-3xl font-bold mb-4 text-center">画像トリミングツール</h1>
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
            onChange={e => setCustomWidth(Number(e.target.value) || 1)}
            className="w-16 px-2 py-1 border rounded"
          />
          <span className="mx-1 text-gray-500">:</span>
          <label className="text-sm">縦</label>
          <input
            type="number"
            min={1}
            value={customHeight}
            onChange={e => setCustomHeight(Number(e.target.value) || 1)}
            className="w-16 px-2 py-1 border rounded"
          />
        </div>
      )}
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
      {imageSrc && (
        <div style={{ position: "relative", width: "100%", height: 400, marginTop: 16 }} className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
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
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">トリミング結果</h2>
          <img src={croppedImage} alt="cropped" className="max-w-full mx-auto rounded-lg border border-gray-200 shadow" />
          <a href={croppedImage} download="cropped.png">
            <PrimaryButton variant="outline" className="mt-4">ダウンロード</PrimaryButton>
          </a>
        </div>
      )}
    </div>
  );
};

export default TrimPage; 