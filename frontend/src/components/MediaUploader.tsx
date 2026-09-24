"use client";

import React, { useState, useRef } from "react";
import {
  Camera,
  Mic,
  Video,
  UploadCloud,
  X,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Volume2
} from "lucide-react";
import { UploadedMedia } from "@/lib/types";
import { uploadMediaFile } from "@/lib/api";

interface MediaUploaderProps {
  sessionId?: string;
  onMediaUploaded: (media: UploadedMedia) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  sessionId,
  onMediaUploaded,
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video">("image");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("File size exceeds 50MB limit.");
      return;
    }

    setSelectedFile(file);

    // Auto-detect type
    if (file.type.startsWith("image/")) {
      setMediaType("image");
      setPreviewUrl(URL.createObjectURL(file));
    } else if (file.type.startsWith("audio/")) {
      setMediaType("audio");
      setPreviewUrl(URL.createObjectURL(file));
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg("Please select an image, audio clip, or video first.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const result = await uploadMediaFile(selectedFile, sessionId, mediaType);
      onMediaUploaded(result);
      onClose();
      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload and analyze media.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Multimodal Diagnostic Upload</h3>
              <p className="text-[11px] text-slate-400">Attach photos, engine sound recordings, or video clips</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 my-4">
          <button
            type="button"
            onClick={() => setMediaType("image")}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mediaType === "image"
                ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                : "bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photo / Leak</span>
          </button>
          <button
            type="button"
            onClick={() => setMediaType("audio")}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mediaType === "audio"
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Engine Audio</span>
          </button>
          <button
            type="button"
            onClick={() => setMediaType("video")}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mediaType === "video"
                ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                : "bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Smoke / Video</span>
          </button>
        </div>

        {/* Dropzone & Preview Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            selectedFile
              ? "border-orange-500/40 bg-orange-500/5"
              : "border-white/10 hover:border-orange-500/30 bg-slate-950/40 hover:bg-slate-950/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={
              mediaType === "image"
                ? "image/*"
                : mediaType === "audio"
                ? "audio/*"
                : "video/*"
            }
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="space-y-3">
              {mediaType === "image" && previewUrl && (
                <div className="relative mx-auto max-h-48 overflow-hidden rounded-lg border border-white/10">
                  <img src={previewUrl} alt="Preview" className="max-h-44 mx-auto object-contain" />
                </div>
              )}

              {mediaType === "audio" && previewUrl && (
                <div className="p-3 bg-slate-900 rounded-lg border border-white/10 flex flex-col items-center gap-2">
                  <Volume2 className="w-8 h-8 text-purple-400 animate-pulse" />
                  <audio controls src={previewUrl} className="w-full h-8" />
                </div>
              )}

              {mediaType === "video" && previewUrl && (
                <div className="relative mx-auto max-h-48 overflow-hidden rounded-lg border border-white/10">
                  <video controls src={previewUrl} className="max-h-44 mx-auto" />
                </div>
              )}

              <div className="text-xs text-slate-300 font-medium">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
              <p className="text-[11px] text-orange-400">Click to replace file</p>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <UploadCloud className="w-10 h-10 mx-auto text-slate-500" />
              <div className="text-xs font-semibold text-slate-200">
                Click to browse or drop {mediaType} file here
              </div>
              <p className="text-[11px] text-slate-400">
                {mediaType === "image"
                  ? "Supported: JPG, PNG, WEBP (Warning lights, fluid leaks, tire wear)"
                  : mediaType === "audio"
                  ? "Supported: MP3, WAV, M4A, OGG (Engine knock, belt squeal, brake screech)"
                  : "Supported: MP4, MOV, WEBM (Exhaust smoke, vibrating pulleys, idle wobble)"}
              </p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/20 flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing with AI...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Upload & Inspect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
