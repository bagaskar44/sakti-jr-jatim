"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  UploadCloud,
  UserCircle2,
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
    label: "Dashboard Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Dashboard Pendapatan",
    href: "/pendapatan",
    icon: WalletCards,
  },
  {
    label: "Dashboard Pelayanan",
    href: "/pelayanan",
    icon: Users,
  },
  {
    label: "Dashboard Kecelakaan",
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
          sizes="35.2px"
          className="object-contain"
          priority
        />
      </div>

      <div className="min-w-0">
        <p className="whitespace-nowrap text-[14.4px] font-extrabold leading-none text-white">
          SAKTI JR Jatim
        </p>
        <p className="mt-1.5 whitespace-nowrap text-[7.2px] font-semibold uppercase tracking-[0.04em] text-white/80">
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

function getRoleLabel(role: AppRole | null) {
  if (role === "ADMIN_KANWIL") return "Admin Kanwil";
  if (role === "ADMIN_LOKET") return "Admin Loket";
  if (role === "VIEWER") return "Viewer";

  return "User";
}

function SidebarUserCard({
  role,
  fullName,
  userEmail,
  onLogout,
}: {
  role: AppRole | null;
  fullName: string | null;
  userEmail: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-white/[0.08] px-3 pb-4 pt-3">
      <div className="flex min-h-[52px] items-center gap-3 rounded-[6.4px] border border-white/[0.08] bg-white/[0.06] px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5.6px] bg-[#1f4fea]/15 text-[#8fb0ff] ring-1 ring-[#1f4fea]/25">
          <UserCircle2 size={14.4} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {fullName ?? userEmail ?? "User"}
          </p>
          <p className="truncate text-xs font-medium text-slate-400">
            {getRoleLabel(role)}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 rounded-[5.6px] p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-red-200"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={12.8} />
        </button>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  role,
  fullName,
  userEmail,
  onLogout,
  onNavigate,
}: {
  pathname: string;
  role: AppRole | null;
  fullName: string | null;
  userEmail: string | null;
  onLogout: () => void;
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
          <p className="mb-2 px-3 text-[8.8px] font-bold uppercase tracking-[0.18em] text-slate-500">
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
                  className={`group flex items-center justify-between rounded-[6.4px] px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#1f4fea] text-white shadow-[0_8px_14.4px_rgba(30,64,175,0.22)]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={14.4} />
                    {item.label}
                  </span>

                  {active && <ChevronRight size={12.8} />}
                </Link>
              );
            })}
          </nav>
        </div>

        {canAccessAdmin && (
          <div>
            <p className="mb-2 px-3 text-[8.8px] font-bold uppercase tracking-[0.18em] text-slate-500">
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
                    className={`group flex items-center justify-between rounded-[6.4px] px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-[#1f4fea] text-white shadow-[0_8px_14.4px_rgba(30,64,175,0.22)]"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={14.4} />
                      {item.label}
                    </span>

                    {active && <ChevronRight size={12.8} />}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      <SidebarUserCard
        role={role}
        fullName={fullName}
        userEmail={userEmail}
        onLogout={onLogout}
      />
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserProfile() {
      if (pathname === "/login") {
        setRole(null);
        setFullName(null);
        setUserEmail(null);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setFullName(null);
        setUserEmail(null);
        return;
      }

      setUserEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      setRole((profile?.role as AppRole) ?? "VIEWER");
      setFullName(profile?.full_name ?? user.email ?? null);
    }

    loadUserProfile();
  }, [pathname]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();

    setMobileOpen(false);
    setRole(null);
    setFullName(null);
    setUserEmail(null);
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="jr-page lg:grid lg:grid-cols-[224px_1fr]">
      <aside className="hidden min-h-screen lg:block">
        <div className="fixed inset-y-0 left-0 w-[224px]">
          <SidebarContent
            pathname={pathname}
            role={role}
            fullName={fullName}
            userEmail={userEmail}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[linear-gradient(120deg,#050b18_0%,#081226_58%,#0d1f3e_100%)] px-4 py-3 text-white lg:hidden">
          <BrandLockup />
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-[6.4px] border border-white/20 bg-white/10 p-2 text-white shadow-sm"
          >
            <Menu size={17.6} />
          </button>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/60"
              onClick={() => setMobileOpen(false)}
            />

            <div className="absolute inset-y-0 left-0 w-[232px] shadow-2xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-[6.4px] bg-white/10 p-2 text-white"
              >
                <X size={16} />
              </button>

              <SidebarContent
                pathname={pathname}
                role={role}
                fullName={fullName}
                userEmail={userEmail}
                onLogout={handleLogout}
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
