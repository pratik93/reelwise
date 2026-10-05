import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
      <p className="text-sm uppercase tracking-widest text-accent">Error 404</p>
      <h1 className="mt-3 font-display text-6xl">Cut! This scene is missing.</h1>
      <p className="mt-4 text-muted">The page you&apos;re looking for doesn&apos;t exist, or the movie has left the building.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-medium text-accent-fg">Back to home</Link>
        <Link href="/quiz" className="inline-flex h-11 items-center rounded-full border border-line px-6 text-sm font-medium hover:bg-surface-2">Pick a movie for me</Link>
      </div>
    </div>
  );
}
