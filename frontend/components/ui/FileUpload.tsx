"use client";

import { useRef, useState, type DragEvent } from "react";
import { TbCloudUpload, TbFile, TbPhoto, TbX } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface FileUploadProps {
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  className?: string;
}

export function FileUpload({
  label = "Drop files here or click to upload",
  hint = "Receipts, delivery notes — PNG, JPG or PDF up to 10MB",
  accept,
  multiple = true,
  onFiles,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    setFiles(next);
    onFiles?.(next);
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onFiles?.(next);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors duration-150",
          dragging ? "border-brand-400 bg-brand-50" : "border-paper-300 bg-paper-0 hover:border-brand-300"
        )}
      >
        <TbCloudUpload className="size-8 text-ink-400" />
        <p className="text-sm font-medium text-ink-700">{label}</p>
        <p className="text-xs text-ink-400">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded-ctrl border border-paper-200 bg-paper-0 px-3 py-2 text-sm"
            >
              {file.type.startsWith("image/") ? (
                <TbPhoto className="size-4 shrink-0 text-ink-400" />
              ) : (
                <TbFile className="size-4 shrink-0 text-ink-400" />
              )}
              <span className="flex-1 truncate text-ink-700">{file.name}</span>
              <span className="shrink-0 text-xs text-ink-400">{(file.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => removeFile(i)}
                className="shrink-0 rounded-full p-0.5 text-ink-400 hover:bg-paper-100 hover:text-danger-600"
              >
                <TbX className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
