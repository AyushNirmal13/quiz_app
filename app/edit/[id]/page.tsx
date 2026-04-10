"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { fetchCurrentUser } from "@/lib/auth-client";
import { DIFFICULTIES } from "@/lib/constants";

interface QuizQuestion {
  index: number;
  prompt: string;
  context: string;
  options: string[];
  correctAnswer: number;
  marks: number;
  explanation: string;
}

interface QuizDetailFull {
  id: string;
  title: string;
  description: string;
  tag: string;
  difficulty: string;
  duration: string;
  isLive: boolean;
  status: string;
  createdBy: string;
  startTime: string;
  endTime: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: boolean;
  negativeMarkValue: number;
  maxAttempts: number;
  surveillanceSettings: {
    cameraRequired: boolean;
    screenLocked: boolean;
    screenshotBlocked: boolean;
  };
  questions: QuizQuestion[];
}

function parseDurationMin(dur: string): number {
  const m = dur.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 30;
}

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = use(params);
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizDetailFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [durationMin, setDurationMin] = useState(30);
  const [isLive, setIsLive] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [cameraRequired, setCameraRequired] = useState(false);
  const [screenLocked, setScreenLocked] = useState(false);
  const [screenshotBlocked, setScreenshotBlocked] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0.25);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  // Load quiz data
  useEffect(() => {
    const load = async () => {
      const user = await fetchCurrentUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const res = await fetch(`/api/quizzes/${slug}`, { cache: "no-store" });
      const data = await res.json() as { success: boolean; quiz?: QuizDetailFull; message?: string };

      if (!res.ok || !data.success || !data.quiz) {
        setLoadError(data.message ?? "Quiz not found.");
        setIsLoading(false);
        return;
      }

      const q = data.quiz;

      // Ownership check — only the creator can edit
      if (q.createdBy && q.createdBy !== user.id) {
        setLoadError("Access denied. Only the quiz creator can edit this quiz.");
        setIsLoading(false);
        return;
      }

      setQuiz(q);
      setTitle(q.title);
      setDescription(q.description ?? "");
      setTag(q.tag ?? "");
      setDifficulty(q.difficulty ?? "Intermediate");
      setDurationMin(parseDurationMin(q.duration));
      setIsLive(q.isLive);
      setStartTime(q.startTime ? new Date(q.startTime).toISOString().slice(0, 16) : "");
      setEndTime(q.endTime ? new Date(q.endTime).toISOString().slice(0, 16) : "");
      setCameraRequired(q.surveillanceSettings?.cameraRequired ?? false);
      setScreenLocked(q.surveillanceSettings?.screenLocked ?? false);
      setScreenshotBlocked(q.surveillanceSettings?.screenshotBlocked ?? false);
      setShuffleQuestions(q.shuffleQuestions ?? false);
      setShuffleOptions(q.shuffleOptions ?? false);
      setNegativeMarking(q.negativeMarking ?? false);
      setNegativeMarkValue(q.negativeMarkValue ?? 0.25);
      setMaxAttempts(q.maxAttempts ?? 1);
      setQuestions(q.questions.map((qn) => ({ ...qn, marks: qn.marks ?? 1, explanation: (qn as QuizQuestion).explanation ?? "" })));
      setIsLoading(false);
    };
    void load();
  }, [slug, router]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, {
      index: prev.length + 1,
      prompt: "", context: "", options: ["", "", "", ""], correctAnswer: 0, marks: 1, explanation: "",
    }]);
    setExpandedIdx(questions.length);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, index: i + 1 })));
    setExpandedIdx(null);
  };

  const updateQuestion = (idx: number, field: string, value: unknown) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    setQuestions((prev) => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((q, i) => ({ ...q, index: i + 1 }));
    });
    setExpandedIdx(newIdx);
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Quiz title is required.";
    if (questions.length === 0) return "Add at least one question.";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return `Question ${i + 1}: prompt cannot be empty.`;
      if (q.options.some((o) => !o.trim())) return `Question ${i + 1}: all 4 options are required.`;
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { setStatusMsg(err); return; }

    setIsSaving(true);
    setStatusMsg("");

    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        tag: tag.trim() || title.trim(),
        difficulty,
        duration: `${durationMin} min`,
        isLive,
        startTime: startTime || null,
        endTime: endTime || null,
        shuffleQuestions,
        shuffleOptions,
        negativeMarking,
        negativeMarkValue,
        maxAttempts,
        surveillanceSettings: { cameraRequired, screenLocked, screenshotBlocked },
        questions: questions.map((q, i) => ({
          index: i + 1,
          prompt: q.prompt.trim(),
          context: (q.context ?? "").trim(),
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: q.marks ?? 1,
          explanation: (q.explanation ?? "").trim(),
        })),
      };

      const res = await fetch(`/api/quizzes/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success: boolean; message?: string };

      if (!res.ok || !data.success) {
        setStatusMsg(data.message ?? "Failed to save.");
        return;
      }

      setStatusMsg("✓ Quiz updated successfully!");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch {
      setStatusMsg("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    border: "2px solid var(--color-ink)", padding: "1.5rem",
    background: "var(--color-panel)", display: "grid", gap: "1rem", marginBottom: "1.5rem",
  };
  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-label), monospace", fontSize: "0.72rem",
    letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem",
    borderBottom: "1px solid var(--color-ink)", paddingBottom: "0.5rem",
  };
  const inputStyle: React.CSSProperties = {
    minHeight: "48px", padding: "0.85rem 1rem", border: "1px solid var(--color-ink)",
    background: "var(--color-paper)", width: "100%", fontFamily: "inherit",
    fontSize: "inherit", color: "var(--color-ink)",
  };
  const checkboxRow: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.75rem",
    padding: "0.75rem 0", borderBottom: "1px solid var(--color-panel-strong)", cursor: "pointer",
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <AppShell activeNav="dashboard">
      <div className="page-shell"><p className="section-copy">Loading quiz...</p></div>
    </AppShell>
  );

  if (loadError || !quiz) return (
    <AppShell activeNav="dashboard">
      <div className="page-shell">
        <p className="section-copy" style={{ color: "var(--color-accent)" }}>{loadError || "Quiz not found."}</p>
        <Link href="/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>
    </AppShell>
  );

  return (
    <AppShell activeNav="dashboard">
      <div className="page-shell">
        <section className="page-intro">
          <div className="page-intro__top">
            <div className="page-intro__copy">
              <p className="eyebrow">Edit Quiz · {quiz.id}</p>
              <h1 className="page-title">Edit: {quiz.title}</h1>
              <p className="page-lede">
                Modify questions, settings, permissions — everything about this quiz.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="button" className="btn-secondary" onClick={() => router.push("/dashboard")}>
                ← Cancel
              </button>
            </div>
          </div>
        </section>

        <div style={{ maxWidth: "860px" }}>
          {/* Quiz Details */}
          <div style={cardStyle}>
            <p style={sectionLabel}>Quiz Details</p>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div className="form-field">
                <span className="form-field__label">Quiz Title *</span>
                <input style={inputStyle} type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="form-field">
                <span className="form-field__label">Description</span>
                <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-field">
                  <span className="form-field__label">Category</span>
                  <input style={inputStyle} type="text" value={tag} onChange={(e) => setTag(e.target.value)} />
                </div>
                <div className="form-field">
                  <span className="form-field__label">Difficulty</span>
                  <select style={inputStyle} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <span className="form-field__label">Duration: {durationMin} minutes</span>
                <input type="range" min={5} max={180} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} style={{ width: "100%", marginTop: "0.75rem", accentColor: "var(--color-accent)" }} />
              </div>
            </div>
          </div>

          {/* Surveillance */}
          <div style={cardStyle}>
            <p style={sectionLabel}>Surveillance Settings</p>
            <label style={checkboxRow}>
              <input type="checkbox" checked={cameraRequired} onChange={(e) => setCameraRequired(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
              <div>
                <strong>Require camera access</strong>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Students must grant camera permission.</p>
              </div>
            </label>
            <label style={checkboxRow}>
              <input type="checkbox" checked={screenLocked} onChange={(e) => setScreenLocked(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
              <div>
                <strong>Lock screen to fullscreen</strong>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Exiting fullscreen counts as a violation.</p>
              </div>
            </label>
            <label style={checkboxRow}>
              <input type="checkbox" checked={screenshotBlocked} onChange={(e) => setScreenshotBlocked(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
              <div>
                <strong>Block right-click &amp; screenshot shortcuts</strong>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Disables context menu and common screenshot combos.</p>
              </div>
            </label>
          </div>

          {/* Quiz Rules */}
          <div style={cardStyle}>
            <p style={sectionLabel}>Quiz Rules</p>
            <label style={checkboxRow}>
              <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
              <div><strong>Shuffle questions</strong><p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Random order per student.</p></div>
            </label>
            <label style={checkboxRow}>
              <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
              <div><strong>Shuffle options</strong><p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Option order randomized per student.</p></div>
            </label>
            <label style={checkboxRow}>
              <input type="checkbox" checked={negativeMarking} onChange={(e) => setNegativeMarking(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
              <div><strong>Negative marking</strong><p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Deduct marks for wrong answers.</p></div>
            </label>
            {negativeMarking && (
              <div className="form-field" style={{ paddingLeft: "2rem" }}>
                <span className="form-field__label">Deduction per wrong answer</span>
                <select style={{ ...inputStyle, maxWidth: "200px" }} value={negativeMarkValue} onChange={(e) => setNegativeMarkValue(Number(e.target.value))}>
                  <option value={0.25}>0.25× (quarter)</option>
                  <option value={0.33}>0.33× (third)</option>
                  <option value={0.5}>0.50× (half)</option>
                  <option value={1}>1.00× (full)</option>
                </select>
              </div>
            )}
            <div className="form-field">
              <span className="form-field__label">Max attempts: {maxAttempts}</span>
              <input type="range" min={1} max={5} step={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} style={{ width: "100%", maxWidth: "300px", accentColor: "var(--color-accent)" }} />
            </div>
          </div>

          {/* Publish Settings */}
          <div style={cardStyle}>
            <p style={sectionLabel}>Publish Settings</p>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
              <span><strong>Quiz is live</strong></span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-field">
                <span className="form-field__label">Start Time</span>
                <input style={inputStyle} type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="form-field">
                <span className="form-field__label">End Time</span>
                <input style={inputStyle} type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div style={{ ...cardStyle, gap: "0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <p style={{ ...sectionLabel, margin: 0, border: "none", padding: 0 }}>Questions ({questions.length})</p>
              <button type="button" className="btn-secondary" onClick={addQuestion}>+ Add Question</button>
            </div>

            {questions.map((q, qi) => (
              <div key={qi} style={{ border: "1px solid var(--color-ink)", marginBottom: "1rem", background: "var(--color-paper)" }}>
                {/* Question Header */}
                <div
                  style={{ padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: expandedIdx === qi ? "1px solid var(--color-ink)" : "none" }}
                  onClick={() => setExpandedIdx(expandedIdx === qi ? null : qi)}
                >
                  <span style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.8rem", textTransform: "uppercase" }}>
                    Q{qi + 1}{q.prompt ? `: ${q.prompt.slice(0, 50)}${q.prompt.length > 50 ? "…" : ""}` : " — (empty)"}
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveQuestion(qi, -1); }} disabled={qi === 0} style={{ padding: "0.25rem 0.5rem", border: "1px solid var(--color-ink)", background: "transparent", cursor: qi === 0 ? "default" : "pointer" }}>↑</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveQuestion(qi, 1); }} disabled={qi === questions.length - 1} style={{ padding: "0.25rem 0.5rem", border: "1px solid var(--color-ink)", background: "transparent", cursor: qi === questions.length - 1 ? "default" : "pointer" }}>↓</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeQuestion(qi); }} style={{ padding: "0.25rem 0.5rem", border: "1px solid var(--color-ink)", background: "var(--color-accent)", color: "var(--color-paper)", cursor: "pointer" }}>✕</button>
                  </div>
                </div>

                {/* Question Body */}
                {expandedIdx === qi && (
                  <div style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
                    <div className="form-field">
                      <span className="form-field__label">Question Text *</span>
                      <textarea style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }} value={q.prompt} onChange={(e) => updateQuestion(qi, "prompt", e.target.value)} />
                    </div>
                    <div className="form-field">
                      <span className="form-field__label">Hint / Context (optional)</span>
                      <input style={inputStyle} type="text" value={q.context ?? ""} onChange={(e) => updateQuestion(qi, "context", e.target.value)} />
                    </div>
                    <div className="form-field">
                      <span className="form-field__label">Marks for this question</span>
                      <input style={{ ...inputStyle, maxWidth: "100px" }} type="number" min={1} max={10} value={q.marks} onChange={(e) => updateQuestion(qi, "marks", Number(e.target.value))} />
                    </div>

                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      <span className="form-field__label">Options — select the correct answer</span>
                      {(["A", "B", "C", "D"] as const).map((letter, oi) => (
                        <div key={letter} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem", alignItems: "center" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name={`correct-edit-${qi}`}
                              checked={q.correctAnswer === oi}
                              onChange={() => updateQuestion(qi, "correctAnswer", oi)}
                              style={{ accentColor: "var(--color-accent)", width: "auto" }}
                            />
                            <span style={{ fontFamily: "var(--font-label), monospace", fontWeight: "bold", fontSize: "0.85rem" }}>{letter}</span>
                          </label>
                          <input
                            style={{ ...inputStyle, borderColor: q.correctAnswer === oi ? "var(--color-olive)" : "var(--color-ink)" }}
                            type="text"
                            placeholder={`Option ${letter}`}
                            value={q.options[oi] ?? ""}
                            onChange={(e) => updateOption(qi, oi, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="form-field">
                      <span className="form-field__label">Explanation (shown in results)</span>
                      <textarea style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} placeholder="Why this answer is correct..." value={q.explanation ?? ""} onChange={(e) => updateQuestion(qi, "explanation", e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Status + Actions */}
          {statusMsg && (
            <p style={{ color: statusMsg.startsWith("✓") ? "var(--color-olive)" : "var(--color-accent)", marginBottom: "1rem" }}>
              {statusMsg}
            </p>
          )}

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={() => router.push("/dashboard")}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void save()} disabled={isSaving}>
              {isSaving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
