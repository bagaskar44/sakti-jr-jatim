import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveRevenuePeriod } from "@/lib/dashboard/period";

export const dynamic = "force-dynamic";

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
    const parent = searchParams.get("parent");
    const level = searchParams.get("level");

    let query = supabase
      .from("v_revenue_iwkbu_monthly")
      .select("*")
      .eq("period_year", period.periodYear)
      .eq("period_month", period.periodMonth);

    if (parent && parent.trim()) {
      query = query.eq("parent_unit_name", parent.trim());
    } else if (level && level.trim()) {
      query = query.eq("level", level.trim());
    } else {
      query = query.eq("level", "SUMMARY");
    }

    const { data, error } = await query.order("iwkbu_current_year", {
      ascending: false,
    });

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
        message: "Gagal mengambil data IWKBU.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}