type ValidationError = {
  sheet: string;
  row?: number;
  column?: string;
  message: string;
};

function isEmpty(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "";
}

export function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

const UNIT_ALIASES: Record<string, string> = {
  "KANTOR PELAYANAN MOJEKERTO": "KANTOR PELAYANAN MOJOKERTO",
  "KANTOR CABANG MOJOKERTO": "KANTOR PELAYANAN MOJOKERTO",
  MOJOKERTO: "KANTOR PELAYANAN MOJOKERTO",
  MOJEKERTO: "KANTOR PELAYANAN MOJOKERTO",
};

export function normalizeUnitName(value: unknown): string {
  const text = normalizeText(value).toUpperCase();

  return UNIT_ALIASES[text] ?? text;
}

export function normalizeParentUnit(value: unknown): string {
  const rawText = normalizeText(value).toUpperCase();

  if (!rawText) return "";

  const alias = UNIT_ALIASES[rawText];
  if (alias) return alias;

  if (rawText === "JAWA TIMUR") {
    return "KANTOR WILAYAH JAWA TIMUR";
  }

  if (rawText === "MOJOKERTO" || rawText === "MOJEKERTO") {
    return "KANTOR PELAYANAN MOJOKERTO";
  }

  if (rawText.startsWith("KANTOR")) {
    return UNIT_ALIASES[rawText] ?? rawText;
  }

  return UNIT_ALIASES[`KANTOR CABANG ${rawText}`] ?? `KANTOR CABANG ${rawText}`;
}

export function parseRupiah(
  value: unknown,
  errors: ValidationError[],
  context: { sheet: string; row: number; column: string }
): number {
  if (isEmpty(value)) return 0;

  const raw = String(value).trim();

  const cleaned = raw
    .replace(/Rp/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const result = Number(cleaned);

  if (Number.isNaN(result)) {
    errors.push({
      ...context,
      message: `Nilai rupiah tidak valid: ${raw}`,
    });

    return 0;
  }

  return result;
}

export function parseIndonesianCount(
  value: unknown,
  errors: ValidationError[],
  context: { sheet: string; row: number; column: string }
): number {
  if (isEmpty(value)) return 0;

  const raw = String(value).trim();

  if (raw === "0") return 0;

  if (raw.includes(",")) {
    const beforeComma = raw.split(",")[0];
    const result = Number(beforeComma.replace(/\./g, ""));

    if (Number.isNaN(result)) {
      errors.push({
        ...context,
        message: `Nilai jumlah tidak valid: ${raw}`,
      });

      return 0;
    }

    return result;
  }

  if (raw.includes(".")) {
    const parts = raw.split(".");

    if (parts.length === 2) {
      const [left, right] = parts;
      const paddedRight = right.padEnd(3, "0");
      const result = Number(`${left}${paddedRight}`);

      if (Number.isNaN(result)) {
        errors.push({
          ...context,
          message: `Nilai jumlah tidak valid: ${raw}`,
        });

        return 0;
      }

      return result;
    }

    const result = Number(parts.join(""));

    if (Number.isNaN(result)) {
      errors.push({
        ...context,
        message: `Nilai jumlah tidak valid: ${raw}`,
      });

      return 0;
    }

    return result;
  }

  const result = Number(raw);

  if (Number.isNaN(result)) {
    errors.push({
      ...context,
      message: `Nilai jumlah tidak valid: ${raw}`,
    });

    return 0;
  }

  return result;
}

export function parsePercent(
  value: unknown,
  errors: ValidationError[],
  context: { sheet: string; row: number; column: string }
): number {
  if (isEmpty(value)) return 0;

  const raw = String(value).trim();

  const cleaned = raw.replace("%", "").replace(/\s/g, "").replace(",", ".");

  const result = Number(cleaned);

  if (Number.isNaN(result)) {
    errors.push({
      ...context,
      message: `Nilai persentase tidak valid: ${raw}`,
    });

    return 0;
  }

  return result;
}

function isBlankRow(row: unknown[]) {
  return row.every((cell) => isEmpty(cell));
}

export function validateHeader(
  sheetName: string,
  rows: string[][],
  expectedHeader: string[],
  errors: ValidationError[]
) {
  const header = rows[0] || [];

  expectedHeader.forEach((expected, index) => {
    const actual = normalizeText(header[index]);

    if (actual !== expected) {
      errors.push({
        sheet: sheetName,
        row: 1,
        column: `Kolom ${index + 1}`,
        message: `Header tidak sesuai. Diharapkan "${expected}", terbaca "${actual}".`,
      });
    }
  });
}

export function parseSwdkllj(rows: string[][], errors: ValidationError[]) {
  const dataRows = rows.slice(1).filter((row) => !isBlankRow(row));

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const parentUnitName = normalizeParentUnit(row[0]);
    const unitName = normalizeUnitName(row[1]);

    if (!parentUnitName) {
      errors.push({
        sheet: "SWDKLLJ",
        row: rowNumber,
        column: "Kantor Cabang",
        message: "Kantor Cabang tidak boleh kosong.",
      });
    }

    if (!unitName) {
      errors.push({
        sheet: "SWDKLLJ",
        row: rowNumber,
        column: "Kantor",
        message: "Kantor tidak boleh kosong.",
      });
    }

    return {
      unit_name: unitName,
      parent_unit_name: parentUnitName,
      level: "DETAIL",
      kd: parseRupiah(row[2], errors, {
        sheet: "SWDKLLJ",
        row: rowNumber,
        column: "KD",
      }),
      sw: parseRupiah(row[3], errors, {
        sheet: "SWDKLLJ",
        row: rowNumber,
        column: "SW",
      }),
      denda: parseRupiah(row[4], errors, {
        sheet: "SWDKLLJ",
        row: rowNumber,
        column: "DENDA",
      }),
      setor_adjustment: parseRupiah(row[5], errors, {
        sheet: "SWDKLLJ",
        row: rowNumber,
        column: "(+/-) SETOR",
      }),
      total: parseRupiah(row[6], errors, {
        sheet: "SWDKLLJ",
        row: rowNumber,
        column: "TOTAL",
      }),
      transaction_count: parseIndonesianCount(row[7], errors, {
        sheet: "SWDKLLJ",
        row: rowNumber,
        column: "Jumlah Transaksi",
      }),
    };
  });
}

export function parseIwkbu(rows: string[][], errors: ValidationError[]) {
  const dataRows = rows.slice(1).filter((row) => !isBlankRow(row));

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const parentUnitName = normalizeParentUnit(row[0]);
    const unitName = normalizeUnitName(row[1]);

    if (!parentUnitName) {
      errors.push({
        sheet: "IWKBU",
        row: rowNumber,
        column: "Kantor Cabang",
        message: "Kantor Cabang tidak boleh kosong.",
      });
    }

    if (!unitName) {
      errors.push({
        sheet: "IWKBU",
        row: rowNumber,
        column: "Kantor",
        message: "Kantor tidak boleh kosong.",
      });
    }

    return {
      unit_name: unitName,
      parent_unit_name: parentUnitName,
      level: "DETAIL",
      ask_last_year: parseRupiah(row[2], errors, {
        sheet: "IWKBU",
        row: rowNumber,
        column: "ASK Tahun Lalu",
      }),
      iwkbu_last_year: parseRupiah(row[3], errors, {
        sheet: "IWKBU",
        row: rowNumber,
        column: "IWKBU Tahun Lalu",
      }),
      ask_current_year: parseRupiah(row[4], errors, {
        sheet: "IWKBU",
        row: rowNumber,
        column: "ASK Tahun Sekarang",
      }),
      iwkbu_current_year: parseRupiah(row[5], errors, {
        sheet: "IWKBU",
        row: rowNumber,
        column: "IWKBU Tahun Sekarang",
      }),
      ask_activity_pct: parsePercent(row[6], errors, {
        sheet: "IWKBU",
        row: rowNumber,
        column: "ASK Aktivitas %",
      }),
      iwkbu_activity_pct: parsePercent(row[7], errors, {
        sheet: "IWKBU",
        row: rowNumber,
        column: "IWKBU Aktivitas %",
      }),
    };
  });
}

export function parseIwklCabang(rows: string[][], errors: ValidationError[]) {
  const dataRows = rows.slice(1).filter((row) => !isBlankRow(row));

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const unitName = normalizeUnitName(row[0]);

    if (!unitName) {
      errors.push({
        sheet: "IWKL_Cabang",
        row: rowNumber,
        column: "Kantor",
        message: "Kantor tidak boleh kosong.",
      });
    }

    return {
      unit_name: unitName,
      passenger_count: parseIndonesianCount(row[1], errors, {
        sheet: "IWKL_Cabang",
        row: rowNumber,
        column: "Penumpang",
      }),
      nominal: parseRupiah(row[2], errors, {
        sheet: "IWKL_Cabang",
        row: rowNumber,
        column: "Nominal",
      }),
    };
  });
}

export function parseIwklJenis(rows: string[][], errors: ValidationError[]) {
  const dataRows = rows.slice(1).filter((row) => !isBlankRow(row));

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const detailType = normalizeUnitName(row[0]);

    if (!detailType) {
      errors.push({
        sheet: "IWKL_Jenis",
        row: rowNumber,
        column: "Jenis",
        message: "Jenis tidak boleh kosong.",
      });
    }

    return {
      detail_type: detailType,
      passenger_count: parseIndonesianCount(row[1], errors, {
        sheet: "IWKL_Jenis",
        row: rowNumber,
        column: "Penumpang",
      }),
      nominal: parseRupiah(row[2], errors, {
        sheet: "IWKL_Jenis",
        row: rowNumber,
        column: "Nominal",
      }),
    };
  });
}

export function sumBy<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((total, row) => total + selector(row), 0);
}
