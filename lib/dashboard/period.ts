import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedPeriod =
  | {
      success: true;
      periodYear: number;
      periodMonth: number;
      source: "query" | "latest";
    }
  | {
      success: false;
      message: string;
    };

function isValidYearMonth(year: number, month: number) {
  return (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

export async function resolveRevenuePeriod(
  supabase: SupabaseClient,
  request: Request
): Promise<ResolvedPeriod> {
  const { searchParams } = new URL(request.url);

  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  if (yearParam || monthParam) {
    const periodYear = Number(yearParam);
    const periodMonth = Number(monthParam);

    if (!isValidYearMonth(periodYear, periodMonth)) {
      return {
        success: false,
        message:
          "Parameter year dan month tidak valid. Contoh: ?year=2026&month=5",
      };
    }

    return {
      success: true,
      periodYear,
      periodMonth,
      source: "query",
    };
  }

  const { data, error } = await supabase
    .from("v_revenue_latest_batch")
    .select("period_year, period_month")
    .single();

  if (error || !data) {
    return {
      success: false,
      message:
        "Belum ada batch pendapatan yang tersedia. Jalankan sync terlebih dahulu.",
    };
  }

  return {
    success: true,
    periodYear: Number(data.period_year),
    periodMonth: Number(data.period_month),
    source: "latest",
  };
}