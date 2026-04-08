"use client";

import { useEffect, useState } from "react";

import { DIFFICULTIES } from "@/lib/constants";

export interface DraftQuestion {
  prompt: string;
  context: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation?: string;
}

interface QuizBuilderProps {
  initialQuestions?: DraftQuestion[];
  onSaved?: () => void;
}

function emptyQuestion(): DraftQuestion {
  return { prompt: "", context: "", options: ["", "", "", ""], correctAnswer: 0 };
}

export function QuizBuilder({ initialQuestions, onSaved }: QuizBuilderProps) {
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
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [statusMsg, setStatusMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
      setExpandedIdx(0);
      setStatusMsg(`✨ ${initialQuestions.length} AI-generated questions loaded. Review, edit, or delete any question before publishing.`);
    }
  }, [initialQuestions]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setExpandedIdx(questions.length);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  const updateQuestion = (idx: number, field: keyof DraftQuestion, value: unknown) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    );
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const opts = [...q.options] as [string, string, string, string];
        opts[optIdx] = value;
        return { ...q, options: opts };
      }),
    );
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    setQuestions((prev) => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
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

  const save = async (publishLive: boolean) => {
    const err = validate();
    if (err) { setStatusMsg(err); return; }

    setIsSaving(true);
    setStatusMsg("");

    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        tag: tag.trim() || "General",
        difficulty,
        duration: `${durationMin} min`,
        isLive: publishLive,
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
          context: q.context.trim(),
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: 1,
          explanation: q.explanation?.trim() ?? "",
        })),
      };

      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success: boolean; message?: string };

      if (!res.ok || !data.success) {
        setStatusMsg(data.message ?? "Failed to save quiz.");
        return;
      }

      setStatusMsg(publishLive ? "✓ Quiz published live!" : "✓ Quiz saved as draft.");
      onSaved?.();
    } catch {
      setStatusMsg("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    border: "2px solid var(--color-ink)",
    padding: "1.5rem",
    background: "var(--color-panel)",
    display: "grid",
    gap: "1rem",
    marginBottom: "1.5rem",
  };

  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-label), monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: "1rem",
    borderBottom: "1px solid var(--color-ink)",
    paddingBottom: "0.5rem",
  };

  const inputStyle: React.CSSProperties = {
    minHeight: "48px",
    padding: "0.85rem 1rem",
    border: "1px solid var(--color-ink)",
    background: "var(--color-paper)",
    width: "100%",
    fontFamily: "inherit",
    fontSize: "inherit",
    color: "var(--color-ink)",
  };

  const checkboxRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 0",
    borderBottom: "1px solid var(--color-panel-strong)",
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: "860px" }}>
      {/* Quiz Details */}
      <div style={cardStyle}>
        <p style={sectionLabel}>Quiz Details</p>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div className="form-field">
            <span className="form-field__label">Quiz Title *</span>
            <input style={inputStyle} type="text" placeholder="e.g. Constitutional Law Basics" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-field">
            <span className="form-field__label">Description</span>
            <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="What is this quiz about?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-field">
              <span className="form-field__label">Category</span>
              <input style={inputStyle} type="text" placeholder="e.g. Science, General, History" value={tag} onChange={(e) => setTag(e.target.value)} />
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
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Students must grant camera permission before starting the quiz.</p>
          </div>
        </label>
        <label style={checkboxRow}>
          <input type="checkbox" checked={screenLocked} onChange={(e) => setScreenLocked(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
          <div>
            <strong>Lock screen to fullscreen</strong>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Exiting fullscreen counts as a violation. 3 violations auto-submit.</p>
          </div>
        </label>
        <label style={checkboxRow}>
          <input type="checkbox" checked={screenshotBlocked} onChange={(e) => setScreenshotBlocked(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
          <div>
            <strong>Block right-click & screenshot shortcuts</strong>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Disables right-click context menu and common screenshot key combos.</p>
          </div>
        </label>
      </div>

      {/* Quiz Rules */}
      <div style={cardStyle}>
        <p style={sectionLabel}>Quiz Rules</p>
        <label style={checkboxRow}>
          <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
          <div>
            <strong>Shuffle questions</strong>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Each student sees questions in a different random order.</p>
          </div>
        </label>
        <label style={checkboxRow}>
          <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
          <div>
            <strong>Shuffle options</strong>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Option order is randomized per question per student.</p>
          </div>
        </label>
        <label style={checkboxRow}>
          <input type="checkbox" checked={negativeMarking} onChange={(e) => setNegativeMarking(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
          <div>
            <strong>Negative marking</strong>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)" }}>Deduct marks for wrong answers. Unanswered questions have no penalty.</p>
          </div>
        </label>
        {negativeMarking && (
          <div className="form-field" style={{ paddingLeft: "2rem" }}>
            <span className="form-field__label">Deduction per wrong answer (fraction of marks)</span>
            <select style={{ ...inputStyle, maxWidth: "200px" }} value={negativeMarkValue} onChange={(e) => setNegativeMarkValue(Number(e.target.value))}>
              <option value={0.25}>0.25× (quarter)</option>
              <option value={0.33}>0.33× (third)</option>
              <option value={0.5}>0.50× (half)</option>
              <option value={1}>1.00× (full)</option>
            </select>
          </div>
        )}
        <div className="form-field">
          <span className="form-field__label">Max attempts per student: {maxAttempts}</span>
          <input type="range" min={1} max={5} step={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} style={{ width: "100%", maxWidth: "300px", accentColor: "var(--color-accent)" }} />
        </div>
      </div>

      {/* Publish Settings */}
      <div style={cardStyle}>
        <p style={sectionLabel}>Publish Settings</p>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
          <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} style={{ accentColor: "var(--color-accent)", width: "auto" }} />
          <span><strong>Make quiz live immediately</strong></span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <span className="form-field__label">Start Time (optional)</span>
            <input style={inputStyle} type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="form-field">
            <span className="form-field__label">End Time (optional)</span>
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
          <div
            key={qi}
            style={{ border: "1px solid var(--color-ink)", marginBottom: "1rem", background: "var(--color-paper)" }}
          >
            {/* Question Header */}
            <div
              style={{ padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: expandedIdx === qi ? "1px solid var(--color-ink)" : "none" }}
              onClick={() => setExpandedIdx(expandedIdx === qi ? null : qi)}
            >
              <span style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.8rem", textTransform: "uppercase" }}>
                Question {qi + 1}{q.prompt ? `: ${q.prompt.slice(0, 50)}${q.prompt.length > 50 ? "…" : ""}` : " — (empty)"}
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
                  <textarea style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }} placeholder="Type your question here..." value={q.prompt} onChange={(e) => updateQuestion(qi, "prompt", e.target.value)} />
                </div>
                <div className="form-field">
                  <span className="form-field__label">Hint / Context (optional)</span>
                  <input style={inputStyle} type="text" placeholder="Brief hint shown to students" value={q.context} onChange={(e) => updateQuestion(qi, "context", e.target.value)} />
                </div>

                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <span className="form-field__label">Options — select the correct answer</span>
                  {(["A", "B", "C", "D"] as const).map((letter, oi) => (
                    <div key={letter} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name={`correct-${qi}`}
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
                        value={q.options[oi]}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="form-field">
                  <span className="form-field__label">Explanation (shown in results after submission)</span>
                  <textarea style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} placeholder="Why this answer is correct..." value={q.explanation ?? ""} onChange={(e) => updateQuestion(qi, "explanation", e.target.value)} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status + Actions */}
      {statusMsg && (
        <div style={{
          padding: "1rem",
          border: `2px solid ${statusMsg.startsWith("✓") || statusMsg.startsWith("✨") ? "var(--color-olive)" : "var(--color-accent)"}`,
          background: statusMsg.startsWith("✓") || statusMsg.startsWith("✨") ? "rgba(163,177,138,0.1)" : "rgba(191,97,106,0.1)",
          color: statusMsg.startsWith("✓") || statusMsg.startsWith("✨") ? "var(--color-olive)" : "var(--color-accent)",
          marginBottom: "1rem",
          fontWeight: "600",
          fontSize: "0.9rem",
        }}>
          {statusMsg}
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" onClick={() => void save(false)} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save as Draft"}
        </button>
        <button type="button" className="btn-primary" onClick={() => void save(true)} disabled={isSaving}>
          {isSaving ? "Publishing..." : "Publish Live"}
        </button>
      </div>
    </div>
  );
}
