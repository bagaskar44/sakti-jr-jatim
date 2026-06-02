"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import L, { type LatLngBoundsExpression, type LatLngExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { Activity, Camera, ExternalLink, MapPin } from "lucide-react";
import { formatNumber, formatRupiah } from "@/lib/formatters";
import type {
  DashboardFunction,
  RevenueMapProps,
  RevenueMapUnit,
} from "./RevenueMap";
import { getActivityFunctionBadgeClass } from "./activityBadgeStyles";

function toNumber(value: number | string | null | undefined) {
  const result = Number(value ?? 0);
  return Number.isNaN(result) ? 0 : result;
}

function getAmountBySource(unit: RevenueMapUnit, source: string) {
  if (source === "SWDKLLJ") return toNumber(unit.swdkllj_total);
  if (source === "IWKBU") return toNumber(unit.iwkbu_total);
  if (source === "IWKL") return toNumber(unit.iwkl_total);

  return toNumber(unit.total_revenue);
}

function getMarkerMeta(unit: RevenueMapUnit) {
  if (unit.unit_type === "KANWIL") {
    return {
      label: "KW",
      className: "revenue-map-marker--kanwil",
    };
  }

  if (unit.unit_type === "KANTOR_PELAYANAN") {
    return {
      label: "KP",
      className: "revenue-map-marker--pelayanan",
    };
  }

  return {
    label: "KC",
    className: "revenue-map-marker--cabang",
  };
}

function getMarkerSize(
  unit: RevenueMapUnit,
  source: string,
  maxAmount: number
) {
  if (unit.unit_type === "KANWIL") return 42;

  const amount = getAmountBySource(unit, source);
  return 28 + Math.round((amount / maxAmount) * 14);
}

function createMarkerIcon(
  unit: RevenueMapUnit,
  size: number,
  selected: boolean
) {
  const meta = getMarkerMeta(unit);
  const selectedClass = selected ? " revenue-map-marker--selected" : "";

  return L.divIcon({
    className: "revenue-map-marker-host",
    html: `<span class="revenue-map-marker ${meta.className}${selectedClass}">${meta.label}</span>`,
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, size],
    popupAnchor: [0, -size / 2],
  });
}

function getPosition(unit: RevenueMapUnit): LatLngExpression {
  return [unit.latitude, unit.longitude];
}

function getStaticPelayanan(unit: RevenueMapUnit) {
  return 90 + (unit.unit_name.length % 7) * 11;
}

function getStaticKecelakaan(unit: RevenueMapUnit) {
  return 8 + (unit.unit_name.length % 5) * 3;
}

function getDetailFunctionLabel(detailFunction: DashboardFunction) {
  if (detailFunction === "PELAYANAN") return "Pelayanan";
  if (detailFunction === "KECELAKAAN") return "Kecelakaan";

  return "Pendapatan";
}

function getDetailPath(detailFunction: DashboardFunction) {
  if (detailFunction === "PELAYANAN") return "/pelayanan";
  if (detailFunction === "KECELAKAAN") return "/kecelakaan";

  return "/pendapatan";
}

function getUnitDetailHref({
  unit,
  year,
  month,
  source,
  detailFunction,
}: {
  unit: RevenueMapUnit;
  year: number;
  month: number | "ALL";
  source: string;
  detailFunction: DashboardFunction;
}) {
  const params = new URLSearchParams();

  params.set("year", String(year));
  params.set("month", month === "ALL" ? "all" : String(month));
  params.set("unit", unit.unit_name);

  if (detailFunction === "PENDAPATAN" && source !== "ALL") {
    params.set("source", source);
    params.set("tab", source);
  }

  return `${getDetailPath(detailFunction)}?${params.toString()}`;
}

function getLatestActivities(unit: RevenueMapUnit | null) {
  const unitLabel = unit?.unit_name ?? "Unit terpilih";

  return [
    {
      title: "Sosialisasi Tertib Lalu Lintas",
      functionLabel: "Kecelakaan",
      description: `${unitLabel} melakukan edukasi keselamatan berkendara.`,
    },
    {
      title: "Monitoring Layanan Santunan",
      functionLabel: "Pelayanan",
      description: `${unitLabel} melakukan pemantauan penyelesaian layanan.`,
    },
    {
      title: "Rekonsiliasi Data Pendapatan",
      functionLabel: "Pendapatan",
      description: `${unitLabel} melakukan pengecekan data pendapatan periodik.`,
    },
  ];
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;

    map.fitBounds(bounds, {
      maxZoom: 10,
      padding: [34, 34],
    });
  }, [bounds, map]);

  return null;
}

function PanToSelected({ unit }: { unit: RevenueMapUnit | null }) {
  const map = useMap();

  useEffect(() => {
    if (!unit) return;

    map.panTo(getPosition(unit), {
      animate: true,
      duration: 0.55,
    });
  }, [map, unit]);

  return null;
}

function InvalidateMapSize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };
    const timeoutId = window.setTimeout(invalidate, 0);
    const observer = new ResizeObserver(invalidate);

    observer.observe(container);
    window.addEventListener("resize", invalidate);

    return () => {
      window.clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);

  return null;
}

export default function RevenueLeafletMap({
  units,
  source,
  year,
  month,
  detailFunction,
}: RevenueMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedUnits = useMemo(() => {
    return [...units].sort(
      (a, b) => getAmountBySource(b, source) - getAmountBySource(a, source)
    );
  }, [units, source]);

  const selectedUnit =
    units.find((unit) => unit.id === selectedId) ?? sortedUnits[0] ?? null;
  const maxAmount = Math.max(
    ...units.map((unit) => getAmountBySource(unit, source)),
    1
  );
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (units.length < 2) return null;

    return units.map((unit) => [unit.latitude, unit.longitude]);
  }, [units]);
  const initialCenter = useMemo<LatLngExpression>(() => {
    if (selectedUnit) return getPosition(selectedUnit);

    return [-7.5361, 112.2384];
  }, [selectedUnit]);
  const selectedForPan =
    selectedId === null
      ? null
      : units.find((unit) => unit.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="relative min-h-[430px] overflow-hidden rounded-[8px] border border-[#dce3ed] bg-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.1)]">
        <MapContainer
          center={initialCenter}
          className="revenue-leaflet-map h-full min-h-[430px] w-full"
          scrollWheelZoom
          zoom={units.length > 1 ? 8 : 10}
          zoomControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds bounds={bounds} />
          <InvalidateMapSize />
          <PanToSelected unit={selectedForPan} />

          {units.map((unit) => {
            const amount = getAmountBySource(unit, source);
            const selected = selectedUnit?.id === unit.id;
            const size = getMarkerSize(unit, source, maxAmount);

            return (
              <Marker
                eventHandlers={{
                  click: () => setSelectedId(unit.id),
                }}
                icon={createMarkerIcon(unit, size, selected)}
                key={unit.id}
                position={getPosition(unit)}
                riseOnHover
                zIndexOffset={selected ? 120 : 0}
              >
                <Tooltip direction="top" offset={[0, -size / 2]}>
                  <span className="text-xs font-bold">{unit.unit_name}</span>
                </Tooltip>
                <Popup
                  className="revenue-unit-popup"
                  closeButton={false}
                  maxWidth={300}
                  minWidth={300}
                  offset={[0, -size / 2]}
                >
                  <div className="w-full text-slate-900">
                    <div className="flex h-25 items-center justify-center rounded-[7px] border border-dashed border-[#dce3ed] bg-[#f8fafc] px-2 text-center text-[11px] font-semibold text-slate-500">
                      <Camera size={14} className="mr-1.5 text-slate-400" />
                      <span>In Update...</span>
                    </div>

                    <div className="mt-2 text-center">
                      <h3 className="break-words text-[13px] font-bold leading-tight">
                        {unit.unit_name}
                      </h3>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 border-y border-[#e5edf6] py-1.5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold leading-4 text-slate-500">
                          Pendapatan
                        </p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-950">
                          {formatRupiah(amount)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold leading-4 text-slate-500">
                          Pelayanan
                        </p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-950">
                          {formatNumber(getStaticPelayanan(unit))}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold leading-4 text-slate-500">
                          Kecelakaan
                        </p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-950">
                          {formatNumber(getStaticKecelakaan(unit))}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={getUnitDetailHref({
                        unit,
                        year,
                        month,
                        source,
                        detailFunction,
                      })}
                      prefetch={false}
                      className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-[7px] bg-[#1f4fea] px-3 py-1.5 text-xs font-bold !text-white shadow-sm hover:bg-blue-700"
                    >
                      Lihat Detail {getDetailFunctionLabel(detailFunction)}
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-[7px] border border-[#dce3ed] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
            <MapPin size={14} className="text-blue-700" />
            OpenStreetMap
          </div>
        </div>
      </div>

      <aside className="space-y-3">
        <div>
          <p className="text-sm font-bold text-slate-950">Kegiatan Terbaru</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {selectedUnit?.unit_name ?? "Pilih marker untuk melihat fokus unit"}
          </p>
        </div>

        <div className="space-y-2">
          {getLatestActivities(selectedUnit).map((activity) => (
            <div
              className="rounded-[8px] border border-[#dce3ed] bg-white p-3"
              key={`${activity.functionLabel}-${activity.title}`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-sm font-bold leading-tight text-slate-950">
                  {activity.title}
                </p>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-bold ${getActivityFunctionBadgeClass(activity.functionLabel)}`}
                >
                  {activity.functionLabel}
                </span>
              </div>
              <p className="text-xs font-semibold leading-5 text-slate-500">
                {activity.description}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[8px] border border-dashed border-[#dce3ed] bg-[#f8fafc] p-3 text-xs font-semibold text-slate-500">
          <div className="mb-2 flex items-center gap-2 text-slate-700">
            <Activity size={14} className="text-blue-700" />
            Static preview
          </div>
          Kegiatan terbaru masih data sementara sampai modul kegiatan unit
          tersedia.
        </div>
      </aside>
    </div>
  );
}
