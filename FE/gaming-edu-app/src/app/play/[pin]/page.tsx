"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useGameHub } from "@/hooks/useGameHub";
import { useQAHub } from "@/hooks/useQAHub";
import { Trophy, Check, X, Clock, MessageCircle, ThumbsUp, Send, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type GameState = "CONNECTING" | "LOBBY" | "PLAYING" | "ANSWER_RESULT" | "LEADERBOARD" | "ENDED" | "ERROR";

// ─── Nút Bấm 3D Toàn Cục ───────────────────────────────────────────────────
function ActionButton({ icon: Icon, label, variant = "primary", onClick, disabled, className = "", type = "button" }: any) {
  const baseClasses = `relative flex items-center justify-center gap-2 font-900 rounded-[20px] border-4 transition-all duration-200 active:translate-y-2 px-6 py-4 text-lg ${className}`;
  const variants: any = {
    primary: "bg-violet-500 border-violet-700 text-white shadow-[0_6px_0_0_#5b21b6] hover:bg-violet-600 active:shadow-none",
    disabled: "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed shadow-[0_6px_0_0_#9ca3af]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabled ? variants.disabled : variants[variant]}`}
    >
      {Icon && <Icon size={24} className={disabled ? "text-gray-400" : "text-white"} />}
      {label}
    </button>
  );
}

export default function PlayerGameRoom() {
  const params = useParams();
  const router = useRouter();
  const pinCode = params.pin as string;
  
  const {
    isConnected,
    gameState,
    error,
    roomInfo,
    currentSlide,
    slideTimeLeft,
    answerResult,
    leaderboard,
    joinRoom,
    submitAnswer: hubSubmitAnswer
  } = useGameHub();

  const {
    questions,
    askQuestion,
    upvoteQuestion,
  } = useQAHub(roomInfo?.roomId || null);

  const [hasAnswered, setHasAnswered] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [qaText, setQaText] = useState("");

  useEffect(() => {
    if (isConnected) {
      const guestName = Cookies.get("guest_nickname");
      const userStr = Cookies.get("user");
      const nickname = guestName || (userStr ? JSON.parse(userStr).nickname : "Anonymous");
      joinRoom(pinCode, nickname);
    }
  }, [isConnected, joinRoom, pinCode]);

  useEffect(() => {
    if (gameState === "PLAYING") {
      setHasAnswered(false);
    }
  }, [gameState]);

  const submitAnswer = (optionId: string) => {
    if (hasAnswered || !slideTimeLeft || slideTimeLeft === 0) return;
    setHasAnswered(true);
    hubSubmitAnswer(currentSlide.slideId, {
      selectedOptionIds: [optionId],
      timeTakenMs: (currentSlide.timeLimit - slideTimeLeft) * 1000
    });
  };

  const optionStyles = [
    "bg-red-500 border-red-700 shadow-[0_8px_0_0_#b91c1c]",
    "bg-blue-500 border-blue-700 shadow-[0_8px_0_0_#1d4ed8]",
    "bg-amber-400 border-amber-600 shadow-[0_8px_0_0_#b45309]",
    "bg-emerald-500 border-emerald-700 shadow-[0_8px_0_0_#047857]"
  ];

  if (!isConnected && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F1FA] font-sans">
        <Loader2 size={64} className="text-violet-600 animate-spin mb-6" />
        <h2 className="text-2xl font-900 text-gray-900 tracking-tight">Đang kết nối vào phòng...</h2>
        <div className="mt-4 px-6 py-2 bg-white rounded-full border-4 border-violet-100 shadow-sm font-black text-violet-700 text-xl tracking-widest">
           PIN: {pinCode}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F1FA] p-6 text-center font-sans">
        <div className="bg-white p-10 rounded-[40px] border-4 border-red-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] max-w-md w-full flex flex-col items-center">
           <div className="w-24 h-24 bg-red-100 border-4 border-red-200 rounded-[24px] flex items-center justify-center transform rotate-6 mb-8">
             <X size={48} className="text-red-500" />
           </div>
           <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Ối! Đã xảy ra lỗi</h1>
           <p className="text-lg font-700 text-gray-500 mb-8">{error}</p>
           <ActionButton onClick={() => router.push("/")} variant="primary" label="Về Trang Chủ" className="w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1FA] font-sans">
       {/* ── HEADER BONG BÓNG ── */}
       <header className="bg-white border-b-4 border-gray-200 p-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-[16px] border-2 border-gray-200">
             <span className="text-xs font-900 text-gray-500 uppercase">PIN</span>
             <span className="font-black text-xl text-gray-900">{pinCode}</span>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-sm font-800 text-gray-500 hidden sm:inline-block">Người chơi</span>
             <div className="bg-violet-100 text-violet-700 px-4 py-2 rounded-[16px] border-2 border-violet-200 font-black text-lg shadow-sm">
                {roomInfo?.playerNickname}
             </div>
          </div>
       </header>

       <main className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full">
          {/* ════════════════════════════════════════════════════════════
              WAITING STATE (CHỜ BẮT ĐẦU)
          ════════════════════════════════════════════════════════════ */}
          {gameState === "WAITING" && (
             <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
                <div className="relative">
                   <div className="w-32 h-32 bg-violet-600 rounded-[32px] border-4 border-violet-800 shadow-[0_8px_0_0_#4c1d95] flex items-center justify-center mb-8 transform -rotate-3 animate-pulse">
                      <Trophy size={64} className="text-white" />
                   </div>
                   {/* Sparkles */}
                   <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
                   <div className="absolute bottom-4 -left-4 w-6 h-6 bg-pink-400 rounded-full animate-bounce" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Bạn đã vào phòng!</h2>
                <p className="text-xl font-800 text-gray-500 bg-white px-6 py-3 rounded-[20px] border-2 border-gray-200 shadow-sm">
                  Hãy nhìn lên màn hình chính và chờ Host bắt đầu...
                </p>
             </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              PLAYING STATE (ĐANG TRẢ LỜI)
          ════════════════════════════════════════════════════════════ */}
          {gameState === "PLAYING" && currentSlide && (
             <div className="flex-1 flex flex-col animate-fade-in-up">
                <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-[24px] border-4 border-gray-100 shadow-sm">
                   <div className="bg-gray-100 px-4 py-2 rounded-[16px] font-900 text-gray-600">
                     Câu {currentSlide.index !== undefined ? currentSlide.index + 1 : "?"}
                   </div>
                   <div className={`flex items-center gap-2 font-black text-3xl px-6 py-2 rounded-[16px] border-4 ${slideTimeLeft && slideTimeLeft <= 5 ? 'bg-red-100 text-red-600 border-red-200 animate-pulse' : 'bg-gray-50 text-gray-800 border-gray-200'}`}>
                      <Clock size={28} /> {slideTimeLeft || 0}s
                   </div>
                </div>
                
                <h3 className="text-2xl md:text-4xl font-black text-center text-gray-900 mb-10 leading-tight">
                   {currentSlide.questionText}
                </h3>

                {!hasAnswered && slideTimeLeft && slideTimeLeft > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                     {currentSlide.options.map((opt: any, idx: number) => (
                        <button
                          key={opt.id}
                          onClick={() => submitAnswer(opt.id)}
                          className={`${optionStyles[idx % 4]} text-white p-6 rounded-[32px] border-4 font-black text-2xl md:text-3xl active:translate-y-2 active:shadow-none transition-all flex items-center justify-center min-h-[160px]`}
                        >
                           {opt.content}
                        </button>
                     ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                     <div className="text-2xl md:text-3xl font-black text-gray-600 bg-gray-200 border-4 border-gray-300 px-10 py-6 rounded-[32px] shadow-inner text-center">
                        {slideTimeLeft && slideTimeLeft > 0 ? (
                          <>
                            <Loader2 size={40} className="animate-spin mx-auto mb-4" />
                            Đang chờ những người khác...
                          </>
                        ) : "Hết thời gian!"}
                     </div>
                  </div>
                )}
             </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ANSWER RESULT STATE (KẾT QUẢ TRẢ LỜI CỦA BẠN)
          ════════════════════════════════════════════════════════════ */}
          {(gameState === "LEADERBOARD" || answerResult) && answerResult && (
             <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
                {answerResult.isCorrect ? (
                   <div className="w-40 h-40 bg-green-500 text-white rounded-[40px] border-4 border-green-700 shadow-[0_12px_0_0_#15803d] flex items-center justify-center mb-10 transform -rotate-6">
                      <Check size={80} strokeWidth={4} />
                   </div>
                ) : (
                   <div className="w-40 h-40 bg-red-500 text-white rounded-[40px] border-4 border-red-700 shadow-[0_12px_0_0_#b91c1c] flex items-center justify-center mb-10 transform rotate-6">
                      <X size={80} strokeWidth={4} />
                   </div>
                )}
                
                <h2 className={`text-5xl md:text-6xl font-black mb-6 tracking-tight ${answerResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                   {answerResult.isCorrect ? 'Tuyệt Vời!' : 'Sai Rồi!'}
                </h2>
                
                <div className="bg-white px-10 py-6 rounded-[32px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-gray-100 inline-block mb-8">
                   <div className="text-sm font-900 text-gray-400 uppercase tracking-widest mb-2">Điểm nhận được</div>
                   <div className="text-5xl font-black text-gray-900">+{answerResult.scoreAwarded}</div>
                </div>
                
                <div className="bg-violet-100 border-4 border-violet-200 px-8 py-4 rounded-[24px] text-xl font-900 text-violet-800 shadow-sm">
                   Tổng điểm hiện tại: <span className="text-3xl ml-2">{answerResult.totalScore}</span>
                </div>
             </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              FINISHED STATE (TRÒ CHƠI KẾT THÚC)
          ════════════════════════════════════════════════════════════ */}
          {gameState === "FINISHED" && (
             <div className="flex-1 flex flex-col animate-fade-in-up">
                <h2 className="text-4xl md:text-5xl font-black text-center text-gray-900 mb-10 mt-6 tracking-tight">Trò Chơi Kết Thúc!</h2>
                
                <div className="bg-white rounded-[40px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-gray-100 overflow-hidden">
                   <div className="bg-violet-600 p-6 text-white text-center border-b-4 border-violet-800">
                      <div className="font-black text-2xl tracking-wide uppercase">Bảng Xếp Hạng Cuối Cùng</div>
                   </div>
                   <div className="divide-y-4 divide-gray-50 p-4">
                      {leaderboard.map((player, idx) => (
                         <div key={player.playerId} className={`p-4 flex items-center justify-between rounded-[20px] mb-2 ${idx === 0 ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-gray-50 border-2 border-transparent'}`}>
                            <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center font-black text-xl border-2 ${idx === 0 ? 'bg-yellow-400 text-white border-yellow-600' : idx === 1 ? 'bg-gray-300 text-gray-800 border-gray-400' : idx === 2 ? 'bg-orange-400 text-white border-orange-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                                  {idx + 1}
                               </div>
                               <div className="font-black text-xl text-gray-900">{player.nickname}</div>
                            </div>
                            <div className="font-black text-2xl text-violet-600">{player.totalScore}</div>
                         </div>
                      ))}
                   </div>
                </div>
                <div className="mt-10 flex justify-center">
                   <ActionButton onClick={() => router.push("/")} variant="primary" label="Trở Về Trang Chủ" className="w-full md:w-auto md:px-12" />
                </div>
             </div>
          )}
       </main>

       {/* ── NÚT VÀ MODAL HỎI ĐÁP (Q&A) ── */}
       {gameState !== "CONNECTING" && gameState !== "ERROR" && (
          <>
             <button
                onClick={() => setShowQA(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-violet-600 text-white rounded-[24px] border-4 border-violet-800 shadow-[0_6px_0_0_#4c1d95] active:translate-y-2 active:shadow-none flex items-center justify-center transition-all z-40"
             >
                <MessageCircle size={28} />
                {questions.length > 0 && (
                   <span className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 border-4 border-white rounded-full text-sm font-black flex items-center justify-center shadow-md">
                      {questions.length}
                   </span>
                )}
             </button>

             {showQA && (
                <div className="fixed inset-0 z-50 flex flex-col bg-[#F4F1FA] animate-fade-in-up md:p-10">
                   <div className="bg-white w-full h-full md:max-w-3xl md:mx-auto md:rounded-[40px] md:border-4 md:border-gray-200 flex flex-col shadow-2xl overflow-hidden">
                      <div className="bg-violet-50 p-6 flex items-center justify-between border-b-4 border-violet-100 sticky top-0 z-10 shrink-0">
                         <h3 className="font-900 text-gray-900 text-2xl flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-[16px] border-2 border-violet-200 flex items-center justify-center">
                               <MessageCircle size={24} className="text-violet-600" />
                            </div>
                            Góc Hỏi Đáp
                         </h3>
                         <button onClick={() => setShowQA(false)} className="w-12 h-12 bg-white border-2 border-gray-200 text-gray-500 rounded-[16px] hover:bg-gray-100 flex items-center justify-center transition-colors">
                            <X size={24} />
                         </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                         {questions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                               <div className="w-24 h-24 bg-gray-50 rounded-[32px] border-4 border-dashed border-gray-200 flex items-center justify-center mb-6">
                                  <MessageCircle size={40} className="text-gray-300" />
                               </div>
                               <h4 className="font-900 text-xl text-gray-900 mb-2">Chưa có ai hỏi gì cả!</h4>
                               <p className="font-600 text-gray-500">Nếu bạn có thắc mắc về câu hỏi, hãy là người đầu tiên đặt câu hỏi nhé.</p>
                            </div>
                         ) : (
                            questions
                               .filter(q => !q.isResolved)
                               .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.upvotes - a.upvotes)
                               .map(q => (
                               <div key={q.id} className={`bg-white p-6 rounded-[24px] border-4 shadow-sm ${q.isPinned ? 'border-amber-300 bg-amber-50' : 'border-gray-100'}`}>
                                  <div className="flex items-center justify-between mb-3">
                                     <div className="font-900 text-lg text-gray-900">{q.playerNickname}</div>
                                     {q.isPinned && <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-xl border-2 border-amber-200 font-black">Ghim</span>}
                                  </div>
                                  <p className="text-gray-700 font-700 text-lg mb-4">{q.content}</p>
                                  <button
                                     onClick={() => upvoteQuestion(q.id)}
                                     className="flex items-center gap-2 text-sm font-black text-violet-600 bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-[16px] transition-colors border-2 border-violet-200"
                                  >
                                     <ThumbsUp size={18} /> {q.upvotes} Lượt thích
                                  </button>
                               </div>
                            ))
                         )}
                      </div>

                      <div className="bg-white p-6 border-t-4 border-gray-100 shrink-0">
                         <form
                            onSubmit={(e) => {
                               e.preventDefault();
                               if (!qaText.trim() || !roomInfo?.playerId) return;
                               askQuestion(roomInfo.playerId, qaText.trim());
                               setQaText("");
                            }}
                            className="flex gap-4"
                         >
                            <input
                               type="text"
                               value={qaText}
                               onChange={(e) => setQaText(e.target.value)}
                               placeholder="Gõ câu hỏi của bạn vào đây..."
                               className="flex-1 bg-gray-50 border-4 border-gray-200 rounded-[20px] px-6 py-4 focus:outline-none focus:border-violet-500 focus:bg-white text-lg font-700 transition-colors"
                            />
                            <button type="submit" disabled={!qaText.trim()} className="w-16 flex items-center justify-center bg-violet-500 text-white border-4 border-violet-700 shadow-[0_6px_0_0_#5b21b6] active:translate-y-2 active:shadow-none rounded-[20px] disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_0_#5b21b6]">
                               <Send size={24} />
                            </button>
                         </form>
                      </div>
                   </div>
                </div>
             )}
          </>
       )}
    </div>
  );
}
