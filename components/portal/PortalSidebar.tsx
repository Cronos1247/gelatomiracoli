"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  FlaskConical,
  LayoutDashboard,
  PackageSearch,
  Settings,
  Vault,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/portal/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/portal/lab",
    label: "Recipe Lab",
    icon: FlaskConical,
  },
  {
    href: "/portal/pantry",
    label: "Master Ledger",
    icon: Vault,
  },
  {
    href: "/portal/ingestion",
    label: "Ingestion Vault",
    icon: PackageSearch,
  },
  {
    href: "/portal/library",
    label: "Recipe Vault",
    icon: BookOpenText,
  },
  {
    href: "/portal/equipment",
    label: "Equipment",
    icon: Settings,
  },
] as const;

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-white/5 px-6 py-8 backdrop-blur-2xl lg:flex lg:flex-col">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
          Gelato Miracoli
        </p>
        <h1
          className="mt-4 text-3xl tracking-[-0.04em] text-white"
          style={{ fontFamily: "var(--font-miracoli-serif)" }}
        >
          Command Center
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/50">
          Chemistry, pricing, uploads, and finished formulas in one elegant shell.
        </p>
      </div>

      <nav className="mt-10 space-y-2 text-sm">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                active
                  ? "border-cyan-400/20 bg-cyan-400/10 text-white"
                  : "border-transparent text-white/78 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
