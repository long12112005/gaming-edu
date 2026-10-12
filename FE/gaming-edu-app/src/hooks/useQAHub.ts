import { useEffect, useState, useCallback } from 'react';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import Cookies from 'js-cookie';

export function useQAHub() {
  const [qaConnection, setQaConnection] = useState<HubConnection | null>(null);
  const [questionsQA, setQuestionsQA] = useState<any[]>([]);

  const connectQA = useCallback(async (roomId?: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const token = Cookies.get("token");

    const qHub = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/qa`, token ? { accessTokenFactory: () => token } : {})
      .withAutomaticReconnect()
      .build();

    qHub.on("LoadQuestions", (qs) => setQuestionsQA(qs));
    qHub.on("QuestionAdded", (q) => setQuestionsQA(prev => [...prev, q]));
    qHub.on("QuestionUpvoted", ({ questionId, upvotes }) => {
      setQuestionsQA(prev => prev.map(q => q.id === questionId ? { ...q, upvotes } : q));
    });
    qHub.on("QuestionPinned", ({ questionId, isPinned }) => {
      setQuestionsQA(prev => prev.map(q => {
        if (q.id === questionId) return { ...q, status: isPinned ? "PINNED" : "PENDING" };
        if (isPinned && q.status === "PINNED") return { ...q, status: "PENDING" };
        return q;
      }));
    });
    qHub.on("QuestionHidden", (questionId) => {
      setQuestionsQA(prev => prev.filter(q => q.id !== questionId));
    });
    qHub.on("QuestionResolved", (questionId) => {
      setQuestionsQA(prev => prev.map(q => q.id === questionId ? { ...q, status: "RESOLVED" } : q));
    });

    try {
      await qHub.start();
      setQaConnection(qHub);
      if (roomId) {
        await qHub.invoke("JoinRoom", roomId);
      }
    } catch (err) {
      console.error("QA Hub connection error", err);
    }
  }, []);

  const disconnectQA = useCallback(() => {
    if (qaConnection) {
      qaConnection.stop();
    }
  }, [qaConnection]);

  return {
    qaConnection,
    questionsQA,
    connectQA,
    disconnectQA
  };
}
