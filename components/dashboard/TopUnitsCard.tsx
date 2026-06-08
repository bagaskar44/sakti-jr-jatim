import Link from "next/link";
import {
  getDashboardFunctionColor,
  getFunctionDetailHref,
  getUnitFunctionMetric,
  type DashboardFunctionMetric,
} from "@/lib/dashboard/function-metrics";

type TopUnit = {
  unit_name: string;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
};

export function TopUnitsCard({
  units,
  source,
  year,
  month,
  functionName = "PENDAPATAN",
  className = "",
}: {
  units: TopUnit[];
  source: string;
  year?: number;
  month?: number | "ALL";
  functionName?: DashboardFunctionMetric;
  className?: string;
}) {
  const barColor = getDashboardFunctionColor(functionName);
  const sortedUnits = [...units]
    .sort(
      (a, b) =>
        getUnitFunctionMetric({ unit: b, source, functionName }).primaryValue -
        getUnitFunctionMetric({ unit: a, source, functionName }).primaryValue
    )
    .slice(0, 5);

  const maxValue = Math.max(
    ...sortedUnits.map(
      (unit) => getUnitFunctionMetric({ unit, source, functionName }).primaryValue
    ),
    1
  );

  if (sortedUnits.length === 0) {
    return (
      <div
        className={`flex h-[296px] items-center justify-center rounded-[6.4px] border border-dashed border-[#dce3ed] bg-[#f8fafc] text-sm font-semibold text-slate-500 ${className}`}
      >
        Tidak ada data unit.
      </div>
    );
  }

  return (
    <div
      className={`grid h-[296px] grid-rows-5 gap-4 px-1 py-5 ${className}`}
    >
      {sortedUnits.map((unit) => {
        const metric = getUnitFunctionMetric({ unit, source, functionName });
        const width = `${Math.max((metric.primaryValue / maxValue) * 100, 12)}%`;

        return (
          <div
            key={unit.unit_name}
            className="grid min-h-0 grid-cols-[minmax(92.8px,0.55fr)_minmax(144px,1.48fr)_minmax(54.4px,auto)] items-center gap-3"
          >
            <Link
              className="block min-w-0 whitespace-normal break-words border-r border-[#dce3ed] pr-3 text-right text-[9.6px] font-semibold leading-4 text-slate-700 hover:text-[#1f4fea]"
              href={getFunctionDetailHref({
                unitName: unit.unit_name,
                year,
                month,
                source,
                functionName,
              })}
            >
              {unit.unit_name}
            </Link>

            <div className="h-8 overflow-hidden rounded-[3.2px] bg-[#edf3ff]">
              <div
                className="h-full rounded-[3.2px]"
                style={{ backgroundColor: barColor, width }}
              />
            </div>

            <span className="whitespace-nowrap text-right text-[10.4px] font-bold tabular-nums text-slate-900">
              {metric.formattedPrimaryValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}
