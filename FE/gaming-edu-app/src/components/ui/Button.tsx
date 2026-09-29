"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "yellow" | "outline" | "ghost" | "blue";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden select-none";

    const variants = {
      primary:
        "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(124,58,237,0.5)] active:translate-y-0",
      yellow:
        "bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(245,197,24,0.5)] active:translate-y-0",
      blue: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(59,130,246,0.5)] active:translate-y-0",
      outline:
        "border-2 border-violet-500 text-violet-600 bg-transparent hover:bg-violet-50 hover:-translate-y-0.5",
      ghost:
        "text-gray-600 bg-transparent hover:bg-gray-100 hover:text-gray-900",
    };

    const sizes = {
      sm: "text-sm px-4 py-2 rounded-lg",
      md: "text-sm px-6 py-3",
      lg: "text-base px-8 py-4",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          (disabled || loading) && "opacity-60 cursor-not-allowed hover:translate-y-0",
          className
        )}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
