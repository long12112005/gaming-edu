"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "white" | "dark" | "glass" | "gradient";
  hover?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

export default function Card({
  variant = "white",
  hover = false,
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  const variants = {
    white: "bg-white border border-gray-100 shadow-sm",
    dark: "bg-card-gradient border border-white/10 text-white",
    glass: "glass-card text-white",
    gradient:
      "bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20",
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "rounded-2xl",
        variants[variant],
        paddings[padding],
        hover && "card-hover cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
