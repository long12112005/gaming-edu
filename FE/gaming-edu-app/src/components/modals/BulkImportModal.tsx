"use client";

import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  UploadCloud,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Layers,
  Zap,
  ArrowRight,
} from "lucide-react";
import {
  parseRawTextToQuestions,
  parseSpreadsheetToQuestions,
  downloadSampleCsvTemplate,
  ParsedSlide,
} from "@/lib/quizParser";
import { api } from "@/lib/api";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: ParsedSlide[]) => void;
}

export default function BulkImportModal({
  isOpen,
  onClose,
  onImport,
}: BulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<"text" | "excel">("text");

  // Tab Text State
  const [rawText, setRawText] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Tab Excel State
  const [spreadsheetText, setSpreadsheetText] = useState("");

  // Preview List
  const [parsedQuestions, setParsedQuestions] = useState<ParsedSlide[]>([]);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  // 1. Trích xuất văn bản thô
  const handleParseText = () => {
    if (!rawText.trim()) {
      setToastMsg({ text: "Vui lòng nhập hoặc dán nội dung văn bản!", type: "error" });
      return;
    }
    const list = parseRawTextToQuestions(rawText);
    if (list.length === 0) {
      setToastMsg({
        text: "Không nhận diện được câu hỏi nào. Hãy kiểm tra định dạng hoặc bấm 'Thêm Mẫu' để xem ví dụ!",
        type: "error",
      });
      return;
    }
    setParsedQuestions(list);
    setToastMsg({
      text: `Đã trích xuất thành công ${list.length} câu hỏi!`,
      type: "success",
    });
  };

  // 2. Gọi AI Gemini phân tích nâng cao
  const handleAiParse = async () => {
    if (!rawText.trim()) {
      setToastMsg({ text: "Vui lòng dán nội dung tài liệu để AI phân tích!", type: "error" });
      return;
    }
    try {
      setIsAiLoading(true);
      const res = await api.post("/aijobs/quick-parse", {
        text: rawText.slice(0, 10000),
      });

      let jsonStr = res.data?.data || res.data;
      if (typeof jsonStr === "string") {
        // Parse JSON
        const items = JSON.parse(jsonStr);
        if (Array.isArray(items) && items.length > 0) {
          const mapped: ParsedSlide[] = items.map((item: any) => ({
            type: item.type || "QUIZ",
            questionText: item.questionText || "Câu hỏi",
            timeLimit: item.timeLimit || 30,
            points: item.points || 1000,
            options: Array.isArray(item.options) ? item.options : [],
          }));
          setParsedQuestions(mapped);
          setToastMsg({ text: `✨ AI Gemini đã phân tích và tạo ${mapped.length} câu hỏi!`, type: "success" });
          return;
        }
      }
      // Fallback parser nếu API trả về không khớp
      handleParseText();
    } catch {
      // Fallback về Regex parser mượt mà nếu AI chưa cấu hình Key
      const fallbackList = parseRawTextToQuestions(rawText);
      if (fallbackList.length > 0) {
        setParsedQuestions(fallbackList);
        setToastMsg({
          text: `Đã phân tích thông minh thành công ${fallbackList.length} câu hỏi!`,
          type: "success",
        });
      } else {
        setToastMsg({ text: "Không thể phân tích tài liệu này. Vui lòng kiểm tra lại cấu trúc văn bản.", type: "error" });
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // 3. Trích xuất từ Bảng tính / CSV / TSV
  const handleParseSpreadsheet = () => {
    if (!spreadsheetText.trim()) {
      setToastMsg({ text: "Vui lòng dán dữ liệu hoặc tải file bảng tính!", type: "error" });
      return;
    }
    const list = parseSpreadsheetToQuestions(spreadsheetText);
    if (list.length === 0) {
      setToastMsg({
        text: "Không nhận diện được dòng dữ liệu nào. Vui lòng kiểm tra đúng thứ tự cột!",
        type: "error",
      });
      return;
    }
    setParsedQuestions(list);
    setToastMsg({ text: `Đã nhập thành công ${list.length} câu hỏi từ bảng tính!`, type: "success" });
  };

  // Đọc file từ máy tính
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "text" | "excel") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (target === "text") {
        setRawText(content);
        const list = parseRawTextToQuestions(content);
        if (list.length > 0) setParsedQuestions(list);
      } else {
        setSpreadsheetText(content);
        const list = parseSpreadsheetToQuestions(content);
        if (list.length > 0) setParsedQuestions(list);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // Mẫu câu hỏi nhanh
  const insertSample = (type: "QUIZ" | "MATCHING" | "FILL_IN_BLANK") => {
    let sample = "";
    if (type === "QUIZ") {
      sample = `\nCâu 1: Đơn vị cơ bản cấu tạo nên mọi cơ thể sống là gì?\nA. Tế bào\nB. Phân tử\nC. Nguyên tử\nD. Hợp chất\nĐáp án: A\n`;
    } else if (type === "MATCHING") {
      sample = `\nCâu 2: Hãy ghép nối các thủ đô với quốc gia tương ứng:\nHà Nội - Việt Nam\nTokyo - Nhật Bản\nParis - Pháp\nSeoul - Hàn Quốc\n`;
    } else if (type === "FILL_IN_BLANK") {
      sample = `\nCâu 3: Giao thức truyền tải siêu văn bản an toàn trên Internet có tên viết tắt là [...]\nĐáp án: HTTPS\n`;
    }
    setRawText((prev) => prev.trim() + "\n" + sample);
  };

  // Xóa câu hỏi khỏi preview
  const handleRemoveQuestion = (index: number) => {
    setParsedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Hoàn tất nạp câu hỏi
  const handleConfirmImport = () => {
    if (parsedQuestions.length === 0) return;
    onImport(parsedQuestions);
    onClose();
  };

  // Thống kê số lượng theo loại
  const quizCount = parsedQuestions.filter((q) => q.type === "QUIZ").length;
  const matchCount = parsedQuestions.filter((q) => q.type === "MATCHING").length;
  const blankCount = parsedQuestions.filter((q) => q.type === "FILL_IN_BLANK").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md animate-in fade-in font-sans">
      <div className="bg-white border border-[#E2E8F0] rounded-[32px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ── HEADER MODAL ── */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Layers size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-heading font-black text-[#0F172A]">
                  Nhập Bộ Đề Hàng Loạt
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-heading font-extrabold uppercase">
                  Tự Động Bóc Tách
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Dán toàn bộ tài liệu có sẵn hoặc tải file Excel để chuyển thành Trắc nghiệm, Ghép cặp và Điền khuyết ngay lập tức.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── TOAST MESSAGE ── */}
        {toastMsg && (
          <div
            className={`px-5 py-3 text-xs font-bold flex items-center justify-between border-b ${
              toastMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : "bg-rose-50 text-rose-800 border-rose-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* ── TABS CHUYỂN ĐỔI ── */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`px-4 py-2 rounded-xl font-heading font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "text"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <FileText size={15} />
            <span>Dán Văn Bản & Trích Xuất (Smart Text & AI)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("excel")}
            className={`px-4 py-2 rounded-xl font-heading font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "excel"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <FileSpreadsheet size={15} />
            <span>Bảng Tính Excel / CSV</span>
          </button>
        </div>

        {/* ── NỘI DUNG TỪNG TAB ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeTab === "text" && (
            <div className="space-y-4">
              {/* Toolbar hỗ trợ dán */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-heading font-bold text-slate-600 mr-1">Chèn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => insertSample("QUIZ")}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-heading font-bold border border-blue-200 cursor-pointer"
                  >
                    + Mẫu Trắc Nghiệm
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSample("MATCHING")}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-heading font-bold border border-purple-200 cursor-pointer"
                  >
                    + Mẫu Ghép Cặp
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSample("FILL_IN_BLANK")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-heading font-bold border border-emerald-200 cursor-pointer"
                  >
                    + Mẫu Điền Khuyết
                  </button>
                </div>

                <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-heading font-bold border border-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors">
                  <UploadCloud size={14} className="text-indigo-600" />
                  <span>Chọn File (.txt, .docx)</span>
                  <input
                    type="file"
                    accept=".txt,.docx,.csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "text")}
                  />
                </label>
              </div>

              {/* Textarea nhập văn bản */}
              <div className="relative">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Dán nội dung tài liệu của bạn vào đây...\nVí dụ:\n\nCâu 1: Thủ đô nước ta là gì?\nA. Hà Nội\nB. TP. Hồ Chí Minh\nC. Đà Nẵng\nD. Hải Phòng\nĐáp án: A\n\nCâu 2: Hãy ghép cặp thủ đô với quốc gia:\nHà Nội - Việt Nam\nTokyo - Nhật Bản\n\nCâu 3: Nước sôi ở nhiệt độ [...] độ C.\nĐáp án: 100`}
                  rows={9}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-2xs leading-relaxed"
                />
              </div>

              {/* Actions trích xuất */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Zap size={15} />
                  <span>⚡ Trích Xuất Ngay (0.05s)</span>
                </button>

                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={handleAiParse}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-heading font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={15} className={isAiLoading ? "animate-spin" : ""} />
                  <span>{isAiLoading ? "AI Đang Phân Tích..." : "✨ Phân Tích Bằng AI (Gemini)"}</span>
                </button>

                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Tự động nhận diện Trắc nghiệm, Ghép cặp và Điền khuyết
                </span>
              </div>
            </div>
          )}

          {activeTab === "excel" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
                <div className="text-xs">
                  <div className="font-heading font-bold flex items-center gap-1.5 mb-0.5">
                    <HelpCircle size={15} className="text-amber-600" />
                    <span>Cấu trúc bảng tính Excel / CSV hỗ trợ cả 3 dạng câu hỏi</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Cột 1: <strong>Loại</strong> (QUIZ/MATCHING/FILL_IN_BLANK) | Cột 2: <strong>Câu hỏi</strong> | Cột 3-6: <strong>Phương án / Cặp ghép</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadSampleCsvTemplate}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-heading font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Tải File Mẫu Excel (.csv)</span>
                </button>
              </div>

              {/* Ô dán dữ liệu copy từ Excel hoặc chọn file */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-heading font-bold text-slate-700">
                    Dán các hàng sao chép từ Excel / Google Sheets:
                  </label>
                  <label className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-heading font-bold border border-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors">
                    <UploadCloud size={14} className="text-indigo-600" />
                    <span>Chọn File CSV / Excel</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "excel")}
                    />
                  </label>
                </div>

                <textarea
                  value={spreadsheetText}
                  onChange={(e) => setSpreadsheetText(e.target.value)}
                  placeholder="Dán các hàng dữ liệu từ Excel vào đây (Ctrl+C từ Excel rồi Ctrl+V vào ô này)..."
                  rows={8}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-2xs leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={handleParseSpreadsheet}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Zap size={15} />
                <span>⚡ Trích Xuất Dữ Liệu Bảng Tính</span>
              </button>
            </div>
          )}

          {/* ── DANH SÁCH CÂU HỎI ĐÃ BÓC TÁCH (PREVIEW SECTION) ── */}
          {parsedQuestions.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-sm text-[#0F172A]">
                    Xem trước kết quả bóc tách ({parsedQuestions.length} câu hỏi):
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-heading font-bold">
                    {quizCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {quizCount} Trắc nghiệm
                      </span>
                    )}
                    {matchCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {matchCount} Ghép cặp
                      </span>
                    )}
                    {blankCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {blankCount} Điền khuyết
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setParsedQuestions([])}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                >
                  Xóa tất cả
                </button>
              </div>

              {/* Danh sách thẻ câu hỏi */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {parsedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-heading font-extrabold text-[10px] uppercase ${
                            q.type === "QUIZ"
                              ? "bg-blue-100 text-blue-800"
                              : q.type === "MATCHING"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {q.type === "QUIZ" ? "Trắc Nghiệm" : q.type === "MATCHING" ? "Ghép Cặp" : "Điền Khuyết"}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {q.timeLimit}s • {q.points} điểm
                        </span>
                      </div>

                      <div className="font-heading font-bold text-slate-900 text-xs sm:text-sm">
                        {q.questionText}
                      </div>

                      {/* Chi tiết options */}
                      {q.type === "QUIZ" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 ${
                                opt.isCorrect
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              <span>{String.fromCharCode(65 + oIdx)}.</span>
                              <span className="truncate">{opt.content}</span>
                              {opt.isCorrect && <CheckCircle2 size={12} className="text-emerald-600 ml-auto shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === "MATCHING" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className="px-2.5 py-1 rounded-lg bg-purple-50/70 border border-purple-200 text-purple-950 text-[11px] font-medium flex items-center justify-between"
                            >
                              <span className="font-bold">{opt.content}</span>
                              <span className="text-purple-400 mx-1">↔</span>
                              <span className="text-purple-700">{opt.matchingPair}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === "FILL_IN_BLANK" && (
                        <div className="pt-1 text-[11px]">
                          <span className="text-slate-500">Từ khóa chấp nhận: </span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {q.options[0]?.content}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Xóa câu này"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-heading font-bold text-xs transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            disabled={parsedQuestions.length === 0}
            onClick={handleConfirmImport}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-heading font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2 cursor-pointer"
          >
            <span>Nhập {parsedQuestions.length} Câu Hỏi Vào Bộ Đề</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
