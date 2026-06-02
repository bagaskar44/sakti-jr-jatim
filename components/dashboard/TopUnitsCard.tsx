import Link from "next/link";
import { formatRupiah } from "@/lib/formatters";

type TopUnit = {
  unit_name: string;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
};

function getAmountBySource(unit: TopUnit, source: string) {
  if (source === "SWDKLLJ") return Number(unit.swdkllj_total ?? 0);
  if (source === "IWKBU") return Number(unit.iwkbu_total ?? 0);
  if (source === "IWKL") return Number(unit.iwkl_total ?? 0);

  return Number(unit.total_revenue ?? 0);
}

function getDetailHref({
  unitName,
  year,
  month,
  source,
}: {
  unitName: string;
  year?: number;
  month?: number | "ALL";
  source: string;
}) {
  const params = new URLSearchParams();

  if (year) params.set("year", String(year));
  if (month) params.set("month", month === "ALL" ? "all" : String(month));
  if (source !== "ALL") {
    params.set("source", source);
    params.set("tab", source);
  }

  params.set("unit", unitName);

  return `/pendapatan?${params.toString()}`;
}

export function TopUnitsCard({
  units,
  source,
  year,
  month,
  className = "",
}: {
  units: TopUnit[];
  source: string;
  year?: number;
  month?: number | "ALL";
  className?: string;
}) {
  const sortedUnits = [...units]
    .sort((a, b) => getAmountBySource(b, source) - getAmountBySource(a, source))
    .slice(0, 5);

  const maxValue = Math.max(
    ...sortedUnits.map((unit) => getAmountBySource(unit, source)),
    1
  );

  if (sortedUnits.length === 0) {
    return (
      <div
        className={`flex h-[370px] items-center justify-center rounded-[8px] border border-dashed border-[#dce3ed] bg-[#f8fafc] text-sm font-semibold text-slate-500 ${className}`}
      >
        Tidak ada data unit.
      </div>
    );
  }

  return (
    <div
      className={`grid h-[370px] grid-rows-5 gap-4 px-1 py-5 ${className}`}
    >
      {sortedUnits.map((unit) => {
        const amount = getAmountBySource(unit, source);
        const width = `${Math.max((amount / maxValue) * 100, 12)}%`;

        return (
          <div
            key={unit.unit_name}
            className="grid min-h-0 grid-cols-[minmax(116px,0.55fr)_minmax(180px,1.48fr)_minmax(68px,auto)] items-center gap-3"
          >
            <Link
              className="block min-w-0 whitespace-normal break-words border-r border-[#dce3ed] pr-3 text-right text-[12px] font-semibold leading-4 text-slate-700 hover:text-[#1f4fea]"
              href={getDetailHref({
                unitName: unit.unit_name,
                year,
                month,
                source,
              })}
            >
              {unit.unit_name}
            </Link>

            <div className="h-8 overflow-hidden rounded-[4px] bg-[#edf3ff]">
              <div
                className="h-full rounded-[4px] bg-[#1f4fea]"
                style={{ width }}
              />
            </div>

            <span className="whitespace-nowrap text-right text-[13px] font-bold tabular-nums text-slate-900">
              {formatRupiah(amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
