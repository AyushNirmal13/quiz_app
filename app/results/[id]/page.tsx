"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { fetchCurrentUser } from "@/lib/auth-client";
import type { AttemptRecord } from "@/types/quiz";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export default function AttemptResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const user = await fetchCurrentUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const res = await fetch(`/api/attempts/${id}`, { cache: "no-store" });
      const data = await res.json() as { success: boolean; attempt?: AttemptRecord; message?: string };

      if (!res.ok || !data.success || !data.attempt) {
        setError(data.message ?? "Could not load result.");
        setIsLoading(false);
        return;
      }

      setAttempt(data.attempt);
      setIsLoading(false);
    };
    void load();
  }, [id, router]);

  if (isLoading) return (
    <AppShell activeNav="records">
      <div className="page-shell"><p className="section-copy">Loading result...</p></div>
    </AppShell>
  );

  if (error || !attempt) return (
    <AppShell activeNav="records">
      <div className="page-shell">
        <p className="section-copy" style={{ color: "var(--color-accent)" }}>{error || "Result not found."}</p>
        <Link href="/results" className="btn-secondary">Back to Records</Link>
      </div>
    </AppShell>
  );

  const wrong = attempt.totalQuestions - attempt.correctAnswers;
  const isPassing = attempt.score >= 50;

  return (
    <AppShell activeNav="records">
      <div className="page-shell page-shell--narrow">
        {/* Header */}
        <section className="page-intro">
          <div className="page-intro__top">
            <div className="page-intro__copy">
              <p className="eyebrow">Quiz Result</p>
              <h1 className="page-title" style={{ color: isPassing ? "var(--color-olive)" : "var(--color-accent)" }}>
                {attempt.score}%
              </h1>
              <p className="page-lede">{attempt.quizTitle || attempt.quizId} · {formatDate(attempt.submittedAt)}</p>
            </div>
          </div>
        </section>

        {/* Score strip */}
        <div className="results-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="result-card">
            <div className="result-card__header">
              <p className="eyebrow">Score</p>
              <span className={`status-chip ${isPassing ? "status-chip--active" : ""}`} style={!isPassing ? { background: "var(--color-accent)", color: "var(--color-paper)" } : {}}>
                {isPassing ? "Pass" : "Fail"}
              </span>
            </div>
            <p className="result-card__score">{attempt.score}%</p>
          </div>
          <div className="result-card">
            <p className="eyebrow">Correct</p>
            <p className="result-card__score" style={{ color: "var(--color-olive)" }}>{attempt.correctAnswers}</p>
            <p className="section-copy">out of {attempt.totalQuestions}</p>
          </div>
          <div className="result-card">
            <p className="eyebrow">Time Taken</p>
            <p className="result-card__score">{formatTime(attempt.timeTakenSeconds)}</p>
            {(attempt.violationCount ?? 0) > 0 && (
              <p className="section-copy" style={{ color: "var(--color-accent)" }}>{attempt.violationCount} violation{attempt.violationCount !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="content-card" style={{ marginBottom: "1.5rem" }}>
          <div className="progress-block">
            <progress className="progress-track" value={attempt.score} max={100}>{attempt.score}%</progress>
            <div className="progress-copy">
              <span>{attempt.correctAnswers} correct</span>
              <span>{wrong} incorrect</span>
            </div>
          </div>
        </div>

        {/* Wrong answers review */}
        {attempt.wrongAnswers.length > 0 ? (
          <div className="content-card">
            <div className="content-card__header">
              <p className="eyebrow">Review</p>
              <h2 className="content-card__title">Questions to Revisit</h2>
              <p className="content-card__copy">{wrong} question{wrong !== 1 ? "s" : ""} answered incorrectly.</p>
            </div>

            <div className="content-card__body">
              {attempt.wrongAnswers.map((wa, i) => (
                <div key={i} style={{ padding: "1.25rem", border: "1px solid var(--color-ink)", background: "var(--color-paper)" }}>
                  <p style={{ margin: "0 0 0.75rem", fontWeight: 600 }}>
                    Q{wa.questionIndex}. {wa.questionPrompt}
                  </p>
                  <div style={{ display: "grid", gap: "0.4rem" }}>
                    {wa.options.map((opt, oi) => {
                      const isCorrect = oi === wa.correctAnswer;
                      const isYours = oi === wa.selectedAnswer;
                      return (
                        <div
                          key={oi}
                          style={{
                            padding: "0.6rem 0.85rem",
                            border: "1px solid",
                            borderColor: isCorrect ? "var(--color-olive)" : isYours ? "var(--color-accent)" : "var(--color-ink)",
                            background: isCorrect ? "var(--color-olive)" : isYours ? "var(--color-accent)" : "transparent",
                            color: isCorrect || isYours ? "var(--color-paper)" : "var(--color-ink)",
                            display: "flex",
                            gap: "0.6rem",
                            alignItems: "center",
                          }}
                        >
                          <strong>{OPTION_LABELS[oi]}.</strong>
                          <span>{opt}</span>
                          {isCorrect && <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>✓ Correct</span>}
                          {isYours && !isCorrect && <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>✕ Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="content-card">
            <p className="section-copy" style={{ color: "var(--color-olive)" }}>🎉 Perfect score! All questions answered correctly.</p>
          </div>
        )}

        {/* Leaderboard */}
        <LeaderboardSection quizId={attempt.quizId} />

        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
          <Link href="/results" className="btn-secondary">← Back to Records</Link>
          <Link href="/dashboard" className="btn-primary">Browse More Quizzes</Link>
        </div>
      </div>
    </AppShell>
  );
}

// ── Leaderboard Component ─────────────────────────────────────────────────────
interface LeaderboardEntry {
  rank: number;
  studentName: string;
  userId: string;
  score: number;
  timeTakenSeconds: number;
  isCurrentUser: boolean;
}

function LeaderboardSection({ quizId }: { quizId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/attempts/leaderboard?quizId=${quizId}`, { cache: "no-store" });
        const data = await res.json() as { success: boolean; leaderboard?: LeaderboardEntry[] };
        if (data.success && data.leaderboard) {
          setEntries(data.leaderboard);
        }
      } catch { /* ignore */ }
      setIsLoading(false);
    };
    void load();
  }, [quizId]);

  if (isLoading) return null;
  if (entries.length <= 1) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="content-card" style={{ marginTop: "1.5rem" }}>
      <div className="content-card__header">
        <p className="eyebrow">Rankings</p>
        <h2 className="content-card__title">Leaderboard</h2>
        <p className="content-card__copy">Top performers — ranked by score, then fastest time.</p>
      </div>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {entries.slice(0, 20).map((e) => (
          <div
            key={e.userId}
            style={{
              display: "grid",
              gridTemplateColumns: "50px 1fr auto auto",
              gap: "1rem",
              alignItems: "center",
              padding: "0.65rem 1rem",
              border: e.isCurrentUser ? "2px solid var(--color-accent)" : "1px solid var(--color-ink)",
              background: e.isCurrentUser ? "var(--color-panel)" : "var(--color-paper)",
              fontWeight: e.isCurrentUser ? 700 : 400,
            }}
          >
            <span style={{ fontSize: "1.1rem", textAlign: "center" }}>
              {e.rank <= 3 ? medals[e.rank - 1] : `#${e.rank}`}
            </span>
            <span style={{ fontSize: "0.88rem" }}>
              {e.studentName || `Student ${e.userId.slice(0, 8)}`}
              {e.isCurrentUser && <span style={{ fontSize: "0.75rem", color: "var(--color-accent)", marginLeft: "0.5rem" }}>(You)</span>}
            </span>
            <span style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.88rem", color: e.score >= 50 ? "var(--color-olive)" : "var(--color-accent)" }}>
              {e.score}%
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
              {Math.floor(e.timeTakenSeconds / 60)}m {e.timeTakenSeconds % 60}s
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
