"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CloudUpload,
  ClipboardList,
  Database,
  Eye,
  FileCheck2,
  Loader2,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { formatNumber, formatRupiah } from "@/lib/formatters";

type ValidationIssue = {
  sheet: string;
  severity?: "error" | "warning";
  row?: number;
  column?: string;
  message: string;
  context?: Record<string, unknown>;
};

type RevenueTotals = {
  swdkllj_total?: number;
  swdkllj_detail_total?: number;
  swdkllj_transaction_count?: number;
  swdkllj_detail_transaction_count?: number;
  iwkbu_current_year?: number;
  iwkbu_last_year?: number;
  iwkl_nominal?: number;
  iwkl_passenger_count?: number;
};

type RevenueRowCounts = {
  swdkllj?: number;
  swdkllj_detail?: number;
  iwkbu?: number;
  iwkbu_detail?: number;
  iwkl?: number;
  iwkl_detail?: number;
};

type ValidateResponse = {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  rowCounts?: RevenueRowCounts;
  totals?: RevenueTotals;
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
};

type SyncResponse = {
  success: boolean;
  message: string;
  batch_id?: string;
  period_year?: number;
  period_month?: number;
  rowCounts?: RevenueRowCounts;
  totals?: RevenueTotals;
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
  error?: string;
};

type SyncLogRow = {
  id: string;
  batch_id: string | null;
  period_year: number;
  period_month: number;
  spreadsheet_id: string | null;
  status: string;
  message: string | null;
  technical_error_count: number;
  business_warning_count: number;
  row_counts: RevenueRowCounts | null;
  totals: RevenueTotals | null;
  created_at: string;
};

type SyncLogsResponse = {
  success: boolean;
  message: string;
  count?: number;
  data: SyncLogRow[];
};

type StatusType = "idle" | "loading" | "success" | "warning" | "error";
type AuditStatusFilter = "all" | "success" | "warning" | "failed";

const months = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

function getMonthLabel(month: number) {
  return months.find((item) => item.value === month)?.label ?? "-";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getLogStatus(status: string): StatusType {
  const normalized = status.toLowerCase();

  if (normalized.includes("success") || normalized.includes("processed")) {
    return "success";
  }

  if (normalized.includes("failed")) {
    return "error";
  }

  return "warning";
}

function getLogTotalRevenue(log: SyncLogRow) {
  return (
    Number(log.totals?.swdkllj_total ?? 0) +
    Number(log.totals?.iwkbu_current_year ?? 0) +
    Number(log.totals?.iwkl_nominal ?? 0)
  );
}

function getLogTotalRows(log: SyncLogRow) {
  const rowCounts = log.row_counts;

  if (!rowCounts) return 0;

  return (
    Number(rowCounts.swdkllj ?? 0) +
    Number(rowCounts.swdkllj_detail ?? 0) +
    Number(rowCounts.iwkbu ?? 0) +
    Number(rowCounts.iwkbu_detail ?? 0) +
    Number(rowCounts.iwkl ?? 0) +
    Number(rowCounts.iwkl_detail ?? 0)
  );
}

function StatusBadge({ status }: { status: StatusType }) {
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
        <Loader2 size={14} className="animate-spin" />
        Memproses
      </span>
    );
  }

  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 size={14} />
        Berhasil
      </span>
    );
  }

  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
        <AlertTriangle size={14} />
        Ada Warning
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
        <XCircle size={14} />
        Gagal
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      Belum diproses
    </span>
  );
}

function MetricBox({
  label,
  value,
  type = "number",
}: {
  label: string;
  value: number | undefined;
  type?: "number" | "rupiah";
}) {
  return (
    <div className="rounded-[8px] border border-[#dce3ed] bg-[#f8fafc] p-4">
      <p className="jr-label">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">
        {type === "rupiah"
          ? formatRupiah(value ?? 0)
          : formatNumber(value ?? 0)}
      </p>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getContextText(value: unknown) {
  if (value === null || value === undefined) return "-";

  return String(value);
}

function getUnmappedUnits(issue: ValidationIssue) {
  const rawItems = issue.context?.unmapped_units;

  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .filter(isRecord)
    .map((item) => ({
      sheet: getContextText(item.sheet),
      field: getContextText(item.field),
      value: getContextText(item.value),
    }));
}

function IssueContextDetails({
  issue,
  type,
}: {
  issue: ValidationIssue;
  type: "error" | "warning";
}) {
  const unmappedUnits = getUnmappedUnits(issue);
  const totalUnmappedUnits = Number(
    issue.context?.total_unmapped_units ?? unmappedUnits.length
  );
  const examples = Array.isArray(issue.context?.examples)
    ? issue.context.examples.map(getContextText)
    : [];
  const borderTone = type === "error" ? "border-red-100" : "border-orange-100";
  const labelTone = type === "error" ? "text-red-700" : "text-orange-700";
  const chipTone =
    type === "error"
      ? "bg-red-100 text-red-700"
      : "bg-orange-100 text-orange-700";

  if (unmappedUnits.length > 0) {
    return (
      <div className={`mt-3 border-t pt-3 ${borderTone}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className={`text-xs font-bold uppercase tracking-wide ${labelTone}`}>
            Unit belum terpetakan
          </p>
          <span className={`rounded-full px-2 py-1 text-xs font-bold ${chipTone}`}>
            {formatNumber(totalUnmappedUnits)} nama
          </span>
        </div>

        <div className={`divide-y ${borderTone}`}>
          {unmappedUnits.map((item, index) => (
            <div
              key={`${item.sheet}-${item.field}-${item.value}-${index}`}
              className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[minmax(180px,1fr)_minmax(140px,auto)] sm:items-center"
            >
              <p className="text-sm font-bold leading-5 text-slate-950">
                {item.value}
              </p>
              <p className="text-xs font-semibold leading-5 text-slate-500 sm:text-right">
                {item.sheet} / {item.field}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (examples.length > 0) {
    return (
      <div className={`mt-3 border-t pt-3 ${borderTone}`}>
        <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${labelTone}`}>
          Contoh
        </p>
        <div className="flex flex-wrap gap-1.5">
          {examples.slice(0, 20).map((example, index) => (
            <span
              key={`${example}-${index}`}
              className={`rounded-full px-2 py-1 text-xs font-semibold ${chipTone}`}
            >
              {example}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function IssueList({
  title,
  issues,
  type,
}: {
  title: string;
  issues: ValidationIssue[];
  type: "error" | "warning";
}) {
  const tone =
    type === "error"
      ? {
          panel: "border-red-200 bg-red-50/60",
          divider: "divide-red-100",
          headerBorder: "border-red-100",
          heading: "text-red-700",
          count: "bg-red-100 text-red-700",
          meta: "text-red-700",
          message: "text-red-900",
        }
      : {
          panel: "border-orange-200 bg-orange-50/60",
          divider: "divide-orange-100",
          headerBorder: "border-orange-100",
          heading: "text-orange-700",
          count: "bg-orange-100 text-orange-700",
          meta: "text-orange-700",
          message: "text-orange-900",
        };

  if (issues.length === 0) {
    return (
      <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        Tidak ada {title.toLowerCase()}.
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-[8px] border ${tone.panel}`}>
      <div
        className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${tone.headerBorder}`}
      >
        <h3 className={`text-sm font-bold ${tone.heading}`}>{title}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-bold ${tone.count}`}>
          {issues.length} item
        </span>
      </div>

      <div className={`max-h-80 divide-y overflow-y-auto ${tone.divider}`}>
        {issues.map((issue, index) => (
          <article
            key={`${issue.sheet}-${index}`}
            className="px-4 py-3"
          >
            <p className={`text-xs font-bold uppercase tracking-wide ${tone.meta}`}>
              {issue.sheet}
              {issue.row ? ` / Baris ${issue.row}` : ""}
              {issue.column ? ` / ${issue.column}` : ""}
            </p>
            <p className={`mt-1 text-sm font-semibold leading-6 ${tone.message}`}>
              {issue.message}
            </p>
            <IssueContextDetails issue={issue} type={type} />
          </article>
        ))}
      </div>
    </div>
  );
}

function AuditSummary({ logs }: { logs: SyncLogRow[] }) {
  const successCount = logs.filter((log) => getLogStatus(log.status) === "success")
    .length;
  const failedCount = logs.filter((log) => getLogStatus(log.status) === "error")
    .length;
  const warningCount = logs.filter(
    (log) => Number(log.business_warning_count ?? 0) > 0
  ).length;
  const totalRows = logs.reduce((sum, log) => sum + getLogTotalRows(log), 0);
  const latestLog = logs[0];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        title="Log Ditampilkan"
        value={formatNumber(logs.length)}
        subtitle="Sesuai filter aktif"
        icon={<ClipboardList size={22} />}
      />
      <KpiCard
        title="Berhasil"
        value={formatNumber(successCount)}
        subtitle="Sync sukses"
        icon={<CheckCircle2 size={22} />}
      />
      <KpiCard
        title="Ada Warning"
        value={formatNumber(warningCount)}
        subtitle="Sync dengan catatan"
        icon={<AlertTriangle size={22} />}
      />
      <KpiCard
        title="Gagal"
        value={formatNumber(failedCount)}
        subtitle="Sync gagal"
        icon={<XCircle size={22} />}
      />
      <KpiCard
        title="Terakhir Sync"
        value={latestLog ? formatDateTime(latestLog.created_at) : "-"}
        subtitle={`${formatNumber(totalRows)} row terbaca`}
        icon={<Clock size={22} />}
      />
    </div>
  );
}

function AuditFilterBar({
  status,
  year,
  month,
  onStatusChange,
  onYearChange,
  onMonthChange,
}: {
  status: AuditStatusFilter;
  year: string;
  month: string;
  onStatusChange: (value: AuditStatusFilter) => void;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-[#e5edf6] pb-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="jr-label">
            Status
          </label>
          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as AuditStatusFilter)
            }
            className="jr-field mt-2"
          >
            <option value="all">Semua Status</option>
            <option value="success">Berhasil</option>
            <option value="warning">Ada Warning</option>
            <option value="failed">Gagal</option>
          </select>
        </div>

        <div>
          <label className="jr-label">Bulan</label>
          <select
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            className="jr-field mt-2"
          >
            <option value="">Semua Bulan</option>
            {months.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="jr-label">Tahun</label>
          <select
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            className="jr-field mt-2"
          >
            <option value="">Semua Tahun</option>
            {[2024, 2025, 2026, 2027].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function SyncLogDetailPanel({ log }: { log: SyncLogRow | null }) {
  if (!log) {
    return (
      <div className="jr-state border-dashed p-6 text-center text-sm font-semibold text-slate-500">
        Pilih salah satu log untuk melihat detail audit.
      </div>
    );
  }

  const totalRevenue = getLogTotalRevenue(log);
  const totalRows = getLogTotalRows(log);

  return (
    <div className="jr-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="jr-label">
            Detail Audit
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">
            {getMonthLabel(log.period_month)} {log.period_year}
          </h3>
        </div>
        <StatusBadge status={getLogStatus(log.status)} />
      </div>

      <div className="space-y-3">
        <div className="rounded-[8px] bg-[#f8fafc] p-3">
          <p className="text-xs font-semibold text-slate-500">Message</p>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
            {log.message ?? "-"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricBox label="Warning" value={log.business_warning_count} />
          <MetricBox label="Error" value={log.technical_error_count} />
          <MetricBox label="Total Row" value={totalRows} />
          <MetricBox label="Pendapatan" value={totalRevenue} type="rupiah" />
        </div>

        <div className="rounded-[8px] border border-[#dce3ed]">
          <div className="border-b border-[#dce3ed] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Row Counts
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 text-sm">
            <span className="text-slate-500">SWDKLLJ</span>
            <span className="text-right font-bold text-slate-900">
              {formatNumber(log.row_counts?.swdkllj ?? 0)}
            </span>
            <span className="text-slate-500">SWDKLLJ Detail</span>
            <span className="text-right font-bold text-slate-900">
              {formatNumber(log.row_counts?.swdkllj_detail ?? 0)}
            </span>
            <span className="text-slate-500">IWKBU</span>
            <span className="text-right font-bold text-slate-900">
              {formatNumber(log.row_counts?.iwkbu ?? 0)}
            </span>
            <span className="text-slate-500">IWKBU Detail</span>
            <span className="text-right font-bold text-slate-900">
              {formatNumber(log.row_counts?.iwkbu_detail ?? 0)}
            </span>
            <span className="text-slate-500">IWKL</span>
            <span className="text-right font-bold text-slate-900">
              {formatNumber(log.row_counts?.iwkl ?? 0)}
            </span>
            <span className="text-slate-500">IWKL Detail</span>
            <span className="text-right font-bold text-slate-900">
              {formatNumber(log.row_counts?.iwkl_detail ?? 0)}
            </span>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#dce3ed]">
          <div className="border-b border-[#dce3ed] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Identitas Sync
          </div>
          <div className="space-y-3 p-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500">Batch ID</p>
              <p className="mt-1 break-all font-bold text-slate-900">
                {log.batch_id ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Spreadsheet ID
              </p>
              <p className="mt-1 break-all font-bold text-slate-900">
                {log.spreadsheet_id ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Waktu Sync
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {formatDateTime(log.created_at)}
              </p>
            </div>
          </div>
        </div>

        <a
          href={`/pendapatan?year=${log.period_year}&month=${log.period_month}`}
          className="jr-button-primary w-full"
        >
          <Eye size={16} />
          Buka Dashboard Periode
        </a>
      </div>
    </div>
  );
}

function SyncLogTable({
  logs,
  selectedLogId,
  onSelectLog,
}: {
  logs: SyncLogRow[];
  selectedLogId: string | null;
  onSelectLog: (log: SyncLogRow) => void;
}) {
  if (logs.length === 0) {
    return (
      <div className="jr-state border-dashed p-8 text-center text-sm font-semibold text-slate-500">
        Tidak ada riwayat sync pendapatan yang sesuai filter.
      </div>
    );
  }

  return (
    <div className="jr-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="jr-table-head">
            <tr>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Warning</th>
              <th className="px-4 py-3">Error</th>
              <th className="px-4 py-3">Total Pendapatan</th>
              <th className="px-4 py-3">Waktu Sync</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {logs.map((log) => {
              const status = getLogStatus(log.status);
              const totalRevenue = getLogTotalRevenue(log);
              const selected = selectedLogId === log.id;

              return (
                <tr
                  key={log.id}
                  className={selected ? "bg-blue-50" : "hover:bg-[#f8fafc]"}
                >
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {getMonthLabel(log.period_month)} {log.period_year}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        status === "success"
                          ? "bg-emerald-50 text-emerald-700"
                          : status === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>

                  <td className="max-w-[280px] px-4 py-3 text-slate-600">
                    <p className="line-clamp-2">{log.message ?? "-"}</p>
                  </td>

                  <td className="px-4 py-3 font-semibold text-orange-600">
                    {formatNumber(log.business_warning_count ?? 0)}
                  </td>

                  <td className="px-4 py-3 font-semibold text-red-600">
                    {formatNumber(log.technical_error_count ?? 0)}
                  </td>

                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatRupiah(totalRevenue)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(log.created_at)}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelectLog(log)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                      <ClipboardList size={13} />
                      Detail
                    </button>
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

export default function ImportPendapatanPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);

  const [validateResult, setValidateResult] = useState<ValidateResponse | null>(
    null
  );
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [syncLogs, setSyncLogs] = useState<SyncLogRow[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logStatusFilter, setLogStatusFilter] =
    useState<AuditStatusFilter>("all");
  const [logYearFilter, setLogYearFilter] = useState("");
  const [logMonthFilter, setLogMonthFilter] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const errors = validateResult?.errors ?? [];
  const warnings = validateResult?.warnings ?? [];
  const canSync = Boolean(validateResult?.success && errors.length === 0);

  const validationStatus: StatusType = isValidating
    ? "loading"
    : validateResult
    ? validateResult.success
      ? warnings.length > 0
        ? "warning"
        : "success"
      : "error"
    : "idle";

  const syncStatus: StatusType = isSyncing
    ? "loading"
    : syncResult
    ? syncResult.success
      ? "success"
      : "error"
    : "idle";

  const rowCounts = validateResult?.rowCounts ?? syncResult?.rowCounts;
  const totals = validateResult?.totals ?? syncResult?.totals;
  const selectedLog =
    syncLogs.find((log) => log.id === selectedLogId) ?? syncLogs[0] ?? null;

  const fetchSyncLogs = useCallback(async () => {
    setIsLoadingLogs(true);

    try {
      const params = new URLSearchParams({
        limit: "50",
        status: logStatusFilter,
      });

      if (logYearFilter) {
        params.set("year", logYearFilter);
      }

      if (logMonthFilter) {
        params.set("month", logMonthFilter);
      }

      const response = await fetch(`/api/revenue/sync-logs?${params}`);
      const json = (await response.json()) as SyncLogsResponse;

      if (response.ok && json.success) {
        const nextLogs = json.data ?? [];

        setSyncLogs(nextLogs);
        setSelectedLogId((currentId) => {
          if (currentId && nextLogs.some((log) => log.id === currentId)) {
            return currentId;
          }

          return nextLogs[0]?.id ?? null;
        });
      }
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logMonthFilter, logStatusFilter, logYearFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchSyncLogs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSyncLogs]);

  async function handleValidate() {
    setIsValidating(true);
    setValidateResult(null);
    setSyncResult(null);

    try {
      const response = await fetch("/api/revenue/validate");
      const json = (await response.json()) as ValidateResponse;

      setValidateResult(json);
    } catch (error) {
      setValidateResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal melakukan validasi data.",
        errors: [
          {
            sheet: "SYSTEM",
            severity: "error",
            message: "Gagal menghubungi endpoint validasi.",
          },
        ],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  }

  async function handleSync() {
    if (!canSync) return;

    const confirmed = window.confirm(
      `Sync pendapatan untuk periode ${
        months[month - 1]?.label
      } ${year}?\n\nJika data periode ini sudah ada, data lama akan di-replace.`
    );

    if (!confirmed) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/revenue/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period_year: year,
          period_month: month,
        }),
      });

      const json = (await response.json()) as SyncResponse;
      setSyncResult(json);
      await fetchSyncLogs();
    } catch (error) {
      setSyncResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Sync pendapatan gagal.",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  function handleReset() {
    setValidateResult(null);
    setSyncResult(null);
  }

  return (
    <main className="jr-page">
      <DashboardHeader
        title="Import Data Pendapatan"
        year={year}
        month={month}
      />

      <div className="w-full space-y-5 px-5 pb-5 pt-2">
        <SectionCard
          title="Pengaturan Periode Import"
          action={<StatusBadge status={syncStatus} />}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
            <div>
              <label className="jr-label">
                Bulan
              </label>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="jr-field mt-2"
              >
                {months.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="jr-label">
                Tahun
              </label>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="jr-field mt-2"
              >
                {[2024, 2025, 2026, 2027].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleValidate}
                disabled={isValidating || isSyncing}
                className="jr-button-soft w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isValidating ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <FileCheck2 size={17} />
                )}
                Validasi Data
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSync}
                disabled={!canSync || isValidating || isSyncing}
                className="jr-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <CloudUpload size={17} />
                )}
                Sync ke Supabase
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleReset}
                className="jr-button-secondary w-full"
              >
                <RefreshCcw size={17} />
                Reset
              </button>
            </div>
          </div>

          <div className="jr-card mt-5 bg-[#f8fafc] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Alur import aktif
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Google Sheets akan dibaca, divalidasi, lalu disimpan ke
                  Supabase sebagai snapshot bulanan. Jika periode sudah ada,
                  data lama otomatis diganti.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                <Database size={18} className="text-blue-700" />
                Sumber Data Google Sheets
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Status Validasi"
          action={<StatusBadge status={validationStatus} />}
        >
          {!validateResult ? (
            <div className="jr-state border-dashed p-8 text-center text-sm font-semibold text-slate-500">
              Klik Validasi Data untuk mengecek struktur spreadsheet sebelum
              sync.
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`rounded-[8px] border p-4 text-sm font-semibold ${
                  validateResult.success
                    ? warnings.length > 0
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {validateResult.message}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <MetricBox label="SWDKLLJ" value={rowCounts?.swdkllj} />
                <MetricBox
                  label="SWDKLLJ Detail"
                  value={rowCounts?.swdkllj_detail}
                />
                <MetricBox label="IWKBU" value={rowCounts?.iwkbu} />
                <MetricBox
                  label="IWKBU Detail"
                  value={rowCounts?.iwkbu_detail}
                />
                <MetricBox label="IWKL" value={rowCounts?.iwkl} />
                <MetricBox
                  label="IWKL Detail"
                  value={rowCounts?.iwkl_detail}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricBox
                  label="Total SWDKLLJ"
                  value={totals?.swdkllj_total}
                  type="rupiah"
                />
                <MetricBox
                  label="IWKBU Tahun Ini"
                  value={totals?.iwkbu_current_year}
                  type="rupiah"
                />
                <MetricBox
                  label="Total IWKL"
                  value={totals?.iwkl_nominal}
                  type="rupiah"
                />
                <MetricBox
                  label="Penumpang IWKL"
                  value={totals?.iwkl_passenger_count}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <IssueList title="Errors" issues={errors} type="error" />
                <IssueList title="Warnings" issues={warnings} type="warning" />
              </div>
            </div>
          )}
        </SectionCard>

        {syncResult && (
          <SectionCard
            title="Hasil Sync"
            action={
              <StatusBadge status={syncResult.success ? "success" : "error"} />
            }
          >
            <div
              className={`rounded-[8px] border p-4 text-sm font-semibold ${
                syncResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {syncResult.message}
              {syncResult.error ? ` ${syncResult.error}` : ""}
            </div>

            {syncResult.success && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricBox label="Tahun" value={syncResult.period_year} />
                <MetricBox label="Bulan" value={syncResult.period_month} />
                <div className="rounded-[8px] border border-[#dce3ed] bg-[#f8fafc] p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Batch ID
                  </p>
                  <p className="mt-2 break-all text-sm font-bold text-slate-950">
                    {syncResult.batch_id}
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard title="Riwayat Sync Pendapatan">
          <div className="space-y-4">
            <AuditFilterBar
              status={logStatusFilter}
              year={logYearFilter}
              month={logMonthFilter}
              onStatusChange={setLogStatusFilter}
              onYearChange={setLogYearFilter}
              onMonthChange={setLogMonthFilter}
            />

            <AuditSummary logs={syncLogs} />

            {isLoadingLogs ? (
              <div className="jr-state p-8 text-center text-sm font-semibold text-slate-500">
                Memuat riwayat sync...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <SyncLogTable
                  logs={syncLogs}
                  selectedLogId={selectedLogId}
                  onSelectLog={(log) => setSelectedLogId(log.id)}
                />
                <SyncLogDetailPanel log={selectedLog} />
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
