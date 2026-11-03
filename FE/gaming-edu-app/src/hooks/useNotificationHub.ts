import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";

const NOTIF_HUB_URL = process.env.NEXT_PUBLIC_NOTIF_HUB_URL || "http://localhost:5000/hubs/notifications";

export interface AppNotification {
  id: string;
  type: "INVITE_ROOM" | "GROUP_APPROVED" | "JOIN_REQUEST" | "SYSTEM" | string;
  message: string;
  roomId?: string;
  pinCode?: string;
  quizTitle?: string;
  groupId?: string;
  groupName?: string;
  timestamp: string;
}

export function useNotificationHub() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeInvite, setActiveInvite] = useState<AppNotification | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    let isCancelled = false;
    let startPromise: Promise<void> | null = null;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(NOTIF_HUB_URL, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    connectionRef.current = connection;

    const startTimer = setTimeout(() => {
      if (isCancelled) return;
      startPromise = connection.start();
      startPromise.catch((err) => {
        const msg = String(err?.message || err || "");
        if (
          isCancelled ||
          err?.name === "AbortError" ||
          msg.includes("stopped during negotiation") ||
          msg.includes("stopped before the invocation")
        ) {
          return;
        }
        console.warn("Notification Hub Connection Warning (silent):", err);
      });
    }, 0);

    connection.on("NotificationReceived", (payload: any) => {
      const newNotif: AppNotification = {
        id: Math.random().toString(36).substring(2, 9),
        type: payload.type || payload.Type || "SYSTEM",
        message: payload.message || payload.Message || "Bạn có thông báo mới.",
        roomId: payload.roomId || payload.RoomId,
        pinCode: payload.pinCode || payload.PinCode,
        quizTitle: payload.quizTitle || payload.QuizTitle,
        groupId: payload.groupId || payload.GroupId,
        groupName: payload.groupName || payload.GroupName,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
      setUnreadCount((prev) => prev + 1);

      // Nếu là lời mời vào phòng thi đấu, bật banner/toast tương tác
      if (newNotif.type === "INVITE_ROOM" && newNotif.pinCode) {
        setActiveInvite(newNotif);
      }
    });

    return () => {
      isCancelled = true;
      clearTimeout(startTimer);
      if (startPromise) {
        startPromise
          .then(() => connection.stop().catch(() => {}))
          .catch(() => {});
      } else if (connection.state !== signalR.HubConnectionState.Disconnected) {
        connection.stop().catch(() => {});
      }
    };
  }, []);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const dismissInvite = () => {
    setActiveInvite(null);
  };

  return {
    notifications,
    unreadCount,
    activeInvite,
    markAllAsRead,
    dismissInvite,
  };
}
