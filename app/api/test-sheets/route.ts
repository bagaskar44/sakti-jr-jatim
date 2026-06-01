import { google } from "googleapis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return NextResponse.json(
        {
          success: false,
          message: "Environment variable belum lengkap.",
          required: [
            "GOOGLE_CLIENT_EMAIL",
            "GOOGLE_PRIVATE_KEY",
            "GOOGLE_SHEET_ID",
          ],
        },
        { status: 500 }
      );
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const ranges = [
      "SWDKLLJ!A:G",
      "SWDKLLJ_Detail!A:H",
      "IWKBU!A:G",
      "IWKBU_Detail!A:H",
      "IWKL!A:C",
      "IWKL_Detail!A:D",
    ];

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    const result = response.data.valueRanges?.map((sheet) => {
      const rows = sheet.values || [];

      return {
        range: sheet.range,
        rowCount: rows.length,
        preview: rows.slice(0, 3),
      };
    });

    return NextResponse.json({
      success: true,
      spreadsheetId,
      sheets: result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal membaca Google Sheets.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
