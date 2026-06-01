import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  deactivateMasterUnit,
  getMasterUnit,
  MasterUnitError,
  updateMasterUnit,
} from "@/lib/master/units";

export const dynamic = "force-dynamic";

type UnitRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(_request: Request, context: UnitRouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const unit = await getMasterUnit(supabase, id);

    return NextResponse.json({
      success: true,
      data: unit,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: UnitRouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    const unit = await updateMasterUnit(supabase, id, body);

    return NextResponse.json({
      success: true,
      message: "Master unit berhasil diperbarui.",
      data: unit,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: UnitRouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const unit = await deactivateMasterUnit(supabase, id);

    return NextResponse.json({
      success: true,
      message: "Master unit dinonaktifkan.",
      data: unit,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
