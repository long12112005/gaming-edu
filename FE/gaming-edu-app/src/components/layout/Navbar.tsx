"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Sparkles,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Trophy,
  Zap,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { NavbarUser } from "@/types/database";

interface NavbarProps {
  user: NavbarUser | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const aiRemaining = user ? user.quota.ai_generation_limit - user.quota.ai_used_today : 0;
  const aiPercent = user ? (user.quota.ai_used_today / user.quota.ai_generation_limit) * 100 : 0;

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Trophy size={18} className="text-white" />
            </div>
            <span className="font-800 text-lg text-gray-900">
              <span className="text-violet-600">Gaming</span> Edu
            </span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Tạo Nhóm Button — maps to groups table */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              id="btn-create-group"
            >
              <Users size={15} />
              Tạo Nhóm
            </Button>

            {/* AI Quota Badge — maps to user_quotas table */}
            <button
              className="ai-badge hidden sm:flex"
              title={`Đã dùng ${user?.quota.ai_used_today || 0}/${user?.quota.ai_generation_limit || 0} lần sinh đề AI hôm nay`}
              id="btn-ai-quota"
            >
              <Zap size={13} />
              <span>Lượt tạo AI: </span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                {aiRemaining}/{user?.quota.ai_generation_limit || 0}
              </span>
            </button>

            {/* AI usage mini bar */}
            <div className="hidden md:flex flex-col items-end gap-0.5" title="Hạn mức AI hôm nay">
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${aiPercent}%` }}
                />
              </div>
            </div>

            {/* User Dropdown or Login Button */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-xl transition-all duration-200 group"
                  id="btn-user-dropdown"
                >
                  <div className="relative">
                    <img
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.nickname}&background=7c3aed&color=fff`}
                      alt={user.nickname}
                      className="w-8 h-8 rounded-full border-2 border-violet-200 group-hover:border-violet-400 transition-colors"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                  </div>
                  <span className="text-sm font-700 text-gray-800 hidden sm:block">
                    {user.nickname}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-gray-500 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fade-in-up">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="font-700 text-gray-900 text-sm">{user.nickname}</p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Sparkles size={11} className="text-violet-500" />
                        {aiRemaining} lượt AI còn lại
                      </p>
                    </div>
                    {[
                      { icon: User, label: "Hồ Sơ", href: "/dashboard" },
                      { icon: Trophy, label: "Bộ Đề Của Tôi", href: "/dashboard" },
                      { icon: Settings, label: "Cài Đặt", href: "/dashboard" },
                    ].map(({ icon: Icon, label, href }) => (
                      <Link
                        key={label}
                        href={href}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                      >
                        <Icon size={15} />
                        {label}
                      </Link>
                    ))}
                    <div className="border-t border-gray-50 mt-2 pt-2">
                      <button 
                        onClick={() => {
                           document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                           document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                           window.location.reload();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Đăng Xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="primary" size="sm" id="btn-login-nav" href="/auth/login">
                <User size={15} />
                Đăng Nhập
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
