"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { getActivityFunctionBadgeClass } from "@/components/dashboard/activityBadgeStyles";
import { SectionCard } from "@/components/dashboard/SectionCard";

const overviewActivities = [
  {
    title: "JR Safety Campaign",
    category: "Pelayanan",
    unit: "Kanwil Jawa Timur",
    day: 21,
  },
  {
    title: "Sosialisasi SAKTI JR",
    category: "Penerimaan",
    unit: "Kantor Cabang Malang",
    day: 20,
  },
  {
    title: "Operasi Keselamatan",
    category: "Kecelakaan",
    unit: "Kantor Cabang Jember",
    day: 19,
  },
  {
    title: "Pelatihan Frontliner",
    category: "Pelayanan",
    unit: "Kantor Cabang Sidoarjo",
    day: 18,
  },
];

const monthLabels = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type DashboardMonthFilter = number | "ALL";
type OverviewActivity = (typeof overviewActivities)[number] & {
  date: string;
  hrefMonth: DashboardMonthFilter;
};

function getActivityMonth({
  activityIndex,
  month,
}: {
  activityIndex: number;
  month: DashboardMonthFilter;
}) {
  if (month !== "ALL") return month;

  return Math.max(1, 5 - activityIndex);
}

function formatActivityDate(day: number, month: number, year: number) {
  return `${day} ${monthLabels[month - 1] ?? String(month)} ${year}`;
}

function getScopedActivities({
  year,
  month,
  unitQuery,
}: {
  year: number;
  month: DashboardMonthFilter;
  unitQuery: string;
}): OverviewActivity[] {
  const selectedUnit = unitQuery.trim();

  return overviewActivities.map((activity, index) => {
    const activityMonth = getActivityMonth({ activityIndex: index, month });

    return {
      ...activity,
      unit: selectedUnit || activity.unit,
      date: formatActivityDate(activity.day, activityMonth, year),
      hrefMonth: month === "ALL" ? "ALL" : activityMonth,
    };
  });
}

function getActivityHref(activity: OverviewActivity, year: number) {
  const params = new URLSearchParams();

  params.set("year", String(year));
  params.set(
    "month",
    activity.hrefMonth === "ALL" ? "all" : String(activity.hrefMonth)
  );
  params.set("unit", activity.unit);
  params.set("activity", activity.title);

  return `/kegiatan?${params.toString()}`;
}

export function LatestActivitiesOverviewSection({
  year,
  month,
  unitQuery,
}: {
  year: number;
  month: DashboardMonthFilter;
  unitQuery: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activities = getScopedActivities({ year, month, unitQuery });

  function scrollActivities(direction: "left" | "right") {
    scrollerRef.current?.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  }

  return (
    <SectionCard title="Kegiatan Terbaru">
      <div className="relative px-12">
        <button
          type="button"
          onClick={() => scrollActivities("left")}
          className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#dce3ed] bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-[#1f4fea]"
          aria-label="Geser kegiatan ke kiri"
        >
          <ChevronLeft size={15.2} />
        </button>

        <div
          ref={scrollerRef}
          className="flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {activities.map((activity) => (
            <article
              key={`${activity.unit}-${activity.title}`}
              className="grid min-h-[120px] w-[240px] shrink-0 snap-start grid-cols-[67.2px_minmax(0,1fr)] gap-3 rounded-[6.4px] border border-[#dce3ed] bg-white p-3 shadow-sm xl:w-[calc((100%_-_28.8px)/4)]"
            >
              <div className="flex h-[68.8px] items-center justify-center rounded-[5.6px] border border-[#dce3ed] bg-[#f8fafc] text-center text-[8.8px] font-bold text-slate-400">
                In Update...
              </div>

              <div className="flex min-w-0 flex-col">
                <h3 className="truncate text-sm font-bold leading-4 text-slate-950">
                  {activity.title}
                </h3>
                <span
                  className={`mt-2 w-fit rounded-[5.6px] border px-2 py-1 text-[8px] font-bold ${getActivityFunctionBadgeClass(activity.category)}`}
                >
                  {activity.category}
                </span>

                <div className="mt-2 space-y-1 text-[8.8px] font-semibold text-slate-600">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <MapPin size={9.6} className="shrink-0 text-[#1f4fea]" />
                    <span className="truncate">{activity.unit}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CalendarDays
                      size={9.6}
                      className="shrink-0 text-[#1f4fea]"
                    />
                    {activity.date}
                  </p>
                </div>
              </div>

              <Link
                href={getActivityHref(activity, year)}
                prefetch={false}
                className="col-span-2 mt-1 inline-flex h-9 items-center justify-center gap-1 rounded-[5.6px] bg-[#1f4fea] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f4fea]"
              >
                Lihat Detail
                <ExternalLink size={10.4} />
              </Link>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollActivities("right")}
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#dce3ed] bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-[#1f4fea]"
          aria-label="Geser kegiatan ke kanan"
        >
          <ChevronRight size={15.2} />
        </button>
      </div>
    </SectionCard>
  );
}
