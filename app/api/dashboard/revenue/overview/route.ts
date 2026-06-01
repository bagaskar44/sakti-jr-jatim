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

    const { periodYear, periodMonth } = period;

    const { data: overview, error: overviewError } = await supabase
      .from("v_revenue_overview_monthly")
      .select("*")
      .eq("period_year", periodYear)
      .eq("period_month", periodMonth)
      .single();

    if (overviewError || !overview) {
      return NextResponse.json(
        {
          success: false,
          message: "Data overview pendapatan tidak ditemukan.",
          error: overviewError?.message,
        },
        { status: 404 }
      );
    }

    const { data: composition, error: compositionError } = await supabase
      .from("v_revenue_source_composition")
      .select("*")
      .eq("period_year", periodYear)
      .eq("period_month", periodMonth)
      .order("amount", { ascending: false });

    if (compositionError) {
      throw new Error(compositionError.message);
    }

    const { data: topUnits, error: topUnitsError } = await supabase
      .from("v_revenue_by_unit_monthly")
      .select("*")
      .eq("period_year", periodYear)
      .eq("period_month", periodMonth)
      .order("total_revenue", { ascending: false })
      .limit(10);

    if (topUnitsError) {
      throw new Error(topUnitsError.message);
    }

    return NextResponse.json({
      success: true,
      period: {
        year: periodYear,
        month: periodMonth,
        source: period.source,
      },
      overview,
      composition: composition ?? [],
      top_units: topUnits ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data overview pendapatan.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}