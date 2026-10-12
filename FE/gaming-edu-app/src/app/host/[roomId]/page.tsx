"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Cookies from "js-cookie";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { RoomAPI, SlideAPI } from "@/lib/api";
import { Users, Lock, Unlock, ArrowRight, Download, Trophy, MessageSquare, Play, X, BarChart2 } from "lucide-react";
import confetti from "canvas-confetti";
import ReactWordcloud from "react-wordcloud";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export default function HostRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const router = useRouter();
  const { roomId } = use(params);
  
  const [room, setRoom] = useState<any>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(-1);
  const [players, setPlayers] = useState<any[]>([]);
  const [status, setStatus] = useState<"LOBBY" | "COUNTDOWN" | "PLAYING" | "PODIUM">("LOBBY");
  const [countdown, setCountdown] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [wordCloudData, setWordCloudData] = useState<any[]>([]);
  
  // Q&A State
  const [questionsQA, setQuestionsQA] = useState<any[]>([]);
  const [showQAPanel, setShowQAPanel] = useState(false);
  
  const [gameConnection, setGameConnection] = useState<any>(null);
  const [qaConnection, setQaConnection] = useState<any>(null);

  useEffect(() => {
    fetchRoomData();
    setupHubs();
    return () => {
      gameConnection?.stop();
      qaConnection?.stop();
    };
  }, [roomId]);

  const fetchRoomData = async () => {
    try {
      const res: any = await RoomAPI.getById(roomId);
      if (res.success) {
        setRoom(res.data);
        const sRes: any = await SlideAPI.getAllByQuiz(res.data.quizId);
        if (sRes.success) setSlides(sRes.data);
      }
    } catch (err) {
      console.error("Error fetching room:", err);
      alert("Lỗi tải phòng chơi.");
    }
  };

  const setupHubs = () => {
    const token = Cookies.get("token");
    if (!token) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    // Game Hub
    const gameHub = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/game`, { accessTokenFactory: () => token })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    gameHub.on("PlayerJoined", (player: any) => {
      setPlayers((prev: any[]) => {
        if (prev.find(p => p.id === player.id)) return prev;
        return [...prev, player];
      });
    });

    gameHub.on("PlayerKicked", (playerId: string) => {
      setPlayers((prev: any[]) => prev.filter(p => p.id !== playerId));
    });

    gameHub.on("RoomLocked", (isLocked: boolean) => {
      setRoom((prev: any) => ({ ...prev, isLocked }));
    });

    gameHub.on("CountdownStarted", (seconds) => {
      setStatus("COUNTDOWN");
      setCountdown(seconds);
      const iv = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(iv);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    });

    gameHub.on("SlideStarted", (slide) => {
      setStatus("PLAYING");
    });

    gameHub.on("AnswerAccepted", (playerId, score, totalScore) => {
      // In a real app, animate the player's bar
    });

    gameHub.on("LeaderboardUpdated", (data) => {
      setLeaderboard(data);
      // Generate Word Cloud data if applicable
      // This is a simplified mock for Word Cloud
      if (data.length > 0 && data[0].answers) {
         const words = data.map((d: any) => ({ text: d.answers[0]?.text || "Answer", value: Math.random() * 100 }));
         setWordCloudData(words);
      }
    });

    gameHub.on("GameEnded", () => {
      setStatus("PODIUM");
      confetti({
        particleCount: 150,
        spread: 180,
        origin: { y: 0.6 }
      });
    });

    gameHub.start()
      .then(() => {
        setGameConnection(gameHub);
        // Normally host calls CreateRoom via API, but we might want to register connection to room group.
      });

    // QA Hub
    const qaHub = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/qa`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    qaHub.on("LoadQuestions", (qs) => setQuestionsQA(qs));
    qaHub.on("QuestionAdded", (q: any) => setQuestionsQA((prev: any[]) => [...prev, q]));
    qaHub.on("QuestionUpvoted", ({ questionId, upvotes }: any) => {
      setQuestionsQA((prev: any[]) => prev.map(q => q.id === questionId ? { ...q, upvotes } : q));
    });
    qaHub.on("QuestionPinned", ({ questionId, isPinned }: any) => {
      setQuestionsQA((prev: any[]) => prev.map(q => {
        if (q.id === questionId) return { ...q, status: isPinned ? "PINNED" : "PENDING" };
        if (isPinned && q.status === "PINNED") return { ...q, status: "PENDING" }; // Only 1 pin allowed
        return q;
      }));
    });
    qaHub.on("QuestionHidden", (questionId: string) => {
      setQuestionsQA((prev: any[]) => prev.filter(q => q.id !== questionId));
    });
    qaHub.on("QuestionResolved", (questionId: string) => {
      setQuestionsQA((prev: any[]) => prev.map(q => q.id === questionId ? { ...q, status: "RESOLVED" } : q));
    });

    qaHub.start().then(() => {
      setQaConnection(qaHub);
      qaHub.invoke("JoinRoom", roomId);
    });
  };

  const handleStartGame = async () => {
    if (players.length === 0 && !confirm("Chưa có người chơi nào. Bạn vẫn muốn bắt đầu?")) return;
    try {
      await gameConnection.invoke("StartCountdown", roomId, 5);
      setTimeout(() => handleNextSlide(0), 5000);
    } catch (e) {
      alert("Lỗi kết nối Game Hub");
    }
  };

  const handleNextSlide = async (index: number) => {
    if (index >= slides.length) {
      await gameConnection.invoke("EndRoom", roomId);
      return;
    }
    const slide = slides[index];
    setCurrentSlideIndex(index);
    setStatus("PLAYING");
    try {
      await gameConnection.invoke("NextSlide", roomId, slide.id);
    } catch (e) {}
  };

  const handleLockRoom = async () => {
    try {
      await gameConnection.invoke("LockRoom", roomId, !room.isLocked);
    } catch (e) {}
  };

  const handleKickPlayer = async (playerId: string) => {
    try {
      await gameConnection.invoke("KickPlayer", roomId, playerId);
    } catch (e) {}
  };

  const exportReport = async () => {
    try {
      const res: any = await RoomAPI.exportReport(roomId);
      const url = window.URL.createObjectURL(new Blob([res]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Report_${roomId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Lỗi tải báo cáo Excel");
    }
  };

  if (!room) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden relative">
      
      {/* HEADER */}
      <header className="h-16 bg-gray-800/80 backdrop-blur border-b border-gray-700 flex items-center justify-between px-6 z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">{room.quiz?.title || "Phòng chơi"}</h1>
          <div className="bg-gray-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
            <Users className="w-4 h-4 mr-2" /> {players.length} Người chơi
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowQAPanel(!showQAPanel)} className="flex items-center text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-600">
            <MessageSquare className="w-5 h-5 mr-2" /> Q&A
          </button>
          
          {status === "PLAYING" && (
            <button 
              onClick={() => handleNextSlide(currentSlideIndex + 1)}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold flex items-center transition-colors"
            >
              Tiếp tục <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col items-center justify-center relative p-8">
        
        {status === "LOBBY" && (
          <div className="w-full max-w-4xl bg-gray-800 rounded-3xl shadow-2xl p-10 flex flex-col md:flex-row items-center border border-gray-700">
            <div className="flex-1 pr-10 border-r border-gray-700 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-400 mb-2">Tham gia tại <span className="text-white">play.gamingedu.com</span></h2>
              <div className="text-sm text-gray-500 mb-6">hoặc dùng ứng dụng quét mã QR</div>
              <div className="bg-white p-4 rounded-xl inline-block mb-6">
                <QRCodeSVG value={`https://play.gamingedu.com/?pin=${room.pinCode}`} size={200} />
              </div>
            </div>
            
            <div className="flex-1 pl-10 text-center">
              <h3 className="text-xl font-bold text-gray-400 mb-2">Mã PIN phòng</h3>
              <div className="text-7xl font-black text-white tracking-widest mb-10 font-mono">
                {room.pinCode}
              </div>
              
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={handleStartGame}
                  className="w-full bg-green-500 hover:bg-green-400 text-gray-900 py-4 rounded-xl font-black text-2xl transition-transform hover:scale-105 active:scale-95"
                >
                  BẮT ĐẦU
                </button>
                <button 
                  onClick={handleLockRoom}
                  className="flex justify-center items-center text-gray-400 hover:text-white"
                >
                  {room.isLocked ? <Lock className="w-5 h-5 mr-2" /> : <Unlock className="w-5 h-5 mr-2" />}
                  {room.isLocked ? "Mở khóa phòng" : "Khóa phòng"}
                </button>
              </div>
            </div>
          </div>
        )}

        {status === "LOBBY" && (
          <div className="absolute bottom-0 left-0 w-full p-8 h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-3 justify-center">
              {players.map(p => (
                <div key={p.id} onClick={() => handleKickPlayer(p.id)} className="bg-gray-800/80 backdrop-blur px-4 py-2 rounded-full font-bold text-lg cursor-pointer hover:bg-red-500/80 hover:line-through transition-all border border-gray-700 shadow-lg">
                  {p.nickname}
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "COUNTDOWN" && (
          <div className="text-9xl font-black text-white animate-pulse">
            {countdown > 0 ? countdown : "GO!"}
          </div>
        )}

        {status === "PLAYING" && currentSlide && (
          <div className="w-full max-w-6xl h-full flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 mt-10">
              {currentSlide.questionText}
            </h2>

            {currentSlide.type === "WORD_CLOUD" && wordCloudData.length > 0 && (
              <div className="w-full h-96 bg-white rounded-3xl p-4 overflow-hidden">
                 <ReactWordcloud words={wordCloudData} options={{ colors: ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899"], enableTooltip: false, fontSizes: [20, 80] }} />
              </div>
            )}

            {currentSlide.type === "QUIZ" && (
              <div className="w-full grid grid-cols-2 gap-6 flex-1 max-h-96">
                {JSON.parse(currentSlide.content || "{}").answers?.map((a: any, i: number) => {
                  const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
                  return (
                    <div key={i} className={`${colors[i]} rounded-3xl shadow-xl flex items-center justify-center p-8 transform transition-transform`}>
                      <span className="text-3xl font-bold">{a.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Realtime Leaderboard snippet in-between slides or side */}
            {leaderboard.length > 0 && currentSlide.type !== "WORD_CLOUD" && (
              <div className="absolute left-8 top-1/2 -translate-y-1/2 w-64 bg-gray-800/90 rounded-2xl p-4 border border-gray-700">
                <h3 className="font-bold text-lg mb-4 text-center border-b border-gray-600 pb-2">Top Người Chơi</h3>
                {leaderboard.slice(0, 5).map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center mb-3">
                    <span className="font-medium truncate mr-2">{idx + 1}. {entry.nickname}</span>
                    <span className="font-bold text-blue-400">{entry.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {status === "PODIUM" && (
          <div className="w-full max-w-4xl text-center z-20">
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 mb-12 drop-shadow-lg">
              BỤC VINH DANH
            </h2>
            <div className="flex justify-center items-end h-80 space-x-4 mb-12">
              {/* Top 2 */}
              {leaderboard[1] && (
                <div className="w-1/3 flex flex-col items-center">
                  <div className="text-2xl font-bold mb-2 truncate max-w-full">{leaderboard[1].nickname}</div>
                  <div className="text-xl text-gray-300 mb-4">{leaderboard[1].score} pts</div>
                  <div className="w-full h-48 bg-gradient-to-t from-gray-300 to-gray-400 rounded-t-lg shadow-2xl flex items-start justify-center pt-4">
                    <span className="text-4xl font-black text-gray-100">2</span>
                  </div>
                </div>
              )}
              {/* Top 1 */}
              {leaderboard[0] && (
                <div className="w-1/3 flex flex-col items-center">
                  <div className="text-3xl font-bold mb-2 truncate max-w-full text-yellow-400">{leaderboard[0].nickname}</div>
                  <div className="text-2xl text-yellow-200 mb-4">{leaderboard[0].score} pts</div>
                  <div className="w-full h-64 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded-t-lg shadow-2xl flex items-start justify-center pt-4">
                    <Trophy className="w-16 h-16 text-yellow-100 drop-shadow-md" />
                  </div>
                </div>
              )}
              {/* Top 3 */}
              {leaderboard[2] && (
                <div className="w-1/3 flex flex-col items-center">
                  <div className="text-2xl font-bold mb-2 truncate max-w-full">{leaderboard[2].nickname}</div>
                  <div className="text-xl text-gray-300 mb-4">{leaderboard[2].score} pts</div>
                  <div className="w-full h-32 bg-gradient-to-t from-amber-600 to-amber-700 rounded-t-lg shadow-2xl flex items-start justify-center pt-4">
                    <span className="text-4xl font-black text-amber-200">3</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Thống kê Biểu đồ (Recharts) */}
            <div className="w-full bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-12">
               <h3 className="text-xl font-bold mb-6 flex items-center justify-center text-gray-300">
                 <BarChart2 className="w-6 h-6 mr-2" />
                 Điểm số tổng quan
               </h3>
               <div className="h-64 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={leaderboard.slice(0, 5)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                     <XAxis dataKey="nickname" stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} />
                     <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} />
                     <Tooltip cursor={{fill: '#374151'}} contentStyle={{backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB'}} />
                     <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {leaderboard.slice(0, 5).map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 0 ? '#FBBF24' : index === 1 ? '#9CA3AF' : index === 2 ? '#D97706' : '#6366F1'} />
                        ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <button onClick={exportReport} className="inline-flex items-center bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105">
              <Download className="w-6 h-6 mr-3" /> TẢI BÁO CÁO EXCEL
            </button>
          </div>
        )}
      </main>

      {/* Q&A PANEL OVERLAY */}
      {showQAPanel && (
        <div className="absolute right-0 top-16 bottom-0 w-96 bg-white dark:bg-gray-800 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-50 flex flex-col border-l border-gray-700 transition-transform">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" /> Hỏi & Đáp
            </h3>
            <button onClick={() => setShowQAPanel(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {questionsQA.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">Chưa có câu hỏi nào.</div>
            ) : (
              questionsQA.sort((a,b) => b.upvotes - a.upvotes).map(q => (
                <div key={q.id} className={`p-3 rounded-xl border ${q.status === 'PINNED' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-200">{q.playerNickname || "Người chơi"}</span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full font-bold text-gray-700 dark:text-gray-300">{q.upvotes} Votes</span>
                  </div>
                  <p className="text-gray-800 dark:text-white text-sm mb-3">{q.content}</p>
                  <div className="flex space-x-2 border-t border-gray-200 dark:border-gray-600 pt-2">
                    <button 
                      onClick={() => qaConnection?.invoke("PinQuestion", q.id, q.status !== "PINNED")}
                      className={`text-xs font-bold px-2 py-1 rounded ${q.status === 'PINNED' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}
                    >
                      {q.status === 'PINNED' ? 'BỎ GHIM' : 'GHIM'}
                    </button>
                    <button 
                      onClick={() => qaConnection?.invoke("HideQuestion", q.id)}
                      className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    >
                      ẨN
                    </button>
                    <button 
                      onClick={() => qaConnection?.invoke("ResolveQuestion", q.id)}
                      className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      ĐÃ TRẢ LỜI
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
