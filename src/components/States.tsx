import Link from "next/link";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-3xl">{title}</p>
      {body && <p className="mt-2 text-muted">{body}</p>}
      {action && <Link href={action.href} className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-medium text-accent-fg">{action.label}</Link>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body = "Please try again in a moment.", onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-line bg-surface px-6 py-12 text-center">
      <p className="font-display text-3xl">{title}</p>
      <p className="mt-2 text-muted">{body}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-medium text-accent-fg">Try again</button>}
    </div>
  );
}
