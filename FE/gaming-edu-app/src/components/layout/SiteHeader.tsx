"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { 
  LogIn, 
  LogOut, 
  User, 
  LayoutDashboard, 
  ChevronDown, 
  Sparkles,
  BookOpen,
  Users,
  Shield,
  Gamepad2,
  BarChart3,
  PlusCircle,
  Hash,
  Bell,
  Play,
  X,
  CheckCheck,
  Menu
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import CreateRoomModal from "@/components/modals/CreateRoomModal";
import { useNotificationHub } from "@/hooks/useNotificationHub";
import AvatarWithFrame from "@/components/common/AvatarWithFrame";

const NAV_ITEMS = [
  { label: "Trang Chủ", href: "/" },
  { label: "Thư Viện Đề", href: "/library" },
  { label: "Không Gian Nhóm", href: "/groups" },
  { label: "Tạo Đề Mới", href: "/quiz/create" },
  { label: "Báo Cáo", href: "/reports" },
];

/**
 * Thanh menu chính Gaming Edu phong cách Dual-Tone Modern Gamified SaaS
 * Kết hợp thông báo Realtime, AI Quota badge và Quản lý phòng thi đấu
 */
export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    activeInvite,
    markAllAsRead,
    dismissInvite,
  } = useNotificationHub();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loggedIn = mounted && (isAuthenticated || !!Cookies.get("token"));

  const handleLogout = () => {
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
    logout();
    Cookies.remove("token");
    Cookies.remove("user");
    router.push("/auth");
  };

  return (
    <>
      {/* ── Banner Mời Vào Phòng Thi Đấu Realtime ── */}
      {activeInvite && (
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white px-4 py-2.5 shadow-md relative z-50 animate-in fade-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 font-bold">
              <span className="text-xl">🎮</span>
              <span>
                Bạn được mời tham gia phòng thi đấu{" "}
                <span className="text-amber-300 font-extrabold">{activeInvite.quizTitle || "Gaming Edu"}</span>{" "}
                (PIN: <span className="font-mono bg-black/25 px-2 py-0.5 rounded-lg text-amber-200">{activeInvite.pinCode}</span>)!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  dismissInvite();
                  router.push(`/play/${activeInvite.pinCode}`);
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Play size={13} className="fill-current" /> Tham Gia Ngay
              </button>
              <button
                onClick={dismissInvite}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white/80"
                title="Bỏ qua"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 border-b ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-slate-200 shadow-sm"
            : "bg-white/80 backdrop-blur-sm border-slate-200/60"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 lg:gap-5 shrink-0">
            <Link href="/" className="flex items-center gap-2 group shrink-0 whitespace-nowrap">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Gamepad2 size={20} className="stroke-[2.5]" />
              </div>
              <span className="font-heading font-black text-lg sm:text-xl md:text-2xl tracking-tight text-slate-900 whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                <span className="whitespace-nowrap">Gaming</span>
                <span className="text-[#7C3AED] whitespace-nowrap">Edu</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 shrink-0">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href === "/library" && pathname.startsWith("/quizzes")) ||
                  (item.href === "/" && (pathname === "/" || pathname === "/home"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-2.5 xl:px-3.5 py-1.5 rounded-xl text-xs xl:text-sm font-semibold transition-all whitespace-nowrap shrink-0 inline-block ${
                      isActive
                        ? "bg-purple-50 text-purple-700 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    }`}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
              {loggedIn && (user?.isAdmin || (user as any)?.is_admin) && (
                <Link
                  href="/admin"
                  className={`px-2.5 xl:px-3 py-1.5 rounded-xl text-xs xl:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    pathname.startsWith("/admin")
                      ? "bg-purple-50 text-purple-700 font-bold"
                      : "text-slate-600 hover:text-purple-700 hover:bg-purple-50/50"
                  }`}
                >
                  <Shield size={14} className="shrink-0" />
                  <span className="whitespace-nowrap">Admin</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Right Action Hub theo chuẩn Ảnh 1 */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Nút Tạo Nhóm */}
            <Link
              href="/groups"
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-purple-400 text-purple-700 hover:bg-purple-50 font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span className="whitespace-nowrap">Tạo Nhóm</span>
            </Link>

            {/* Badge Lượt tạo AI: 10/10 */}
            <div 
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F59E0B] text-white text-xs font-bold shadow-sm shadow-amber-500/20 whitespace-nowrap shrink-0"
              title="Hạn mức sinh đề bằng AI hôm nay"
            >
              <Sparkles size={13} className="text-white animate-pulse shrink-0" />
              <span className="whitespace-nowrap">Lượt tạo AI: 10/10</span>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden shrink-0"
              title="Menu"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* User status */}
            {loggedIn ? (
              <div className="flex items-center gap-2.5">
                {/* Chuông thông báo Realtime */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      setNotifDropdownOpen((prev) => !prev);
                      if (!notifDropdownOpen) markAllAsRead();
                    }}
                    className="relative p-2 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Thông báo"
                    aria-label="Thông báo"
                  >
                    <Bell size={17} className="text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-sm animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown thông báo */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Bell size={14} className="text-indigo-600" /> Thông Báo
                        </span>
                        {notifications.length > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <CheckCheck size={13} />
                            Đã đọc tất cả
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-1">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-xs text-slate-400">
                            Chưa có thông báo mới nào.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className="px-4 py-3 hover:bg-slate-50/80 transition-colors flex flex-col gap-1 text-left"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="font-bold uppercase tracking-wider text-indigo-600">
                                  {n.type === "INVITE_ROOM" ? "🎮 Lời Mời Chơi" : "Hệ Thống"}
                                </span>
                                <span>{n.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {n.message}
                              </p>
                              {n.type === "INVITE_ROOM" && n.pinCode && (
                                <button
                                  onClick={() => {
                                    setNotifDropdownOpen(false);
                                    router.push(`/play/${n.pinCode}`);
                                  }}
                                  className="mt-1 self-start inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 rounded-lg text-[11px] shadow-xs transition-colors"
                                >
                                  <Play size={10} className="fill-current" /> Vào Phòng (PIN: {n.pinCode})
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown theo chuẩn Ảnh 1 */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 p-1 pr-2 rounded-2xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-black text-slate-800 leading-tight">
                        {user?.nickname || "Thành viên"}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        {(user as any)?.role === "TEACHER" ? "Giáo viên" : "Học sinh"}
                      </div>
                    </div>
                    <AvatarWithFrame
                      avatarUrl={user?.avatar_url || user?.avatarUrl}
                      frameId={user?.avatar_frame || user?.avatarFrame || "default"}
                      size="sm"
                      rounded="rounded-full"
                    />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {user?.nickname || "Thành viên"}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                      </div>

                      <div className="p-1 space-y-0.5">
                        <Link
                          href="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <User size={15} className="text-slate-400" />
                          <span>Hồ sơ cá nhân</span>
                        </Link>
                        <Link
                          href="/groups"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Users size={15} className="text-slate-400" />
                          <span>Không gian nhóm</span>
                        </Link>
                        <Link
                          href="/library"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <BookOpen size={15} className="text-slate-400" />
                          <span>Kho đề của tôi</span>
                        </Link>
                        <Link
                          href="/reports"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <BarChart3 size={15} className="text-slate-400" />
                          <span>Lịch sử báo cáo</span>
                        </Link>
                        {(user?.isAdmin || (user as any)?.is_admin) && (
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                          >
                            <Shield size={15} className="text-purple-500" />
                            <span>Quản trị hệ thống</span>
                          </Link>
                        )}
                      </div>

                      <div className="p-1 border-t border-slate-100">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut size={15} />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/auth"
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-600/20 active:translate-y-0.5 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <LogIn size={14} className="shrink-0" />
                  <span className="whitespace-nowrap">Đăng Nhập</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-lg space-y-1 animate-in fade-in slide-in-from-top-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  pathname === item.href
                    ? "bg-purple-50 text-purple-700 font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {loggedIn && (user?.isAdmin || (user as any)?.is_admin) && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2 rounded-xl text-sm font-semibold text-purple-700 hover:bg-purple-50"
              >
                Quản trị Admin
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Modal Tạo Phòng */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
      />
    </>
  );
}
