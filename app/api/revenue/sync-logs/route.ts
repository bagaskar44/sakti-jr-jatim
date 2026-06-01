import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null) {
  const limit = Number(value ?? 20);

  if (!Number.isInteger(limit) || limit < 1) return 20;
  if (limit > 100) return 100;

  return limit;
}

function parseYear(value: string | null) {
  if (!value) return null;

  const year = Number(value);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;

  return year;
}

function parseMonth(value: string | null) {
  if (!value) return null;

  const month = Number(value);

  if (!Number.isInteger(month) || month < 1 || month > 12) return null;

  return month;
}

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);

    const limit = parseLimit(searchParams.get("limit"));
    const status = searchParams.get("status")?.trim().toLowerCase() ?? "all";
    const year = parseYear(searchParams.get("year"));
    const month = parseMonth(searchParams.get("month"));

    let query = supabase
      .from("revenue_sync_logs")
      .select(
        `
        id,
        batch_id,
        period_year,
        period_month,
        spreadsheet_id,
        status,
        message,
        technical_error_count,
        business_warning_count,
        row_counts,
        totals,
        created_at
      `
      );

    if (year !== null) {
      query = query.eq("period_year", year);
    }

    if (month !== null) {
      query = query.eq("period_month", month);
    }

    if (status === "success") {
      query = query.eq("status", "success");
    } else if (status === "failed") {
      query = query.in("status", ["failed_validation", "failed_runtime"]);
    } else if (status === "warning") {
      query = query.gt("business_warning_count", 0);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil riwayat sync.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Riwayat sync berhasil diambil.",
      filters: {
        status,
        year,
        month,
        limit,
      },
      count: data?.length ?? 0,
      data: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan runtime saat mengambil riwayat sync.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
