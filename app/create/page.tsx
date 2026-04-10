"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { QuizBuilder, type DraftQuestion } from "@/components/teacher/QuizBuilder";
import { StudyMaterialUploader } from "@/components/teacher/StudyMaterialUploader";

type Tab = "manual" | "ai";

export default function TeacherCreatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("manual");
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<DraftQuestion[]>([]);

  const handleQuestionsGenerated = (questions: DraftQuestion[]) => {
    setAiGeneratedQuestions(questions);
    setActiveTab("manual");
  };

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "0.75rem 1.5rem",
    border: "2px solid var(--color-ink)",
    borderBottom: activeTab === tab ? "2px solid var(--color-paper)" : "2px solid var(--color-ink)",
    background: activeTab === tab ? "var(--color-paper)" : "var(--color-panel)",
    cursor: "pointer",
    fontFamily: "var(--font-label), monospace",
    fontSize: "0.8rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "-2px",
    position: "relative",
    zIndex: activeTab === tab ? 1 : 0,
  });

  return (
    <AppShell activeNav="create">
      <div className="page-shell">
        <section className="page-intro">
          <div className="page-intro__top">
            <div className="page-intro__copy">
              <p className="eyebrow">Teacher Tools</p>
              <h1 className="page-title">Create New Quiz</h1>
              <p className="page-lede">
                Build questions manually or upload a study document and let AI (AWS Bedrock) generate questions for you.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => router.push("/dashboard")}
              >
                ← My Quizzes
              </button>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div style={{ marginBottom: "0" }}>
          <div style={{ display: "flex", borderBottom: "2px solid var(--color-ink)", position: "relative" }}>
            <button type="button" style={tabStyle("manual")} onClick={() => setActiveTab("manual")}>
              ✏️ Build Manually
            </button>
            <button type="button" style={tabStyle("ai")} onClick={() => setActiveTab("ai")}>
              ✨ Generate with AI
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: "2rem 0" }}>
          {activeTab === "manual" ? (
            <QuizBuilder
              key={aiGeneratedQuestions.length} // re-mount when AI questions change
              initialQuestions={aiGeneratedQuestions.length > 0 ? aiGeneratedQuestions : undefined}
              onSaved={() => router.push("/dashboard")}
            />
          ) : (
            <div style={{ maxWidth: "860px" }}>
              <div style={{ border: "2px solid var(--color-ink)", padding: "1.5rem", background: "var(--color-panel)", marginBottom: "1.5rem" }}>
                <p style={{ fontFamily: "var(--font-label), monospace", fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  How it works
                </p>
                <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.5rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
                  <li>Upload a PDF, DOCX, or TXT study document (lecture notes, textbook chapter, etc.)</li>
                  <li>Choose number of questions, difficulty level, and optionally focus on a specific topic</li>
                  <li>AWS Bedrock deeply analyzes the material and generates MCQ questions with explanations</li>
                  <li>Questions load into the Quiz Builder — review, edit, and publish</li>
                </ol>
              </div>
              <StudyMaterialUploader onQuestionsGenerated={handleQuestionsGenerated} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
