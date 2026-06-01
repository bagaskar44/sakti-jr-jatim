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

    const { data: summary, error: summaryError } = await supabase
      .from("v_revenue_iwkl_monthly")
      .select("*")
      .eq("period_year", period.periodYear)
      .eq("period_month", period.periodMonth)
      .order("nominal", { ascending: false });

    if (summaryError) {
      throw new Error(summaryError.message);
    }

    let details: unknown[] = [];

    if (parent && parent.trim()) {
      const { data: detailRows, error: detailError } = await supabase
        .from("v_revenue_iwkl_detail_monthly")
        .select("*")
        .eq("period_year", period.periodYear)
        .eq("period_month", period.periodMonth)
        .eq("parent_unit_name", parent.trim())
        .order("nominal", { ascending: false });

      if (detailError) {
        throw new Error(detailError.message);
      }

      details = detailRows ?? [];
    }

    return NextResponse.json({
      success: true,
      period: {
        year: period.periodYear,
        month: period.periodMonth,
        source: period.source,
      },
      summary_count: summary?.length ?? 0,
      summary: summary ?? [],
      selected_parent: parent,
      details_count: details.length,
      details,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data IWKL.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}