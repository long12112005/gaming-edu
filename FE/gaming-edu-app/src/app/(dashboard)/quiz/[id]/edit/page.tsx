"use client";

import { use } from "react";
import SlideBuilder3Column from "@/components/builder/SlideBuilder3Column";

export default function DashboardQuizEditPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  return <SlideBuilder3Column quizId={unwrappedParams.id} />;
}
