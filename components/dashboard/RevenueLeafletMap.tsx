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
import { ExternalLink, MapPin } from "lucide-react";
import { formatNumber, formatRupiah } from "@/lib/formatters";
import type {
  DashboardFunction,
  RevenueMapProps,
  RevenueMapUnit,
} from "./RevenueMap";

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

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function getDetailMetrics({
  unit,
  source,
  detailFunction,
}: {
  unit: RevenueMapUnit;
  source: string;
  detailFunction: DashboardFunction;
}) {
  if (detailFunction === "PELAYANAN") {
    return [
      {
        label: "Total Pelayanan",
        value: formatNumber(getStaticPelayanan(unit)),
      },
      {
        label: "SLA",
        value: "96,4%",
      },
      {
        label: "Layanan Selesai",
        value: formatNumber(getStaticPelayanan(unit) - 6),
      },
    ];
  }

  if (detailFunction === "KECELAKAAN") {
    return [
      {
        label: "Total Kecelakaan",
        value: formatNumber(getStaticKecelakaan(unit)),
      },
      {
        label: "Santunan Proses",
        value: formatNumber(2 + (unit.unit_name.length % 4)),
      },
      {
        label: "SLA",
        value: "93,8%",
      },
    ];
  }

  return [
    {
      label: source === "ALL" ? "Total Pendapatan" : source,
      value: formatRupiah(getAmountBySource(unit, source)),
    },
    {
      label: "SWDKLLJ",
      value: formatRupiah(unit.swdkllj_total),
    },
    {
      label: "IWKBU",
      value: formatRupiah(unit.iwkbu_total),
    },
    {
      label: "IWKL",
      value: formatRupiah(unit.iwkl_total),
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
  className = "",
  selectedUnitId,
  onSelectedUnitChange,
}: RevenueMapProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null
  );
  const selectedId =
    selectedUnitId === undefined ? internalSelectedId : selectedUnitId;

  const sortedUnits = useMemo(() => {
    return [...units].sort(
      (a, b) => getAmountBySource(b, source) - getAmountBySource(a, source)
    );
  }, [units, source]);

  const selectedUnit =
    selectedId === null
      ? null
      : units.find((unit) => unit.id === selectedId) ?? null;
  const mapFocusUnit = selectedUnit ?? sortedUnits[0] ?? null;
  const maxAmount = Math.max(
    ...units.map((unit) => getAmountBySource(unit, source)),
    1
  );
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (units.length < 2) return null;

    return units.map((unit) => [unit.latitude, unit.longitude]);
  }, [units]);
  const initialCenter = useMemo<LatLngExpression>(() => {
    if (mapFocusUnit) return getPosition(mapFocusUnit);

    return [-7.5361, 112.2384];
  }, [mapFocusUnit]);

  function handleMarkerSelect(unit: RevenueMapUnit) {
    if (selectedUnitId === undefined) {
      setInternalSelectedId(unit.id);
    }

    onSelectedUnitChange?.(unit);
  }

  return (
    <div
      className={`relative h-full min-h-[400px] w-full flex-1 overflow-hidden rounded-[8px] border border-[#dce3ed] bg-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.1)] ${className}`}
    >
      <MapContainer
        center={initialCenter}
        className="revenue-leaflet-map absolute inset-0 h-full min-h-0 w-full"
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
        <PanToSelected unit={selectedUnit} />

        {units.map((unit) => {
          const selected = selectedUnit?.id === unit.id;
          const size = getMarkerSize(unit, source, maxAmount);
          const popupMetrics = getDetailMetrics({
            unit,
            source,
            detailFunction,
          });
          const primaryMetric = popupMetrics[0];
          const secondaryMetrics = popupMetrics.slice(1);

          return (
            <Marker
              eventHandlers={{
                click: () => handleMarkerSelect(unit),
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
                maxWidth={310}
                minWidth={300}
                offset={[0, -size / 2]}
              >
                <div className="w-full text-[#07113b]">
                  <div className="border-b border-[#cfe0ff] pb-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#1f4fea]">
                      Detail {getDetailFunctionLabel(detailFunction)}
                    </p>
                    <h3 className="mt-1 break-words text-base font-bold leading-tight text-[#07113b]">
                      {toTitleCase(unit.unit_name)}
                    </h3>
                  </div>

                  {primaryMetric && (
                    <div className="mt-2 rounded-[7px] bg-[#eef5ff] px-2.5 py-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#1f4fea]">
                        {primaryMetric.label}
                      </p>
                      <p className="mt-1 break-words text-lg font-bold leading-none text-[#1f4fea]">
                        {primaryMetric.value}
                      </p>
                    </div>
                  )}

                  <div className="mt-2 divide-y divide-[#dce8ff]">
                    {secondaryMetrics.map((metric) => (
                      <div
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5"
                        key={metric.label}
                      >
                        <p className="min-w-0 break-words text-[11px] font-bold uppercase tracking-[0.04em] text-[#1f4fea]">
                          {metric.label}
                        </p>
                        <p className="text-right text-xs font-bold text-[#07113b]">
                          {metric.value}
                        </p>
                      </div>
                    ))}
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
                    className="mt-2 inline-flex min-h-7 w-full items-center justify-center gap-1 rounded-[7px] bg-[#1f4fea] px-2.5 text-[12px] font-bold !text-white shadow-sm hover:bg-blue-700"
                  >
                    Lihat Detail {getDetailFunctionLabel(detailFunction)}
                    <ExternalLink size={10} />
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
  );
}
