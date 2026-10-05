"use client";
import { ErrorState } from "@/components/States";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <div className="px-4 py-24"><ErrorState title="That didn't go to plan" body="We hit a snag loading this page." onRetry={reset} /></div>;
}
