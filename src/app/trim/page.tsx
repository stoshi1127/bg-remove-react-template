"use client";
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import { getCroppedImg } from "./utils/cropImage";
import type { Area } from "react-easy-crop";

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

  const onSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result as string));
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const showCroppedImage = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedImg = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImage(croppedImg);
    } catch {
      alert("トリミングに失敗しました");
    }
  }, [imageSrc, croppedAreaPixels]);

  // カスタム比率が選択された場合、aspectを更新
  React.useEffect(() => {
    if (selectedPreset === "custom" && customWidth > 0 && customHeight > 0) {
      setAspect(customWidth / customHeight);
    } else if (typeof selectedPreset === "number") {
      setAspect(selectedPreset);
    }
  }, [selectedPreset, customWidth, customHeight]);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-xl shadow-2xl mt-12">
      <h1 className="text-3xl font-bold mb-4 text-center">画像トリミングツール</h1>
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {aspectRatios.map((ratio) => (
          <button
            key={ratio.label}
            onClick={() => setSelectedPreset(ratio.value as number | "custom")}
            className={`px-4 py-2 rounded-lg font-medium border transition-colors duration-150 ${
              selectedPreset === ratio.value
                ? "bg-blue-600 text-white border-blue-600 shadow"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50"
            }`}
          >
            {ratio.label}
          </button>
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
      <input type="file" accept="image/*" onChange={onSelectFile} className="mb-4" />
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
          <Button variant="contained" color="primary" onClick={showCroppedImage} style={{ marginTop: 8 }}>
            トリミング
          </Button>
        </div>
      )}
      {croppedImage && (
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">トリミング結果</h2>
          <img src={croppedImage} alt="cropped" className="max-w-full mx-auto rounded-lg border border-gray-200 shadow" />
          <a href={croppedImage} download="cropped.png">
            <Button variant="outlined" style={{ marginTop: 8 }}>ダウンロード</Button>
          </a>
        </div>
      )}
    </div>
  );
};

export default TrimPage; 