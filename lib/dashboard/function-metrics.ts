import { formatNumber, formatPercent, formatRupiah } from "@/lib/formatters";

export type DashboardFunctionMetric = "PENDAPATAN" | "PELAYANAN" | "KECELAKAAN";

export type FunctionMetricUnit = {
  unit_name: string;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
};

export type UnitMetricDetail = {
  label: string;
  value: number;
  formattedValue: string;
};

export type UnitMetricResult = {
  primaryLabel: string;
  primaryValue: number;
  formattedPrimaryValue: string;
  details: UnitMetricDetail[];
};

function toNumber(value: number | string | null | undefined) {
  const result = Number(value ?? 0);
  return Number.isNaN(result) ? 0 : result;
}

function getRevenueAmount(unit: FunctionMetricUnit, source: string) {
  if (source === "SWDKLLJ") return toNumber(unit.swdkllj_total);
  if (source === "IWKBU") return toNumber(unit.iwkbu_total);
  if (source === "IWKL") return toNumber(unit.iwkl_total);

  return toNumber(unit.total_revenue);
}

function getStaticPelayanan(unit: FunctionMetricUnit) {
  return 90 + (unit.unit_name.length % 7) * 11;
}

function getStaticKecelakaan(unit: FunctionMetricUnit) {
  return 8 + (unit.unit_name.length % 5) * 3;
}

export function getDashboardFunctionLabel(functionName: DashboardFunctionMetric) {
  if (functionName === "PELAYANAN") return "Pelayanan";
  if (functionName === "KECELAKAAN") return "Kecelakaan";

  return "Pendapatan";
}

export function getDashboardFunctionColor(functionName: DashboardFunctionMetric) {
  if (functionName === "PELAYANAN") return "#0891b2";
  if (functionName === "KECELAKAAN") return "#e11d48";

  return "#1f4fea";
}

export function formatDashboardFunctionValue(
  functionName: DashboardFunctionMetric,
  value: number
) {
  if (functionName === "PENDAPATAN") return formatRupiah(value);

  return formatNumber(value);
}

export function getUnitFunctionMetric({
  unit,
  source,
  functionName,
}: {
  unit: FunctionMetricUnit;
  source: string;
  functionName: DashboardFunctionMetric;
}): UnitMetricResult {
  if (functionName === "PELAYANAN") {
    const totalPelayanan = getStaticPelayanan(unit);
    const layananSelesai = totalPelayanan - 6;
    const sla = 96.4;

    return {
      primaryLabel: "Total Pelayanan",
      primaryValue: totalPelayanan,
      formattedPrimaryValue: formatNumber(totalPelayanan),
      details: [
        {
          label: "SLA",
          value: sla,
          formattedValue: formatPercent(sla),
        },
        {
          label: "Layanan Selesai",
          value: layananSelesai,
          formattedValue: formatNumber(layananSelesai),
        },
      ],
    };
  }

  if (functionName === "KECELAKAAN") {
    const totalKecelakaan = getStaticKecelakaan(unit);
    const santunanProses = 2 + (unit.unit_name.length % 4);
    const sla = 93.8;

    return {
      primaryLabel: "Total Kecelakaan",
      primaryValue: totalKecelakaan,
      formattedPrimaryValue: formatNumber(totalKecelakaan),
      details: [
        {
          label: "Santunan Proses",
          value: santunanProses,
          formattedValue: formatNumber(santunanProses),
        },
        {
          label: "SLA",
          value: sla,
          formattedValue: formatPercent(sla),
        },
      ],
    };
  }

  const amount = getRevenueAmount(unit, source);

  return {
    primaryLabel: source === "ALL" ? "Total Pendapatan" : source,
    primaryValue: amount,
    formattedPrimaryValue: formatRupiah(amount),
    details: [
      {
        label: "SWDKLLJ",
        value: toNumber(unit.swdkllj_total),
        formattedValue: formatRupiah(unit.swdkllj_total),
      },
      {
        label: "IWKBU",
        value: toNumber(unit.iwkbu_total),
        formattedValue: formatRupiah(unit.iwkbu_total),
      },
      {
        label: "IWKL",
        value: toNumber(unit.iwkl_total),
        formattedValue: formatRupiah(unit.iwkl_total),
      },
    ],
  };
}

export function getFunctionDetailHref({
  unitName,
  year,
  month,
  source,
  functionName,
}: {
  unitName: string;
  year?: number;
  month?: number | "ALL";
  source: string;
  functionName: DashboardFunctionMetric;
}) {
  const params = new URLSearchParams();

  if (year) params.set("year", String(year));
  if (month) params.set("month", month === "ALL" ? "all" : String(month));
  params.set("unit", unitName);

  if (functionName === "PENDAPATAN") {
    if (source !== "ALL") {
      params.set("source", source);
      params.set("tab", source);
    }

    return `/pendapatan?${params.toString()}`;
  }

  if (functionName === "PELAYANAN") {
    return `/pelayanan?${params.toString()}`;
  }

  return `/kecelakaan?${params.toString()}`;
}
