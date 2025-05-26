import React, { useRef, useState } from "react";

type UploadAreaProps = {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  description?: string;
  shadow?: string;
  disabled?: boolean;
  previewImage?: string | null;
};

const UploadArea: React.FC<UploadAreaProps> = ({
  onFileSelect,
  accept = "image/*",
  label = "クリックまたはドラッグ＆ドロップで画像を選択",
  description = "画像ファイル (JPG, PNG, HEIC等) を1枚選択できます",
  disabled = false,
  previewImage = null,
  shadow = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileSelect(event.target.files[0]);
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
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out mb-4 flex flex-col items-center justify-center space-y-2 text-gray-600 ${shadow} ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ minHeight: 160 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <svg className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
      <p className="text-lg font-medium">
        {isDragging ? "ここに画像をドロップ" : label}
      </p>
      <p className="text-xs text-gray-500">{description}</p>
      {previewImage && (
        <img src={previewImage} alt="プレビュー" className="mt-2 max-h-32 rounded border border-gray-200" />
      )}
    </div>
  );
};

export default UploadArea; 