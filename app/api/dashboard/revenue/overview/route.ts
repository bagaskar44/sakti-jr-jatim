import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getMonthsForFilter,
  resolveRevenuePeriodFilter,
  type RevenueMonthFilter,
} from "@/lib/dashboard/period";

export const dynamic = "force-dynamic";

type OverviewRow = {
  batch_id?: string | null;
  period_year: number | string;
  period_month: number | string;
  uploaded_at?: string | null;
  swdkllj_total?: number | string | null;
  iwkbu_total?: number | string | null;
  iwkl_total?: number | string | null;
  total_revenue?: number | string | null;
  swdkllj_transaction_count?: number | string | null;
  iwkl_passenger_count?: number | string | null;
  iwkbu_growth_pct?: number | string | null;
};

type CompositionRow = {
  source_name: string;
  amount: number | string | null;
};

type UnitRow = {
  unit_name: string;
  swdkllj_total: number | string | null;
  iwkbu_total: number | string | null;
  iwkl_total: number | string | null;
  total_revenue: number | string | null;
};

type TrendRow = {
  period_month: number | string;
  swdkllj_total?: number | string | null;
  iwkbu_total?: number | string | null;
  iwkl_total?: number | string | null;
  total_revenue: number | string | null;
};

type UnitTrendRow = TrendRow & {
  unit_name: string;
};

const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const SHORT_MONTH_LABELS = [
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

function toNumber(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isNaN(result) ? 0 : result;
}

function normalizeDashboardUnitName(value: unknown) {
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

function getMonthLabel(month: number) {
  return MONTH_LABELS[month - 1] ?? String(month);
}

function getShortMonthLabel(month: number) {
  return SHORT_MONTH_LABELS[month - 1] ?? String(month);
}

function getTrendMonthsForYear(year: number, now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;

  return Array.from({ length: endMonth }, (_, index) => index + 1);
}

function getPeriodLabel(
  year: number,
  month: RevenueMonthFilter,
  months: number[],
  cutoffDay?: number | null
) {
  if (month !== "ALL") {
    return cutoffDay
      ? `1-${cutoffDay} ${getMonthLabel(month)} ${year}`
      : `${getMonthLabel(month)} ${year}`;
  }

  if (months.length === 0) return `Semua Bulan ${year}`;

  if (cutoffDay && months.length > 1) {
    return `${getMonthLabel(months[0])}-${cutoffDay} ${getMonthLabel(
      months[months.length - 1]
    )} ${year}`;
  }

  if (cutoffDay && months.length === 1) {
    return `1-${cutoffDay} ${getMonthLabel(months[0])} ${year}`;
  }

  return `${getMonthLabel(months[0])}-${getMonthLabel(
    months[months.length - 1]
  )} ${year}`;
}

function calculateGrowthPct(current: number, previous: number) {
  if (previous <= 0) return null;

  return ((current - previous) / previous) * 100;
}

function aggregateOverview(
  rows: OverviewRow[],
  year: number,
  month: RevenueMonthFilter
) {
  const latestUploadedAt = rows
    .map((row) => row.uploaded_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    batch_id:
      month === "ALL"
        ? `aggregate-${year}`
        : rows[0]?.batch_id ?? `period-${year}-${month}`,
    period_year: year,
    period_month: month === "ALL" ? 0 : month,
    uploaded_at: latestUploadedAt ?? rows[0]?.uploaded_at ?? null,
    swdkllj_total: rows.reduce(
      (sum, row) => sum + toNumber(row.swdkllj_total),
      0
    ),
    iwkbu_total: rows.reduce((sum, row) => sum + toNumber(row.iwkbu_total), 0),
    iwkl_total: rows.reduce((sum, row) => sum + toNumber(row.iwkl_total), 0),
    total_revenue: rows.reduce(
      (sum, row) => sum + toNumber(row.total_revenue),
      0
    ),
    swdkllj_transaction_count: rows.reduce(
      (sum, row) => sum + toNumber(row.swdkllj_transaction_count),
      0
    ),
    iwkl_passenger_count: rows.reduce(
      (sum, row) => sum + toNumber(row.iwkl_passenger_count),
      0
    ),
    iwkbu_growth_pct: null,
  };
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getComparisonCutoff(
  year: number,
  month: RevenueMonthFilter,
  now = new Date()
) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  if (year !== currentYear) return null;

  if (month !== "ALL" && month !== currentMonth) return null;

  const lastDay = getLastDayOfMonth(year, currentMonth);

  if (currentDay >= lastDay) return null;

  return {
    month: currentMonth,
    day: currentDay,
  };
}

function scaleNumber(value: unknown, ratio: number) {
  return toNumber(value) * ratio;
}

function applyComparisonCutoff(
  rows: OverviewRow[],
  previousYear: number,
  cutoff: { month: number; day: number } | null
) {
  if (!cutoff) return rows;

  const previousMonthDays = getLastDayOfMonth(previousYear, cutoff.month);
  const ratio = cutoff.day / previousMonthDays;

  return rows.map((row) => {
    if (Number(row.period_month) !== cutoff.month) return row;

    return {
      ...row,
      swdkllj_total: scaleNumber(row.swdkllj_total, ratio),
      iwkbu_total: scaleNumber(row.iwkbu_total, ratio),
      iwkl_total: scaleNumber(row.iwkl_total, ratio),
      total_revenue: scaleNumber(row.total_revenue, ratio),
      swdkllj_transaction_count: scaleNumber(
        row.swdkllj_transaction_count,
        ratio
      ),
      iwkl_passenger_count: scaleNumber(row.iwkl_passenger_count, ratio),
    };
  });
}

function aggregateComposition(rows: CompositionRow[]) {
  const bySource = new Map<string, number>();

  for (const row of rows) {
    bySource.set(
      row.source_name,
      (bySource.get(row.source_name) ?? 0) + toNumber(row.amount)
    );
  }

  return Array.from(bySource.entries())
    .map(([source_name, amount]) => ({ source_name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function aggregateUnits(rows: UnitRow[]) {
  const byUnit = new Map<string, UnitRow>();

  for (const row of rows) {
    const current = byUnit.get(row.unit_name) ?? {
      unit_name: row.unit_name,
      swdkllj_total: 0,
      iwkbu_total: 0,
      iwkl_total: 0,
      total_revenue: 0,
    };

    byUnit.set(row.unit_name, {
      unit_name: row.unit_name,
      swdkllj_total:
        toNumber(current.swdkllj_total) + toNumber(row.swdkllj_total),
      iwkbu_total: toNumber(current.iwkbu_total) + toNumber(row.iwkbu_total),
      iwkl_total: toNumber(current.iwkl_total) + toNumber(row.iwkl_total),
      total_revenue:
        toNumber(current.total_revenue) + toNumber(row.total_revenue),
    });
  }

  return Array.from(byUnit.values()).sort(
    (a, b) => toNumber(b.total_revenue) - toNumber(a.total_revenue)
  );
}

function createEmptyTrendTotals() {
  return {
    swdkllj_total: 0,
    iwkbu_total: 0,
    iwkl_total: 0,
    total_revenue: 0,
  };
}

function addTrendTotals(
  current: ReturnType<typeof createEmptyTrendTotals>,
  row: TrendRow
) {
  current.swdkllj_total += toNumber(row.swdkllj_total);
  current.iwkbu_total += toNumber(row.iwkbu_total);
  current.iwkl_total += toNumber(row.iwkl_total);
  current.total_revenue += toNumber(row.total_revenue);
}

function buildTrend(rows: TrendRow[], months: number[]) {
  const byMonth = new Map<number, ReturnType<typeof createEmptyTrendTotals>>();

  for (const row of rows) {
    const month = Number(row.period_month);
    const current = byMonth.get(month) ?? createEmptyTrendTotals();

    addTrendTotals(current, row);
    byMonth.set(month, current);
  }

  return months.map((month) => ({
    month,
    label: getShortMonthLabel(month),
    ...(byMonth.get(month) ?? createEmptyTrendTotals()),
  }));
}

function buildUnitTrends(rows: UnitTrendRow[], months: number[]) {
  const byUnit = new Map<string, UnitTrendRow[]>();

  for (const row of rows) {
    const unitName = normalizeDashboardUnitName(row.unit_name);

    if (!unitName) continue;

    const unitRows = byUnit.get(unitName) ?? [];

    unitRows.push(row);
    byUnit.set(unitName, unitRows);
  }

  return Array.from(byUnit.entries())
    .map(([unit_name, unitRows]) => ({
      unit_name,
      trend: buildTrend(unitRows, months),
    }))
    .sort((a, b) => a.unit_name.localeCompare(b.unit_name, "id-ID"));
}

function getTrendDisplayMonths(rows: TrendRow[], months: number[]) {
  const availableMonths = rows
    .map((row) => Number(row.period_month))
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);

  if (availableMonths.length === 0) return months;

  const maxAvailableMonth = Math.max(...availableMonths);

  return months.filter((month) => month <= maxAvailableMonth);
}

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const period = await resolveRevenuePeriodFilter(supabase, request);

    if (!period.success) {
      return NextResponse.json(
        {
          success: false,
          message: period.message,
        },
        { status: 400 }
      );
    }

    const { periodYear, periodMonth } = period;
    const months = getMonthsForFilter(periodYear, periodMonth);
    const previousYear = periodYear - 1;
    const previousMonths = months;
    const comparisonCutoff = getComparisonCutoff(periodYear, periodMonth);
    const trendMonths = getTrendMonthsForYear(periodYear);

    const { data: overviewRows, error: overviewError } = await supabase
      .from("v_revenue_overview_monthly")
      .select("*")
      .eq("period_year", periodYear)
      .in("period_month", months);

    if (overviewError) {
      throw new Error(overviewError.message);
    }

    if (!overviewRows || overviewRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Data overview pendapatan tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const overview = aggregateOverview(
      overviewRows as OverviewRow[],
      periodYear,
      periodMonth
    );

    const { data: previousOverviewRows, error: previousOverviewError } =
      await supabase
        .from("v_revenue_overview_monthly")
        .select("*")
        .eq("period_year", previousYear)
        .in("period_month", previousMonths);

    if (previousOverviewError) {
      throw new Error(previousOverviewError.message);
    }

    const previousOverview = aggregateOverview(
      applyComparisonCutoff(
        (previousOverviewRows ?? []) as OverviewRow[],
        previousYear,
        comparisonCutoff
      ),
      previousYear,
      periodMonth
    );

    const { data: composition, error: compositionError } = await supabase
      .from("v_revenue_source_composition")
      .select("*")
      .eq("period_year", periodYear)
      .in("period_month", months)
      .order("amount", { ascending: false });

    if (compositionError) {
      throw new Error(compositionError.message);
    }

    const { data: topUnits, error: topUnitsError } = await supabase
      .from("v_revenue_by_unit_monthly")
      .select("*")
      .eq("period_year", periodYear)
      .in("period_month", months)
      .order("total_revenue", { ascending: false })
      .limit(periodMonth === "ALL" ? 2000 : 10);

    if (topUnitsError) {
      throw new Error(topUnitsError.message);
    }

    const { data: trendRows, error: trendError } = await supabase
      .from("v_revenue_overview_monthly")
      .select(
        "period_month, swdkllj_total, iwkbu_total, iwkl_total, total_revenue"
      )
      .eq("period_year", periodYear)
      .in("period_month", trendMonths)
      .order("period_month", { ascending: true });

    if (trendError) {
      throw new Error(trendError.message);
    }

    const trendDisplayMonths = getTrendDisplayMonths(
      (trendRows ?? []) as TrendRow[],
      trendMonths
    );

    const { data: unitTrendRows, error: unitTrendError } = await supabase
      .from("v_revenue_by_unit_monthly")
      .select(
        "period_month, unit_name, swdkllj_total, iwkbu_total, iwkl_total, total_revenue"
      )
      .eq("period_year", periodYear)
      .in("period_month", trendDisplayMonths)
      .order("period_month", { ascending: true });

    if (unitTrendError) {
      throw new Error(unitTrendError.message);
    }

    const comparisonGrowthPct = calculateGrowthPct(
      overview.total_revenue,
      previousOverview.total_revenue
    );

    return NextResponse.json({
      success: true,
      period: {
        year: periodYear,
        month: periodMonth,
        source: period.source,
        months,
        label: getPeriodLabel(periodYear, periodMonth, months),
      },
      overview,
      comparison: {
        previous_year: previousYear,
        previous_month: periodMonth,
        previous_months: previousMonths,
        previous_total_revenue: previousOverview.total_revenue,
        growth_pct: comparisonGrowthPct,
        label: getPeriodLabel(
          previousYear,
          periodMonth,
          previousMonths,
          comparisonCutoff?.day
        ),
        is_partial_period: Boolean(comparisonCutoff),
      },
      composition: aggregateComposition((composition ?? []) as CompositionRow[]),
      top_units: aggregateUnits((topUnits ?? []) as UnitRow[]).slice(0, 10),
      trend: buildTrend((trendRows ?? []) as TrendRow[], trendDisplayMonths),
      unit_trends: buildUnitTrends(
        (unitTrendRows ?? []) as UnitTrendRow[],
        trendDisplayMonths
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data overview pendapatan.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
