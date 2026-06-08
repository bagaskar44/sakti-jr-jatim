"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FunctionTrendDatum = {
  label: string;
  value: number | string;
};

type FunctionTrendChartProps = {
  data: FunctionTrendDatum[];
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

export function FunctionTrendChart({
  data,
  valueLabel,
  valueFormatter,
  compactFormatter,
  color = "#1f4fea",
}: FunctionTrendChartProps) {
  const normalizedData = data.map((item) => ({
    ...item,
    value: Number(item.value ?? 0),
  }));
  const hasData = normalizedData.some((item) => item.value > 0);
  const tickFormatter = compactFormatter ?? valueFormatter;

  function renderYAxisTick({ x = 0, y = 0, payload }: YAxisTickProps) {
    const textX = Number(x);
    const textY = Number(y);

    return (
      <text
        x={textX}
        y={textY}
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
        Belum ada data tren untuk tahun terpilih.
      </div>
    );
  }

  return (
    <div className="h-[296px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={normalizedData}
          margin={{ top: 6.4, right: 6.4, bottom: 3.2, left: 0 }}
        >
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
          <Line
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke={color}
            strokeWidth={1.6}
            dot={{ r: 2.4, strokeWidth: 1.6, fill: "#ffffff" }}
            activeDot={{ r: 4, strokeWidth: 1.6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
