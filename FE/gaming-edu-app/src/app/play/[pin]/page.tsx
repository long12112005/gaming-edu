"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import Cookies from "js-cookie";
import { Trophy, Check, X, Clock } from "lucide-react";
import Button from "@/components/ui/Button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type GameState = "CONNECTING" | "LOBBY" | "PLAYING" | "ANSWER_RESULT" | "LEADERBOARD" | "ENDED" | "ERROR";

export default function PlayerGameRoom() {
  const params = useParams();
  const router = useRouter();
  const pinCode = params.pin as string;
  
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [gameState, setGameState] = useState<GameState>("CONNECTING");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Data state
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState<any>(null);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initSignalR = async () => {
      const token = Cookies.get("token");
      const guestName = Cookies.get("guest_nickname");
      
      const newConnection = new HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/hubs/game`, {
          accessTokenFactory: () => token || "",
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect()
        .build();

      setConnection(newConnection);
    };
    initSignalR();
  }, []);

  useEffect(() => {
    if (!connection) return;

    connection.start()
      .then(() => {
        console.log("Connected to SignalR!");
        // Request to join room
        const nickname = Cookies.get("guest_nickname") || (Cookies.get("user") ? JSON.parse(Cookies.get("user")!).nickname : "Anonymous");
        connection.invoke("JoinRoom", { pinCode, nickname })
          .catch(err => {
             console.error("JoinRoom error:", err);
             setGameState("ERROR");
             setErrorMsg("Không thể tham gia phòng");
          });
      })
      .catch(e => {
         console.error("Connection failed: ", e);
         setGameState("ERROR");
         setErrorMsg("Mất kết nối tới máy chủ");
      });

    // EVENT LISTENERS
    connection.on("JoinedRoom", (data) => {
      setRoomInfo(data);
      setGameState("LOBBY");
    });

    connection.on("GameStarted", (data) => {
      setGameState("PLAYING");
    });

    connection.on("SlideStarted", (slide) => {
      setCurrentSlide(slide);
      setHasAnswered(false);
      setGameState("PLAYING");
      setTimeLeft(slide.timeLimit);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    connection.on("AnswerResult", (result) => {
      setAnswerResult(result);
      setGameState("ANSWER_RESULT");
    });

    connection.on("LeaderboardUpdated", (data) => {
      setLeaderboard(data);
    });

    connection.on("GameEnded", (data) => {
      setLeaderboard(data.leaderboard);
      setGameState("ENDED");
    });

    connection.on("Error", (err) => {
      setGameState("ERROR");
      setErrorMsg(err.message);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      connection.stop();
    };
  }, [connection, pinCode]);

  const submitAnswer = (optionId: string) => {
    if (!connection || hasAnswered || timeLeft === 0) return;
    setHasAnswered(true);
    connection.invoke("SubmitAnswer", {
      slideId: currentSlide.slideId,
      selectedOptionIds: [optionId],
      timeTakenMs: (currentSlide.timeLimit - timeLeft) * 1000
    });
  };

  const optionColors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];

  if (gameState === "CONNECTING") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-bold text-gray-500">Đang kết nối vào phòng {pinCode}...</div>;
  }

  if (gameState === "ERROR") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
         <X size={48} className="text-red-500 mb-4" />
         <h1 className="text-2xl font-bold text-gray-900 mb-2">Đã xảy ra lỗi</h1>
         <p className="text-gray-600 mb-6">{errorMsg}</p>
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
          {gameState === "LOBBY" && (
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
                   <div className="text-sm font-bold text-gray-500 uppercase">Câu {currentSlide.slideIndex + 1}</div>
                   <div className={`flex items-center gap-2 font-black text-2xl ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                      <Clock size={24} /> {timeLeft}s
                   </div>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-800 text-center text-gray-900 mb-10">
                   {currentSlide.questionText}
                </h3>

                {!hasAnswered && timeLeft > 0 ? (
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
                        {timeLeft > 0 ? "Đang đợi người khác trả lời..." : "Hết thời gian!"}
                     </div>
                  </div>
                )}
             </div>
          )}

          {gameState === "ANSWER_RESULT" && answerResult && (
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

          {gameState === "ENDED" && (
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
    </div>
  );
}
