import { google } from "googleapis";
import {
  parseIwkl,
  parseIwklDetail,
  parseIwkbu,
  parseIwkbuDetail,
  parseSwdkllj,
  parseSwdklljDetail,
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
  | "SWDKLLJ_Detail"
  | "IWKBU"
  | "IWKBU_Detail"
  | "IWKL"
  | "IWKL_Detail";

const SHEET_NAMES: SheetName[] = [
  "SWDKLLJ",
  "SWDKLLJ_Detail",
  "IWKBU",
  "IWKBU_Detail",
  "IWKL",
  "IWKL_Detail",
];

const SHEET_RANGES: Record<SheetName, string> = {
  SWDKLLJ: "SWDKLLJ!A:G",
  SWDKLLJ_Detail: "SWDKLLJ_Detail!A:H",
  IWKBU: "IWKBU!A:G",
  IWKBU_Detail: "IWKBU_Detail!A:H",
  IWKL: "IWKL!A:C",
  IWKL_Detail: "IWKL_Detail!A:D",
};

const EXPECTED_HEADERS: Record<SheetName, string[]> = {
  SWDKLLJ: [
    "Kantor",
    "KD",
    "SW",
    "DENDA",
    "(+/-) SETOR",
    "TOTAL",
    "Jumlah Transaksi",
  ],
  SWDKLLJ_Detail: [
    "Kantor Cabang",
    "Kantor",
    "KD",
    "SW",
    "DENDA",
    "(+/-) SETOR",
    "TOTAL",
    "Jumlah Transaksi",
  ],
  IWKBU: ["Kantor", "ASK", "IWKBU", "ASK", "IWKBU", "ASK", "IWKBU"],
  IWKBU_Detail: [
    "Kantor Cabang",
    "Kantor",
    "ASK",
    "IWKBU",
    "ASK",
    "IWKBU",
    "ASK",
    "IWKBU",
  ],
  IWKL: ["Kantor", "Penumpang", "Nominal"],
  IWKL_Detail: ["Kantor Cabang", "Jenis", "Penumpang", "Nominal"],
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

  const swdklljDetail = parseSwdklljDetail(
    sheetMap.get("SWDKLLJ_Detail") || [],
    technicalErrors
  );

  const iwkbu = parseIwkbu(
    sheetMap.get("IWKBU") || [],
    technicalErrors
  );

  const iwkbuDetail = parseIwkbuDetail(
    sheetMap.get("IWKBU_Detail") || [],
    technicalErrors
  );

  const iwkl = parseIwkl(
    sheetMap.get("IWKL") || [],
    technicalErrors
  );

  const iwklDetail = parseIwklDetail(
    sheetMap.get("IWKL_Detail") || [],
    technicalErrors
  );

  const revenueRows = {
    swdkllj,
    swdklljDetail,
    iwkbu,
    iwkbuDetail,
    iwkl,
    iwklDetail,
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
    swdkllj_detail: swdklljDetail.length,
    iwkbu: iwkbu.length,
    iwkbu_detail: iwkbuDetail.length,
    iwkl: iwkl.length,
    iwkl_detail: iwklDetail.length,
  };

  const totals = {
    swdkllj_total: sumBy(swdkllj, (row) => row.total),
    swdkllj_detail_total: sumBy(swdklljDetail, (row) => row.total),
    swdkllj_transaction_count: sumBy(
      swdkllj,
      (row) => row.transaction_count
    ),
    swdkllj_detail_transaction_count: sumBy(
      swdklljDetail,
      (row) => row.transaction_count
    ),
    iwkbu_current_year: sumBy(iwkbu, (row) => row.iwkbu_current_year),
    iwkbu_last_year: sumBy(iwkbu, (row) => row.iwkbu_last_year),
    iwkl_nominal: sumBy(iwkl, (row) => row.nominal),
    iwkl_passenger_count: sumBy(iwkl, (row) => row.passenger_count),
  };

  return {
    spreadsheetId,
    data: {
      swdkllj,
      swdklljDetail,
      iwkbu,
      iwkbuDetail,
      iwkl,
      iwklDetail,
    },
    errors,
    warnings,
    rowCounts,
    totals,
  };
}
