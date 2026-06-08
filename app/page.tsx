"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  ChevronDown,
  ChevronUp,
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
import { LatestActivitiesOverviewSection } from "@/components/dashboard/LatestActivitiesOverviewSection";
import { LatestActivitiesSection } from "@/components/dashboard/LatestActivitiesSection";
import { RevenueSummaryTable } from "@/components/dashboard/RevenueSummaryTable";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { TopUnitsCard } from "@/components/dashboard/TopUnitsCard";
import { readApiJson } from "@/lib/api-client";
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
  swdkllj_total?: number | string;
  iwkbu_total?: number | string;
  iwkl_total?: number | string;
  total_revenue: number;
};

type UnitRevenueTrendItem = {
  unit_name: string;
  trend: RevenueTrendItem[];
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
  unit_trends: UnitRevenueTrendItem[];
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
  { value: "PENDAPATAN" as const, label: "Pendapatan" },
  { value: "PELAYANAN" as const, label: "Pelayanan" },
  { value: "KECELAKAAN" as const, label: "Kecelakaan" },
];

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

function calculateGrowthPct(current: number, previous: number) {
  if (previous <= 0) return null;

  return ((current - previous) / previous) * 100;
}

function toNumber(value: number | string | null | undefined) {
  const result = Number(value ?? 0);

  return Number.isNaN(result) ? 0 : result;
}

function getMonthQueryValue(month: DashboardMonthFilter) {
  return month === "ALL" ? "all" : String(month);
}

function normalizeDashboardUnitName(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  if (normalized === "LOKET KANTOR WILAYAH JAWA TIMUR") {
    return "KANTOR WILAYAH JAWA TIMUR";
  }

  if (
    normalized.startsWith("LOKET KANTOR CABANG ") ||
    normalized.startsWith("LOKET KANTOR PELAYANAN ")
  ) {
    return normalized.replace("LOKET ", "");
  }

  return normalized;
}

function getTrendRowsForUnit(
  unitTrends: UnitRevenueTrendItem[],
  unitName: string
) {
  const normalizedUnitName = normalizeDashboardUnitName(unitName);

  if (!normalizedUnitName) return [];

  return (
    unitTrends.find(
      (item) => normalizeDashboardUnitName(item.unit_name) === normalizedUnitName
    )?.trend ?? []
  );
}

function getUnitRowsForFilter(units: UnitRow[], unitName: string) {
  const normalizedUnitName = normalizeDashboardUnitName(unitName);

  if (!normalizedUnitName) return units;

  return units.filter(
    (unit) => normalizeDashboardUnitName(unit.unit_name) === normalizedUnitName
  );
}

function sumUnitRevenue(units: UnitRow[]) {
  return units.reduce((sum, unit) => sum + toNumber(unit.total_revenue), 0);
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
  functionName: Exclude<TrendFunction, "PENDAPATAN">,
  unitName = ""
): FunctionTrendDatum[] {
  const unitFactor = unitName
    ? 0.72 + (normalizeDashboardUnitName(unitName).length % 9) * 0.035
    : 1;

  return getTrendMonthsForYear(year).map((month) => ({
    label: shortMonthLabels[month - 1] ?? String(month),
    value: Math.round((staticTrendValues[functionName][month - 1] ?? 0) * unitFactor),
  }));
}

function getKpiMonthCount(year: number, month: DashboardMonthFilter) {
  return month === "ALL" ? getTrendMonthsForYear(year).length : 1;
}

function getKpiMonthNumber(year: number, month: DashboardMonthFilter) {
  if (month !== "ALL") return month;

  const months = getTrendMonthsForYear(year);

  return months.at(-1) ?? 12;
}

function getKpiPeriodScale(year: number, month: DashboardMonthFilter) {
  const monthNumber = getKpiMonthNumber(year, month);

  return 0.9 + monthNumber * 0.015 + (year - 2026) * 0.025;
}

function getStaticPelayananTotal(
  units: UnitRow[],
  year: number,
  month: DashboardMonthFilter
) {
  const monthCount = getKpiMonthCount(year, month);
  const periodScale = getKpiPeriodScale(year, month);

  return units.reduce((sum, unit) => {
    const base = 90 + (normalizeDashboardUnitName(unit.unit_name).length % 7) * 11;

    return sum + Math.round(base * monthCount * periodScale);
  }, 0);
}

function getStaticKecelakaanTotal(
  units: UnitRow[],
  year: number,
  month: DashboardMonthFilter
) {
  const monthCount = getKpiMonthCount(year, month);
  const periodScale = getKpiPeriodScale(year, month);

  return units.reduce((sum, unit) => {
    const base = 8 + (normalizeDashboardUnitName(unit.unit_name).length % 5) * 3;

    return sum + Math.round(base * monthCount * periodScale);
  }, 0);
}

function getStaticKegiatanTotal(
  units: UnitRow[],
  year: number,
  month: DashboardMonthFilter
) {
  const monthCount = getKpiMonthCount(year, month);
  const monthNumber = getKpiMonthNumber(year, month);
  const yearOffset = Math.max(0, year - 2024);

  return units.reduce((sum, unit) => {
    const base = 2 + (normalizeDashboardUnitName(unit.unit_name).length % 4);

    return sum + base * monthCount + Math.floor((monthNumber + yearOffset) / 4);
  }, 0);
}

function getStaticSlaPelayanan(
  units: UnitRow[],
  year: number,
  month: DashboardMonthFilter
) {
  if (units.length === 0) return null;

  const monthNumber = getKpiMonthNumber(year, month);
  const unitAverage =
    units.reduce((sum, unit) => {
      return sum + 94.2 + (normalizeDashboardUnitName(unit.unit_name).length % 6) * 0.55;
    }, 0) / units.length;
  const adjustedValue = unitAverage + (monthNumber - 6) * 0.08 + (year - 2026) * 0.18;

  return Math.min(99.2, Math.max(90, adjustedValue));
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
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const trendTabsRef = useRef<HTMLElement | null>(null);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [unitRevenueTrends, setUnitRevenueTrends] = useState<
    UnitRevenueTrendItem[]
  >([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [previousUnits, setPreviousUnits] = useState<UnitRow[]>([]);
  const [mapUnits, setMapUnits] = useState<RevenueMapUnit[]>([]);
  const [selectedMapUnitId, setSelectedMapUnitId] = useState<string | null>(
    null
  );
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
      const previousYear = targetYear - 1;
      const [
        overviewResponse,
        unitsResponse,
        previousUnitsResponse,
        mapResponse,
      ] = await Promise.all([
        fetch(
          `/api/dashboard/revenue/overview?year=${targetYear}&month=${monthQuery}`
        ),
        fetch(
          `/api/dashboard/revenue/units?year=${targetYear}&month=${monthQuery}&limit=200`
        ),
        fetch(
          `/api/dashboard/revenue/units?year=${previousYear}&month=${monthQuery}&limit=200`
        ),
        fetch(
          `/api/dashboard/revenue/map?year=${targetYear}&month=${monthQuery}`
        ),
      ]);

      const overviewJson = await readApiJson<OverviewResponse>(
        overviewResponse,
        "Gagal mengambil data overview."
      );
      const unitsJson = await readApiJson<UnitsResponse>(
        unitsResponse,
        "Gagal mengambil data unit."
      );
      const previousUnitsJson = await readApiJson<UnitsResponse>(
        previousUnitsResponse,
        "Gagal mengambil data unit pembanding."
      );
      const mapJson = await readApiJson<MapResponse>(
        mapResponse,
        "Gagal mengambil data peta."
      );

      setOverview(overviewJson.overview);
      setComparison(overviewJson.comparison ?? null);
      setRevenueTrend(overviewJson.trend ?? []);
      setUnitRevenueTrends(overviewJson.unit_trends ?? []);
      setUnits(unitsJson.data ?? []);
      setPreviousUnits(previousUnitsJson.data ?? []);
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

  const [isTrendTabsSticky, setIsTrendTabsSticky] = useState(false);

  useEffect(() => {
    function updateStickyState() {
      const tabs = trendTabsRef.current;
      if (!tabs) return;

      const nextIsSticky = tabs.getBoundingClientRect().top <= 0 && window.scrollY > 0;
      setIsTrendTabsSticky((current) =>
        current === nextIsSticky ? current : nextIsSticky
      );
    }

    updateStickyState();
    window.addEventListener("scroll", updateStickyState, { passive: true });
    window.addEventListener("resize", updateStickyState);

    return () => {
      window.removeEventListener("scroll", updateStickyState);
      window.removeEventListener("resize", updateStickyState);
    };
  }, []);

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

  const selectedMapUnit = useMemo(() => {
    if (!selectedMapUnitId) return null;

    return (
      filteredMapUnits.find((unit) => unit.id === selectedMapUnitId) ?? null
    );
  }, [filteredMapUnits, selectedMapUnitId]);

  const isUnitFilterActive = unitQuery.trim().length > 0;
  const kpiMetrics = useMemo(() => {
    const selectedUnitName = unitQuery.trim();
    const currentUnitRows = filteredUnits;
    const previousUnitRows = selectedUnitName
      ? getUnitRowsForFilter(previousUnits, selectedUnitName)
      : previousUnits;
    const currentRevenue = isUnitFilterActive
      ? sumUnitRevenue(currentUnitRows)
      : overview?.total_revenue ?? sumUnitRevenue(currentUnitRows);
    const previousRevenue = isUnitFilterActive
      ? sumUnitRevenue(previousUnitRows)
      : comparison?.previous_total_revenue ?? 0;
    const growthPct = isUnitFilterActive
      ? calculateGrowthPct(currentRevenue, previousRevenue)
      : comparison?.growth_pct ?? null;
    const totalPelayanan = getStaticPelayananTotal(
      currentUnitRows,
      appliedYear,
      appliedMonth
    );
    const slaPelayanan = getStaticSlaPelayanan(
      currentUnitRows,
      appliedYear,
      appliedMonth
    );
    const totalKecelakaan = getStaticKecelakaanTotal(
      currentUnitRows,
      appliedYear,
      appliedMonth
    );
    const totalKegiatan = getStaticKegiatanTotal(
      currentUnitRows,
      appliedYear,
      appliedMonth
    );

    return {
      currentRevenue,
      growthPct,
      totalPelayanan,
      slaPelayanan,
      totalKecelakaan,
      totalKegiatan,
    };
  }, [
    appliedMonth,
    appliedYear,
    comparison,
    filteredUnits,
    isUnitFilterActive,
    overview,
    previousUnits,
    unitQuery,
  ]);
  const kpiScopeSubtitle = isUnitFilterActive
    ? "Unit dan periode terpilih"
    : "Periode terpilih";

  useEffect(() => {
    if (selectedMapUnitId && !selectedMapUnit) {
      const timeoutId = window.setTimeout(() => {
        setSelectedMapUnitId(null);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [selectedMapUnit, selectedMapUnitId]);

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    setAppliedYear(nextYear);
    setIsSummaryExpanded(false);
    setSelectedMapUnitId(null);
  }

  function handleMonthChange(nextMonth: DashboardMonthFilter) {
    setMonth(nextMonth);
    setAppliedMonth(nextMonth);
    setIsSummaryExpanded(false);
    setSelectedMapUnitId(null);
  }

  function handleUnitQueryChange(nextUnitQuery: string) {
    setUnitQuery(nextUnitQuery);
    setIsSummaryExpanded(false);
    setSelectedMapUnitId(null);
  }

  const trendData = useMemo<FunctionTrendDatum[]>(() => {
    if (activeTrendFunction === "PENDAPATAN") {
      const selectedUnitName = unitQuery.trim();
      const activeTrendRows = selectedUnitName
        ? getTrendRowsForUnit(unitRevenueTrends, selectedUnitName)
        : revenueTrend;

      return activeTrendRows.map((item) => ({
        label: item.label,
        value: item.total_revenue,
      }));
    }

    return buildStaticTrend(appliedYear, activeTrendFunction, unitQuery);
  }, [
    activeTrendFunction,
    appliedYear,
    revenueTrend,
    unitQuery,
    unitRevenueTrends,
  ]);

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
          onUnitQueryChange={handleUnitQueryChange}
          allowAllMonths
          showPeriodFilter={false}
          showSourceFilter={false}
          showActions={false}
          unitLabel="Unit"
          unitMode="select"
          unitOptions={unitOptions}
        />

        {loading && (
          <div className="jr-state p-6 text-center text-sm font-semibold text-slate-500">
            Memuat data dashboard...
          </div>
        )}

        {error && (
          <div className="rounded-[6.4px] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && overview && (
          <>
            <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <KpiCard
                title="Total Pendapatan"
                value={formatRupiah(kpiMetrics.currentRevenue)}
                subtitle={kpiScopeSubtitle}
                icon={<BarChart3 size={17.6} />}
              />

              <KpiCard
                title="Capaian"
                value={
                  kpiMetrics.growthPct !== null &&
                  kpiMetrics.growthPct !== undefined
                    ? formatPercent(kpiMetrics.growthPct)
                    : "-"
                }
                subtitle={
                  isUnitFilterActive
                    ? "vs periode sama tahun sebelumnya"
                    : comparison
                    ? `vs ${comparison.label}`
                    : "Perbandingan tahun sebelumnya"
                }
                icon={<Percent size={17.6} />}
                trend={
                  kpiMetrics.growthPct !== null &&
                  kpiMetrics.growthPct !== undefined
                    ? {
                        value: formatPercent(kpiMetrics.growthPct),
                        direction: getGrowthDirection(kpiMetrics.growthPct),
                      }
                    : undefined
                }
              />

              <KpiCard
                title="Total Pelayanan"
                value={formatNumber(kpiMetrics.totalPelayanan)}
                subtitle={kpiScopeSubtitle}
                icon={<Users size={17.6} />}
              />

              <KpiCard
                title="SLA Pelayanan"
                value={
                  kpiMetrics.slaPelayanan === null
                    ? "-"
                    : formatPercent(kpiMetrics.slaPelayanan)
                }
                subtitle={kpiScopeSubtitle}
                icon={<ShieldCheck size={17.6} />}
              />

              <KpiCard
                title="Total Kecelakaan"
                value={formatNumber(kpiMetrics.totalKecelakaan)}
                subtitle={kpiScopeSubtitle}
                icon={<HeartPulse size={17.6} />}
              />

              <KpiCard
                title="Total Kegiatan"
                value={formatNumber(kpiMetrics.totalKegiatan)}
                subtitle={kpiScopeSubtitle}
                icon={<CalendarCheck2 size={17.6} />}
              />
            </section>

            <section
              ref={trendTabsRef}
              className={`sticky top-0 z-30 -mx-5 flex flex-wrap gap-2 bg-[#f5f7fb] px-5 transition-[padding,box-shadow,border-color] duration-150 ${
                isTrendTabsSticky
                  ? "border-b border-[#dce3ed] py-2"
                  : "border-b border-transparent py-0"
              }`}
            >
              {trendFunctionOptions.map(({ value, label }) => {
                const isActive = activeTrendFunction === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveTrendFunction(value)}
                    className={`inline-flex min-h-11 items-center rounded-[6.4px] border px-4 text-sm font-semibold transition ${
                      isActive
                        ? "border-[#1f4fea] bg-[#1f4fea] text-white shadow-sm"
                        : "border-[#dce3ed] bg-white text-slate-700 hover:border-[#1f4fea] hover:text-[#1f4fea]"
                    }`}
                    aria-pressed={isActive}
                  >
                    {label}
                  </button>
                );
              })}
            </section>

            <section
              className={`grid grid-cols-1 items-stretch gap-4 ${
                isUnitFilterActive
                  ? ""
                  : "xl:grid-cols-[1.15fr_0.85fr]"
              }`}
            >
              <SectionCard
                title={`Analisis Tren ${trendConfig.valueLabel}`}
                action={
                  <div className="flex items-center gap-2 rounded-[5.6px] border border-[#dce3ed] bg-[#f8fafc] px-3 py-1.5">
                    <span className="text-[8.8px] font-bold uppercase tracking-[0.08em] text-slate-500">
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

              {!isUnitFilterActive && (
                <SectionCard
                  title={`Top 5 Unit Berdasarkan ${trendConfig.valueLabel}`}
                >
                  <TopUnitsCard
                    units={filteredUnits}
                    source="ALL"
                    year={appliedYear}
                    month={appliedMonth}
                    functionName={activeTrendFunction}
                  />
                </SectionCard>
              )}
            </section>

            <section>
              <SectionCard
                title="Peta Interaktif Jawa Timur"
                className="flex h-full min-w-0 flex-col"
              >
                <div
                  className="grid min-h-[288px] grid-cols-1 gap-4 lg:min-h-[304px] 2xl:grid-cols-[minmax(0,1.35fr)_minmax(256px,0.65fr)]"
                >
                  <RevenueMap
                    units={filteredMapUnits}
                    source="ALL"
                    year={appliedYear}
                    month={appliedMonth}
                    detailFunction={activeTrendFunction}
                    selectedUnitId={selectedMapUnit?.id ?? null}
                    onSelectedUnitChange={(unit) =>
                      setSelectedMapUnitId(unit.id)
                    }
                  />

                  <LatestActivitiesSection
                    className="min-w-0"
                    selectedUnit={selectedMapUnit}
                  />
                </div>
              </SectionCard>
            </section>

            <SectionCard
              title={`Ringkasan Performa Wilayah Berdasarkan ${trendConfig.valueLabel}`}
            >
              <RevenueSummaryTable
                units={filteredUnits}
                source="ALL"
                year={appliedYear}
                month={appliedMonth}
                functionName={activeTrendFunction}
                limit={isSummaryExpanded ? filteredUnits.length : 5}
                footerAction={
                  filteredUnits.length > 5 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setIsSummaryExpanded((current) => !current)
                      }
                      className="jr-button-secondary min-h-9 w-full px-3 text-xs sm:w-auto"
                    >
                      {isSummaryExpanded ? (
                        <>
                          <ChevronUp size={12} />
                          Sembunyikan
                        </>
                      ) : (
                        <>
                          <ChevronDown size={12} />
                          Selengkapnya
                        </>
                      )}
                    </button>
                  ) : null
                }
              />
            </SectionCard>

            <LatestActivitiesOverviewSection
              year={appliedYear}
              month={appliedMonth}
              unitQuery={unitQuery}
            />

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
