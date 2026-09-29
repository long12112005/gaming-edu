"use client";

import { useState, useRef } from "react";
import { ArrowRight, Plus, Bot } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format PIN as "123 - 456" style
  const formatPin = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + " - " + digits.slice(3);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPin(e.target.value);
    setPin(formatted);
  };

  const handleJoin = () => {
    const digits = pin.replace(/\D/g, "");
    if (digits.length < 4) {
      inputRef.current?.focus();
      return;
    }
    setIsJoining(true);
    router.push(`/play?pin=${digits}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleJoin();
  };

  return (
    <section className="py-8 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Text */}
          <div className="lg:col-span-2 flex flex-col justify-center animate-fade-in-up">
            <h1 className="text-3xl md:text-4xl xl:text-5xl font-900 text-gray-900 leading-tight mb-4">
              Học tập vui hơn
              <br />
              <span className="text-gradient-purple">với Gaming Edu</span>
            </h1>
            <p className="text-gray-500 text-sm md:text-base leading-relaxed">
              Tạo phòng học, sinh đề bằng AI và chơi game thi đấu trực tiếp trên điện thoại. Học lập trình đều trở nên thú vị, nhanh chóng và đầy cảm hứng.
            </p>

            {/* Stats row */}
            <div className="flex gap-8 mt-8">
              {[
                { value: "50K+", label: "Giáo viên" },
                { value: "2M+", label: "Học sinh" },
                { value: "10M+", label: "Bài thi" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="font-900 text-xl text-violet-600">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Hero Cards */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-4">
              {/* PIN Entry Card — maps to rooms.pin_code */}
              <div
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-fade-in-up"
                style={{ animationDelay: "100ms" }}
              >
                {/* Card Header */}
                <div className="text-center mb-5">
                  <h2 className="font-800 text-xl text-gray-900 mb-1">Sẵn sàng chơi?</h2>
                  <p className="text-sm text-gray-500">
                    Nhập mã phòng PIN để gia nhập. Đầu tiên hãy trải nghiệm ngay thú vị bùng.
                  </p>
                </div>

                {/* PIN Input — maps to rooms.pin_code */}
                <div className="border-2 border-dashed border-violet-200 rounded-xl px-6 py-4 mb-1 bg-violet-50/30 hover:border-violet-400 transition-colors focus-within:border-violet-500 focus-within:bg-violet-50">
                  <div className="text-xs font-600 text-gray-400 uppercase tracking-wider mb-2">
                    Nhập mã phòng PIN
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={pin}
                    onChange={handlePinChange}
                    onKeyDown={handleKeyDown}
                    placeholder="123 - 456"
                    className="pin-input"
                    id="input-pin-code"
                    aria-label="Nhập mã phòng PIN"
                  />
                </div>

                <Button
                  variant="yellow"
                  fullWidth
                  size="lg"
                  loading={isJoining}
                  onClick={handleJoin}
                  id="btn-join-room"
                  className="mt-4 text-base rounded-xl font-900"
                >
                  {!isJoining && <ArrowRight size={18} />}
                  Vào Chơi
                </Button>
              </div>

              {/* Secondary Action Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tạo Phòng — maps to rooms table */}
                <Link
                  href="/quiz/create"
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-3 card-hover text-center animate-fade-in-up"
                  style={{ animationDelay: "200ms" }}
                  id="btn-create-room"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={22} className="text-indigo-600" />
                  </div>
                  <span className="font-700 text-gray-800 text-sm">Tạo Phòng</span>
                </Link>

                {/* Tạo Đề Bằng AI — maps to ai_jobs table */}
                <Link
                  href="/quiz/create"
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-3 card-hover text-center animate-fade-in-up"
                  style={{ animationDelay: "300ms" }}
                  id="btn-create-ai-quiz"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot size={22} className="text-violet-600" />
                  </div>
                  <span className="font-700 text-gray-800 text-sm">Tạo Đề Bằng AI</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
