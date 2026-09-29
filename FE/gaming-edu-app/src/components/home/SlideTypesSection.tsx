"use client";

import { SlideTypeInfo } from "@/types/database";
import { slideTypes } from "@/lib/mockData";

function SlideTypeCard({ info }: { info: SlideTypeInfo }) {
  return (
    <button
      className="group flex-shrink-0 flex items-center gap-3 px-5 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 whitespace-nowrap"
      id={`btn-slide-type-${info.type.toLowerCase()}`}
      style={{
        borderColor: "transparent",
        boxShadow: `0 1px 8px rgba(0,0,0,0.06)`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = info.color + "40";
        el.style.background = info.bgColor;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "transparent";
        el.style.background = "white";
      }}
    >
      <span className="text-2xl">{info.icon}</span>
      <span className="font-700 text-gray-800 text-sm">{info.label}</span>
    </button>
  );
}

export default function SlideTypesSection() {
  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h2 className="text-xs font-700 text-gray-400 uppercase tracking-widest">
            CÁC DẠNG CÂU HỎI
          </h2>
        </div>
        <div className="scroll-container pb-2">
          {slideTypes.map((type) => (
            <SlideTypeCard key={type.type} info={type} />
          ))}
        </div>
      </div>
    </section>
  );
}
