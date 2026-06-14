import type { SupabaseClient } from "@supabase/supabase-js";

export const MASTER_UNIT_TYPES = [
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

export type MasterUnitType = (typeof MASTER_UNIT_TYPES)[number];

export type MasterUnitAlias = {
  id: string;
  unit_id: string;
  alias_name: string;
  normalized_alias: string;
  created_at?: string;
};

export type MasterUnit = {
  id: string;
  unit_name: string;
  canonical_name: string;
  unit_type: MasterUnitType;
  parent_unit_id: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  aliases: MasterUnitAlias[];
  parent: Pick<MasterUnit, "id" | "canonical_name" | "unit_type"> | null;
};

type RawMasterUnit = Omit<MasterUnit, "aliases" | "parent">;

type MasterUnitPayload = {
  unit_name?: unknown;
  canonical_name?: unknown;
  unit_type?: unknown;
  parent_unit_id?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  is_active?: unknown;
  aliases?: unknown;
};

type SanitizedMasterUnitPayload = {
  unit_name: string;
  canonical_name: string;
  unit_type: MasterUnitType;
  parent_unit_id: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  aliases: string[];
};

type RevenueRows = {
  swdkllj: Record<string, unknown>[];
  iwkbu: Record<string, unknown>[];
  iwklCabang: Record<string, unknown>[];
  iwklJenis: Record<string, unknown>[];
};

type ValidationWarning = {
  sheet: string;
  severity: "warning";
  row?: number;
  column?: string;
  message: string;
  context?: Record<string, unknown>;
};

type CandidateUnit = {
  canonicalName: string;
  unitType: MasterUnitType;
  parentName: string | null;
};

export class MasterUnitError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function normalizeMasterAlias(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

function isMasterUnitType(value: unknown): value is MasterUnitType {
  return MASTER_UNIT_TYPES.includes(value as MasterUnitType);
}

function parseOptionalNumber(
  value: unknown,
  label: string,
  min: number,
  max: number
) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const result = Number(value);

  if (Number.isNaN(result) || result < min || result > max) {
    throw new MasterUnitError(`${label} tidak valid.`);
  }

  return result;
}

function uniqueAliasNames(values: unknown[]) {
  const map = new Map<string, string>();

  for (const value of values) {
    const aliasName = normalizeMasterAlias(value);
    if (!aliasName) continue;

    map.set(aliasName, aliasName);
  }

  return [...map.values()];
}

function sanitizePayload(payload: MasterUnitPayload) {
  const unitName = normalizeMasterAlias(payload.unit_name);
  const canonicalName = normalizeMasterAlias(
    payload.canonical_name || payload.unit_name
  );
  const unitType = isMasterUnitType(payload.unit_type)
    ? payload.unit_type
    : "LAINNYA";
  const parentUnitId = normalizeMasterAlias(payload.parent_unit_id) || null;
  const latitude = parseOptionalNumber(payload.latitude, "Latitude", -90, 90);
  const longitude = parseOptionalNumber(
    payload.longitude,
    "Longitude",
    -180,
    180
  );
  const rawAliases = Array.isArray(payload.aliases) ? payload.aliases : [];
  const aliases = uniqueAliasNames([canonicalName, unitName, ...rawAliases]);

  if (!unitName) {
    throw new MasterUnitError("Nama unit wajib diisi.");
  }

  if (!canonicalName) {
    throw new MasterUnitError("Canonical name wajib diisi.");
  }

  return {
    unit_name: unitName,
    canonical_name: canonicalName,
    unit_type: unitType,
    parent_unit_id: parentUnitId,
    latitude,
    longitude,
    is_active: payload.is_active === false ? false : true,
    aliases,
  } satisfies SanitizedMasterUnitPayload;
}

function getSupabaseMessage(error: { message?: string } | null | undefined) {
  return error?.message ?? "Terjadi error Supabase.";
}

async function assertCanonicalAvailable(
  supabase: SupabaseClient,
  canonicalName: string,
  currentUnitId?: string
) {
  const { data, error } = await supabase
    .from("master_units")
    .select("id")
    .eq("canonical_name", canonicalName)
    .limit(1);

  if (error) {
    throw new MasterUnitError(getSupabaseMessage(error), 500);
  }

  const existing = data?.[0] as { id: string } | undefined;

  if (existing && existing.id !== currentUnitId) {
    throw new MasterUnitError("Canonical name sudah digunakan.", 409);
  }
}

async function assertAliasesAvailable(
  supabase: SupabaseClient,
  aliases: string[],
  currentUnitId?: string
) {
  if (aliases.length === 0) return;

  const normalizedAliases = aliases.map(normalizeMasterAlias);

  const { data, error } = await supabase
    .from("master_unit_aliases")
    .select("unit_id, normalized_alias")
    .in("normalized_alias", normalizedAliases);

  if (error) {
    throw new MasterUnitError(getSupabaseMessage(error), 500);
  }

  const conflict = (data ?? []).find(
    (row) => row.unit_id !== currentUnitId
  ) as { normalized_alias: string } | undefined;

  if (conflict) {
    throw new MasterUnitError(
      `Alias "${conflict.normalized_alias}" sudah digunakan unit lain.`,
      409
    );
  }
}

async function replaceAliases(
  supabase: SupabaseClient,
  unitId: string,
  aliases: string[]
) {
  const { error: deleteError } = await supabase
    .from("master_unit_aliases")
    .delete()
    .eq("unit_id", unitId);

  if (deleteError) {
    throw new MasterUnitError(getSupabaseMessage(deleteError), 500);
  }

  const aliasRows = aliases.map((aliasName) => ({
    unit_id: unitId,
    alias_name: aliasName,
    normalized_alias: normalizeMasterAlias(aliasName),
  }));

  if (aliasRows.length === 0) return;

  const { error: insertError } = await supabase
    .from("master_unit_aliases")
    .insert(aliasRows);

  if (insertError) {
    throw new MasterUnitError(getSupabaseMessage(insertError), 500);
  }
}

function buildMasterUnitRows(
  units: RawMasterUnit[],
  aliases: MasterUnitAlias[]
) {
  const aliasesByUnit = new Map<string, MasterUnitAlias[]>();
  const unitById = new Map<string, RawMasterUnit>();

  for (const unit of units) {
    unitById.set(unit.id, unit);
  }

  for (const alias of aliases) {
    const current = aliasesByUnit.get(alias.unit_id) ?? [];
    current.push(alias);
    aliasesByUnit.set(alias.unit_id, current);
  }

  return units.map((unit) => {
    const parentUnit = unit.parent_unit_id
      ? unitById.get(unit.parent_unit_id)
      : null;

    return {
      ...unit,
      aliases: aliasesByUnit.get(unit.id) ?? [],
      parent: parentUnit
        ? {
            id: parentUnit.id,
            canonical_name: parentUnit.canonical_name,
            unit_type: parentUnit.unit_type,
          }
        : null,
    };
  });
}

export async function listMasterUnits(
  supabase: SupabaseClient,
  filters: {
    q?: string | null;
    unitType?: string | null;
    status?: string | null;
  } = {}
) {
  const { data: units, error: unitsError } = await supabase
    .from("master_units")
    .select("*")
    .order("canonical_name", { ascending: true });

  if (unitsError) {
    throw new MasterUnitError(getSupabaseMessage(unitsError), 500);
  }

  const { data: aliases, error: aliasesError } = await supabase
    .from("master_unit_aliases")
    .select("*")
    .order("alias_name", { ascending: true });

  if (aliasesError) {
    throw new MasterUnitError(getSupabaseMessage(aliasesError), 500);
  }

  const search = normalizeMasterAlias(filters.q);
  const status = filters.status || "active";
  const unitType = filters.unitType || "ALL";

  return buildMasterUnitRows(
    (units ?? []) as RawMasterUnit[],
    (aliases ?? []) as MasterUnitAlias[]
  ).filter((unit) => {
    if (unitType !== "ALL" && unit.unit_type !== unitType) return false;
    if (status === "active" && !unit.is_active) return false;
    if (status === "inactive" && unit.is_active) return false;

    if (!search) return true;

    return (
      normalizeMasterAlias(unit.unit_name).includes(search) ||
      normalizeMasterAlias(unit.canonical_name).includes(search) ||
      unit.aliases.some((alias) =>
        normalizeMasterAlias(alias.alias_name).includes(search)
      )
    );
  });
}

export async function getMasterUnit(supabase: SupabaseClient, unitId: string) {
  const units = await listMasterUnits(supabase, { status: "all" });
  const unit = units.find((item) => item.id === unitId);

  if (!unit) {
    throw new MasterUnitError("Master unit tidak ditemukan.", 404);
  }

  return unit;
}

export async function createMasterUnit(
  supabase: SupabaseClient,
  payload: MasterUnitPayload
) {
  const sanitized = sanitizePayload(payload);

  await assertCanonicalAvailable(supabase, sanitized.canonical_name);
  await assertAliasesAvailable(supabase, sanitized.aliases);

  const { data, error } = await supabase
    .from("master_units")
    .insert({
      unit_name: sanitized.unit_name,
      canonical_name: sanitized.canonical_name,
      unit_type: sanitized.unit_type,
      parent_unit_id: sanitized.parent_unit_id,
      latitude: sanitized.latitude,
      longitude: sanitized.longitude,
      is_active: sanitized.is_active,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new MasterUnitError(getSupabaseMessage(error), 500);
  }

  await replaceAliases(supabase, data.id as string, sanitized.aliases);

  return getMasterUnit(supabase, data.id as string);
}

export async function updateMasterUnit(
  supabase: SupabaseClient,
  unitId: string,
  payload: MasterUnitPayload
) {
  const sanitized = sanitizePayload(payload);

  await getMasterUnit(supabase, unitId);

  if (sanitized.parent_unit_id === unitId) {
    throw new MasterUnitError("Parent unit tidak boleh unit yang sama.");
  }

  await assertCanonicalAvailable(supabase, sanitized.canonical_name, unitId);
  await assertAliasesAvailable(supabase, sanitized.aliases, unitId);

  const { error } = await supabase
    .from("master_units")
    .update({
      unit_name: sanitized.unit_name,
      canonical_name: sanitized.canonical_name,
      unit_type: sanitized.unit_type,
      parent_unit_id: sanitized.parent_unit_id,
      latitude: sanitized.latitude,
      longitude: sanitized.longitude,
      is_active: sanitized.is_active,
    })
    .eq("id", unitId);

  if (error) {
    throw new MasterUnitError(getSupabaseMessage(error), 500);
  }

  await replaceAliases(supabase, unitId, sanitized.aliases);

  return getMasterUnit(supabase, unitId);
}

export async function deactivateMasterUnit(
  supabase: SupabaseClient,
  unitId: string
) {
  await getMasterUnit(supabase, unitId);

  const { error } = await supabase
    .from("master_units")
    .update({ is_active: false })
    .eq("id", unitId);

  if (error) {
    throw new MasterUnitError(getSupabaseMessage(error), 500);
  }

  return getMasterUnit(supabase, unitId);
}

function inferUnitType(name: unknown, level?: unknown): MasterUnitType {
  const normalized = normalizeMasterAlias(name);
  const normalizedLevel = normalizeMasterAlias(level);

  if (normalized.includes("DISHUB")) {
    return "DISHUB";
  }

  if (normalized.includes("DLLAJ")) {
    return "DLLAJ";
  }

  if (normalizedLevel === "SAMSAT_DETAIL" || normalized.includes("SAMSAT")) {
    return "SAMSAT";
  }

  if (normalized.startsWith("LOKET ")) {
    return "LOKET";
  }

  if (normalized.startsWith("KANTOR WILAYAH")) {
    return "KANWIL";
  }

  if (normalized.startsWith("KANTOR CABANG")) {
    return "CABANG";
  }

  if (normalized.startsWith("KANTOR PELAYANAN")) {
    return "KANTOR_PELAYANAN";
  }

  return "LAINNYA";
}

function inferParentName(name: unknown, explicitParent?: unknown) {
  const normalized = normalizeMasterAlias(name);
  const parentName = normalizeMasterAlias(explicitParent);

  if (parentName) return parentName;

  if (normalized === "LOKET KANTOR WILAYAH JAWA TIMUR") {
    return "KANTOR WILAYAH JAWA TIMUR";
  }

  if (normalized.startsWith("LOKET KANTOR CABANG ")) {
    return normalized.replace("LOKET ", "");
  }

  if (normalized.startsWith("LOKET KANTOR PELAYANAN ")) {
    return normalized.replace("LOKET ", "");
  }

  return null;
}

function addCandidate(
  candidates: Map<string, CandidateUnit>,
  name: unknown,
  unitType: MasterUnitType,
  parentName?: unknown
) {
  const canonicalName = normalizeMasterAlias(name);
  if (!canonicalName) return;

  const normalizedParent = normalizeMasterAlias(parentName) || null;
  const existing = candidates.get(canonicalName);

  candidates.set(canonicalName, {
    canonicalName,
    unitType: existing?.unitType === "LAINNYA" ? unitType : existing?.unitType ?? unitType,
    parentName: existing?.parentName ?? normalizedParent,
  });
}

export async function seedMasterUnitsFromRevenue(supabase: SupabaseClient) {
  const [
    swdklljResult,
    iwkbuResult,
    iwklCabangResult,
    unitsResult,
    aliasesResult,
  ] = await Promise.all([
    supabase
      .from("revenue_swdkllj")
      .select("unit_name, parent_unit_name, level"),
    supabase
      .from("revenue_iwkbu")
      .select("unit_name, parent_unit_name, level"),
    supabase.from("revenue_iwkl_cabang").select("unit_name"),
    supabase
      .from("master_units")
      .select("id, canonical_name, parent_unit_id"),
    supabase.from("master_unit_aliases").select("unit_id, normalized_alias"),
  ]);

  const firstError =
    swdklljResult.error ||
    iwkbuResult.error ||
    iwklCabangResult.error ||
    unitsResult.error ||
    aliasesResult.error;

  if (firstError) {
    throw new MasterUnitError(getSupabaseMessage(firstError), 500);
  }

  const candidates = new Map<string, CandidateUnit>();

  for (const row of swdklljResult.data ?? []) {
    addCandidate(candidates, row.unit_name, inferUnitType(row.unit_name, row.level));
    addCandidate(
      candidates,
      row.parent_unit_name,
      inferUnitType(row.parent_unit_name),
      null
    );
  }

  for (const row of iwkbuResult.data ?? []) {
    addCandidate(
      candidates,
      row.unit_name,
      inferUnitType(row.unit_name, row.level),
      inferParentName(row.unit_name, row.parent_unit_name)
    );
    addCandidate(
      candidates,
      row.parent_unit_name,
      inferUnitType(row.parent_unit_name),
      null
    );
  }

  for (const row of iwklCabangResult.data ?? []) {
    addCandidate(candidates, row.unit_name, inferUnitType(row.unit_name));
  }

  const existingUnits = (unitsResult.data ?? []) as {
    id: string;
    canonical_name: string;
    parent_unit_id: string | null;
  }[];
  const existingAliases = (aliasesResult.data ?? []) as {
    unit_id: string;
    normalized_alias: string;
  }[];
  const normalizedToUnitId = new Map<string, string>();

  for (const unit of existingUnits) {
    normalizedToUnitId.set(normalizeMasterAlias(unit.canonical_name), unit.id);
  }

  for (const alias of existingAliases) {
    normalizedToUnitId.set(alias.normalized_alias, alias.unit_id);
  }

  const rowsToInsert = [...candidates.values()]
    .filter((candidate) => !normalizedToUnitId.has(candidate.canonicalName))
    .map((candidate) => ({
      unit_name: candidate.canonicalName,
      canonical_name: candidate.canonicalName,
      unit_type: candidate.unitType,
      parent_unit_id: null,
      is_active: true,
    }));

  let created = 0;
  let aliasesCreated = 0;

  if (rowsToInsert.length > 0) {
    const { data: insertedUnits, error: insertError } = await supabase
      .from("master_units")
      .insert(rowsToInsert)
      .select("id, canonical_name");

    if (insertError) {
      throw new MasterUnitError(getSupabaseMessage(insertError), 500);
    }

    created = insertedUnits?.length ?? 0;

    const aliasRows = (insertedUnits ?? []).map((unit) => ({
      unit_id: unit.id,
      alias_name: unit.canonical_name,
      normalized_alias: normalizeMasterAlias(unit.canonical_name),
    }));

    if (aliasRows.length > 0) {
      const { error: aliasInsertError } = await supabase
        .from("master_unit_aliases")
        .insert(aliasRows);

      if (aliasInsertError) {
        throw new MasterUnitError(getSupabaseMessage(aliasInsertError), 500);
      }

      aliasesCreated = aliasRows.length;
    }
  }

  const { data: latestUnits, error: latestUnitsError } = await supabase
    .from("master_units")
    .select("id, canonical_name, parent_unit_id");

  const { data: latestAliases, error: latestAliasesError } = await supabase
    .from("master_unit_aliases")
    .select("unit_id, normalized_alias");

  if (latestUnitsError || latestAliasesError) {
    throw new MasterUnitError(
      getSupabaseMessage(latestUnitsError || latestAliasesError),
      500
    );
  }

  const latestNormalizedToUnitId = new Map<string, string>();
  const parentByUnitId = new Map<string, string | null>();

  for (const unit of latestUnits ?? []) {
    latestNormalizedToUnitId.set(
      normalizeMasterAlias(unit.canonical_name),
      unit.id
    );
    parentByUnitId.set(unit.id, unit.parent_unit_id);
  }

  for (const alias of latestAliases ?? []) {
    latestNormalizedToUnitId.set(alias.normalized_alias, alias.unit_id);
  }

  let parentLinksUpdated = 0;

  for (const candidate of candidates.values()) {
    const unitId = latestNormalizedToUnitId.get(candidate.canonicalName);
    const currentParentId = unitId ? parentByUnitId.get(unitId) ?? null : null;
    const defaultParentName =
      !candidate.parentName &&
      (candidate.unitType === "CABANG" ||
        candidate.unitType === "KANTOR_PELAYANAN")
        ? "KANTOR WILAYAH JAWA TIMUR"
        : null;
    const parentName = candidate.parentName ?? defaultParentName;

    if (!parentName) continue;

    const parentId = latestNormalizedToUnitId.get(parentName);

    if (!unitId || !parentId || unitId === parentId) continue;
    if (defaultParentName && currentParentId) continue;
    if (currentParentId === parentId) continue;

    const { error: updateError } = await supabase
      .from("master_units")
      .update({ parent_unit_id: parentId })
      .eq("id", unitId);

    if (updateError) {
      throw new MasterUnitError(getSupabaseMessage(updateError), 500);
    }

    parentLinksUpdated += 1;
  }

  return {
    candidates: candidates.size,
    created,
    aliases_created: aliasesCreated,
    skipped: candidates.size - created,
    parent_links_updated: parentLinksUpdated,
  };
}

export async function resolveRevenueRowsWithMasterUnits(
  supabase: SupabaseClient,
  rows: RevenueRows
) {
  const [unitsResult, aliasesResult] = await Promise.all([
    supabase
      .from("master_units")
      .select("id, canonical_name, is_active")
      .eq("is_active", true),
    supabase.from("master_unit_aliases").select("unit_id, normalized_alias"),
  ]);

  if (unitsResult.error || aliasesResult.error) {
    return [
      {
        sheet: "MASTER_UNIT",
        severity: "warning" as const,
        message:
          "Master Unit belum bisa dibaca. Sync tetap dapat dilanjutkan tanpa normalisasi alias database.",
        context: {
          error: getSupabaseMessage(unitsResult.error || aliasesResult.error),
        },
      },
    ];
  }

  const unitById = new Map<string, string>();
  const canonicalByAlias = new Map<string, string>();

  for (const unit of unitsResult.data ?? []) {
    unitById.set(unit.id, unit.canonical_name);
    canonicalByAlias.set(
      normalizeMasterAlias(unit.canonical_name),
      unit.canonical_name
    );
  }

  for (const alias of aliasesResult.data ?? []) {
    const canonicalName = unitById.get(alias.unit_id);
    if (!canonicalName) continue;

    canonicalByAlias.set(alias.normalized_alias, canonicalName);
  }

  const missing = new Map<
    string,
    { sheet: string; field: string; value: string }
  >();

  function resolveName(sheet: string, field: string, value: unknown) {
    const normalized = normalizeMasterAlias(value);

    if (!normalized) return value;

    const canonicalName = canonicalByAlias.get(normalized);

    if (canonicalName) return canonicalName;

    missing.set(`${sheet}|${field}|${normalized}`, {
      sheet,
      field,
      value: normalized,
    });

    return value;
  }

  for (const row of rows.swdkllj) {
    row.parent_unit_name = resolveName(
      "SWDKLLJ",
      "parent_unit_name",
      row.parent_unit_name
    );
    row.unit_name = resolveName("SWDKLLJ", "unit_name", row.unit_name);
  }

  for (const row of rows.iwkbu) {
    row.parent_unit_name = resolveName(
      "IWKBU",
      "parent_unit_name",
      row.parent_unit_name
    );
    row.unit_name = resolveName("IWKBU", "unit_name", row.unit_name);
  }

  for (const row of rows.iwklCabang) {
    row.unit_name = resolveName("IWKL_Cabang", "unit_name", row.unit_name);
  }

  const missingRows = [...missing.values()];

  if (missingRows.length === 0) {
    return [] satisfies ValidationWarning[];
  }

  return [
    {
      sheet: "MASTER_UNIT",
      severity: "warning" as const,
      message: `Unit belum terpetakan di Master Unit: ditemukan ${missingRows.length} nama unik. Sync tetap dapat dilanjutkan.`,
      context: {
        unmapped_units: missingRows.slice(0, 80),
        total_unmapped_units: missingRows.length,
      },
    },
  ] satisfies ValidationWarning[];
}
