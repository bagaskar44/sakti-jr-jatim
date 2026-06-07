import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import {
  getFunctionDetailHref,
  getUnitFunctionMetric,
  type DashboardFunctionMetric,
} from "@/lib/dashboard/function-metrics";
import { formatPercent } from "@/lib/formatters";

type UnitRow = {
  unit_name: string;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
};

function getSummaryColumnLabels(functionName: DashboardFunctionMetric) {
  if (functionName === "PELAYANAN") {
    return {
      primary: "Total Pelayanan",
      details: ["SLA", "Layanan Selesai"],
      minWidthClass: "min-w-[760px]",
    };
  }

  if (functionName === "KECELAKAAN") {
    return {
      primary: "Total Kecelakaan",
      details: ["Santunan Proses", "SLA"],
      minWidthClass: "min-w-[760px]",
    };
  }

  return {
    primary: "Total",
    details: ["SWDKLLJ", "IWKBU", "IWKL"],
    minWidthClass: "min-w-[900px]",
  };
}

export function RevenueSummaryTable({
  units,
  source,
  year,
  month,
  limit = 10,
  footerAction,
  functionName = "PENDAPATAN",
}: {
  units: UnitRow[];
  source: string;
  year?: number;
  month?: number | "ALL";
  limit?: number;
  footerAction?: ReactNode;
  functionName?: DashboardFunctionMetric;
}) {
  const columns = getSummaryColumnLabels(functionName);
  const sortedUnits = [...units].sort(
    (a, b) =>
      getUnitFunctionMetric({ unit: b, source, functionName }).primaryValue -
      getUnitFunctionMetric({ unit: a, source, functionName }).primaryValue
  );
  const displayedUnits = sortedUnits.slice(0, limit);

  const total = sortedUnits.reduce(
    (sum, unit) =>
      sum + getUnitFunctionMetric({ unit, source, functionName }).primaryValue,
    0
  );

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table
          className={`w-full ${columns.minWidthClass} border-collapse text-left text-sm`}
        >
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3 font-bold">Unit/Kantor</th>
              {columns.details.map((label) => (
                <th className="px-4 py-3 font-bold" key={label}>
                  {label}
                </th>
              ))}
              <th className="px-4 py-3 font-bold">{columns.primary}</th>
              <th className="px-4 py-3 font-bold">Kontribusi</th>
              <th className="px-4 py-3 font-bold">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {displayedUnits.map((unit) => {
              const metric = getUnitFunctionMetric({
                unit,
                source,
                functionName,
              });
              const contribution =
                total > 0 ? (metric.primaryValue / total) * 100 : 0;

              return (
                <tr key={unit.unit_name} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {unit.unit_name}
                  </td>
                  {metric.details.map((detail) => (
                    <td className="px-4 py-3 text-slate-700" key={detail.label}>
                      {detail.formattedValue}
                    </td>
                  ))}
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {metric.formattedPrimaryValue}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatPercent(contribution)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={getFunctionDetailHref({
                        unitName: unit.unit_name,
                        year,
                        month,
                        source,
                        functionName,
                      })}
                      className="inline-flex items-center gap-1 rounded-[7px] border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Lihat Detail
                      <ExternalLink size={13} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#dce3ed] bg-[#f8fafc] px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan {displayedUnits.length} dari {sortedUnits.length} unit.
        </span>
        {footerAction}
      </div>
    </div>
  );
}
