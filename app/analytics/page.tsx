"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { fetchCurrentUser } from "@/lib/auth-client";
import type { AttemptRecord, QuizSummary } from "@/types/quiz";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface QuizStats {
  quiz: QuizSummary;
  attempts: AttemptRecord[];
  avgScore: number;
  passRate: number;
  uniqueStudents: number;
  avgTime: number;
}

interface WrongQuestionStat {
  questionIndex: number;
  questionPrompt: string;
  wrongCount: number;
  totalAttempts: number;
  errorRate: number;
}

function getMostWrongQuestions(attempts: AttemptRecord[]): WrongQuestionStat[] {
  const questionMap = new Map<string, { prompt: string; index: number; wrongCount: number; total: number }>();

  for (const attempt of attempts) {
    for (const wa of attempt.wrongAnswers) {
      const key = `${wa.questionIndex}`;
      const existing = questionMap.get(key);
      if (existing) {
        existing.wrongCount++;
        existing.total++;
      } else {
        questionMap.set(key, {
          prompt: wa.questionPrompt,
          index: wa.questionIndex,
          wrongCount: 1,
          total: attempts.length,
        });
      }
    }
  }

  return Array.from(questionMap.values())
    .map((q) => ({
      questionIndex: q.index,
      questionPrompt: q.prompt,
      wrongCount: q.wrongCount,
      totalAttempts: q.total,
      errorRate: Math.round((q.wrongCount / q.total) * 100),
    }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 10);
}

function TeacherAnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quizStats, setQuizStats] = useState<QuizStats[]>([]);
  const [allAttempts, setAllAttempts] = useState<AttemptRecord[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(searchParams.get("quizId") ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await fetchCurrentUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const [qRes, aRes] = await Promise.all([
        fetch("/api/quizzes", { cache: "no-store" }),
        fetch("/api/attempts", { cache: "no-store" }),
      ]);
      const [qData, aData] = await Promise.all([
        qRes.json() as Promise<{ quizzes?: QuizSummary[] }>,
        aRes.json() as Promise<{ attempts?: AttemptRecord[] }>,
      ]);

      const quizzes = qData.quizzes ?? [];
      const attempts = aData.attempts ?? [];
      setAllAttempts(attempts);

      const stats: QuizStats[] = quizzes.map((quiz) => {
        const qa = attempts.filter((a) => a.quizId === quiz.id);
        const avgScore = qa.length > 0 ? Math.round(qa.reduce((s, a) => s + a.score, 0) / qa.length) : 0;
        const passRate = qa.length > 0 ? Math.round((qa.filter((a) => a.score >= 50).length / qa.length) * 100) : 0;
        const uniqueStudents = new Set(qa.map((a) => a.userId)).size;
        const avgTime = qa.length > 0 ? Math.round(qa.reduce((s, a) => s + a.timeTakenSeconds, 0) / qa.length) : 0;
        return { quiz, attempts: qa, avgScore, passRate, uniqueStudents, avgTime };
      });

      setQuizStats(stats);
      const targetQuizId = searchParams.get("quizId");
      if (targetQuizId && stats.find(s => s.quiz.id === targetQuizId)) {
        setSelectedQuizId(targetQuizId);
      } else if (stats.length > 0) {
        setSelectedQuizId(stats[0].quiz.id);
      }
      setIsLoading(false);
    };
    void load();
  }, [router, searchParams]);

  const exportCSV = async (quizId?: string) => {
    setIsExporting(true);
    try {
      const url = quizId ? `/api/attempts/export?quizId=${quizId}` : "/api/attempts/export";
      const res = await fetch(url);
      if (!res.ok) { alert("Export failed."); return; }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = quizId ? `results_${quizId}.csv` : "results_all.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("Export failed. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return (
    <AppShell activeNav="analytics">
      <div className="page-shell"><p className="section-copy">Loading analytics...</p></div>
    </AppShell>
  );

  const selected = quizStats.find((s) => s.quiz.id === selectedQuizId);

  const filteredAttempts = (selected?.attempts ?? []).filter((a) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return a.userId.toLowerCase().includes(term) ||
      (a.studentName ?? "").toLowerCase().includes(term) ||
      (a.studentEmail ?? "").toLowerCase().includes(term);
  });

  const totalAttempts = allAttempts.length;
  const globalAvg = totalAttempts > 0
    ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / totalAttempts)
    : 0;
  const totalStudents = new Set(allAttempts.map((a) => a.userId)).size;

  const mostWrong = selected ? getMostWrongQuestions(selected.attempts) : [];

  return (
    <AppShell activeNav="analytics">
      <div className="page-shell">
        <section className="page-intro">
          <div className="page-intro__top">
            <div className="page-intro__copy">
              <p className="eyebrow">Analytics</p>
              <h1 className="page-title">Quiz Analytics</h1>
              <p className="page-lede">
                Detailed performance metrics for all quizzes you have created.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void exportCSV()}
                disabled={isExporting || allAttempts.length === 0}
              >
                {isExporting ? "Exporting..." : "📥 Export All CSV"}
              </button>
              <Link href="/dashboard" className="btn-secondary">← Dashboard</Link>
            </div>
          </div>

          <dl className="kpi-strip">
            <div className="kpi-item"><dt>Total Quizzes</dt><dd>{quizStats.length}</dd></div>
            <div className="kpi-item"><dt>Total Attempts</dt><dd>{totalAttempts}</dd></div>
            <div className="kpi-item"><dt>Unique Students</dt><dd>{totalStudents}</dd></div>
            <div className="kpi-item"><dt>Global Avg Score</dt><dd>{globalAvg}%</dd></div>
          </dl>
        </section>

        {quizStats.length === 0 ? (
          <div className="content-card">
            <p className="section-copy">No quizzes to analyze yet. Create and publish quizzes first.</p>
            <Link href="/create" className="btn-primary">Create a Quiz</Link>
          </div>
        ) : (
          <div className="analytics-layout">
            {/* Quiz list (sidebar) */}
            <aside>
              <div style={{ border: "2px solid var(--color-ink)", background: "var(--color-panel)", position: "sticky", top: "5.5rem" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-ink)" }}>
                  <p className="eyebrow">Select Quiz</p>
                  <p className="sidebar-panel__title">All Quizzes</p>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "60vh", overflowY: "auto" }}>
                  {quizStats.map((s) => (
                    <li key={s.quiz.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedQuizId(s.quiz.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "0.85rem 1.25rem",
                          border: "none",
                          borderBottom: "1px solid var(--color-panel-strong)",
                          background: s.quiz.id === selectedQuizId ? "var(--color-ink)" : "transparent",
                          color: s.quiz.id === selectedQuizId ? "var(--color-paper)" : "var(--color-ink)",
                          cursor: "pointer",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "0.9rem" }}>{s.quiz.title}</strong>
                        <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>
                          {s.attempts.length} attempts · Avg {s.avgScore}%
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Detail panel */}
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {selected ? (
                <>
                  {/* Quiz header */}
                  <div className="content-card">
                    <div className="content-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p className="eyebrow">{selected.quiz.id}</p>
                        <h2 className="content-card__title">{selected.quiz.title}</h2>
                        <p className="content-card__copy">
                          {selected.quiz.tag} · {selected.quiz.difficulty}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span className={`status-chip ${selected.quiz.isLive ? "status-chip--active" : ""}`}>
                          {selected.quiz.isLive ? "Live" : "Draft"}
                        </span>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}
                          onClick={() => void exportCSV(selected.quiz.id)}
                          disabled={isExporting || selected.attempts.length === 0}
                        >
                          📥 CSV
                        </button>
                      </div>
                    </div>

                    <dl className="kpi-strip" style={{ borderTop: "1px solid var(--color-ink)", paddingTop: "1rem" }}>
                      <div className="kpi-item"><dt>Attempts</dt><dd>{selected.attempts.length}</dd></div>
                      <div className="kpi-item"><dt>Avg Score</dt><dd>{selected.avgScore}%</dd></div>
                      <div className="kpi-item"><dt>Pass Rate</dt><dd>{selected.passRate}%</dd></div>
                      <div className="kpi-item"><dt>Unique Students</dt><dd>{selected.uniqueStudents}</dd></div>
                      <div className="kpi-item"><dt>Avg Time</dt><dd>{Math.floor(selected.avgTime / 60)}m {selected.avgTime % 60}s</dd></div>
                    </dl>
                  </div>

                  {/* Attempt detail table */}
                  <div className="content-card">
                    <div className="content-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p className="eyebrow">Submissions</p>
                        <h2 className="content-card__title">Individual Attempts</h2>
                      </div>
                      <input
                        type="search"
                        className="search-bar__input"
                        placeholder="Filter by name / email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: "220px" }}
                      />
                    </div>

                    {filteredAttempts.length === 0 ? (
                      <p className="section-copy">No attempts yet for this quiz.</p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table className="record-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Score</th>
                              <th>Marks</th>
                              <th>Correct</th>
                              <th>Wrong</th>
                              <th>Time</th>
                              <th>Violations</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAttempts.map((a) => (
                              <tr key={a.id}>
                                <td>
                                  <div style={{ fontSize: "0.85rem" }}>{a.studentName || a.userId.slice(0, 12) + "…"}</div>
                                  {a.studentEmail && <div style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>{a.studentEmail}</div>}
                                </td>
                                <td>
                                  <strong style={{ color: a.score >= 50 ? "var(--color-olive)" : "var(--color-accent)" }}>
                                    {a.score}%
                                  </strong>
                                </td>
                                <td>{a.scoredMarks ?? a.correctAnswers}/{a.totalMarks ?? a.totalQuestions}</td>
                                <td style={{ color: "var(--color-olive)" }}>✓ {a.correctAnswers}</td>
                                <td style={{ color: "var(--color-accent)" }}>✕ {a.totalQuestions - a.correctAnswers}</td>
                                <td>{Math.floor(a.timeTakenSeconds / 60)}m {a.timeTakenSeconds % 60}s</td>
                                <td style={{ color: (a.violationCount ?? 0) > 0 ? "var(--color-accent)" : "inherit" }}>
                                  {a.violationCount ?? 0}
                                </td>
                                <td>{formatDate(a.submittedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Most Wrong Questions */}
                  {mostWrong.length > 0 && (
                    <div className="content-card">
                      <div className="content-card__header">
                        <p className="eyebrow">Insights</p>
                        <h2 className="content-card__title">Most Missed Questions</h2>
                        <p className="content-card__copy">Questions students got wrong most often — consider reviewing these topics.</p>
                      </div>
                      <div style={{ display: "grid", gap: "0.75rem" }}>
                        {mostWrong.map((q) => (
                          <div key={q.questionIndex} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "1rem", alignItems: "center", padding: "0.75rem", border: "1px solid var(--color-ink)", background: "var(--color-paper)" }}>
                            <span style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-accent)" }}>
                              Q{q.questionIndex}
                            </span>
                            <span style={{ fontSize: "0.88rem" }}>{q.questionPrompt.slice(0, 80)}{q.questionPrompt.length > 80 ? "…" : ""}</span>
                            <span style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.82rem", fontWeight: 700, color: "var(--color-accent)" }}>
                              {q.errorRate}% wrong
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score distribution */}
                  {selected.attempts.length > 0 && (
                    <div className="content-card">
                      <div className="content-card__header">
                        <p className="eyebrow">Distribution</p>
                        <h2 className="content-card__title">Score Ranges</h2>
                      </div>
                      <div style={{ display: "grid", gap: "0.75rem" }}>
                        {[
                          { label: "90–100%", min: 90, max: 100, color: "var(--color-olive)" },
                          { label: "70–89%", min: 70, max: 89, color: "var(--color-olive)" },
                          { label: "50–69%", min: 50, max: 69, color: "var(--color-accent)" },
                          { label: "Below 50%", min: 0, max: 49, color: "var(--color-accent)" },
                        ].map((band) => {
                          const count = selected.attempts.filter((a) => a.score >= band.min && a.score <= band.max).length;
                          const pct = selected.attempts.length > 0 ? (count / selected.attempts.length) * 100 : 0;
                          return (
                            <div key={band.label} style={{ display: "grid", gridTemplateColumns: "100px 1fr 50px", gap: "0.75rem", alignItems: "center" }}>
                              <span style={{ fontSize: "0.85rem" }}>{band.label}</span>
                              <div style={{ height: "24px", background: "var(--color-panel)", border: "1px solid var(--color-ink)", position: "relative" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: band.color, transition: "width 0.5s" }} />
                              </div>
                              <span style={{ fontSize: "0.82rem", textAlign: "right" }}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="section-copy">Select a quiz from the list to see analytics.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function TeacherAnalyticsPage() {
  return (
    <Suspense fallback={<AppShell activeNav="analytics"><div className="page-shell"></div></AppShell>}>
      <TeacherAnalyticsPageContent />
    </Suspense>
  );
}
