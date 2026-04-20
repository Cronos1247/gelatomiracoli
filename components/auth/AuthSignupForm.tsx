"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { ReactNode } from "react";
import { BriefcaseBusiness, Lock, Mail, User } from "lucide-react";
import { signupAction, type SignupState } from "@/app/(auth)/actions";

const initialState: SignupState = {
  error: null,
  success: false,
  nextPath: null,
  message: null,
};

function Field({
  id,
  name,
  type,
  label,
  placeholder,
  icon,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  icon: ReactNode;
}) {
  return (
    <label className="block space-y-3" htmlFor={id}>
      <span className="text-[11px] uppercase tracking-[0.24em] text-white/38">{label}</span>
      <div className="flex items-center gap-3 border-b border-white/12 px-1 pb-3 transition focus-within:border-[#00E5FF]">
        <span className="text-white/32">{icon}</span>
        <input
          id={id}
          name={name}
          type={type}
          required
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28"
        />
      </div>
    </label>
  );
}

export function AuthSignupForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(signupAction, initialState);

  useEffect(() => {
    if (!state.success || !state.nextPath) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push(state.nextPath!);
    }, 1350);

    return () => window.clearTimeout(timeoutId);
  }, [router, state.nextPath, state.success]);

  if (state.success) {
    return (
      <div className="rounded-[28px] border border-[#00E5FF]/20 bg-[#00E5FF]/[0.06] px-6 py-10 text-center shadow-[0_0_36px_rgba(0,229,255,0.16)]">
        <div className="mx-auto h-12 w-12 rounded-full border border-[#00E5FF]/35 bg-[#00E5FF]/10 animate-pulse" />
        <p
          className="mt-6 text-3xl tracking-[-0.04em] text-white"
          style={{ fontFamily: "var(--font-miracoli-serif)" }}
        >
          Welcome to the Lab
        </p>
        <p className="mt-4 text-sm leading-7 text-white/62">
          {state.message ?? "Preparing your command center..."}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <Field
        id="fullName"
        name="fullName"
        type="text"
        label="Full Name"
        placeholder="Massimo Fellini"
        icon={<User size={18} />}
      />

      <Field
        id="businessName"
        name="businessName"
        type="text"
        label="Business Name"
        placeholder="Fellini Gelato & Caffe"
        icon={<BriefcaseBusiness size={18} />}
      />

      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="maestro@gelatomiracoli.com"
        icon={<Mail size={18} />}
      />

      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        placeholder="••••••••"
        icon={<Lock size={18} />}
      />

      {state.error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[#00E5FF] px-5 py-3 text-sm font-semibold text-[#031118] shadow-[0_0_30px_rgba(0,229,255,0.25)] transition hover:scale-[1.01] hover:shadow-[0_0_42px_rgba(0,229,255,0.42)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating Account..." : "Create Account"}
      </button>

      <div className="text-center text-sm text-white/45">
        Already have an account?{" "}
        <Link href="/login" className="text-white/70 transition hover:text-white">
          Log In
        </Link>
      </div>
    </form>
  );
}
