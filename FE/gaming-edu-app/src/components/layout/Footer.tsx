"use client";

import Link from "next/link";
import { Trophy, Share2, MessageCircle, PlayCircle, Mail } from "lucide-react";

const footerLinks = {
  "Sản Phẩm": [
    { label: "Tạo Phòng", href: "#" },
    { label: "Chế Độ Chơi", href: "#" },
    { label: "Xem Tất Cả", href: "#" },
  ],
  "Tài Nguyên": [
    { label: "Hỗ Trợ", href: "#" },
    { label: "Hướng Dẫn", href: "#" },
    { label: "Tài nguyên Tự", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="footer-bg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md">
                <Trophy size={18} className="text-white" />
              </div>
              <span className="font-800 text-lg">
                <span className="text-violet-400">Gaming</span> Edu
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Gaming Edu biến việc học thành những giờ game vui vẻ và thú vị. Phù hợp cho cả giáo viên và học sinh trên toàn thế giới.
            </p>

            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              {[
                { icon: MessageCircle, href: "#", label: "Facebook" },
                { icon: Share2, href: "#", label: "Twitter" },
                { icon: PlayCircle, href: "#", label: "YouTube" },
                { icon: Mail, href: "#", label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-violet-600/30 hover:border-violet-500/50 transition-all duration-200"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-700 text-sm text-white mb-4 uppercase tracking-wider">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-gray-400 hover:text-violet-400 text-sm transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs">
            © 2024 Gaming Edu. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex gap-6">
            {["Điều Khoản Dịch Vụ", "Chính Sách Quyền Riêng Tư"].map((item) => (
              <Link
                key={item}
                href="#"
                className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
