import { CalendarDays } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

type ModulePageSearchParams = Promise<{
  year?: string | string[];
  month?: string | string[];
  unit?: string | string[];
}>;

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";

  return value ?? "";
}

function getYear(value: string) {
  const year = Number(value);

  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : 2026;
}

function getMonth(value: string) {
  if (value === "all") return "ALL";

  const month = Number(value);

  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : "-";
}

export default async function KegiatanPage({
  searchParams,
}: {
  searchParams: ModulePageSearchParams;
}) {
  const params = await searchParams;
  const unit = getSingleParam(params.unit);
  const year = getYear(getSingleParam(params.year));
  const month = getMonth(getSingleParam(params.month));

  return (
    <ModulePlaceholderPage
      title="Kegiatan"
      dataLabel="Kegiatan"
      unit={unit}
      year={year}
      month={month}
      Icon={CalendarDays}
    />
  );
}
