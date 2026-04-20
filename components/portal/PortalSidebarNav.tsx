"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Cpu,
  Database,
  LayoutDashboard,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/portal/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/portal/library",
    label: "Recipe Vault",
    icon: BookOpen,
  },
  {
    href: "/portal/pantry",
    label: "Pantry",
    icon: Database,
  },
  {
    href: "/portal/equipment",
    label: "Equipment",
    icon: Cpu,
  },
] as const;

export function PortalSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-10 space-y-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-sm transition-all duration-300 ${
              active
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {active ? (
              <span className="absolute inset-y-0 left-0 w-1 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />
            ) : null}
            <Icon size={17} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
