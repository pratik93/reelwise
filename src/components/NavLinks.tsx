"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/quiz", label: "Pick for me" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/ratings", label: "My ratings" },
];

export function NavLinks({ mobile }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav
      aria-label={mobile ? "Primary (mobile)" : "Primary"}
      className={mobile ? "scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2 md:hidden" : "ml-4 hidden gap-1 md:flex"}
    >
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
