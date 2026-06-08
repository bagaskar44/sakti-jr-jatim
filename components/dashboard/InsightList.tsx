import {
  AlertTriangle,
  BarChart3,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatPercent, formatRupiah } from "@/lib/formatters";

type Overview = {
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
  iwkbu_growth_pct: number | string | null;
};

type Warning = {
  sheet: string;
  message: string;
};

export function InsightList({
  overview,
  warnings,
}: {
  overview: Overview;
  warnings: Warning[];
}) {
  const sources = [
    { name: "SWDKLLJ", amount: Number(overview.swdkllj_total ?? 0) },
    { name: "IWKBU", amount: Number(overview.iwkbu_total ?? 0) },
    { name: "IWKL", amount: Number(overview.iwkl_total ?? 0) },
  ].sort((a, b) => b.amount - a.amount);

  const dominant = sources[0];
  const growth =
    overview.iwkbu_growth_pct === null
      ? null
      : Number(overview.iwkbu_growth_pct);

  const items = [
    {
      icon: <BarChart3 size={14.4} />,
      title: `${dominant.name} menjadi kontributor terbesar`,
      description: `${dominant.name} menyumbang ${formatRupiah(
        dominant.amount
      )} dari total pendapatan bulan ini.`,
      tone: "blue",
    },
    {
      icon:
        growth !== null && growth < 0 ? (
          <TrendingDown size={14.4} />
        ) : (
          <TrendingUp size={14.4} />
        ),
      title:
        growth !== null && growth < 0
          ? "IWKBU menurun dibanding tahun lalu"
          : "IWKBU meningkat dibanding tahun lalu",
      description:
        growth === null
          ? "Data tahun lalu belum tersedia sebagai pembanding."
          : `Pertumbuhan IWKBU tercatat ${formatPercent(growth)} dibanding tahun lalu.`,
      tone: growth !== null && growth < 0 ? "orange" : "green",
    },
    {
      icon: <AlertTriangle size={14.4} />,
      title: "Validasi data memiliki beberapa warning",
      description:
        warnings.length > 0
          ? `${warnings.length} warning ditemukan dari hasil validasi, terutama terkait subtotal atau baris bernilai 0.`
          : "Tidak ada warning validasi pada periode ini.",
      tone: warnings.length > 0 ? "orange" : "green",
    },
    {
      icon: <Info size={14.4} />,
      title: "Data berasal dari hasil sinkronisasi spreadsheet",
      description:
        "Dashboard membaca data bersih dari Supabase, bukan langsung dari Google Sheets.",
      tone: "blue",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.title}
          className="jr-card flex gap-3 p-3"
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[5.6px] ${
              item.tone === "orange"
                ? "bg-orange-50 text-orange-600"
                : item.tone === "green"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {item.icon}
          </div>

          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">
              {item.title}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-slate-500">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
