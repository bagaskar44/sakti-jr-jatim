"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type {
  MasterUnitMapPickerProps,
  MasterUnitMapPickerValue,
} from "./MasterUnitMapPicker";

type Coordinate = [number, number];

const EAST_JAVA_CENTER: Coordinate = [-7.5361, 112.2384];

function parseCoordinate(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  const coordinate = Number(trimmedValue);

  return Number.isFinite(coordinate) ? coordinate : null;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function getSelectedPosition(
  latitude: string,
  longitude: string
): Coordinate | null {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);

  if (lat === null || lng === null) return null;

  return [lat, lng];
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

function MapClickHandler({
  onPick,
}: {
  onPick: (value: MasterUnitMapPickerValue) => void;
}) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: formatCoordinate(event.latlng.lat),
        longitude: formatCoordinate(event.latlng.lng),
      });
    },
  });

  return null;
}

function PanToSelected({ position }: { position: Coordinate | null }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    map.setView(position, Math.max(map.getZoom(), 12), {
      animate: true,
      duration: 0.45,
    });
  }, [map, position]);

  return null;
}

export default function MasterUnitLeafletMapPicker({
  latitude,
  longitude,
  onChange,
}: MasterUnitMapPickerProps) {
  const selectedPosition = useMemo(
    () => getSelectedPosition(latitude, longitude),
    [latitude, longitude]
  );
  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: "master-unit-picker-marker-host",
        html: '<span class="master-unit-picker-marker"></span>',
        iconAnchor: [14, 30],
        iconSize: [28, 34],
      }),
    []
  );

  return (
    <div className="relative h-[220px] overflow-hidden rounded-[8px] border border-[#dce3ed] bg-slate-100 shadow-sm">
      <MapContainer
        center={selectedPosition ?? EAST_JAVA_CENTER}
        className="master-unit-map-picker h-full w-full"
        scrollWheelZoom
        zoom={selectedPosition ? 12 : 8}
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <InvalidateMapSize />
        <MapClickHandler onPick={onChange} />
        <PanToSelected position={selectedPosition} />

        {selectedPosition && (
          <Marker
            draggable
            eventHandlers={{
              dragend(event) {
                const marker = event.target as L.Marker;
                const nextPosition = marker.getLatLng();

                onChange({
                  latitude: formatCoordinate(nextPosition.lat),
                  longitude: formatCoordinate(nextPosition.lng),
                });
              },
            }}
            icon={markerIcon}
            position={selectedPosition}
          />
        )}
      </MapContainer>

      {!selectedPosition && (
        <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-[7px] border border-[#dce3ed] bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
          Belum ada titik koordinat
        </div>
      )}
    </div>
  );
}
