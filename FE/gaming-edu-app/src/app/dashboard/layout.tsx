"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { Library, Users, LogOut, Zap, LayoutDashboard } from "lucide-react";
import { AuthAPI } from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [invitation, setInvitation] = useState<any>(null);

  useEffect(() => {
    // 1. Get user profile from cookies
    const userStr = Cookies.get("user");
    const token = Cookies.get("token");

    if (!userStr || !token) {
      router.push("/auth/login");
      return;
    }

    const parsedUser = JSON.parse(userStr);
    setUser(parsedUser);

    // 2. Setup SignalR Notification Hub
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_ORIGIN}/hubs/notifications`, {
        accessTokenFactory: () => token,
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => console.log("Connected to NotificationHub"))
      .catch((err) => console.error("Error connecting to NotificationHub", err));

    // BE gửi: { type, message, roomId?, pinCode? }
    connection.on("NotificationReceived", (payload: any) => {
      setInvitation({
        type: payload?.type,
        message: payload?.message,
        pinCode: payload?.pinCode,
      });
      // Clear notification after 15s
      setTimeout(() => setInvitation(null), 15000);
    });

    return () => {
      connection.stop();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await AuthAPI.logout();
    } catch (e) {
      console.error(e);
    }
    Cookies.remove("token");
    Cookies.remove("user");
    router.push("/auth/login");
  };

  const navItems = [
    { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Bộ đề của tôi", href: "/dashboard/quizzes", icon: Library },
    { name: "Quản lý nhóm", href: "/dashboard/groups", icon: Users },
  ];

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col hidden sm:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Gaming Edu
          </h1>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-xl p-4 mb-4 border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">AI Quota</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              {(user.quota?.aiGenerationLimit ?? 0) - (user.quota?.aiUsedToday ?? 0)} <span className="text-sm font-normal text-indigo-500">lượt còn lại</span>
            </div>
            <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-1.5 mt-3">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full" 
                style={{ width: `${user.quota?.aiGenerationLimit ? (user.quota.aiUsedToday / user.quota.aiGenerationLimit) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
              {user.nickname?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.nickname}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 text-gray-500 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Toast Notification cho Lời mời */}
      {invitation && (
        <div className="fixed bottom-6 right-6 max-w-sm bg-white dark:bg-gray-800 border-l-4 border-blue-500 rounded-r-lg shadow-2xl p-4 transform transition-all duration-300 translate-y-0 opacity-100 z-50">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {invitation.pinCode ? "Lệnh triệu tập! 🎮" : "Thông báo 🔔"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {invitation.message}
              </p>
              <div className="flex space-x-2">
                {invitation.pinCode && (
                  <Link 
                    href={`/play/${invitation.pinCode}`} 
                    onClick={() => setInvitation(null)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    Tham gia ngay
                  </Link>
                )}
                <button 
                  onClick={() => setInvitation(null)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                >
                  {invitation.pinCode ? "Bỏ qua" : "Đóng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
