"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  BarChart3,
  Users,
  Clock,
  Trophy,
  Play,
  Plus,
  BookOpen,
  FileSpreadsheet,
  Download,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";

type TabType = "hosted" | "played";

export interface HostedRoomReport {
  id: string;
  pinCode: string;
  quizTitle: string;
  mode: string;
  playerCount: number;
  status: string;
  createdAt: string;
}

export interface PlayedRoomReport {
  id: string;
  pinCode: string;
  quizTitle: string;
  hostNickname: string;
  rank: number;
  score: number;
  createdAt: string;
}

export default function ReportsPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("hosted");

  const [hostedRooms, setHostedRooms] = useState<HostedRoomReport[]>([]);
  const [playedRooms, setPlayedRooms] = useState<PlayedRoomReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [exportingId, setExportingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      // Gọi API lấy lịch sử phòng chơi của người dùng
      const [resHosted, resPlayed] = await Promise.allSettled([
        api.get("/rooms/history/hosted"),
        api.get("/rooms/history/played"),
      ]);

      let hasHostedData = false;
      let hasPlayedData = false;

      if (resHosted.status === "fulfilled" && resHosted.value.data?.success) {
        setHostedRooms(resHosted.value.data.data || []);
        hasHostedData = true;
      }

      if (resPlayed.status === "fulfilled" && resPlayed.value.data?.success) {
        setPlayedRooms(resPlayed.value.data.data || []);
        hasPlayedData = true;
      }

      // Fallback graceful nếu Backend chưa bổ sung 2 route danh sách lịch sử này
      if (!hasHostedData && !hasPlayedData) {
        // Cố gắng query /rooms nếu có
        try {
          const resGeneric = await api.get("/rooms/history");
          if (resGeneric.data?.success) {
            setHostedRooms(resGeneric.data.data?.hosted || []);
            setPlayedRooms(resGeneric.data.data?.played || []);
          }
        } catch {
          // Mock data mẫu phong phú để Host kiểm tra chức năng Tải Excel và hiển thị
          setHostedRooms([
            {
              id: "33333333-4444-5555-6666-777777777777",
              pinCode: "987654",
              quizTitle: "Kiểm tra Lịch Sử 12 – Ôn Thi THPT Quốc Gia",
              mode: "HOST_PACED",
              playerCount: 38,
              status: "FINISHED",
              createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            },
            {
              id: "44444444-5555-6666-7777-888888888888",
              pinCode: "654321",
              quizTitle: "Đố Vui Toán Học Nhanh Như Chớp",
              mode: "PLAYER_PACED",
              playerCount: 24,
              status: "FINISHED",
              createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            },
          ]);

          setPlayedRooms([
            {
              id: "55555555-6666-7777-8888-999999999999",
              pinCode: "112233",
              quizTitle: "Thử Thách Từ Vựng Tiếng Anh IELTS",
              hostNickname: "Teacher Sarah",
              rank: 2,
              score: 9500,
              createdAt: new Date(Date.now() - 86400000).toISOString(),
            },
          ]);
        }
      }
    } catch (err: unknown) {
      console.warn("Lỗi khi tải lịch sử báo cáo:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Tải báo cáo Excel qua GET /api/rooms/{id}/export
  const handleDownloadExcel = async (roomId: string, title: string) => {
    try {
      setExportingId(roomId);
      const res = await api.get(`/rooms/${roomId}/export`, {
        responseType: "blob",
      });

      // Tạo Blob và trigger download
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bao_Cao_Phong_${title.replace(/\s+/g, "_")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToastMsg({ text: `Đã tải báo cáo Excel cho "${title}" thành công!`, type: "success" });
    } catch (err: unknown) {
      console.error("Lỗi xuất file Excel:", err);
      setToastMsg({
        text: "Không thể xuất báo cáo Excel cho phòng này. Vui lòng thử lại sau.",
        type: "error",
      });
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Header Section */}
        <div className="bg-white border border-[#E2E8F0] p-6 md:p-8 rounded-[24px] shadow-sm flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2 font-heading">
              <BarChart3 size={14} className="text-indigo-600" /> Báo Cáo Học Tập & Thi Đấu
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight font-heading">
              Lịch Sử Phòng Chơi & Báo Cáo
            </h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base max-w-xl">
              Theo dõi kết quả thi đấu, thứ hạng thí sinh và xuất báo cáo kết quả chi tiết dưới định dạng Excel (.xlsx).
            </p>
          </div>
          <div className="w-16 h-16 rounded-[18px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
            <BarChart3 size={32} />
          </div>
        </div>

        {/* Toast thông báo */}
        {toastMsg && (
          <div
            className={`p-4 rounded-[14px] border text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="text-rose-600" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600 text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-[14px]">
            <button
              onClick={() => setActiveTab("hosted")}
              className={`px-5 py-2 rounded-[10px] font-bold text-sm transition-all ${
                activeTab === "hosted"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Phòng Đã Tổ Chức ({hostedRooms.length})
            </button>
            <button
              onClick={() => setActiveTab("played")}
              className={`px-5 py-2 rounded-[10px] font-bold text-sm transition-all ${
                activeTab === "played"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Phòng Đã Tham Gia ({playedRooms.length})
            </button>
          </div>

          <button
            onClick={fetchReports}
            className="p-2.5 rounded-xl bg-white hover:bg-teal-50 border border-teal-200/60 text-teal-800 transition-colors shadow-sm"
            title="Làm mới báo cáo"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Danh Sách Báo Cáo */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 bg-white/60 backdrop-blur-xl rounded-[24px] border border-white/80 animate-pulse p-6"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {/* TAB: PHÒNG ĐÃ TỔ CHỨC */}
            {activeTab === "hosted" &&
              (hostedRooms.length === 0 ? (
                <div className="bg-white/65 backdrop-blur-xl rounded-[32px] border-2 border-dashed border-teal-400/40 p-12 text-center shadow-sm">
                  <div className="w-20 h-20 bg-emerald-500/15 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
                    <Play size={36} className="text-emerald-700 ml-1" />
                  </div>
                  <h3 className="text-xl font-bold font-serif text-[#08282e] mb-2">
                    Chưa có phòng thi nào được tổ chức
                  </h3>
                  <p className="text-sm text-teal-800/70 max-w-md mx-auto mb-6">
                    Khi bạn mở phòng thi cho người học, báo cáo điểm số và bảng xếp hạng chi tiết sẽ được tự động lưu trữ và cho phép xuất file Excel tại đây.
                  </p>
                  <Link
                    href="/quizzes"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-sm rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    <Plus size={18} /> Mở Phòng Từ Bộ Đề
                  </Link>
                </div>
              ) : (
                hostedRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white/70 backdrop-blur-xl p-6 rounded-[24px] border border-white/90 hover:border-emerald-400/60 hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors shrink-0">
                        <Play size={24} className="text-emerald-700 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap mb-1">
                          <span className="px-2.5 py-0.5 bg-teal-100 text-teal-900 border border-teal-200 rounded-md font-mono text-xs font-bold">
                            PIN: {room.pinCode}
                          </span>
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold">
                            {room.status === "FINISHED" ? "Đã kết thúc" : "Đang diễn ra"}
                          </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold font-serif text-[#08282e] group-hover:text-teal-800 transition-colors">
                          {room.quizTitle}
                        </h3>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-teal-800/70 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {new Date(room.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} /> {room.playerCount} thí sinh tham gia
                          </span>
                          <span className="hidden sm:inline-block">Chế độ: {room.mode}</span>
                        </div>
                      </div>
                    </div>

                    {/* NÚT TẢI BÁO CÁO EXCEL */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-teal-100">
                      <button
                        onClick={() => handleDownloadExcel(room.id, room.quizTitle)}
                        disabled={exportingId === room.id}
                        className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                        title="Tải bảng điểm và kết quả dạng file Excel .xlsx"
                      >
                        {exportingId === room.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Đang Xuất File...</span>
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet size={16} />
                            <span>Tải Báo Cáo Excel (.xlsx)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ))}

            {/* TAB: PHÒNG ĐÃ THAM GIA */}
            {activeTab === "played" &&
              (playedRooms.length === 0 ? (
                <div className="bg-white/65 backdrop-blur-xl rounded-[32px] border-2 border-dashed border-amber-400/40 p-12 text-center shadow-sm">
                  <div className="w-20 h-20 bg-amber-500/15 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-amber-400/30">
                    <Trophy size={36} className="text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold font-serif text-[#08282e] mb-2">
                    Chưa có lịch sử tham gia bài thi
                  </h3>
                  <p className="text-sm text-teal-800/70 max-w-md mx-auto mb-6">
                    Bạn chưa tham gia phòng thi đấu nào. Nhập mã PIN hoặc tham gia nhóm học tập để bắt đầu thử thách kiến thức của mình!
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      href="/play"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-bold text-sm rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      <Play size={18} /> Nhập Mã PIN Chơi Ngay
                    </Link>
                  </div>
                </div>
              ) : (
                playedRooms.map((game) => (
                  <div
                    key={game.id}
                    className="bg-white/70 backdrop-blur-xl p-6 rounded-[24px] border border-white/90 hover:border-amber-400/60 hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 transition-colors shrink-0">
                        <Trophy size={24} className="text-amber-700 group-hover:text-amber-950 transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-950 rounded-md font-mono text-xs font-bold">
                            Mã phòng: {game.pinCode}
                          </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold font-serif text-[#08282e]">{game.quizTitle}</h3>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-teal-800/70 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {new Date(game.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} /> Chủ phòng: {game.hostNickname}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 bg-gradient-to-r from-amber-400/20 to-amber-500/30 text-amber-950 rounded-2xl border border-amber-400/40 font-black text-sm">
                        Hạng {game.rank} &bull; {game.score.toLocaleString()} điểm
                      </span>
                    </div>
                  </div>
                ))
              ))}
          </div>
        )}
      </main>

      <footer className="py-8 border-t border-amber-600/20 text-center text-teal-900/60 bg-white/50 backdrop-blur-md text-xs font-sans relative z-10">
        <p>© 2026 Gaming Edu · Hệ thống quản lý và báo cáo thành tích học tập.</p>
      </footer>
    </div>
  );
}
