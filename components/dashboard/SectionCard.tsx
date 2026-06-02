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
      <div className="mb-3 flex min-h-7 flex-wrap items-center justify-between gap-2">
        <h2 className="min-w-0 text-base font-semibold text-slate-950">
          {title}
        </h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children}
    </section>
  );
}
