"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  HeartPulse,
  Percent,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  RevenueMap,
  type RevenueMapUnit,
} from "@/components/dashboard/RevenueMap";
import {
  FunctionTrendChart,
  type FunctionTrendDatum,
} from "@/components/dashboard/FunctionTrendChart";
import { LatestActivitiesSection } from "@/components/dashboard/LatestActivitiesSection";
import { RevenueSummaryTable } from "@/components/dashboard/RevenueSummaryTable";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { TopUnitsCard } from "@/components/dashboard/TopUnitsCard";
import { formatNumber, formatRupiah, formatPercent } from "@/lib/formatters";

type DashboardMonthFilter = number | "ALL";
type TrendFunction = "PENDAPATAN" | "PELAYANAN" | "KECELAKAAN";

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

type ComparisonData = {
  previous_year: number;
  previous_month: DashboardMonthFilter;
  previous_months: number[];
  previous_total_revenue: number;
  growth_pct: number | null;
  label: string;
};

type RevenueTrendItem = {
  month: number;
  label: string;
  total_revenue: number;
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
  comparison: ComparisonData;
  top_units: UnitRow[];
  trend: RevenueTrendItem[];
};

type UnitsResponse = {
  success: boolean;
  data: UnitRow[];
};

type MapResponse = {
  success: boolean;
  data: RevenueMapUnit[];
};

const trendFunctionOptions = [
  { value: "PENDAPATAN" as const, label: "Pendapatan", Icon: BarChart3 },
  { value: "PELAYANAN" as const, label: "Pelayanan", Icon: Users },
  { value: "KECELAKAAN" as const, label: "Kecelakaan", Icon: HeartPulse },
];

const staticFunctionMetrics = {
  totalPelayanan: 1248,
  slaPelayanan: 96.4,
  totalKecelakaan: 327,
  totalKegiatan: 84,
};

const shortMonthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const staticTrendValues: Record<Exclude<TrendFunction, "PENDAPATAN">, number[]> = {
  PELAYANAN: [920, 1010, 974, 1108, 1248, 1192, 1280, 1316, 1268, 1340, 1404, 1456],
  KECELAKAAN: [248, 256, 271, 292, 327, 318, 336, 352, 341, 365, 374, 389],
};

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

function getGrowthDirection(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "neutral";
  }

  return value < 0 ? "down" : "up";
}

function getMonthQueryValue(month: DashboardMonthFilter) {
  return month === "ALL" ? "all" : String(month);
}

function getTrendMonthsForYear(year: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;

  return Array.from({ length: endMonth }, (_, index) => index + 1);
}

function buildStaticTrend(
  year: number,
  functionName: Exclude<TrendFunction, "PENDAPATAN">
): FunctionTrendDatum[] {
  return getTrendMonthsForYear(year).map((month) => ({
    label: shortMonthLabels[month - 1] ?? String(month),
    value: staticTrendValues[functionName][month - 1] ?? 0,
  }));
}

function getTrendConfig(activeFunction: TrendFunction) {
  if (activeFunction === "PELAYANAN") {
    return {
      valueLabel: "Pelayanan",
      color: "#0891b2",
      formatter: (value: number) => formatNumber(value),
    };
  }

  if (activeFunction === "KECELAKAAN") {
    return {
      valueLabel: "Kecelakaan",
      color: "#e11d48",
      formatter: (value: number) => formatNumber(value),
    };
  }

  return {
    valueLabel: "Pendapatan",
    color: "#1f4fea",
    formatter: (value: number) => formatRupiah(value),
  };
}

export default function OverviewDashboardPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState<DashboardMonthFilter>(5);
  const [unitQuery, setUnitQuery] = useState("");

  const [appliedYear, setAppliedYear] = useState(2026);
  const [appliedMonth, setAppliedMonth] = useState<DashboardMonthFilter>(5);
  const [activeTrendFunction, setActiveTrendFunction] =
    useState<TrendFunction>("PENDAPATAN");

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [mapUnits, setMapUnits] = useState<RevenueMapUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboardData(
    targetYear: number,
    targetMonth: DashboardMonthFilter
  ) {
    setLoading(true);
    setError("");

    try {
      const monthQuery = getMonthQueryValue(targetMonth);
      const [overviewResponse, unitsResponse, mapResponse] = await Promise.all([
        fetch(
          `/api/dashboard/revenue/overview?year=${targetYear}&month=${monthQuery}`
        ),
        fetch(
          `/api/dashboard/revenue/units?year=${targetYear}&month=${monthQuery}&limit=200`
        ),
        fetch(
          `/api/dashboard/revenue/map?year=${targetYear}&month=${monthQuery}`
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
      setComparison(overviewJson.comparison ?? null);
      setRevenueTrend(overviewJson.trend ?? []);
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

  const unitOptions = useMemo(() => {
    const options = new Map<string, { value: string; label: string }>();

    if (unitQuery.trim()) {
      options.set(unitQuery, {
        value: unitQuery,
        label: unitQuery,
      });
    }

    units.forEach((unit) => {
      options.set(unit.unit_name, {
        value: unit.unit_name,
        label: unit.unit_name,
      });
    });

    return Array.from(options.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "id-ID")
    );
  }, [units, unitQuery]);

  const filteredUnits = useMemo(() => {
    const selectedUnitName = unitQuery.trim().toUpperCase();

    return units
      .filter((unit) => {
        if (!selectedUnitName) return true;

        return unit.unit_name.toUpperCase() === selectedUnitName;
      });
  }, [units, unitQuery]);

  const filteredMapUnits = useMemo(() => {
    const selectedUnitName = unitQuery.trim().toUpperCase();

    return mapUnits.filter((unit) => {
      if (!selectedUnitName) return true;

      return unit.unit_name.toUpperCase() === selectedUnitName;
    });
  }, [mapUnits, unitQuery]);

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    setAppliedYear(nextYear);
  }

  function handleMonthChange(nextMonth: DashboardMonthFilter) {
    setMonth(nextMonth);
    setAppliedMonth(nextMonth);
  }

  const trendData = useMemo<FunctionTrendDatum[]>(() => {
    if (activeTrendFunction === "PENDAPATAN") {
      return revenueTrend.map((item) => ({
        label: item.label,
        value: item.total_revenue,
      }));
    }

    return buildStaticTrend(appliedYear, activeTrendFunction);
  }, [activeTrendFunction, appliedYear, revenueTrend]);

  const trendConfig = useMemo(
    () => getTrendConfig(activeTrendFunction),
    [activeTrendFunction]
  );

  const trendTotal = useMemo(() => {
    return trendData.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
  }, [trendData]);

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
          source="ALL"
          unitQuery={unitQuery}
          onYearChange={handleYearChange}
          onMonthChange={handleMonthChange}
          onSourceChange={() => undefined}
          onUnitQueryChange={setUnitQuery}
          allowAllMonths
          showPeriodFilter={false}
          showSourceFilter={false}
          showActions={false}
          unitLabel="Unit"
          unitMode="select"
          unitOptions={unitOptions}
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
                subtitle="Pendapatan periode terpilih"
                icon={<BarChart3 size={22} />}
              />

              <KpiCard
                title="Capaian"
                value={
                  comparison?.growth_pct !== null &&
                  comparison?.growth_pct !== undefined
                    ? formatPercent(comparison.growth_pct)
                    : "-"
                }
                subtitle={
                  comparison
                    ? `vs ${comparison.label}`
                    : "Perbandingan tahun sebelumnya"
                }
                icon={<Percent size={22} />}
                trend={
                  comparison?.growth_pct !== null &&
                  comparison?.growth_pct !== undefined
                    ? {
                        value: formatPercent(comparison.growth_pct),
                        direction: getGrowthDirection(comparison.growth_pct),
                      }
                    : undefined
                }
              />

              <KpiCard
                title="Total Pelayanan"
                value={formatNumber(staticFunctionMetrics.totalPelayanan)}
                subtitle="Static awal modul pelayanan"
                icon={<Users size={22} />}
              />

              <KpiCard
                title="SLA Pelayanan"
                value={formatPercent(staticFunctionMetrics.slaPelayanan)}
                subtitle="Static awal modul pelayanan"
                icon={<ShieldCheck size={22} />}
              />

              <KpiCard
                title="Total Kecelakaan"
                value={formatNumber(staticFunctionMetrics.totalKecelakaan)}
                subtitle="Static awal modul kecelakaan"
                icon={<HeartPulse size={22} />}
              />

              <KpiCard
                title="Total Kegiatan"
                value={formatNumber(staticFunctionMetrics.totalKegiatan)}
                subtitle="Static awal modul kegiatan"
                icon={<CalendarCheck2 size={22} />}
              />
            </section>

            <section className="flex flex-wrap gap-2">
              {trendFunctionOptions.map(({ value, label, Icon }) => {
                const isActive = activeTrendFunction === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveTrendFunction(value)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-[8px] border px-4 text-sm font-semibold transition ${
                      isActive
                        ? "border-[#1f4fea] bg-[#1f4fea] text-white shadow-sm"
                        : "border-[#dce3ed] bg-white text-slate-700 hover:border-[#1f4fea] hover:text-[#1f4fea]"
                    }`}
                    aria-pressed={isActive}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                );
              })}
            </section>

            <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                title="Analisis Tren"
                action={
                  <div className="flex items-center gap-2 rounded-[7px] border border-[#dce3ed] bg-[#f8fafc] px-3 py-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Total YtD
                    </span>
                    <span className="text-sm font-bold text-slate-950">
                      {trendConfig.formatter(trendTotal)}
                    </span>
                  </div>
                }
              >
                <FunctionTrendChart
                  data={trendData}
                  valueLabel={trendConfig.valueLabel}
                  valueFormatter={trendConfig.formatter}
                  compactFormatter={trendConfig.formatter}
                  color={trendConfig.color}
                />
              </SectionCard>

              <SectionCard title="Top 5 Unit">
                <TopUnitsCard
                  units={filteredUnits}
                  source="ALL"
                  year={appliedYear}
                  month={appliedMonth}
                />
              </SectionCard>
            </section>

            <SectionCard title="Peta Interaktif Jawa Timur">
              <RevenueMap
                units={filteredMapUnits}
                source="ALL"
                year={appliedYear}
                month={appliedMonth}
                detailFunction={activeTrendFunction}
              />
            </SectionCard>

            <SectionCard title="Ringkasan Performa Wilayah">
              <RevenueSummaryTable
                units={filteredUnits}
                source="ALL"
                year={appliedYear}
                month={appliedMonth}
              />
            </SectionCard>

            <LatestActivitiesSection />

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
