"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Upload,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Check,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/lib/api";

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (fileUrl: string) => void;
}

export default function AvatarCropModal({
  isOpen,
  onClose,
  onCropComplete,
}: AvatarCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("avatar.png");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Kích thước khung vuông viewport (pixels)
  const CROP_BOX_SIZE = 280;

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setImageSrc(null);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setErrorMsg("");
      setIsUploading(false);
    }
  }, [isOpen]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("Dung lượng ảnh vượt quá 15MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setImageSrc(result);
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset/Center
  const handleCenter = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  // Export cropped square image to Canvas & Upload to backend
  const handleConfirmCropAndUpload = async () => {
    if (!imageSrc || !imgRef.current) return;
    setErrorMsg("");
    setIsUploading(true);

    try {
      const OUTPUT_SIZE = 512; // Xuất ảnh vuông sắc nét 512x512
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Không thể khởi tạo Canvas 2D");
      }

      // Smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Calculate transformations relative to CROP_BOX_SIZE and OUTPUT_SIZE
      const scaleRatio = OUTPUT_SIZE / CROP_BOX_SIZE;

      ctx.save();
      // Move to center of canvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Pan translation adjusted for rotation
      const rad = (-rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rotPanX = (pan.x * cos - pan.y * sin) * scaleRatio;
      const rotPanY = (pan.x * sin + pan.y * cos) * scaleRatio;

      ctx.translate(rotPanX, rotPanY);

      const naturalW = imgRef.current.naturalWidth;
      const naturalH = imgRef.current.naturalHeight;

      // Fit image into CROP_BOX_SIZE maintaining aspect ratio as base
      const baseScale = Math.max(CROP_BOX_SIZE / naturalW, CROP_BOX_SIZE / naturalH);
      const drawW = naturalW * baseScale * scaleRatio;
      const drawH = naturalH * baseScale * scaleRatio;

      ctx.drawImage(imgRef.current, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Convert canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png", 0.95);
      });

      if (!blob) {
        throw new Error("Không thể tạo file ảnh từ Canvas");
      }

      // Upload to backend API
      const formData = new FormData();
      formData.append("file", blob, fileName.replace(/\.[^/.]+$/, "") + "_cropped.png");

      const res = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success && res.data.data?.fileUrl) {
        onCropComplete(res.data.data.fileUrl);
        onClose();
      } else {
        throw new Error(res.data?.message || "Tải ảnh lên thất bại");
      }
    } catch (err: any) {
      console.error("Lỗi cắt và tải avatar:", err);
      setErrorMsg(
        err.response?.data?.message || err.message || "Đã xảy ra lỗi khi tải ảnh lên. Vui lòng thử lại."
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const isSquare = originalDimensions && originalDimensions.width === originalDimensions.height;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] sm:rounded-[32px] border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Crop size={18} />
            </div>
            <div>
              <h3 className="font-heading font-black text-base sm:text-lg text-slate-900 leading-tight">
                Tải Lên & Cắt Ảnh Avatar
              </h3>
              <p className="text-[11px] text-slate-500">
                Chuẩn tỉ lệ 1:1 hình vuông sắc nét cho hồ sơ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!imageSrc ? (
            /* Upload Drop Area */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Nhấp để tải ảnh đại diện từ máy tính
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Hỗ trợ PNG, JPG, JPEG, WEBP (tối đa 15MB)
                </p>
              </div>
              <button
                type="button"
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/30 group-hover:bg-indigo-700 transition-colors"
              >
                Chọn Tệp Từ Máy
              </button>
            </div>
          ) : (
            /* Interactive Cropper View */
            <div className="space-y-4">
              {/* Notice badge */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-indigo-600" />
                  {isSquare ? (
                    <span className="text-emerald-600 font-bold">Ảnh gốc đã chuẩn vuông (1:1)</span>
                  ) : (
                    <span className="text-amber-600 font-bold">Ảnh chưa vuông, vui lòng căn chỉnh khung cắt 1:1</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  Đổi ảnh khác
                </button>
              </div>

              {/* Crop Viewport Box */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                className="relative mx-auto rounded-3xl overflow-hidden bg-slate-900 border-2 border-indigo-500/80 shadow-inner cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
                style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
              >
                {/* Image Element */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop Source"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: "center center",
                    maxWidth: "none",
                  }}
                  className="transition-transform duration-75 pointer-events-none"
                />

                {/* Grid Overlay / Rule of Thirds */}
                <div className="absolute inset-0 pointer-events-none border border-white/30 grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>

                {/* Corner Accents */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-400 pointer-events-none" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-400 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-400 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-400 pointer-events-none" />
              </div>

              {/* Hint */}
              <p className="text-center text-[11px] text-slate-400 font-medium">
                💡 Giữ chuột kéo để di chuyển ảnh • Dùng thanh trượt dưới để phóng to / thu nhỏ
              </p>

              {/* Controls Bar */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-3">
                {/* Zoom Slider */}
                <div className="flex items-center gap-3">
                  <ZoomOut size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min="0.8"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <ZoomIn size={16} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-mono font-bold text-slate-600 w-10 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCw size={14} /> Xoay 90°
                  </button>

                  <button
                    type="button"
                    onClick={handleCenter}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Maximize2 size={14} /> Căn Giữa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition-colors"
          >
            Hủy
          </button>

          {imageSrc && (
            <button
              type="button"
              onClick={handleConfirmCropAndUpload}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Xác Nhận & Cắt Ảnh Vuông</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
