"use client";

import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, MapPinned } from "lucide-react";
import { getActivityFunctionBadgeClass } from "@/components/dashboard/activityBadgeStyles";
import type { RevenueMapUnit } from "@/components/dashboard/RevenueMap";

const ACTIVITY_IMAGE_SHEET = "/images/latest-activities-sheet.png";

const latestActivities = [
  {
    title: "JR Safety Campaign",
    category: "Pelayanan",
    unit: "Loket Surabaya Utara",
    date: "21 Mei 2026",
    summary: "Edukasi keselamatan berkendara dan layanan langsung kepada masyarakat.",
    imageAlt: "Petugas memberikan materi keselamatan kepada pengendara",
    imagePosition: "0% 0%",
  },
  {
    title: "Sosialisasi SAKTI JR",
    category: "Penerimaan",
    unit: "Loket Malang",
    date: "20 Mei 2026",
    summary: "Koordinasi penggunaan dashboard dan pembacaan indikator pendapatan.",
    imageAlt: "Tim berdiskusi menggunakan dashboard data di ruang rapat",
    imagePosition: "100% 0%",
  },
  {
    title: "Operasi Keselamatan",
    category: "Kecelakaan",
    unit: "Loket Jember",
    date: "19 Mei 2026",
    summary: "Pemantauan lapangan dan koordinasi kesiapan respons keselamatan.",
    imageAlt: "Petugas keselamatan berkoordinasi di area jalan raya",
    imagePosition: "0% 100%",
  },
  {
    title: "Pelatihan Frontliner",
    category: "Pelayanan",
    unit: "Loket Sidoarjo",
    date: "18 Mei 2026",
    summary: "Peningkatan standar layanan dan komunikasi petugas frontliner.",
    imageAlt: "Petugas frontliner melayani peserta pelatihan di counter",
    imagePosition: "100% 100%",
  },
];

function getActivityHref(activity: (typeof latestActivities)[number]) {
  const params = new URLSearchParams();

  params.set("unit", activity.unit);
  params.set("activity", activity.title);

  return `/kegiatan?${params.toString()}`;
}

function getUnitLabel(unit: RevenueMapUnit) {
  return unit.display_name || unit.unit_name;
}

function getUnitActivitiesHref(unit: RevenueMapUnit) {
  const params = new URLSearchParams();

  params.set("unit", unit.unit_name);

  return `/kegiatan?${params.toString()}`;
}

export function LatestActivitiesSection({
  selectedUnit,
  className = "",
}: {
  selectedUnit: RevenueMapUnit | null;
  className?: string;
}) {
  if (!selectedUnit) {
    return (
      <div
        className={`flex h-full min-h-[288px] flex-col items-center justify-center border-t border-[#dce3ed] p-5 text-center lg:min-h-[304px] 2xl:border-l 2xl:border-t-0 ${className}`}
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[5.6px] bg-blue-50 text-[#1f4fea]">
          <MapPinned size={19.2} />
        </div>
        <p className="text-sm font-bold text-slate-950">Pilih marker unit</p>
        <p className="mt-2 max-w-[216px] text-xs font-semibold leading-5 text-slate-500">
          Klik salah satu marker untuk melihat detail ringkas unit dan akses
          kegiatan terbaru.
        </p>
      </div>
    );
  }

  const unitLabel = getUnitLabel(selectedUnit);
  const unitActivities = latestActivities.map((activity) => ({
    ...activity,
    unit: unitLabel,
  }));

  return (
    <div
      className={`h-full min-h-[288px] border-t border-[#dce3ed] pt-4 lg:min-h-[304px] 2xl:border-l 2xl:border-t-0 2xl:pl-4 2xl:pt-0 ${className}`}
    >
      <div className="mb-3 flex min-h-7 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950">
            Kegiatan Terbaru
          </h3>
          <p className="mt-1 break-words text-xs font-semibold leading-4 text-slate-500">
            {unitLabel}
          </p>
        </div>

        <Link
          href={getUnitActivitiesHref(selectedUnit)}
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-1 rounded-[5.6px] border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          Semua
          <ExternalLink size={10.4} />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {unitActivities.map((activity) => (
          <Link
            aria-label={`Lihat detail ${activity.title}`}
            href={getActivityHref(activity)}
            key={activity.title}
            prefetch={false}
            className="-mx-2 grid grid-cols-[67.2px_minmax(0,1fr)] gap-3 rounded-[5.6px] px-2 py-2.5 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f4fea] first:pt-0 last:pb-0"
          >
            <div
              aria-label={activity.imageAlt}
              className="relative h-20 overflow-hidden rounded-[5.6px] border border-[#dce3ed] bg-cover bg-no-repeat"
              role="img"
              style={{
                backgroundImage: `url(${ACTIVITY_IMAGE_SHEET})`,
                backgroundPosition: activity.imagePosition,
                backgroundSize: "200% 200%",
              }}
            />

            <div className="flex min-w-0 flex-col">
              <h3 className="text-sm font-bold leading-4 text-slate-950">
                {activity.title}
              </h3>

              <p className="mt-1 overflow-hidden text-[8.8px] font-semibold leading-4 text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {activity.summary}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8.8px] font-semibold text-slate-600">
                <p className="flex min-w-0 items-center gap-1.5">
                  <MapPin size={9.6} className="shrink-0 text-[#1f4fea]" />
                  <span className="min-w-0 break-words leading-4">
                    {activity.unit}
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CalendarDays size={9.6} className="shrink-0 text-[#1f4fea]" />
                  <span>{activity.date}</span>
                  <span
                    className={`ml-1 rounded-full border px-1.5 py-0.5 text-[7.2px] font-bold ${getActivityFunctionBadgeClass(activity.category)}`}
                  >
                    {activity.category}
                  </span>
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
