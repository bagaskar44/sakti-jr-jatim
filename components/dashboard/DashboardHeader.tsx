"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AppRole = "ADMIN_KANWIL" | "VIEWER" | "ADMIN_LOKET";

type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
  year: number;
  month: number | string;
  updatedAt?: string;
};

function getRoleLabel(role: AppRole | null) {
  if (role === "ADMIN_KANWIL") return "Admin Kanwil";
  if (role === "ADMIN_LOKET") return "Admin Loket";
  if (role === "VIEWER") return "Viewer";

  return "User";
}

export function DashboardHeader({
  title,
  subtitle = "Monitoring data operasional Jasa Raharja Jawa Timur",
}: DashboardHeaderProps) {
  const router = useRouter();

  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserProfile() {
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
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <header className="w-full px-5 pb-2 pt-9 lg:flex lg:items-start lg:justify-between lg:gap-5">
      <div className="min-w-0">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0b1020] lg:text-[34px]">
          {title}
        </h1>
        <p className="mt-1.5 text-[15px] leading-6 text-[#5b6b85] lg:text-base">
          {subtitle}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center lg:mt-0">
        <div className="flex min-h-[46px] items-center gap-3 rounded-[8px] border border-[#dce3ed] bg-white px-3 py-1.5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-blue-50 text-blue-700">
            <UserCircle2 size={18} />
          </div>

          <div className="min-w-0">
            <p className="max-w-[150px] truncate text-sm font-semibold text-slate-950">
              {fullName ?? userEmail ?? "User"}
            </p>
            <p className="text-xs font-medium text-slate-500">
              {getRoleLabel(role)}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="ml-1 rounded-[7px] p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>

        <button className="jr-button-primary min-h-[46px] px-4 py-2 shadow-none">
          <Download size={17} />
          Export Report
        </button>
      </div>
    </header>
  );
}
