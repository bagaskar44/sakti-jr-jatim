import { Check, RotateCcw } from "lucide-react";

export type MonthFilterValue = number | "ALL";

type FilterOption = {
  value: string;
  label: string;
};

type FilterBarProps = {
  year: number;
  month: MonthFilterValue;
  source: string;
  unitQuery: string;
  onYearChange: (value: number) => void;
  onMonthChange: (value: MonthFilterValue) => void;
  onSourceChange: (value: string) => void;
  onUnitQueryChange: (value: string) => void;
  onApply?: () => void;
  onReset?: () => void;
  allowAllMonths?: boolean;
  showPeriodFilter?: boolean;
  showSourceFilter?: boolean;
  showActions?: boolean;
  sourceLabel?: string;
  sourceOptions?: FilterOption[];
  unitLabel?: string;
  unitMode?: "text" | "select";
  unitOptions?: FilterOption[];
};

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

const revenueSourceOptions = [
  { value: "ALL", label: "Semua" },
  { value: "SWDKLLJ", label: "SWDKLLJ" },
  { value: "IWKBU", label: "IWKBU" },
  { value: "IWKL", label: "IWKL" },
];

export function FilterBar({
  year,
  month,
  source,
  unitQuery,
  onYearChange,
  onMonthChange,
  onSourceChange,
  onUnitQueryChange,
  onApply,
  onReset,
  allowAllMonths = false,
  showPeriodFilter = true,
  showSourceFilter = true,
  showActions = true,
  sourceLabel = "Jenis Pendapatan",
  sourceOptions = revenueSourceOptions,
  unitLabel = "Unit/Kantor",
  unitMode = "text",
  unitOptions = [],
}: FilterBarProps) {
  function handleMonthChange(value: string) {
    onMonthChange(value === "ALL" ? "ALL" : Number(value));
  }

  return (
    <section className="jr-card p-3">
      <div
        className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
          showPeriodFilter && showSourceFilter
            ? "xl:grid-cols-6"
            : showPeriodFilter || showSourceFilter
            ? showActions
              ? "xl:grid-cols-5"
              : "xl:grid-cols-4"
            : showActions
            ? "xl:grid-cols-4"
            : "xl:grid-cols-3"
        }`}
      >
        {showPeriodFilter && (
          <div>
            <label className="jr-label">Periode</label>
            <select className="jr-field mt-1 h-10 min-h-10">
              <option>Bulanan</option>
            </select>
          </div>
        )}

        <div>
          <label className="jr-label">Bulan</label>
          <select
            value={month}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="jr-field mt-1 h-10 min-h-10"
          >
            {allowAllMonths && <option value="ALL">All</option>}
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
            onChange={(event) => onYearChange(Number(event.target.value))}
            className="jr-field mt-1 h-10 min-h-10"
          >
            {[2024, 2025, 2026, 2027].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {showSourceFilter && (
          <div>
            <label className="jr-label">{sourceLabel}</label>
            <select
              value={source}
              onChange={(event) => onSourceChange(event.target.value)}
              className="jr-field mt-1 h-10 min-h-10"
            >
              {sourceOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="jr-label">{unitLabel}</label>
          {unitMode === "select" ? (
            <select
              value={unitQuery}
              onChange={(event) => onUnitQueryChange(event.target.value)}
              className="jr-field mt-1 h-10 min-h-10"
            >
              <option value="">All</option>
              {unitOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={unitQuery}
              onChange={(event) => onUnitQueryChange(event.target.value)}
              placeholder="Semua"
              className="jr-field mt-1 h-10 min-h-10"
            />
          )}
        </div>

        {showActions && (
          <div className="flex items-end gap-2">
            <button
              onClick={onReset}
              className="jr-button-secondary h-10 min-h-10 flex-1 px-3"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              onClick={onApply}
              className="jr-button-primary h-10 min-h-10 flex-1 px-3"
            >
              <Check size={16} />
              Terapkan
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
