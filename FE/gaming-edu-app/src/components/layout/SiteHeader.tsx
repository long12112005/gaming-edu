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
  Sparkles 
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const NAV_ITEMS = [
  { label: "Trang Chủ", href: "/" },
  { label: "Khám Phá", href: "/explore" },
  { label: "Tạo Đề", href: "/quiz/create" },
  { label: "Báo Cáo", href: "/reports" },
];

/**
 * Thanh menu chính Gaming Edu tinh gọn
 * 1. Menu giữa: Đúng 4 mục (Trang Chủ, Khám Phá, Tạo Đề, Báo Cáo)
 * 2. Bên phải:
 *    - Đã đăng nhập: Số lượt tạo đề AI + Avatar kèm Tên (bấm vào mở menu Hồ sơ / Dashboard / Đăng xuất)
 *    - Chưa đăng nhập: DUY NHẤT 1 nút "Đăng Nhập" (đã bỏ Tạo Phòng, Cúp, Menu 3 gạch)
 */
export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Kiểm tra đăng nhập
  const loggedIn = mounted && (isAuthenticated || !!Cookies.get("token"));

  const go = (href: string) => {
    setUserDropdownOpen(false);
    router.push(href);
  };

  const handleLogout = () => {
    setUserDropdownOpen(false);
    logout();
    Cookies.remove("token");
    Cookies.remove("user");
    router.push("/login");
  };

  const displayName = user?.nickname || user?.email?.split("@")[0] || "Người Dùng";
  const avatarUrl = user?.avatar_url;

  // Tính số lượt tạo đề AI còn lại
  const aiLimit = user?.ai_generation_limit ?? 10;
  const aiUsed = user?.ai_used_today ?? 0;
  const aiRemaining = Math.max(0, aiLimit - aiUsed);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Logo Gaming Edu nguyên bản với ấn triện GE */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="Gaming Edu - Trang chủ">
          <span className="seal-mark group-hover:rotate-0">GE</span>
          <span className="text-brush text-2xl md:text-3xl leading-none drop-shadow-md">Gaming Edu</span>
        </Link>

        {/* Menu giữa: Đúng 4 mục Trang Chủ, Khám Phá, Tạo Đề, Báo Cáo */}
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Menu chính">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`nav-link text-sm sm:text-base text-[#e0f2fe] hover:text-white px-2.5 sm:px-4 py-1.5 font-medium transition-colors ${
                  active ? "is-active !text-white font-semibold" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Cụm bên phải: Chỉ hiển thị đúng theo trạng thái đăng nhập */}
        <div className="flex items-center gap-3 shrink-0">
          {loggedIn ? (
            /* ── ĐÃ ĐĂNG NHẬP: SỐ LƯỢT TẠO ĐỀ + AVATAR KÈM TÊN ── */
            <div className="flex items-center gap-2.5">
              {/* Huy hiệu số lượt tạo đề AI */}
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-emerald-300/30 text-xs font-semibold text-emerald-200 backdrop-blur-sm shadow-inner"
                title={`Đã dùng ${aiUsed}/${aiLimit} lượt tạo đề AI hôm nay`}
              >
                <Sparkles size={13} className="text-amber-300 animate-pulse" />
                <span>Lượt tạo:</span>
                <span className="bg-emerald-400/20 text-white px-1.5 py-0.2 rounded-md font-bold">
                  {aiRemaining}/{aiLimit}
                </span>
              </div>

              {/* Avatar kèm tên & menu dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="nav-user-avatar"
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 transition-all text-white active:scale-95 shadow-sm"
                  aria-expanded={userDropdownOpen}
                  aria-label="Menu tài khoản"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-8 h-8 rounded-full object-cover border border-amber-300 shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="inline-block max-w-[110px] truncate text-xs sm:text-sm font-semibold text-white/95">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-cyan-200 transition-transform duration-200 ${
                      userDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu vào hồ sơ hoặc đăng xuất */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-56 rounded-2xl bg-[#0e3b43]/95 backdrop-blur-xl border border-cyan-300/30 shadow-[0_12px_36px_rgba(0,0,0,0.45)] py-2 z-50 animate-in fade-in zoom-in-95">
                    {/* Header thông tin người dùng */}
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <p className="text-xs text-cyan-200">Tài khoản</p>
                      <p className="text-sm font-bold text-white truncate mt-0.5">{displayName}</p>
                      {/* Lượt tạo đề trên mobile */}
                      <p className="text-[11px] text-emerald-300 sm:hidden mt-1 flex items-center gap-1">
                        <Sparkles size={11} /> {aiRemaining}/{aiLimit} lượt tạo đề AI
                      </p>
                    </div>

                    {/* Danh sách mục */}
                    <div className="py-1">
                      <button
                        onClick={() => go("/profile")}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-cyan-100 hover:text-white hover:bg-white/10 transition-colors text-left font-medium"
                      >
                        <User size={16} className="text-cyan-300" />
                        <span>Hồ Sơ Cá Nhân</span>
                      </button>
                      <button
                        onClick={() => go("/dashboard")}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-cyan-100 hover:text-white hover:bg-white/10 transition-colors text-left font-medium"
                      >
                        <LayoutDashboard size={16} className="text-cyan-300" />
                        <span>Bảng Điều Khiển</span>
                      </button>
                    </div>

                    {/* Đăng xuất */}
                    <div className="pt-1 mt-1 border-t border-white/10">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 transition-colors text-left font-semibold"
                      >
                        <LogOut size={16} />
                        <span>Đăng Xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── CHƯA ĐĂNG NHẬP: DUY NHẤT NÚT ĐĂNG NHẬP ── */
            <button
              id="nav-btn-login"
              onClick={() => go("/login")}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 hover:from-emerald-500/50 hover:to-cyan-500/50 border border-cyan-200/50 text-white font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-md backdrop-blur-sm"
            >
              <LogIn size={16} className="text-amber-300" />
              <span>Đăng Nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}




