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

function addError(
  issues: Issue[],
  sheet: string,
  message: string,
  context?: Record<string, unknown>
) {
  issues.push({
    sheet,
    severity: "error",
    message,
    context,
  });
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

function buildSummaryMap(
  rows: RevenueRow[],
  keySelector: (row: RevenueRow) => string
) {
  const map = new Map<string, RevenueRow>();

  for (const row of rows) {
    const key = keySelector(row);
    if (!key) continue;

    map.set(key, row);
  }

  return map;
}

function groupDetailRows(
  rows: RevenueRow[],
  options: {
    keySelector: (row: RevenueRow) => string;
    fields: string[];
  }
) {
  const map = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const key = options.keySelector(row);
    if (!key) continue;

    const current = map.get(key) ?? {};

    for (const field of options.fields) {
      current[field] = numberValue(current[field]) + numberValue(row[field]);
    }

    map.set(key, current);
  }

  return map;
}

function compareSubtotalWithSummary(options: {
  sheet: string;
  summaryRows: RevenueRow[];
  detailRows: RevenueRow[];
  summaryKeySelector: (row: RevenueRow) => string;
  detailKeySelector: (row: RevenueRow) => string;
  fields: {
    field: string;
    label: string;
    tolerance?: number;
  }[];
  errors: Issue[];
  warnings: Issue[];
}) {
  const summaryMap = buildSummaryMap(
    options.summaryRows,
    options.summaryKeySelector
  );

  const detailGroups = groupDetailRows(options.detailRows, {
    keySelector: options.detailKeySelector,
    fields: options.fields.map((field) => field.field),
  });

  for (const [parentName, detailTotals] of detailGroups.entries()) {
    const summary = summaryMap.get(parentName);

    if (!summary) {
      addError(
        options.errors,
        options.sheet,
        `Parent detail "${parentName}" tidak ditemukan di sheet summary.`,
        {
          parent_name: parentName,
        }
      );

      continue;
    }

    for (const field of options.fields) {
      const summaryValue = numberValue(summary[field.field]);
      const detailValue = numberValue(detailTotals[field.field]);
      const diff = detailValue - summaryValue;
      const tolerance = field.tolerance ?? 1;

      if (Math.abs(diff) > tolerance) {
        addWarning(
          options.warnings,
          options.sheet,
          `Subtotal detail untuk "${parentName}" berbeda dengan nilai summary pada ${field.label}.`,
          {
            parent_name: parentName,
            field: field.field,
            summary_value: summaryValue,
            detail_value: detailValue,
            difference: diff,
            summary_value_formatted: formatNumber(summaryValue),
            detail_value_formatted: formatNumber(detailValue),
            difference_formatted: formatNumber(diff),
          }
        );
      }
    }
  }
}

function getIwkbuSummaryParentName(row: RevenueRow): string {
  const unitName = normalizeUnitName(row.unit_name);

  if (unitName === "LOKET KANTOR WILAYAH JAWA TIMUR") {
    return "KANTOR WILAYAH JAWA TIMUR";
  }

  if (unitName.startsWith("LOKET KANTOR CABANG ")) {
    return unitName.replace("LOKET ", "");
  }

  return unitName;
}

export function validateRevenueBusinessRules(data: {
  swdkllj: RevenueRow[];
  swdklljDetail: RevenueRow[];
  iwkbu: RevenueRow[];
  iwkbuDetail: RevenueRow[];
  iwkl: RevenueRow[];
  iwklDetail: RevenueRow[];
}) {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  checkDuplicateRows(data.swdkllj, {
    sheet: "SWDKLLJ",
    label: "kantor di summary SWDKLLJ",
    warnings,
    keySelector: (row) => normalizeUnitName(row.unit_name),
  });

  checkDuplicateRows(data.swdklljDetail, {
    sheet: "SWDKLLJ_Detail",
    label: "kombinasi Kantor Cabang dan Kantor",
    warnings,
    keySelector: (row) =>
      `${normalizeUnitName(row.parent_unit_name)}|${normalizeUnitName(
        row.unit_name
      )}`,
  });

  checkDuplicateRows(data.iwkbu, {
    sheet: "IWKBU",
    label: "kantor di summary IWKBU",
    warnings,
    keySelector: (row) => normalizeUnitName(row.unit_name),
  });

  checkDuplicateRows(data.iwkbuDetail, {
    sheet: "IWKBU_Detail",
    label: "kombinasi Kantor Cabang dan Kantor",
    warnings,
    keySelector: (row) =>
      `${normalizeUnitName(row.parent_unit_name)}|${normalizeUnitName(
        row.unit_name
      )}`,
  });

  checkDuplicateRows(data.iwkl, {
    sheet: "IWKL",
    label: "kantor di summary IWKL",
    warnings,
    keySelector: (row) => normalizeUnitName(row.unit_name),
  });

  checkDuplicateRows(data.iwklDetail, {
    sheet: "IWKL_Detail",
    label: "kombinasi Kantor Cabang dan Jenis",
    warnings,
    keySelector: (row) =>
      `${normalizeUnitName(row.parent_unit_name)}|${normalizeUnitName(
        row.detail_type
      )}`,
  });

  compareSubtotalWithSummary({
    sheet: "SWDKLLJ_Detail",
    summaryRows: data.swdkllj.filter(
      (row) => row.level === "CABANG_SUMMARY"
    ),
    detailRows: data.swdklljDetail,
    summaryKeySelector: (row) => normalizeUnitName(row.unit_name),
    detailKeySelector: (row) => normalizeUnitName(row.parent_unit_name),
    fields: [
      { field: "kd", label: "KD" },
      { field: "sw", label: "SW" },
      { field: "denda", label: "DENDA" },
      { field: "setor_adjustment", label: "(+/-) SETOR" },
      { field: "total", label: "TOTAL" },
      { field: "transaction_count", label: "Jumlah Transaksi" },
    ],
    errors,
    warnings,
  });

  compareSubtotalWithSummary({
    sheet: "IWKBU_Detail",
    summaryRows: data.iwkbu,
    detailRows: data.iwkbuDetail,
    summaryKeySelector: getIwkbuSummaryParentName,
    detailKeySelector: (row) => normalizeUnitName(row.parent_unit_name),
    fields: [
      { field: "ask_last_year", label: "ASK Tahun Lalu" },
      { field: "iwkbu_last_year", label: "IWKBU Tahun Lalu" },
      { field: "ask_current_year", label: "ASK Tahun Sekarang" },
      { field: "iwkbu_current_year", label: "IWKBU Tahun Sekarang" },
    ],
    errors,
    warnings,
  });

  checkZeroRows(data.iwkbuDetail, {
    sheet: "IWKBU_Detail",
    fields: [
      "ask_last_year",
      "iwkbu_last_year",
      "ask_current_year",
      "iwkbu_current_year",
    ],
    warnings,
    labelSelector: (row) => `${row.parent_unit_name} - ${row.unit_name}`,
  });

  checkZeroRows(data.iwklDetail, {
    sheet: "IWKL_Detail",
    fields: ["passenger_count", "nominal"],
    warnings,
    labelSelector: (row) => `${row.parent_unit_name} - ${row.detail_type}`,
  });

  return {
    businessErrors: errors,
    businessWarnings: warnings,
  };
}