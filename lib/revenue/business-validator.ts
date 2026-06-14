import { normalizeUnitName } from "@/lib/revenue/parser";

type Issue = {
  sheet: string;
  severity: "error" | "warning";
  row?: number;
  column?: string;
  message: string;
  context?: Record<string, unknown>;
};

type RevenueRow = Record<string, unknown>;

function numberValue(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isNaN(result) ? 0 : result;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function addWarning(
  issues: Issue[],
  sheet: string,
  message: string,
  context?: Record<string, unknown>
) {
  issues.push({
    sheet,
    severity: "warning",
    message,
    context,
  });
}

function checkDuplicateRows(
  rows: RevenueRow[],
  options: {
    sheet: string;
    keySelector: (row: RevenueRow) => string;
    label: string;
    warnings: Issue[];
  }
) {
  const counter = new Map<string, number>();

  for (const row of rows) {
    const key = options.keySelector(row);
    if (!key) continue;

    counter.set(key, (counter.get(key) ?? 0) + 1);
  }

  const duplicates = [...counter.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));

  if (duplicates.length > 0) {
    addWarning(
      options.warnings,
      options.sheet,
      `Ditemukan duplikasi ${options.label}. Cek apakah ini memang wajar atau data ter-copy dua kali.`,
      {
        duplicate_count: duplicates.length,
        duplicates: duplicates.slice(0, 20),
      }
    );
  }
}

function checkZeroRows(
  rows: RevenueRow[],
  options: {
    sheet: string;
    fields: string[];
    labelSelector: (row: RevenueRow) => string;
    warnings: Issue[];
  }
) {
  const zeroRows = rows.filter((row) =>
    options.fields.every((field) => numberValue(row[field]) === 0)
  );

  if (zeroRows.length > 0) {
    addWarning(
      options.warnings,
      options.sheet,
      `Ditemukan ${zeroRows.length} baris dengan semua nilai utama 0. Ini tidak selalu salah, tapi sebaiknya dicek apakah memang berasal dari export sistem.`,
      {
        examples: zeroRows.slice(0, 20).map(options.labelSelector),
      }
    );
  }
}

function sumRows(rows: RevenueRow[], field: string) {
  return rows.reduce((sum, row) => sum + numberValue(row[field]), 0);
}

function checkIwklCabangJenisTotal(options: {
  iwklCabang: RevenueRow[];
  iwklJenis: RevenueRow[];
  warnings: Issue[];
}) {
  const cabangTotal = sumRows(options.iwklCabang, "nominal");
  const jenisTotal = sumRows(options.iwklJenis, "nominal");
  const difference = jenisTotal - cabangTotal;

  if (Math.abs(difference) <= 1) return;

  addWarning(
    options.warnings,
    "IWKL_Jenis",
    "Total nominal IWKL Jenis berbeda dengan total nominal IWKL Cabang.",
    {
      iwkl_cabang_nominal: cabangTotal,
      iwkl_jenis_nominal: jenisTotal,
      difference,
      iwkl_cabang_nominal_formatted: formatNumber(cabangTotal),
      iwkl_jenis_nominal_formatted: formatNumber(jenisTotal),
      difference_formatted: formatNumber(difference),
    }
  );
}

export function validateRevenueBusinessRules(data: {
  swdkllj: RevenueRow[];
  iwkbu: RevenueRow[];
  iwklCabang: RevenueRow[];
  iwklJenis: RevenueRow[];
}) {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  checkDuplicateRows(data.swdkllj, {
    sheet: "SWDKLLJ",
    label: "kombinasi Kantor Cabang dan Kantor",
    warnings,
    keySelector: (row) =>
      `${normalizeUnitName(row.parent_unit_name)}|${normalizeUnitName(
        row.unit_name
      )}`,
  });

  checkDuplicateRows(data.iwkbu, {
    sheet: "IWKBU",
    label: "kombinasi Kantor Cabang dan Kantor",
    warnings,
    keySelector: (row) =>
      `${normalizeUnitName(row.parent_unit_name)}|${normalizeUnitName(
        row.unit_name
      )}`,
  });

  checkDuplicateRows(data.iwklCabang, {
    sheet: "IWKL_Cabang",
    label: "kantor cabang IWKL",
    warnings,
    keySelector: (row) => normalizeUnitName(row.unit_name),
  });

  checkDuplicateRows(data.iwklJenis, {
    sheet: "IWKL_Jenis",
    label: "jenis IWKL",
    warnings,
    keySelector: (row) => normalizeUnitName(row.detail_type),
  });

  checkZeroRows(data.swdkllj, {
    sheet: "SWDKLLJ",
    fields: ["kd", "sw", "denda", "setor_adjustment", "total"],
    warnings,
    labelSelector: (row) => `${row.parent_unit_name} - ${row.unit_name}`,
  });

  checkZeroRows(data.iwkbu, {
    sheet: "IWKBU",
    fields: [
      "ask_last_year",
      "iwkbu_last_year",
      "ask_current_year",
      "iwkbu_current_year",
    ],
    warnings,
    labelSelector: (row) => `${row.parent_unit_name} - ${row.unit_name}`,
  });

  checkZeroRows(data.iwklCabang, {
    sheet: "IWKL_Cabang",
    fields: ["passenger_count", "nominal"],
    warnings,
    labelSelector: (row) => String(row.unit_name ?? ""),
  });

  checkZeroRows(data.iwklJenis, {
    sheet: "IWKL_Jenis",
    fields: ["passenger_count", "nominal"],
    warnings,
    labelSelector: (row) => String(row.detail_type ?? ""),
  });

  checkIwklCabangJenisTotal({
    iwklCabang: data.iwklCabang,
    iwklJenis: data.iwklJenis,
    warnings,
  });

  return {
    businessErrors: errors,
    businessWarnings: warnings,
  };
}
