"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatRupiah } from "@/lib/formatters";

type CompositionItem = {
  source_name: string;
  amount: number | string;
};

const COLORS: Record<string, string> = {
  SWDKLLJ: "#0F5CC9",
  IWKBU: "#3B82F6",
  IWKL: "#93C5FD",
};

export function RevenueCompositionChart({
  data,
  className = "",
}: {
  data: CompositionItem[];
  className?: string;
}) {
  const total = data.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  return (
    <div
      className={`grid grid-cols-1 gap-4 md:grid-cols-[176px_1fr] ${className}`}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="source_name"
              innerRadius={46.4}
              outerRadius={70.4}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.source_name}
                  fill={COLORS[entry.source_name] ?? "#CBD5E1"}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatRupiah(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col justify-center gap-3">
        {data.map((item) => {
          const percent = total > 0 ? (Number(item.amount) / total) * 100 : 0;

          return (
            <div key={item.source_name}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        COLORS[item.source_name] ?? "#CBD5E1",
                    }}
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    {item.source_name}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {percent.toFixed(1)}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#eef2f8]">
                <div
                  className="h-full rounded-full bg-[#1f4fea]"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {formatRupiah(item.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
