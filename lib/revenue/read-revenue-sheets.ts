import { google } from "googleapis";
import {
  parseIwklCabang,
  parseIwklJenis,
  parseIwkbu,
  parseSwdkllj,
  sumBy,
  validateHeader,
} from "@/lib/revenue/parser";
import { validateRevenueBusinessRules } from "@/lib/revenue/business-validator";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveRevenueRowsWithMasterUnits } from "@/lib/master/units";

export type ValidationIssue = {
  sheet: string;
  severity?: "error" | "warning";
  row?: number;
  column?: string;
  message: string;
  context?: Record<string, unknown>;
};

type SheetName =
  | "SWDKLLJ"
  | "IWKBU"
  | "IWKL_Cabang"
  | "IWKL_Jenis";

const SHEET_NAMES: SheetName[] = [
  "SWDKLLJ",
  "IWKBU",
  "IWKL_Cabang",
  "IWKL_Jenis",
];

const SHEET_RANGES: Record<SheetName, string> = {
  SWDKLLJ: "SWDKLLJ!A:H",
  IWKBU: "IWKBU!A:H",
  IWKL_Cabang: "IWKL_Cabang!A:C",
  IWKL_Jenis: "IWKL_Jenis!A:C",
};

const EXPECTED_HEADERS: Record<SheetName, string[]> = {
  SWDKLLJ: [
    "Kantor Cabang",
    "Kantor",
    "KD",
    "SW",
    "DENDA",
    "(+/-) SETOR",
    "TOTAL",
    "Jumlah Transaksi",
  ],
  IWKBU: [
    "Kantor Cabang",
    "Kantor",
    "ASK",
    "IWKBU",
    "ASK",
    "IWKBU",
    "ASK",
    "IWKBU",
  ],
  IWKL_Cabang: ["Kantor", "Penumpang", "Nominal"],
  IWKL_Jenis: ["Jenis", "Penumpang", "Nominal"],
};

export async function readRevenueSheets() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error(
      "GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, atau GOOGLE_SHEET_ID belum lengkap."
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

  const ranges = SHEET_NAMES.map((sheetName) => SHEET_RANGES[sheetName]);

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });

  const sheetMap = new Map<SheetName, string[][]>();

  response.data.valueRanges?.forEach((valueRange, index) => {
    const sheetName = SHEET_NAMES[index];
    sheetMap.set(sheetName, (valueRange.values || []) as string[][]);
  });

  const technicalErrors: ValidationIssue[] = [];

  for (const sheetName of SHEET_NAMES) {
    const rows = sheetMap.get(sheetName) || [];

    validateHeader(
      sheetName,
      rows,
      EXPECTED_HEADERS[sheetName],
      technicalErrors
    );
  }

  const swdkllj = parseSwdkllj(
    sheetMap.get("SWDKLLJ") || [],
    technicalErrors
  );

  const iwkbu = parseIwkbu(
    sheetMap.get("IWKBU") || [],
    technicalErrors
  );

  const iwklCabang = parseIwklCabang(
    sheetMap.get("IWKL_Cabang") || [],
    technicalErrors
  );

  const iwklJenis = parseIwklJenis(
    sheetMap.get("IWKL_Jenis") || [],
    technicalErrors
  );

  const revenueRows = {
    swdkllj,
    iwkbu,
    iwklCabang,
    iwklJenis,
  };

  let masterUnitWarnings: ValidationIssue[] = [];

  try {
    const supabase = createSupabaseAdminClient();
    masterUnitWarnings = await resolveRevenueRowsWithMasterUnits(
      supabase,
      revenueRows
    );
  } catch (error) {
    masterUnitWarnings = [
      {
        sheet: "MASTER_UNIT",
        severity: "warning",
        message:
          "Master Unit belum bisa dibaca. Sync tetap dapat dilanjutkan tanpa normalisasi alias database.",
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
    ];
  }

  const { businessErrors, businessWarnings } =
    validateRevenueBusinessRules(revenueRows);

  const errors: ValidationIssue[] = [
    ...technicalErrors.map((error) => ({
      ...error,
      severity: "error" as const,
    })),
    ...businessErrors,
  ];

  const warnings: ValidationIssue[] = [
    ...masterUnitWarnings,
    ...businessWarnings,
  ];

  const rowCounts = {
    swdkllj: swdkllj.length,
    iwkbu: iwkbu.length,
    iwkl_cabang: iwklCabang.length,
    iwkl_jenis: iwklJenis.length,
  };

  const totals = {
    swdkllj_total: sumBy(swdkllj, (row) => row.total),
    swdkllj_transaction_count: sumBy(
      swdkllj,
      (row) => row.transaction_count
    ),
    iwkbu_current_year: sumBy(iwkbu, (row) => row.iwkbu_current_year),
    iwkbu_last_year: sumBy(iwkbu, (row) => row.iwkbu_last_year),
    iwkl_nominal: sumBy(iwklCabang, (row) => row.nominal),
    iwkl_passenger_count: sumBy(
      iwklCabang,
      (row) => row.passenger_count
    ),
    iwkl_cabang_nominal: sumBy(iwklCabang, (row) => row.nominal),
    iwkl_cabang_passenger_count: sumBy(
      iwklCabang,
      (row) => row.passenger_count
    ),
    iwkl_jenis_nominal: sumBy(iwklJenis, (row) => row.nominal),
    iwkl_jenis_passenger_count: sumBy(
      iwklJenis,
      (row) => row.passenger_count
    ),
  };

  return {
    spreadsheetId,
    data: {
      swdkllj,
      iwkbu,
      iwklCabang,
      iwklJenis,
    },
    errors,
    warnings,
    rowCounts,
    totals,
  };
}
