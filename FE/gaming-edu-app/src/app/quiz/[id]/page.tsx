"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, UploadCloud, Sparkles, CheckCircle2, GripVertical, Settings2, Play } from "lucide-react";
import { QuizAPI, SlideAPI, AIJobAPI } from "@/lib/api";

const SLIDE_TYPES = [
  { value: "QUIZ", label: "Trắc nghiệm" },
  { value: "FILL_IN_BLANK", label: "Điền vào chỗ trống" },
  { value: "MATCHING", label: "Nối từ" },
  { value: "POLL", label: "Khảo sát (Poll)" },
  { value: "WORD_CLOUD", label: "Word Cloud" },
];

export default function SlideBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: quizId } = use(params);
  
  const [quiz, setQuiz] = useState<any>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  
  // AI State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string>("");

  useEffect(() => {
    fetchQuizAndSlides();
  }, [quizId]);

  const fetchQuizAndSlides = async () => {
    try {
      const qRes: any = await QuizAPI.getById(quizId);
      if (qRes.success) setQuiz(qRes.data);
      
      const sRes: any = await SlideAPI.getAllByQuiz(quizId);
      if (sRes.success) {
        setSlides(sRes.data);
        if (sRes.data.length > 0 && !selectedSlideId) {
          setSelectedSlideId(sRes.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- AI Polling Logic ---
  useEffect(() => {
    if (!aiJobId) return;
    const interval = setInterval(async () => {
      try {
        const res: any = await AIJobAPI.getJobStatus(aiJobId);
        if (res.success) {
          setAiStatus(res.data.status);
          if (res.data.status === "COMPLETED") {
            clearInterval(interval);
            setIsGenerating(false);
            setAiJobId(null);
            fetchQuizAndSlides(); // Refresh to show DRAFT slides
          } else if (res.data.status === "FAILED") {
            clearInterval(interval);
            setIsGenerating(false);
            setAiJobId(null);
            alert("Tạo đề bằng AI thất bại.");
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [aiJobId]);

  const handleUploadAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsGenerating(true);
      setAiStatus("Uploading...");
      const res: any = await AIJobAPI.createJob({ quizId, fileUrl: "https://example.com/dummy.pdf" });
      if (res.success) {
        setAiJobId(res.data.jobId);
        setAiStatus("PENDING");
      }
    } catch (err) {
      alert("Lỗi upload file AI.");
      setIsGenerating(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleApproveDrafts = async () => {
    try {
      await SlideAPI.approveAll(quizId);
      alert("Đã duyệt tất cả câu hỏi DRAFT!");
      fetchQuizAndSlides();
    } catch (err) {
      alert("Lỗi duyệt DRAFT");
    }
  };

  // --- Slide Actions ---
  const handleAddSlide = async () => {
    try {
      const newOrder = slides.length + 1;
      const payload = {
        quizId,
        type: "QUIZ",
        questionText: "Câu hỏi mới",
        timeLimit: 20,
        points: 1000,
        orderIndex: newOrder,
        content: JSON.stringify({
          answers: [
            { text: "Đáp án 1", isCorrect: true },
            { text: "Đáp án 2", isCorrect: false }
          ]
        })
      };
      const res: any = await SlideAPI.create(quizId, payload);
      if (res.success) {
        setSlides([...slides, res.data]);
        setSelectedSlideId(res.data.id);
      }
    } catch (err) {
      alert("Lỗi tạo slide!");
    }
  };

  const handleUpdateSlide = async (id: string, updates: any) => {
    setSlides(slides.map(s => s.id === id ? { ...s, ...updates } : s));
    // In real app, we should debounce the API call or explicitly save
  };

  const saveSlideToDB = async (id: string) => {
    const slide = slides.find(s => s.id === id);
    if (!slide) return;
    try {
      await SlideAPI.update(quizId, id, slide);
    } catch (err) {
      alert("Lỗi lưu slide!");
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!confirm("Xóa slide này?")) return;
    try {
      await SlideAPI.delete(quizId, id);
      const newSlides = slides.filter(s => s.id !== id);
      setSlides(newSlides);
      if (selectedSlideId === id) setSelectedSlideId(newSlides[0]?.id || null);
    } catch (err) {
      alert("Lỗi xóa slide");
    }
  };

  const selectedSlide = slides.find(s => s.id === selectedSlideId);

  // Parse content safely
  let parsedContent: any = {};
  if (selectedSlide?.content) {
    try {
      parsedContent = JSON.parse(selectedSlide.content);
    } catch (e) {}
  }

  const updateSlideContent = (newContent: any) => {
    if (!selectedSlideId) return;
    handleUpdateSlide(selectedSlideId, { content: JSON.stringify(newContent) });
  };

  if (!quiz) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const hasDrafts = slides.some(s => s.status === "DRAFT");

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* HEADER */}
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center">
          <button onClick={() => router.push("/dashboard")} className="p-2 mr-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={quiz.title} 
            onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            className="text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center space-x-3">
          {isGenerating && (
            <div className="flex items-center text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <Sparkles className="w-4 h-4 mr-1.5 animate-pulse" />
              AI: {aiStatus}
            </div>
          )}
          {hasDrafts && (
            <button onClick={handleApproveDrafts} className="flex items-center bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-green-300">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Duyệt tất cả DRAFT
            </button>
          )}
          <div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleUploadAI} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-indigo-200"
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> Tạo bằng AI
            </button>
          </div>
          <button 
            onClick={() => router.push(`/host/setup/${quizId}`)}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" /> Bắt đầu ngay
          </button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Slides List */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Danh sách ({slides.length})</span>
            <button onClick={handleAddSlide} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {slides.map((slide, idx) => (
              <div 
                key={slide.id} 
                onClick={() => setSelectedSlideId(slide.id)}
                className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedSlideId === slide.id 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm" 
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                  {slide.status === "DRAFT" && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-sm font-bold">DRAFT</span>
                  )}
                  {selectedSlideId === slide.id && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(slide.id); }} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center p-2 text-center text-xs text-gray-600 dark:text-gray-300 font-medium break-words overflow-hidden">
                  {slide.questionText || "Nhập câu hỏi..."}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER PANEL: Canvas */}
        <main className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-y-auto p-8 flex items-center justify-center">
          {selectedSlide ? (
            <div className="w-full max-w-4xl bg-white dark:bg-gray-800 aspect-[16/9] rounded-2xl shadow-xl flex flex-col p-8 md:p-12 border border-gray-200 dark:border-gray-700">
              <input 
                type="text"
                placeholder="Bắt đầu nhập câu hỏi của bạn tại đây..."
                value={selectedSlide.questionText}
                onChange={(e) => handleUpdateSlide(selectedSlide.id, { questionText: e.target.value })}
                className="w-full text-center text-3xl md:text-5xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 mb-8 mt-10"
              />
              
              <div className="flex-1 flex items-center justify-center">
                {/* DYNAMIC CONTENT EDITOR BASED ON TYPE */}
                {selectedSlide.type === "QUIZ" && (
                  <div className="w-full grid grid-cols-2 gap-4">
                    {["red", "blue", "yellow", "green"].map((color, i) => {
                      const answer = parsedContent.answers?.[i] || { text: "", isCorrect: false };
                      const bgColors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
                      return (
                        <div key={i} className={`relative flex items-center p-4 rounded-xl ${bgColors[i]} shadow-inner text-white`}>
                          <button 
                            onClick={() => {
                              const newAnswers = [...(parsedContent.answers || [])];
                              // Set this true, others false for single choice (or support multiple)
                              newAnswers.forEach((a, idx) => { if(!newAnswers[idx]) newAnswers[idx] = {text:"", isCorrect:false}; newAnswers[idx].isCorrect = (idx === i); });
                              updateSlideContent({ ...parsedContent, answers: newAnswers });
                            }}
                            className={`w-8 h-8 rounded-full border-4 flex items-center justify-center mr-4 transition-colors ${answer.isCorrect ? "bg-white border-white" : "border-white/50 hover:border-white"}`}
                          >
                            {answer.isCorrect && <CheckCircle2 className={`w-5 h-5 text-${color}-600`} />}
                          </button>
                          <input 
                            type="text" 
                            placeholder={`Đáp án ${i + 1}`}
                            value={answer.text}
                            onChange={(e) => {
                              const newAnswers = [...(parsedContent.answers || [])];
                              if (!newAnswers[i]) newAnswers[i] = { text: "", isCorrect: false };
                              newAnswers[i].text = e.target.value;
                              updateSlideContent({ ...parsedContent, answers: newAnswers });
                            }}
                            className="flex-1 bg-transparent border-none text-xl font-semibold placeholder-white/70 focus:ring-0 p-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedSlide.type === "FILL_IN_BLANK" && (
                  <div className="w-full max-w-xl bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Từ khóa chính xác (Các đáp án đúng):</label>
                    <input 
                      type="text" 
                      placeholder="VD: Hà Nội, Thu đô Hà Nội (ngăn cách bởi dấu phẩy)"
                      value={parsedContent.blankKeywords?.join(", ") || ""}
                      onChange={(e) => {
                        const keywords = e.target.value.split(",").map(s => s.trim()).filter(s => s);
                        updateSlideContent({ ...parsedContent, blankKeywords: keywords });
                      }}
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {selectedSlide.type === "MATCHING" && (
                  <div className="w-full max-w-2xl space-y-3">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Các cặp nối (Vế trái - Vế phải):</label>
                    {(parsedContent.matchingPairs || [{left:"", right:""}, {left:"", right:""}]).map((pair: any, i: number) => (
                      <div key={i} className="flex space-x-3 items-center">
                        <input 
                          type="text" placeholder="Vế trái" value={pair.left}
                          onChange={(e) => {
                            const newPairs = [...(parsedContent.matchingPairs || [])];
                            if(!newPairs[i]) newPairs[i] = {left:"", right:""};
                            newPairs[i].left = e.target.value;
                            updateSlideContent({ ...parsedContent, matchingPairs: newPairs });
                          }}
                          className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-gray-400 font-bold">-</span>
                        <input 
                          type="text" placeholder="Vế phải (Đáp án đúng)" value={pair.right}
                          onChange={(e) => {
                            const newPairs = [...(parsedContent.matchingPairs || [])];
                            if(!newPairs[i]) newPairs[i] = {left:"", right:""};
                            newPairs[i].right = e.target.value;
                            updateSlideContent({ ...parsedContent, matchingPairs: newPairs });
                          }}
                          className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newPairs = [...(parsedContent.matchingPairs || []), {left:"", right:""}];
                        updateSlideContent({ ...parsedContent, matchingPairs: newPairs });
                      }}
                      className="text-sm text-blue-600 font-bold hover:underline mt-2 inline-block"
                    >
                      + Thêm cặp nối
                    </button>
                  </div>
                )}

                {(selectedSlide.type === "POLL" || selectedSlide.type === "WORD_CLOUD") && (
                  <div className="text-center text-gray-400 dark:text-gray-500 font-medium">
                    {selectedSlide.type === "POLL" ? "Người chơi sẽ được tự do chọn các đáp án." : "Người chơi sẽ nhập từ khóa. Các từ lặp lại nhiều sẽ to hơn."}
                    <br />(Không cần cấu hình đáp án đúng cho loại câu hỏi này)
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 font-medium">Chọn một slide để chỉnh sửa</div>
          )}
        </main>

        {/* RIGHT PANEL: Settings */}
        {selectedSlide && (
          <aside className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
              <Settings2 className="w-5 h-5 text-gray-500 mr-2" />
              <span className="font-bold text-gray-900 dark:text-white">Cài đặt Slide</span>
            </div>
            
            <div className="p-5 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Loại câu hỏi</label>
                <select 
                  value={selectedSlide.type}
                  onChange={(e) => handleUpdateSlide(selectedSlide.id, { type: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                  {SLIDE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Thời gian (giây)</label>
                <select 
                  value={selectedSlide.timeLimit}
                  onChange={(e) => handleUpdateSlide(selectedSlide.id, { timeLimit: parseInt(e.target.value) })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                  <option value={10}>10 giây</option>
                  <option value={20}>20 giây</option>
                  <option value={30}>30 giây</option>
                  <option value={60}>1 phút</option>
                  <option value={120}>2 phút</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Điểm tối đa</label>
                <select 
                  value={selectedSlide.points}
                  onChange={(e) => handleUpdateSlide(selectedSlide.id, { points: parseInt(e.target.value) })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                  <option value={0}>0 (Không tính điểm)</option>
                  <option value={1000}>1000 (Tiêu chuẩn)</option>
                  <option value={2000}>2000 (Gấp đôi)</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => saveSlideToDB(selectedSlide.id)}
                className="w-full flex justify-center items-center bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
              >
                <Save className="w-5 h-5 mr-2" /> Lưu thay đổi
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
