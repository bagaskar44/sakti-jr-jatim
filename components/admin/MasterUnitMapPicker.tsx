"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Check, MapPinned, X } from "lucide-react";

export type MasterUnitMapPickerValue = {
  latitude: string;
  longitude: string;
};

export type MasterUnitMapPickerProps = MasterUnitMapPickerValue & {
  onChange: (value: MasterUnitMapPickerValue) => void;
};

const EAST_JAVA_DEFAULT_LOCATION: MasterUnitMapPickerValue = {
  latitude: "-7.536100",
  longitude: "112.238400",
};

const LeafletMasterUnitMapPicker = dynamic<MasterUnitMapPickerProps>(
  () => import("./MasterUnitLeafletMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[176px] items-center justify-center gap-2 rounded-[6.4px] border border-[#dce3ed] bg-[#f8fafc] text-sm font-semibold text-slate-500">
        <MapPinned size={14.4} className="text-blue-700" />
        Memuat peta...
      </div>
    ),
  }
);

export function MasterUnitMapPicker({
  latitude,
  longitude,
  onChange,
}: MasterUnitMapPickerProps) {
  const [open, setOpen] = useState(false);
  const [draftLocation, setDraftLocation] =
    useState<MasterUnitMapPickerValue | null>(null);
  const hasCoordinates = Boolean(latitude.trim() && longitude.trim());
  const locationValue = hasCoordinates ? `${latitude}, ${longitude}` : "";
  const activeLocation = draftLocation ?? EAST_JAVA_DEFAULT_LOCATION;
  const hasDraftCoordinates = Boolean(
    activeLocation.latitude.trim() && activeLocation.longitude.trim()
  );

  function openPicker() {
    setDraftLocation(
      hasCoordinates
        ? {
            latitude,
            longitude,
          }
        : EAST_JAVA_DEFAULT_LOCATION
    );
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    setDraftLocation(null);
  }

  function commitPicker() {
    onChange(activeLocation);
    closePicker();
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePicker();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="jr-label">Lokasi</label>
          <input
            value={locationValue}
            onClick={openPicker}
            onFocus={openPicker}
            readOnly
            placeholder="Pilih lokasi di peta"
            className="jr-field mt-2 cursor-pointer"
          />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Tutup picker koordinat"
            className="absolute inset-0 bg-slate-950/55"
            onClick={closePicker}
          />

          <div className="relative z-10 flex max-h-[calc(100vh-25.6px)] w-full max-w-4xl flex-col overflow-hidden rounded-[6.4px] border border-[#dce3ed] bg-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dce3ed] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">
                  Pilih Koordinat Unit
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Klik peta atau geser marker untuk mengisi Latitude dan
                  Longitude.
                </p>
              </div>

              <button
                type="button"
                onClick={closePicker}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[5.6px] border border-[#dce3ed] bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                title="Tutup"
              >
                <X size={12.8} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto p-4">
              <LeafletMasterUnitMapPicker
                latitude={activeLocation.latitude}
                longitude={activeLocation.longitude}
                onChange={setDraftLocation}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#f8fafc] px-2.5 py-1.5 text-xs font-semibold tabular-nums text-slate-600">
                    Lat {activeLocation.latitude || "-"}
                  </span>
                  <span className="rounded-full bg-[#f8fafc] px-2.5 py-1.5 text-xs font-semibold tabular-nums text-slate-600">
                    Long {activeLocation.longitude || "-"}
                  </span>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {hasDraftCoordinates && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraftLocation(EAST_JAVA_DEFAULT_LOCATION)
                      }
                      className="jr-button-secondary min-h-0 px-3 py-2 text-xs"
                    >
                      <X size={11.2} />
                      Reset
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={commitPicker}
                    className="jr-button-primary min-h-0 px-3 py-2 text-xs"
                  >
                    <Check size={11.2} />
                    Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!open && hasCoordinates && (
        <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onChange({ latitude: "", longitude: "" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#dce3ed] bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              title="Hapus koordinat"
            >
              <X size={10.4} />
              Hapus koordinat
            </button>
        </div>
      )}
    </>
  );
}
