import { MapPinned } from "lucide-react";

export function PlaceholderMap() {
  return (
    <div className="jr-state flex min-h-[260px] flex-col items-center justify-center border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[8px] bg-white text-blue-700 shadow-sm">
        <MapPinned size={30} />
      </div>

      <h3 className="text-base font-bold text-slate-900">
        Peta Interaktif Jawa Timur
      </h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Area peta disiapkan untuk mode Pendapatan, Pelayanan, dan Kecelakaan.
        Untuk versi pertama, peta akan aktif setelah master lokasi dan koordinat
        unit tersedia.
      </p>
    </div>
  );
}
