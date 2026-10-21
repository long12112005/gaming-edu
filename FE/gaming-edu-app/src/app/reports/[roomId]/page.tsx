"use client";

import { use, useEffect, useState, useMemo } from "react";
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
  XCircle,
  HelpCircle,
  Sparkles,
  Percent,
  Search,
  Filter,
  Printer,
  ChevronDown,
  Layers,
  Flame,
} from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";

interface StudentResult {
  id: string;
  rank: number;
  nickname: string;
  avatarUrl?: string;
  totalScore: number;
  accuracy: number; // percentage
  answers: { questionIndex: number; isCorrect: boolean; timeTaken: number }[];
}

export default function RoomDetailedReportPage({ params }: { params: Promise<{ roomId: string }> }) {
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId;
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRank, setFilterRank] = useState<"all" | "top10" | "passed">("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Mock report data
  const reportInfo = {
    quizTitle: "Định Luật Bảo Toàn & Cơ Học Lượng Tử 12",
    pinCode: roomId.length === 6 ? roomId : "654321",
    conductedAt: "21/10/2026 18:20",
    totalStudents: 38,
    averageScore: 3620,
    overallAccuracy: 74,
    hardestQuestion: "Câu 3 (Khúc xạ & Chiết suất)",
    totalQuestions: 5,
  };

  const students: StudentResult[] = useMemo(
    () => [
      {
        id: "s-1",
        rank: 1,
        nickname: "AnhKhoa_Pro",
        totalScore: 4850,
        accuracy: 100,
        answers: [
          { questionIndex: 1, isCorrect: true, timeTaken: 4 },
          { questionIndex: 2, isCorrect: true, timeTaken: 5 },
          { questionIndex: 3, isCorrect: true, timeTaken: 8 },
          { questionIndex: 4, isCorrect: true, timeTaken: 6 },
          { questionIndex: 5, isCorrect: true, timeTaken: 7 },
        ],
      },
      {
        id: "s-2",
        rank: 2,
        nickname: "MinhThu_Math",
        totalScore: 4320,
        accuracy: 80,
        answers: [
          { questionIndex: 1, isCorrect: true, timeTaken: 5 },
          { questionIndex: 2, isCorrect: true, timeTaken: 6 },
          { questionIndex: 3, isCorrect: false, timeTaken: 12 },
          { questionIndex: 4, isCorrect: true, timeTaken: 7 },
          { questionIndex: 5, isCorrect: true, timeTaken: 8 },
        ],
      },
      {
        id: "s-3",
        rank: 3,
        nickname: "QuangHuy_Speed",
        totalScore: 3950,
        accuracy: 80,
        answers: [
          { questionIndex: 1, isCorrect: true, timeTaken: 3 },
          { questionIndex: 2, isCorrect: true, timeTaken: 4 },
          { questionIndex: 3, isCorrect: false, timeTaken: 15 },
          { questionIndex: 4, isCorrect: true, timeTaken: 5 },
          { questionIndex: 5, isCorrect: true, timeTaken: 9 },
        ],
      },
      {
        id: "s-4",
        rank: 4,
        nickname: "BaoNgoc_IELTS",
        totalScore: 3600,
        accuracy: 80,
        answers: [
          { questionIndex: 1, isCorrect: true, timeTaken: 6 },
          { questionIndex: 2, isCorrect: false, timeTaken: 9 },
          { questionIndex: 3, isCorrect: true, timeTaken: 11 },
          { questionIndex: 4, isCorrect: true, timeTaken: 8 },
          { questionIndex: 5, isCorrect: true, timeTaken: 10 },
        ],
      },
      {
        id: "s-5",
        rank: 5,
        nickname: "DucThang_99",
        totalScore: 3100,
        accuracy: 60,
        answers: [
          { questionIndex: 1, isCorrect: true, timeTaken: 7 },
          { questionIndex: 2, isCorrect: false, timeTaken: 14 },
          { questionIndex: 3, isCorrect: false, timeTaken: 18 },
          { questionIndex: 4, isCorrect: true, timeTaken: 9 },
          { questionIndex: 5, isCorrect: true, timeTaken: 11 },
        ],
      },
      {
        id: "s-6",
        rank: 6,
        nickname: "HoangYen_2k8",
        totalScore: 2800,
        accuracy: 60,
        answers: [
          { questionIndex: 1, isCorrect: false, timeTaken: 12 },
          { questionIndex: 2, isCorrect: true, timeTaken: 8 },
          { questionIndex: 3, isCorrect: false, timeTaken: 20 },
          { questionIndex: 4, isCorrect: true, timeTaken: 10 },
          { questionIndex: 5, isCorrect: true, timeTaken: 12 },
        ],
      },
    ],
    []
  );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = !searchQuery || s.nickname.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter =
        filterRank === "all"
          ? true
          : filterRank === "top10"
          ? s.rank <= 3
          : s.accuracy >= 70;
      return matchSearch && matchFilter;
    });
  }, [students, searchQuery, filterRank]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Hạng", "Thí Sinh", "Tổng Điểm", "Tỷ Lệ Đúng", "Câu 1", "Câu 2", "Câu 3", "Câu 4", "Câu 5"];
    const rows = students.map((s) => [
      s.rank,
      s.nickname,
      s.totalScore,
      `${s.accuracy}%`,
      ...s.answers.map((a) => (a.isCorrect ? "Đúng" : "Sai")),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BaoCao_GameEdu_${reportInfo.pinCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMsg("Đã tải xuống tệp báo cáo CSV thành công!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Export Excel
  const handleExportExcel = () => {
    handleExportCSV();
    setToastMsg("Đã xuất báo cáo tương thích Excel (.xlsx/.csv)!");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Top Navigation & Title */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/library"
              className="p-2.5 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-600 font-heading">
                  BÁO CÁO PHÂN TÍCH TRẬN ĐẤU
                </span>
                <span className="text-xs text-slate-400 font-mono">PIN: {reportInfo.pinCode}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] font-heading tracking-tight">
                {reportInfo.quizTitle}
              </h1>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">In Báo Cáo</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-[12px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all font-heading"
            >
              <FileSpreadsheet size={15} />
              <span>Xuất Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="p-3.5 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── BENTO KPI METRICS SUMMARY (4 BLOCKS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Sĩ số */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Tổng Thí Sinh
              </span>
              <div className="p-2 rounded-[10px] bg-indigo-50 text-indigo-600">
                <Users size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] font-heading">
              {reportInfo.totalStudents}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">100% hoàn thành bài thi</span>
          </div>

          {/* Card 2: Điểm trung bình */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Điểm Trung Bình
              </span>
              <div className="p-2 rounded-[10px] bg-amber-50 text-amber-600">
                <Trophy size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] font-heading">
              {reportInfo.averageScore} <span className="text-sm font-bold text-slate-400">pts</span>
            </div>
            <span className="text-xs text-emerald-600 font-bold mt-1 block">Cao hơn 12% so với kỳ trước</span>
          </div>

          {/* Card 3: Tỷ lệ chính xác */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Tỷ Lệ Đúng Chung
              </span>
              <div className="p-2 rounded-[10px] bg-emerald-50 text-emerald-600">
                <Percent size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] font-heading">
              {reportInfo.overallAccuracy}%
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Mức độ tiếp thu tốt</span>
          </div>

          {/* Card 4: Câu hỏi khó nhất */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Câu Hỏi Khó Nhất
              </span>
              <div className="p-2 rounded-[10px] bg-rose-50 text-rose-600">
                <HelpCircle size={18} />
              </div>
            </div>
            <div className="text-base font-extrabold text-[#0F172A] font-heading truncate">
              {reportInfo.hardestQuestion}
            </div>
            <span className="text-xs text-rose-500 font-bold mt-1 block">Chỉ 42% thí sinh làm đúng</span>
          </div>
        </div>

        {/* ── BẢNG MA TRẬN KẾT QUẢ HỌC SINH × CÂU HỎI ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm space-y-5">
          {/* Controls: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thí sinh theo tên..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-[#E2E8F0] rounded-[12px] text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-[12px]">
              <button
                onClick={() => setFilterRank("all")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                  filterRank === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả ({students.length})
              </button>
              <button
                onClick={() => setFilterRank("top10")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                  filterRank === "top10" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Top 3 Xuất sắc
              </button>
              <button
                onClick={() => setFilterRank("passed")}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                  filterRank === "passed" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đạt chuẩn ({">"}70%)
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-slate-400 uppercase tracking-wider font-heading">
                  <th className="py-3 px-3">Hạng</th>
                  <th className="py-3 px-4">Thí Sinh</th>
                  <th className="py-3 px-4 text-right">Tổng Điểm</th>
                  <th className="py-3 px-4 text-center">Tỷ Lệ Đúng</th>
                  <th className="py-3 px-2 text-center">Câu 1</th>
                  <th className="py-3 px-2 text-center">Câu 2</th>
                  <th className="py-3 px-2 text-center">Câu 3</th>
                  <th className="py-3 px-2 text-center">Câu 4</th>
                  <th className="py-3 px-2 text-center">Câu 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Hạng */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                          student.rank === 1
                            ? "bg-amber-100 text-amber-800"
                            : student.rank === 2
                            ? "bg-slate-200 text-slate-700"
                            : student.rank === 3
                            ? "bg-amber-700/20 text-amber-900"
                            : "text-slate-500"
                        }`}
                      >
                        {student.rank}
                      </span>
                    </td>

                    {/* Nickname */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-heading">
                      {student.nickname}
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 tabular-nums">
                      {student.totalScore.toLocaleString()}
                    </td>

                    {/* Accuracy Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          student.accuracy >= 80
                            ? "bg-emerald-50 text-emerald-700"
                            : student.accuracy >= 60
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {student.accuracy}%
                      </span>
                    </td>

                    {/* Câu 1..5 Matrix Cells */}
                    {student.answers.map((ans) => (
                      <td key={ans.questionIndex} className="py-3.5 px-2 text-center">
                        {ans.isCorrect ? (
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-bold"
                            title={`Đúng (${ans.timeTaken}s)`}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 text-rose-500 font-bold"
                            title={`Sai (${ans.timeTaken}s)`}
                          >
                            ✗
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
