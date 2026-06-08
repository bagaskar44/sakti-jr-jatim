"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RevenueTrendDatum = {
  label: string;
  value: number | string;
};

type RevenueTrendChartProps = {
  data: RevenueTrendDatum[];
  valueLabel: string;
  valueFormatter: (value: number) => string;
  compactFormatter?: (value: number) => string;
  color?: string;
};

type YAxisTickProps = {
  x?: number | string;
  y?: number | string;
  payload?: {
    value?: number | string;
  };
};

export function RevenueTrendChart({
  data,
  valueLabel,
  valueFormatter,
  compactFormatter,
  color = "#1f4fea",
}: RevenueTrendChartProps) {
  const normalizedData = data.map((item) => ({
    ...item,
    value: Number(item.value ?? 0),
  }));
  const hasData = normalizedData.some((item) => item.value > 0);
  const tickFormatter = compactFormatter ?? valueFormatter;

  function renderYAxisTick({ x = 0, y = 0, payload }: YAxisTickProps) {
    return (
      <text
        x={Number(x)}
        y={Number(y)}
        dy={3.2}
        textAnchor="end"
        fill="#64748b"
        fontSize={9.6}
        fontWeight={700}
      >
        {tickFormatter(Number(payload?.value ?? 0))}
      </text>
    );
  }

  if (!hasData) {
    return (
      <div className="flex h-[296px] items-center justify-center rounded-[6.4px] border border-dashed border-[#dce3ed] bg-[#f8fafc] text-sm font-semibold text-slate-500">
        Belum ada data tren pendapatan untuk tahun terpilih.
      </div>
    );
  }

  return (
    <div className="h-[296px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={normalizedData}
          margin={{ top: 8, right: 9.6, bottom: 3.2, left: 0 }}
        >
          <defs>
            <linearGradient id="revenueTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.22} />
              <stop offset="95%" stopColor={color} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5edf6" strokeDasharray="2.4 4" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 9.6, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={renderYAxisTick}
            axisLine={false}
            tickLine={false}
            width={60.8}
          />
          <Tooltip
            formatter={(value) => [
              valueFormatter(Number(value)),
              valueLabel,
            ]}
            labelFormatter={(label) => `Bulan ${label}`}
            contentStyle={{
              borderRadius: 6.4,
              borderColor: "#dce3ed",
              boxShadow: "0 8px 19.2px rgba(15, 23, 42, 0.12)",
              fontWeight: 700,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke={color}
            strokeWidth={2}
            fill="url(#revenueTrendFill)"
            dot={{
              r: 2.8,
              strokeWidth: 1.6,
              fill: "#ffffff",
              stroke: color,
            }}
            activeDot={{ r: 4.4, strokeWidth: 1.6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
