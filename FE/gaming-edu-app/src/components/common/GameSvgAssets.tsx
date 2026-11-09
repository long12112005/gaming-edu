import React from 'react';

export const GameAssets = {
    // Game 1: Vương miện Lãnh thổ & Khiên Tường Thành
    HexFortress: ({ color = '#3b82f6' }) => (
        <svg viewBox="0 0 64 64" className="w-10 h-10">
            <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" fill={color} stroke="#fff" strokeWidth="3" />
            <path d="M20 42V24l6 6 6-8 6 8 6-6v18H20z" fill="#fde047" />
        </svg>
    ),

    // Game 2: Tháp Pháo Laser & Quái Vật
    DefenseTurret: ({ teamColor = '#10b981' }) => (
        <svg viewBox="0 0 64 64" className="w-12 h-12">
            <circle cx="32" cy="36" r="18" fill={teamColor} stroke="#1e293b" strokeWidth="4" />
            <rect x="27" y="6" width="10" height="24" rx="4" fill="#64748b" stroke="#1e293b" strokeWidth="3" />
            <circle cx="32" cy="36" r="7" fill="#38bdf8" />
        </svg>
    ),

    // Game 5: Thuyền Rồng Đua Tốc Độ
    DragonBoat: ({ color = '#ef4444' }) => (
        <svg viewBox="0 0 120 48" className="w-24 h-10">
            <path d="M10 24 Q60 44 110 20 L95 38 L20 38 Z" fill={color} stroke="#fff" strokeWidth="2" />
            <circle cx="105" cy="20" r="6" fill="#fde047" />
            <line x1="35" y1="28" x2="25" y2="44" stroke="#fde047" strokeWidth="3" />
            <line x1="60" y1="28" x2="50" y2="44" stroke="#fde047" strokeWidth="3" />
            <line x1="85" y1="28" x2="75" y2="44" stroke="#fde047" strokeWidth="3" />
        </svg>
    ),

    // Game 7: Đầu Máy Tàu Hỏa & Đường Ray
    TrainLocomotive: () => (
        <svg viewBox="0 0 80 48" className="w-16 h-10">
            <rect x="10" y="14" width="54" height="22" rx="4" fill="#dc2626" stroke="#1e293b" strokeWidth="3" />
            <rect x="46" y="4" width="10" height="12" fill="#475569" />
            <circle cx="24" cy="38" r="7" fill="#fbbf24" stroke="#1e293b" strokeWidth="3" />
            <circle cx="50" cy="38" r="7" fill="#fbbf24" stroke="#1e293b" strokeWidth="3" />
        </svg>
    ),

    // Game 8: Đại Bác Tọa Độ (Xoay nòng theo góc bắn Angle)
    ArtilleryCannon: ({ angle = 45, color = '#2563eb' }) => (
        <svg viewBox="0 0 80 80" className="w-16 h-16 overflow-visible">
            <g transform={`rotate(${-angle}, 25, 55)`}>
                <rect x="20" y="42" width="46" height="16" rx="6" fill="#334155" stroke="#fff" strokeWidth="2" />
            </g>
            <circle cx="25" cy="58" r="14" fill={color} stroke="#fff" strokeWidth="3" />
        </svg>
    ),

    // Game 9: Phi Hành Gia / Nội Gián (Edu Among Us)
    AstronautCrew: ({ color = '#ef4444', isIsolated = false }) => (
        <svg viewBox="0 0 64 64" className="w-12 h-12">
            <rect x="16" y="12" width="32" height="42" rx="16" fill={color} stroke="#0f172a" strokeWidth="3" />
            <rect x="26" y="20" width="24" height="14" rx="7" fill="#bae6fd" stroke="#0f172a" strokeWidth="3" />
            {isIsolated && <line x1="8" y1="8" x2="56" y2="56" stroke="#ef4444" strokeWidth="5" />}
        </svg>
    ),

    // Game 10: Quả Bom Hẹn Giờ (Quiz Bomberman)
    TickingBomb: () => (
        <svg viewBox="0 0 64 64" className="w-10 h-10 bomb-ticking">
            <circle cx="30" cy="36" r="20" fill="#1e293b" stroke="#fff" strokeWidth="2" />
            <path d="M42 18 Q50 8 56 14" stroke="#fbbf24" strokeWidth="4" fill="none" />
            <circle cx="56" cy="14" r="5" fill="#ef4444" />
        </svg>
    )
};