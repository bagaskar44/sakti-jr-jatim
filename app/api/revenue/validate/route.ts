import { NextResponse } from "next/server";
import { readRevenueSheets } from "@/lib/revenue/read-revenue-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { spreadsheetId, data, errors, warnings, rowCounts, totals } =
      await readRevenueSheets();
    const success = errors.length === 0;

    return NextResponse.json({
      success,
      message: success
        ? warnings.length === 0
          ? "Validasi berhasil. Data siap diproses ke tahap sync."
          : "Validasi berhasil, tetapi ada warning yang sebaiknya dicek sebelum sync."
        : "Validasi menemukan error. Perbaiki data sebelum sync.",
      spreadsheetId,
      rowCounts,
      totals,
      preview: {
        swdkllj: data.swdkllj.slice(0, 3),
        iwkbu: data.iwkbu.slice(0, 3),
        iwkl_cabang: data.iwklCabang.slice(0, 3),
        iwkl_jenis: data.iwklJenis.slice(0, 3),
      },
      errors,
      warnings,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal melakukan validasi data pendapatan.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
