"use client";
import { useState } from "react";
import type { MovieCard as Movie } from "@/lib/types";
import { MovieGrid, MovieGridSkeleton } from "./MovieGrid";
import { EmptyState, ErrorState } from "./States";

const STEPS = [
  { key: "mood", q: "What's the mood tonight?", options: [["happy", "😄 Feel-good"], ["thrilled", "🔥 Thrilled"], ["thoughtful", "🧠 Thoughtful"], ["scared", "👻 Spooked"], ["romantic", "💞 Romantic"], ["adventurous", "🧭 Adventurous"]] },
  { key: "time", q: "How much time do you have?", options: [["short", "Under 100 min"], ["normal", "Up to 2h20"], ["long", "Settle in, 2h+"]] },
  { key: "appetite", q: "How adventurous are you?", options: [["familiar", "Crowd favourites"], ["any", "Surprise me a little"], ["surprise", "Deep cuts & hidden gems"]] },
  { key: "era", q: "New or classic?", options: [["new", "Recent (last 5 years)"], ["any", "Any era"], ["classic", "Classics (pre-2000)"]] },
] as const;

type Answers = Partial<Record<(typeof STEPS)[number]["key"], string>>;

export function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [state, setState] = useState<"asking" | "loading" | "done" | "error">("asking");
  const [results, setResults] = useState<Movie[]>([]);
  const [seen, setSeen] = useState<number[]>([]);

  async function submit(a: Answers, exclude: number[] = []) {
    setState("loading");
    try {
      const res = await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...a, exclude }) });
      if (!res.ok) throw new Error();
      const d: { items: Movie[] } = await res.json();
      setResults(d.items);
      setSeen((s) => [...s, ...d.items.map((m) => m.id)].slice(-100));
      setState("done");
    } catch { setState("error"); }
  }

  const reset = () => { setStep(0); setAnswers({}); setSeen([]); setResults([]); setState("asking"); };

  if (state === "loading") return <MovieGridSkeleton count={10} />;
  if (state === "error") return <ErrorState title="Couldn't fetch picks" onRetry={() => submit(answers)} />;
  if (state === "done")
    return (
      <div>
        {results.length === 0 ? (
          <EmptyState title="Nothing matched that combination" body="That's a very specific mood. Try loosening one of your answers." />
        ) : (
          <MovieGrid movies={results} />
        )}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {results.length > 0 && <button type="button" onClick={() => submit(answers, seen)} className="h-11 rounded-full bg-accent px-6 text-sm font-medium text-accent-fg">Show me different picks</button>}
          <button type="button" onClick={reset} className="h-11 rounded-full border border-line px-6 text-sm font-medium hover:bg-surface-2">Start over</button>
        </div>
      </div>
    );

  const s = STEPS[step];
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-2 text-sm text-muted" aria-live="polite">Question {step + 1} of {STEPS.length}</p>
      <div className="mb-6 h-1 overflow-hidden rounded bg-surface-2"><div className="h-full bg-accent transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      <fieldset key={s.key} className="rise">
        <legend className="mb-5 font-display text-4xl">{s.q}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {s.options.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={answers[s.key] === value}
              onClick={() => {
                const next = { ...answers, [s.key]: value };
                setAnswers(next);
                if (step === STEPS.length - 1) submit(next); else setStep(step + 1);
              }}
              className={`min-h-14 rounded-xl border px-4 py-3 text-left text-base transition hover:border-accent hover:bg-surface-2 ${answers[s.key] === value ? "border-accent bg-surface-2" : "border-line bg-surface"}`}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="mt-6 text-sm text-muted hover:text-fg">← Back</button>}
    </div>
  );
}
