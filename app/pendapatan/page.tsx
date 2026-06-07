"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bus,
  CreditCard,
  ExternalLink,
  ReceiptText,
  Ship,
  Users,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { TopUnitsCard } from "@/components/dashboard/TopUnitsCard";
import { readApiJson } from "@/lib/api-client";
import {
  formatNumber,
  formatPercent,
  formatRupiah,
} from "@/lib/formatters";

type TabKey = "ALL" | "SWDKLLJ" | "IWKBU" | "IWKL";
type RevenueSourceKey = Exclude<TabKey, "ALL">;

type OverviewData = {
  batch_id: string;
  period_year: number;
  period_month: number;
  uploaded_at: string;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
  swdkllj_transaction_count: number | string;
  iwkl_passenger_count: number | string;
  iwkbu_growth_pct: number | string | null;
};

type CompositionItem = {
  source_name: string;
  amount: number | string;
};

type RevenueTrendItem = {
  month: number | string;
  label: string;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
};

type UnitRevenueTrendItem = {
  unit_name: string;
  trend: RevenueTrendItem[];
};

type UnitRow = {
  unit_name: string;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
  swdkllj_transaction_count?: number | string;
  iwkl_passenger_count?: number | string;
  iwkbu_growth_pct?: number | string | null;
};

type SwdklljRow = {
  unit_name: string;
  parent_unit_name: string | null;
  level: string;
  kd: number | string;
  sw: number | string;
  denda: number | string;
  setor_adjustment: number | string;
  total: number | string;
  transaction_count: number | string;
  is_drillable: boolean;
};

type IwkbuRow = {
  unit_name: string;
  parent_unit_name: string | null;
  level: string;
  ask_last_year: number | string;
  iwkbu_last_year: number | string;
  ask_current_year: number | string;
  iwkbu_current_year: number | string;
  ask_activity_pct: number | string;
  iwkbu_activity_pct: number | string;
  is_drillable: boolean;
};

type IwklRow = {
  unit_name: string;
  passenger_count: number | string;
  nominal: number | string;
  is_drillable: boolean;
};

type IwklDetailRow = {
  parent_unit_name: string;
  detail_type: string;
  passenger_count: number | string;
  nominal: number | string;
};

type DashboardMetrics = {
  swdkllj_total: number;
  iwkbu_total: number;
  iwkl_total: number;
  total_revenue: number;
  swdkllj_transaction_count: number;
  iwkl_passenger_count: number;
  iwkbu_growth_pct: number | string | null;
};

type OverviewResponse = {
  success: boolean;
  overview: OverviewData;
  composition: CompositionItem[];
  top_units: UnitRow[];
  trend: RevenueTrendItem[];
  unit_trends: UnitRevenueTrendItem[];
};

type SwdklljResponse = {
  success: boolean;
  data: SwdklljRow[];
};

type IwkbuResponse = {
  success: boolean;
  data: IwkbuRow[];
};

type IwklResponse = {
  success: boolean;
  summary: IwklRow[];
  details: IwklDetailRow[];
};

type SourceCompositionRow = {
  key: RevenueSourceKey;
  label: string;
  amount: number;
  color: string;
};

type PreviewContributorRow = {
  source: RevenueSourceKey;
  contributor_name: string;
  amount: number;
  note: string;
  hasData: boolean;
};

type SwdklljMetrics = {
  kd: number;
  sw: number;
  denda: number;
  setor_adjustment: number;
  total: number;
  transaction_count: number;
};

type IwkbuMetrics = {
  previous_total: number;
  current_total: number;
  growth_pct: number | null;
  active_points: number;
  top_contributor_name: string;
  top_contributor_amount: number;
  note: string;
};

type IwklMetrics = {
  total: number;
  passenger_count: number;
  top_operator_name: string;
  unit_contribution_pct: number;
  active_types: number;
  status: string;
};

const SOURCE_ORDER: RevenueSourceKey[] = ["SWDKLLJ", "IWKBU", "IWKL"];

const SOURCE_META: Record<
  RevenueSourceKey,
  { label: string; color: string }
> = {
  SWDKLLJ: {
    label: "SWDKLLJ",
    color: "#1f4fea",
  },
  IWKBU: {
    label: "IWKBU",
    color: "#10b981",
  },
  IWKL: {
    label: "IWKL",
    color: "#38bdf8",
  },
};

function toNumber(value: number | string | null | undefined) {
  const result = Number(value ?? 0);
  return Number.isNaN(result) ? 0 : result;
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

function getAmountBySource(unit: UnitRow, source: string) {
  if (source === "SWDKLLJ") return toNumber(unit.swdkllj_total);
  if (source === "IWKBU") return toNumber(unit.iwkbu_total);
  if (source === "IWKL") return toNumber(unit.iwkl_total);

  return toNumber(unit.total_revenue);
}

function getSourceLabel(sourceKey: string) {
  if (sourceKey === "SWDKLLJ") return "SWDKLLJ";
  if (sourceKey === "IWKBU") return "IWKBU";
  if (sourceKey === "IWKL") return "IWKL";

  return "Semua";
}

function parseTabKey(value: string | null): TabKey | null {
  const normalizedValue = value?.toUpperCase();

  if (
    normalizedValue === "ALL" ||
    normalizedValue === "SWDKLLJ" ||
    normalizedValue === "IWKBU" ||
    normalizedValue === "IWKL"
  ) {
    return normalizedValue;
  }

  return null;
}

function getGrowthDirection(value: number | string | null | undefined) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return "neutral";
  if (numberValue < 0) return "down";

  return "up";
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

function createDashboardUnit(unitName: string): UnitRow {
  return {
    unit_name: unitName,
    swdkllj_total: 0,
    iwkbu_total: 0,
    iwkl_total: 0,
    total_revenue: 0,
    swdkllj_transaction_count: 0,
    iwkl_passenger_count: 0,
    iwkbu_growth_pct: null,
  };
}

function getOrCreateUnit(units: Map<string, UnitRow>, unitName: string) {
  const normalizedName = normalizeDashboardUnitName(unitName);
  const current = units.get(normalizedName) ?? createDashboardUnit(normalizedName);

  units.set(normalizedName, current);

  return current;
}

function buildDashboardUnits({
  swdklljRows,
  iwkbuRows,
  iwklRows,
}: {
  swdklljRows: SwdklljRow[];
  iwkbuRows: IwkbuRow[];
  iwklRows: IwklRow[];
}) {
  const byUnit = new Map<string, UnitRow>();

  for (const row of swdklljRows) {
    if (!["KANWIL_DIRECT", "CABANG_SUMMARY"].includes(row.level)) continue;

    const unit = getOrCreateUnit(byUnit, row.unit_name);

    unit.swdkllj_total =
      toNumber(unit.swdkllj_total) + toNumber(row.total);
    unit.swdkllj_transaction_count =
      toNumber(unit.swdkllj_transaction_count) +
      toNumber(row.transaction_count);
  }

  for (const row of iwkbuRows) {
    if (row.level !== "SUMMARY") continue;

    const unit = getOrCreateUnit(byUnit, row.unit_name);

    unit.iwkbu_total =
      toNumber(unit.iwkbu_total) + toNumber(row.iwkbu_current_year);

    if (unit.iwkbu_growth_pct === null || unit.iwkbu_growth_pct === undefined) {
      unit.iwkbu_growth_pct = row.iwkbu_activity_pct;
    }
  }

  for (const row of iwklRows) {
    const unit = getOrCreateUnit(byUnit, row.unit_name);

    unit.iwkl_total = toNumber(unit.iwkl_total) + toNumber(row.nominal);
    unit.iwkl_passenger_count =
      toNumber(unit.iwkl_passenger_count) + toNumber(row.passenger_count);
  }

  return Array.from(byUnit.values())
    .map((unit) => ({
      ...unit,
      total_revenue:
        toNumber(unit.swdkllj_total) +
        toNumber(unit.iwkbu_total) +
        toNumber(unit.iwkl_total),
    }))
    .filter((unit) => toNumber(unit.total_revenue) > 0)
    .sort((a, b) => toNumber(b.total_revenue) - toNumber(a.total_revenue));
}

function calculateDashboardMetrics(
  units: UnitRow[],
  overview: OverviewData | null,
  hasSourceRows: boolean
): DashboardMetrics | null {
  if (!hasSourceRows && overview) {
    return {
      swdkllj_total: toNumber(overview.swdkllj_total),
      iwkbu_total: toNumber(overview.iwkbu_total),
      iwkl_total: toNumber(overview.iwkl_total),
      total_revenue: toNumber(overview.total_revenue),
      swdkllj_transaction_count: toNumber(
        overview.swdkllj_transaction_count
      ),
      iwkl_passenger_count: toNumber(overview.iwkl_passenger_count),
      iwkbu_growth_pct: overview.iwkbu_growth_pct,
    };
  }

  const swdklljTotal = units.reduce(
    (sum, unit) => sum + toNumber(unit.swdkllj_total),
    0
  );
  const iwkbuTotal = units.reduce(
    (sum, unit) => sum + toNumber(unit.iwkbu_total),
    0
  );
  const iwklTotal = units.reduce(
    (sum, unit) => sum + toNumber(unit.iwkl_total),
    0
  );

  return {
    swdkllj_total: swdklljTotal,
    iwkbu_total: iwkbuTotal,
    iwkl_total: iwklTotal,
    total_revenue: swdklljTotal + iwkbuTotal + iwklTotal,
    swdkllj_transaction_count: units.reduce(
      (sum, unit) => sum + toNumber(unit.swdkllj_transaction_count),
      0
    ),
    iwkl_passenger_count: units.reduce(
      (sum, unit) => sum + toNumber(unit.iwkl_passenger_count),
      0
    ),
    iwkbu_growth_pct: overview?.iwkbu_growth_pct ?? null,
  };
}

function getDetailHref({
  unitName,
  year,
  month,
  source,
}: {
  unitName: string;
  year: number;
  month: number;
  source: string;
}) {
  const params = new URLSearchParams();

  params.set("year", String(year));
  params.set("month", String(month));

  if (source !== "ALL") {
    params.set("source", source);
    params.set("tab", source);
  }

  params.set("unit", unitName);

  return `/pendapatan?${params.toString()}`;
}

function getMetricsForUnit(unit: UnitRow): DashboardMetrics {
  return {
    swdkllj_total: toNumber(unit.swdkllj_total),
    iwkbu_total: toNumber(unit.iwkbu_total),
    iwkl_total: toNumber(unit.iwkl_total),
    total_revenue: toNumber(unit.total_revenue),
    swdkllj_transaction_count: toNumber(unit.swdkllj_transaction_count),
    iwkl_passenger_count: toNumber(unit.iwkl_passenger_count),
    iwkbu_growth_pct: unit.iwkbu_growth_pct ?? null,
  };
}

function buildSourceCompositionFromMetrics(metrics: DashboardMetrics) {
  const amounts: Record<RevenueSourceKey, number> = {
    SWDKLLJ: metrics.swdkllj_total,
    IWKBU: metrics.iwkbu_total,
    IWKL: metrics.iwkl_total,
  };

  return SOURCE_ORDER.map((key) => ({
    key,
    label: SOURCE_META[key].label,
    amount: amounts[key],
    color: SOURCE_META[key].color,
  }));
}

function buildSwdklljOverviewMetrics(
  rows: SwdklljRow[],
  metrics: DashboardMetrics
) {
  return buildSwdklljMetrics({
    detailRows: rows,
    unit: {
      ...createDashboardUnit("JAWA TIMUR"),
      swdkllj_total: metrics.swdkllj_total,
      swdkllj_transaction_count: metrics.swdkllj_transaction_count,
    },
  });
}

function buildIwkbuOverviewMetrics(
  rows: IwkbuRow[],
  metrics: DashboardMetrics
) {
  return buildIwkbuMetrics({
    detailRows: rows,
    unit: {
      ...createDashboardUnit("JAWA TIMUR"),
      iwkbu_total: metrics.iwkbu_total,
      iwkbu_growth_pct: metrics.iwkbu_growth_pct,
    },
  });
}

function buildIwklOverviewMetrics({
  summaryRows,
  detailRows,
  metrics,
}: {
  summaryRows: IwklRow[];
  detailRows: IwklDetailRow[];
  metrics: DashboardMetrics;
}): IwklMetrics {
  const total =
    summaryRows.reduce((sum, row) => sum + toNumber(row.nominal), 0) ||
    metrics.iwkl_total;
  const passengerCount =
    summaryRows.reduce(
      (sum, row) => sum + toNumber(row.passenger_count),
      0
    ) || metrics.iwkl_passenger_count;
  const topUnit = [...summaryRows]
    .filter((row) => toNumber(row.nominal) > 0)
    .sort((a, b) => toNumber(b.nominal) - toNumber(a.nominal))[0];
  const operatorTotals = Array.from(
    detailRows
      .reduce((totals, row) => {
        const key = row.detail_type.trim() || "-";
        const current = totals.get(key) ?? {
          name: key,
          amount: 0,
          passenger_count: 0,
        };

        current.amount += toNumber(row.nominal);
        current.passenger_count += toNumber(row.passenger_count);
        totals.set(key, current);

        return totals;
      }, new Map<string, { name: string; amount: number; passenger_count: number }>())
      .values()
  );
  const topOperator = operatorTotals
    .filter((row) => row.amount > 0 || row.passenger_count > 0)
    .sort(
      (a, b) =>
        b.amount - a.amount || b.passenger_count - a.passenger_count
    )[0];
  const activeTypes = detailRows.filter(
    (row) => toNumber(row.nominal) > 0 || toNumber(row.passenger_count) > 0
  ).length;
  const topAmount = toNumber(topUnit?.nominal);

  return {
    total,
    passenger_count: passengerCount,
    top_operator_name: topOperator?.name ?? "-",
    unit_contribution_pct: total > 0 ? (topAmount / total) * 100 : 0,
    active_types:
      activeTypes ||
      summaryRows.filter(
        (row) => toNumber(row.nominal) > 0 || toNumber(row.passenger_count) > 0
      ).length,
    status: total > 0 || passengerCount > 0 ? "Data tersedia" : "Tidak ada data",
  };
}

function getSourceTotalFromMetrics(metrics: DashboardMetrics, sourceKey: TabKey) {
  if (sourceKey === "SWDKLLJ") return metrics.swdkllj_total;
  if (sourceKey === "IWKBU") return metrics.iwkbu_total;
  if (sourceKey === "IWKL") return metrics.iwkl_total;

  return metrics.total_revenue;
}

function getTrendTitle(activeTab: TabKey, selectedUnit: UnitRow | null) {
  const sourceLabel =
    activeTab === "ALL" ? "Pendapatan" : getSourceLabel(activeTab);
  const unitSuffix = selectedUnit ? ` ${selectedUnit.unit_name}` : "";

  return `Tren ${sourceLabel} Bulanan${unitSuffix}`;
}

function getHeaderSubtitle(selectedUnit: UnitRow | null, activeTab: TabKey) {
  if (!selectedUnit) {
    return activeTab === "ALL" ? undefined : getSourceLabel(activeTab);
  }

  const unitLabel = formatDisplayUnitName(selectedUnit.unit_name);

  if (activeTab === "ALL") return unitLabel;

  return `${unitLabel} / ${activeTab}`;
}

function getUnitRank(units: UnitRow[], unitName: string, sourceKey: TabKey) {
  const sortedUnits = [...units].sort(
    (a, b) => getAmountBySource(b, sourceKey) - getAmountBySource(a, sourceKey)
  );
  const index = sortedUnits.findIndex((unit) => unit.unit_name === unitName);

  return index >= 0 ? index + 1 : null;
}

function getTrendValueBySource(item: RevenueTrendItem, sourceKey: TabKey) {
  if (sourceKey === "SWDKLLJ") return toNumber(item.swdkllj_total);
  if (sourceKey === "IWKBU") return toNumber(item.iwkbu_total);
  if (sourceKey === "IWKL") return toNumber(item.iwkl_total);

  return toNumber(item.total_revenue);
}

function getTrendRowsForUnit(
  unitTrends: UnitRevenueTrendItem[],
  unitName: string
) {
  const normalizedUnitName = normalizeDashboardUnitName(unitName);

  return (
    unitTrends.find(
      (item) => normalizeDashboardUnitName(item.unit_name) === normalizedUnitName
    )?.trend ?? []
  );
}

function getRankingPreviewUnits(
  units: UnitRow[],
  selectedUnitName: string,
  sourceKey: TabKey
) {
  const sortedUnits = [...units].sort(
    (a, b) => getAmountBySource(b, sourceKey) - getAmountBySource(a, sourceKey)
  );
  const selectedIndex = sortedUnits.findIndex(
    (unit) => unit.unit_name === selectedUnitName
  );

  if (selectedIndex < 0 || selectedIndex < 5) {
    return sortedUnits.slice(0, 5);
  }

  return [...sortedUnits.slice(0, 4), sortedUnits[selectedIndex]];
}

function getInternalPreviewRows<T>({
  rows,
  source,
  getName,
  getAmount,
  notes,
  emptyNote,
}: {
  rows: T[];
  source: RevenueSourceKey;
  getName: (row: T) => string;
  getAmount: (row: T) => number;
  notes: [string, string];
  emptyNote: string;
}): PreviewContributorRow[] {
  const topRows = [...rows]
    .map((row) => ({
      source,
      contributor_name: getName(row),
      amount: getAmount(row),
      note: "",
      hasData: getAmount(row) > 0,
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 2)
    .map((row, index) => ({
      ...row,
      note: notes[index] ?? notes[1],
    }));

  if (topRows.length > 0) return topRows;

  return [
    {
      source,
      contributor_name: "Tidak ada data",
      amount: 0,
      note: emptyNote,
      hasData: false,
    },
  ];
}

function buildInternalContributorPreviewRows({
  swdklljRows,
  iwkbuRows,
  iwklRows,
}: {
  swdklljRows: SwdklljRow[];
  iwkbuRows: IwkbuRow[];
  iwklRows: IwklDetailRow[];
}) {
  return [
    ...getInternalPreviewRows({
      rows: swdklljRows,
      source: "SWDKLLJ",
      getName: (row) => row.unit_name,
      getAmount: (row) => toNumber(row.total),
      notes: ["Kontributor terbesar", "Kontributor tinggi"],
      emptyNote: "Tidak ada detail SWDKLLJ pada periode ini",
    }),
    ...getInternalPreviewRows({
      rows: iwkbuRows,
      source: "IWKBU",
      getName: (row) => row.unit_name,
      getAmount: (row) => toNumber(row.iwkbu_current_year),
      notes: ["IWKBU tertinggi", "IWKBU tinggi"],
      emptyNote: "Tidak ada detail IWKBU pada periode ini",
    }),
    ...getInternalPreviewRows({
      rows: iwklRows,
      source: "IWKL",
      getName: (row) => row.detail_type,
      getAmount: (row) => toNumber(row.nominal),
      notes: ["Nominal IWKL tertinggi", "Nominal IWKL tinggi"],
      emptyNote: "Tidak ada nominal pada periode ini",
    }),
  ];
}

function formatDisplayUnitName(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((part) => {
      if (["jr", "iwkl", "iwkbu", "swdkllj"].includes(part)) {
        return part.toUpperCase();
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function findSwdklljSummaryRow(rows: SwdklljRow[], unitName: string) {
  return rows.find(
    (row) =>
      ["KANWIL_DIRECT", "CABANG_SUMMARY"].includes(row.level) &&
      normalizeDashboardUnitName(row.unit_name) === unitName
  );
}

function findIwkbuSummaryRow(rows: IwkbuRow[], unitName: string) {
  return rows.find(
    (row) =>
      row.level === "SUMMARY" &&
      normalizeDashboardUnitName(row.unit_name) === unitName
  );
}

function buildSwdklljMetrics({
  detailRows,
  summaryRow,
  unit,
}: {
  detailRows: SwdklljRow[];
  summaryRow?: SwdklljRow;
  unit: UnitRow;
}): SwdklljMetrics {
  const rows = detailRows.length > 0 ? detailRows : summaryRow ? [summaryRow] : [];
  const metrics = rows.reduce(
    (total, row) => ({
      kd: total.kd + toNumber(row.kd),
      sw: total.sw + toNumber(row.sw),
      denda: total.denda + toNumber(row.denda),
      setor_adjustment:
        total.setor_adjustment + toNumber(row.setor_adjustment),
      total: total.total + toNumber(row.total),
      transaction_count:
        total.transaction_count + toNumber(row.transaction_count),
    }),
    {
      kd: 0,
      sw: 0,
      denda: 0,
      setor_adjustment: 0,
      total: 0,
      transaction_count: 0,
    }
  );

  return {
    ...metrics,
    total: metrics.total || toNumber(unit.swdkllj_total),
    transaction_count:
      metrics.transaction_count || toNumber(unit.swdkllj_transaction_count),
  };
}

function calculateGrowthPct(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? null : 0;

  return ((current - previous) / previous) * 100;
}

function getIwkbuStatus(current: number, previous: number) {
  if (previous <= 0 && current > 0) return "Baru aktif";
  if (previous > 0 && current <= 0) return "Tidak aktif";
  if (current < previous) return "Turun";

  return "Naik";
}

function buildIwkbuMetrics({
  detailRows,
  summaryRow,
  unit,
}: {
  detailRows: IwkbuRow[];
  summaryRow?: IwkbuRow;
  unit: UnitRow;
}): IwkbuMetrics {
  const rows = detailRows.length > 0 ? detailRows : summaryRow ? [summaryRow] : [];
  const previousTotal = rows.reduce(
    (sum, row) => sum + toNumber(row.iwkbu_last_year),
    0
  );
  const currentTotal =
    rows.reduce((sum, row) => sum + toNumber(row.iwkbu_current_year), 0) ||
    toNumber(unit.iwkbu_total);
  const topContributor = [...rows]
    .filter((row) => toNumber(row.iwkbu_current_year) > 0)
    .sort(
      (a, b) =>
        toNumber(b.iwkbu_current_year) - toNumber(a.iwkbu_current_year)
    )[0];
  const growthPct = calculateGrowthPct(currentTotal, previousTotal);

  return {
    previous_total: previousTotal,
    current_total: currentTotal,
    growth_pct: growthPct,
    active_points: rows.filter((row) => toNumber(row.iwkbu_current_year) > 0)
      .length,
    top_contributor_name: topContributor
      ? normalizeDashboardUnitName(topContributor.unit_name)
      : "-",
    top_contributor_amount: topContributor
      ? toNumber(topContributor.iwkbu_current_year)
      : 0,
    note:
      currentTotal <= 0
        ? "Tidak ada data"
        : previousTotal <= 0
          ? "Baru aktif"
          : currentTotal >= previousTotal
            ? "Tren positif"
            : "Tren turun",
  };
}

function buildIwklMetrics({
  detailRows,
  unit,
  totalIwklJatim,
}: {
  detailRows: IwklDetailRow[];
  unit: UnitRow;
  totalIwklJatim: number;
}): IwklMetrics {
  const total =
    detailRows.reduce((sum, row) => sum + toNumber(row.nominal), 0) ||
    toNumber(unit.iwkl_total);
  const passengerCount =
    detailRows.reduce((sum, row) => sum + toNumber(row.passenger_count), 0) ||
    toNumber(unit.iwkl_passenger_count);
  const topOperator = [...detailRows]
    .filter((row) => toNumber(row.nominal) > 0 || toNumber(row.passenger_count) > 0)
    .sort((a, b) => toNumber(b.nominal) - toNumber(a.nominal))[0];

  return {
    total,
    passenger_count: passengerCount,
    top_operator_name: topOperator?.detail_type ?? "-",
    unit_contribution_pct: totalIwklJatim > 0 ? (total / totalIwklJatim) * 100 : 0,
    active_types: detailRows.filter(
      (row) => toNumber(row.nominal) > 0 || toNumber(row.passenger_count) > 0
    ).length,
    status: total > 0 || passengerCount > 0 ? "Data tersedia" : "Tidak ada data",
  };
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-[8px] border px-4 text-sm font-semibold transition ${
        active
          ? "border-[#1f4fea] bg-[#1f4fea] text-white shadow-sm"
          : "border-[#dce3ed] bg-white text-slate-700 hover:border-[#1f4fea] hover:text-[#1f4fea]"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="jr-state border-dashed p-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function PanelBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex min-h-8 items-center rounded-[7px] border border-blue-100 bg-blue-50 px-3 text-xs font-bold text-blue-700">
      {children}
    </span>
  );
}

function StateTrendChart({
  data,
  valueLabel,
  color,
}: {
  data: Array<{ label: string; value: number | string }>;
  valueLabel: string;
  color: string;
}) {
  const hasData = data.some((item) => toNumber(item.value) > 0);

  if (!hasData) {
    return <EmptyState message="Tidak ada data pada periode ini." />;
  }

  return (
    <RevenueTrendChart
      data={data}
      valueLabel={valueLabel}
      valueFormatter={(value) => formatRupiah(value)}
      compactFormatter={(value) => formatRupiah(value)}
      color={color}
    />
  );
}

function GrowthBadge({ value }: { value: number | string | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">-</span>;
  }

  const numberValue = Number(value);
  const isDown = numberValue < 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
        isDown ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
      }`}
    >
      {isDown ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
      {formatPercent(numberValue)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Turun" || status === "Tidak aktif" || status === "Tren turun"
      ? "bg-red-50 text-red-600"
      : status === "Baru aktif" ||
          status === "Data tersedia" ||
          status === "Naik" ||
          status === "Aktif" ||
          status === "Tren positif"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-500";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${tone}`}
    >
      {status}
    </span>
  );
}

function GeneralKpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Total Pendapatan"
        value={formatRupiah(metrics.total_revenue)}
        subtitle="Total seluruh sumber pendapatan"
        icon={<BarChart3 size={22} />}
      />

      <KpiCard
        title="SWDKLLJ"
        value={formatRupiah(metrics.swdkllj_total)}
        subtitle="Pendapatan SWDKLLJ"
        icon={<ReceiptText size={22} />}
      />

      <KpiCard
        title="IWKBU"
        value={formatRupiah(metrics.iwkbu_total)}
        subtitle="Pendapatan tahun berjalan"
        icon={<Bus size={22} />}
        trend={
          metrics.iwkbu_growth_pct !== null
            ? {
                value: formatPercent(metrics.iwkbu_growth_pct),
                direction: getGrowthDirection(metrics.iwkbu_growth_pct) as
                  | "up"
                  | "down"
                  | "neutral",
              }
            : undefined
        }
      />

      <KpiCard
        title="IWKL"
        value={formatRupiah(metrics.iwkl_total)}
        subtitle="Total nominal IWKL"
        icon={<Ship size={22} />}
      />

    </section>
  );
}

function SwdklljKpiGrid({ metrics }: { metrics: SwdklljMetrics }) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
      <KpiCard
        title="Total SWDKLLJ"
        value={formatRupiah(metrics.total)}
        subtitle="Total seluruh SWDKLLJ"
        icon={<BarChart3 size={22} />}
      />
      <KpiCard
        title="KD"
        value={formatRupiah(metrics.kd)}
        subtitle="Komponen KD"
        icon={<ReceiptText size={22} />}
      />
      <KpiCard
        title="SW"
        value={formatRupiah(metrics.sw)}
        subtitle="Komponen SW"
        icon={<Bus size={22} />}
      />
      <KpiCard
        title="Denda"
        value={formatRupiah(metrics.denda)}
        subtitle="Komponen denda"
        icon={<Ship size={22} />}
      />
      <KpiCard
        title="Setor Adjustment"
        value={formatRupiah(metrics.setor_adjustment)}
        subtitle="Komponen setor adjustment"
        icon={<CreditCard size={22} />}
      />
      <KpiCard
        title="Transaksi"
        value={formatNumber(metrics.transaction_count)}
        subtitle="Jumlah transaksi"
        icon={<Users size={22} />}
      />
    </section>
  );
}

function IwkbuKpiGrid({
  metrics,
  scope = "unit",
}: {
  metrics: IwkbuMetrics;
  scope?: "all" | "unit";
}) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Total IWKBU"
        value={formatRupiah(metrics.current_total)}
        subtitle="Total pendapatan IWKBU"
        icon={<BarChart3 size={22} />}
      />
      <KpiCard
        title="Periode Sebelumnya"
        value={formatRupiah(metrics.previous_total)}
        subtitle="Nominal periode sebelumnya"
        icon={<ReceiptText size={22} />}
      />
      <KpiCard
        title="Pertumbuhan"
        value={metrics.growth_pct === null ? "Baru aktif" : formatPercent(metrics.growth_pct)}
        subtitle="Dibanding periode sebelumnya"
        icon={<ArrowUpRight size={22} />}
        trend={
          metrics.growth_pct !== null
            ? {
                value: formatPercent(metrics.growth_pct),
                direction: getGrowthDirection(metrics.growth_pct) as
                  | "up"
                  | "down"
                  | "neutral",
              }
            : undefined
        }
      />
      <KpiCard
        title={scope === "all" ? "Titik Aktif" : "Titik Detail Aktif"}
        value={formatNumber(metrics.active_points)}
        subtitle={
          scope === "all" ? "Unit berkontribusi" : "Titik detail berkontribusi"
        }
        icon={<Users size={22} />}
      />
    </section>
  );
}

function IwklKpiGrid({
  metrics,
}: {
  metrics: IwklMetrics;
  scope?: "all" | "unit";
}) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Total IWKL"
        value={formatRupiah(metrics.total)}
        subtitle="Total nominal IWKL"
        icon={<BarChart3 size={22} />}
      />
      <KpiCard
        title="Penumpang"
        value={formatNumber(metrics.passenger_count)}
        subtitle="Total penumpang"
        icon={<Users size={22} />}
      />
      <KpiCard
        title="Operator Utama"
        value={metrics.top_operator_name}
        subtitle="Operator utama"
        icon={<Ship size={22} />}
      />
      <KpiCard
        title="Jenis Aktif"
        value={formatNumber(metrics.active_types)}
        subtitle="Jenis berkontribusi"
        icon={<ReceiptText size={22} />}
      />
    </section>
  );
}

function DetailLinkButton({
  label = "Lihat Detail",
  onClick,
  disabled,
}: {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="inline-flex rounded-[7px] bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
        Tidak ada detail
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-[7px] border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
    >
      {label}
      <ExternalLink size={13} />
    </button>
  );
}

function UnitFocusCard({
  unit,
  source,
  comparisonTotal,
  rank,
  unitCount,
}: {
  unit: UnitRow;
  source: string;
  comparisonTotal: number;
  rank: number | null;
  unitCount: number;
}) {
  const contributionAmount = getAmountBySource(unit, source);
  const contribution =
    comparisonTotal > 0 ? (contributionAmount / comparisonTotal) * 100 : 0;
  const contributionLabel =
    source === "ALL"
      ? "terhadap Jawa Timur"
      : `terhadap ${getSourceLabel(source)} Jawa Timur`;
  const rankValue = rank ? `#${rank}` : "-";
  const rankNote = rank ? `dari ${unitCount} unit` : "Belum ada peringkat";
  const unitSummaryItems = [
    {
      label: "Kontribusi",
      value: formatPercent(contribution),
      note: contributionLabel,
      icon: ArrowUpRight,
      iconClassName: "bg-blue-50 text-blue-700",
      valueClassName: "text-slate-950",
    },
    {
      label: "Peringkat",
      value: rankValue,
      note: rankNote,
      icon: BarChart3,
      iconClassName: "bg-blue-50 text-blue-700",
      valueClassName: "text-slate-950",
    },
  ];

  return (
    <section className="jr-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
              Unit Terpilih
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-tight text-slate-950">
            {unit.unit_name}
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {unitSummaryItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="min-h-[104px] min-w-0 rounded-[8px] border border-[#dce3ed] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition hover:shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
                >
                  <span
                    className={`mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] ${item.iconClassName}`}
                  >
                    <Icon size={18} />
                  </span>

                  <p className="jr-label text-[11px]">{item.label}</p>
                  <p
                    className={`mt-1 text-[18px] font-semibold leading-tight tracking-tight ${item.valueClassName}`}
                  >
                    {item.value}
                  </p>
                  {item.note && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {item.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SourceCompositionPanel({
  items,
  total,
}: {
  items: SourceCompositionRow[];
  total: number;
}) {
  if (total <= 0 || items.length === 0) {
    return <EmptyState message="Belum ada komposisi sumber pendapatan." />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="amount"
              nameKey="label"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
            >
              {items.map((item) => (
                <Cell key={item.key} fill={item.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatRupiah(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Sumber</th>
              <th className="px-4 py-3">Distribusi</th>
              <th className="px-4 py-3">Nominal</th>
              <th className="px-4 py-3">Persentase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item) => {
              const percentage = total > 0 ? (item.amount / total) * 100 : 0;

              return (
                <tr key={item.key}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 overflow-hidden rounded-full bg-[#eef2f8]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width:
                            percentage > 0
                              ? `${Math.max(percentage, 1)}%`
                              : "0%",
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex flex-wrap items-center gap-2">
                      {formatRupiah(item.amount)}
                      {item.amount <= 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                          Tidak ada data
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {formatPercent(percentage)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-[#f8fafc] font-bold text-slate-950">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3">{formatRupiah(total)}</td>
              <td className="px-4 py-3">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnitPositionPanel({
  units,
  selectedUnitName,
  source,
}: {
  units: UnitRow[];
  selectedUnitName: string;
  source: TabKey;
}) {
  const rows = getRankingPreviewUnits(units, selectedUnitName, source);
  const maxValue = Math.max(
    ...rows.map((unit) => getAmountBySource(unit, source)),
    1
  );

  if (rows.length === 0) {
    return <EmptyState message="Belum ada data ranking unit." />;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500">
        Top 5 Unit{source === "ALL" ? "" : ` ${getSourceLabel(source)}`}
      </p>

      <div className="space-y-2">
        {rows.map((unit) => {
          const amount = getAmountBySource(unit, source);
          const rank = getUnitRank(units, unit.unit_name, source);
          const selected = unit.unit_name === selectedUnitName;
          const width = `${Math.max((amount / maxValue) * 100, 8)}%`;

          return (
            <div
              key={unit.unit_name}
              className={`grid grid-cols-[28px_minmax(120px,0.8fr)_minmax(160px,1.2fr)_auto] items-center gap-3 rounded-[7px] px-3 py-2 ${
                selected ? "bg-blue-50" : "bg-white"
              }`}
            >
              <span className="text-xs font-bold text-slate-500">
                {rank ?? "-"}
              </span>
              <span className="min-w-0 text-xs font-bold text-slate-800">
                {unit.unit_name}
              </span>
              <div className="h-3 overflow-hidden rounded-full bg-[#edf3ff]">
                <div
                  className="h-full rounded-full bg-[#1f4fea]"
                  style={{ width }}
                />
              </div>
              <span
                className={`whitespace-nowrap text-right text-xs font-bold ${
                  selected ? "text-[#1f4fea]" : "text-slate-700"
                }`}
              >
                {formatRupiah(amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InternalContributorsPreview({
  rows,
  loading,
  onOpenSource,
}: {
  rows: PreviewContributorRow[];
  loading: boolean;
  onOpenSource: (sourceKey: RevenueSourceKey) => void;
}) {
  if (loading) {
    return <EmptyState message="Memuat preview kontributor internal..." />;
  }

  if (rows.length === 0) {
    return <EmptyState message="Belum ada preview kontributor internal." />;
  }

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Sumber</th>
              <th className="px-4 py-3">Kontributor Utama</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Catatan</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr
                key={`${row.source}-${row.contributor_name}-${row.note}`}
                className="hover:bg-[#f8fafc]"
              >
                <td className="px-4 py-3 font-bold text-slate-900">
                  {row.source}
                </td>
                <td
                  className={`px-4 py-3 font-semibold ${
                    row.hasData ? "text-slate-900" : "italic text-slate-400"
                  }`}
                >
                  {row.contributor_name}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">
                  {formatRupiah(row.amount)}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.note}</td>
                <td className="px-4 py-3">
                  <DetailLinkButton onClick={() => onOpenSource(row.source)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SourceTopContributorsPanel({
  rows,
  emptyMessage,
  variant = "compact",
  className = "",
}: {
  rows: Array<{ name: string; amount: number }>;
  emptyMessage: string;
  variant?: "compact" | "spacious" | "dashboard";
  className?: string;
}) {
  const topRows = rows
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const maxValue = Math.max(...topRows.map((row) => row.amount), 1);

  if (topRows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  if (variant === "spacious" || variant === "dashboard") {
    const containerClass =
      variant === "dashboard"
        ? "grid h-[370px] auto-rows-fr gap-4 px-1 py-5"
        : "grid min-h-[260px] auto-rows-fr gap-4 px-1 py-4";

    return (
      <div className={`${containerClass} ${className}`}>
        {topRows.map((row, index) => (
          <div
            key={`${row.name}-${index}`}
            className="grid min-h-0 grid-cols-[24px_minmax(108px,0.55fr)_minmax(150px,1.48fr)_minmax(64px,auto)] items-center gap-3 sm:grid-cols-[24px_minmax(116px,0.55fr)_minmax(180px,1.48fr)_minmax(68px,auto)]"
          >
            <span className="text-xs font-bold text-slate-500">
              {index + 1}
            </span>
            <span className="block min-w-0 whitespace-normal break-words border-r border-[#dce3ed] pr-3 text-right text-[12px] font-semibold leading-4 text-slate-700">
              {row.name}
            </span>
            <div className="h-8 overflow-hidden rounded-[4px] bg-[#edf3ff]">
              <div
                className="h-full rounded-[4px] bg-[#1f4fea]"
                style={{
                  width: `${Math.max((row.amount / maxValue) * 100, 12)}%`,
                }}
              />
            </div>
            <span className="whitespace-nowrap text-right text-[13px] font-bold tabular-nums text-slate-900">
              {formatRupiah(row.amount)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topRows.map((row, index) => (
        <div
          key={`${row.name}-${index}`}
          className="grid grid-cols-[28px_minmax(130px,0.9fr)_minmax(160px,1.2fr)_auto] items-center gap-3"
        >
          <span className="text-xs font-bold text-slate-500">{index + 1}</span>
          <span className="min-w-0 text-xs font-bold text-slate-900">
            {row.name}
          </span>
          <div className="h-3 overflow-hidden rounded-full bg-[#edf3ff]">
            <div
              className="h-full rounded-full bg-[#1f4fea]"
              style={{
                width: `${Math.max((row.amount / maxValue) * 100, 8)}%`,
              }}
            />
          </div>
          <span className="whitespace-nowrap text-right text-xs font-bold text-slate-900">
            {formatRupiah(row.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SwdklljCompositionPanel({ metrics }: { metrics: SwdklljMetrics }) {
  const items = [
    { label: "KD", amount: metrics.kd, color: "#1f4fea" },
    { label: "SW", amount: metrics.sw, color: "#60a5fa" },
    { label: "Denda", amount: metrics.denda, color: "#facc15" },
    {
      label: "Setor Adjustment",
      amount: metrics.setor_adjustment,
      color: "#9ca3af",
    },
  ];
  const denominator =
    metrics.total || items.reduce((sum, item) => sum + item.amount, 0);

  if (denominator <= 0) {
    return <EmptyState message="Tidak ada data SWDKLLJ pada periode ini." />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_180px]">
      <div>
        <div className="mb-4 flex h-5 overflow-hidden rounded-[5px] bg-[#eef2f8]">
          {items.map((item) => {
            const percent =
              denominator > 0 ? (item.amount / denominator) * 100 : 0;

            return (
              <div
                key={item.label}
                className="h-full"
                style={{
                  width: percent > 0 ? `${Math.max(percent, 1)}%` : "0%",
                  backgroundColor: item.color,
                }}
              />
            );
          })}
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const percent =
              denominator > 0 ? (item.amount / denominator) * 100 : 0;

            return (
              <div
                key={item.label}
                className="grid grid-cols-1 items-center gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(176px,auto)] sm:gap-5"
              >
                <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="min-w-0 break-words">{item.label}</span>
                </div>
                <div className="grid grid-cols-[minmax(92px,1fr)_minmax(62px,auto)] items-center gap-5 justify-self-start sm:justify-self-end">
                  <span className="text-right font-semibold tabular-nums text-slate-900">
                    {formatRupiah(item.amount)}
                  </span>
                  <span className="text-right font-bold tabular-nums text-slate-700">
                    {formatPercent(percent)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[150px] flex-col items-center justify-center rounded-[8px] border border-[#1f4fea] bg-white p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Total SWDKLLJ
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-950">
          {formatRupiah(metrics.total)}
        </p>
      </div>
    </div>
  );
}

function IwkbuComparisonPanel({ metrics }: { metrics: IwkbuMetrics }) {
  const maxValue = Math.max(metrics.previous_total, metrics.current_total, 1);
  const previousHeight = `${Math.max(
    (metrics.previous_total / maxValue) * 100,
    4
  )}%`;
  const currentHeight = `${Math.max(
    (metrics.current_total / maxValue) * 100,
    4
  )}%`;

  if (metrics.previous_total <= 0 && metrics.current_total <= 0) {
    return <EmptyState message="Tidak ada data IWKBU pada periode ini." />;
  }

  return (
    <div className="grid min-h-[260px] grid-cols-[1fr_auto_1fr] items-end gap-8 px-4 pb-3 pt-4">
      <div className="flex flex-col items-center gap-3">
        <p className="text-lg font-bold text-slate-950">
          {formatRupiah(metrics.previous_total)}
        </p>
        <div className="flex h-36 w-28 items-end rounded-[7px] bg-[#f1f5f9]">
          <div
            className="w-full rounded-[7px] bg-slate-300"
            style={{ height: previousHeight }}
          />
        </div>
        <p className="text-center text-xs font-semibold text-slate-500">
          Periode Sebelumnya
        </p>
      </div>

      <div className="self-center text-center">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            metrics.growth_pct !== null && metrics.growth_pct < 0
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {metrics.growth_pct !== null && metrics.growth_pct < 0 ? (
            <ArrowDownRight size={22} />
          ) : (
            <ArrowUpRight size={22} />
          )}
        </div>
        <p
          className={`mt-2 text-sm font-bold ${
            metrics.growth_pct !== null && metrics.growth_pct < 0
              ? "text-red-600"
              : "text-emerald-600"
          }`}
        >
          {metrics.growth_pct === null
            ? "Baru aktif"
            : formatPercent(metrics.growth_pct)}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-lg font-bold text-slate-950">
          {formatRupiah(metrics.current_total)}
        </p>
        <div className="flex h-36 w-28 items-end rounded-[7px] bg-[#edf3ff]">
          <div
            className="w-full rounded-[7px] bg-[#1f4fea]"
            style={{ height: currentHeight }}
          />
        </div>
        <p className="text-center text-xs font-semibold text-slate-500">
          Periode Saat Ini
        </p>
      </div>
    </div>
  );
}

function IwklCompositionPanel({
  rows,
  metrics,
}: {
  rows: IwklDetailRow[];
  metrics: IwklMetrics;
}) {
  const data =
    rows.length > 0
      ? rows.map((row) => ({
          label: row.detail_type,
          amount: toNumber(row.nominal),
          passengers: toNumber(row.passenger_count),
        }))
      : metrics.total > 0
        ? [
            {
              label: "Total Unit",
              amount: metrics.total,
              passengers: metrics.passenger_count,
            },
          ]
        : [];
  const activeData = data.filter(
    (item) => item.amount > 0 || item.passengers > 0
  );
  const chartData = activeData.filter((item) => item.amount > 0);
  const chartTotal = chartData.reduce((sum, item) => sum + item.amount, 0);
  const colors = ["#1f4fea", "#93c5fd", "#38bdf8", "#c4b5fd", "#dce3ed"];

  if (chartData.length === 0 || chartTotal <= 0) {
    return <EmptyState message="Tidak ada data IWKL pada periode ini." />;
  }

  function renderIwklPieLabel(props: PieLabelRenderProps) {
    const index = Number(props.index ?? 0);
    const item = chartData[index];

    if (!item || index > 3) return null;

    const radius = Number(props.outerRadius ?? 0);
    const cx = Number(props.cx ?? 0);
    const cy = Number(props.cy ?? 0);
    const midAngle = Number(props.midAngle ?? 0);
    const radians = (Math.PI / 180) * -midAngle;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const sx = cx + radius * cos;
    const sy = cy + radius * sin;
    const mx = cx + (radius + 18) * cos;
    const my = cy + (radius + 18) * sin;
    const ex = mx + (cos >= 0 ? 48 : -48);
    const ey = my;
    const textAnchor = cos >= 0 ? "start" : "end";
    const textX = ex + (cos >= 0 ? 7 : -7);
    const color = colors[index % colors.length];
    const percentage = (item.amount / chartTotal) * 100;
    const label =
      item.label.length > 18 ? `${item.label.slice(0, 18)}...` : item.label;

    return (
      <g>
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        />
        <circle cx={sx} cy={sy} r={3} fill={color} />
        <text
          x={textX}
          y={ey - 4}
          textAnchor={textAnchor}
          fill="#0f172a"
          fontSize={13}
          fontWeight={800}
        >
          {label}, {formatPercent(percentage)}
        </text>
        <text
          x={textX}
          y={ey + 13}
          textAnchor={textAnchor}
          fill="#64748b"
          fontSize={11}
          fontWeight={700}
        >
          {formatRupiah(item.amount)}
        </text>
      </g>
    );
  }

  return (
    <div className="relative flex min-h-[360px] flex-1 items-center justify-center py-6">
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 18, right: 96, bottom: 18, left: 96 }}>
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={92}
              outerRadius={140}
              paddingAngle={3}
              label={renderIwklPieLabel}
              labelLine={false}
            >
              {chartData.map((item, index) => (
                <Cell key={item.label} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatRupiah(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Total IWKL
        </span>
        <span className="mt-1 text-lg font-bold text-slate-950">
          {formatRupiah(metrics.total)}
        </span>
        <span className="mt-1 text-[11px] font-semibold text-slate-500">
          {formatNumber(metrics.passenger_count)} penumpang
        </span>
      </div>
    </div>
  );
}

function IwklOperatorSummaryPanel({
  rows,
  metrics,
}: {
  rows: IwklDetailRow[];
  metrics: IwklMetrics;
}) {
  const data = [...rows].sort(
    (a, b) =>
      toNumber(b.nominal) - toNumber(a.nominal) ||
      toNumber(b.passenger_count) - toNumber(a.passenger_count)
  );
  const maxValue = Math.max(...data.map((row) => toNumber(row.nominal)), 1);

  if (data.length === 0) {
    return <EmptyState message="Tidak ada ringkasan operator pada periode ini." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="jr-table-head">
          <tr>
            <th className="px-4 py-3">Jenis / Operator</th>
            <th className="px-4 py-3">Distribusi</th>
            <th className="px-4 py-3">Penumpang</th>
            <th className="px-4 py-3">Nominal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row) => {
            const amount = toNumber(row.nominal);
            const width = `${Math.max(
              (amount / maxValue) * 100,
              amount > 0 ? 8 : 0
            )}%`;

            return (
              <tr key={row.detail_type}>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {row.detail_type}
                </td>
                <td className="px-4 py-3">
                  <div className="h-3 overflow-hidden rounded-full bg-[#edf3ff]">
                    <div
                      className="h-full rounded-full bg-[#1f4fea]"
                      style={{ width }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">
                  {formatNumber(row.passenger_count)}
                </td>
                <td className="px-4 py-3 font-bold text-slate-950">
                  {formatRupiah(row.nominal)}
                </td>
              </tr>
            );
          })}
          <tr className="bg-[#f8fafc] font-bold text-slate-950">
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3">
              {formatNumber(metrics.passenger_count)}
            </td>
            <td className="px-4 py-3">{formatRupiah(metrics.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CombinedRevenueTable({
  units,
  source,
  year,
  month,
  totalRevenue,
}: {
  units: UnitRow[];
  source: string;
  year: number;
  month: number;
  totalRevenue: number;
}) {
  const sortedUnits = [...units].sort(
    (a, b) => toNumber(b.total_revenue) - toNumber(a.total_revenue)
  );

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
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
              const unitTotal = toNumber(unit.total_revenue);
              const contribution =
                totalRevenue > 0 ? (unitTotal / totalRevenue) * 100 : 0;

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
                    {formatRupiah(unitTotal)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
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
    </div>
  );
}

function SwdklljTable({
  rows,
  onOpenDetail,
}: {
  rows: SwdklljRow[];
  onOpenDetail: (parent: string) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState message="Tidak ada data SWDKLLJ pada periode ini." />;
  }

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Kantor</th>
              <th className="px-4 py-3">KD</th>
              <th className="px-4 py-3">SW</th>
              <th className="px-4 py-3">Denda</th>
              <th className="px-4 py-3">Setor Adjustment</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Transaksi</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr
                key={`${row.level}-${row.unit_name}`}
                className="hover:bg-[#f8fafc]"
              >
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {row.unit_name}
                </td>
                <td className="px-4 py-3">{formatRupiah(row.kd)}</td>
                <td className="px-4 py-3">{formatRupiah(row.sw)}</td>
                <td className="px-4 py-3">{formatRupiah(row.denda)}</td>
                <td className="px-4 py-3">
                  {formatRupiah(row.setor_adjustment)}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {formatRupiah(row.total)}
                </td>
                <td className="px-4 py-3">
                  {formatNumber(row.transaction_count)}
                </td>
                <td className="px-4 py-3">
                  <DetailLinkButton
                    onClick={() => onOpenDetail(row.unit_name)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IwkbuTable({
  rows,
  onOpenDetail,
}: {
  rows: IwkbuRow[];
  onOpenDetail: (parent: string) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState message="Tidak ada data IWKBU pada periode ini." />;
  }

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Kantor</th>
              <th className="px-4 py-3">Nominal Sebelumnya</th>
              <th className="px-4 py-3">Nominal Saat Ini</th>
              <th className="px-4 py-3">Growth %</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const previous = toNumber(row.iwkbu_last_year);
              const current = toNumber(row.iwkbu_current_year);
              const growth = calculateGrowthPct(current, previous);
              const status = getIwkbuStatus(current, previous);
              const officeName =
                row.level === "SUMMARY"
                  ? normalizeDashboardUnitName(row.unit_name)
                  : row.unit_name;

              return (
                <tr
                  key={`${row.level}-${row.unit_name}`}
                  className="hover:bg-[#f8fafc]"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {officeName}
                  </td>
                  <td className="px-4 py-3">{formatRupiah(previous)}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatRupiah(current)}
                  </td>
                  <td className="px-4 py-3">
                    {growth === null ? (
                      <span className="text-xs font-bold text-blue-700">
                        Baru aktif
                      </span>
                    ) : (
                      <GrowthBadge value={growth} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3">
                    <DetailLinkButton
                      onClick={() => {
                        const parent =
                          row.unit_name === "LOKET KANTOR WILAYAH JAWA TIMUR"
                            ? "KANTOR WILAYAH JAWA TIMUR"
                            : normalizeDashboardUnitName(row.unit_name);

                        onOpenDetail(parent);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IwklDetailTable({
  rows,
  total,
}: {
  rows: IwklDetailRow[];
  total: number;
}) {
  if (rows.length === 0) {
    return <EmptyState message="Tidak ada data IWKL pada periode ini." />;
  }

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Jenis / Operator</th>
              <th className="px-4 py-3">Penumpang</th>
              <th className="px-4 py-3">Nominal</th>
              <th className="px-4 py-3">Kontribusi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const amount = toNumber(row.nominal);
              const contribution = total > 0 ? (amount / total) * 100 : 0;
              const status =
                amount > 0 || toNumber(row.passenger_count) > 0
                  ? "Aktif"
                  : "Tidak aktif";

              return (
                <tr
                  key={`${row.parent_unit_name}-${row.detail_type}`}
                  className="hover:bg-[#f8fafc]"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.detail_type}
                  </td>
                  <td className="px-4 py-3">
                    {formatNumber(row.passenger_count)}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatRupiah(row.nominal)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {formatPercent(contribution)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3">
                    <DetailLinkButton onClick={() => undefined} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IwklOverviewTable({
  rows,
  total,
  onOpenDetail,
}: {
  rows: IwklRow[];
  total: number;
  onOpenDetail: (unitName: string) => void;
}) {
  const sortedRows = [...rows].sort(
    (a, b) => toNumber(b.nominal) - toNumber(a.nominal)
  );

  if (sortedRows.length === 0) {
    return <EmptyState message="Tidak ada data IWKL pada periode ini." />;
  }

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Unit/Kantor</th>
              <th className="px-4 py-3">Penumpang</th>
              <th className="px-4 py-3">Nominal</th>
              <th className="px-4 py-3">Kontribusi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {sortedRows.map((row) => {
              const amount = toNumber(row.nominal);
              const passengerCount = toNumber(row.passenger_count);
              const contribution = total > 0 ? (amount / total) * 100 : 0;
              const status =
                amount > 0 || passengerCount > 0 ? "Aktif" : "Tidak aktif";

              return (
                <tr key={row.unit_name} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.unit_name}
                  </td>
                  <td className="px-4 py-3">
                    {formatNumber(passengerCount)}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatRupiah(amount)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {formatPercent(contribution)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3">
                    <DetailLinkButton
                      onClick={() => onOpenDetail(row.unit_name)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PendapatanPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [source, setSource] = useState<TabKey>("ALL");
  const [unitQuery, setUnitQuery] = useState("");

  const [appliedYear, setAppliedYear] = useState(2026);
  const [appliedMonth, setAppliedMonth] = useState(5);

  const [activeTab, setActiveTab] = useState<TabKey>("ALL");

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [unitRevenueTrends, setUnitRevenueTrends] = useState<
    UnitRevenueTrendItem[]
  >([]);
  const [swdklljRows, setSwdklljRows] = useState<SwdklljRow[]>([]);
  const [swdklljDetailRows, setSwdklljDetailRows] = useState<SwdklljRow[]>([]);
  const [selectedSwdklljParent, setSelectedSwdklljParent] = useState("");

  const [iwkbuRows, setIwkbuRows] = useState<IwkbuRow[]>([]);
  const [iwkbuDetailRows, setIwkbuDetailRows] = useState<IwkbuRow[]>([]);
  const [selectedIwkbuParent, setSelectedIwkbuParent] = useState("");

  const [iwklSummaryRows, setIwklSummaryRows] = useState<IwklRow[]>([]);
  const [iwklAllDetailRows, setIwklAllDetailRows] = useState<IwklDetailRow[]>(
    []
  );
  const [iwklDetailRows, setIwklDetailRows] = useState<IwklDetailRow[]>([]);
  const [selectedIwklParent, setSelectedIwklParent] = useState("");

  const [previewSwdklljRows, setPreviewSwdklljRows] = useState<SwdklljRow[]>(
    []
  );
  const [previewIwkbuRows, setPreviewIwkbuRows] = useState<IwkbuRow[]>([]);
  const [previewIwklRows, setPreviewIwklRows] = useState<IwklDetailRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      const initialYear = Number(params.get("year"));
      const initialMonth = Number(params.get("month"));
      const initialUnit = params.get("unit");
      const initialSource = parseTabKey(params.get("source"));
      const initialTab = parseTabKey(params.get("tab"));

      if (
        Number.isInteger(initialYear) &&
        initialYear >= 2000 &&
        initialYear <= 2100
      ) {
        setYear(initialYear);
        setAppliedYear(initialYear);
      }

      if (
        Number.isInteger(initialMonth) &&
        initialMonth >= 1 &&
        initialMonth <= 12
      ) {
        setMonth(initialMonth);
        setAppliedMonth(initialMonth);
      }

      if (initialUnit) {
        setUnitQuery(normalizeDashboardUnitName(initialUnit));
      }

      if (initialSource) {
        setSource(initialSource);
      }

      if (initialTab) {
        setActiveTab(initialTab);
        setSource(initialTab === "ALL" ? "ALL" : initialTab);
      } else if (initialSource && initialSource !== "ALL") {
        setActiveTab(initialSource);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function fetchMainData(targetYear: number, targetMonth: number) {
    setLoading(true);
    setError("");

    try {
      const [overviewResponse, swdklljResponse, iwkbuResponse, iwklResponse] =
        await Promise.all([
          fetch(
            `/api/dashboard/revenue/overview?year=${targetYear}&month=${targetMonth}`
          ),
          fetch(
            `/api/dashboard/revenue/swdkllj?year=${targetYear}&month=${targetMonth}`
          ),
          fetch(
            `/api/dashboard/revenue/iwkbu?year=${targetYear}&month=${targetMonth}`
          ),
          fetch(
            `/api/dashboard/revenue/iwkl?year=${targetYear}&month=${targetMonth}`
          ),
        ]);

      const overviewJson = await readApiJson<OverviewResponse>(
        overviewResponse,
        "Gagal mengambil overview pendapatan."
      );
      const swdklljJson = await readApiJson<SwdklljResponse>(
        swdklljResponse,
        "Gagal mengambil data SWDKLLJ."
      );
      const iwkbuJson = await readApiJson<IwkbuResponse>(
        iwkbuResponse,
        "Gagal mengambil data IWKBU."
      );
      const iwklJson = await readApiJson<IwklResponse>(
        iwklResponse,
        "Gagal mengambil data IWKL."
      );

      setOverview(overviewJson.overview);
      setRevenueTrend(overviewJson.trend ?? []);
      setUnitRevenueTrends(overviewJson.unit_trends ?? []);
      setSwdklljRows(swdklljJson.data ?? []);
      setIwkbuRows(iwkbuJson.data ?? []);
      setIwklSummaryRows(iwklJson.summary ?? []);
      setIwklAllDetailRows(iwklJson.details ?? []);

      setSwdklljDetailRows([]);
      setSelectedSwdklljParent("");
      setIwkbuDetailRows([]);
      setSelectedIwkbuParent("");
      setIwklDetailRows([]);
      setSelectedIwklParent("");
      setPreviewSwdklljRows([]);
      setPreviewIwkbuRows([]);
      setPreviewIwklRows([]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Terjadi kesalahan saat mengambil data pendapatan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchMainData(appliedYear, appliedMonth);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [appliedYear, appliedMonth]);

  const dashboardUnits = useMemo(
    () =>
      buildDashboardUnits({
        swdklljRows,
        iwkbuRows,
        iwklRows: iwklSummaryRows,
      }),
    [iwkbuRows, iwklSummaryRows, swdklljRows]
  );

  const hasSourceRows =
    swdklljRows.length + iwkbuRows.length + iwklSummaryRows.length > 0;

  const dashboardMetrics = useMemo(
    () => calculateDashboardMetrics(dashboardUnits, overview, hasSourceRows),
    [dashboardUnits, hasSourceRows, overview]
  );

  const sourceComposition = useMemo<SourceCompositionRow[]>(() => {
    if (!dashboardMetrics) return [];

    return buildSourceCompositionFromMetrics(dashboardMetrics);
  }, [dashboardMetrics]);

  const swdklljOverviewMetrics = useMemo(() => {
    if (!dashboardMetrics) return null;

    return buildSwdklljOverviewMetrics(swdklljRows, dashboardMetrics);
  }, [dashboardMetrics, swdklljRows]);

  const iwkbuOverviewMetrics = useMemo(() => {
    if (!dashboardMetrics) return null;

    return buildIwkbuOverviewMetrics(iwkbuRows, dashboardMetrics);
  }, [dashboardMetrics, iwkbuRows]);

  const iwklOverviewMetrics = useMemo(() => {
    if (!dashboardMetrics) return null;

    return buildIwklOverviewMetrics({
      summaryRows: iwklSummaryRows,
      detailRows: iwklAllDetailRows,
      metrics: dashboardMetrics,
    });
  }, [dashboardMetrics, iwklAllDetailRows, iwklSummaryRows]);

  const sourceOverviewRows = useMemo(
    () => ({
      swdkllj: swdklljRows.filter((row) => toNumber(row.total) > 0),
      iwkbu: iwkbuRows.filter(
        (row) =>
          toNumber(row.iwkbu_current_year) > 0 ||
          toNumber(row.iwkbu_last_year) > 0
      ),
      iwkl: iwklSummaryRows.filter(
        (row) => toNumber(row.nominal) > 0 || toNumber(row.passenger_count) > 0
      ),
    }),
    [iwkbuRows, iwklSummaryRows, swdklljRows]
  );

  const filteredUnits = useMemo(() => {
    const query = normalizeDashboardUnitName(unitQuery);

    return dashboardUnits
      .filter((unit) => {
        if (!query) return true;

        return unit.unit_name.toUpperCase().includes(query);
      })
      .filter((unit) => {
        if (source === "ALL") return true;

        return getAmountBySource(unit, source) > 0;
      });
  }, [dashboardUnits, source, unitQuery]);

  const selectedUnit = useMemo(() => {
    const query = normalizeDashboardUnitName(unitQuery);

    if (!query) return null;

    return (
      dashboardUnits.find((unit) => unit.unit_name.toUpperCase() === query) ??
      filteredUnits[0] ??
      null
    );
  }, [dashboardUnits, filteredUnits, unitQuery]);

  const activeMetrics = useMemo(() => {
    if (selectedUnit) return getMetricsForUnit(selectedUnit);

    return dashboardMetrics;
  }, [dashboardMetrics, selectedUnit]);

  const trendData = useMemo(() => {
    const activeTrendRows = selectedUnit
      ? getTrendRowsForUnit(unitRevenueTrends, selectedUnit.unit_name)
      : revenueTrend;

    return activeTrendRows.map((item) => ({
      label: item.label,
      value: getTrendValueBySource(item, activeTab),
    }));
  }, [activeTab, revenueTrend, selectedUnit, unitRevenueTrends]);

  const trendTitle = useMemo(
    () => getTrendTitle(activeTab, selectedUnit),
    [activeTab, selectedUnit]
  );

  const trendValueLabel =
    activeTab === "ALL" ? "Total Pendapatan" : getSourceLabel(activeTab);
  const trendColor = "#1f4fea";

  const selectedSourceRank = useMemo(() => {
    if (!selectedUnit) return null;

    return getUnitRank(dashboardUnits, selectedUnit.unit_name, activeTab);
  }, [activeTab, dashboardUnits, selectedUnit]);

  const unitSourceComposition = useMemo<SourceCompositionRow[]>(() => {
    if (!selectedUnit) return [];

    return buildSourceCompositionFromMetrics(getMetricsForUnit(selectedUnit));
  }, [selectedUnit]);

  const previewContributorRows = useMemo(
    () =>
      buildInternalContributorPreviewRows({
        swdklljRows: previewSwdklljRows,
        iwkbuRows: previewIwkbuRows,
        iwklRows: previewIwklRows,
      }),
    [previewIwkbuRows, previewIwklRows, previewSwdklljRows]
  );

  const activeSwdklljRows = useMemo(
    () =>
      swdklljDetailRows.length > 0 ? swdklljDetailRows : previewSwdklljRows,
    [previewSwdklljRows, swdklljDetailRows]
  );

  const activeIwkbuRows = useMemo(
    () => (iwkbuDetailRows.length > 0 ? iwkbuDetailRows : previewIwkbuRows),
    [iwkbuDetailRows, previewIwkbuRows]
  );

  const activeIwklRows = useMemo(
    () => (iwklDetailRows.length > 0 ? iwklDetailRows : previewIwklRows),
    [iwklDetailRows, previewIwklRows]
  );

  const selectedSwdklljSummaryRow = useMemo(() => {
    if (!selectedUnit) return undefined;

    return findSwdklljSummaryRow(swdklljRows, selectedUnit.unit_name);
  }, [selectedUnit, swdklljRows]);

  const selectedIwkbuSummaryRow = useMemo(() => {
    if (!selectedUnit) return undefined;

    return findIwkbuSummaryRow(iwkbuRows, selectedUnit.unit_name);
  }, [iwkbuRows, selectedUnit]);

  const swdklljSourceMetrics = useMemo(() => {
    if (!selectedUnit) return null;

    return buildSwdklljMetrics({
      detailRows: activeSwdklljRows,
      summaryRow: selectedSwdklljSummaryRow,
      unit: selectedUnit,
    });
  }, [activeSwdklljRows, selectedSwdklljSummaryRow, selectedUnit]);

  const iwkbuSourceMetrics = useMemo(() => {
    if (!selectedUnit) return null;

    return buildIwkbuMetrics({
      detailRows: activeIwkbuRows,
      summaryRow: selectedIwkbuSummaryRow,
      unit: selectedUnit,
    });
  }, [activeIwkbuRows, selectedIwkbuSummaryRow, selectedUnit]);

  const iwklSourceMetrics = useMemo(() => {
    if (!selectedUnit || !dashboardMetrics) return null;

    return buildIwklMetrics({
      detailRows: activeIwklRows,
      unit: selectedUnit,
      totalIwklJatim: dashboardMetrics.iwkl_total,
    });
  }, [activeIwklRows, dashboardMetrics, selectedUnit]);

  const activeSwdklljMetrics = selectedUnit
    ? swdklljSourceMetrics
    : swdklljOverviewMetrics;
  const activeIwkbuMetrics = selectedUnit
    ? iwkbuSourceMetrics
    : iwkbuOverviewMetrics;
  const activeIwklMetrics = selectedUnit
    ? iwklSourceMetrics
    : iwklOverviewMetrics;

  const unitOptions = useMemo(() => {
    const options = new Map<string, { value: string; label: string }>();
    const normalizedQuery = normalizeDashboardUnitName(unitQuery);

    if (normalizedQuery) {
      options.set(normalizedQuery, {
        value: normalizedQuery,
        label: normalizedQuery,
      });
    }

    dashboardUnits.forEach((unit) => {
      options.set(unit.unit_name, {
        value: unit.unit_name,
        label: unit.unit_name,
      });
    });

    return Array.from(options.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "id-ID")
    );
  }, [dashboardUnits, unitQuery]);

  const openSwdklljDetail = useCallback(
    async (parent: string) => {
      setDetailLoading(true);
      setSelectedSwdklljParent(parent);

      try {
        const response = await fetch(
          `/api/dashboard/revenue/swdkllj?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
            parent
          )}`
        );

        const json = await readApiJson<SwdklljResponse>(
          response,
          "Gagal mengambil detail SWDKLLJ."
        );

        setSwdklljDetailRows(json.data ?? []);
      } catch {
        setSwdklljDetailRows([]);
      } finally {
        setDetailLoading(false);
      }
    },
    [appliedMonth, appliedYear]
  );

  const openIwkbuDetail = useCallback(
    async (parent: string) => {
      setDetailLoading(true);
      setSelectedIwkbuParent(parent);

      try {
        const response = await fetch(
          `/api/dashboard/revenue/iwkbu?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
            parent
          )}`
        );

        const json = await readApiJson<IwkbuResponse>(
          response,
          "Gagal mengambil detail IWKBU."
        );

        setIwkbuDetailRows(json.data ?? []);
      } catch {
        setIwkbuDetailRows([]);
      } finally {
        setDetailLoading(false);
      }
    },
    [appliedMonth, appliedYear]
  );

  const openIwklDetail = useCallback(
    async (parent: string) => {
      setDetailLoading(true);
      setSelectedIwklParent(parent);

      try {
        const response = await fetch(
          `/api/dashboard/revenue/iwkl?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
            parent
          )}`
        );

        const json = await readApiJson<IwklResponse>(
          response,
          "Gagal mengambil detail IWKL."
        );

        setIwklDetailRows(json.details ?? []);
      } catch {
        setIwklDetailRows([]);
      } finally {
        setDetailLoading(false);
      }
    },
    [appliedMonth, appliedYear]
  );

  const fetchUnitPreview = useCallback(
    async (parent: string) => {
      setPreviewLoading(true);
      setPreviewSwdklljRows([]);
      setPreviewIwkbuRows([]);
      setPreviewIwklRows([]);

      const [swdklljResult, iwkbuResult, iwklResult] =
        await Promise.allSettled([
          fetch(
            `/api/dashboard/revenue/swdkllj?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
              parent
            )}`
          ).then((response) =>
            readApiJson<SwdklljResponse>(
              response,
              "Gagal mengambil preview SWDKLLJ."
            )
          ),
          fetch(
            `/api/dashboard/revenue/iwkbu?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
              parent
            )}`
          ).then((response) =>
            readApiJson<IwkbuResponse>(
              response,
              "Gagal mengambil preview IWKBU."
            )
          ),
          fetch(
            `/api/dashboard/revenue/iwkl?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
              parent
            )}`
          ).then((response) =>
            readApiJson<IwklResponse>(
              response,
              "Gagal mengambil preview IWKL."
            )
          ),
        ]);

      setPreviewSwdklljRows(
        swdklljResult.status === "fulfilled" ? swdklljResult.value.data ?? [] : []
      );
      setPreviewIwkbuRows(
        iwkbuResult.status === "fulfilled" ? iwkbuResult.value.data ?? [] : []
      );
      setPreviewIwklRows(
        iwklResult.status === "fulfilled" ? iwklResult.value.details ?? [] : []
      );
      setPreviewLoading(false);
    },
    [appliedMonth, appliedYear]
  );

  useEffect(() => {
    if (loading) return;

    const timeoutId = window.setTimeout(() => {
      if (!selectedUnit) {
        setPreviewSwdklljRows([]);
        setPreviewIwkbuRows([]);
        setPreviewIwklRows([]);
        setPreviewLoading(false);
        return;
      }

      fetchUnitPreview(selectedUnit.unit_name);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchUnitPreview, loading, selectedUnit]);

  useEffect(() => {
    if (loading || !selectedUnit || activeTab === "ALL") return;

    const timeoutId = window.setTimeout(() => {
      if (
        activeTab === "SWDKLLJ" &&
        selectedSwdklljParent !== selectedUnit.unit_name
      ) {
        openSwdklljDetail(selectedUnit.unit_name);
      }

      if (
        activeTab === "IWKBU" &&
        selectedIwkbuParent !== selectedUnit.unit_name
      ) {
        openIwkbuDetail(selectedUnit.unit_name);
      }

      if (
        activeTab === "IWKL" &&
        selectedIwklParent !== selectedUnit.unit_name
      ) {
        openIwklDetail(selectedUnit.unit_name);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeTab,
    loading,
    openIwkbuDetail,
    openIwklDetail,
    openSwdklljDetail,
    selectedIwkbuParent,
    selectedIwklParent,
    selectedSwdklljParent,
    selectedUnit,
  ]);

  function syncPendapatanUrl({
    year: nextYear,
    month: nextMonth,
    source: nextSource,
    unit: nextUnit,
    tab: nextTab,
  }: {
    year: number;
    month: number;
    source: string;
    unit: string;
    tab: TabKey;
  }) {
    const url = new URL(window.location.href);

    url.pathname = "/pendapatan";
    url.searchParams.set("year", String(nextYear));
    url.searchParams.set("month", String(nextMonth));

    if (nextSource !== "ALL") {
      url.searchParams.set("source", nextSource);
    } else {
      url.searchParams.delete("source");
    }

    if (nextUnit.trim()) {
      url.searchParams.set("unit", normalizeDashboardUnitName(nextUnit));
    } else {
      url.searchParams.delete("unit");
    }

    if (nextTab !== "ALL") {
      url.searchParams.set("tab", nextTab);
    } else {
      url.searchParams.delete("tab");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function resetDetailState() {
    setSwdklljDetailRows([]);
    setSelectedSwdklljParent("");
    setIwkbuDetailRows([]);
    setSelectedIwkbuParent("");
    setIwklDetailRows([]);
    setSelectedIwklParent("");
    setPreviewSwdklljRows([]);
    setPreviewIwkbuRows([]);
    setPreviewIwklRows([]);
  }

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    setAppliedYear(nextYear);
    resetDetailState();
    syncPendapatanUrl({
      year: nextYear,
      month,
      source,
      unit: unitQuery,
      tab: activeTab,
    });
  }

  function handleMonthChange(nextMonth: number) {
    setMonth(nextMonth);
    setAppliedMonth(nextMonth);
    resetDetailState();
    syncPendapatanUrl({
      year,
      month: nextMonth,
      source,
      unit: unitQuery,
      tab: activeTab,
    });
  }

  function handleUnitQueryChange(nextUnitQuery: string) {
    const normalizedUnit = normalizeDashboardUnitName(nextUnitQuery);

    setUnitQuery(normalizedUnit);
    resetDetailState();
    syncPendapatanUrl({
      year: appliedYear,
      month: appliedMonth,
      source,
      unit: normalizedUnit,
      tab: activeTab,
    });
  }

  function selectTab(tab: TabKey) {
    const nextSource = tab === "ALL" ? "ALL" : tab;

    setActiveTab(tab);
    setSource(nextSource);
    syncPendapatanUrl({
      year: appliedYear,
      month: appliedMonth,
      source: nextSource,
      unit: unitQuery,
      tab,
    });

    if (tab === "ALL" || !selectedUnit) return;

    if (tab === "SWDKLLJ") {
      openSwdklljDetail(selectedUnit.unit_name);
    } else if (tab === "IWKBU") {
      openIwkbuDetail(selectedUnit.unit_name);
    } else {
      openIwklDetail(selectedUnit.unit_name);
    }
  }

  function openSelectedSourceDetail(sourceKey: RevenueSourceKey) {
    if (!selectedUnit) return;

    setSource(sourceKey);
    setActiveTab(sourceKey);
    syncPendapatanUrl({
      year: appliedYear,
      month: appliedMonth,
      source: sourceKey,
      unit: selectedUnit.unit_name,
      tab: sourceKey,
    });

    if (sourceKey === "SWDKLLJ") {
      openSwdklljDetail(selectedUnit.unit_name);
    } else if (sourceKey === "IWKBU") {
      openIwkbuDetail(selectedUnit.unit_name);
    } else {
      openIwklDetail(selectedUnit.unit_name);
    }
  }

  function openUnitSourceDetail(unitName: string, sourceKey: RevenueSourceKey) {
    const normalizedUnit = normalizeDashboardUnitName(unitName);

    setUnitQuery(normalizedUnit);
    setSource(sourceKey);
    setActiveTab(sourceKey);
    resetDetailState();
    syncPendapatanUrl({
      year: appliedYear,
      month: appliedMonth,
      source: sourceKey,
      unit: normalizedUnit,
      tab: sourceKey,
    });

    if (sourceKey === "SWDKLLJ") {
      openSwdklljDetail(normalizedUnit);
    } else if (sourceKey === "IWKBU") {
      openIwkbuDetail(normalizedUnit);
    } else {
      openIwklDetail(normalizedUnit);
    }
  }

  const trendTabsRef = useRef<HTMLElement | null>(null);
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

  return (
    <main className="jr-page">
      <DashboardHeader
        title="Pendapatan"
        subtitle={getHeaderSubtitle(selectedUnit, activeTab)}
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
          onYearChange={handleYearChange}
          onMonthChange={(value) => {
            if (value !== "ALL") handleMonthChange(value);
          }}
          onSourceChange={() => undefined}
          onUnitQueryChange={handleUnitQueryChange}
          showPeriodFilter={false}
          showSourceFilter={false}
          showActions={false}
          unitLabel="Unit"
          unitMode="select"
          unitOptions={unitOptions}
        />

        {loading && (
          <div className="jr-state p-8 text-center text-sm font-semibold text-slate-500">
            Memuat data pendapatan...
          </div>
        )}

        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && overview && dashboardMetrics && activeMetrics && (
          <>
            {activeTab === "SWDKLLJ" && activeSwdklljMetrics ? (
              <SwdklljKpiGrid metrics={activeSwdklljMetrics} />
            ) : activeTab === "IWKBU" && activeIwkbuMetrics ? (
              <IwkbuKpiGrid
                metrics={activeIwkbuMetrics}
                scope={selectedUnit ? "unit" : "all"}
              />
            ) : activeTab === "IWKL" && activeIwklMetrics ? (
              <IwklKpiGrid
                metrics={activeIwklMetrics}
                scope={selectedUnit ? "unit" : "all"}
              />
            ) : (
              <GeneralKpiGrid metrics={activeMetrics} />
            )}

            <section
              ref={trendTabsRef}
              className={`sticky top-0 z-30 -mx-5 flex flex-wrap gap-2 bg-[#f5f7fb] px-5 transition-[padding,box-shadow,border-color] duration-150 ${
                isTrendTabsSticky
                  ? "border-b border-[#dce3ed] py-2"
                  : "border-b border-transparent py-0"
              }`}
            >
              <TabButton
                active={activeTab === "ALL"}
                label="Semua"
                onClick={() => selectTab("ALL")}
              />
              <TabButton
                active={activeTab === "SWDKLLJ"}
                label="SWDKLLJ"
                onClick={() => selectTab("SWDKLLJ")}
              />
              <TabButton
                active={activeTab === "IWKBU"}
                label="IWKBU"
                onClick={() => selectTab("IWKBU")}
              />
              <TabButton
                active={activeTab === "IWKL"}
                label="IWKL"
                onClick={() => selectTab("IWKL")}
              />
            </section>

            {selectedUnit && (
              <UnitFocusCard
                unit={selectedUnit}
                source={source}
                comparisonTotal={getSourceTotalFromMetrics(
                  dashboardMetrics,
                  activeTab
                )}
                rank={selectedSourceRank}
                unitCount={dashboardUnits.length}
              />
            )}

            {selectedUnit &&
              activeTab !== "SWDKLLJ" &&
              activeTab !== "IWKBU" && (
              <SectionCard
                title={trendTitle}
                action={<PanelBadge>{`YTD ${appliedYear}`}</PanelBadge>}
              >
                <StateTrendChart
                  data={trendData}
                  valueLabel={trendValueLabel}
                  color={trendColor}
                />
              </SectionCard>
            )}

            {selectedUnit && activeTab === "ALL" && (
              <>
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <SectionCard title="Komposisi Sumber Pendapatan">
                    <SourceCompositionPanel
                      items={unitSourceComposition}
                      total={activeMetrics.total_revenue}
                    />
                  </SectionCard>

                  <SectionCard
                    title="Posisi Unit terhadap Wilayah Lain"
                    action={
                      <PanelBadge>
                        {selectedSourceRank ? `#${selectedSourceRank}` : "-"}
                      </PanelBadge>
                    }
                  >
                    <UnitPositionPanel
                      units={dashboardUnits}
                      selectedUnitName={selectedUnit.unit_name}
                      source={activeTab}
                    />
                  </SectionCard>
                </section>

                <SectionCard title="Preview Kontributor Internal">
                  <InternalContributorsPreview
                    rows={previewContributorRows}
                    loading={previewLoading}
                    onOpenSource={openSelectedSourceDetail}
                  />
                </SectionCard>
              </>
            )}

            {selectedUnit &&
              activeTab === "SWDKLLJ" &&
              swdklljSourceMetrics && (
                <>
                  <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <SectionCard
                      title="Tren SWDKLLJ Bulanan"
                      action={<PanelBadge>{`YTD ${appliedYear}`}</PanelBadge>}
                    >
                      <StateTrendChart
                        data={trendData}
                        valueLabel={trendValueLabel}
                        color={trendColor}
                      />
                    </SectionCard>

                    <SectionCard
                      title="Top Kontributor SWDKLLJ"
                      className="flex flex-col"
                    >
                      <SourceTopContributorsPanel
                        rows={activeSwdklljRows.map((row) => ({
                          name: row.unit_name,
                          amount: toNumber(row.total),
                        }))}
                        emptyMessage="Tidak ada kontributor SWDKLLJ pada periode ini."
                        variant="dashboard"
                        className="flex-1"
                      />
                    </SectionCard>
                  </section>

                  <SectionCard title="Komposisi SWDKLLJ">
                    <SwdklljCompositionPanel metrics={swdklljSourceMetrics} />
                  </SectionCard>

                  <SectionCard
                    title={`Detail SWDKLLJ ${formatDisplayUnitName(
                      selectedUnit.unit_name
                    )}`}
                  >
                    {detailLoading || previewLoading ? (
                      <EmptyState message="Memuat detail SWDKLLJ..." />
                    ) : (
                      <SwdklljTable
                        rows={activeSwdklljRows}
                        onOpenDetail={() => undefined}
                      />
                    )}
                  </SectionCard>
                </>
              )}

            {selectedUnit && activeTab === "IWKBU" && iwkbuSourceMetrics && (
              <>
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <SectionCard
                    title="Tren IWKBU Bulanan"
                    action={<PanelBadge>{`YTD ${appliedYear}`}</PanelBadge>}
                  >
                    <StateTrendChart
                      data={trendData}
                      valueLabel={trendValueLabel}
                      color={trendColor}
                    />
                  </SectionCard>

                  <SectionCard
                    title="Top Kontributor IWKBU"
                    className="flex flex-col"
                  >
                    <SourceTopContributorsPanel
                      rows={activeIwkbuRows.map((row) => ({
                        name: row.unit_name,
                        amount: toNumber(row.iwkbu_current_year),
                      }))}
                      emptyMessage="Tidak ada kontributor IWKBU pada periode ini."
                      variant="dashboard"
                      className="flex-1"
                    />
                  </SectionCard>
                </section>

                <SectionCard title="Perbandingan IWKBU">
                  <IwkbuComparisonPanel metrics={iwkbuSourceMetrics} />
                </SectionCard>

                <SectionCard
                  title={`Detail IWKBU ${formatDisplayUnitName(
                    selectedUnit.unit_name
                  )}`}
                >
                  {detailLoading || previewLoading ? (
                    <EmptyState message="Memuat detail IWKBU..." />
                  ) : (
                    <IwkbuTable
                      rows={activeIwkbuRows}
                      onOpenDetail={() => undefined}
                    />
                  )}
                </SectionCard>
              </>
            )}

            {selectedUnit && activeTab === "IWKL" && iwklSourceMetrics && (
              <>
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <SectionCard title="Komposisi IWKL" className="flex flex-col">
                    <IwklCompositionPanel
                      rows={activeIwklRows}
                      metrics={iwklSourceMetrics}
                    />
                  </SectionCard>

                  <SectionCard title="Ringkasan Operator / Jenis">
                    <IwklOperatorSummaryPanel
                      rows={activeIwklRows}
                      metrics={iwklSourceMetrics}
                    />
                  </SectionCard>
                </section>

                <SectionCard
                  title={`Detail IWKL ${formatDisplayUnitName(
                    selectedUnit.unit_name
                  )}`}
                >
                  {detailLoading || previewLoading ? (
                    <EmptyState message="Memuat detail IWKL..." />
                  ) : (
                    <IwklDetailTable
                      rows={activeIwklRows}
                      total={iwklSourceMetrics.total}
                    />
                  )}
                </SectionCard>
              </>
            )}

            {!selectedUnit && (
              <>
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <SectionCard
                    title={trendTitle}
                    action={<PanelBadge>{`YTD ${appliedYear}`}</PanelBadge>}
                  >
                    <StateTrendChart
                      data={trendData}
                      valueLabel={trendValueLabel}
                      color={trendColor}
                    />
                  </SectionCard>

                  <SectionCard
                    title={`Top 5 Unit / Wilayah${
                      source === "ALL" ? "" : ` ${source}`
                    }`}
                    action={<PanelBadge>Top 5</PanelBadge>}
                  >
                    <TopUnitsCard
                      units={filteredUnits}
                      source={source}
                      year={appliedYear}
                      month={appliedMonth}
                    />
                  </SectionCard>
                </section>

                {activeTab === "ALL" && (
                  <>
                    <SectionCard title="Komposisi Sumber Pendapatan">
                      <SourceCompositionPanel
                        items={sourceComposition}
                        total={dashboardMetrics.total_revenue}
                      />
                    </SectionCard>

                    <SectionCard title="Tabel Gabungan Pendapatan">
                      {filteredUnits.length > 0 ? (
                        <CombinedRevenueTable
                          units={filteredUnits}
                          source={source}
                          year={appliedYear}
                          month={appliedMonth}
                          totalRevenue={dashboardMetrics.total_revenue}
                        />
                      ) : (
                        <EmptyState message="Tidak ada data unit yang sesuai filter." />
                      )}
                    </SectionCard>
                  </>
                )}

                {activeTab === "SWDKLLJ" && activeSwdklljMetrics && (
                  <>
                    <SectionCard title="Komposisi SWDKLLJ">
                      <SwdklljCompositionPanel metrics={activeSwdklljMetrics} />
                    </SectionCard>

                    <SectionCard title="Overview SWDKLLJ Semua Unit">
                      <SwdklljTable
                        rows={sourceOverviewRows.swdkllj}
                        onOpenDetail={(parent) =>
                          openUnitSourceDetail(parent, "SWDKLLJ")
                        }
                      />
                    </SectionCard>
                  </>
                )}

                {activeTab === "IWKBU" && activeIwkbuMetrics && (
                  <>
                    <SectionCard title="Perbandingan IWKBU">
                      <IwkbuComparisonPanel metrics={activeIwkbuMetrics} />
                    </SectionCard>

                    <SectionCard title="Overview IWKBU Semua Unit">
                      <IwkbuTable
                        rows={sourceOverviewRows.iwkbu}
                        onOpenDetail={(parent) =>
                          openUnitSourceDetail(parent, "IWKBU")
                        }
                      />
                    </SectionCard>
                  </>
                )}

                {activeTab === "IWKL" && activeIwklMetrics && (
                  <>
                    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                      <SectionCard title="Komposisi IWKL" className="flex flex-col">
                        <IwklCompositionPanel
                          rows={iwklAllDetailRows}
                          metrics={activeIwklMetrics}
                        />
                      </SectionCard>

                      <SectionCard title="Ringkasan Operator / Jenis">
                        <IwklOperatorSummaryPanel
                          rows={iwklAllDetailRows}
                          metrics={activeIwklMetrics}
                        />
                      </SectionCard>
                    </section>

                    <SectionCard title="Overview IWKL Semua Unit">
                      <IwklOverviewTable
                        rows={sourceOverviewRows.iwkl}
                        total={activeIwklMetrics.total}
                        onOpenDetail={(parent) =>
                          openUnitSourceDetail(parent, "IWKL")
                        }
                      />
                    </SectionCard>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
