import type { Metadata } from "next";
import { Quiz } from "@/components/Quiz";

export const metadata: Metadata = { title: "What should I watch tonight?", description: "Answer four quick questions and get ten movie picks matched to your mood, time and taste." };

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-center font-display text-5xl sm:text-6xl">What should I watch tonight?</h1>
      <p className="mb-10 text-center text-muted">Four quick questions, ten picks.</p>
      <Quiz />
    </div>
  );
}
