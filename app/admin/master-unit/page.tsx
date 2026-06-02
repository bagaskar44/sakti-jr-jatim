"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  GitBranch,
  Loader2,
  MapPin,
  Pencil,
  Power,
  RefreshCcw,
  Save,
  Search,
  XCircle,
} from "lucide-react";
import { MasterUnitMapPicker } from "@/components/admin/MasterUnitMapPicker";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";

const unitTypes = [
  "KANWIL",
  "CABANG",
  "KANTOR_PELAYANAN",
  "SAMSAT",
  "LOKET",
  "OPERATOR",
  "DISHUB",
  "DLLAJ",
  "LAINNYA",
] as const;

type UnitType = (typeof unitTypes)[number];

type MasterUnitAlias = {
  id: string;
  unit_id: string;
  alias_name: string;
  normalized_alias: string;
};

type MasterUnit = {
  id: string;
  unit_name: string;
  canonical_name: string;
  unit_type: UnitType;
  parent_unit_id: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  aliases: MasterUnitAlias[];
  parent: {
    id: string;
    canonical_name: string;
    unit_type: UnitType;
  } | null;
};

type UnitsResponse = {
  success: boolean;
  message?: string;
  count?: number;
  data?: MasterUnit[];
};

type MutationResponse = {
  success: boolean;
  message?: string;
  data?: MasterUnit;
  error?: string;
};

type SeedResponse = {
  success: boolean;
  message?: string;
  data?: {
    candidates: number;
    created: number;
    aliases_created: number;
    skipped: number;
    parent_links_updated: number;
  };
  error?: string;
};

type FormState = {
  id: string | null;
  unit_name: string;
  canonical_name: string;
  unit_type: UnitType;
  parent_unit_id: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
  aliases_text: string;
};

const emptyForm: FormState = {
  id: null,
  unit_name: "",
  canonical_name: "",
  unit_type: "CABANG",
  parent_unit_id: "",
  latitude: "",
  longitude: "",
  is_active: true,
  aliases_text: "",
};

// Set true to show the Generate and Refresh buttons again.
const showMasterUnitUtilities = false;

function getCurrentPeriod() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function getUnitTypeLabel(unitType: UnitType) {
  return unitType.replace(/_/g, " ");
}

function splitAliases(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFormState(unit: MasterUnit): FormState {
  return {
    id: unit.id,
    unit_name: unit.unit_name,
    canonical_name: unit.canonical_name,
    unit_type: unit.unit_type,
    parent_unit_id: unit.parent_unit_id ?? "",
    latitude: unit.latitude === null ? "" : String(unit.latitude),
    longitude: unit.longitude === null ? "" : String(unit.longitude),
    is_active: unit.is_active,
    aliases_text: unit.aliases.map((alias) => alias.alias_name).join("\n"),
  };
}

function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 size={13} />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      <XCircle size={13} />
      Nonaktif
    </span>
  );
}

function MessageBox({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  const tone =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${tone}`}>
      {message}
    </div>
  );
}

export default function MasterUnitPage() {
  const period = useMemo(() => getCurrentPeriod(), []);
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  const [units, setUnits] = useState<MasterUnit[]>([]);
  const [parentUnits, setParentUnits] = useState<MasterUnit[]>([]);
  const [q, setQ] = useState("");
  const [unitType, setUnitType] = useState("ALL");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function fetchUnits() {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        status,
      });

      if (q.trim()) params.set("q", q.trim());
      if (unitType !== "ALL") params.set("unit_type", unitType);

      const response = await fetch(`/api/master/units?${params.toString()}`);
      const json = (await response.json()) as UnitsResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Gagal memuat Master Unit.");
      }

      setUnits(json.data ?? []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Gagal memuat data.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchParentUnits() {
    try {
      const response = await fetch("/api/master/units?status=active");
      const json = (await response.json()) as UnitsResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Gagal memuat parent unit.");
      }

      setParentUnits(json.data ?? []);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Gagal memuat pilihan parent unit.",
      });
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchUnits();
    }, 300);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, unitType, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchParentUnits();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const payload = {
      unit_name: form.unit_name,
      canonical_name: form.canonical_name || form.unit_name,
      unit_type: form.unit_type,
      parent_unit_id: form.parent_unit_id || null,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
      is_active: form.is_active,
      aliases: splitAliases(form.aliases_text),
    };

    try {
      const response = await fetch(
        form.id ? `/api/master/units/${form.id}` : "/api/master/units",
        {
          method: form.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const json = (await response.json()) as MutationResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Gagal menyimpan Master Unit.");
      }

      setMessage({
        type: "success",
        text: json.message ?? "Master unit tersimpan.",
      });
      setForm(emptyForm);
      await fetchUnits();
      await fetchParentUnits();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Gagal menyimpan Master Unit.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(unit: MasterUnit) {
    const confirmed = window.confirm(
      `Nonaktifkan ${unit.canonical_name}? Alias tetap tersimpan, tetapi unit tidak dipakai untuk normalisasi aktif.`
    );

    if (!confirmed) return;

    setMessage(null);

    try {
      const response = await fetch(`/api/master/units/${unit.id}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as MutationResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Gagal menonaktifkan unit.");
      }

      setMessage({
        type: "success",
        text: json.message ?? "Master unit dinonaktifkan.",
      });
      await fetchUnits();
      await fetchParentUnits();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Gagal menonaktifkan unit.",
      });
    }
  }

  async function handleSeed() {
    const confirmed = window.confirm(
      "Generate kandidat Master Unit dari data pendapatan yang sudah tersimpan?"
    );

    if (!confirmed) return;

    setIsSeeding(true);
    setMessage(null);

    try {
      const response = await fetch("/api/master/units/seed-from-revenue", {
        method: "POST",
      });
      const json = (await response.json()) as SeedResponse;

      if (!response.ok || !json.success) {
        throw new Error(
          json.message ?? "Gagal generate Master Unit dari revenue."
        );
      }

      const result = json.data;
      setMessage({
        type: "success",
        text: result
          ? `Generate selesai. Kandidat ${result.candidates}, unit baru ${result.created}, parent link ${result.parent_links_updated}.`
          : json.message ?? "Generate selesai.",
      });
      await fetchUnits();
      await fetchParentUnits();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Gagal generate Master Unit.",
      });
    } finally {
      setIsSeeding(false);
    }
  }

  const activeCount = units.filter((unit) => unit.is_active).length;
  const inactiveCount = units.length - activeCount;
  const parentOptions = parentUnits.filter((unit) => unit.id !== form.id);

  function handleEdit(unit: MasterUnit) {
    setForm(toFormState(unit));
    setMessage({
      type: "success",
      text: `Mode edit aktif untuk ${unit.canonical_name}. Lengkapi data di form atas lalu klik Simpan.`,
    });

    window.setTimeout(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  return (
    <main className="jr-page">
      <DashboardHeader
        title="Master Unit"
        subtitle="Data canonical unit, parent, koordinat, dan alias operasional"
        year={period.year}
        month={period.month}
      />

      <div className="w-full space-y-5 px-5 pb-5 pt-2">
        {message && <MessageBox type={message.type} message={message.text} />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="jr-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {units.length}
                </p>
              </div>
              <Database className="text-blue-700" size={24} />
            </div>
          </div>

          <div className="jr-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Aktif</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {activeCount}
                </p>
              </div>
              <CheckCircle2 className="text-emerald-600" size={24} />
            </div>
          </div>

          <div className="jr-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Nonaktif
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-700">
                  {inactiveCount}
                </p>
              </div>
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div ref={formSectionRef} className="scroll-mt-24">
          <SectionCard
            title={form.id ? `Edit Unit: ${form.canonical_name}` : "Tambah Unit"}
          >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div>
                <label className="jr-label">
                  Nama Unit
                </label>
                <input
                  value={form.unit_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit_name: event.target.value,
                    }))
                  }
                  required
                  className="jr-field mt-2"
                />
              </div>

              <div>
                <label className="jr-label">
                  Canonical Name
                </label>
                <input
                  value={form.canonical_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      canonical_name: event.target.value,
                    }))
                  }
                  placeholder={form.unit_name || "Nama canonical"}
                  className="jr-field mt-2"
                />
              </div>

              <div>
                <label className="jr-label">
                  Tipe Unit
                </label>
                <select
                  value={form.unit_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit_type: event.target.value as UnitType,
                    }))
                  }
                  className="jr-field mt-2"
                >
                  {unitTypes.map((type) => (
                    <option key={type} value={type}>
                      {getUnitTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="jr-label">
                  Parent Unit
                </label>
                <select
                  value={form.parent_unit_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      parent_unit_id: event.target.value,
                    }))
                  }
                  className="jr-field mt-2"
                >
                  <option value="">Tanpa parent</option>
                  {parentOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.canonical_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <MasterUnitMapPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      latitude: value.latitude,
                      longitude: value.longitude,
                    }))
                  }
                />
              </div>

              <div className="lg:col-span-2">
                <label className="jr-label">
                  Alias
                </label>
                <textarea
                  value={form.aliases_text}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      aliases_text: event.target.value,
                    }))
                  }
                  rows={1}
                  className="jr-field mt-2 h-[46px] min-h-[46px] resize-none overflow-hidden py-3"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setMessage(null);
                }}
                className="jr-button-secondary min-w-[116px]"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="jr-button-primary min-w-[116px]"
              >
                {isSaving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                Simpan
              </button>
            </div>
          </form>
          </SectionCard>
        </div>

        <SectionCard
          title="Daftar Master Unit"
          action={
            showMasterUnitUtilities ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="inline-flex items-center gap-2 rounded-[7px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {isSeeding ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <GitBranch size={14} />
                  )}
                  Generate
                </button>

                <button
                  onClick={fetchUnits}
                  disabled={isLoading}
                  className="jr-button-secondary min-h-0 px-3 py-2 text-xs disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCcw size={14} />
                  )}
                  Refresh
                </button>
              </div>
            ) : null
          }
        >
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(360px,1fr)_220px_180px]">
            <div className="jr-field flex items-center gap-3 px-3 py-0">
              <Search size={17} className="text-slate-400" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Cari unit atau alias"
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </div>

            <select
              value={unitType}
              onChange={(event) => setUnitType(event.target.value)}
              className="jr-field"
            >
              <option value="ALL">Semua tipe</option>
              {unitTypes.map((type) => (
                <option key={type} value={type}>
                  {getUnitTypeLabel(type)}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="jr-field"
            >
              <option value="all">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

          </div>

          {isLoading ? (
            <div className="jr-state p-8 text-center text-sm font-semibold text-slate-500">
              Memuat Master Unit...
            </div>
          ) : units.length === 0 ? (
            <div className="jr-state border-dashed p-8 text-center text-sm font-semibold text-slate-500">
              Belum ada data Master Unit.
            </div>
          ) : (
            <div className="jr-table-shell">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="jr-table-head">
                    <tr>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Tipe</th>
                      <th className="px-4 py-3">Parent</th>
                      <th className="px-4 py-3">Koordinat</th>
                      <th className="px-4 py-3">Alias</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-[#f8fafc]">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-950">
                            {unit.canonical_name}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {unit.unit_name}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {getUnitTypeLabel(unit.unit_type)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {unit.parent ? (
                            <span className="inline-flex items-center gap-2 font-semibold">
                              <GitBranch size={14} className="text-slate-400" />
                              {unit.parent.canonical_name}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {unit.latitude !== null && unit.longitude !== null ? (
                            <span className="inline-flex items-center gap-2 font-semibold">
                              <MapPin size={14} className="text-slate-400" />
                              {unit.latitude}, {unit.longitude}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="max-w-[320px] px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {unit.aliases.slice(0, 4).map((alias) => (
                              <span
                                key={alias.id}
                                className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                              >
                                {alias.alias_name}
                              </span>
                            ))}
                            {unit.aliases.length > 4 && (
                              <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-bold text-white">
                                +{unit.aliases.length - 4}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <StatusPill active={unit.is_active} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(unit)}
                            className="inline-flex items-center gap-1.5 rounded-[7px] border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeactivate(unit)}
                              disabled={!unit.is_active}
                              className="inline-flex items-center gap-1.5 rounded-[7px] border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Power size={13} />
                              Nonaktif
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
