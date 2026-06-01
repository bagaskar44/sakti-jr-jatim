"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext) return "/";

  try {
    const parsedUrl = new URL(rawNext, window.location.origin);

    if (parsedUrl.origin !== window.location.origin) {
      return "/";
    }

    if (!parsedUrl.pathname.startsWith("/") || rawNext.startsWith("//")) {
      return "/";
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return "/";
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextUrl] = useState(() => {
    if (typeof window === "undefined") return "/";

    const params = new URLSearchParams(window.location.search);
    return getSafeNextPath(params.get("next"));
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function getLoginErrorMessage(errorMessage: string) {
    const normalizedMessage = errorMessage.toLowerCase();

    if (normalizedMessage.includes("email not confirmed")) {
      return "Email belum dikonfirmasi di Supabase Auth.";
    }

    if (normalizedMessage.includes("invalid login credentials")) {
      return "Email atau password tidak cocok dengan Supabase Auth.";
    }

    if (normalizedMessage.includes("too many requests")) {
      return "Terlalu banyak percobaan login. Tunggu sebentar lalu coba lagi.";
    }

    return `Login gagal: ${errorMessage}`;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage("");

    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(getLoginErrorMessage(error.message));
      return;
    }

    router.push(nextUrl);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[var(--jr-background)] text-slate-950 lg:grid lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="relative min-h-[300px] overflow-hidden bg-[linear-gradient(120deg,#050b18_0%,#081226_58%,#0d1f3e_100%)] px-6 py-7 text-white sm:min-h-[360px] sm:px-10 lg:min-h-screen lg:px-[60px] lg:py-[60px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[20%] top-[22%] h-[620px] w-[980px] rounded-[50%] border-[3px] border-white/8 sm:-left-[10%] sm:h-[720px] sm:w-[1120px] lg:-left-[9%] lg:top-[23%] lg:h-[760px] lg:w-[1260px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[10%] top-[58%] h-[480px] w-[760px] rounded-[50%] border-[3px] border-white/8 sm:h-[560px] sm:w-[920px] lg:left-[11%] lg:top-[54%] lg:h-[690px] lg:w-[1080px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[24%] top-[92%] h-[320px] w-[560px] rounded-[50%] border-[3px] border-white/8 lg:left-[24%] lg:top-[86%] lg:h-[420px] lg:w-[700px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[12%] -top-[20%] h-[390px] w-[390px] rounded-full border-[76px] border-[#1f4fea]/15 lg:-right-[8%] lg:-top-[17%] lg:h-[470px] lg:w-[470px]"
        />

        <div className="relative z-10 flex min-h-[246px] flex-col sm:min-h-[306px] lg:min-h-[calc(100vh-120px)]">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 shrink-0">
              <Image
                src="/images/logo-jasa-raharja.png"
                alt="Logo Jasa Raharja"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div>
              <p className="text-xl font-extrabold leading-none text-white sm:text-[22px]">
                SAKTI JR Jatim
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase text-slate-300">
                Jasa Raharja Jawa Timur
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-end pb-3 lg:items-center lg:pb-20">
            <div>
              <h1 className="max-w-[1000px] text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-[36px] xl:text-[38px]">
                Sistem Analitik dan Kendali Terpadu Informasi
              </h1>
              <p className="mt-2 max-w-[760px] text-base font-semibold leading-tight text-slate-300 sm:text-xl lg:text-[24px]">
                Jasa Raharja Kantor Wilayah Jawa Timur
              </p>
            </div>
          </div>

          <p className="hidden text-xs font-semibold text-slate-500 lg:block">
            Copyright 2026 Jasa Raharja Jawa Timur
          </p>
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-300px)] items-start justify-center border-[#dce3ed] bg-[#f8fafc] px-6 py-12 sm:min-h-[calc(100vh-360px)] lg:min-h-screen lg:items-center lg:border-l lg:px-12 lg:py-12">
        <div className="w-full max-w-[380px]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#1f4fea]">
              Selamat Datang
            </p>
            <h2 className="mt-3 text-[28px] font-extrabold leading-tight text-slate-950">
              Masuk ke Akun Anda
            </h2>
            <div className="mt-3 h-[2px] w-9 rounded-full bg-[#1f4fea]" />
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Gunakan kredensial Anda untuk mengakses dashboard SAKTI JR Jatim.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-[18px]">
            {errorMessage && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-[0.08em] text-slate-700"
              >
                Username
              </label>
              <div className="mt-2 flex h-[46px] items-center gap-3 rounded-[7px] border border-[var(--jr-border)] bg-white px-4 shadow-[0_2px_6px_rgba(15,23,42,0.1)] transition focus-within:border-[var(--jr-blue)] focus-within:ring-2 focus-within:ring-[rgba(31,79,234,0.12)]">
                <User size={17} className="shrink-0 text-[#8aa0bf]" />
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-[0.08em] text-slate-700"
              >
                Kata Sandi
              </label>
              <div className="mt-2 flex h-[46px] items-center gap-3 rounded-[7px] border border-[var(--jr-border)] bg-white px-4 shadow-[0_2px_6px_rgba(15,23,42,0.1)] transition focus-within:border-[var(--jr-blue)] focus-within:ring-2 focus-within:ring-[rgba(31,79,234,0.12)]">
                <Lock size={17} className="shrink-0 text-[#8aa0bf]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  required
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  title={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="shrink-0 text-[#8aa0bf] transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
              <label className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-3.5 w-3.5 shrink-0 rounded-[2px] border-slate-400 text-[#1f4fea] focus:ring-[#1f4fea]"
                />
                <span>Ingat saya</span>
              </label>

              <button
                type="button"
                className="shrink-0 font-medium text-[#1f4fea] transition hover:text-[#1746dd]"
              >
                Lupa kata sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="jr-button-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <>
                  Masuk
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-xs font-medium text-slate-400">
            Credential prototype: admin / admin123.
          </p>
        </div>
      </section>
    </main>
  );
}
