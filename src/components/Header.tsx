import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-2xl leading-none tracking-tight text-fg">
          Reel<span className="text-accent">wise</span>
        </Link>
        <NavLinks />
        <div className="ml-auto flex flex-1 items-center justify-end gap-2 md:flex-none">
          <SearchBar />
          <ThemeToggle />
        </div>
      </div>
      <NavLinks mobile />
    </header>
  );
}
