import { Users } from "lucide-react";
import { ModulePlaceholderPage } from "@/components/dashboard/ModulePlaceholderPage";

export default function ImportPelayananPage() {
  return (
    <ModulePlaceholderPage
      title="Import Data Pelayanan"
      dataLabel="Pelayanan"
      statusTitle="Import Data Pelayanan In Update..."
      year={2026}
      month="-"
      Icon={Users}
    />
  );
}
