"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  Menu,
  UploadCloud,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AppShellProps = {
  children: ReactNode;
};

type AppRole = "ADMIN_KANWIL" | "VIEWER" | "ADMIN_LOKET";

const mainMenu = [
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Pendapatan",
    href: "/pendapatan",
    icon: WalletCards,
  },
  {
    label: "Pelayanan",
    href: "/pelayanan",
    icon: Users,
  },
  {
    label: "Kecelakaan",
    href: "/kecelakaan",
    icon: AlertCircle,
  },
  {
    label: "Kegiatan",
    href: "/kegiatan",
    icon: CalendarDays,
  },
];

const adminMenu = [
  {
    label: "Master Unit",
    href: "/admin/master-unit",
    icon: Building2,
  },
  {
    label: "Import Pendapatan",
    href: "/admin/import-pendapatan",
    icon: UploadCloud,
  },
  {
    label: "Import Pelayanan",
    href: "/admin/import-pelayanan",
    icon: UploadCloud,
  },
  {
    label: "Import Kecelakaan",
    href: "/admin/import-kecelakaan",
    icon: UploadCloud,
  },
  {
    label: "Import Kegiatan",
    href: "/admin/import-kegiatan",
    icon: UploadCloud,
  },
];

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 shrink-0">
        <Image
          src="/images/logo-jasa-raharja.png"
          alt="Logo Jasa Raharja"
          fill
          className="object-contain"
          priority
        />
      </div>

      <div className="min-w-0">
        <p className="whitespace-nowrap text-[18px] font-extrabold leading-none text-white">
          SAKTI JR Jatim
        </p>
        <p className="mt-1.5 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.04em] text-white/80">
          Jasa Raharja Jawa Timur
        </p>
      </div>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  return pathname.startsWith(href);
}

function SidebarContent({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: AppRole | null;
  onNavigate?: () => void;
}) {
  const canAccessAdmin = role === "ADMIN_KANWIL";

  return (
    <div className="flex h-full flex-col bg-[#050b18] text-white">
      <div className="px-5 pb-8 pt-9">
        <BrandLockup />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-5">
        <div className="mb-6">
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Dashboard
          </p>

          <nav className="space-y-1">
            {mainMenu.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`group flex items-center justify-between rounded-[8px] px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#1f4fea] text-white shadow-[0_10px_18px_rgba(30,64,175,0.22)]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} />
                    {item.label}
                  </span>

                  {active && <ChevronRight size={16} />}
                </Link>
              );
            })}
          </nav>
        </div>

        {canAccessAdmin && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Admin
            </p>

            <nav className="space-y-1">
              {adminMenu.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`group flex items-center justify-between rounded-[8px] px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-[#1f4fea] text-white shadow-[0_10px_18px_rgba(30,64,175,0.22)]"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} />
                      {item.label}
                    </span>

                    {active && <ChevronRight size={16} />}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    async function loadUserRole() {
      if (pathname === "/login") {
        setRole(null);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole((profile?.role as AppRole) ?? "VIEWER");
    }

    loadUserRole();
  }, [pathname]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="jr-page lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden min-h-screen lg:block">
        <div className="fixed inset-y-0 left-0 w-[280px]">
          <SidebarContent pathname={pathname} role={role} />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[linear-gradient(120deg,#050b18_0%,#081226_58%,#0d1f3e_100%)] px-4 py-3 text-white lg:hidden">
          <BrandLockup />
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-[8px] border border-white/20 bg-white/10 p-2 text-white shadow-sm"
          >
            <Menu size={22} />
          </button>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/60"
              onClick={() => setMobileOpen(false)}
            />

            <div className="absolute inset-y-0 left-0 w-[290px] shadow-2xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-[8px] bg-white/10 p-2 text-white"
              >
                <X size={20} />
              </button>

              <SidebarContent
                pathname={pathname}
                role={role}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
