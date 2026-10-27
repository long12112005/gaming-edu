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
  X,
  Award,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  AlertTriangle,
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
  endTime?: string;
  isEarlyFinished?: boolean;
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

export interface PlayerReportItem {
  rank: number;
  nickname: string;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  avgResponseTimeSec: number;
}

export interface QuestionReportItem {
  orderIndex: number;
  questionText: string;
  type: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  difficulty: string;
}

export interface RoomDetailReport {
  roomId: string;
  pinCode: string;
  quizTitle: string;
  mode: string;
  status: string;
  createdAt: string;
  totalPlayers: number;
  overallAccuracy: number;
  hardestQuestion: string | null;
  easiestQuestion: string | null;
  players: PlayerReportItem[];
  questions: QuestionReportItem[];
}

export default function ReportsPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("hosted");

  const [hostedRooms, setHostedRooms] = useState<HostedRoomReport[]>([]);
  const [playedRooms, setPlayedRooms] = useState<PlayedRoomReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [exportingId, setExportingId] = useState<string | null>(null);
  const [selectedRoomReport, setSelectedRoomReport] = useState<RoomDetailReport | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"players" | "questions">("players");
  const [finishingRoomId, setFinishingRoomId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const normalizeHosted = (list: any[]): HostedRoomReport[] =>
    (list || []).map((r) => ({
      id: r.id || r.roomId || "",
      pinCode: r.pinCode || "",
      quizTitle: r.quizTitle || "Bộ đề không tên",
      mode: r.mode || "HOST_PACED",
      playerCount: r.playerCount ?? 0,
      status: r.status || "FINISHED",
      createdAt: r.createdAt || r.created_at || new Date().toISOString(),
      endTime: r.endTime || r.end_time,
      isEarlyFinished: Boolean(r.isEarlyFinished || r.is_early_finished),
    }));

  const normalizePlayed = (list: any[]): PlayedRoomReport[] =>
    (list || []).map((g) => ({
      id: g.id || g.roomId || "",
      pinCode: g.pinCode || "",
      quizTitle: g.quizTitle || "Bộ đề không tên",
      hostNickname: g.hostNickname || g.host_nickname || "Chủ phòng",
      rank: g.rank ?? 1,
      score: g.score ?? g.totalScore ?? g.total_score ?? 0,
      createdAt: g.createdAt || g.playedAt || g.played_at || g.created_at || new Date().toISOString(),
    }));

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
        setHostedRooms(normalizeHosted(resHosted.value.data.data));
        hasHostedData = true;
      }

      if (resPlayed.status === "fulfilled" && resPlayed.value.data?.success) {
        setPlayedRooms(normalizePlayed(resPlayed.value.data.data));
        hasPlayedData = true;
      }

      // Fallback graceful nếu chưa có dữ liệu từ 2 route riêng
      if (!hasHostedData && !hasPlayedData) {
        try {
          const resGeneric = await api.get("/rooms/history");
          if (resGeneric.data?.success) {
            setHostedRooms(normalizeHosted(resGeneric.data.data?.hosted));
            setPlayedRooms(normalizePlayed(resGeneric.data.data?.played));
          }
        } catch {
          setHostedRooms([]);
          setPlayedRooms([]);
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

  // Xem chi tiết báo cáo qua GET /api/rooms/{id}/report
  const handleViewDetailReport = async (roomId: string) => {
    try {
      setLoadingDetailId(roomId);
      const res = await api.get(`/rooms/${roomId}/report`);
      if (res.data?.success && res.data.data) {
        setSelectedRoomReport(res.data.data);
      } else {
        setToastMsg({ text: "Không thể lấy dữ liệu phân tích chi tiết.", type: "error" });
      }
    } catch (err: unknown) {
      console.error("Lỗi khi tải chi tiết báo cáo:", err);
      setToastMsg({ text: "Không thể kết nối đến máy chủ để lấy báo cáo.", type: "error" });
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleFinishRoomEarly = async (roomId: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn kết thúc sớm phòng "${title}"? Thí sinh sẽ không thể tiếp tục nộp bài mới.`)) {
      return;
    }
    try {
      setFinishingRoomId(roomId);
      await api.post(`/rooms/${roomId}/finish`);
      setToastMsg({ text: `Đã kết thúc phòng "${title}" thành công!`, type: "success" });
      await fetchReports();
    } catch (err: any) {
      setToastMsg({ text: err.response?.data?.message || "Không thể kết thúc phòng. Vui lòng thử lại.", type: "error" });
    } finally {
      setFinishingRoomId(null);
      setTimeout(() => setToastMsg(null), 3500);
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
                  <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">
                    Chưa có phòng thi nào được tổ chức
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 font-medium">
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
                          {room.mode === "ASYNC_TOURNAMENT" ? (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-md text-xs font-black">
                              ⚡ Phòng Giải Đấu (Async)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-bold">
                              🎮 Phòng Thường
                            </span>
                          )}
                          {room.status === "FINISHED" ? (
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-md text-xs font-bold">
                              🏁 Đã kết thúc {room.isEarlyFinished ? "(Sớm)" : ""}
                            </span>
                          ) : room.mode === "ASYNC_TOURNAMENT" ? (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md text-xs font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Đang mở 24/7
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold">
                              Đang diễn ra
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg md:text-xl font-bold font-heading text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {room.quizTitle}
                        </h3>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-teal-800/70 font-semibold flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> Tạo: {new Date(room.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                          {room.endTime && (
                            <span className="flex items-center gap-1 text-amber-800 font-bold">
                              <Clock size={14} /> Hạn: {new Date(room.endTime).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users size={14} /> {room.playerCount} thí sinh tham gia
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CÁC NÚT THAO TÁC BÁO CÁO */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-teal-100 flex-wrap">
                      {room.status !== "FINISHED" && (
                        <button
                          type="button"
                          onClick={() => handleFinishRoomEarly(room.id, room.quizTitle)}
                          disabled={finishingRoomId === room.id}
                          className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs md:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          title="Kết thúc phòng giải đấu sớm và chốt bảng điểm"
                        >
                          <AlertTriangle size={15} />
                          <span>{finishingRoomId === room.id ? "Đang kết thúc..." : "Kết Thúc Sớm"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleViewDetailReport(room.id)}
                        disabled={loadingDetailId === room.id}
                        className="px-4 py-2.5 bg-white hover:bg-teal-50 border border-teal-300/80 text-teal-800 font-bold text-xs md:text-sm rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
                        title="Xem bảng điểm và phân tích câu hỏi trực tiếp trên màn hình"
                      >
                        {loadingDetailId === room.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-teal-600" />
                            <span>Đang Tải...</span>
                          </>
                        ) : (
                          <>
                            <Eye size={16} className="text-teal-600" />
                            <span>Xem Thống Kê</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/reports/${room.id}`}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs md:text-sm rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
                        title="Xem bảng xếp hạng, số câu học sinh đã làm và tiến độ"
                      >
                        <Eye size={16} className="text-indigo-600" />
                        <span>Xem Chi Tiết</span>
                      </Link>

                      <button
                        onClick={() => handleDownloadExcel(room.id, room.quizTitle)}
                        disabled={exportingId === room.id}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
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
                            <span>Tải Excel</span>
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
                  <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">
                    Chưa có lịch sử tham gia bài thi
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 font-medium">
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
                playedRooms.map((game, idx) => (
                  <div
                    key={game.id || `played-${idx}`}
                    className="bg-white/70 backdrop-blur-xl p-6 rounded-[24px] border border-white/90 hover:border-amber-400/60 hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 transition-colors shrink-0">
                        <Trophy size={24} className="text-amber-700 group-hover:text-amber-950 transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-950 rounded-md font-mono text-xs font-bold">
                            Mã phòng: {game.pinCode || "Chung"}
                          </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold font-heading text-slate-900">{game.quizTitle}</h3>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-teal-800/70 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {new Date(game.createdAt || Date.now()).toLocaleDateString("vi-VN")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} /> Chủ phòng: {game.hostNickname}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 bg-gradient-to-r from-amber-400/20 to-amber-500/30 text-amber-950 rounded-2xl border border-amber-400/40 font-black text-sm">
                        Hạng {game.rank} &bull; {(game.score ?? 0).toLocaleString()} điểm
                      </span>
                    </div>
                  </div>
                ))
              ))}
          </div>
        )}
      </main>

      {/* MODAL CHI TIẾT BÁO CÁO PHÒNG CHƠI */}
      {selectedRoomReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-gray-950/60 backdrop-blur-md animate-in fade-in font-sans">
          <div className="bg-[#FAF8F5] rounded-[32px] w-full max-w-4xl shadow-2xl border-4 border-white flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-amber-900/10 bg-white/80 backdrop-blur-md flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="px-3 py-1 bg-teal-100 text-teal-950 rounded-lg font-mono text-xs font-bold">
                    MÃ PIN: {selectedRoomReport.pinCode}
                  </span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-950 rounded-lg text-xs font-bold">
                    Chế độ: {selectedRoomReport.mode}
                  </span>
                  <span className="text-xs text-teal-800/70 font-semibold flex items-center gap-1">
                    <Clock size={13} /> {new Date(selectedRoomReport.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold font-serif text-[#08282e]">
                  {selectedRoomReport.quizTitle}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRoomReport(null)}
                className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors shrink-0"
              >
                <X size={20} className="stroke-[2.5px]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
              {/* 4 Cards Thống Kê Tổng Quan */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
                  <span className="text-xs font-bold text-teal-800/70 block mb-1">Tổng Thí Sinh</span>
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-teal-600" />
                    <span className="text-2xl font-black text-teal-950">{selectedRoomReport.totalPlayers}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
                  <span className="text-xs font-bold text-teal-800/70 block mb-1">Độ Chính Xác Chung</span>
                  <div className="flex items-center gap-2">
                    <Award size={20} className="text-amber-600" />
                    <span className="text-2xl font-black text-amber-950">{selectedRoomReport.overallAccuracy}%</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
                  <span className="text-xs font-bold text-emerald-800/70 block mb-1 flex items-center gap-1">
                    <TrendingUp size={14} className="text-emerald-600" /> Câu Dễ Nhất
                  </span>
                  <p className="text-xs font-bold text-emerald-950 truncate" title={selectedRoomReport.easiestQuestion || "Chưa có"}>
                    {selectedRoomReport.easiestQuestion || "Chưa có"}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
                  <span className="text-xs font-bold text-rose-800/70 block mb-1 flex items-center gap-1">
                    <TrendingDown size={14} className="text-rose-600" /> Câu Khó Nhất
                  </span>
                  <p className="text-xs font-bold text-rose-950 truncate" title={selectedRoomReport.hardestQuestion || "Chưa có"}>
                    {selectedRoomReport.hardestQuestion || "Chưa có"}
                  </p>
                </div>
              </div>

              {/* Tabs chuyển đổi giữa Bảng Điểm & Phân Tích Câu Hỏi */}
              <div className="flex gap-2 p-1 bg-gray-200/60 rounded-xl w-fit">
                <button
                  onClick={() => setModalTab("players")}
                  className={`px-5 py-2 rounded-lg font-bold text-xs md:text-sm transition-all ${
                    modalTab === "players"
                      ? "bg-white text-teal-950 shadow-sm"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  Bảng Điểm Thí Sinh ({selectedRoomReport.players.length})
                </button>
                <button
                  onClick={() => setModalTab("questions")}
                  className={`px-5 py-2 rounded-lg font-bold text-xs md:text-sm transition-all ${
                    modalTab === "questions"
                      ? "bg-white text-teal-950 shadow-sm"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  Phân Tích Câu Hỏi ({selectedRoomReport.questions.length})
                </button>
              </div>

              {/* BẢNG 1: THÍ SINH */}
              {modalTab === "players" && (
                <div className="bg-white rounded-2xl border border-teal-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm">
                      <thead className="bg-[#005C53] text-white font-bold uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 text-center">Hạng</th>
                          <th className="py-3 px-4">Thí Sinh</th>
                          <th className="py-3 px-4 text-right">Tổng Điểm</th>
                          <th className="py-3 px-4 text-center">Đúng / Sai</th>
                          <th className="py-3 px-4 text-right">Chính Xác</th>
                          <th className="py-3 px-4 text-right">Thời Gian TB</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedRoomReport.players.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400 font-bold">
                              Chưa có thí sinh nào hoàn thành bài thi.
                            </td>
                          </tr>
                        ) : (
                          selectedRoomReport.players.map((p) => (
                            <tr
                              key={p.rank + p.nickname}
                              className={`hover:bg-teal-50/50 transition-colors ${
                                p.rank === 1
                                  ? "bg-amber-100/40 font-semibold"
                                  : p.rank === 2
                                  ? "bg-gray-100/50 font-semibold"
                                  : p.rank === 3
                                  ? "bg-amber-50/30 font-semibold"
                                  : ""
                              }`}
                            >
                              <td className="py-3 px-4 text-center font-black">
                                {p.rank === 1 ? "🥇 1" : p.rank === 2 ? "🥈 2" : p.rank === 3 ? "🥉 3" : p.rank}
                              </td>
                              <td className="py-3 px-4 font-bold text-gray-900">{p.nickname}</td>
                              <td className="py-3 px-4 text-right font-black text-teal-800">
                                {p.totalScore.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center font-bold">
                                <span className="text-emerald-700">{p.correctCount}</span> /{" "}
                                <span className="text-rose-600">{p.wrongCount}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-black text-amber-900">{p.accuracy}%</td>
                              <td className="py-3 px-4 text-right text-gray-500 font-bold">{p.avgResponseTimeSec}s</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* BẢNG 2: CÂU HỎI */}
              {modalTab === "questions" && (
                <div className="bg-white rounded-2xl border border-teal-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm">
                      <thead className="bg-[#042940] text-white font-bold uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 text-center">STT</th>
                          <th className="py-3 px-4">Nội Dung Câu Hỏi</th>
                          <th className="py-3 px-4 text-center">Dạng Câu</th>
                          <th className="py-3 px-4 text-center">Lượt Nộp</th>
                          <th className="py-3 px-4 text-right">Tỷ Lệ Đúng</th>
                          <th className="py-3 px-4 text-center">Độ Khó</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedRoomReport.questions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400 font-bold">
                              Chưa có dữ liệu phân tích câu hỏi.
                            </td>
                          </tr>
                        ) : (
                          selectedRoomReport.questions.map((q) => (
                            <tr key={q.orderIndex} className="hover:bg-teal-50/50 transition-colors">
                              <td className="py-3 px-4 text-center font-black text-gray-500">{q.orderIndex}</td>
                              <td className="py-3 px-4 font-bold text-gray-900 max-w-xs md:max-w-md truncate" title={q.questionText}>
                                {q.questionText}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-bold text-gray-600">
                                  {q.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-gray-700">
                                {q.correctAnswers} / {q.totalAnswers}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-teal-800">{q.accuracy}%</td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                    q.difficulty === "Dễ"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : q.difficulty === "Khó"
                                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                  }`}
                                >
                                  {q.difficulty}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 md:p-6 border-t border-amber-900/10 bg-gray-50 flex items-center justify-between gap-4">
              <button
                onClick={() => handleDownloadExcel(selectedRoomReport.roomId, selectedRoomReport.quizTitle)}
                disabled={exportingId === selectedRoomReport.roomId}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-60"
              >
                {exportingId === selectedRoomReport.roomId ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={16} />
                )}
                <span>Xuất Báo Cáo Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => setSelectedRoomReport(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs md:text-sm rounded-xl transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-8 border-t border-amber-600/20 text-center text-teal-900/60 bg-white/50 backdrop-blur-md text-xs font-sans relative z-10">
        <p>© 2026 Gaming Edu · Hệ thống quản lý và báo cáo thành tích học tập.</p>
      </footer>
    </div>
  );
}
