import { useEffect, useState, useCallback } from 'react';
import { HubConnectionBuilder, LogLevel, HubConnection } from '@microsoft/signalr';
import Cookies from 'js-cookie';

export function useGameHub() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentSlide, setCurrentSlide] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [gameStatus, setGameStatus] = useState<"LOBBY" | "COUNTDOWN" | "PLAYING" | "RESULT" | "PODIUM">("LOBBY");
  const [error, setError] = useState<string | null>(null);
  
  // Specific for Player
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [scoreInfo, setScoreInfo] = useState({ score: 0, totalScore: 0 });
  const [resultState, setResultState] = useState<"NONE" | "CORRECT" | "INCORRECT">("NONE");
  const [myRank, setMyRank] = useState<number | null>(null);

  const connect = useCallback(async (pinCode?: string, nickname?: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const token = Cookies.get("token");

    const hub = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/game`, token ? { accessTokenFactory: () => token } : {})
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    hub.on("PlayerJoined", (player) => {
      setPlayers(prev => {
        if (prev.find(p => p.id === player.id)) return prev;
        return [...prev, player];
      });
      if (nickname && player.nickname === nickname) {
        setPlayerId(player.id);
        setRoomId(player.roomId);
        setGameStatus("LOBBY"); // For player, we might map LOBBY to WAITING in the component
      }
    });

    hub.on("PlayerKicked", (pId) => {
      setPlayers(prev => prev.filter(p => p.id !== pId));
    });

    hub.on("RoomLocked", (locked) => {
      setIsLocked(locked);
    });

    hub.on("CountdownStarted", (seconds) => {
      setGameStatus("COUNTDOWN");
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

    hub.on("SlideStarted", (slide) => {
      setCurrentSlide(slide);
      setResultState("NONE");
      setGameStatus("PLAYING");
    });

    hub.on("AnswerAccepted", (pId, score, totalScore) => {
      // If we are the player who answered
      setScoreInfo({ score, totalScore });
      setResultState(score > 0 ? "CORRECT" : "INCORRECT");
      setGameStatus("RESULT");
    });

    hub.on("LeaderboardUpdated", (data) => {
      setLeaderboard(data);
    });

    hub.on("GameEnded", () => {
      setGameStatus("PODIUM");
    });

    hub.on("Error", (msg) => {
      setError(msg);
      hub.stop();
    });

    try {
      await hub.start();
      setConnection(hub);
      if (pinCode && nickname) {
        await hub.invoke("JoinRoom", pinCode, nickname);
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ trò chơi.");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (connection) {
      connection.stop();
    }
  }, [connection]);

  return {
    connection,
    players,
    isLocked,
    countdown,
    currentSlide,
    leaderboard,
    gameStatus,
    error,
    playerId,
    roomId,
    scoreInfo,
    resultState,
    myRank,
    setGameStatus,
    setResultState,
    setMyRank,
    connect,
    disconnect
  };
}
