"use client";
import React, { useState, useCallback, useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result as string));
      reader.readAsDataURL(event.target.files[0]);
    }
    event.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result as string));
      reader.readAsDataURL(e.dataTransfer.files[0]);
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
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out mb-4 flex flex-col items-center justify-center space-y-2 text-gray-600 shadow-lg ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <svg className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        <p className="text-lg font-medium">
          {isDragging ? "ここに画像をドロップ" : "クリックまたはドラッグ＆ドロップで画像を選択"}
        </p>
        <p className="text-xs text-gray-500">画像ファイル (JPG, PNG, HEIC等) を1枚選択できます</p>
      </div>
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