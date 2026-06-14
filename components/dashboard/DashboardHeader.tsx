"use client";

import { Download } from "lucide-react";

type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
  year: number;
  month: number | string;
  updatedAt?: string;
};

export function DashboardHeader({
  title,
  subtitle = "Monitoring data operasional Jasa Raharja Jawa Timur",
}: DashboardHeaderProps) {
  return (
    <header className="w-full px-5 pb-2 pt-9 lg:flex lg:items-start lg:justify-between lg:gap-5">
      <div className="min-w-0">
        <h1 className="text-[22.4px] font-extrabold leading-tight tracking-tight text-[#0b1020] lg:text-[27.2px]">
          {title}
        </h1>
        <p className="mt-1.5 text-[12px] leading-6 text-[#5b6b85] lg:text-base">
          {subtitle}
        </p>
      </div>

      <div className="mt-4 flex lg:mt-0 lg:shrink-0">
        <button className="jr-button-primary min-h-[36.8px] px-4 py-2 shadow-none">
          <Download size={13.6} />
          Export Report
        </button>
      </div>
    </header>
  );
}
