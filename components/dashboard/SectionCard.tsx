import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`jr-card p-4 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {action}
      </div>

      {children}
    </section>
  );
}
