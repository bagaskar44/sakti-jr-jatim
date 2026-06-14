export function formatRupiah(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (numberValue >= 1_000_000_000) {
    return `Rp ${(numberValue / 1_000_000_000).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} M`;
  }

  if (numberValue >= 1_000_000) {
    return `Rp ${(numberValue / 1_000_000).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Jt`;
  }

  return `Rp ${numberValue.toLocaleString("id-ID")}`;
}

export function formatNumber(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("id-ID");
}

export function formatPercent(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "-";

  return `${Number(value).toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}%`;
}

export function getMonthName(month: number) {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return months[month - 1] ?? "-";
}
