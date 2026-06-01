import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createMasterUnit,
  listMasterUnits,
  MasterUnitError,
} from "@/lib/master/units";

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
      message: "Gagal memproses Master Unit.",
      error: error instanceof Error ? error.message : String(error),
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const units = await listMasterUnits(supabase, {
      q: searchParams.get("q"),
      unitType: searchParams.get("unit_type"),
      status: searchParams.get("status") ?? "active",
    });

    return NextResponse.json({
      success: true,
      count: units.length,
      data: units,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    const unit = await createMasterUnit(supabase, body);

    return NextResponse.json(
      {
        success: true,
        message: "Master unit berhasil dibuat.",
        data: unit,
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
