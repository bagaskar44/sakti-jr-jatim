import { CalendarDays } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function ImportKegiatanPage() {
  return (
    <ModulePlaceholderPage
      title="Import Data Kegiatan"
      dataLabel="Kegiatan"
      statusTitle="Import Data Kegiatan In Update..."
      year={2026}
      month="-"
      Icon={CalendarDays}
    />
  );
}
