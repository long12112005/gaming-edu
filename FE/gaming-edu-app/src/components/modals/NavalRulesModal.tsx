"use client";

import {
  X,
  Anchor,
  Shield,
  Crosshair,
  Radio,
  Flame,
  Trophy,
  Users,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface NavalRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayNow?: () => void;
}

export default function NavalRulesModal({
  isOpen,
  onClose,
  onPlayNow,
}: NavalRulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-[28px] sm:rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative font-sans">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shrink-0 shadow-xs">
              <Anchor size={26} strokeWidth={2.4} className="text-cyan-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                  Đấu Trường Mới
                </span>
                <span className="text-xs text-slate-400 font-bold">• 2 - 50 Người Chơi</span>
              </div>
              <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 leading-tight mt-0.5">
                Luật Chơi Hải Tặc Tri Thức (Edu Naval War)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 relative z-10 text-slate-700 text-xs sm:text-sm">
          {/* Hero Banner inside modal */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center gap-4 shadow-md">
            <img
              src="/assets/naval-war/ships/Preview.png"
              alt="Hải Tặc Tri Thức"
              className="w-32 sm:w-40 object-contain drop-shadow-md rounded-xl shrink-0"
              onError={(e) => {
                // fallback hide
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <div>
              <h4 className="font-heading font-black text-base sm:text-lg text-white">
                Chiến Thuật Bắn Tàu Kết Hợp Trắc Nghiệm Kiến Thức
              </h4>
              <p className="text-xs text-cyan-100 mt-1 leading-relaxed">
                Biến những câu hỏi ôn tập thành cuộc hải chiến kịch tính giữa hai liên minh hạm đội hùng mạnh!
              </p>
            </div>
          </div>

          {/* 4 Bước Chơi */}
          <div className="space-y-4">
            <h5 className="font-heading font-black text-xs uppercase tracking-wider text-slate-500">
              Quy Tắc Tác Chiến 4 Bước
            </h5>

            {/* Bước 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0 text-sm">
                1
              </div>
              <div>
                <h6 className="font-heading font-black text-slate-900 text-sm flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  Gia Nhập Hạm Đội (Đội Đỏ vs Đội Xanh)
                </h6>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Cả phòng học được chia làm 2 liên minh (tối đa 50 thuyền viên). Mỗi bên sở hữu vùng biển bí mật chứa 5 chiến hạm có kích thước từ 1 đến 5 ô (tổng 15 ô tàu).
                </p>
              </div>
            </div>

            {/* Bước 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 font-black flex items-center justify-center shrink-0 text-sm">
                2
              </div>
              <div>
                <h6 className="font-heading font-black text-slate-900 text-sm flex items-center gap-2">
                  <Zap size={16} className="text-amber-600" />
                  Giải Mã Câu Hỏi Để Nạp Đạn Pháo
                </h6>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Trả lời chính xác mỗi câu hỏi để nhận ngay <strong className="text-amber-700">+1 Lượt bắn</strong> và tích lũy điểm Năng Lượng (Energy). Trả lời đúng liên tiếp để kích hoạt Combo tăng tốc nạp kỹ năng!
                </p>
              </div>
            </div>

            {/* Bước 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 font-black flex items-center justify-center shrink-0 text-sm">
                3
              </div>
              <div>
                <h6 className="font-heading font-black text-slate-900 text-sm flex items-center gap-2">
                  <Crosshair size={16} className="text-cyan-600" />
                  Khai Hỏa & Triển Khai Kỹ Năng Tác Chiến
                </h6>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Chọn tọa độ trên bản đồ đối phương để bắn phá. Khi đủ Năng lượng, bạn có thể tung 3 kỹ năng tối thượng:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-1 font-bold text-xs text-cyan-600">
                      <Radio size={14} /> Radar Dò Tìm
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Quét sương mù vùng 3x3</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-1 font-bold text-rose-600">
                      <Crosshair size={14} /> Bắn Chính Xác
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Bắn trúng tàu 100%</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-1 font-bold text-emerald-600">
                      <Shield size={14} /> Lá Chắn Thủ
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Chống đạn cho đội nhà</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bước 4 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 font-black flex items-center justify-center shrink-0 text-sm">
                4
              </div>
              <div>
                <h6 className="font-heading font-black text-slate-900 text-sm flex items-center gap-2">
                  <Trophy size={16} className="text-rose-600" />
                  Đánh Chìm Toàn Bộ Hạm Đội Địch
                </h6>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Đội nào bắn chìm cả 5 chiến hạm của đối phương trước sẽ giành chiến thắng vẻ vang! Nếu hết giờ, hệ thống sẽ tự động xét tiêu chí số ô tàu còn lại để công bố kết quả.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Đóng
          </button>
          {onPlayNow && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onPlayNow();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-heading font-black text-xs sm:text-sm shadow-md shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Anchor size={16} />
              <span>Khởi Tạo Phòng Hải Chiến Ngay</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
