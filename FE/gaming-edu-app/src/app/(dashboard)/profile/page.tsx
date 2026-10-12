"use client";

import { useState } from "react";
import { User, Key, Save, Camera, Mail } from "lucide-react";
// Đảm bảo bạn đã export useAuthStore trong zustand
import { useAuthStore } from "@/store/useAuthStore"; 

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Giả lập API
    setTimeout(() => {
      setIsSaving(false);
      alert("Cập nhật thành công!");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F4F1FA] p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header với phong cách Vibrant & Block-based */}
        <div className="bg-white p-8 rounded-[32px] shadow-[4px_4px_16px_rgba(0,0,0,0.05),_inset_-4px_-4px_8px_rgba(0,0,0,0.02)] border-4 border-violet-100 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Hồ sơ của bạn
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              Quản lý thông tin cá nhân và bảo mật tài khoản.
            </p>
          </div>
          <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-indigo-500 rounded-[24px] shadow-[inset_-2px_-2px_8px_rgba(0,0,0,0.2),_4px_4px_12px_rgba(99,102,241,0.4)] flex items-center justify-center transform rotate-3 hover:rotate-6 hover:scale-105 transition-all duration-300">
            <User size={40} className="text-white" />
          </div>
        </div>

        {/* Khối Cập nhật thông tin (Claymorphism Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Avatar Section */}
          <div className="col-span-1 bg-white p-8 rounded-[32px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-pink-50 flex flex-col items-center justify-center space-y-4">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-pink-300 to-orange-300 p-1 shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.1),_0_8px_16px_rgba(251,146,60,0.3)]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-gray-300" />
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-100 group-hover:bg-violet-50 transition-colors">
                <Camera size={20} className="text-violet-600" />
              </div>
            </div>
            <p className="text-sm text-gray-400 font-medium">Nhấn để thay đổi</p>
          </div>

          {/* Form Section */}
          <div className="col-span-1 md:col-span-2 bg-white p-8 rounded-[32px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-blue-50">
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Email (Readonly) */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Mail size={16} className="text-blue-500" /> Địa chỉ Email
                </label>
                <input 
                  type="email" 
                  value={user?.email || "user@example.com"} 
                  readOnly
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-500 font-medium cursor-not-allowed outline-none"
                />
              </div>

              {/* Nickname */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <User size={16} className="text-violet-500" /> Tên hiển thị (Nickname)
                </label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Nhập tên hiển thị của bạn..."
                  className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-800 font-bold outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Key size={16} className="text-pink-500" /> Đổi mật khẩu mới
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Bỏ trống nếu không muốn đổi"
                  className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-800 font-bold outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 transition-all"
                />
              </div>

              {/* Submit Button - 3D Bouncy Feel */}
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-[0_8px_16px_rgba(99,102,241,0.3),_inset_0_-4px_0_rgba(0,0,0,0.1)] active:shadow-[0_2px_4px_rgba(99,102,241,0.3),_inset_0_2px_4px_rgba(0,0,0,0.2)] active:translate-y-1 hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={24} /> Lưu Thay Đổi
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
