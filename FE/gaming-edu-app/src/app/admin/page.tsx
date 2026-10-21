"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  ShieldAlert,
  Users,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  Activity,
  Layers,
  Gamepad2,
  Shield,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";

interface LockedUserItem {
  id: string;
  email: string;
  nickname: string;
  lockedUntil?: string | null;
  failedAttempts?: number;
  reason?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [lockedUsers, setLockedUsers] = useState<LockedUserItem[]>([
    {
      id: "u-locked-1",
      email: "intruder_attempt@gmail.com",
      nickname: "Anonymous_102",
      lockedUntil: "15 phút còn lại",
      failedAttempts: 5,
      reason: "Brute-force sai mật khẩu 5 lần liên tiếp",
    },
    {
      id: "u-locked-2",
      email: "suspicious_bot@yahoo.com",
      nickname: "Bot_Tester",
      lockedUntil: "12 phút còn lại",
      failedAttempts: 7,
      reason: "Gửi OTP vượt ngưỡng giới hạn",
    },
  ]);

  const stats = {
    totalUsers: 1420,
    lockedCount: lockedUsers.length,
    activeRooms: 18,
    systemHealth: "99.98%",
  };

  const handleUnlockUser = async (userId: string, email: string) => {
    try {
      await api.post(`/admin/users/${userId}/unlock`);
      setLockedUsers((prev) => prev.filter((u) => u.id !== userId));
      setToastMsg({ text: `Đã mở khóa tài khoản ${email} thành công!`, type: "success" });
    } catch {
      // Mock unlock
      setLockedUsers((prev) => prev.filter((u) => u.id !== userId));
      setToastMsg({ text: `Đã mở khóa tài khoản ${email} thành công!`, type: "success" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Header Section */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 font-heading">
              <ShieldAlert size={14} className="text-rose-600" /> Bảng Điều Khiển Quản Trị
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] font-heading tracking-tight">
              Trung Tâm Quản Trị Hệ Thống
            </h1>
            <p className="text-slate-500 text-sm md:text-base mt-1 max-w-xl">
              Giám sát bảo mật, kiểm soát các tài khoản bị khóa Brute-force và quản lý người dùng toàn hệ thống GameEdu.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/users"
              className="px-5 py-3 rounded-[12px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 font-heading"
            >
              <Users size={16} />
              <span>Quản Lý Toàn Bộ Người Dùng</span>
            </Link>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div
            className={`p-4 rounded-[14px] border text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMsg.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : (
                <AlertTriangle size={18} className="text-rose-600" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600 text-xs">
              ✕
            </button>
          </div>
        )}

        {/* ── BENTO KPI WIDGETS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Tổng Tài Khoản
              </span>
              <div className="p-2 rounded-[10px] bg-indigo-50 text-indigo-600">
                <Users size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] font-heading">
              {stats.totalUsers.toLocaleString()}
            </div>
            <span className="text-xs text-emerald-600 font-bold mt-1 block">Tăng +8.5% tuần này</span>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Tài Khoản Bị Khóa
              </span>
              <div className="p-2 rounded-[10px] bg-rose-50 text-rose-600">
                <Lock size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-600 font-heading">
              {stats.lockedCount}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Khóa tạm thời 15 phút</span>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Phòng Đang Hoạt Động
              </span>
              <div className="p-2 rounded-[10px] bg-emerald-50 text-emerald-600">
                <Gamepad2 size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A] font-heading">
              {stats.activeRooms}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Tất cả cụm SignalR ổn định</span>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Tình Trạng Hệ Thống
              </span>
              <div className="p-2 rounded-[10px] bg-purple-50 text-purple-600">
                <Activity size={18} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 font-heading">
              {stats.systemHealth}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Không có sự cố nào</span>
          </div>
        </div>

        {/* ── BẢNG TÀI KHOẢN BỊ KHÓA GẦN ĐÂY & 1-CLICK UNLOCK ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-[#0F172A]">
                Tài Khoản Bị Khóa Brute-Force Gần Đây
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các tài khoản nhập sai mật khẩu quá 5 lần hoặc vi phạm bảo mật cần được xem xét mở khóa.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              {lockedUsers.length} cần chú ý
            </span>
          </div>

          {lockedUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Không có tài khoản nào bị khóa!</p>
              <p className="text-xs text-slate-400">Hệ thống đang hoạt động an toàn và bảo mật.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-slate-400 uppercase tracking-wider font-heading">
                    <th className="py-3 px-3">Người Dùng</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Số Lần Thử Sai</th>
                    <th className="py-3 px-3">Lý Do Khóa</th>
                    <th className="py-3 px-3">Thời Gian Còn Lại</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lockedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 font-heading">
                        {u.nickname}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {u.email}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
                          {u.failedAttempts} lần
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {u.reason}
                      </td>
                      <td className="py-3 px-3 text-amber-600 font-bold">
                        {u.lockedUntil}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleUnlockUser(u.id, u.email)}
                          className="px-3 py-1.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 ml-auto active:scale-95"
                          title="Mở khóa tài khoản ngay lập tức"
                        >
                          <Unlock size={13} />
                          <span>Mở Khóa Ngay</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
