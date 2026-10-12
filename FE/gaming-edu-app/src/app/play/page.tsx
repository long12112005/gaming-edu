"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { AnswerAPI } from "@/lib/api";
import { Check, X, Send, Trophy, AlertTriangle, MessageSquare } from "lucide-react";
import Cookies from "js-cookie";

export default function PlayerApp() {
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") || "";
  
  const [pinCode, setPinCode] = useState(initialPin);
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"LOGIN" | "WAITING" | "PLAYING" | "RESULT" | "PODIUM">("LOGIN");
  const [error, setError] = useState("");
  
  const [connection, setConnection] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  // Game State
  const [answerData, setAnswerData] = useState<any>(null);
  const [resultState, setResultState] = useState<"NONE" | "CORRECT" | "INCORRECT">("NONE");
  const [scoreInfo, setScoreInfo] = useState({ score: 0, totalScore: 0 });
  const [myRank, setMyRank] = useState<number | null>(null);

  // Q&A State
  const [qaConnection, setQaConnection] = useState<any>(null);
  const [questionsQA, setQuestionsQA] = useState<any[]>([]);
  const [showQAPanel, setShowQAPanel] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");

  // Auto-save ref
  const answerRef = useRef<any>(null);
  
  useEffect(() => {
    answerRef.current = answerData;
  }, [answerData]);

  // Draft Auto-save interval (every 15s)
  useEffect(() => {
    if (status !== "PLAYING" || !roomId || !playerId || !currentSlide) return;
    const interval = setInterval(() => {
      if (answerRef.current !== null) {
        AnswerAPI.saveDraft({
          roomPlayerId: playerId,
          slideId: currentSlide.id,
          answerData: JSON.stringify(answerRef.current)
        }).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [status, roomId, playerId, currentSlide]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode || !nickname) return;
    setError("");

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const token = Cookies.get("token");
    
    // We pass token if available (for logged-in users), otherwise null
    const hub = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/game`, token ? { accessTokenFactory: () => token } : {})
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    hub.on("PlayerJoined", (player) => {
      if (player.nickname === nickname) {
        setPlayerId(player.id);
        setRoomId(player.roomId);
        setStatus("WAITING");
      }
    });

    hub.on("SlideStarted", (slide) => {
      setCurrentSlide(slide);
      setAnswerData(null);
      setResultState("NONE");
      setStatus("PLAYING");
    });

    hub.on("AnswerAccepted", (pId, score, totalScore) => {
      if (pId === playerId) {
        setScoreInfo({ score, totalScore });
        setResultState(score > 0 ? "CORRECT" : "INCORRECT");
        setStatus("RESULT");
        
        // Hide result after 4 seconds and go back to waiting (unless Host ended)
        setTimeout(() => {
          setStatus("WAITING");
          setResultState("NONE");
        }, 4000);
      }
    });

    hub.on("LeaderboardUpdated", (board) => {
      const idx = board.findIndex((b: any) => b.playerId === playerId);
      if (idx !== -1) setMyRank(idx + 1);
    });

    hub.on("GameEnded", () => {
      setStatus("PODIUM");
    });

    hub.on("Error", (msg) => {
      setError(msg);
      hub.stop();
    });

    try {
      await hub.start();
      setConnection(hub);
      await hub.invoke("JoinRoom", pinCode, nickname);

      // Connect to QA Hub
      const qHub = new HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/qa`, token ? { accessTokenFactory: () => token } : {})
        .withAutomaticReconnect()
        .build();

      qHub.on("LoadQuestions", (qs) => setQuestionsQA(qs));
      qHub.on("QuestionAdded", (q: any) => setQuestionsQA((prev: any[]) => [...prev, q]));
      qHub.on("QuestionUpvoted", ({ questionId, upvotes }: any) => {
        setQuestionsQA((prev: any[]) => prev.map(q => q.id === questionId ? { ...q, upvotes } : q));
      });
      qHub.on("QuestionPinned", ({ questionId, isPinned }: any) => {
        setQuestionsQA((prev: any[]) => prev.map(q => {
          if (q.id === questionId) return { ...q, status: isPinned ? "PINNED" : "PENDING" };
          if (isPinned && q.status === "PINNED") return { ...q, status: "PENDING" };
          return q;
        }));
      });
      qHub.on("QuestionHidden", (questionId: string) => {
        setQuestionsQA((prev: any[]) => prev.filter(q => q.id !== questionId));
      });
      qHub.on("QuestionResolved", (questionId: string) => {
        setQuestionsQA((prev: any[]) => prev.map(q => q.id === questionId ? { ...q, status: "RESOLVED" } : q));
      });

      await qHub.start();
      setQaConnection(qHub);
      
      // We don't have roomId yet synchronously, but hub.on("PlayerJoined") sets it.
      // We will handle qHub.invoke("JoinRoom") in an effect.
    } catch (err) {
      setError("Không thể kết nối đến máy chủ trò chơi.");
    }
  };

  useEffect(() => {
    if (roomId && qaConnection && qaConnection.state === "Connected") {
      qaConnection.invoke("JoinRoom", roomId);
    }
  }, [roomId, qaConnection]);

  const submitAnswer = async (payload: any) => {
    if (!connection || !currentSlide) return;
    setAnswerData(payload); // local visual sync
    try {
      await connection.invoke("SubmitAnswer", roomId, currentSlide.id, JSON.stringify(payload));
      setStatus("WAITING"); // wait for AnswerAccepted
    } catch (err) {
      alert("Lỗi gửi câu trả lời!");
    }
  };

  const getBgColor = () => {
    if (resultState === "CORRECT") return "bg-green-500";
    if (resultState === "INCORRECT") return "bg-red-500";
    return "bg-gray-100 dark:bg-gray-900";
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${getBgColor()}`}>
      
      {/* 1. SẢNH NHẬP PIN */}
      {status === "LOGIN" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center transform rotate-12">
              <span className="text-white font-black text-4xl -rotate-12">GE</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">GAMING EDU</h1>
            
            <form onSubmit={handleJoin} className="space-y-4">
              <input 
                type="text" 
                placeholder="Mã PIN Phòng" 
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                className="w-full text-center text-2xl font-black tracking-widest p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-0 uppercase"
                required
              />
              <input 
                type="text" 
                placeholder="Nickname" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full text-center text-xl font-bold p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-0"
                required
              />
              
              {error && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center justify-center"><AlertTriangle className="w-4 h-4 mr-2" />{error}</div>}
              
              <button type="submit" className="w-full bg-gray-900 dark:bg-indigo-600 text-white font-black text-xl py-4 rounded-xl hover:bg-black dark:hover:bg-indigo-500 transition-transform active:scale-95 shadow-lg">
                VÀO PHÒNG
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. CHỜ HOST HOẶC KẾT QUẢ */}
      {(status === "WAITING" || status === "RESULT") && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-900 dark:text-white">
          {status === "RESULT" ? (
            <div className="animate-bounce">
              {resultState === "CORRECT" ? (
                <>
                  <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                    <Check className="w-20 h-20 text-white" />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-2">CHÍNH XÁC!</h2>
                  <p className="text-2xl font-bold text-white/90">+{scoreInfo.score} điểm</p>
                </>
              ) : (
                <>
                  <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                    <X className="w-20 h-20 text-white" />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-2">SAI RỒI!</h2>
                  <p className="text-xl font-bold text-white/80">Cố gắng ở câu sau nhé</p>
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-8"></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Bạn đã vào phòng!</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Hãy nhìn lên màn hình chính để chờ câu hỏi...</p>
            </div>
          )}
          
          <div className="absolute bottom-8 left-0 w-full flex justify-between px-8">
            <div className="font-bold text-lg bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm dark:text-white">{nickname}</div>
            <div className="font-bold text-lg bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm dark:text-white">Điểm: {scoreInfo.totalScore}</div>
          </div>
        </div>
      )}

      {/* 3. ĐANG CHƠI */}
      {status === "PLAYING" && currentSlide && (
        <div className="flex-1 flex flex-col p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center mb-6">
            <div className="font-bold text-gray-800 dark:text-gray-200">{myRank ? `Hạng: ${myRank}` : ""}</div>
            <div className="font-bold text-gray-800 dark:text-gray-200">Điểm: {scoreInfo.totalScore}</div>
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold text-center text-gray-900 dark:text-white mb-8 px-4">
            {currentSlide.type === "QUIZ" ? "Chọn một đáp án" : "Nhập câu trả lời của bạn"}
          </h2>

          <div className="flex-1 flex items-center justify-center w-full max-w-lg mx-auto">
            {/* LOẠI 1: QUIZ (4 Nút bấm) */}
            {currentSlide.type === "QUIZ" && (
              <div className="grid grid-cols-2 gap-4 w-full h-full max-h-96">
                {["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"].map((color, i) => (
                  <button 
                    key={i} 
                    onClick={() => submitAnswer({ choiceIndex: i })}
                    className={`${color} rounded-2xl shadow-lg active:scale-95 transition-transform hover:opacity-90`}
                  ></button>
                ))}
              </div>
            )}

            {/* LOẠI 2: FILL IN BLANK hoặc WORD CLOUD */}
            {(currentSlide.type === "FILL_IN_BLANK" || currentSlide.type === "WORD_CLOUD") && (
              <div className="w-full flex flex-col space-y-4">
                <input 
                  type="text" 
                  placeholder="Nhập từ khóa..."
                  value={answerData?.text || ""}
                  onChange={(e) => setAnswerData({ text: e.target.value })}
                  className="w-full text-center text-3xl font-bold p-6 rounded-2xl border-4 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-indigo-500 focus:ring-0 dark:text-white"
                />
                <button 
                  onClick={() => submitAnswer(answerData)}
                  className="w-full bg-indigo-600 text-white font-bold text-2xl py-6 rounded-2xl hover:bg-indigo-500 active:scale-95 transition-transform flex items-center justify-center"
                >
                  <Send className="w-8 h-8 mr-2" /> GỬI TRẢ LỜI
                </button>
              </div>
            )}

            {/* LOẠI 3: MATCHING */}
            {currentSlide.type === "MATCHING" && (
              <div className="w-full flex flex-col space-y-4">
                <div className="text-center text-gray-500 dark:text-gray-400 mb-4 text-sm font-bold">
                  (Phiên bản đơn giản: Vui lòng xem trên màn hình máy chiếu)
                </div>
                {/* Simplified for now: just a "Done" button or specific UI */}
                <button 
                  onClick={() => submitAnswer({ completed: true })}
                  className="w-full bg-indigo-600 text-white font-bold text-2xl py-6 rounded-2xl hover:bg-indigo-500 active:scale-95 transition-transform flex items-center justify-center"
                >
                  <Check className="w-8 h-8 mr-2" /> ĐÃ XONG
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. BỤC VINH DANH */}
      {status === "PODIUM" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-900 text-white">
          <Trophy className="w-32 h-32 text-yellow-400 mb-6 drop-shadow-2xl" />
          <h2 className="text-3xl font-black mb-2">TRÒ CHƠI KẾT THÚC!</h2>
          <p className="text-xl text-gray-300 mb-8">Thứ hạng của bạn: <strong className="text-yellow-400 text-3xl ml-2">#{myRank || "-"}</strong></p>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl w-full max-w-sm">
            <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Tổng điểm</div>
            <div className="text-4xl font-black text-white">{scoreInfo.totalScore}</div>
          </div>
        </div>
      )}

      {/* Nút Q&A Nổi */}
      {status !== "LOGIN" && (
        <>
          <button 
            onClick={() => setShowQAPanel(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40"
          >
            <MessageSquare className="w-6 h-6" />
          </button>

          {/* Q&A Panel overlay (Mobile style) */}
          {showQAPanel && (
            <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end">
              <div className="bg-white dark:bg-gray-900 w-full h-3/4 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" /> Hỏi & Đáp
                  </h3>
                  <button onClick={() => setShowQAPanel(false)} className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 dark:bg-gray-900">
                  {questionsQA.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-10">Bạn có thắc mắc gì không? Đặt câu hỏi ngay!</div>
                  ) : (
                    questionsQA.sort((a,b) => b.upvotes - a.upvotes).map(q => (
                      <div key={q.id} className={`p-4 rounded-2xl shadow-sm border ${q.status === 'PINNED' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                        {q.status === 'PINNED' && <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center"><MessageSquare className="w-3 h-3 mr-1" /> GHIM BỞI HOST</div>}
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{q.playerNickname || "Bạn"}</span>
                          <button 
                            onClick={() => qaConnection?.invoke("UpvoteQuestion", q.id)}
                            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center"
                          >
                            +1 VOTE ({q.upvotes})
                          </button>
                        </div>
                        <p className={`text-sm ${q.status === 'RESOLVED' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{q.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    <input 
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Nhập câu hỏi của bạn..."
                      className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-xl px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newQuestionText.trim()) {
                          qaConnection?.invoke("AskQuestion", roomId, playerId, nickname, newQuestionText.trim());
                          setNewQuestionText("");
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if(newQuestionText.trim()) {
                          qaConnection?.invoke("AskQuestion", roomId, playerId, nickname, newQuestionText.trim());
                          setNewQuestionText("");
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
