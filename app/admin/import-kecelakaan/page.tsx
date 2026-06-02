import { HeartPulse } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function ImportKecelakaanPage() {
  return (
    <ModulePlaceholderPage
      title="Import Data Kecelakaan"
      dataLabel="Kecelakaan"
      statusTitle="Import Data Kecelakaan In Update..."
      year={2026}
      month="-"
      Icon={HeartPulse}
    />
  );
}
