"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleButtonProps {
  className?: string;
}

export default function ThemeToggleButton({ className = "" }: ThemeToggleButtonProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    const prefersDark =
      savedTheme === "dark" ||
      (!savedTheme && document.documentElement.classList.contains("dark"));

    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");

    const handleSync = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("theme-change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("theme-change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    document.documentElement.setAttribute("data-theme", nextDark ? "dark" : "light");
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={
        mounted && isDark
          ? "Chuyển sang giao diện Sáng"
          : "Chuyển sang giao diện Tối"
      }
      aria-label="Đổi giao diện Sáng / Tối"
      className={`relative p-2 rounded-xl border transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
        mounted && isDark
          ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 shadow-xs"
          : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
      } ${className}`}
    >
      {mounted && isDark ? (
        <Sun size={18} className="text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon size={18} className="text-slate-600 transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}

