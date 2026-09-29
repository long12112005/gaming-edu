"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon: Icon, label, error, showPasswordToggle, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const resolvedType =
      showPasswordToggle && type === "password"
        ? showPassword
          ? "text"
          : "password"
        : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-600 text-gray-700">{label}</label>
        )}
        <div className="relative">
          {Icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon size={16} />
            </span>
          )}
          <input
            ref={ref}
            type={resolvedType}
            className={cn(
              "input-field",
              !Icon && "pl-4",
              showPasswordToggle && "pr-12",
              error && "border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]",
              className
            )}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && (
          <span className="text-xs text-red-500 font-medium">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
