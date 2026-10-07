"use client";

import { useEffect, useState, useRef } from "react";
import { useGameHub } from "@/hooks/useGameHub";
import { useQAHub } from "@/hooks/useQAHub";
import { Trophy, Check, X, Clock, MessageCircle, ThumbsUp, Send } from "lucide-react";
import Button from "@/components/ui/Button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type GameState = "CONNECTING" | "LOBBY" | "PLAYING" | "ANSWER_RESULT" | "LEADERBOARD" | "ENDED" | "ERROR";

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

  const optionColors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

  if (!isConnected && !error) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-bold text-gray-500">Đang kết nối vào phòng {pinCode}...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
         <X size={48} className="text-red-500 mb-4" />
         <h1 className="text-2xl font-bold text-gray-900 mb-2">Đã xảy ra lỗi</h1>
         <p className="text-gray-600 mb-6">{error}</p>
         <Button onClick={() => router.push("/")} variant="primary">Về Trang Chủ</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
       {/* Header */}
       <header className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
          <div className="font-bold text-gray-800">PIN: {pinCode}</div>
          <div className="font-bold text-violet-600">{roomInfo?.playerNickname}</div>
       </header>

       <main className="flex-1 flex flex-col p-4 md:p-8 max-w-3xl mx-auto w-full">
          {gameState === "WAITING" && (
             <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                   <Trophy size={40} />
                </div>
                <h2 className="text-2xl md:text-3xl font-900 text-gray-900 mb-2">Bạn đã vào phòng!</h2>
                <p className="text-lg text-gray-600">Đang chờ Host bắt đầu trò chơi...</p>
             </div>
          )}

          {gameState === "PLAYING" && currentSlide && (
             <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <div className="text-sm font-bold text-gray-500 uppercase">Câu {currentSlide.index !== undefined ? currentSlide.index + 1 : "?"}</div>
                   <div className={`flex items-center gap-2 font-black text-2xl ${slideTimeLeft && slideTimeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                      <Clock size={24} /> {slideTimeLeft || 0}s
                   </div>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-800 text-center text-gray-900 mb-10">
                   {currentSlide.questionText}
                </h3>

                {!hasAnswered && slideTimeLeft && slideTimeLeft > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                     {currentSlide.options.map((opt: any, idx: number) => (
                        <button
                          key={opt.id}
                          onClick={() => submitAnswer(opt.id)}
                          className={`${optionColors[idx % 4]} text-white p-6 rounded-2xl font-bold text-xl md:text-2xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center min-h-[120px]`}
                        >
                           {opt.content}
                        </button>
                     ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                     <div className="text-xl font-bold text-gray-600 bg-gray-200 px-6 py-3 rounded-full">
                        {slideTimeLeft && slideTimeLeft > 0 ? "Đang đợi người khác trả lời..." : "Hết thời gian!"}
                     </div>
                  </div>
                )}
             </div>
          )}

          {(gameState === "LEADERBOARD" || answerResult) && answerResult && (
             <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
                {answerResult.isCorrect ? (
                   <div className="w-32 h-32 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200">
                      <Check size={64} />
                   </div>
                ) : (
                   <div className="w-32 h-32 bg-red-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-200">
                      <X size={64} />
                   </div>
                )}
                
                <h2 className={`text-4xl font-900 mb-4 ${answerResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                   {answerResult.isCorrect ? 'Tuyệt Vời!' : 'Sai Rồi!'}
                </h2>
                
                <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-gray-100 inline-block">
                   <div className="text-sm text-gray-500 font-bold mb-1 uppercase">Điểm thưởng</div>
                   <div className="text-3xl font-black text-gray-900">+{answerResult.scoreAwarded}</div>
                </div>
                
                <div className="mt-8 text-lg font-bold text-gray-600">
                   Tổng điểm: <span className="text-violet-600">{answerResult.totalScore}</span>
                </div>
             </div>
          )}

          {gameState === "FINISHED" && (
             <div className="flex-1 flex flex-col">
                <h2 className="text-3xl font-900 text-center text-gray-900 mb-8 mt-4">Trò chơi kết thúc!</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="bg-violet-600 p-4 text-white font-bold text-lg text-center">
                      Bảng Xếp Hạng Chung Cuộc
                   </div>
                   <div className="divide-y divide-gray-100">
                      {leaderboard.map((player, idx) => (
                         <div key={player.playerId} className={`p-4 flex items-center justify-between ${idx === 0 ? 'bg-yellow-50/50' : ''}`}>
                            <div className="flex items-center gap-4">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  {idx + 1}
                               </div>
                               <div className="font-bold text-gray-900">{player.nickname}</div>
                            </div>
                            <div className="font-black text-violet-600">{player.totalScore} pts</div>
                         </div>
                      ))}
                   </div>
                </div>
                <div className="mt-8 flex justify-center">
                   <Button onClick={() => router.push("/")} variant="primary">Trở về Trang Chủ</Button>
                </div>
             </div>
          )}
       </main>

       {/* Q&A Floating Button */}
       {gameState !== "CONNECTING" && gameState !== "ERROR" && (
          <>
             <button
                onClick={() => setShowQA(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-violet-700 transition-colors z-40"
             >
                <MessageCircle size={24} />
                {questions.length > 0 && (
                   <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
                      {questions.length}
                   </span>
                )}
             </button>

             {showQA && (
                <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 animate-fade-in-up">
                   <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                         <MessageCircle size={20} className="text-violet-600" />
                         Hỏi Đáp
                      </h3>
                      <button onClick={() => setShowQA(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                         <X size={20} />
                      </button>
                   </div>

                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {questions.length === 0 ? (
                         <div className="text-center text-gray-400 mt-10">
                            Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!
                         </div>
                      ) : (
                         questions
                            .filter(q => !q.isResolved)
                            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.upvotes - a.upvotes)
                            .map(q => (
                            <div key={q.id} className={`bg-white p-4 rounded-xl shadow-sm border ${q.isPinned ? 'border-amber-300 bg-amber-50' : 'border-gray-100'}`}>
                               <div className="flex items-center justify-between mb-2">
                                  <div className="font-bold text-sm text-gray-900">{q.playerNickname}</div>
                                  {q.isPinned && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold">Ghim</span>}
                               </div>
                               <p className="text-gray-700 text-sm mb-3">{q.content}</p>
                               <button
                                  onClick={() => upvoteQuestion(q.id)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors border border-violet-100"
                               >
                                  <ThumbsUp size={14} /> {q.upvotes}
                               </button>
                            </div>
                         ))
                      )}
                   </div>

                   <div className="bg-white p-4 border-t border-gray-100">
                      <form
                         onSubmit={(e) => {
                            e.preventDefault();
                            if (!qaText.trim() || !roomInfo?.playerId) return;
                            askQuestion(roomInfo.playerId, qaText.trim());
                            setQaText("");
                         }}
                         className="flex gap-2"
                      >
                         <input
                            type="text"
                            value={qaText}
                            onChange={(e) => setQaText(e.target.value)}
                            placeholder="Nhập câu hỏi của bạn..."
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500 text-sm font-medium"
                         />
                         <Button type="submit" variant="primary" className="px-5">
                            <Send size={18} />
                         </Button>
                      </form>
                   </div>
                </div>
             )}
          </>
       )}
    </div>
  );
}
