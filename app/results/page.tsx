"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { fetchCurrentUser } from "@/lib/auth-client";
import type { AttemptRecord } from "@/types/quiz";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function StudentResultsPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = await fetchCurrentUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const res = await fetch("/api/attempts", { cache: "no-store" });
      const data = await res.json() as { attempts?: AttemptRecord[] };
      const allAttempts = data.attempts ?? [];
      const myAttempts = allAttempts.filter(a => a.userId === user.id);
      setAttempts(myAttempts);
      setIsLoading(false);
    };
    void load();
  }, [router]);

  if (isLoading) return (
    <AppShell activeNav="records">
      <div className="page-shell"><p className="section-copy">Loading records...</p></div>
    </AppShell>
  );

  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts)
    : 0;
  const passing = attempts.filter((a) => a.score >= 50).length;

  return (
    <AppShell activeNav="records">
      <div className="page-shell">
        <section className="page-intro">
          <div className="page-intro__top">
            <div className="page-intro__copy">
              <p className="eyebrow">My Records</p>
              <h1 className="page-title">All Attempts</h1>
              <p className="page-lede">Complete history of every quiz you&apos;ve submitted. Click any row for a full review.</p>
            </div>
          </div>
          <dl className="kpi-strip">
            <div className="kpi-item"><dt>Total Attempts</dt><dd>{totalAttempts}</dd></div>
            <div className="kpi-item"><dt>Average Score</dt><dd>{avgScore}%</dd></div>
            <div className="kpi-item"><dt>Passed (≥50%)</dt><dd>{passing}</dd></div>
            <div className="kpi-item"><dt>Failed</dt><dd>{totalAttempts - passing}</dd></div>
          </dl>
        </section>

        {attempts.length === 0 ? (
          <div className="content-card">
            <p className="section-copy">You have not attempted any quizzes yet.</p>
            <Link href="/dashboard" className="btn-primary">Browse Quizzes</Link>
          </div>
        ) : (
          <div className="content-card">
            <div className="content-card__header">
              <p className="eyebrow">History</p>
              <h2 className="content-card__title">All Quiz Attempts</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="record-table">
                <thead>
                  <tr>
                    <th>Quiz</th>
                    <th>Score</th>
                    <th>Correct</th>
                    <th>Wrong</th>
                    <th>Time Taken</th>
                    <th>Date</th>
                    <th>Result</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong style={{ display: "block" }}>{a.quizTitle || a.quizId}</strong>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{a.quizId}</span>
                      </td>
                      <td>
                        <strong style={{ color: a.score >= 50 ? "var(--color-olive)" : "var(--color-accent)" }}>
                          {a.score}%
                        </strong>
                      </td>
                      <td style={{ color: "var(--color-olive)" }}>✓ {a.correctAnswers}</td>
                      <td style={{ color: "var(--color-accent)" }}>✕ {a.totalQuestions - a.correctAnswers}</td>
                      <td>{formatTime(a.timeTakenSeconds)}</td>
                      <td>{formatDate(a.submittedAt)}</td>
                      <td>
                        <span
                          className="quiz-card__stat"
                          style={{
                            background: a.score >= 50 ? "var(--color-olive)" : "var(--color-accent)",
                            color: "var(--color-paper)",
                            borderColor: a.score >= 50 ? "var(--color-olive)" : "var(--color-accent)",
                          }}
                        >
                          {a.score >= 50 ? "Pass" : "Fail"}
                        </span>
                      </td>
                      <td>
                        <Link href={`/results/${a.id}`} className="btn-secondary" style={{ minHeight: "36px", padding: "0.4rem 0.75rem" }}>
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
