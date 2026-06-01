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
  month?: number;
  source: string;
}) {
  const params = new URLSearchParams();

  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
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
}: {
  units: TopUnit[];
  source: string;
  year?: number;
  month?: number;
}) {
  const sortedUnits = [...units]
    .sort((a, b) => getAmountBySource(b, source) - getAmountBySource(a, source))
    .slice(0, 5);

  const maxValue = Math.max(
    ...sortedUnits.map((unit) => getAmountBySource(unit, source)),
    1
  );

  return (
    <div className="space-y-4">
      {sortedUnits.map((unit, index) => {
        const amount = getAmountBySource(unit, source);
        const width = `${Math.max((amount / maxValue) * 100, 4)}%`;

        return (
          <div key={unit.unit_name} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
            <span className="text-sm font-bold text-slate-500">
              {index + 1}
            </span>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <Link
                  className="line-clamp-1 text-sm font-semibold text-slate-800 hover:text-blue-700"
                  href={getDetailHref({
                    unitName: unit.unit_name,
                    year,
                    month,
                    source,
                  })}
                >
                  {unit.unit_name}
                </Link>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#eef2f8]">
                <div
                  className="h-full rounded-full bg-[#1f4fea]"
                  style={{ width }}
                />
              </div>
            </div>

            <span className="text-sm font-bold text-slate-900">
              {formatRupiah(amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
