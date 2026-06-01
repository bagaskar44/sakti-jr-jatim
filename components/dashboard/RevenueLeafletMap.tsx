"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import L, { type LatLngBoundsExpression, type LatLngExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { Building2, ExternalLink, MapPin } from "lucide-react";
import { formatRupiah } from "@/lib/formatters";
import type { RevenueMapProps, RevenueMapUnit } from "./RevenueMap";

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

function getUnitTypeLabel(unitType: string) {
  if (unitType === "KANTOR_PELAYANAN") return "Kantor Pelayanan";
  if (unitType === "KANWIL") return "Kanwil";
  if (unitType === "CABANG") return "Kantor Cabang";

  return unitType.replace(/_/g, " ");
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

function getDetailHref({
  unitName,
  year,
  month,
  source,
}: {
  unitName: string;
  year: number;
  month: number;
  source: string;
}) {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    unit: unitName,
  });

  if (source !== "ALL") {
    params.set("source", source);
    params.set("tab", source);
  }

  return `/pendapatan?${params.toString()}`;
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
  const visibleUnits = sortedUnits.slice(0, 8);
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
                zIndexOffset={selected ? 900 : 0}
              >
                <Tooltip direction="top" offset={[0, -size / 2]}>
                  <span className="text-xs font-bold">{unit.unit_name}</span>
                </Tooltip>
                <Popup closeButton={false} offset={[0, -size / 2]}>
                  <div className="min-w-[230px] text-slate-900">
                    <p className="jr-label">
                      {getUnitTypeLabel(unit.unit_type)}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold leading-tight">
                      {unit.unit_name}
                    </h3>
                    <div className="mt-3 rounded-[7px] bg-[#f8fafc] p-2">
                      <p className="text-[11px] font-semibold text-slate-500">
                        Pendapatan
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-950">
                        {formatRupiah(amount)}
                      </p>
                    </div>
                    <Link
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[7px] bg-[#1f4fea] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1746dd]"
                      href={getDetailHref({
                        unitName: unit.unit_name,
                        year,
                        month,
                        source,
                      })}
                    >
                      Lihat detail
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

      <div className="space-y-3">
        {selectedUnit && (
          <div className="jr-card p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {getUnitTypeLabel(selectedUnit.unit_type)}
                </p>
                <h3 className="mt-1 text-base font-semibold leading-tight text-slate-950">
                  {selectedUnit.unit_name}
                </h3>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] bg-blue-50 text-blue-700">
                <Building2 size={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="rounded-[7px] bg-[#f8fafc] p-3">
                <p className="text-xs font-semibold text-slate-500">
                  Pendapatan
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatRupiah(getAmountBySource(selectedUnit, source))}
                </p>
              </div>
              <div className="rounded-[7px] bg-[#f8fafc] p-3">
                <p className="text-xs font-semibold text-slate-500">
                  Koordinat
                </p>
                <p className="mt-1 break-words text-sm font-bold text-slate-700">
                  {selectedUnit.latitude}, {selectedUnit.longitude}
                </p>
              </div>
            </div>

            <Link
              className="jr-button-primary mt-4 w-full"
              href={getDetailHref({
                unitName: selectedUnit.unit_name,
                year,
                month,
                source,
              })}
            >
              Lihat Pendapatan Unit
            </Link>
          </div>
        )}

        <div>
          <p className="text-sm font-bold text-slate-950">Unit Berkoordinat</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {units.length} marker aktif untuk periode ini
          </p>
        </div>

        <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1 lg:max-h-[230px]">
          {visibleUnits.map((unit, index) => {
            const amount = getAmountBySource(unit, source);
            const selected = selectedUnit?.id === unit.id;

            return (
              <button
                className={`w-full rounded-[8px] border p-3 text-left transition ${
                  selected
                    ? "border-blue-200 bg-blue-50"
                    : "border-[#dce3ed] bg-white hover:bg-[#f8fafc]"
                }`}
                key={unit.id}
                onClick={() => setSelectedId(unit.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {index + 1}. {unit.unit_name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {getUnitTypeLabel(unit.unit_type)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatRupiah(amount)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
