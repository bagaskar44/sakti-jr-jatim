"use client";

import { useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { getActivityFunctionBadgeClass } from "@/components/dashboard/activityBadgeStyles";

const latestActivities = [
  {
    title: "JR Safety Campaign",
    category: "Pelayanan",
    unit: "Loket Surabaya Utara",
    date: "21 Mei 2026",
  },
  {
    title: "Sosialisasi SAKTI JR",
    category: "Pendapatan",
    unit: "Loket Malang",
    date: "20 Mei 2026",
  },
  {
    title: "Operasi Keselamatan",
    category: "Kecelakaan",
    unit: "Loket Jember",
    date: "19 Mei 2026",
  },
  {
    title: "Pelatihan Frontliner",
    category: "Pelayanan",
    unit: "Loket Sidoarjo",
    date: "18 Mei 2026",
  },
];

export function LatestActivitiesSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  function scrollActivities(direction: "left" | "right") {
    scrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });
  }

  return (
    <SectionCard
      title="Kegiatan Terbaru"
      action={
        <button
          type="button"
          className="text-sm font-bold text-[#1f4fea] hover:text-blue-700"
        >
          Lihat Semua
        </button>
      }
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Geser kegiatan sebelumnya"
          title="Sebelumnya"
          onClick={() => scrollActivities("left")}
          className="absolute left-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#dce3ed] bg-white text-slate-700 shadow-sm hover:border-[#1f4fea] hover:text-[#1f4fea] xl:flex"
        >
          <ChevronLeft size={20} />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scroll-smooth px-0 pb-1 xl:px-14 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {latestActivities.map((activity) => (
            <article
              key={activity.title}
              className="flex min-h-[160px] min-w-[292px] flex-1 basis-[calc(25%-9px)] gap-3 rounded-[8px] border border-[#dce3ed] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[8px] border border-[#e5edf6] bg-[#f8fafc] px-2 text-center text-xs font-bold leading-4 text-slate-500">
                In Update...
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="text-sm font-bold leading-5 text-slate-900">
                  {activity.title}
                </h3>

                <span
                  className={`mt-2 inline-flex w-fit items-center rounded-[6px] border px-2.5 py-1 text-xs font-semibold ${getActivityFunctionBadgeClass(activity.category)}`}
                >
                  {activity.category}
                </span>

                <div className="mt-2 space-y-1.5 text-xs font-semibold text-slate-600">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <MapPin size={13} className="shrink-0 text-[#1f4fea]" />
                    <span className="min-w-0 whitespace-normal leading-4">
                      {activity.unit}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CalendarDays
                      size={13}
                      className="shrink-0 text-[#1f4fea]"
                    />
                    {activity.date}
                  </p>
                </div>

                <div className="mt-auto pt-3">
                  <button
                    type="button"
                    className="inline-flex min-h-9 w-full items-center justify-center rounded-[7px] border border-[#dce3ed] bg-white px-4 text-xs font-bold text-[#1f4fea] shadow-sm hover:bg-blue-50"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          aria-label="Geser kegiatan berikutnya"
          title="Berikutnya"
          onClick={() => scrollActivities("right")}
          className="absolute right-0 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#dce3ed] bg-white text-slate-700 shadow-sm hover:border-[#1f4fea] hover:text-[#1f4fea] xl:flex"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </SectionCard>
  );
}
