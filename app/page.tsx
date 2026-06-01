"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bus,
  CreditCard,
  ReceiptText,
  Ship,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  RevenueMap,
  type RevenueMapUnit,
} from "@/components/dashboard/RevenueMap";
import { RevenueCompositionChart } from "@/components/dashboard/RevenueCompositionChart";
import { RevenueSummaryTable } from "@/components/dashboard/RevenueSummaryTable";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { TopUnitsCard } from "@/components/dashboard/TopUnitsCard";
import { formatNumber, formatRupiah, formatPercent } from "@/lib/formatters";

type OverviewData = {
  batch_id: string;
  period_year: number;
  period_month: number;
  uploaded_at: string;
  swdkllj_total: number;
  iwkbu_total: number;
  iwkl_total: number;
  total_revenue: number;
  swdkllj_transaction_count: number;
  iwkl_passenger_count: number;
  iwkbu_growth_pct: number | null;
};

type CompositionItem = {
  source_name: string;
  amount: number;
};

type UnitRow = {
  unit_name: string;
  swdkllj_total: number;
  iwkbu_total: number;
  iwkl_total: number;
  total_revenue: number;
};

type OverviewResponse = {
  success: boolean;
  overview: OverviewData;
  composition: CompositionItem[];
  top_units: UnitRow[];
};

type UnitsResponse = {
  success: boolean;
  data: UnitRow[];
};

type MapResponse = {
  success: boolean;
  data: RevenueMapUnit[];
};

function getAmountBySource(unit: UnitRow, source: string) {
  if (source === "SWDKLLJ") return Number(unit.swdkllj_total ?? 0);
  if (source === "IWKBU") return Number(unit.iwkbu_total ?? 0);
  if (source === "IWKL") return Number(unit.iwkl_total ?? 0);

  return Number(unit.total_revenue ?? 0);
}

function formatUpdatedAt(value?: string) {
  if (!value) return undefined;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function OverviewDashboardPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [source, setSource] = useState("ALL");
  const [unitQuery, setUnitQuery] = useState("");

  const [appliedYear, setAppliedYear] = useState(2026);
  const [appliedMonth, setAppliedMonth] = useState(5);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [composition, setComposition] = useState<CompositionItem[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [mapUnits, setMapUnits] = useState<RevenueMapUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboardData(targetYear: number, targetMonth: number) {
    setLoading(true);
    setError("");

    try {
      const [overviewResponse, unitsResponse, mapResponse] = await Promise.all([
        fetch(
          `/api/dashboard/revenue/overview?year=${targetYear}&month=${targetMonth}`
        ),
        fetch(
          `/api/dashboard/revenue/units?year=${targetYear}&month=${targetMonth}&limit=200`
        ),
        fetch(
          `/api/dashboard/revenue/map?year=${targetYear}&month=${targetMonth}`
        ),
      ]);

      const overviewJson =
        (await overviewResponse.json()) as OverviewResponse;
      const unitsJson = (await unitsResponse.json()) as UnitsResponse;
      const mapJson = (await mapResponse.json()) as MapResponse;

      if (!overviewResponse.ok || !overviewJson.success) {
        throw new Error("Gagal mengambil data overview.");
      }

      if (!unitsResponse.ok || !unitsJson.success) {
        throw new Error("Gagal mengambil data unit.");
      }

      if (!mapResponse.ok || !mapJson.success) {
        throw new Error("Gagal mengambil data peta.");
      }

      setOverview(overviewJson.overview);
      setComposition(overviewJson.composition ?? []);
      setUnits(unitsJson.data ?? []);
      setMapUnits(mapJson.data ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Terjadi kesalahan saat mengambil data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchDashboardData(appliedYear, appliedMonth);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [appliedYear, appliedMonth]);

  const filteredUnits = useMemo(() => {
    const query = unitQuery.trim().toUpperCase();

    return units
      .filter((unit) => {
        if (!query) return true;

        return unit.unit_name.toUpperCase().includes(query);
      })
      .filter((unit) => {
        if (source === "ALL") return true;

        return getAmountBySource(unit, source) > 0;
      });
  }, [units, unitQuery, source]);

  function handleApply() {
    setAppliedYear(year);
    setAppliedMonth(month);
  }

  function handleReset() {
    setYear(2026);
    setMonth(5);
    setSource("ALL");
    setUnitQuery("");
    setAppliedYear(2026);
    setAppliedMonth(5);
  }

  return (
    <main className="jr-page">
      <DashboardHeader
        title="Overview Dashboard"
        year={appliedYear}
        month={appliedMonth}
        updatedAt={formatUpdatedAt(overview?.uploaded_at)}
      />

      <div className="w-full space-y-4 px-5 pb-5 pt-2">
        <FilterBar
          year={year}
          month={month}
          source={source}
          unitQuery={unitQuery}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onSourceChange={setSource}
          onUnitQueryChange={setUnitQuery}
          onApply={handleApply}
          onReset={handleReset}
        />

        {loading && (
          <div className="jr-state p-8 text-center text-sm font-semibold text-slate-500">
            Memuat data dashboard...
          </div>
        )}

        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && overview && (
          <>
            <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <KpiCard
                title="Total Pendapatan"
                value={formatRupiah(overview.total_revenue)}
                subtitle="Total seluruh sumber pendapatan"
                icon={<BarChart3 size={22} />}
              />

              <KpiCard
                title="SWDKLLJ"
                value={formatRupiah(overview.swdkllj_total)}
                subtitle="Pendapatan SWDKLLJ"
                icon={<ReceiptText size={22} />}
              />

              <KpiCard
                title="IWKBU"
                value={formatRupiah(overview.iwkbu_total)}
                subtitle="Pendapatan tahun berjalan"
                icon={<Bus size={22} />}
                trend={
                  overview.iwkbu_growth_pct !== null
                    ? {
                        value: formatPercent(overview.iwkbu_growth_pct),
                        direction:
                          overview.iwkbu_growth_pct < 0 ? "down" : "up",
                      }
                    : undefined
                }
              />

              <KpiCard
                title="IWKL"
                value={formatRupiah(overview.iwkl_total)}
                subtitle="Total nominal IWKL"
                icon={<Ship size={22} />}
              />

              <KpiCard
                title="Transaksi SWDKLLJ"
                value={formatNumber(overview.swdkllj_transaction_count)}
                subtitle="Jumlah transaksi"
                icon={<CreditCard size={22} />}
              />

              <KpiCard
                title="Penumpang IWKL"
                value={formatNumber(overview.iwkl_passenger_count)}
                subtitle="Jumlah penumpang"
                icon={<Users size={22} />}
              />
            </section>

            <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard title="Distribusi Pendapatan">
                <RevenueCompositionChart
                  data={composition}
                  className="xl:items-center"
                />
              </SectionCard>

              <SectionCard
                title={`Top 5 Unit / Wilayah ${
                  source === "ALL" ? "" : source
                }`}
              >
                <TopUnitsCard
                  units={filteredUnits}
                  source={source}
                  year={appliedYear}
                  month={appliedMonth}
                />
              </SectionCard>
            </section>

            <SectionCard title="Peta Interaktif Jawa Timur">
              <RevenueMap
                units={mapUnits}
                source={source}
                year={appliedYear}
                month={appliedMonth}
              />
            </SectionCard>

            <SectionCard title="Ringkasan Performa Wilayah">
              <RevenueSummaryTable
                units={filteredUnits}
                source={source}
                year={appliedYear}
                month={appliedMonth}
              />
            </SectionCard>

            <footer className="flex flex-col gap-2 border-t border-[#dce3ed] py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>Sumber Data: SAKTI JR-JATIM</p>
              <p>
                Sinkronisasi terakhir:{" "}
                {formatUpdatedAt(overview.uploaded_at) ?? "-"}
              </p>
              <p>© 2026 Jasa Raharja Jawa Timur</p>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
