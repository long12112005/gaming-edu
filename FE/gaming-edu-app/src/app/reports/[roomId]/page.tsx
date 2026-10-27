"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Clock,
  Trophy,
  ArrowLeft,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  Printer,
  Medal,
  Loader2,
  Calendar,
  Sparkles,
  AlertTriangle,
  Check,
  Zap,
} from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import { api } from "@/lib/api";

interface StudentResult {
  id?: string;
  rank: number;
  nickname: string;
  avatarUrl?: string;
  totalScore: number;
  answeredCount?: number;
  totalQuestions?: number;
  isCompleted?: boolean;
  correctCount?: number;
  wrongCount?: number;
  accuracyRate?: number;
}

interface RoomInfo {
  id: string;
  pinCode: string;
  quizTitle: string;
  createdAt?: string;
  mode?: string;
  status?: string;
  endTime?: string;
  isEarlyFinished?: boolean;
  questionTimeLimit?: number;
  totalQuestions?: number;
}

export default function RoomDetailedReportPage({ params }: { params: Promise<{ roomId: string }> }) {
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRank, setFilterRank] = useState<"all" | "top3" | "completed">("all");
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const fetchRoomReport = useCallback(async () => {
    try {
      setLoading(true);

      let targetId = roomId;

      // 1. Nếu roomId là PIN 6 chữ số, tra cứu ra Room GUID trước
      if (roomId.length === 6) {
        try {
          const resPin = await api.get(`/rooms/pin/${roomId}`);
          if (resPin.data?.success && resPin.data?.data?.id) {
            targetId = resPin.data.data.id;
          }
        } catch (e) {
          console.warn("Không tìm thấy theo PIN:", e);
        }
      }

      // 2. Thử gọi Detailed Report trước (cung cấp đầy đủ số câu đã làm của từng học sinh)
      try {
        const resDetailed = await api.get(`/rooms/${targetId}/detailed-report`);
        if (resDetailed.data?.success && resDetailed.data?.data) {
          const d = resDetailed.data.data;
          setRoomInfo({
            id: d.roomId || targetId,
            pinCode: d.pinCode || roomId,
            quizTitle: d.quizTitle || "Báo Cáo Phòng Thi Đấu",
            createdAt: d.createdAt,
            mode: d.mode,
            status: d.status,
            endTime: d.endTime,
            isEarlyFinished: d.isEarlyFinished,
            questionTimeLimit: d.questionTimeLimit,
            totalQuestions: d.questions?.length || 0,
          });

          const mappedPlayers: StudentResult[] = (d.players || []).map((p: any, idx: number) => ({
            id: p.playerId,
            rank: p.rank || idx + 1,
            nickname: p.nickname || "Thí sinh",
            avatarUrl: p.avatarUrl,
            totalScore: p.totalScore ?? 0,
            answeredCount: p.answeredCount ?? 0,
            totalQuestions: p.totalQuestions || d.questions?.length || 0,
            isCompleted: Boolean(p.isCompleted),
            correctCount: p.correctCount ?? 0,
            wrongCount: p.wrongCount ?? 0,
            accuracyRate: p.accuracyRate ?? 0,
          }));

          setStudents(mappedPlayers);
          return;
        }
      } catch (errDetailed) {
        console.warn("Detailed-report API không khả dụng, sử dụng fallback leaderboard:", errDetailed);
      }

      // 3. Fallback: Lấy Room + Leaderboard thông thường
      const [resRoom, resLb] = await Promise.all([
        api.get(`/rooms/${targetId}`).catch(() => null),
        api.get(`/rooms/${targetId}/leaderboard`).catch(() => null),
      ]);

      const rData = resRoom?.data?.data;
      if (rData) {
        setRoomInfo({
          id: targetId,
          pinCode: rData.pinCode || (roomId.length === 6 ? roomId : "LIVE"),
          quizTitle: rData.quizTitle || "Báo Cáo Phòng Thi Đấu",
          createdAt: rData.createdAt,
          mode: rData.mode,
          status: rData.status,
          endTime: rData.endTime,
          isEarlyFinished: rData.isEarlyFinished,
          questionTimeLimit: rData.questionTimeLimit,
        });
      }

      if (resLb?.data?.data && Array.isArray(resLb.data.data)) {
        setStudents(
          resLb.data.data.map((s: any, idx: number) => ({
            id: s.playerId || s.id,
            rank: s.rank || idx + 1,
            nickname: s.nickname || "Thí sinh",
            avatarUrl: s.avatarUrl,
            totalScore: s.totalScore ?? 0,
            answeredCount: s.answeredCount ?? 0,
            totalQuestions: s.totalQuestions ?? 0,
            isCompleted: Boolean(s.isCompleted),
          }))
        );
      }
    } catch (err) {
      console.error("Lỗi tổng quát khi tải báo cáo:", err);
      setToastMsg({ text: "Không thể tải báo cáo cho phòng này.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomReport();
  }, [fetchRoomReport]);

  // Kết thúc phòng thi sớm
  const handleFinishEarly = async () => {
    const targetRoomId = roomInfo?.id || roomId;
    try {
      setFinishing(true);
      await api.post(`/rooms/${targetRoomId}/finish`);
      setRoomInfo((prev) =>
        prev
          ? {
              ...prev,
              status: "FINISHED",
              isEarlyFinished: true,
              endTime: new Date().toISOString(),
            }
          : prev
      );
      setToastMsg({
        text: "Đã kết thúc phòng giải đấu thành công! Kết quả các thí sinh đã được lưu lại cố định.",
        type: "success",
      });
      setShowFinishConfirm(false);
      // Reload dữ liệu báo cáo mới nhất
      await fetchRoomReport();
    } catch (err: any) {
      setToastMsg({
        text: err.response?.data?.message || "Không thể kết thúc phòng lúc này. Vui lòng thử lại.",
        type: "error",
      });
    } finally {
      setFinishing(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = !searchQuery || s.nickname.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (filterRank === "top3") return s.rank <= 3;
      if (filterRank === "completed") return s.isCompleted || (s.answeredCount && s.totalQuestions && s.answeredCount >= s.totalQuestions);
      return true;
    });
  }, [students, searchQuery, filterRank]);

  // Thống kê số liệu thực tế
  const metrics = useMemo(() => {
    if (students.length === 0) {
      return { totalStudents: 0, completedStudents: 0, completionRate: 0, highestScore: 0, averageScore: 0, topStudent: "Chưa có" };
    }
    const total = students.length;
    const completed = students.filter(
      (s) => s.isCompleted || (s.answeredCount && s.totalQuestions && s.answeredCount >= s.totalQuestions)
    ).length;
    const highest = Math.max(...students.map((s) => s.totalScore));
    const average = Math.round(students.reduce((acc, s) => acc + s.totalScore, 0) / total);
    const top = students[0]?.nickname || "Thí sinh";
    const compRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalStudents: total,
      completedStudents: completed,
      completionRate: compRate,
      highestScore: highest,
      averageScore: average,
      topStudent: top,
    };
  }, [students]);

  // Xuất file CSV từ dữ liệu thực tế
  const handleExportCSV = () => {
    if (students.length === 0) {
      setToastMsg({ text: "Chưa có dữ liệu thí sinh để xuất tệp CSV.", type: "error" });
      return;
    }
    const headers = ["Hạng", "Thí Sinh", "Số Câu Đã Làm", "Tổng Câu", "Số Câu Đúng", "Số Câu Sai", "Tổng Điểm (pts)"];
    const rows = students.map((s) => [
      s.rank,
      `"${s.nickname}"`,
      s.answeredCount ?? 0,
      s.totalQuestions || roomInfo?.totalQuestions || 0,
      s.correctCount ?? 0,
      s.wrongCount ?? 0,
      s.totalScore,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_Cao_${roomInfo?.pinCode || roomId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMsg({ text: "Đã tải xuống tệp báo cáo CSV thành công!", type: "success" });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Xuất file Excel từ Backend API
  const handleExportExcel = async () => {
    const targetRoomId = roomInfo?.id || roomId;
    try {
      setExporting(true);
      const res = await api.get(`/rooms/${targetRoomId}/export`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bao_Cao_Phong_${roomInfo?.pinCode || roomId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToastMsg({ text: "Đã xuất báo cáo Excel (.xlsx) thành công!", type: "success" });
    } catch {
      // Fallback xuất CSV nếu backend chưa có file Excel cho phòng này
      handleExportCSV();
    } finally {
      setExporting(false);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const isRoomFinished = roomInfo?.status === "FINISHED" || roomInfo?.isEarlyFinished;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 pt-6 sm:pt-8 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Navigation & Title */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/reports"
              className="p-2.5 rounded-[14px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 transition-colors shadow-sm shrink-0"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-700 font-heading">
                  BÁO CÁO PHÒNG THI ĐẤU
                </span>
                {roomInfo?.mode === "ASYNC_TOURNAMENT" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-[11px] font-black text-amber-900 font-heading">
                    ⚡ PHÒNG GIẢI ĐẤU (ASYNC)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 font-heading">
                    🎮 PHÒNG THI ĐẤU TRỰC TIẾP
                  </span>
                )}
                {roomInfo?.pinCode && (
                  <span className="text-xs text-slate-600 font-mono font-black bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                    PIN: {roomInfo.pinCode}
                  </span>
                )}
                {isRoomFinished ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-[11px] font-bold text-rose-700 font-heading flex items-center gap-1">
                    🏁 ĐÃ KẾT THÚC {roomInfo?.isEarlyFinished ? "(Chủ phòng kết thúc sớm)" : ""}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[11px] font-bold text-emerald-800 font-heading flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ĐANG MỞ THI (24/7)
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] font-heading tracking-tight">
                {roomInfo?.quizTitle || "Báo Cáo Kết Quả Thi Đấu"}
              </h1>
            </div>
          </div>

          {/* Action Buttons: Kết Thúc Sớm & Xuất Tệp */}
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto flex-wrap justify-end">
            {!isRoomFinished && (
              <button
                type="button"
                onClick={() => setShowFinishConfirm(true)}
                disabled={finishing}
                className="px-3.5 py-2.5 rounded-[12px] bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap font-heading disabled:opacity-50"
              >
                <AlertTriangle size={15} />
                <span>Kết Thúc Sớm</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">In Báo Cáo</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={students.length === 0}
              className="px-3.5 py-2.5 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap disabled:opacity-50"
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting || students.length === 0}
              className="px-4 py-2.5 rounded-[12px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap disabled:opacity-50 font-heading"
            >
              {exporting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang Xuất...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={15} />
                  <span>Xuất Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Toast thông báo */}
        {toastMsg && (
          <div
            className={`p-3.5 rounded-[14px] text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {toastMsg.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* ── BENTO KPI METRICS SUMMARY (4 BLOCKS TÍNH TỪ DỮ LIỆU THỰC) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tổng Thí Sinh */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Tổng Thí Sinh
              </span>
              <div className="p-2 rounded-[10px] bg-indigo-50 text-indigo-600">
                <Users size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] font-heading">
              {metrics.totalStudents}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              {metrics.totalStudents > 0 ? "Đã ghi danh tham gia" : "Chưa có thí sinh"}
            </span>
          </div>

          {/* Card 2: Hoàn Thành Bài Thi */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Hoàn Thành Bài Thi
              </span>
              <div className="p-2 rounded-[10px] bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700 font-heading">
              {metrics.completedStudents} <span className="text-sm font-bold text-slate-400">/ {metrics.totalStudents}</span>
            </div>
            <span className="text-xs text-emerald-600 font-bold mt-1 block">
              Tỷ lệ hoàn thành: {metrics.completionRate}%
            </span>
          </div>

          {/* Card 3: Điểm Cao Nhất */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Điểm Cao Nhất
              </span>
              <div className="p-2 rounded-[10px] bg-amber-50 text-amber-600">
                <Trophy size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] font-heading">
              {metrics.highestScore.toLocaleString()} <span className="text-sm font-bold text-slate-400">pts</span>
            </div>
            <span className="text-xs text-amber-600 font-bold mt-1 block truncate">
              Thủ khoa: {metrics.topStudent}
            </span>
          </div>

          {/* Card 4: Trạng Thái & Hạn Chót */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Hạn Chót / Kết Thúc
              </span>
              <div className="p-2 rounded-[10px] bg-purple-50 text-purple-600">
                <Calendar size={18} />
              </div>
            </div>
            <div className="text-lg font-extrabold text-[#0F172A] font-heading truncate">
              {roomInfo?.endTime
                ? new Date(roomInfo.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + new Date(roomInfo.endTime).toLocaleDateString("vi-VN")
                : "Không giới hạn"}
            </div>
            <span className="text-xs text-purple-600 font-bold mt-1 block">
              {isRoomFinished ? "Đã đóng phòng" : "Thí sinh có thể nộp bài 24/7"}
            </span>
          </div>
        </div>

        {/* ── BẢNG KẾT QUẢ VÀ BẢNG XẾP HẠNG THỰC TẾ ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm space-y-5">
          {/* Controls: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thí sinh theo biệt danh..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-[#E2E8F0] rounded-[12px] text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-[12px]">
              <button
                onClick={() => setFilterRank("all")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
                  filterRank === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả ({students.length})
              </button>
              <button
                onClick={() => setFilterRank("completed")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
                  filterRank === "completed" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đã Hoàn Thành ({metrics.completedStudents})
              </button>
              <button
                onClick={() => setFilterRank("top3")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all whitespace-nowrap ${
                  filterRank === "top3" ? "bg-white text-amber-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Top 3 Xuất Sắc
              </button>
            </div>
          </div>

          {/* Table / Empty State */}
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Đang đồng bộ dữ liệu thi đấu từ hệ thống...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 px-4 text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <BarChart3 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-heading mb-1">
                Chưa có thí sinh tham gia phòng này
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                Phòng thi đấu hiện tại chưa có thí sinh tham gia nộp bài. Bạn có thể chia sẻ mã PIN cho người chơi bắt đầu làm bài.
              </p>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <ArrowLeft size={14} />
                <span>Quay Lại Danh Sách Báo Cáo</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-slate-400 uppercase tracking-wider font-heading">
                    <th className="py-3 px-3 w-16">Hạng</th>
                    <th className="py-3 px-4">Thí Sinh</th>
                    <th className="py-3 px-4 text-center">Tiến Độ (Số câu đã làm)</th>
                    <th className="py-3 px-4 text-center">Đúng / Sai</th>
                    <th className="py-3 px-4 text-right">Tổng Điểm</th>
                    <th className="py-3 px-4 text-center">Danh Hiệu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.map((student) => {
                    const totalQ = student.totalQuestions || roomInfo?.totalQuestions || 0;
                    const answered = student.answeredCount ?? 0;
                    const percent = totalQ > 0 ? Math.min(100, Math.round((answered / totalQ) * 100)) : student.isCompleted ? 100 : 0;

                    return (
                      <tr key={student.id || student.rank} className="hover:bg-slate-50/70 transition-colors">
                        {/* Hạng */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`w-7 h-7 rounded-full inline-flex items-center justify-center font-black text-xs ${
                              student.rank === 1
                                ? "bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-300"
                                : student.rank === 2
                                ? "bg-slate-300 text-slate-900"
                                : student.rank === 3
                                ? "bg-amber-700 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {student.rank}
                          </span>
                        </td>

                        {/* Nickname & Avatar */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 font-heading">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                              {student.avatarUrl ? (
                                <img src={student.avatarUrl} alt={student.nickname} className="w-full h-full object-cover" />
                              ) : (
                                <span>{student.nickname.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <span>{student.nickname}</span>
                          </div>
                        </td>

                        {/* Tiến Độ (Số câu đã làm) */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1 min-w-[130px]">
                            <div className="flex items-center justify-between w-full text-[11px] font-bold">
                              <span className="text-slate-700">
                                {answered} / {totalQ > 0 ? totalQ : "?"} câu
                              </span>
                              {student.isCompleted ? (
                                <span className="text-emerald-600 flex items-center gap-0.5 font-bold">
                                  <Check size={12} className="stroke-[3]" /> Xong
                                </span>
                              ) : answered > 0 ? (
                                <span className="text-amber-600 font-bold">Đang làm</span>
                              ) : (
                                <span className="text-slate-400 font-semibold">Chưa làm</span>
                              )}
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  student.isCompleted
                                    ? "bg-emerald-500"
                                    : answered > 0
                                    ? "bg-amber-500"
                                    : "bg-slate-300"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Đúng / Sai */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {student.correctCount ?? 0} đúng
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                              {student.wrongCount ?? 0} sai
                            </span>
                          </div>
                        </td>

                        {/* Score */}
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 tabular-nums text-sm">
                          {student.totalScore.toLocaleString()} đ
                        </td>

                        {/* Danh hiệu */}
                        <td className="py-3.5 px-4 text-center">
                          {student.rank === 1 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1">
                              🥇 Quán Quân
                            </span>
                          )}
                          {student.rank === 2 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-bold inline-flex items-center gap-1">
                              🥈 Á Quân
                            </span>
                          )}
                          {student.rank === 3 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-700/15 text-amber-900 text-[11px] font-bold inline-flex items-center gap-1">
                              🥉 Hạng Ba
                            </span>
                          )}
                          {student.rank > 3 && (
                            <span className="text-slate-400 text-[11px] font-semibold">
                              {student.isCompleted ? "Hoàn thành" : "Đang thi đấu"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Xác Nhận Kết Thúc Sớm */}
        {showFinishConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border-2 border-rose-200 shadow-inner">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Xác Nhận Kết Thúc Phòng Sớm?
              </h3>
              <p className="text-xs md:text-sm font-semibold text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn kết thúc phòng thi này ngay bây giờ? Sau khi kết thúc, thí sinh sẽ không thể tiếp tục làm hoặc nộp bài mới và bảng xếp hạng sẽ được chốt cố định.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinishConfirm(false)}
                  disabled={finishing}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleFinishEarly}
                  disabled={finishing}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {finishing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Xác Nhận Kết Thúc</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
