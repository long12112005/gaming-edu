import React from "react";

export const GameAssets = {
  // =========================================================================
  // GAME 1: ĐẾ CHẾ LÃNH THỔ (HEX CONQUEST)
  // =========================================================================
  HexFortress: ({ color = "#3b82f6" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-11 h-11 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
      <defs>
        <linearGradient id={`hexGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {/* Nền lục giác 3D */}
      <polygon
        points="32,3 59,18 59,46 32,61 5,46 5,18"
        fill={`url(#hexGrad-${color})`}
        stroke="#f8fafc"
        strokeWidth="2.5"
      />
      <polygon
        points="32,8 54,20 54,44 32,56 10,44 10,20"
        fill={color}
        fillOpacity="0.45"
        stroke="#fde047"
        strokeWidth="1.2"
      />
      {/* Lâu đài & Vương miện Hoàng gia */}
      <path
        d="M18 44V26l4 3 4-6 6 5 6-5 4 6 4-3v18H18z"
        fill="#fde047"
        stroke="#92400e"
        strokeWidth="1.5"
      />
      <rect x="28" y="34" width="8" height="10" rx="4" fill="#78350f" />
      <circle cx="32" cy="18" r="3" fill="#fef08a" />
      <circle cx="23" cy="21" r="2" fill="#38bdf8" />
      <circle cx="41" cy="21" r="2" fill="#f43f5e" />
    </svg>
  ),

  HexTileSprite: ({
    owner = "NONE",
    isBase = false,
    fortified = false,
    fortifiedTurns = 0,
    r = 0,
    c = 0,
  }: {
    owner?: string;
    isBase?: boolean;
    fortified?: boolean;
    fortifiedTurns?: number;
    r?: number;
    c?: number;
  }) => {
    const isTeamA = owner === "TEAM_A";
    const isTeamB = owner === "TEAM_B";
    const topFill = isTeamA ? "#2563eb" : isTeamB ? "#e11d48" : "#334155";
    const innerFill = isTeamA ? "#3b82f6" : isTeamB ? "#f43f5e" : "#475569";
    const strokeCol = fortified
      ? "#fbbf24"
      : isBase
      ? "#fde047"
      : isTeamA
      ? "#93c5fd"
      : isTeamB
      ? "#fda4af"
      : "#64748b";

    return (
      <svg viewBox="0 0 60 66" className="w-full h-full overflow-visible">
        {/* Đế bóng 3D bên dưới */}
        <polygon
          points="30,5 57,20 57,49 30,64 3,49 3,20"
          fill="#090d16"
          opacity="0.6"
        />
        {/* Thân lục giác chính */}
        <polygon
          points="30,2 57,17 57,46 30,61 3,46 3,17"
          fill={topFill}
          stroke={strokeCol}
          strokeWidth={fortified ? "3.5" : isBase ? "3" : "1.8"}
        />
        {/* Mặt vát sáng bên trong */}
        <polygon
          points="30,7 51,19 51,43 30,55 9,43 9,19"
          fill={innerFill}
          opacity="0.85"
        />
        {/* Vòng hào quang Tường Thành (Fortified) */}
        {fortified && (
          <g>
            <polygon
              points="30,5 53,18 53,44 30,57 7,44 7,18"
              fill="none"
              stroke="#fde047"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <path
              d="M30 8 L37 12 V20 C37 25 30 28 30 28 C30 28 23 25 23 20 V12 Z"
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth="1.2"
            />
            {fortifiedTurns > 0 && (
              <text
                x="30"
                y="21"
                textAnchor="middle"
                fill="#fff"
                fontSize="8"
                fontWeight="900"
              >
                {fortifiedTurns}
              </text>
            )}
          </g>
        )}

        {/* Biểu tượng Căn cứ chính (Castle Crown) */}
        {isBase ? (
          <g transform="translate(17, 20)">
            <path
              d="M2 20V8l5 4 6-8 6 8 5-4v12H2z"
              fill="#fde047"
              stroke="#78350f"
              strokeWidth="1.5"
            />
            <rect x="10" y="13" width="6" height="7" rx="2" fill="#78350f" />
          </g>
        ) : (
          <text
            x="30"
            y={fortified ? "43" : "35"}
            textAnchor="middle"
            fill={owner === "NONE" ? "#cbd5e1" : "#ffffff"}
            fontSize="10"
            fontWeight="800"
            opacity="0.9"
          >
            {r},{c}
          </text>
        )}
      </svg>
    );
  },

  // =========================================================================
  // GAME 2: THỦ THÀNH TRI THỨC (TOWER DEFENSE - PHONG CÁCH CỔ TRANG ĐẠI VIỆT / TAM QUỐC)
  // =========================================================================
  DefenseTurret: ({
    teamColor = "#10b981",
    towerType = "ARCHER",
    level = 1,
  }: {
    teamColor?: string;
    towerType?: "ARCHER" | "FREEZE" | "LASER" | string;
    level?: number;
  }) => {
    const type = towerType.toUpperCase();
    return (
      <svg viewBox="0 0 72 72" className="w-12 h-12 overflow-visible drop-shadow-[0_4px_8px_rgba(0,0,0,0.65)]">
        <defs>
          <linearGradient id="tdStoneBase" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="tdGoldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          <linearGradient id="tdCrimsonWood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>

        {/* Vòng trận pháp cổ đại dưới chân đài */}
        <ellipse
          cx="36"
          cy="58"
          rx="28"
          ry="10"
          fill="rgba(15, 23, 42, 0.75)"
          stroke={teamColor}
          strokeWidth="1.8"
          strokeDasharray="5 3"
        />

        {/* Bệ thành đá xanh cổ trang chạm khắc bậc tam cấp */}
        <polygon
          points="12,58 18,40 54,40 60,58"
          fill="url(#tdStoneBase)"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
        <line x1="16" y1="49" x2="56" y2="49" stroke="#334155" strokeWidth="1.5" />
        <rect x="22" y="37" width="28" height="5" rx="1.5" fill="url(#tdGoldTrim)" />

        {type === "ARCHER" && (
          <g>
            {/* Vọng Lâu Gỗ Sơn Son & Mái Ngói Lưu Ly Cong Vút */}
            <rect x="23" y="21" width="4" height="17" fill="url(#tdCrimsonWood)" stroke="#fbbf24" strokeWidth="0.8" />
            <rect x="45" y="21" width="4" height="17" fill="url(#tdCrimsonWood)" stroke="#fbbf24" strokeWidth="0.8" />
            {/* Mái đình cổ trang cong hai đầu đao */}
            <path
              d="M10 24 Q24 20 36 10 Q48 20 62 24 Q48 26 36 22 Q24 26 10 24 Z"
              fill="#047857"
              stroke="#fde047"
              strokeWidth="1.6"
            />
            <circle cx="36" cy="9" r="2.8" fill="#fde047" />
            {/* Nỏ Thần Liên Châu (Gia Cát Liên Nỏ) mạ vàng đặt trên vọng lâu */}
            <path
              d="M21 31 Q36 16 51 31"
              fill="none"
              stroke="url(#tdGoldTrim)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <line x1="21" y1="31" x2="51" y2="31" stroke="#fef9c3" strokeWidth="1.2" />
            {/* 3 Mũi tên thần đầu lửa chuẩn bị khai hỏa */}
            <line x1="36" y1="36" x2="36" y2="14" stroke="#fef08a" strokeWidth="2.4" />
            <polygon points="36,8 32,16 40,16" fill="#ef4444" stroke="#fef08a" strokeWidth="0.8" />
            <line x1="30" y1="35" x2="27" y2="18" stroke="#fde047" strokeWidth="1.6" />
            <line x1="42" y1="35" x2="45" y2="18" stroke="#fde047" strokeWidth="1.6" />
          </g>
        )}

        {type === "FREEZE" && (
          <g>
            {/* Đài Huyền Băng Bát Quái & Cửu Thiên Hàn Châu */}
            <circle
              cx="36"
              cy="25"
              r="15"
              fill="rgba(8, 145, 178, 0.28)"
              stroke="#67e8f9"
              strokeWidth="1.8"
              strokeDasharray="4 2"
            />
            {/* 2 Trụ ngọc rồng bảo hộ hai bên */}
            <rect x="20" y="22" width="4" height="16" rx="1" fill="#0e7490" stroke="#a5f3fc" strokeWidth="1" />
            <rect x="48" y="22" width="4" height="16" rx="1" fill="#0e7490" stroke="#a5f3fc" strokeWidth="1" />
            {/* Tinh thể Hàn Băng Lục Lăng Cổ Pháp */}
            <polygon
              points="36,5 47,18 43,35 29,35 25,18"
              fill="#06b6d4"
              stroke="#ecfeff"
              strokeWidth="2"
            />
            <polygon points="36,9 43,19 36,32 29,19" fill="#67e8f9" />
            {/* Phù chú Băng Tâm ở giữa */}
            <circle cx="36" cy="20" r="4.5" fill="#ffffff" />
            <path d="M36 12 V28 M28 20 H44" stroke="#e0f2fe" strokeWidth="1.5" />
          </g>
        )}

        {(type === "LASER" || type === "CANNON") && (
          <g>
            {/* Đài Thần Công Hỏa Pháo Cửu Long (Đại Pháo Đồng Cổ Đại) */}
            <rect x="20" y="30" width="32" height="8" rx="2" fill="#7f1d1d" stroke="#f59e0b" strokeWidth="1.5" />
            {/* Bánh xe gỗ bọc đồng của Thần Công */}
            <circle cx="28" cy="36" r="6" fill="#451a03" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="44" cy="36" r="6" fill="#451a03" stroke="#fbbf24" strokeWidth="2" />
            {/* Nòng Đại Pháo Thần Công chạm rồng vàng hướng lên */}
            <g transform="rotate(-22, 36, 28)">
              <path
                d="M18 22 L52 17 L54 29 L18 32 Z"
                fill="url(#tdGoldTrim)"
                stroke="#fef08a"
                strokeWidth="1.6"
              />
              {/* Đai đồng gia cố nòng pháo */}
              <rect x="26" y="20" width="3.5" height="11" fill="#78350f" />
              <rect x="38" y="19" width="3.5" height="11" fill="#78350f" />
              <rect x="50" y="16" width="5" height="14" rx="1.5" fill="#dc2626" stroke="#fde047" strokeWidth="1.2" />
              {/* Lửa & Lôi Quang ở miệng pháo */}
              <circle cx="58" cy="23" r="5" fill="#ef4444" opacity="0.85" />
              <circle cx="58" cy="23" r="2.5" fill="#fef08a" />
            </g>
          </g>
        )}

        {/* Lệnh Bài Cấp Độ Cổ Trang (Kim Bài Level) */}
        <rect
          x="19"
          y="50"
          width="34"
          height="13"
          rx="4"
          fill="#450a0a"
          stroke="#fbbf24"
          strokeWidth="1.5"
        />
        <text x="36" y="59.5" textAnchor="middle" fill="#fde047" fontSize="8.5" fontWeight="900">
          ★ CẤP {level}
        </text>
      </svg>
    );
  },

  TdBaseCastle: ({
    team = "TEAM_A",
    hasShield = false,
  }: {
    team?: "TEAM_A" | "TEAM_B";
    hasShield?: boolean;
  }) => {
    const isTeamA = team === "TEAM_A";
    const roofPrimary = isTeamA ? "#0284c7" : "#be123c";
    const roofHighlight = isTeamA ? "#38bdf8" : "#fb7185";
    const bannerColor = isTeamA ? "#2563eb" : "#e11d48";

    return (
      <svg viewBox="0 0 84 84" className="w-14 h-14 overflow-visible drop-shadow-[0_6px_12px_rgba(0,0,0,0.75)]">
        {/* Hộ Thành Đại Trận (Kim Chung Tráo) khi bật Khiên */}
        {hasShield && (
          <g>
            <circle
              cx="42"
              cy="42"
              r="39"
              fill="rgba(250, 204, 21, 0.18)"
              stroke="#fde047"
              strokeWidth="2.8"
              strokeDasharray="6 3"
            />
            <circle
              cx="42"
              cy="42"
              r="34"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="3 4"
            />
          </g>
        )}

        {/* Đại Kỳ Chiến Trận cắm trên đỉnh thành */}
        <line x1="14" y1="6" x2="14" y2="36" stroke="#fde047" strokeWidth="2" />
        <polygon points="14,7 28,12 14,18" fill={bannerColor} stroke="#fde047" strokeWidth="1" />
        <line x1="70" y1="6" x2="70" y2="36" stroke="#fde047" strokeWidth="2" />
        <polygon points="70,7 56,12 70,18" fill={bannerColor} stroke="#fde047" strokeWidth="1" />

        {/* Tường Thành Đá Xanh Cổ Đại & Lỗ Châu Mai */}
        <path
          d="M6 74 L10 42 H74 L78 74 Z"
          fill="#334155"
          stroke="#94a3b8"
          strokeWidth="2"
        />
        {/* Hàng gạch lỗ châu mai trên mặt thành */}
        {[10, 20, 30, 40, 50, 60, 68].map((x) => (
          <rect key={x} x={x} y="37" width="6" height="6" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
        ))}
        {/* Vân gạch đá cổ trên tường thành */}
        <line x1="9" y1="53" x2="75" y2="53" stroke="#1e293b" strokeWidth="1.5" />
        <line x1="8" y1="63" x2="76" y2="63" stroke="#1e293b" strokeWidth="1.5" />

        {/* Lầu Thành Cổ Trang 2 Tầng Mái Cong Lưu Ly */}
        {/* Tầng lầu 1 */}
        <rect x="20" y="25" width="44" height="16" fill="#991b1b" stroke="#fbbf24" strokeWidth="1.5" />
        {/* Cột son thếp vàng */}
        <line x1="28" y1="25" x2="28" y2="41" stroke="#fde047" strokeWidth="2" />
        <line x1="56" y1="25" x2="56" y2="41" stroke="#fde047" strokeWidth="2" />
        {/* Mái ngói lưu ly tầng 1 cong vút hai đầu đao */}
        <path
          d="M10 27 Q26 23 42 16 Q58 23 74 27 Q58 30 42 26 Q26 30 10 27 Z"
          fill={roofPrimary}
          stroke="#fde047"
          strokeWidth="1.8"
        />

        {/* Tầng lầu 2 (Vọng Các) */}
        <rect x="27" y="13" width="30" height="10" fill="#7f1d1d" stroke="#fbbf24" strokeWidth="1.2" />
        {/* Mái ngói lưu ly tầng thượng & Đỉnh Bảo Bình Vàng */}
        <path
          d="M17 15 Q30 11 42 4 Q54 11 67 15 Q54 18 42 14 Q30 18 17 15 Z"
          fill={roofHighlight}
          stroke="#fef08a"
          strokeWidth="1.8"
        />
        <circle cx="42" cy="3.5" r="2.8" fill="#fde047" />

        {/* Đèn lồng đỏ treo hai bên lầu thành */}
        <circle cx="16" cy="31" r="3" fill="#ef4444" stroke="#fde047" strokeWidth="1" />
        <circle cx="68" cy="31" r="3" fill="#ef4444" stroke="#fde047" strokeWidth="1" />

        {/* Hoành phi tên thành */}
        <rect x="29" y="42" width="26" height="8" rx="2" fill="#450a0a" stroke="#fbbf24" strokeWidth="1.2" />
        <text x="42" y="48" textAnchor="middle" fill="#fde047" fontSize="6.5" fontWeight="900">
          {isTeamA ? "LONG THÀNH" : "HỔ QUAN"}
        </text>

        {/* Cổng Vòm Thành Môn Sơn Đỏ Đóng Đinh Đồng Vàng */}
        <path
          d="M31 74 V57 A11 11 0 0 1 53 57 V74 Z"
          fill="#7f1d1d"
          stroke="#fbbf24"
          strokeWidth="2"
        />
        <line x1="42" y1="46" x2="42" y2="74" stroke="#fbbf24" strokeWidth="1.5" />
        {/* Đinh đồng trên cánh cổng thành */}
        {[56, 62, 68].map((y) => (
          <g key={y}>
            <circle cx="36" cy={y} r="1.3" fill="#fde047" />
            <circle cx="48" cy={y} r="1.3" fill="#fde047" />
          </g>
        ))}
      </svg>
    );
  },

  TdCreepUnit: ({
    creepType = "SCOUT",
    isFrozen = false,
  }: {
    creepType?: "SCOUT" | "TANK" | string;
    isFrozen?: boolean;
  }) => {
    const isTank = creepType.toUpperCase() === "TANK";
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 overflow-visible drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]">
        {isTank ? (
          <g>
            {/* VÕ TƯỚNG THIẾT GIÁP HỔ PHÙ / CHIẾN XA CÔNG THÀNH (300 HP) */}
            {/* Áo choàng chiến bào đỏ tung bay sau lưng */}
            <path d="M12 24 Q4 36 8 50 L24 46 Z" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.2" />
            {/* Cờ lệnh cắm sau lưng tướng quân */}
            <line x1="16" y1="6" x2="22" y2="34" stroke="#fde047" strokeWidth="2" />
            <polygon points="16,6 4,11 18,17" fill="#b91c1c" stroke="#fde047" strokeWidth="1.2" />

            {/* Thân Minh Quang Kim Giáp */}
            <rect x="20" y="24" width="24" height="24" rx="5" fill="#b45309" stroke="#fde047" strokeWidth="2" />
            {/* Hộ tâm kính đầu hổ bằng vàng trước ngực */}
            <circle cx="32" cy="34" r="6" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
            <circle cx="32" cy="34" r="2.5" fill="#dc2626" />

            {/* Mũ trụ Kim Khôi & Lông chim trĩ đỏ (Hồng Anh) */}
            <path d="M22 10 Q32 0 44 8 Q36 12 32 14 Z" fill="#ef4444" />
            <path d="M22 22 C22 12 42 12 42 22 Z" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.8" />
            <rect x="25" y="19" width="14" height="6" rx="2" fill="#0f172a" />
            <circle cx="29" cy="22" r="1.8" fill="#ef4444" />
            <circle cx="35" cy="22" r="1.8" fill="#ef4444" />

            {/* Khiên Đồng Hổ Phù bên tay trái */}
            <path
              d="M10 26 L22 23 V40 C22 47 16 51 16 51 C16 51 10 47 10 40 Z"
              fill="#78350f"
              stroke="#fde047"
              strokeWidth="2"
            />
            <circle cx="16" cy="36" r="3.5" fill="#fbbf24" />

            {/* Thanh Long Yển Nguyệt Đao bên tay phải */}
            <line x1="48" y1="54" x2="52" y2="10" stroke="#fde047" strokeWidth="2.5" />
            <path
              d="M52 6 C62 10 62 22 50 24 L52 6 Z"
              fill="#e2e8f0"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
          </g>
        ) : (
          <g>
            {/* KHINH KỴ TIÊN PHONG / THÍCH KHÁCH CỔ TRANG CẦM TRƯỜNG THƯƠNG (50 HP) */}
            {/* Khăn choàng cổ trang bay lượn */}
            <path d="M18 28 Q6 24 4 34 Q12 36 20 34" fill="#0284c7" />
            {/* Thân giáp nhẹ */}
            <path d="M22 26 L42 26 L46 46 L18 46 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.8" />
            <line x1="24" y1="34" x2="40" y2="34" stroke="#fbbf24" strokeWidth="2" />
            {/* Đầu đội Nón Chiến / Mũ Trụ Đồng Cổ Đại */}
            <circle cx="32" cy="20" r="8" fill="#fde68a" stroke="#78350f" strokeWidth="1.5" />
            <polygon
              points="32,6 14,18 50,18"
              fill="#b45309"
              stroke="#fde047"
              strokeWidth="1.8"
            />
            <circle cx="32" cy="6" r="2.5" fill="#ef4444" />
            {/* Mắt sắc bén */}
            <circle cx="29" cy="21" r="1.6" fill="#0f172a" />
            <circle cx="35" cy="21" r="1.6" fill="#0f172a" />
            {/* Trường Thương Ngân Long đâm tới trước */}
            <line x1="10" y1="42" x2="54" y2="28" stroke="#fde047" strokeWidth="2.6" />
            <polygon points="62,25 50,25 53,33" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
            {/* Tua rua đỏ ở đầu mũi thương */}
            <circle cx="50" cy="29" r="3" fill="#ef4444" />
          </g>
        )}

        {/* Khối Hàn Băng Phong Ấn khi trúng chiêu Đóng Băng */}
        {isFrozen && (
          <g>
            <polygon
              points="8,14 20,6 46,6 56,16 54,54 10,54"
              fill="rgba(103, 232, 249, 0.48)"
              stroke="#cffafe"
              strokeWidth="2.2"
            />
            <path d="M18 16 L30 28 M44 18 L34 34" stroke="#ffffff" strokeWidth="1.8" opacity="0.85" />
          </g>
        )}
      </svg>
    );
  },

  // =========================================================================
  // GAME 3: ĐUA THUYỀN VƯỢT BÃO (DRAGON BOAT - LỄ HỘI ĐUA THUYỀN RỒNG TRUYỀN THỐNG)
  // =========================================================================
  DragonBoat: ({
    color = "#ef4444",
    isNitro = false,
    hasShield = false,
  }: {
    color?: string;
    isNitro?: boolean;
    hasShield?: boolean;
  }) => {
    const isRed = color.toLowerCase().includes("ef4444") || color.toLowerCase().includes("f43f5e");
    const hullDark = isRed ? "#991b1b" : "#1e3a8a";
    const hullLight = isRed ? "#ef4444" : "#3b82f6";
    const headbandCol = isRed ? "#fef08a" : "#67e8f9";

    return (
      <svg viewBox="0 0 180 68" className="w-36 h-14 overflow-visible drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)]">
        <defs>
          <linearGradient id={`boatHull-${isRed ? "A" : "B"}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={hullLight} />
            <stop offset="100%" stopColor={hullDark} />
          </linearGradient>
          <linearGradient id="dragonGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Vòm Phong Thần Hộ Thuẫn (Lá Chắn Gió) */}
        {hasShield && (
          <g>
            <ellipse
              cx="92"
              cy="34"
              rx="84"
              ry="28"
              fill="rgba(45, 212, 191, 0.2)"
              stroke="#2dd4bf"
              strokeWidth="2.5"
              strokeDasharray="8 4"
            />
            <ellipse
              cx="92"
              cy="34"
              rx="76"
              ry="22"
              fill="none"
              stroke="#99f6e4"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
          </g>
        )}

        {/* Luồng Long Diễm Phản Lực khi bật Tăng Tốc Nitro */}
        {isNitro && (
          <g>
            <path d="M18 32 L-22 18 L-10 34 L-24 48 L18 42 Z" fill="#f97316" opacity="0.95" />
            <path d="M18 34 L-10 25 L-3 34 L-12 43 L18 40 Z" fill="#fef08a" />
            {/* Rồng phun châu nhả lửa ở mũi thuyền */}
            <path d="M162 24 L186 16 L178 26 L188 32 L162 29 Z" fill="#fb923c" />
          </g>
        )}

        {/* Vệt sóng rẽ nước trắng xóa dưới đáy thuyền (Water Wake) */}
        <path
          d="M8 46 Q45 52 95 47 Q135 51 164 43"
          fill="none"
          stroke="#e0f2fe"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M22 51 Q70 56 135 50"
          fill="none"
          stroke="#7dd3fc"
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.7"
        />

        {/* Cờ Lệnh Thủy Quân cắm ở đuôi thuyền */}
        <line x1="22" y1="8" x2="26" y2="34" stroke="#fde047" strokeWidth="2" />
        <polygon points="22,8 6,13 24,20" fill={hullLight} stroke="#fde047" strokeWidth="1.2" />

        {/* Đuôi Rồng Ngũ Sắc uốn cong vút */}
        <path
          d="M20 38 Q6 24 12 10 Q18 14 19 24 Q24 14 28 18 Q26 28 30 36 Z"
          fill="url(#dragonGold)"
          stroke="#78350f"
          strokeWidth="1.5"
        />

        {/* Đội 4 Tay Chèo & Người Đánh Trống Chỉ Huy trên khoang thuyền */}
        {[46, 68, 90, 112].map((rx, idx) => (
          <g key={rx}>
            {/* Thân tay chèo */}
            <path d={`M${rx - 4} 34 L${rx + 4} 34 L${rx + 6} 24 L${rx - 2} 24 Z`} fill={hullLight} stroke="#fff" strokeWidth="0.8" />
            {/* Đầu tay chèo & Dải băng trán */}
            <circle cx={rx + 1} cy="19" r="4.2" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
            <line x1={rx - 3} y1="17.5" x2={rx + 5} y2="17.5" stroke={headbandCol} strokeWidth="2" />
            {/* Dải băng bay phía sau */}
            <path d={`M${rx - 3} 17.5 Q${rx - 8} ${15 + (idx % 2) * 3} ${rx - 10} 19`} stroke={headbandCol} strokeWidth="1.5" fill="none" />
          </g>
        ))}

        {/* Trống Chiến Cổ Truyền & Người Đánh Trống ở mũi thuyền */}
        <rect x="124" y="23" width="11" height="11" rx="2" fill="#dc2626" stroke="#fde047" strokeWidth="1.5" />
        <circle cx="129.5" cy="28.5" r="3" fill="#fef08a" />
        <circle cx="122" cy="18" r="4" fill="#fde68a" stroke="#78350f" strokeWidth="1" />

        {/* Thân Thuyền Rồng Chạm Vảy Vàng */}
        <path
          d="M20 33 Q88 53 146 28 L134 45 L30 45 Z"
          fill={`url(#boatHull-${isRed ? "A" : "B"})`}
          stroke="#fde047"
          strokeWidth="2.2"
        />
        {/* Mạn thuyền viền kim tuyến */}
        <path d="M24 35 Q88 48 142 30" fill="none" stroke="#fef08a" strokeWidth="1.5" />
        {/* Họa tiết Vảy Rồng tinh xảo dọc thân thuyền */}
        <path
          d="M36 39 Q43 34 50 39 Q57 34 64 39 Q71 34 78 39 Q85 34 92 39 Q99 34 106 39 Q113 34 120 39 Q127 34 134 38"
          fill="none"
          stroke="#fde047"
          strokeWidth="1.8"
        />

        {/* Đầu Rồng Thần Chạm Khắc Tinh Xảo ở Mũi Thuyền */}
        <g transform="translate(134, 4)">
          {/* Bờm rồng & Sừng vàng */}
          <path d="M8 22 L0 10 L10 14 L6 4 L16 11 L18 2 L22 12" fill="#f97316" stroke="#fde047" strokeWidth="1.2" />
          {/* Cổ & Đầu rồng */}
          <path
            d="M4 28 Q10 16 18 12 L32 10 L26 17 L34 20 L22 23 L30 27 L16 28 L10 36 Z"
            fill="url(#dragonGold)"
            stroke="#78350f"
            strokeWidth="1.4"
          />
          {/* Mắt rồng đỏ rực & Ngọc Minh Châu trong miệng rồng */}
          <circle cx="20" cy="15" r="2.2" fill="#dc2626" stroke="#fef08a" strokeWidth="0.6" />
          <circle cx="29" cy="22" r="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
          {/* Râu rồng uốn lượn */}
          <path d="M28 15 Q38 10 42 16" fill="none" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Dàn 4 Mái Chèo Gỗ Vàng Khua Nước & Bọt Sóng Trắng */}
        {[46, 68, 90, 112].map((ox) => (
          <g key={`oar-${ox}`}>
            <line
              x1={ox + 2}
              y1="30"
              x2={ox - 10}
              y2="54"
              stroke="#fde047"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <polygon
              points={`${ox - 7},48 ${ox - 14},56 ${ox - 9},58 ${ox - 4},50`}
              fill="#f59e0b"
              stroke="#fef08a"
              strokeWidth="0.8"
            />
            {/* Bọt nước trắng tung lên ở đầu mái chèo */}
            <ellipse cx={ox - 10} cy="56" rx="6" ry="2.2" fill="#e0f2fe" opacity="0.9" />
          </g>
        ))}
      </svg>
    );
  },

  RiverObstacle: ({ type = "WHIRLPOOL" }: { type?: "WHIRLPOOL" | "ROCK_REEF" | string }) => {
    const isWhirlpool = type === "WHIRLPOOL";
    return isWhirlpool ? (
      <svg viewBox="0 0 56 56" className="w-11 h-11 animate-spin drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
        {/* Vòng xoáy đại dương đa tầng */}
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="rgba(2, 132, 199, 0.35)"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeDasharray="9 5"
        />
        <circle cx="28" cy="28" r="17" fill="rgba(12, 74, 110, 0.65)" />
        <path
          d="M28 7 A21 21 0 1 1 9 36 M28 13 A15 15 0 1 0 43 28 M28 19 A9 9 0 1 1 20 32"
          fill="none"
          stroke="#e0f2fe"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Tâm vực xoáy */}
        <circle cx="28" cy="28" r="5" fill="#082f49" stroke="#7dd3fc" strokeWidth="1.5" />
      </svg>
    ) : (
      <svg viewBox="0 0 56 56" className="w-11 h-11 drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
        {/* Cụm Đá Ngầm Tai Mèo Rêu Phong & Sóng Va Đập */}
        <polygon
          points="6,44 16,16 26,30 34,8 46,26 50,44"
          fill="#475569"
          stroke="#cbd5e1"
          strokeWidth="1.8"
        />
        <polygon points="16,16 22,32 10,44" fill="#334155" />
        <polygon points="34,8 40,28 26,44 26,30" fill="#1e293b" />
        {/* Rêu phong xanh trên mỏm đá */}
        <path d="M14 22 Q18 26 22 24 M32 15 Q36 20 40 18" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Sóng bạc đầu vỗ quanh chân đá ngầm */}
        <path
          d="M3 44 Q12 39 20 44 T36 44 T53 44"
          fill="none"
          stroke="#f0f9ff"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    );
  },

  // =========================================================================
  // GAME 4: CHUYẾN TÀU SINH TỬ (RUNAWAY TRAIN - STEAMPUNK EXPRESS RAILWAY)
  // =========================================================================
  TrainLocomotive: ({
    isOverdrive = false,
    isDerailed = false,
  }: {
    isOverdrive?: boolean;
    isDerailed?: boolean;
  }) => (
    <svg
      viewBox="0 0 96 68"
      className={`w-14 h-11 overflow-visible drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
        isDerailed ? "rotate-12" : ""
      }`}
    >
      <defs>
        <linearGradient id="trainBoiler" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isOverdrive ? "#ef4444" : "#334155"} />
          <stop offset="50%" stopColor={isOverdrive ? "#991b1b" : "#1e293b"} />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="trainCab" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="headlightBeam" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Luồng ánh sáng đèn pha đầu tàu chiếu về phía trước */}
      <polygon points="76,30 96,18 96,44" fill="url(#headlightBeam)" />

      {/* Các cụm khói ống khói bồng bềnh */}
      <circle cx="62" cy="4" r="6" fill={isOverdrive ? "#fb923c" : "#e2e8f0"} opacity="0.9" />
      <circle cx="50" cy="-1" r="7.5" fill={isOverdrive ? "#ef4444" : "#cbd5e1"} opacity="0.75" />
      <circle cx="36" cy="-4" r="9" fill={isOverdrive ? "#f97316" : "#94a3b8"} opacity="0.5" />

      {/* Mái & Buồng lái Steampunk (Cab) */}
      <path d="M6 16 H36 L34 20 H8 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
      <rect x="10" y="20" width="24" height="28" rx="2" fill="url(#trainCab)" stroke="#fbbf24" strokeWidth="1.8" />
      {/* Cửa sổ buồng lái sáng đèn vàng ấm */}
      <rect x="15" y="24" width="14" height="11" rx="2" fill="#fef08a" stroke="#78350f" strokeWidth="1.2" />

      {/* Thân Nồi Hơi (Boiler) & Đai Đồng Thau */}
      <rect x="32" y="25" width="40" height="23" rx="5" fill="url(#trainBoiler)" stroke="#fbbf24" strokeWidth="1.8" />
      <rect x="42" y="25" width="3" height="23" fill="#fbbf24" />
      <rect x="54" y="25" width="3" height="23" fill="#fbbf24" />
      {/* Vòm hơi đồng (Steam Dome) */}
      <path d="M44 25 C44 18 52 18 52 25 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />

      {/* Ống khói loe cổ điển */}
      <polygon points="58,10 68,10 66,25 60,25" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
      <ellipse cx="63" cy="10" rx="6" ry="2" fill="#fbbf24" />

      {/* Đèn pha vàng trước mũi tàu & Lưới cản đá (Cowcatcher) */}
      <rect x="71" y="26" width="5" height="8" rx="1.5" fill="#fef08a" stroke="#d97706" strokeWidth="1.2" />
      <polygon points="70,40 84,50 70,50" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
      <line x1="73" y1="43" x2="73" y2="50" stroke="#78350f" strokeWidth="1.2" />
      <line x1="77" y1="46" x2="77" y2="50" stroke="#78350f" strokeWidth="1.2" />

      {/* Hệ thống 3 Bánh Đà Lớn & Thanh Truyền Động Piston */}
      {[20, 42, 62].map((wx, i) => (
        <g key={wx}>
          <circle cx={wx} cy="52" r={i === 2 ? 7 : 8.5} fill="#dc2626" stroke="#fbbf24" strokeWidth="2.5" />
          <circle cx={wx} cy="52" r="3" fill="#fef08a" />
        </g>
      ))}
      <line x1="18" y1="52" x2="64" y2="52" stroke="#e2e8f0" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="34" y="48" width="12" height="6" rx="1.5" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
    </svg>
  ),

  RailTrackTile: ({ trackType = "STRAIGHT_H" }: { trackType: string }) => {
    const type = trackType.toUpperCase();
    return (
      <svg viewBox="0 0 48 48" className="w-full h-full p-0.5">
        {type === "STRAIGHT_H" && (
          <g>
            {/* Nền đá dăm đường sắt (Ballast) */}
            <rect x="0" y="9" width="48" height="30" rx="3" fill="#334155" opacity="0.65" />
            {/* Tà vẹt gỗ sồi đóng đinh tán */}
            {[5, 15, 25, 35, 43].map((x) => (
              <g key={x}>
                <rect x={x - 2} y="8" width="5" height="32" rx="1" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
                <circle cx={x + 0.5} cy="13" r="1" fill="#cbd5e1" />
                <circle cx={x + 0.5} cy="35" r="1" fill="#cbd5e1" />
              </g>
            ))}
            {/* 2 Thanh ray thép đôi phản quang */}
            <rect x="0" y="14" width="48" height="4.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="0.8" />
            <line x1="0" y1="15.5" x2="48" y2="15.5" stroke="#e0f2fe" strokeWidth="1.2" />
            <rect x="0" y="29.5" width="48" height="4.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="0.8" />
            <line x1="0" y1="31" x2="48" y2="31" stroke="#e0f2fe" strokeWidth="1.2" />
          </g>
        )}
        {type === "STRAIGHT_V" && (
          <g>
            {/* Nền đá dăm đường sắt */}
            <rect x="9" y="0" width="30" height="48" rx="3" fill="#334155" opacity="0.65" />
            {/* Tà vẹt gỗ sồi ngang */}
            {[5, 15, 25, 35, 43].map((y) => (
              <g key={y}>
                <rect x="8" y={y - 2} width="32" height="5" rx="1" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
                <circle cx="13" cy={y + 0.5} r="1" fill="#cbd5e1" />
                <circle cx="35" cy={y + 0.5} r="1" fill="#cbd5e1" />
              </g>
            ))}
            {/* 2 Thanh ray thép dọc */}
            <rect x="14" y="0" width="4.5" height="48" fill="#94a3b8" stroke="#0f172a" strokeWidth="0.8" />
            <line x1="15.5" y1="0" x2="15.5" y2="48" stroke="#e0f2fe" strokeWidth="1.2" />
            <rect x="29.5" y="0" width="4.5" height="48" fill="#94a3b8" stroke="#0f172a" strokeWidth="0.8" />
            <line x1="31" y1="0" x2="31" y2="48" stroke="#e0f2fe" strokeWidth="1.2" />
          </g>
        )}
        {type === "CURVE_SE" && (
          <g>
            {/* Ray cua Đông - Nam (┏) */}
            <path d="M48 23 A25 25 0 0 0 23 48" fill="none" stroke="#334155" strokeWidth="26" opacity="0.6" />
            <path d="M48 23 A25 25 0 0 0 23 48" fill="none" stroke="#78350f" strokeWidth="18" strokeDasharray="4 4" />
            <path d="M48 15 A33 33 0 0 0 15 48" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />
            <path d="M48 31 A17 17 0 0 0 31 48" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />
          </g>
        )}
        {type === "CURVE_SW" && (
          <g>
            {/* Ray cua Tây - Nam (┓) */}
            <path d="M0 23 A25 25 0 0 1 25 48" fill="none" stroke="#334155" strokeWidth="26" opacity="0.6" />
            <path d="M0 23 A25 25 0 0 1 25 48" fill="none" stroke="#78350f" strokeWidth="18" strokeDasharray="4 4" />
            <path d="M0 15 A33 33 0 0 1 33 48" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />
            <path d="M0 31 A17 17 0 0 1 17 48" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />
          </g>
        )}
        {type === "CURVE_NE" && (
          <g>
            {/* Ray cua Đông - Bắc (┗) */}
            <path d="M23 0 A25 25 0 0 0 48 25" fill="none" stroke="#334155" strokeWidth="26" opacity="0.6" />
            <path d="M23 0 A25 25 0 0 0 48 25" fill="none" stroke="#78350f" strokeWidth="18" strokeDasharray="4 4" />
            <path d="M15 0 A33 33 0 0 0 48 33" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />
            <path d="M31 0 A17 17 0 0 0 48 17" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />
          </g>
        )}
        {type === "CURVE_NW" && (
          <g>
            {/* Ray cua Tây - Bắc (┛) */}
            <path d="M25 0 A25 25 0 0 1 0 25" fill="none" stroke="#334155" strokeWidth="26" opacity="0.6" />
            <path d="M25 0 A25 25 0 0 1 0 25" fill="none" stroke="#78350f" strokeWidth="18" strokeDasharray="4 4" />
            <path d="M33 0 A33 33 0 0 1 0 33" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />
            <path d="M17 0 A17 17 0 0 1 0 17" fill="none" stroke="#cbd5e1" strokeWidth="4.5" />
          </g>
        )}
      </svg>
    );
  },

  // =========================================================================
  // GAME 5: PHÁO ĐÀI TRI THỨC (ARTILLERY DUEL - HEAVY SIEGE HOWITZER BASTION)
  // =========================================================================
  ArtilleryCannon: ({
    angle = 45,
    color = "#2563eb",
    isPiercing = false,
  }: {
    angle?: number;
    color?: string;
    isPiercing?: boolean;
  }) => (
    <svg viewBox="0 0 108 92" className="w-20 h-18 overflow-visible drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)]">
      <defs>
        <linearGradient id={`cannonBarrel-${isPiercing ? "P" : "N"}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isPiercing ? "#4c1d95" : "#1e293b"} />
          <stop offset="60%" stopColor={isPiercing ? "#7c3aed" : "#475569"} />
          <stop offset="100%" stopColor={isPiercing ? "#c084fc" : "#64748b"} />
        </linearGradient>
      </defs>

      {/* Bệ Lô Cốt Thép Kiên Cố (Armored Bunker Base) */}
      <polygon
        points="4,84 12,62 66,62 74,84"
        fill="#1e293b"
        stroke={color}
        strokeWidth="2.2"
      />
      <rect x="14" y="67" width="50" height="12" rx="2" fill="#0f172a" />
      {/* Đinh tán & Khe quan sát lô cốt */}
      <rect x="20" y="70" width="16" height="5" rx="1.5" fill="#38bdf8" opacity="0.85" />
      <circle cx="46" cy="72.5" r="2" fill={color} />
      <circle cx="56" cy="72.5" r="2" fill="#fbbf24" />

      {/* Vòng cung thước đo góc bắn cơ khí (Elevation Arc) */}
      <path
        d="M 56 62 A 24 24 0 0 0 32 38"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeDasharray="3 2"
      />

      {/* Nòng Đại Pháo Siêu Trường xoay theo góc bắn */}
      <g transform={`rotate(${-angle}, 34, 58)`}>
        {/* Xi-lanh thủy lực giảm giật bên dưới nòng */}
        <rect x="24" y="56" width="32" height="7" rx="2" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.2" />
        {/* Thân nòng pháo chính */}
        <path
          d="M 20 44 L 84 46 L 84 58 L 20 60 Z"
          fill={`url(#cannonBarrel-${isPiercing ? "P" : "N"})`}
          stroke={isPiercing ? "#e9d5ff" : "#e2e8f0"}
          strokeWidth="2"
        />
        {/* Đai gia cố nòng & Bộ phận hãm lùi đầu nòng (Muzzle Brake) */}
        <rect x="44" y="43.5" width="5" height="17" rx="1" fill="#f59e0b" />
        <rect x="64" y="44.5" width="4" height="15" rx="1" fill="#f59e0b" />
        <rect x="80" y="42" width="10" height="20" rx="2" fill={isPiercing ? "#a855f7" : "#dc2626"} stroke="#fde047" strokeWidth="1.5" />

        {/* Vòng năng lượng nếu nạp Đạn Xuyên Địa Hình */}
        {isPiercing && (
          <g>
            <ellipse cx="56" cy="52" rx="3" ry="11" fill="none" stroke="#f0abfc" strokeWidth="1.8" />
            <ellipse cx="72" cy="52" rx="3" ry="11" fill="none" stroke="#f0abfc" strokeWidth="1.8" />
          </g>
        )}

        {/* Tia ngắm Laser chuẩn trực ở đầu nòng */}
        <line
          x1="90"
          y1="52"
          x2="115"
          y2="52"
          stroke={isPiercing ? "#e879f9" : "#fde047"}
          strokeWidth="2.2"
          strokeDasharray="4 3"
        />
      </g>

      {/* Trục bánh răng & Khiên bọc ổ trục pháo */}
      <circle cx="34" cy="58" r="14" fill={color} stroke="#f8fafc" strokeWidth="2.5" />
      <circle cx="34" cy="58" r="8" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="34" cy="58" r="3.5" fill="#fde047" />
    </svg>
  ),

  // =========================================================================
  // GAME 6: TRUY TÌM NỘI GIÁN (EDU AMONG US - SCI-FI SPACE CREW)
  // =========================================================================
  AstronautCrew: ({
    color = "#ef4444",
    isIsolated = false,
    isImpostorBadge = false,
  }: {
    color?: string;
    isIsolated?: boolean;
    isImpostorBadge?: boolean;
  }) => (
    <svg viewBox="0 0 68 68" className="w-12 h-12 overflow-visible drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)]">
      {/* Đế hào quang Hologram dưới chân phi hành gia */}
      <ellipse
        cx="35"
        cy="61"
        rx="20"
        ry="5"
        fill="rgba(56, 189, 248, 0.25)"
        stroke={isImpostorBadge ? "#ef4444" : "#38bdf8"}
        strokeWidth="1.2"
      />

      {/* Bình dưỡng khí & Động cơ phản lực sau lưng (Jetpack) */}
      <rect x="7" y="20" width="12" height="28" rx="5" fill={color} stroke="#0f172a" strokeWidth="2.4" />
      <rect x="9" y="24" width="4" height="18" rx="2" fill="#ffffff" opacity="0.22" />

      {/* Thân bộ đồ phi hành gia 3D */}
      <rect x="16" y="10" width="36" height="44" rx="17" fill={color} stroke="#0f172a" strokeWidth="2.8" />
      {/* Vệt sáng 3D dọc thân */}
      <path d="M 22 18 Q 20 32 22 46" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.25" fill="none" />

      {/* Đai ngực & Hộp điều khiển sinh tồn trước bụng */}
      <rect x="23" y="37" width="18" height="9" rx="2.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
      <circle cx="28" cy="41.5" r="2" fill="#10b981" />
      <circle cx="35" cy="41.5" r="2" fill="#ef4444" />

      {/* Chân phi hành gia */}
      <rect x="19" y="48" width="12" height="11" rx="4.5" fill={color} stroke="#0f172a" strokeWidth="2.5" />
      <rect x="37" y="48" width="12" height="11" rx="4.5" fill={color} stroke="#0f172a" strokeWidth="2.5" />

      {/* Kính mũ bảo hiểm Vũ Trụ đa lớp phản quang */}
      <rect x="26" y="17" width="28" height="17" rx="8.5" fill="#0284c7" stroke="#0f172a" strokeWidth="2.5" />
      <rect x="28" y="19" width="24" height="11" rx="6" fill="#38bdf8" />
      <ellipse cx="43" cy="22.5" rx="6.5" ry="2.8" fill="#ffffff" opacity="0.9" />
      <circle cx="33" cy="27" r="1.5" fill="#bae6fd" opacity="0.8" />

      {/* Ăng ten liên lạc Vũ Trụ / Sừng Nội Gián trên đỉnh mũ */}
      {isImpostorBadge ? (
        <g>
          <polygon points="26,11 22,2 31,9" fill="#ef4444" stroke="#fef08a" strokeWidth="1.2" />
          <polygon points="42,11 46,2 37,9" fill="#ef4444" stroke="#fef08a" strokeWidth="1.2" />
        </g>
      ) : (
        <g>
          <line x1="34" y1="10" x2="34" y2="3" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="34" cy="3" r="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
        </g>
      )}

      {/* Buồng giam Laser Cryo nếu bị Bỏ Phiếu Cách Ly */}
      {isIsolated && (
        <g>
          <rect
            x="5"
            y="5"
            width="58"
            height="58"
            rx="10"
            fill="rgba(15, 23, 42, 0.65)"
            stroke="#ef4444"
            strokeWidth="2.8"
          />
          <line x1="20" y1="5" x2="20" y2="63" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="34" y1="5" x2="34" y2="63" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="48" y1="5" x2="48" y2="63" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
          <rect x="12" y="28" width="44" height="12" rx="3" fill="#dc2626" />
          <text x="34" y="36.5" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900">
            CÁCH LY
          </text>
        </g>
      )}
    </svg>
  ),

  // =========================================================================
  // GAME 7: ĐẶT BOM MÊ CUNG (QUIZ BOMBERMAN)
  // =========================================================================
  TickingBomb: ({ isLongFire = false }: { isLongFire?: boolean }) => (
    <svg viewBox="0 0 64 64" className="w-10 h-10 bomb-ticking overflow-visible">
      {/* Thân quả bom */}
      <circle
        cx="30"
        cy="36"
        r="20"
        fill={isLongFire ? "#7c3aed" : "#0f172a"}
        stroke={isLongFire ? "#ddd6fe" : "#f8fafc"}
        strokeWidth="2.5"
      />
      {/* Điểm phản sáng trên quả bom */}
      <ellipse cx="23" cy="28" rx="5" ry="3" transform="rotate(-30 23 28)" fill="#94a3b8" opacity="0.6" />
      {/* Cổ bom & Dây cháy chậm */}
      <rect x="26" y="13" width="8" height="5" rx="1.5" fill="#475569" />
      <path d="M30 13 Q42 2 52 12" stroke="#fbbf24" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Tia lửa xẹt ở đầu dây cháy chậm */}
      <circle cx="53" cy="12" r="6" fill="#ef4444" />
      <circle cx="53" cy="12" r="3" fill="#fef08a" />
    </svg>
  ),

  BomberCharacter: ({
    color = "#10b981",
    label = "A",
    hasShield = false,
  }: {
    color?: string;
    label?: string;
    hasShield?: boolean;
  }) => (
    <svg viewBox="0 0 48 48" className="w-7 h-7 overflow-visible drop-shadow">
      {hasShield && (
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="rgba(56, 189, 248, 0.25)"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
      )}
      {/* Mũ Bomber & Ăng-ten */}
      <circle cx="24" cy="6" r="3.5" fill="#fde047" />
      <rect x="10" y="10" width="28" height="28" rx="10" fill={color} stroke="#ffffff" strokeWidth="2.2" />
      {/* Khuôn mặt & Mắt Bomber */}
      <rect x="14" y="15" width="20" height="11" rx="4" fill="#0f172a" />
      <circle cx="19" cy="20.5" r="2.2" fill="#38bdf8" />
      <circle cx="29" cy="20.5" r="2.2" fill="#38bdf8" />
      <text x="24" y="35" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
        {label}
      </text>
    </svg>
  ),

  MazeWallTile: ({ type = "W" }: { type?: "W" | "B" }) =>
    type === "W" ? (
      // Tường Sắt Cố Định (Indestructible Steel Block)
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="1" y="1" width="38" height="38" rx="4" fill="#334155" stroke="#64748b" strokeWidth="2" />
        <rect x="6" y="6" width="28" height="28" rx="2" fill="#1e293b" />
        <circle cx="9" cy="9" r="2" fill="#94a3b8" />
        <circle cx="31" cy="9" r="2" fill="#94a3b8" />
        <circle cx="9" cy="31" r="2" fill="#94a3b8" />
        <circle cx="31" cy="31" r="2" fill="#94a3b8" />
      </svg>
    ) : (
      // Tường Gạch Nung Phá Được (+50đ)
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="1" y="1" width="38" height="38" rx="3" fill="#b45309" stroke="#f59e0b" strokeWidth="1.5" />
        <line x1="1" y1="14" x2="39" y2="14" stroke="#78350f" strokeWidth="2.5" />
        <line x1="1" y1="27" x2="39" y2="27" stroke="#78350f" strokeWidth="2.5" />
        <line x1="20" y1="1" x2="20" y2="14" stroke="#78350f" strokeWidth="2.5" />
        <line x1="12" y1="14" x2="12" y2="27" stroke="#78350f" strokeWidth="2.5" />
        <line x1="28" y1="14" x2="28" y2="27" stroke="#78350f" strokeWidth="2.5" />
        <line x1="20" y1="27" x2="20" y2="39" stroke="#78350f" strokeWidth="2.5" />
      </svg>
    ),
};
