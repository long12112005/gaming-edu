"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  Gamepad2,
  Search,
  Filter,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Play,
  Users,
  Clock,
  Radio,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";
import AdminNavHeader from "@/components/admin/AdminNavHeader";

interface AdminRoomItem {
  id: string;
  pinCode: string;
  pin?: string;
  title?: string;
  quizTitle?: string;
  mode: string;
  status: string;
  hostNickname?: string;
  playersCount?: number;
  createdAt: string;
}

export default function AdminRoomsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isAdminUser, setIsAdminUser] = useState(false);

  const [rooms, setRooms] = useState<AdminRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");

  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 1. Kiểm tra quyền Admin
  useEffect(() => {
    const token = Cookies.get("token");
    const hasAdminRole = !!(user?.isAdmin || (user as any)?.is_admin);
    setIsAdminUser(!!token && hasAdminRole);
  }, [user, isAuthenticated]);

  // 2. Tải danh sách phòng thi đấu
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      // Gọi API lịch sử / danh sách phòng
      const res = await api.get("/rooms/history/hosted");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setRooms(list);
      } else {
        setRooms([]);
      }
    } catch (err: unknown) {
      console.warn("Lỗi khi tải danh sách phòng chơi cho admin:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Lọc phòng chơi
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const pin = r.pinCode || r.pin || "";
      const title = r.title || r.quizTitle || "";
      const matchSearch =
        searchQuery.trim() === "" ||
        pin.includes(searchQuery.trim()) ||
        title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchMode =
        modeFilter === "ALL" ||
        r.mode.toUpperCase() === modeFilter.toUpperCase();

      return matchSearch && matchMode;
    });
  }, [rooms, searchQuery, modeFilter]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-6">
        {!isAdminUser && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-600 shrink-0" />
              <span>
                Chế độ xem trước giao diện Quản Trị (Admin Preview Mode). Hãy đăng nhập tài khoản có quyền Quản trị viên để thực hiện các thao tác quản lý phòng thi.
              </span>
            </div>
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap shadow-xs transition-colors shrink-0"
            >
              Đăng Nhập Admin
            </Link>
          </div>
        )}

        {/* Navigation & Header */}
        <AdminNavHeader
          title="Giám Sát Phòng Chơi Trực Tiếp"
          subtitle="Theo dõi các phiên thi đấu đang diễn ra trên hệ thống, kiểm soát kết nối phòng thi và số lượng thí sinh tham gia thời gian thực."
          badge="Giám Sát Hạ Tầng"
        />

        {/* Toast thông báo */}
        {toastMsg && (
          <div
            className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="text-rose-600" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── BỘ LỌC & TÌM KIẾM ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã PIN phòng hoặc tên bộ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Chế độ: Tất cả</option>
              <option value="HOST_PACED">Phòng Thường</option>
              <option value="ASYNC_TOURNAMENT">Phòng Giải Đấu</option>
            </select>

            <button
              onClick={fetchRooms}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── BẢNG DANH SÁCH PHÒNG CHƠI ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-14 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw size={32} className="animate-spin mb-3 text-indigo-600" />
              <p className="font-bold text-sm">Đang tải danh sách phòng chơi...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-14 text-center text-slate-400">
              <Gamepad2 size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-base text-slate-700">Hiện tại chưa có phòng thi nào đang hoạt động!</p>
              <p className="text-xs text-slate-400 mt-1">Các phiên thi đấu mới sẽ xuất hiện tại đây khi Host mở phòng.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-slate-400 font-heading font-bold">
                    <th className="py-4 px-6">Mã PIN Phòng</th>
                    <th className="py-4 px-6">Bộ Đề</th>
                    <th className="py-4 px-6">Chế Độ Chơi</th>
                    <th className="py-4 px-6">Trạng Thái</th>
                    <th className="py-4 px-6">Thời Gian Tạo</th>
                    <th className="py-4 px-6 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRooms.map((room) => {
                    const pin = room.pinCode || room.pin || "000000";
                    return (
                      <tr key={room.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-mono font-black text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg text-sm">
                            {pin}
                          </span>
                        </td>

                        <td className="py-4 px-6 font-heading font-black text-slate-900 text-sm">
                          {room.title || room.quizTitle || "Bộ đề thi"}
                        </td>

                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                            {room.mode === "HOST_PACED" && "Phòng Thường"}
                            {room.mode === "PLAYER_PACED" && "Phòng Thường (Cũ)"}
                            {room.mode === "ASYNC_TOURNAMENT" && "Phòng Giải Đấu"}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                            <Radio size={10} className="animate-pulse text-emerald-500" />
                            Đang Mở
                          </span>
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                          {room.createdAt ? new Date(room.createdAt).toLocaleString("vi-VN") : "Vừa xong"}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/reports/${pin}`}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
                              title="Xem báo cáo chi tiết phòng"
                            >
                              <Eye size={13} />
                              <span>Báo Cáo</span>
                            </Link>

                            <Link
                              href={`/play/${pin}`}
                              target="_blank"
                              className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-colors"
                              title="Mở màn hình tham gia"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
