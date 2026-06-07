export type ActivityFunctionLabel =
  | "Penerimaan"
  | "Pendapatan"
  | "Pelayanan"
  | "Kecelakaan";

const activityFunctionBadgeClasses: Record<ActivityFunctionLabel, string> = {
  Penerimaan: "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]",
  Pendapatan: "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]",
  Pelayanan: "border-[#fde68a] bg-[#fffbeb] text-[#b45309]",
  Kecelakaan: "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]",
};

export function getActivityFunctionBadgeClass(label: string) {
  return (
    activityFunctionBadgeClasses[label as ActivityFunctionLabel] ??
    "border-[#dce3ed] bg-[#f8fafc] text-slate-600"
  );
}
