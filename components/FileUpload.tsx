import React, { ChangeEvent, useState, ClipboardEvent } from 'react';

interface FileUploadProps {
  label: string;
  onFileSelect: (base64: string | null) => void;
  accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, onFileSelect, accept = "image/*" }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      onFileSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    } else {
      setFileName(null);
      onFileSelect(null);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          // Give it a generic name or timestamp based name
          const pastedFile = new File([file], `pasted-image-${Date.now()}.png`, { type: file.type });
          processFile(pastedFile);
        }
        break;
      }
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div 
        className="flex items-center space-x-2"
        onPaste={handlePaste}
      >
        <label className="flex-1 cursor-pointer group">
          <div 
            className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            tabIndex={0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-center">
              {fileName || (
                <>
                  点击上传 <span className="hidden sm:inline">或 Ctrl+V 粘贴图片</span>
                </>
              )}
            </span>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept={accept} 
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
};