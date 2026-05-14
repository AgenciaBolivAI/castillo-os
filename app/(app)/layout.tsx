import Link from "next/link";
import { logoutAction } from "@/lib/actions";

const NAV = [
  { href: "/", label: "Fleet", icon: "▦" },
  { href: "/brain", label: "Brain Graph", icon: "✦" },
  { href: "/findings", label: "Findings", icon: "◎" },
  { href: "/briefings", label: "Briefings", icon: "✉" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-5 h-16 flex items-center border-b border-border">
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            Castillo<span className="text-green">OS</span>
          </span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted
                         hover:text-text hover:bg-card transition-colors"
            >
              <span className="text-green w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={logoutAction} className="p-3 border-t border-border">
          <button
            type="submit"
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-muted2
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
