import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveRevenuePeriod } from "@/lib/dashboard/period";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null) {
  const limit = Number(value ?? 50);

  if (!Number.isInteger(limit) || limit < 1) return 50;
  if (limit > 200) return 200;

  return limit;
}

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const period = await resolveRevenuePeriod(supabase, request);

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

    let query = supabase
      .from("v_revenue_by_unit_monthly")
      .select("*")
      .eq("period_year", period.periodYear)
      .eq("period_month", period.periodMonth)
      .order("total_revenue", { ascending: false })
      .limit(limit);

    if (q && q.trim()) {
      query = query.ilike("unit_name", `%${q.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      period: {
        year: period.periodYear,
        month: period.periodMonth,
        source: period.source,
      },
      count: data?.length ?? 0,
      data: data ?? [],
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