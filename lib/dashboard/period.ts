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

export type RevenueMonthFilter = number | "ALL";

export type ResolvedPeriodFilter =
  | {
      success: true;
      periodYear: number;
      periodMonth: RevenueMonthFilter;
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

function isValidYear(year: number) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
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

export async function resolveRevenuePeriodFilter(
  supabase: SupabaseClient,
  request: Request
): Promise<ResolvedPeriodFilter> {
  const { searchParams } = new URL(request.url);

  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  if (yearParam || monthParam) {
    const periodYear = Number(yearParam);
    const normalizedMonth = monthParam?.trim().toUpperCase();

    if (!isValidYear(periodYear)) {
      return {
        success: false,
        message:
          "Parameter year tidak valid. Contoh: ?year=2026&month=5 atau ?year=2026&month=all",
      };
    }

    if (normalizedMonth === "ALL") {
      return {
        success: true,
        periodYear,
        periodMonth: "ALL",
        source: "query",
      };
    }

    const periodMonth = Number(monthParam);

    if (!isValidYearMonth(periodYear, periodMonth)) {
      return {
        success: false,
        message:
          "Parameter year dan month tidak valid. Contoh: ?year=2026&month=5 atau ?year=2026&month=all",
      };
    }

    return {
      success: true,
      periodYear,
      periodMonth,
      source: "query",
    };
  }

  const latest = await resolveRevenuePeriod(supabase, request);

  if (!latest.success) return latest;

  return latest;
}

export function getMonthsForFilter(
  year: number,
  month: RevenueMonthFilter,
  now = new Date()
) {
  if (month !== "ALL") return [month];

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const endMonth = year === currentYear ? currentMonth : 12;

  return Array.from({ length: endMonth }, (_, index) => index + 1);
}
