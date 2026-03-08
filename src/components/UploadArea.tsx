import React, { useRef, useState } from "react";

type UploadAreaProps = {
  onFileSelect?: (file: File) => void;  // 既存の単一ファイル用（後方互換性）
  onFilesSelect?: (files: FileList) => void;  // 新規の複数ファイル用
  accept?: string;
  label?: string;
  description?: string;
  shadow?: string;
  disabled?: boolean;
  previewImage?: string | null;
  multiple?: boolean;  // 複数ファイル選択の可否
};

const UploadArea: React.FC<UploadAreaProps> = ({
  onFileSelect,
  onFilesSelect,
  accept = "image/*",
  disabled = false,
  previewImage = null,
  multiple = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      if (multiple && onFilesSelect) {
        onFilesSelect(files);
      } else if (onFileSelect) {
        onFileSelect(files[0]);
      }
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (multiple && onFilesSelect) {
        onFilesSelect(files);
      } else if (onFileSelect) {
        onFileSelect(files[0]);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`group relative flex flex-col items-center justify-center w-full min-h-[300px] border-4 border-dashed rounded-3xl transition-all cursor-pointer p-10 overflow-hidden shadow-sm hover:shadow-xl mb-6 
        ${isDragging
          ? 'border-primary bg-blue-50/50 dark:bg-blue-900/10'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/50 dark:hover:border-primary/50'
        } 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        multiple={multiple}
      />

      <div className="flex flex-col items-center gap-6 z-10">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-300
          ${isDragging ? 'bg-primary text-white scale-110' : 'bg-primary/10 text-primary group-hover:scale-110 group-hover:rotate-3'}
        `}>
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
        </div>

        <div className="text-center">
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {isDragging ? `ここに画像を${multiple ? '複数' : ''}ドロップ` : '画像をドラッグ＆ドロップ'}
          </p>
          <p className="text-md text-slate-500 mt-2 font-medium">
            {isDragging ? '離すと追加されます' : 'またはファイルを選択 (JPG, PNG, WebP, HEIC等 / 最大25MB)'}
          </p>
        </div>

        <button
          className="mt-4 bg-primary text-white px-10 py-4 rounded-full text-lg font-black hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 pointer-events-none"
          tabIndex={-1}
        >
          ファイルを選択
        </button>
      </div>

      {previewImage && (
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <img src={previewImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
};

export default UploadArea;