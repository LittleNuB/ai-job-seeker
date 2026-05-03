"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { getAuthHeaders } from "@/lib/api";

interface FileUploaderProps {
  onTextExtracted: (text: string) => void;
  label?: string;
}

const allowedExtensions = ["pdf", "docx", "doc", "jpg", "jpeg", "png"];

export default function FileUploader({ onTextExtracted, label = "上传文件" }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) {
      setError(`不支持的文件类型：${ext || "未知"}，请上传 PDF/DOCX/JPG/PNG`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("文件大小超过 10MB 限制");
      return;
    }

    setError("");
    setUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "上传失败" }));
        throw new Error(data.detail || "上传失败");
      }
      const data = await res.json();
      if (data.text) {
        onTextExtracted(data.text);
      } else {
        setError("文件中未提取到文本内容");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "文件解析失败");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function clearFile(event: React.MouseEvent) {
    event.stopPropagation();
    setFileName("");
    setError("");
  }

  return (
    <div className="mb-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
        ) : fileName ? (
          <FileText className="h-5 w-5 shrink-0 text-green-500" />
        ) : (
          <Upload className="h-5 w-5 shrink-0 text-gray-400" />
        )}

        <div className="text-sm">
          {uploading ? (
            <span className="text-blue-600">正在提取文本...</span>
          ) : fileName ? (
            <span className="text-green-700">{fileName} - 提取完成</span>
          ) : (
            <span className="text-gray-500">{label}，支持 PDF/DOCX/JPG/PNG，拖拽或点击上传</span>
          )}
        </div>

        {fileName && !uploading && (
          <button type="button" onClick={clearFile} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = "";
        }}
      />

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
