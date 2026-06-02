import { ExternalLink } from "lucide-react";
import { formatPercent, formatRupiah } from "@/lib/formatters";

type UnitRow = {
  unit_name: string;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
};

function getAmountBySource(unit: UnitRow, source: string) {
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

export function RevenueSummaryTable({
  units,
  source,
  year,
  month,
}: {
  units: UnitRow[];
  source: string;
  year?: number;
  month?: number | "ALL";
}) {
  const sortedUnits = [...units]
    .sort((a, b) => getAmountBySource(b, source) - getAmountBySource(a, source))
    .slice(0, 10);

  const total = sortedUnits.reduce(
    (sum, unit) => sum + getAmountBySource(unit, source),
    0
  );

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3 font-bold">Unit/Kantor</th>
              <th className="px-4 py-3 font-bold">SWDKLLJ</th>
              <th className="px-4 py-3 font-bold">IWKBU</th>
              <th className="px-4 py-3 font-bold">IWKL</th>
              <th className="px-4 py-3 font-bold">Total</th>
              <th className="px-4 py-3 font-bold">Kontribusi</th>
              <th className="px-4 py-3 font-bold">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {sortedUnits.map((unit) => {
              const selectedAmount = getAmountBySource(unit, source);
              const contribution = total > 0 ? (selectedAmount / total) * 100 : 0;

              return (
                <tr key={unit.unit_name} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {unit.unit_name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatRupiah(unit.swdkllj_total)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatRupiah(unit.iwkbu_total)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatRupiah(unit.iwkl_total)}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatRupiah(unit.total_revenue)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatPercent(contribution)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={getDetailHref({
                        unitName: unit.unit_name,
                        year,
                        month,
                        source,
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

      <div className="border-t border-[#dce3ed] bg-[#f8fafc] px-4 py-3 text-xs text-slate-500">
        Menampilkan {sortedUnits.length} unit teratas.
      </div>
    </div>
  );
}
