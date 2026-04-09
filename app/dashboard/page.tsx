"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { fetchCurrentUser } from "@/lib/auth-client";
import type { AuthUser } from "@/types/auth";
import type { AttemptRecord, QuizSummary } from "@/types/quiz";



export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  
  // All quizzes from API
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);

  
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for toggling/deleting created quizzes
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = await fetchCurrentUser();
      if (!user) { router.replace("/auth/login"); return; }
      setCurrentUser(user);

      const [qRes, aRes] = await Promise.all([
        fetch("/api/quizzes", { cache: "no-store" }),
        fetch("/api/attempts", { cache: "no-store" }),
      ]);
      
      const [qData, aData] = await Promise.all([
        qRes.json() as Promise<{ quizzes?: QuizSummary[] }>,
        aRes.json() as Promise<{ attempts?: AttemptRecord[] }>,
      ]);

      const allQuizzes = qData.quizzes ?? [];
      setQuizzes(allQuizzes);
      setAttempts(aData.attempts ?? []);
      
      // API returns both created and live quizzes
      setIsLoading(false);
    };
    void load();
  }, [router]);


  // Actions for created quizzes (If we add a "My Quizzes" section later)
  const toggleLive = async (quiz: QuizSummary) => {
    setTogglingId(quiz.slug);
    try {
      const res = await fetch(`/api/quizzes/${quiz.slug}/toggle-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: !quiz.isLive }),
      });
      const data = await res.json() as { success: boolean; isLive?: boolean };
      if (data.success) {
        setQuizzes((prev) => prev.map((q) => q.slug === quiz.slug ? { ...q, isLive: data.isLive ?? !quiz.isLive } : q));
      }
    } catch { /* ignore */ }
    setTogglingId(null);
  };

  const deleteQuiz = async (quiz: QuizSummary) => {
    if (!confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;
    setDeletingId(quiz.slug);
    try {
      const res = await fetch(`/api/quizzes/${quiz.slug}`, { method: "DELETE" });
      const data = await res.json() as { success: boolean };
      if (data.success) setQuizzes((prev) => prev.filter((q) => q.slug !== quiz.slug));
    } catch { /* ignore */ }
    setDeletingId(null);
  };

  // All quizzes returned by API are the user's own quizzes now
  const myQuizzes = quizzes;


  const attemptedQuizIds = new Set(attempts.map((a) => a.quizId));

  // Quick stats
  const liveCount = myQuizzes.filter((q) => q.isLive).length;
  const draftCount = myQuizzes.filter((q) => !q.isLive).length;

  if (isLoading) {
    return (
      <AppShell activeNav="dashboard">
        <div className="page-shell"><p className="section-copy">Loading your dashboard...</p></div>
      </AppShell>
    );
  }

  return (
    <AppShell activeNav="dashboard">
      <div className="page-shell">
        {/* Header */}
        <section className="page-intro">
          <div className="page-intro__top">
            <div className="page-intro__copy">
              <p className="eyebrow">Dashboard</p>
              <h1 className="page-title">{currentUser?.name ?? "Welcome"}</h1>
              <p className="page-lede">
                {currentUser?.email}
              </p>
            </div>
            
            <Link href="/create" className="btn-primary" style={{ height: "fit-content" }}>
              + Create Quiz
            </Link>
          </div>

          <div style={{
            display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem",
            padding: "0.75rem 1rem", border: "2px solid var(--color-ink)", background: "var(--color-panel)",
            flexWrap: "wrap"
          }}>
            <span style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              Join by Code →
            </span>
            <input
              id="join-code-input"
              type="text"
              placeholder="Enter quiz code or paste link"
              style={{
                flex: 1, minHeight: "40px", padding: "0.5rem 0.75rem",
                border: "1px solid var(--color-ink)", background: "var(--color-paper)",
                fontFamily: "var(--font-label), monospace", fontSize: "0.88rem",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const input = (e.target as HTMLInputElement).value.trim();
                  if (input) {
                    const code = input.includes("/") ? input.split("/").pop() : input;
                    if (code) router.push(`/quiz/${code}`);
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn-primary"
              style={{ minHeight: "40px", padding: "0.5rem 1rem" }}
              onClick={() => {
                const input = (document.getElementById("join-code-input") as HTMLInputElement)?.value.trim();
                if (input) {
                  const code = input.includes("/") ? input.split("/").pop() : input;
                  if (code) router.push(`/quiz/${code}`);
                }
              }}
            >
              Join
            </button>
          </div>
        </section>


        <div className="dashboard-layout">
          {/* Main Content Area — My Quizzes only */}
          <div>
            <div className="section-header">
              <div>
                <p className="eyebrow">Your Quizzes</p>
                <h2 className="section-title">My Quizzes</h2>
              </div>
              <span className="section-count">{myQuizzes.length}</span>
            </div>

            {myQuizzes.length === 0 ? (
              <div className="content-card">
                <p className="section-copy">
                  You haven't created any quizzes yet. Create one or join a quiz using an access code above!
                </p>
              </div>
            ) : (
              <div className="quiz-grid">
                {myQuizzes.map((quiz) => {
                  const alreadyAttempted = attemptedQuizIds.has(quiz.id);
                  return (
                    <article key={quiz.slug} className="quiz-card">
                      <div className="quiz-card__header">
                        <span className="quiz-card__badge">{quiz.tag}</span>
                        <span className="quiz-card__id">{quiz.id}</span>
                      </div>

                      <div className="quiz-card__visual">
                        <span className="quiz-card__visual-kicker">{quiz.difficulty}</span>
                        <p className="quiz-card__visual-focus">{quiz.focus || quiz.title.slice(0, 20)}</p>
                        <span className="quiz-card__visual-index">{quiz.questionCount}Q</span>
                      </div>

                      <div className="quiz-card__body">
                        <h3 className="quiz-card__title">{quiz.title}</h3>
                        {quiz.description && <p className="quiz-card__description">{quiz.description}</p>}
                      </div>

                      <div className="quiz-card__stats">
                        <span className="quiz-card__stat">{quiz.duration}</span>
                        <span className="quiz-card__stat">{quiz.difficulty}</span>
                        {quiz.surveillanceSettings?.cameraRequired && <span className="quiz-card__stat">📷 Camera</span>}
                        {alreadyAttempted && <span className="quiz-card__stat" style={{ background: "var(--color-olive)", color: "var(--color-paper)", borderColor: "var(--color-olive)" }}>Attempted</span>}
                      </div>

                      <div className="quiz-card__footer">
                        <span className={`status-chip ${quiz.isLive ? "status-chip--active" : ""}`}>
                          {quiz.isLive ? "Live" : "Draft"}
                        </span>
                        
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Link href={`/quiz/${quiz.slug}`} className="btn-primary">
                            {alreadyAttempted ? "Retake" : "Preview"}
                          </Link>
                          
                          {/* Owner actions — only shown for user's own quizzes */}
                          <Link href={`/edit/${quiz.slug}`} className="btn-secondary" style={{ padding: "0.5rem", minHeight: "0" }}>
                            Edit
                          </Link>
                          {attempts.some(a => a.quizId === quiz.id) && (
                            <Link href={`/analytics?quizId=${quiz.id}`} className="btn-secondary" style={{ padding: "0.5rem", minHeight: "0" }}>
                              Results
                            </Link>
                          )}
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "0.5rem", minHeight: "0", fontSize: "0.78rem" }}
                            disabled={togglingId === quiz.slug}
                            onClick={() => void toggleLive(quiz)}
                          >
                            {togglingId === quiz.slug ? "..." : quiz.isLive ? "Take Down" : "Go Live"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "0.5rem", minHeight: "0", fontSize: "0.78rem", color: "var(--color-accent)" }}
                            disabled={deletingId === quiz.slug}
                            onClick={() => void deleteQuiz(quiz)}
                          >
                            {deletingId === quiz.slug ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar — Quick Stats */}
          <aside>
            <div style={{ display: "grid", gap: "1rem", border: "2px solid var(--color-ink)", padding: "1.25rem", background: "var(--color-panel)", position: "sticky", top: "5.5rem" }}>
              <div className="sidebar-panel__header">
                <p className="sidebar-panel__label">Overview</p>
                <h2 className="sidebar-panel__title">Quick Stats</h2>
              </div>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-panel-strong)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Total Quizzes</span>
                  <strong>{myQuizzes.length}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-panel-strong)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Live</span>
                  <strong style={{ color: "var(--color-olive)" }}>{liveCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-panel-strong)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Drafts</span>
                  <strong>{draftCount}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>Attempts Received</span>
                  <strong>{attempts.length}</strong>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--color-ink)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                <p className="sidebar-panel__label">Join a Quiz</p>
                <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginTop: "0.25rem" }}>
                  Use the &ldquo;Join by Code&rdquo; bar above to enter a quiz access code shared by someone else.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
