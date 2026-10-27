"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#13182E] text-slate-300 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-12">
          {/* Brand Info (Left) */}
          <div className="md:col-span-6 lg:col-span-7">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center text-slate-950 shadow-md group-hover:scale-105 transition-transform">
                <Gamepad2 size={22} className="stroke-[2.5]" />
              </div>
              <span className="font-heading font-black text-2xl text-white tracking-tight">
                Gaming <span className="text-amber-400">Edu</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Gaming Edu biến lớp học thành không gian chơi thú vị, trực quan và dễ theo dõi cho cả giáo viên lẫn học sinh.
            </p>
          </div>

          {/* SẢN PHẨM (Right Column 1) */}
          <div className="md:col-span-3 lg:col-span-2 lg:col-start-9">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white mb-4">
              SẢN PHẨM
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="text-slate-400 hover:text-amber-400 transition-colors">
                  Tạo Phòng
                </Link>
              </li>
              <li>
                <Link href="/library" className="text-slate-400 hover:text-amber-400 transition-colors">
                  Chế Độ Chơi
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-slate-400 hover:text-amber-400 transition-colors">
                  Giá Cả
                </Link>
              </li>
            </ul>
          </div>

          {/* TÀI NGUYÊN (Right Column 2) */}
          <div className="md:col-span-3 lg:col-span-2">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white mb-4">
              TÀI NGUYÊN
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#blog" className="text-slate-400 hover:text-amber-400 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#support" className="text-slate-400 hover:text-amber-400 transition-colors">
                  Hỗ Trợ
                </Link>
              </li>
              <li>
                <Link href="#privacy" className="text-slate-400 hover:text-amber-400 transition-colors">
                  Quyền Riêng Tư
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & terms */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2024 Gaming Edu. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-6">
            <Link href="#terms" className="hover:text-slate-300 transition-colors">
              Điều Khoản Dịch Vụ
            </Link>
            <Link href="#privacy-policy" className="hover:text-slate-300 transition-colors">
              Chính Sách Quyền Riêng Tư
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
