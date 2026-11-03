"use client";

import { use, Suspense } from "react";
import { Loader2 } from "lucide-react";
import SlideBuilder3Column from "@/components/builder/SlideBuilder3Column";

export default function DashboardQuizEditPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3 text-slate-500 font-medium">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span>Đang tải không gian soạn câu hỏi...</span>
        </div>
      }
    >
      <SlideBuilder3Column quizId={unwrappedParams.id} />
    </Suspense>
  );
}
