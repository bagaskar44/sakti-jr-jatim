import type { LucideIcon } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

type ModulePlaceholderPageProps = {
  title: string;
  dataLabel: string;
  statusTitle?: string;
  unit?: string;
  year: number;
  month: number | string;
  Icon: LucideIcon;
};

export function ModulePlaceholderPage({
  title,
  dataLabel,
  statusTitle,
  unit,
  year,
  month,
  Icon,
}: ModulePlaceholderPageProps) {
  const normalizedDataLabel = dataLabel.toLowerCase();

  return (
    <main className="jr-page flex min-h-screen flex-col">
      <DashboardHeader title={title} year={year} month={month} />

      <div className="flex min-h-0 flex-1 px-5 pb-5 pt-2">
        <section className="jr-card flex min-h-0 w-full flex-1 flex-col p-4">
          <div className="flex min-h-[272px] flex-1 flex-col items-center justify-center p-6 text-center lg:min-h-[288px]">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[6.4px] bg-blue-50 text-[#1f4fea]">
              <Icon size={19.2} />
            </div>
            <h2 className="text-base font-bold text-slate-950">
              {statusTitle ?? `Modul ${title} In Update...`}
            </h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              {unit
                ? `Data detail ${normalizedDataLabel} untuk ${unit} sedang disiapkan.`
                : `Data detail ${normalizedDataLabel} sedang disiapkan.`}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
