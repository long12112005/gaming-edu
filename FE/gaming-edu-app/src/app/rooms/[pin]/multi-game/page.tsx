"use client";

import { use, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import MultiGameArenaLayout, {
  QuestionSlideItem,
  DEFAULT_SOLO_SLIDES,
} from "@/components/arena/MultiGameArenaLayout";

function MultiGameContent({ pin }: { pin: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryGameType = searchParams.get("game");

  const [loading, setLoading] = useState(pin.toUpperCase() !== "SOLO");
  const [roomData, setRoomData] = useState<any>(null);
  const [slides, setSlides] = useState<QuestionSlideItem[]>(DEFAULT_SOLO_SLIDES);
  const [playerId, setPlayerId] = useState<string>("solo-player-1");
  const [nickname, setNickname] = useState<string>("Chiến Binh Tri Thức");
  const [isHost, setIsHost] = useState<boolean>(pin.toUpperCase() === "SOLO");

  useEffect(() => {
    let isMounted = true;

    async function initializeGameRoom() {
      try {
        if (pin.toUpperCase() !== "SOLO") {
          setLoading(true);
        }

        // 1. Lấy thông tin user hiện tại từ Cookie
        const userJson = Cookies.get("user");
        let currentUserId: string | null = null;
        let storedNickname =
          Cookies.get("nickname") || Cookies.get("guest_nickname") || "Chiến Binh Tri Thức";

        if (userJson) {
          try {
            const u = JSON.parse(userJson);
            if (u.id) currentUserId = u.id;
            if (u.nickname) storedNickname = u.nickname;
          } catch {}
        }

        if (isMounted) {
          setNickname(storedNickname);
        }

        // Nếu vào chế độ chơi thử 1 người (PIN = SOLO) -> vào thẳng không cần chờ API
        if (pin.toUpperCase() === "SOLO") {
          try {
            // Thử lấy bộ đề thật đầu tiên từ API nếu có để câu hỏi phong phú hơn
            const qRes = await api.get("/quizzes");
            const qList = qRes.data?.data || qRes.data;
            if (Array.isArray(qList) && qList.length > 0 && qList[0].id) {
              const detailRes = await api.get(`/quizzes/${qList[0].id}`);
              const detailData = detailRes.data?.data || detailRes.data;
              if (Array.isArray(detailData?.slides) && detailData.slides.length > 0) {
                if (isMounted) setSlides(detailData.slides);
              }
            }
          } catch {
            // Dùng DEFAULT_SOLO_SLIDES nếu offline
          }
          if (isMounted) setLoading(false);
          return;
        }

        let currentPlayerId =
          typeof window !== "undefined"
            ? localStorage.getItem(`multi_player_${pin}`) || ""
            : "";

        // 2. Tải thông tin phòng từ API
        const roomRes = await api.get(`/rooms/pin/${pin}`);
        const room = roomRes.data?.data || roomRes.data;

        if (room && isMounted) {
          setRoomData(room);
          const roomHostId = room.hostId || room.host_id;
          if (
            roomHostId &&
            currentUserId &&
            roomHostId.toLowerCase() === currentUserId.toLowerCase()
          ) {
            setIsHost(true);
          }
        }

        // 3. Tự động tham gia để lấy đúng playerId thuộc phòng hiện tại
        if (room) {
          const playersInRoom = Array.isArray(room.players) ? room.players : [];
          const matchedInRoom = currentPlayerId
            ? playersInRoom.find((p: any) => p.id === currentPlayerId)
            : null;

          if (!matchedInRoom) {
            try {
              const joinRes = await api.post("/rooms/join", {
                pinCode: pin,
                nickname: storedNickname,
                userId: currentUserId || null,
              });
              const joinedData = joinRes.data?.data || joinRes.data;
              if (joinedData?.player?.id) {
                currentPlayerId = joinedData.player.id;
                if (typeof window !== "undefined") {
                  localStorage.setItem(`multi_player_${pin}`, currentPlayerId);
                }
                Cookies.set("player_id", currentPlayerId);
                Cookies.set("nickname", storedNickname);
              }
            } catch (e) {
              console.warn("Lỗi auto join phòng:", e);
            }
          }
        }

        if (isMounted && currentPlayerId) {
          setPlayerId(currentPlayerId);
        }

        // 4. Tải danh sách Slide câu hỏi từ Quiz
        const quizId = room?.quizId || room?.quiz_id;
        if (quizId) {
          try {
            const quizRes = await api.get(`/quizzes/${quizId}`);
            const quizData = quizRes.data?.data || quizRes.data;
            if (quizData?.slides && Array.isArray(quizData.slides) && quizData.slides.length > 0) {
              if (isMounted) {
                setSlides(quizData.slides);
              }
            }
          } catch (e) {
            console.warn("Lỗi tải slides bộ đề:", e);
          }
        }
      } catch (err: any) {
        console.warn("Chuyển sang chế độ Solo dự phòng:", err?.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeGameRoom();

    return () => {
      isMounted = false;
    };
  }, [pin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-white">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
        <span className="text-sm font-bold text-slate-300">
          Đang khởi tạo đấu trường trò chơi...
        </span>
      </div>
    );
  }

  const effectiveGameType =
    queryGameType || roomData?.gameType || roomData?.gameModeTheme || "HEX_CONQUEST";

  return (
    <MultiGameArenaLayout
      pin={pin}
      playerId={playerId}
      nickname={nickname}
      isHost={isHost}
      gameType={effectiveGameType}
      roomData={roomData}
      slides={slides}
      onExit={() => router.push(isHost && pin.toUpperCase() !== "SOLO" ? "/dashboard" : "/")}
    />
  );
}

export default function MultiGamePage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const unwrappedParams = use(params);
  const pin = unwrappedParams.pin;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      }
    >
      <MultiGameContent pin={pin} />
    </Suspense>
  );
}
