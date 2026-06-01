import { Check, RotateCcw } from "lucide-react";

type FilterBarProps = {
  year: number;
  month: number;
  source: string;
  unitQuery: string;
  onYearChange: (value: number) => void;
  onMonthChange: (value: number) => void;
  onSourceChange: (value: string) => void;
  onUnitQueryChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
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
}: FilterBarProps) {
  return (
    <section className="jr-card p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="jr-label">Periode</label>
          <select className="jr-field mt-1 h-10 min-h-10">
            <option>Bulanan</option>
          </select>
        </div>

        <div>
          <label className="jr-label">Bulan</label>
          <select
            value={month}
            onChange={(event) => onMonthChange(Number(event.target.value))}
            className="jr-field mt-1 h-10 min-h-10"
          >
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

        <div>
          <label className="jr-label">Jenis Pendapatan</label>
          <select
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
            className="jr-field mt-1 h-10 min-h-10"
          >
            <option value="ALL">Semua</option>
            <option value="SWDKLLJ">SWDKLLJ</option>
            <option value="IWKBU">IWKBU</option>
            <option value="IWKL">IWKL</option>
          </select>
        </div>

        <div>
          <label className="jr-label">Unit/Kantor</label>
          <input
            value={unitQuery}
            onChange={(event) => onUnitQueryChange(event.target.value)}
            placeholder="Semua"
            className="jr-field mt-1 h-10 min-h-10"
          />
        </div>

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
      </div>
    </section>
  );
}
