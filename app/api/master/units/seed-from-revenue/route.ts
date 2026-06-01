import { NextResponse } from "next/server";
import { seedMasterUnitsFromRevenue, MasterUnitError } from "@/lib/master/units";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function toErrorResponse(error: unknown) {
  if (error instanceof MasterUnitError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: error.status }
    );
  }

  return NextResponse.json(
    {
      success: false,
      message: "Gagal generate Master Unit dari data pendapatan.",
      error: error instanceof Error ? error.message : String(error),
    },
    { status: 500 }
  );
}

export async function POST() {
  try {
    const supabase = createSupabaseAdminClient();
    const result = await seedMasterUnitsFromRevenue(supabase);

    return NextResponse.json({
      success: true,
      message: "Generate Master Unit dari data pendapatan selesai.",
      data: result,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
