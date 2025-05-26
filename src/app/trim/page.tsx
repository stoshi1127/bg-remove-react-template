"use client";
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import { getCroppedImg } from "./utils/cropImage";
import type { Area } from "react-easy-crop";

const TrimPage = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);

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
    } catch (e) {
      alert("トリミングに失敗しました");
    }
  }, [imageSrc, croppedAreaPixels]);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1>画像トリミングツール</h1>
      <input type="file" accept="image/*" onChange={onSelectFile} />
      {imageSrc && (
        <div style={{ position: "relative", width: "100%", height: 400, marginTop: 16 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
      )}
      {imageSrc && (
        <div style={{ marginTop: 16 }}>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(_: Event, value: number | number[]) => setZoom(value as number)}
          />
          <Button variant="contained" color="primary" onClick={showCroppedImage} style={{ marginTop: 8 }}>
            トリミング
          </Button>
        </div>
      )}
      {croppedImage && (
        <div style={{ marginTop: 24 }}>
          <h2>トリミング結果</h2>
          <img src={croppedImage} alt="cropped" style={{ maxWidth: "100%" }} />
          <a href={croppedImage} download="cropped.png">
            <Button variant="outlined" style={{ marginTop: 8 }}>ダウンロード</Button>
          </a>
        </div>
      )}
    </div>
  );
};

export default TrimPage; 