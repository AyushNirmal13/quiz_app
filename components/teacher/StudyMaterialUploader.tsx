"use client";

import { useRef, useState } from "react";

import type { DraftQuestion } from "@/components/teacher/QuizBuilder";

interface StudyMaterialUploaderProps {
  onQuestionsGenerated: (questions: DraftQuestion[]) => void;
}

type UploadState = "idle" | "uploading" | "uploaded" | "generating" | "done" | "error";

export function StudyMaterialUploader({ onQuestionsGenerated }: StudyMaterialUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [materialId, setMaterialId] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [topicFocus, setTopicFocus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);

  const handleUpload = async (file: File) => {
    setState("uploading");
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/study-material", { method: "POST", body: form });
      const data = await res.json() as { success: boolean; message?: string; materialId?: string; fileName?: string; previewText?: string };

      if (!res.ok || !data.success) {
        setErrorMsg(data.message ?? "Upload failed.");
        setState("error");
        return;
      }

      setMaterialId(data.materialId ?? "");
      setFileName(data.fileName ?? file.name);
      setPreviewText(data.previewText ?? "");
      setState("uploaded");
    } catch {
      setErrorMsg("Network error during upload.");
      setState("error");
    }
  };

  const handleGenerate = async () => {
    setState("generating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/study-material/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, questionCount, difficulty, topicFocus: topicFocus.trim() || undefined }),
      });
      const data = await res.json() as { success?: boolean; status?: string; message?: string; questions?: DraftQuestion[] };

      if (!res.ok || (data.status !== "success" && !data.success) || !data.questions) {
        setErrorMsg(data.message ?? "Generation failed.");
        setState("error");
        return;
      }

      setGeneratedCount(data.questions.length);
      setState("done");
      onQuestionsGenerated(data.questions);
    } catch {
      setErrorMsg("Network error during generation.");
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setMaterialId("");
    setFileName("");
    setPreviewText("");
    setTopicFocus("");
    setErrorMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const boxStyle: React.CSSProperties = {
    border: "2px dashed var(--color-ink)",
    padding: "2.5rem",
    textAlign: "center",
    background: "var(--color-panel)",
    cursor: "pointer",
  };

  const cardStyle: React.CSSProperties = {
    border: "2px solid var(--color-ink)",
    padding: "1.5rem",
    background: "var(--color-panel)",
    display: "grid",
    gap: "1rem",
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

  if (state === "idle" || state === "error") {
    return (
      <div style={{ display: "grid", gap: "1rem" }}>
        <div
          style={boxStyle}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void handleUpload(file);
          }}
        >
          <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>📄</p>
          <p style={{ margin: 0, fontWeight: "600" }}>Drop a PDF, DOCX, or TXT file here</p>
          <p style={{ margin: "0.25rem 0 1rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>Max 10MB — AWS Bedrock will generate quiz questions from the content</p>
          <button type="button" className="btn-secondary">Browse File</button>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }} />
        {state === "error" && <p style={{ color: "var(--color-accent)", margin: 0 }}>{errorMsg}</p>}
      </div>
    );
  }

  if (state === "uploading") {
    return (
      <div style={{ ...boxStyle, cursor: "default" }}>
        <p style={{ margin: 0, fontWeight: "600" }}>Uploading and extracting text...</p>
        <p style={{ color: "var(--color-muted)", margin: "0.5rem 0 0" }}>This may take a moment for large documents.</p>
      </div>
    );
  }

  if (state === "generating") {
    return (
      <div style={{ ...boxStyle, cursor: "default" }}>
        <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>✨</p>
        <p style={{ margin: 0, fontWeight: "600" }}>AWS Bedrock is analyzing your document and generating questions...</p>
        <p style={{ color: "var(--color-muted)", margin: "0.5rem 0 0" }}>
          Generating {questionCount} questions at {difficulty} difficulty
          {topicFocus ? ` focused on "${topicFocus}"` : ""}.
          This may take 15–40 seconds.
        </p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: "var(--color-olive)", fontWeight: "600" }}>✓ {generatedCount} questions generated from &quot;{fileName}&quot;</p>
        <p style={{ margin: 0, color: "var(--color-muted)" }}>They&apos;ve been loaded into the quiz builder. Review and edit them before publishing.</p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button type="button" className="btn-secondary" onClick={reset}>Upload another file</button>
        </div>
      </div>
    );
  }

  // state === "uploaded"
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <p style={{ margin: 0, fontWeight: "600" }}>📄 {fileName}</p>
            <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.85rem" }}>File uploaded successfully. Preview:</p>
          </div>
          <button type="button" className="btn-secondary" onClick={reset} style={{ minHeight: "36px", padding: "0.4rem 0.75rem" }}>✕ Remove</button>
        </div>
        {previewText && (
          <div style={{ padding: "0.85rem", border: "1px solid var(--color-ink)", background: "var(--color-paper)", maxHeight: "120px", overflow: "auto", fontSize: "0.85rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
            {previewText}...
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <p style={{ margin: 0, fontWeight: "600" }}>Generation Settings</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-field">
            <span className="form-field__label">Number of Questions</span>
            <input
              style={inputStyle}
              type="number"
              min={3}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <span className="form-field__label">Difficulty</span>
            <select
              style={inputStyle}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Easy">Easy — Factual recall</option>
              <option value="Intermediate">Medium — Conceptual understanding</option>
              <option value="Hard">Hard — Analytical / Application</option>
              <option value="Mixed">Mixed — All levels combined</option>
            </select>
          </div>
        </div>
        <div className="form-field">
          <span className="form-field__label">Topic Focus (optional)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="e.g. Normalization, Polymorphism, Neural Networks..."
            value={topicFocus}
            onChange={(e) => setTopicFocus(e.target.value)}
          />
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
            Leave blank to generate from the entire document. Specify a topic to prioritize questions from that area.
          </p>
        </div>

        <div style={{ padding: "0.85rem", border: "1px solid var(--color-ink)", background: "var(--color-paper)", fontSize: "0.82rem", color: "var(--color-muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--color-ink)" }}>AI Generation Rules:</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
            <li>Questions are rephrased — not copied from the document</li>
            <li>Each question includes 4 options + explanation</li>
            <li>No duplicate or ambiguous questions</li>
            <li>Difficulty is strictly enforced per your selection</li>
          </ul>
        </div>

        <button type="button" className="btn-primary" onClick={() => void handleGenerate()}>
          ✨ Generate Questions with AWS Bedrock
        </button>
        {errorMsg && <p style={{ color: "var(--color-accent)", margin: 0 }}>{errorMsg}</p>}
      </div>
    </div>
  );
}
