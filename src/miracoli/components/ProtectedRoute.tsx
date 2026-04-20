"use client";

import Link from "next/link";
import { useState } from "react";
import {
  grantMasterAdminSession,
  readProfileSettings,
  type ProfileSettings,
} from "@/lib/storage";

type ProtectedRouteProps = {
  children: React.ReactNode;
  title: string;
  description: string;
  fallbackHref?: string;
  bootstrapMasterAdminSession?: boolean;
};

export function ProtectedRoute({
  children,
  title,
  description,
  fallbackHref = "/pantry",
  bootstrapMasterAdminSession = false,
}: ProtectedRouteProps) {
  const [profile] = useState<ProfileSettings>(() =>
    bootstrapMasterAdminSession ? grantMasterAdminSession() : readProfileSettings()
  );

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <section className="luxury-card rounded-[32px] px-8 py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">Loading protected route...</p>
        </section>
      </main>
    );
  }

  if (!profile.isMasterAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <section className="luxury-card max-w-2xl rounded-[32px] p-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
            Protected Route
          </p>
          <h1 className="mt-3 font-serif text-4xl text-[var(--accent)]">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{description}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={fallbackHref}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#1b1612]"
            >
              Return
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
