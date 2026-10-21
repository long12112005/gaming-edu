"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { 
  Gamepad2, 
  Sparkles, 
  PlusCircle, 
  QrCode, 
  ArrowRight, 
  BookOpen, 
  Users, 
  Trophy, 
  Upload, 
  FileText, 
  Play, 
  Hash, 
  Flame, 
  Zap,
  CheckCircle2,
  Clock
} from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import CreateRoomModal from "@/components/modals/CreateRoomModal";
import { api } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");

  useEffect(() => {
    setIsLoggedIn(!!Cookies.get("token"));

    // Tải danh sách bộ đề công khai mẫu
    api.get("/quizzes")
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setRecentQuizzes(res.data.data.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  const formatPin = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + " - " + digits.slice(3);
  };

  const handleJoinByPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pin.replace(/\D/g, "");
    if (cleanPin.length < 4) return;
    setIsJoining(true);
    router.push(`/play/${cleanPin}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* HERO TITLE & SUBTITLE */}
        <div className="mb-8 sm:mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-3">
              <Sparkles size={14} className="text-amber-500 animate-pulse" />
              <span>Dual-Tone Modern Gamified SaaS</span>
            </div>
            <h1 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight text-slate-900 leading-tight">
              Trung Tâm Thi Đấu & <br className="hidden sm:inline" />
              <span className="text-ai-gradient">Học Tập Tương Tác</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 max-w-md leading-relaxed">
            Nhập mã PIN để tham gia trận đấu hoặc mở không gian quản trị đề thi và sảnh chờ phòng chơi.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BENTO GRID LAYOUT (KHU VỰC 1: THAM GIA NHANH & KHU VỰC 2: HOST HUB)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── KHU VỰC 1: NHẬP MÃ PIN / QR THAM GIA NHANH (BENTO LỚN 5 COLS) ── */}
          <div
            id="quick-join"
            className="lg:col-span-5 bento-card p-6 sm:p-8 flex flex-col justify-between border-2 border-indigo-100/80 bg-white relative overflow-hidden shadow-md"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <Flame size={14} />
                  Tham Gia Nhanh
                </span>
                <span className="text-xs font-semibold text-slate-400">Không cần đăng nhập</span>
              </div>

              <h2 className="font-heading font-black text-2xl text-slate-900 mb-2">
                Nhập Mã PIN Phòng Chơi
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Nhìn lên màn hình của Chủ phòng và nhập 6 chữ số để tham gia ngay.
              </p>

              <form onSubmit={handleJoinByPin} className="space-y-4">
                <div className="relative">
                  <input
                    id="quick-pin-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => setPin(formatPin(e.target.value))}
                    placeholder="000 - 000"
                    maxLength={9}
                    className="w-full text-center py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-heading font-black text-3xl sm:text-4xl tracking-widest text-indigo-950 placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
                  />
                  <Hash size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={pin.replace(/\D/g, "").length < 4 || isJoining}
                  className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:translate-y-0.5 text-white font-heading font-black text-base shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  <Gamepad2 size={20} />
                  <span>{isJoining ? "Đang Kết Nối..." : "Vào Trận Đấu Ngay"}</span>
                </button>
              </form>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <QrCode size={18} className="text-slate-400" />
                <span>Hoặc dùng Camera</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              >
                Quét Mã QR
              </button>
            </div>
          </div>

          {/* ── KHU VỰC 2: KHÔNG GIAN CHỦ PHÒNG (HOST SPACE - 7 COLS) ── */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Bento Card 2A: Khởi tạo phòng mới */}
            <div className="bento-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
                  <Trophy size={24} />
                </div>
                <h3 className="font-heading font-black text-xl text-slate-900 mb-1">
                  Mở Phòng Thi Đấu
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Tổ chức trận đấu trực tiếp cùng cả lớp (Host-paced) hoặc giải đấu mở theo tốc độ cá nhân.
                </p>
              </div>

              <button
                onClick={() => setIsCreateRoomOpen(true)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:translate-y-0.5"
              >
                <PlusCircle size={16} />
                <span>Khởi Tạo Phòng Mới</span>
              </button>
            </div>

            {/* Bento Card 2B: Widget AI Quota */}
            <div className="bento-card p-6 flex flex-col justify-between bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles size={24} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Đang hoạt động
                  </span>
                </div>
                <h3 className="font-heading font-black text-xl text-slate-900 mb-1">
                  AI Quota Hôm Nay
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Hạn mức sinh đề thi thông minh từ tài liệu PDF/Word.
                </p>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-indigo-900">15 / 20 lượt khả dụng</span>
                    <span className="text-slate-400">75%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-[75%]" />
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={11} /> Reset tự động sau 00:00 UTC
                </span>
              </div>

              <Link
                href="/quiz/create"
                className="mt-4 w-full py-2.5 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Nâng cấp hạn mức</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Bento Card 2C: ✨ AI Generator Bộ Đề Nhanh (Span 2 cols on tablet/desktop) */}
            <div className="sm:col-span-2 bento-card p-6 sm:p-7 relative overflow-hidden border-2 border-indigo-200/60 bg-gradient-to-br from-white via-indigo-50/15 to-purple-50/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ai-gradient text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-lg text-slate-900">
                      ✨ AI Generator – Sinh Bộ Đề Tức Thì
                    </h3>
                    <p className="text-xs text-slate-500">
                      Nhập chủ đề hoặc kéo thả file (.pdf, .docx) để AI tự tạo 10 slide câu hỏi chất lượng cao
                    </p>
                  </div>
                </div>

                <Link
                  href="/quiz/create"
                  className="px-4 py-2 rounded-xl bg-ai-gradient text-white font-bold text-xs shadow-md shadow-purple-500/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Upload size={14} />
                  <span>Tải Lên File</span>
                </Link>
              </div>

              <div className="relative mt-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="VD: Tạo 10 câu hỏi trắc nghiệm Lịch sử Việt Nam thế kỷ 20 kèm giải thích..."
                  className="w-full pl-4 pr-32 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => router.push(`/quiz/create?prompt=${encodeURIComponent(aiPrompt)}`)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1"
                >
                  <Zap size={14} />
                  <span>Sinh Đề</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BỘ ĐỀ MẪU CỘNG ĐỒNG & KHÁM PHÁ (BENTO LIST)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="mt-12 sm:mt-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading font-black text-2xl text-slate-900">
                Bộ Đề Cộng Đồng Nổi Bật
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Khám phá và bắt đầu phòng chơi ngay chỉ với một thao tác
              </p>
            </div>
            <Link
              href="/library"
              className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <span>Xem tất cả thư viện</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentQuizzes.length > 0 ? (
              recentQuizzes.map((quiz, idx) => (
                <div key={quiz.id || idx} className="bento-card p-5 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                        {quiz.topic || "Tổng hợp"}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {quiz.total_slides || quiz.slide_count || 10} câu
                      </span>
                    </div>

                    <h4 className="font-heading font-black text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                      {quiz.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {quiz.description || "Bộ đề tương tác thời gian thực trên nền tảng GameEdu."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      {quiz.creator_nickname || "GameEdu Team"}
                    </span>
                    <button
                      onClick={() => setIsCreateRoomOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Host</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              [
                { title: "Đấu Trường Toán Học Logic", topic: "Toán Học", count: 12, author: "Thầy Hùng" },
                { title: "Từ Vựng Tiếng Anh IELTS Căn Bản", topic: "Ngoại Ngữ", count: 15, author: "Cô Mai" },
                { title: "Kiến Thức Lịch Sử Việt Nam", topic: "Lịch Sử", count: 10, author: "Ban Sử Học" },
                { title: "Thử Thách Lập Trình TypeScript", topic: "Công Nghệ", count: 10, author: "Tech Lead" },
              ].map((item, i) => (
                <div key={i} className="bento-card p-5 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                        {item.topic}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {item.count} câu
                      </span>
                    </div>

                    <h4 className="font-heading font-black text-base text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      Bộ câu hỏi ôn luyện trực quan, thiết kế chuẩn thi đấu trực tiếp.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">{item.author}</span>
                    <button
                      onClick={() => setIsCreateRoomOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Host</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL QUÉT MÃ QR */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 text-center border border-slate-200 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <QrCode size={30} />
            </div>
            <h3 className="font-heading font-black text-xl text-slate-900 mb-2">Quét Mã QR Tham Gia</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Mở camera điện thoại của bạn và hướng vào mã QR được hiển thị trên màn hình chiếu của Chủ phòng.
            </p>
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mb-6 flex flex-col items-center justify-center">
              <div className="w-40 h-40 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-xs">
                <QrCode size={120} className="text-slate-800" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-3">Demo QR Scanner Active</span>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      )}

      {/* Modal Tạo Phòng */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
      />

      <Footer />
    </div>
  );
}
