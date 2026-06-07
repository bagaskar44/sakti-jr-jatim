import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveRevenuePeriod } from "@/lib/dashboard/period";

export const dynamic = "force-dynamic";

type IwklDetailRow = {
  parent_unit_name: string;
  detail_type: string;
  passenger_count: number | string | null;
  nominal: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  const result = Number(value ?? 0);
  return Number.isNaN(result) ? 0 : result;
}

function aggregateDetailsByType(rows: IwklDetailRow[]) {
  const byType = new Map<string, IwklDetailRow>();

  for (const row of rows) {
    const detailType = String(row.detail_type ?? "").trim() || "LAINNYA";
    const current = byType.get(detailType) ?? {
      parent_unit_name: "JAWA TIMUR",
      detail_type: detailType,
      passenger_count: 0,
      nominal: 0,
    };

    byType.set(detailType, {
      ...current,
      passenger_count:
        toNumber(current.passenger_count) + toNumber(row.passenger_count),
      nominal: toNumber(current.nominal) + toNumber(row.nominal),
    });
  }

  return Array.from(byType.values()).sort(
    (a, b) => toNumber(b.nominal) - toNumber(a.nominal)
  );
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

    let detailQuery = supabase
      .from("v_revenue_iwkl_detail_monthly")
      .select("*")
      .eq("period_year", period.periodYear)
      .eq("period_month", period.periodMonth);

    if (parent && parent.trim()) {
      detailQuery = detailQuery.eq("parent_unit_name", parent.trim());
    }

    const { data: detailRows, error: detailError } = await detailQuery.order(
      "nominal",
      { ascending: false }
    );

    if (detailError) {
      throw new Error(detailError.message);
    }

    const details =
      parent && parent.trim()
        ? detailRows ?? []
        : aggregateDetailsByType((detailRows ?? []) as IwklDetailRow[]);

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
