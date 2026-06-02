import { NextResponse } from "next/server";
import {
  getMonthsForFilter,
  resolveRevenuePeriodFilter,
} from "@/lib/dashboard/period";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type MasterUnitRow = {
  id: string;
  canonical_name: string;
  unit_name: string;
  unit_type: string;
  parent_unit_id: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

type RevenueUnitRow = {
  unit_name: string;
  swdkllj_total: number | string | null;
  iwkbu_total: number | string | null;
  iwkl_total: number | string | null;
  total_revenue: number | string | null;
};

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

function toNumber(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isNaN(result) ? 0 : result;
}

function aggregateRevenueRows(rows: RevenueUnitRow[]) {
  const byUnit = new Map<string, RevenueUnitRow>();

  for (const row of rows) {
    const current = byUnit.get(row.unit_name) ?? {
      unit_name: row.unit_name,
      swdkllj_total: 0,
      iwkbu_total: 0,
      iwkl_total: 0,
      total_revenue: 0,
    };

    byUnit.set(row.unit_name, {
      unit_name: row.unit_name,
      swdkllj_total:
        toNumber(current.swdkllj_total) + toNumber(row.swdkllj_total),
      iwkbu_total: toNumber(current.iwkbu_total) + toNumber(row.iwkbu_total),
      iwkl_total: toNumber(current.iwkl_total) + toNumber(row.iwkl_total),
      total_revenue:
        toNumber(current.total_revenue) + toNumber(row.total_revenue),
    });
  }

  return Array.from(byUnit.values());
}

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const period = await resolveRevenuePeriodFilter(supabase, request);

    if (!period.success) {
      return NextResponse.json(
        {
          success: false,
          message: period.message,
        },
        { status: 400 }
      );
    }

    const months = getMonthsForFilter(period.periodYear, period.periodMonth);

    const { data: units, error: unitsError } = await supabase
      .from("master_units")
      .select(
        "id, canonical_name, unit_name, unit_type, parent_unit_id, latitude, longitude"
      )
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .in("unit_type", ["KANWIL", "CABANG", "KANTOR_PELAYANAN"])
      .order("unit_type", { ascending: true })
      .order("canonical_name", { ascending: true });

    if (unitsError) {
      throw new Error(unitsError.message);
    }

    const { data: revenueRows, error: revenueError } = await supabase
      .from("v_revenue_by_unit_monthly")
      .select(
        "unit_name, swdkllj_total, iwkbu_total, iwkl_total, total_revenue"
      )
      .eq("period_year", period.periodYear)
      .in("period_month", months);

    if (revenueError) {
      throw new Error(revenueError.message);
    }

    const unitRows = (units ?? []) as MasterUnitRow[];
    const revenueByName = new Map<string, RevenueUnitRow>();
    const unitById = new Map<string, MasterUnitRow>();

    for (const unit of unitRows) {
      unitById.set(unit.id, unit);
    }

    for (const row of aggregateRevenueRows((revenueRows ?? []) as RevenueUnitRow[])) {
      revenueByName.set(normalizeName(row.unit_name), row);
    }

    const data = unitRows.map((unit) => {
      const revenue = revenueByName.get(normalizeName(unit.canonical_name));
      const parent = unit.parent_unit_id
        ? unitById.get(unit.parent_unit_id)
        : null;

      return {
        id: unit.id,
        unit_name: unit.canonical_name,
        display_name: unit.unit_name,
        unit_type: unit.unit_type,
        parent_unit_name: parent?.canonical_name ?? null,
        latitude: toNumber(unit.latitude),
        longitude: toNumber(unit.longitude),
        swdkllj_total: toNumber(revenue?.swdkllj_total),
        iwkbu_total: toNumber(revenue?.iwkbu_total),
        iwkl_total: toNumber(revenue?.iwkl_total),
        total_revenue: toNumber(revenue?.total_revenue),
      };
    });

    return NextResponse.json({
      success: true,
      period: {
        year: period.periodYear,
        month: period.periodMonth,
        source: period.source,
        months,
      },
      count: data.length,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data peta pendapatan.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
