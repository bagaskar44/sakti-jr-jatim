"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bus,
  CreditCard,
  ExternalLink,
  ReceiptText,
  Ship,
  X,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueCompositionChart } from "@/components/dashboard/RevenueCompositionChart";
import { RevenueSummaryTable } from "@/components/dashboard/RevenueSummaryTable";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { TopUnitsCard } from "@/components/dashboard/TopUnitsCard";
import { formatNumber, formatPercent, formatRupiah } from "@/lib/formatters";

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
  if (
    value === "ALL" ||
    value === "SWDKLLJ" ||
    value === "IWKBU" ||
    value === "IWKL"
  ) {
    return value;
  }

  return null;
}

function getGrowthDirection(value: number | string | null | undefined) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return "neutral";
  if (numberValue < 0) return "down";

  return "up";
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
      className={`rounded-[7px] px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[#1f4fea] text-white shadow-[0_10px_18px_rgba(30,64,175,0.2)]"
          : "border border-[#dce3ed] bg-white text-slate-600 hover:bg-[#f8fafc]"
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
  onClear,
  onOpenSource,
}: {
  unit: UnitRow;
  source: string;
  onClear: () => void;
  onOpenSource: (sourceKey: RevenueSourceKey) => void;
}) {
  const totalRevenue = toNumber(unit.total_revenue);
  const selectedAmount = getAmountBySource(unit, source);
  const sourceItems: Array<{
    key: RevenueSourceKey;
    label: string;
    amount: number;
    tone: string;
  }> = [
    {
      key: "SWDKLLJ",
      label: "SWDKLLJ",
      amount: toNumber(unit.swdkllj_total),
      tone: "border-blue-100 bg-blue-50 text-blue-700",
    },
    {
      key: "IWKBU",
      label: "IWKBU",
      amount: toNumber(unit.iwkbu_total),
      tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    {
      key: "IWKL",
      label: "IWKL",
      amount: toNumber(unit.iwkl_total),
      tone: "border-cyan-100 bg-cyan-50 text-cyan-700",
    },
  ];

  return (
    <section className="jr-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
              Unit Terpilih
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Fokus {getSourceLabel(source)}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-tight text-slate-950">
            {unit.unit_name}
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Total pendapatan {formatRupiah(totalRevenue)}
            {source !== "ALL" ? `, fokus ${formatRupiah(selectedAmount)}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="jr-button-secondary"
        >
          <X size={16} />
          Bersihkan Unit
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {sourceItems.map((item) => {
          const disabled = item.amount <= 0;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onOpenSource(item.key)}
              disabled={disabled}
              className={`rounded-[8px] border p-4 text-left transition ${
                disabled
                  ? "border-slate-100 bg-[#f8fafc] text-slate-400"
                  : `${item.tone} hover:-translate-y-0.5 hover:shadow-sm`
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatRupiah(item.amount)}
                  </p>
                </div>
                <ArrowRight size={17} className="mt-0.5 shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SwdklljTable({
  rows,
  onOpenDetail,
}: {
  rows: SwdklljRow[];
  onOpenDetail: (parent: string) => void;
}) {
  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Kantor</th>
              <th className="px-4 py-3">Level</th>
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
              <tr key={`${row.level}-${row.unit_name}`} className="hover:bg-[#f8fafc]">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {row.unit_name}
                </td>
                <td className="px-4 py-3 text-slate-500">{row.level}</td>
                <td className="px-4 py-3">{formatRupiah(row.kd)}</td>
                <td className="px-4 py-3">{formatRupiah(row.sw)}</td>
                <td className="px-4 py-3">{formatRupiah(row.denda)}</td>
                <td className="px-4 py-3">
                  {formatRupiah(row.setor_adjustment)}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {formatRupiah(row.total)}
                </td>
                <td className="px-4 py-3">{formatNumber(row.transaction_count)}</td>
                <td className="px-4 py-3">
                  <DetailLinkButton
                    disabled={!row.is_drillable}
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
  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Kantor</th>
              <th className="px-4 py-3">ASK Tahun Lalu</th>
              <th className="px-4 py-3">IWKBU Tahun Lalu</th>
              <th className="px-4 py-3">ASK Tahun Ini</th>
              <th className="px-4 py-3">IWKBU Tahun Ini</th>
              <th className="px-4 py-3">Aktivitas IWKBU</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={`${row.level}-${row.unit_name}`} className="hover:bg-[#f8fafc]">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {row.unit_name}
                </td>
                <td className="px-4 py-3">{formatRupiah(row.ask_last_year)}</td>
                <td className="px-4 py-3">{formatRupiah(row.iwkbu_last_year)}</td>
                <td className="px-4 py-3">{formatRupiah(row.ask_current_year)}</td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {formatRupiah(row.iwkbu_current_year)}
                </td>
                <td className="px-4 py-3">
                  <GrowthBadge value={row.iwkbu_activity_pct} />
                </td>
                <td className="px-4 py-3">
                  <DetailLinkButton
                    disabled={!row.is_drillable}
                    onClick={() => {
                      const parent =
                        row.unit_name === "LOKET KANTOR WILAYAH JAWA TIMUR"
                          ? "KANTOR WILAYAH JAWA TIMUR"
                          : row.unit_name.replace("LOKET ", "");

                      onOpenDetail(parent);
                    }}
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

function IwklSummaryTable({
  rows,
  onOpenDetail,
}: {
  rows: IwklRow[];
  onOpenDetail: (parent: string) => void;
}) {
  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Kantor</th>
              <th className="px-4 py-3">Penumpang</th>
              <th className="px-4 py-3">Nominal</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.unit_name} className="hover:bg-[#f8fafc]">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {row.unit_name}
                </td>
                <td className="px-4 py-3">{formatNumber(row.passenger_count)}</td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {formatRupiah(row.nominal)}
                </td>
                <td className="px-4 py-3">
                  <DetailLinkButton onClick={() => onOpenDetail(row.unit_name)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IwklDetailTable({ rows }: { rows: IwklDetailRow[] }) {
  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Jenis</th>
              <th className="px-4 py-3">Penumpang</th>
              <th className="px-4 py-3">Nominal</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={`${row.parent_unit_name}-${row.detail_type}`} className="hover:bg-[#f8fafc]">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {row.detail_type}
                </td>
                <td className="px-4 py-3">{formatNumber(row.passenger_count)}</td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {formatRupiah(row.nominal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PendapatanPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [source, setSource] = useState("ALL");
  const [unitQuery, setUnitQuery] = useState("");

  const [appliedYear, setAppliedYear] = useState(2026);
  const [appliedMonth, setAppliedMonth] = useState(5);

  const [activeTab, setActiveTab] = useState<TabKey>("ALL");

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [composition, setComposition] = useState<CompositionItem[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [swdklljRows, setSwdklljRows] = useState<SwdklljRow[]>([]);
  const [swdklljDetailRows, setSwdklljDetailRows] = useState<SwdklljRow[]>([]);
  const [selectedSwdklljParent, setSelectedSwdklljParent] = useState("");

  const [iwkbuRows, setIwkbuRows] = useState<IwkbuRow[]>([]);
  const [iwkbuDetailRows, setIwkbuDetailRows] = useState<IwkbuRow[]>([]);
  const [selectedIwkbuParent, setSelectedIwkbuParent] = useState("");

  const [iwklSummaryRows, setIwklSummaryRows] = useState<IwklRow[]>([]);
  const [iwklDetailRows, setIwklDetailRows] = useState<IwklDetailRow[]>([]);
  const [selectedIwklParent, setSelectedIwklParent] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
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
        setUnitQuery(initialUnit);
      }

      if (initialSource) {
        setSource(initialSource);
      }

      if (initialTab) {
        setActiveTab(initialTab);
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
      const [
        overviewResponse,
        unitsResponse,
        swdklljResponse,
        iwkbuResponse,
        iwklResponse,
      ] = await Promise.all([
        fetch(
          `/api/dashboard/revenue/overview?year=${targetYear}&month=${targetMonth}`
        ),
        fetch(
          `/api/dashboard/revenue/units?year=${targetYear}&month=${targetMonth}&limit=200`
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

      const overviewJson =
        (await overviewResponse.json()) as OverviewResponse;
      const unitsJson = (await unitsResponse.json()) as UnitsResponse;
      const swdklljJson = (await swdklljResponse.json()) as SwdklljResponse;
      const iwkbuJson = (await iwkbuResponse.json()) as IwkbuResponse;
      const iwklJson = (await iwklResponse.json()) as IwklResponse;

      if (!overviewResponse.ok || !overviewJson.success) {
        throw new Error("Gagal mengambil overview pendapatan.");
      }

      if (!unitsResponse.ok || !unitsJson.success) {
        throw new Error("Gagal mengambil data unit.");
      }

      if (!swdklljResponse.ok || !swdklljJson.success) {
        throw new Error("Gagal mengambil data SWDKLLJ.");
      }

      if (!iwkbuResponse.ok || !iwkbuJson.success) {
        throw new Error("Gagal mengambil data IWKBU.");
      }

      if (!iwklResponse.ok || !iwklJson.success) {
        throw new Error("Gagal mengambil data IWKL.");
      }

      setOverview(overviewJson.overview);
      setComposition(overviewJson.composition ?? []);
      setUnits(unitsJson.data ?? []);
      setSwdklljRows(swdklljJson.data ?? []);
      setIwkbuRows(iwkbuJson.data ?? []);
      setIwklSummaryRows(iwklJson.summary ?? []);

      setSwdklljDetailRows([]);
      setSelectedSwdklljParent("");
      setIwkbuDetailRows([]);
      setSelectedIwkbuParent("");
      setIwklDetailRows([]);
      setSelectedIwklParent("");
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

  const selectedUnit = useMemo(() => {
    const query = unitQuery.trim().toUpperCase();

    if (!query) return null;

    return (
      units.find((unit) => unit.unit_name.toUpperCase() === query) ??
      filteredUnits[0] ??
      null
    );
  }, [filteredUnits, unitQuery, units]);

  const filteredSwdklljRows = useMemo(() => {
    const query = unitQuery.trim().toUpperCase();

    return swdklljRows.filter((row) => {
      if (!query) return true;

      return row.unit_name.toUpperCase().includes(query);
    });
  }, [swdklljRows, unitQuery]);

  const filteredIwkbuRows = useMemo(() => {
    const query = unitQuery.trim().toUpperCase();

    return iwkbuRows.filter((row) => {
      if (!query) return true;

      return row.unit_name.toUpperCase().includes(query);
    });
  }, [iwkbuRows, unitQuery]);

  const filteredIwklRows = useMemo(() => {
    const query = unitQuery.trim().toUpperCase();

    return iwklSummaryRows.filter((row) => {
      if (!query) return true;

      return row.unit_name.toUpperCase().includes(query);
    });
  }, [iwklSummaryRows, unitQuery]);

  function handleApply() {
    const nextTab = source !== "ALL" ? (source as TabKey) : activeTab;

    setAppliedYear(year);
    setAppliedMonth(month);

    if (source !== "ALL") {
      setActiveTab(nextTab);
    }

    syncPendapatanUrl({
      year,
      month,
      source,
      unit: unitQuery,
      tab: nextTab,
    });
  }

  function handleReset() {
    setYear(2026);
    setMonth(5);
    setSource("ALL");
    setUnitQuery("");
    setAppliedYear(2026);
    setAppliedMonth(5);
    setActiveTab("ALL");
    syncPendapatanUrl({
      year: 2026,
      month: 5,
      source: "ALL",
      unit: "",
      tab: "ALL",
    });
  }

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
      url.searchParams.set("unit", nextUnit.trim());
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

  function selectTab(tab: TabKey) {
    setActiveTab(tab);
    syncPendapatanUrl({
      year: appliedYear,
      month: appliedMonth,
      source,
      unit: unitQuery,
      tab,
    });
  }

  function clearSelectedUnit() {
    setUnitQuery("");
    syncPendapatanUrl({
      year: appliedYear,
      month: appliedMonth,
      source,
      unit: "",
      tab: activeTab,
    });
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

  async function openSwdklljDetail(parent: string) {
    setDetailLoading(true);
    setSelectedSwdklljParent(parent);

    try {
      const response = await fetch(
        `/api/dashboard/revenue/swdkllj?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
          parent
        )}`
      );

      const json = (await response.json()) as SwdklljResponse;

      if (!response.ok || !json.success) {
        throw new Error("Gagal mengambil detail SWDKLLJ.");
      }

      setSwdklljDetailRows(json.data ?? []);
    } catch {
      setSwdklljDetailRows([]);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openIwkbuDetail(parent: string) {
    setDetailLoading(true);
    setSelectedIwkbuParent(parent);

    try {
      const response = await fetch(
        `/api/dashboard/revenue/iwkbu?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
          parent
        )}`
      );

      const json = (await response.json()) as IwkbuResponse;

      if (!response.ok || !json.success) {
        throw new Error("Gagal mengambil detail IWKBU.");
      }

      setIwkbuDetailRows(json.data ?? []);
    } catch {
      setIwkbuDetailRows([]);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openIwklDetail(parent: string) {
    setDetailLoading(true);
    setSelectedIwklParent(parent);

    try {
      const response = await fetch(
        `/api/dashboard/revenue/iwkl?year=${appliedYear}&month=${appliedMonth}&parent=${encodeURIComponent(
          parent
        )}`
      );

      const json = (await response.json()) as IwklResponse;

      if (!response.ok || !json.success) {
        throw new Error("Gagal mengambil detail IWKL.");
      }

      setIwklDetailRows(json.details ?? []);
    } catch {
      setIwklDetailRows([]);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <main className="jr-page">
      <DashboardHeader
        title="Pendapatan"
        year={appliedYear}
        month={appliedMonth}
        updatedAt={formatUpdatedAt(overview?.uploaded_at)}
      />

      <div className="w-full space-y-5 px-5 pb-5 pt-2">
        <FilterBar
          year={year}
          month={month}
          source={source}
          unitQuery={unitQuery}
          onYearChange={setYear}
          onMonthChange={(value) => {
            if (value !== "ALL") setMonth(value);
          }}
          onSourceChange={setSource}
          onUnitQueryChange={setUnitQuery}
          onApply={handleApply}
          onReset={handleReset}
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

        {!loading && !error && overview && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
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
                        direction: getGrowthDirection(
                          overview.iwkbu_growth_pct
                        ) as "up" | "down" | "neutral",
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

            <section className="flex flex-wrap gap-2">
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
                onClear={clearSelectedUnit}
                onOpenSource={openSelectedSourceDetail}
              />
            )}

            {activeTab === "ALL" && (
              <div className="space-y-5">
                <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <SectionCard title="Distribusi Pendapatan">
                    <RevenueCompositionChart data={composition} />
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

                <SectionCard title="Tabel Gabungan Pendapatan">
                  {filteredUnits.length > 0 ? (
                    <RevenueSummaryTable
                        units={filteredUnits}
                        source={source}
                        year={appliedYear}
                        month={appliedMonth}
                    />
                  ) : (
                    <EmptyState message="Tidak ada data unit yang sesuai filter." />
                  )}
                </SectionCard>
              </div>
            )}

            {activeTab === "SWDKLLJ" && (
              <div className="space-y-5">
                <SectionCard title="Data SWDKLLJ Summary">
                  {filteredSwdklljRows.length > 0 ? (
                    <SwdklljTable
                      rows={filteredSwdklljRows}
                      onOpenDetail={openSwdklljDetail}
                    />
                  ) : (
                    <EmptyState message="Tidak ada data SWDKLLJ yang sesuai filter." />
                  )}
                </SectionCard>

                <SectionCard
                  title={
                    selectedSwdklljParent
                      ? `Detail SWDKLLJ ${selectedSwdklljParent}`
                      : "Detail SWDKLLJ"
                  }
                >
                  {detailLoading && selectedSwdklljParent ? (
                    <EmptyState message="Memuat detail SWDKLLJ..." />
                  ) : selectedSwdklljParent && swdklljDetailRows.length > 0 ? (
                    <SwdklljTable
                      rows={swdklljDetailRows}
                      onOpenDetail={openSwdklljDetail}
                    />
                  ) : (
                    <EmptyState message="Pilih kantor cabang pada tabel summary untuk melihat detail Samsat." />
                  )}
                </SectionCard>
              </div>
            )}

            {activeTab === "IWKBU" && (
              <div className="space-y-5">
                <SectionCard title="Data IWKBU Summary">
                  {filteredIwkbuRows.length > 0 ? (
                    <IwkbuTable
                      rows={filteredIwkbuRows}
                      onOpenDetail={openIwkbuDetail}
                    />
                  ) : (
                    <EmptyState message="Tidak ada data IWKBU yang sesuai filter." />
                  )}
                </SectionCard>

                <SectionCard
                  title={
                    selectedIwkbuParent
                      ? `Detail IWKBU ${selectedIwkbuParent}`
                      : "Detail IWKBU"
                  }
                >
                  {detailLoading && selectedIwkbuParent ? (
                    <EmptyState message="Memuat detail IWKBU..." />
                  ) : selectedIwkbuParent && iwkbuDetailRows.length > 0 ? (
                    <IwkbuTable
                      rows={iwkbuDetailRows}
                      onOpenDetail={openIwkbuDetail}
                    />
                  ) : (
                    <EmptyState message="Pilih kantor pada tabel summary untuk melihat detail IWKBU." />
                  )}
                </SectionCard>
              </div>
            )}

            {activeTab === "IWKL" && (
              <div className="space-y-5">
                <SectionCard title="Data IWKL Summary">
                  {filteredIwklRows.length > 0 ? (
                    <IwklSummaryTable
                      rows={filteredIwklRows}
                      onOpenDetail={openIwklDetail}
                    />
                  ) : (
                    <EmptyState message="Tidak ada data IWKL yang sesuai filter." />
                  )}
                </SectionCard>

                <SectionCard
                  title={
                    selectedIwklParent
                      ? `Detail IWKL ${selectedIwklParent}`
                      : "Detail IWKL"
                  }
                >
                  {detailLoading && selectedIwklParent ? (
                    <EmptyState message="Memuat detail IWKL..." />
                  ) : selectedIwklParent && iwklDetailRows.length > 0 ? (
                    <IwklDetailTable rows={iwklDetailRows} />
                  ) : (
                    <EmptyState message="Pilih kantor pada tabel summary untuk melihat detail jenis/operator IWKL." />
                  )}
                </SectionCard>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
