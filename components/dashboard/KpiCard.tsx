import { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
};

export function KpiCard({ title, value, subtitle, icon, trend }: KpiCardProps) {
  const isDown = trend?.direction === "down";
  const isUp = trend?.direction === "up";

  return (
    <div className="jr-card p-3 transition hover:shadow-[0_4.8px_12.8px_rgba(15,23,42,0.12)]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[5.6px] bg-blue-50 text-blue-700">
          {icon}
        </div>

        {trend && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
              isDown
                ? "bg-red-50 text-red-600"
                : isUp
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {isDown ? <ArrowDownRight size={11.2} /> : <ArrowUpRight size={11.2} />}
            {trend.value}
          </div>
        )}
      </div>

      <p className="jr-label">{title}</p>
      <p className="mt-1 text-[17.6px] font-semibold leading-tight tracking-tight text-slate-950">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
