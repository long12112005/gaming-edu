"use client";

import Link from "next/link";
import { Gamepad2, Sparkles, Heart, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/80 text-slate-600 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <Gamepad2 size={20} />
              </div>
              <span className="font-heading font-black text-xl text-slate-900 tracking-tight">
                Game<span className="text-indigo-600">Edu</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-4">
              Nền tảng thi đấu kiến thức thế hệ mới. Kết hợp giao diện quản lý tinh gọn kiểu Notion và sảnh chơi tương tác bùng nổ phong cách Kahoot.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hệ thống máy chủ hoạt động ổn định 99.9%</span>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-900 mb-3.5">
              Tính Năng Nổi Bật
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-indigo-600 transition-colors">
                  Đấu trường Live trực tiếp
                </Link>
              </li>
              <li>
                <Link href="/quiz/create" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <span>Trình tạo câu hỏi AI</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-bold">Mới</span>
                </Link>
              </li>
              <li>
                <Link href="/groups" className="hover:text-indigo-600 transition-colors">
                  Không gian lớp học & Nhóm
                </Link>
              </li>
              <li>
                <Link href="/reports" className="hover:text-indigo-600 transition-colors">
                  Báo cáo & Phân tích ma trận
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-900 mb-3.5">
              Hỗ Trợ & Cộng Đồng
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/library" className="hover:text-indigo-600 transition-colors">
                  Thư viện câu hỏi mẫu
                </Link>
              </li>
              <li>
                <a href="#guide" className="hover:text-indigo-600 transition-colors">
                  Hướng dẫn giáo viên
                </a>
              </li>
              <li>
                <a href="#api" className="hover:text-indigo-600 transition-colors">
                  Tài liệu API & SignalR
                </a>
              </li>
              <li>
                <Link href="/admin/users" className="hover:text-indigo-600 transition-colors">
                  Cổng quản trị viên
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} GameEdu. Bản quyền thuộc về đội ngũ phát triển.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-500">
              Thiết kế theo chuẩn <span className="font-bold text-indigo-600">Dual-Tone Gamified SaaS</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
