"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Lock, Mail } from "lucide-react";
import { loginAction } from "@/app/(auth)/actions";

export function AuthLoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: null });

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-[0.24em] text-white/40" htmlFor="email">
          Email
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <Mail size={18} className="text-white/35" />
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="maestro@gelatomiracoli.com"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-[0.24em] text-white/40" htmlFor="password">
          Password
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <Lock size={18} className="text-white/35" />
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[#00E5FF] px-5 py-3 text-sm font-semibold text-[#031118] shadow-[0_0_30px_rgba(0,229,255,0.25)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Unlocking..." : "Log In"}
      </button>

      <div className="flex items-center justify-between gap-3 text-sm text-white/45">
        <Link href="/signup" className="transition hover:text-white/80">
          Create Account
        </Link>
        <Link href="/login" className="transition hover:text-white/80">
          Forgot Password
        </Link>
      </div>
    </form>
  );
}
