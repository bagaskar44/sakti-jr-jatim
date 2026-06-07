"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";

export type RevenueMapUnit = {
  id: string;
  unit_name: string;
  display_name: string;
  unit_type: string;
  parent_unit_name: string | null;
  latitude: number;
  longitude: number;
  swdkllj_total: number | string;
  iwkbu_total: number | string;
  iwkl_total: number | string;
  total_revenue: number | string;
};

export type DashboardFunction = "PENDAPATAN" | "PELAYANAN" | "KECELAKAAN";

export type RevenueMapProps = {
  units: RevenueMapUnit[];
  source: string;
  year: number;
  month: number | "ALL";
  detailFunction: DashboardFunction;
  className?: string;
  selectedUnitId?: string | null;
  onSelectedUnitChange?: (unit: RevenueMapUnit) => void;
};

const LeafletRevenueMap = dynamic<RevenueMapProps>(
  () => import("./RevenueLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="jr-state flex h-full min-h-[400px] w-full flex-1 items-center justify-center text-sm font-semibold text-slate-500">
        Memuat peta OpenStreetMap...
      </div>
    ),
  }
);

export function RevenueMap(props: RevenueMapProps) {
  if (props.units.length === 0) {
    return (
      <div className="jr-state flex h-full min-h-[400px] w-full flex-1 flex-col items-center justify-center border-dashed p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[7px] bg-blue-50 text-blue-700">
          <MapPinned size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Belum ada koordinat unit aktif
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Lengkapi latitude dan longitude pada Master Unit untuk menampilkan
          marker peta.
        </p>
      </div>
    );
  }

  return <LeafletRevenueMap {...props} />;
}
