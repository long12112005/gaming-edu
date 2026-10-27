"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Users,
  LayoutDashboard,
  BookOpen,
  Gamepad2,
  ArrowLeft,
  ShieldCheck,
  Activity,
} from "lucide-react";

interface AdminNavHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  actionButton?: React.ReactNode;
}

export default function AdminNavHeader({
  title,
  subtitle,
  badge = "Khu Vực Quản Trị Hệ Thống",
  actionButton,
}: AdminNavHeaderProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Tổng Quan KPI",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "Quản Trị Người Dùng",
      href: "/admin/users",
      icon: Users,
      active: pathname === "/admin/users",
    },
    {
      label: "Quản Trị Bộ Đề & Trò Chơi",
      href: "/admin/quizzes",
      icon: BookOpen,
      active: pathname === "/admin/quizzes",
    },
    {
      label: "Giám Sát Phòng Chơi",
      href: "/admin/rooms",
      icon: Gamepad2,
      active: pathname === "/admin/rooms",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── TOP HERO HEADER ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 font-heading">
            <ShieldAlert size={14} className="text-rose-600" />
            <span>{badge}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0F172A] font-heading tracking-tight">
            {title}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm md:text-base mt-1.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {actionButton}
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-2 font-heading cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Về Trang Chủ</span>
          </Link>
        </div>
      </div>

      {/* ── ADMIN SUB-NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-heading flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                item.active
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200/80"
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
