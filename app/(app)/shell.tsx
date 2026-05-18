"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/actions";

const NAV = [
  { href: "/", label: "Fleet", icon: "▦" },
  { href: "/brain", label: "Brain Graph", icon: "✦" },
  { href: "/findings", label: "Findings", icon: "◎" },
  { href: "/briefings", label: "Briefings", icon: "✉" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock page scroll while the drawer is open on mobile.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-surface/95 backdrop-blur border-b border-border flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="-ml-2 p-2 text-text rounded-md hover:bg-card active:bg-card"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="font-display text-lg font-extrabold tracking-tight text-white">
          Castillo<span className="text-green">OS</span>
        </span>
        <span className="w-9" aria-hidden />
      </header>

      {/* Backdrop (mobile drawer only) */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Sidebar — drawer on mobile, static on md+ */}
      <aside
        className={`fixed md:sticky md:top-0 inset-y-0 left-0 z-50 w-64 md:w-56 h-screen shrink-0
                    border-r border-border bg-surface flex flex-col
                    transform transition-transform duration-200 ease-out
                    ${open ? "translate-x-0" : "-translate-x-full"}
                    md:translate-x-0`}
      >
        <div className="px-5 h-16 flex items-center border-b border-border">
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            Castillo<span className="text-green">OS</span>
          </span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                  active
                    ? "text-text bg-card"
                    : "text-muted hover:text-text hover:bg-card"
                }`}
              >
                <span className="text-green w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action={logoutAction} className="p-3 border-t border-border">
          <button
            type="submit"
            className="w-full text-left px-3 py-3 rounded-lg text-sm text-muted2
                       hover:text-text hover:bg-card transition-colors"
          >
            ⏻ Salir
          </button>
        </form>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
