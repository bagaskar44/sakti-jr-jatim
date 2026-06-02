import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getMonthsForFilter,
  resolveRevenuePeriodFilter,
} from "@/lib/dashboard/period";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null) {
  const limit = Number(value ?? 50);

  if (!Number.isInteger(limit) || limit < 1) return 50;
  if (limit > 200) return 200;

  return limit;
}

type RevenueUnitRow = {
  unit_name: string;
  swdkllj_total: number | string | null;
  iwkbu_total: number | string | null;
  iwkl_total: number | string | null;
  total_revenue: number | string | null;
};

function toNumber(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isNaN(result) ? 0 : result;
}

function aggregateUnits(rows: RevenueUnitRow[]) {
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

  return Array.from(byUnit.values()).sort(
    (a, b) => toNumber(b.total_revenue) - toNumber(a.total_revenue)
  );
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

    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const q = searchParams.get("q");
    const months = getMonthsForFilter(period.periodYear, period.periodMonth);

    let query = supabase
      .from("v_revenue_by_unit_monthly")
      .select("*")
      .eq("period_year", period.periodYear)
      .in("period_month", months)
      .order("total_revenue", { ascending: false });

    if (q && q.trim()) {
      query = query.ilike("unit_name", `%${q.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const aggregatedData = aggregateUnits((data ?? []) as RevenueUnitRow[]);
    const limitedData = aggregatedData.slice(0, limit);

    return NextResponse.json({
      success: true,
      period: {
        year: period.periodYear,
        month: period.periodMonth,
        source: period.source,
        months,
      },
      count: limitedData.length,
      data: limitedData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil ranking unit pendapatan.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
