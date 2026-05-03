"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { getAuthHeaders } from "@/lib/api";

interface FileUploaderProps {
  onTextExtracted: (text: string) => void;
  label?: string;
}

export default function FileUploader({ onTextExtracted, label = "上传文件" }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const allowed = ["pdf", "docx", "doc", "jpg", "jpeg", "png"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowed.includes(ext)) {
      setError(`不支持的文件类型：.${ext}，请上传 PDF/DOCX/JPG/PNG`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("文件大小超过10MB限制");
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
    } catch (err: any) {
      setError(err.message || "文件解析失败");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="mb-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50"
        }`}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
        ) : fileName ? (
          <FileText className="w-5 h-5 text-green-500 shrink-0" />
        ) : (
          <Upload className="w-5 h-5 text-gray-400 shrink-0" />
        )}
        <div className="text-sm">
          {uploading ? (
            <span className="text-blue-600">正在提取文本...</span>
          ) : fileName ? (
            <span className="text-green-700">{fileName} — 提取完成</span>
          ) : (
            <span className="text-gray-500">{label}（PDF/DOCX/JPG/PNG，拖拽或点击）</span>
          )}
        </div>
        {fileName && !uploading && (
          <button
            onClick={(e) => { e.stopPropagation(); setFileName(""); setError(""); }}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
