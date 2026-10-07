import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";

const QA_HUB_URL = process.env.NEXT_PUBLIC_QA_HUB_URL || "http://localhost:5000/hubs/qa";

export interface QAQuestion {
  id: string;
  roomId: string;
  playerId: string;
  playerNickname: string;
  content: string;
  upvotes: number;
  isPinned: boolean;
  isResolved: boolean;
  createdAt: string;
}

export function useQAHub(roomId: string | null) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const token = Cookies.get("token");
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(QA_HUB_URL, {
        accessTokenFactory: () => token || "",
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = newConnection;

    newConnection.start()
      .then(() => {
        setError(null);
        newConnection.invoke("JoinRoom", roomId);
      })
      .catch((err) => {
        console.error("QA Hub Connection Error: ", err);
        setError("Không thể kết nối đến máy chủ Hỏi Đáp.");
      });

    // ── Events ──
    newConnection.on("LoadQuestions", (loadedQuestions: QAQuestion[]) => {
      setQuestions(loadedQuestions);
    });

    newConnection.on("QuestionAdded", (newQuestion: QAQuestion) => {
      setQuestions((prev) => [...prev, newQuestion]);
    });

    newConnection.on("QuestionUpvoted", (data: { questionId: string; upvotes: number }) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === data.questionId ? { ...q, upvotes: data.upvotes } : q))
      );
    });

    newConnection.on("QuestionPinned", (data: { questionId: string; isPinned: boolean }) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === data.questionId ? { ...q, isPinned: data.isPinned } : q))
      );
    });

    newConnection.on("QuestionHidden", (questionId: string) => {
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    });

    newConnection.on("QuestionResolved", (questionId: string) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, isResolved: true } : q))
      );
    });

    newConnection.on("QAError", (errMessage: string) => {
      setError(errMessage);
    });

    setConnection(newConnection);

    return () => {
      newConnection.stop();
    };
  }, [roomId]);

  // ── Actions ──
  const askQuestion = useCallback(async (playerId: string, content: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("AskQuestion", playerId, { content });
    }
  }, []);

  const upvoteQuestion = useCallback(async (questionId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("UpvoteQuestion", questionId);
    }
  }, []);

  const pinQuestion = useCallback(async (questionId: string, isPinned: boolean) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("PinQuestion", questionId, isPinned);
    }
  }, []);

  const hideQuestion = useCallback(async (questionId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("HideQuestion", questionId);
    }
  }, []);

  const resolveQuestion = useCallback(async (questionId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("ResolveQuestion", questionId);
    }
  }, []);

  return {
    questions,
    error,
    askQuestion,
    upvoteQuestion,
    pinQuestion,
    hideQuestion,
    resolveQuestion,
  };
}
