"use client";

import { useState } from "react";
import { getAvatarFrame } from "@/lib/avatarFrames";

interface AvatarWithFrameProps {
  avatarUrl?: string | null;
  frameId?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  rounded?: "rounded-full" | "rounded-3xl" | "rounded-2xl" | "rounded-xl";
  alt?: string;
  showBadge?: boolean;
}

const SIZE_MAP = {
  xs: { box: "w-7 h-7", badgeText: "text-[7px]", badgePadding: "px-1" },
  sm: { box: "w-9 h-9", badgeText: "text-[8px]", badgePadding: "px-1.5" },
  md: { box: "w-12 h-12", badgeText: "text-[9px]", badgePadding: "px-1.5" },
  lg: { box: "w-16 h-16", badgeText: "text-[10px]", badgePadding: "px-2" },
  xl: { box: "w-24 h-24", badgeText: "text-[11px]", badgePadding: "px-2.5 py-0.5" },
  "2xl": { box: "w-32 h-32", badgeText: "text-xs", badgePadding: "px-3 py-0.5" },
};

export const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=Rocket";

export function resolveAvatarUrl(url?: string | null): string {
  if (!url || url === "Avatar" || url.trim() === "") {
    return DEFAULT_AVATAR;
  }
  if (url.startsWith("/uploads/")) {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";
    return `${backendUrl}${url}`;
  }
  return url;
}

export default function AvatarWithFrame({
  avatarUrl,
  frameId = "default",
  size = "md",
  className = "",
  rounded = "rounded-2xl",
  alt = "User Avatar",
  showBadge = true,
}: AvatarWithFrameProps) {
  const [imgError, setImgError] = useState(false);
  const frame = getAvatarFrame(frameId);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  const validSrc = imgError ? DEFAULT_AVATAR : resolveAvatarUrl(avatarUrl);

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center ${sizeConfig.box} ${className}`}
      style={{
        filter: frame.id !== "default" ? `drop-shadow(0 4px 10px ${frame.glowColor})` : undefined,
      }}
    >
      {/* Khung viền Container */}
      <div
        className={`w-full h-full ${rounded} overflow-hidden flex items-center justify-center transition-all duration-300 ${frame.containerClass} ${frame.borderClass}`}
      >
        <div className={`w-full h-full ${rounded} overflow-hidden bg-slate-900/5 relative flex items-center justify-center`}>
          <img
            src={validSrc}
            alt={alt}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        </div>
      </div>

      {/* Huy hiệu Frame Badge (nếu là khung cao cấp và có kích thước từ lg trở lên) */}
      {showBadge && frame.badge && (size === "xl" || size === "2xl" || size === "lg") && (
        <div
          className={`absolute -bottom-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md whitespace-nowrap z-10 border border-white/40 ${
            frame.badgeBg || "bg-slate-900 text-white"
          } ${sizeConfig.badgeText}`}
        >
          {frame.badge}
        </div>
      )}
    </div>
  );
}
