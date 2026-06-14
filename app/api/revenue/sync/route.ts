import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readRevenueSheets } from "@/lib/revenue/read-revenue-sheets";

export const dynamic = "force-dynamic";

type SyncRequestBody = {
  period_year?: unknown;
  period_month?: unknown;
};

function parsePeriod(body: SyncRequestBody):
  | { periodYear: number; periodMonth: number }
  | null {
  const periodYear = Number(body.period_year);
  const periodMonth = Number(body.period_month);

  const isValid =
    Number.isInteger(periodYear) &&
    periodYear >= 2000 &&
    periodYear <= 2100 &&
    Number.isInteger(periodMonth) &&
    periodMonth >= 1 &&
    periodMonth <= 12;

  if (!isValid) return null;

  return {
    periodYear,
    periodMonth,
  };
}

function toPeriodDate(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export async function POST(request: Request) {
  let periodYearForLog: number | null = null;
  let periodMonthForLog: number | null = null;

  try {
    const body = (await request.json()) as SyncRequestBody;
    const period = parsePeriod(body);

    if (!period) {
      return NextResponse.json(
        {
          success: false,
          message:
            "period_year dan period_month wajib valid. Contoh: period_year=2026, period_month=5.",
        },
        { status: 400 }
      );
    }

    const { periodYear, periodMonth } = period;

    periodYearForLog = periodYear;
    periodMonthForLog = periodMonth;

    const supabase = createSupabaseAdminClient();

    const {
      spreadsheetId,
      data,
      errors,
      warnings,
      rowCounts,
      totals,
    } = await readRevenueSheets();

    if (errors.length > 0) {
      await supabase.from("revenue_sync_logs").insert({
        period_year: periodYear,
        period_month: periodMonth,
        spreadsheet_id: spreadsheetId,
        status: "failed_validation",
        message: "Sync dibatalkan karena validasi menemukan error.",
        technical_error_count: errors.length,
        business_warning_count: warnings.length,
        row_counts: rowCounts,
        totals,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Sync dibatalkan karena validasi menemukan error.",
          errors,
          warnings,
          rowCounts,
          totals,
        },
        { status: 400 }
      );
    }

    const periodDate = toPeriodDate(periodYear, periodMonth);

    const { error: deleteBatchError } = await supabase
      .from("revenue_import_batches")
      .delete()
      .eq("module", "pendapatan")
      .eq("period_year", periodYear)
      .eq("period_month", periodMonth);

    if (deleteBatchError) {
      throw new Error(
        `Gagal menghapus batch lama: ${deleteBatchError.message}`
      );
    }

    const { data: batch, error: insertBatchError } = await supabase
      .from("revenue_import_batches")
      .insert({
        module: "pendapatan",
        period_year: periodYear,
        period_month: periodMonth,
        period_date: periodDate,
        spreadsheet_id: spreadsheetId,
        status: "processed",
      })
      .select()
      .single();

    if (insertBatchError || !batch) {
      throw new Error(
        `Gagal membuat batch baru: ${
          insertBatchError?.message ?? "Batch tidak dikembalikan."
        }`
      );
    }

    const batchId = batch.id as string;

    const swdklljRows = data.swdkllj.map((row) => ({
      batch_id: batchId,
      unit_name: row.unit_name,
      parent_unit_name: row.parent_unit_name,
      level: row.level,
      kd: row.kd,
      sw: row.sw,
      denda: row.denda,
      setor_adjustment: row.setor_adjustment,
      total: row.total,
      transaction_count: row.transaction_count,
    }));

    const iwkbuRows = data.iwkbu.map((row) => ({
      batch_id: batchId,
      unit_name: row.unit_name,
      parent_unit_name: row.parent_unit_name,
      level: row.level,
      ask_last_year: row.ask_last_year,
      iwkbu_last_year: row.iwkbu_last_year,
      ask_current_year: row.ask_current_year,
      iwkbu_current_year: row.iwkbu_current_year,
      ask_activity_pct: row.ask_activity_pct,
      iwkbu_activity_pct: row.iwkbu_activity_pct,
    }));

    const iwklCabangRows = data.iwklCabang.map((row) => ({
      batch_id: batchId,
      unit_name: row.unit_name,
      passenger_count: row.passenger_count,
      nominal: row.nominal,
    }));

    const iwklJenisRows = data.iwklJenis.map((row) => ({
      batch_id: batchId,
      detail_type: row.detail_type,
      passenger_count: row.passenger_count,
      nominal: row.nominal,
    }));

    const { error: swdklljError } = await supabase
      .from("revenue_swdkllj")
      .insert(swdklljRows);

    if (swdklljError) {
      throw new Error(`Gagal insert SWDKLLJ: ${swdklljError.message}`);
    }

    const { error: iwkbuError } = await supabase
      .from("revenue_iwkbu")
      .insert(iwkbuRows);

    if (iwkbuError) {
      throw new Error(`Gagal insert IWKBU: ${iwkbuError.message}`);
    }

    const { error: iwklCabangError } = await supabase
      .from("revenue_iwkl_cabang")
      .insert(iwklCabangRows);

    if (iwklCabangError) {
      throw new Error(`Gagal insert IWKL Cabang: ${iwklCabangError.message}`);
    }

    const { error: iwklJenisError } = await supabase
      .from("revenue_iwkl_jenis")
      .insert(iwklJenisRows);

    if (iwklJenisError) {
      throw new Error(`Gagal insert IWKL Jenis: ${iwklJenisError.message}`);
    }

    await supabase.from("revenue_sync_logs").insert({
      batch_id: batchId,
      period_year: periodYear,
      period_month: periodMonth,
      spreadsheet_id: spreadsheetId,
      status: "success",
      message: "Sync pendapatan berhasil.",
      technical_error_count: errors.length,
      business_warning_count: warnings.length,
      row_counts: rowCounts,
      totals,
    });

    return NextResponse.json({
      success: true,
      message: "Sync pendapatan berhasil.",
      batch_id: batchId,
      period_year: periodYear,
      period_month: periodMonth,
      rowCounts,
      totals,
      warnings,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    try {
      const supabase = createSupabaseAdminClient();

      if (periodYearForLog !== null && periodMonthForLog !== null) {
        await supabase.from("revenue_sync_logs").insert({
          period_year: periodYearForLog,
          period_month: periodMonthForLog,
          spreadsheet_id: process.env.GOOGLE_SHEET_ID,
          status: "failed_runtime",
          message: errorMessage,
        });
      }
    } catch {
      // Jangan lempar error baru dari proses logging.
    }

    return NextResponse.json(
      {
        success: false,
        message: "Sync pendapatan gagal.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
