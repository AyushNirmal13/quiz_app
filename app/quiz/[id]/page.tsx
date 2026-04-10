"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { ActionBar } from "@/components/quiz/ActionBar";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { QuestionNavigator } from "@/components/quiz/QuestionNavigator";
import { QuizHeader } from "@/components/quiz/QuizHeader";
import { SecurityWarning } from "@/components/quiz/SecurityWarning";
import { fetchCurrentUser } from "@/lib/auth-client";
import { parseDurationMinutes } from "@/lib/quiz-utils";
import type { QuizDetail } from "@/types/quiz";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function seededShuffle<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = ((hash < 0 ? -hash : hash) % (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Toast Notification ────────────────────────────────────────────────────────
function Toast({ message, type = "info" }: { message: string; type?: "info" | "warning" | "error" }) {
  const bg = type === "error" ? "var(--color-accent)" : type === "warning" ? "#b86e00" : "var(--color-ink)";
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      background: bg, color: "var(--color-paper)", padding: "0.6rem 1.25rem",
      fontSize: "0.82rem", zIndex: 10000, fontFamily: "var(--font-label), monospace",
      letterSpacing: "0.04em", animation: "fadeIn 0.2s ease",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      {message}
    </div>
  );
}

// ── Camera Gate ───────────────────────────────────────────────────────────────
function CameraGate({ onGrant, denied }: { onGrant: () => void; denied: boolean }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div style={{ maxWidth: "480px", border: "2px solid var(--color-ink)", padding: "2.5rem", background: "var(--color-panel)", textAlign: "center" }}>
        <p style={{ fontSize: "3rem", margin: "0 0 1rem" }}>📷</p>
        <h2 className="section-title">Camera Access Required</h2>
        <p className="section-copy">This quiz requires webcam proctoring. Your camera is only active during the attempt and is not recorded.</p>
        {denied ? (
          <div>
            <p style={{ color: "var(--color-accent)", marginBottom: "1rem" }}>Camera access denied. Enable it in your browser settings and reload.</p>
            <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>Reload Page</button>
          </div>
        ) : (
          <button type="button" className="btn-primary" onClick={onGrant}>Grant Camera &amp; Start Quiz</button>
        )}
      </div>
    </div>
  );
}

// ── Quiz Instructions ─────────────────────────────────────────────────────────
function QuizInstructions({ quiz, onStart }: { quiz: QuizDetail; onStart: () => void }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div style={{ maxWidth: "560px", border: "2px solid var(--color-ink)", padding: "2.5rem", background: "var(--color-panel)" }}>
        <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>{quiz.id}</p>
        <h2 className="section-title" style={{ marginBottom: "1rem" }}>{quiz.title}</h2>
        {quiz.description && <p className="section-copy" style={{ marginBottom: "1.5rem" }}>{quiz.description}</p>}

        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.5rem", fontSize: "0.88rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-ink)" }}>
            <span>📝 Total Questions</span><strong>{quiz.questions.length}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-ink)" }}>
            <span>⏱️ Duration</span><strong>{quiz.duration}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-ink)" }}>
            <span>📊 Difficulty</span><strong>{quiz.difficulty}</strong>
          </div>
          {quiz.negativeMarking && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-ink)", color: "var(--color-accent)" }}>
              <span>⚠️ Negative Marking</span><strong>{quiz.negativeMarkValue ?? 0.25}× deduction</strong>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--color-ink)" }}>
            <span>🔄 Max Attempts</span><strong>{quiz.maxAttempts}</strong>
          </div>
        </div>

        <div style={{ background: "var(--color-paper)", border: "1px solid var(--color-ink)", padding: "1rem", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
          <strong style={{ display: "block", marginBottom: "0.5rem" }}>📋 Instructions:</strong>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.35rem", color: "var(--color-muted)" }}>
            <li>Read each question carefully before answering.</li>
            <li>You can navigate between questions freely.</li>
            <li>Use &quot;Mark for Review&quot; to flag questions you want to revisit.</li>
            <li>Your answers are auto-saved as you go.</li>
            {quiz.negativeMarking && <li style={{ color: "var(--color-accent)" }}>Wrong answers will attract negative marks. Leave unsure questions blank.</li>}
            {quiz.surveillanceSettings.screenLocked && <li>The quiz runs in fullscreen. Exiting fullscreen counts as a violation.</li>}
            <li>The quiz auto-submits when time runs out.</li>
          </ul>
        </div>

        <button type="button" className="btn-primary" style={{ width: "100%" }} onClick={onStart}>
          Start Quiz →
        </button>
      </div>
    </div>
  );
}

// ── Confirmation Dialog ───────────────────────────────────────────────────────
function ConfirmSubmitDialog({
  answeredCount, totalQuestions, markedCount, onConfirm, onCancel,
}: {
  answeredCount: number; totalQuestions: number; markedCount: number;
  onConfirm: () => void; onCancel: () => void;
}) {
  const unanswered = totalQuestions - answeredCount;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid",
      placeItems: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "var(--color-paper)", border: "2px solid var(--color-ink)",
        padding: "2rem", maxWidth: "420px", width: "90%",
      }}>
        <h3 style={{ marginTop: 0 }}>Submit Quiz?</h3>
        <p className="section-copy">
          You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
        </p>
        {unanswered > 0 && (
          <p style={{ color: "var(--color-accent)", fontSize: "0.88rem", fontWeight: 600 }}>
            ⚠ You have {unanswered} unanswered question{unanswered !== 1 ? "s" : ""}.
          </p>
        )}
        {markedCount > 0 && (
          <p style={{ color: "#b86e00", fontSize: "0.88rem" }}>
            🔖 {markedCount} question{markedCount !== 1 ? "s are" : " is"} marked for review.
          </p>
        )}
        <p className="section-copy" style={{ fontSize: "0.82rem", color: "var(--color-accent)" }}>
          ⚠ This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
          <button type="button" className="btn-secondary" onClick={onCancel} style={{ flex: 1 }}>Go Back</button>
          <button type="button" className="btn-primary" onClick={onConfirm} style={{ flex: 1 }}>Submit</button>
        </div>
      </div>
    </div>
  );
}

// ── Network Status Banner ─────────────────────────────────────────────────────
function NetworkBanner() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 10001,
      background: "var(--color-accent)", color: "var(--color-paper)",
      padding: "0.5rem 1rem", textAlign: "center", fontSize: "0.85rem",
      fontWeight: 600,
    }}>
      ⚠ You are offline. Your answers are saved locally and will sync when connection restores.
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Quiz session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [violations, setViolations] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "info" | "warning" | "error" } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  // Map: questionIndex -> { shuffledOptionIdx -> originalOptionIdx }
  const [optionShuffleMap, setOptionShuffleMap] = useState<Record<number, Record<number, number>>>({});
  const startedAtRef = useRef<string>(new Date().toISOString());
  const submitGuardRef = useRef(false); // Prevent double submission

  // Show toast with auto-dismiss
  const showToast = useCallback((text: string, type: "info" | "warning" | "error" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  // Network status listener
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); showToast("Connection restored ✓", "info"); };
    const goOffline = () => { setIsOnline(false); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [showToast]);

  // Multi-tab prevention
  useEffect(() => {
    const channelKey = `quiz_active_${quizId}`;
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelKey) : null;
    if (bc) {
      bc.postMessage("new_tab");
      bc.onmessage = (e) => {
        if (e.data === "new_tab") {
          setLoadError("This quiz is already open in another tab. Please close this tab and use the other one.");
          setIsLoading(false);
        }
      };
    }
    return () => bc?.close();
  }, [quizId]);

  // Load quiz
  useEffect(() => {
    const load = async () => {
      const user = await fetchCurrentUser();
      if (!user) {
        router.replace(`/auth/login?redirect=/quiz/${quizId}`);
        return;
      }
      const res = await fetch(`/api/quizzes/${quizId}`, { cache: "no-store" });
      const data = await res.json() as { success: boolean; quiz?: QuizDetail; message?: string };

      if (!res.ok || !data.success || !data.quiz) {
        setLoadError(data.message ?? "Quiz not found.");
        setIsLoading(false);
        return;
      }

      let q = data.quiz;
      if (q.shuffleQuestions) {
        q = { ...q, questions: seededShuffle(q.questions, user.id + quizId) };
      }
      if (q.shuffleOptions) {
        const shuffleMap: Record<number, Record<number, number>> = {};
        q = {
          ...q,
          questions: q.questions.map((question, qi) => {
            const originalOptions = question.options;
            const shuffledOptions = seededShuffle(question.options, user.id + quizId + qi);
            // Build mapping: shuffledIdx -> originalIdx (handles duplicate option texts)
            const indexMap: Record<number, number> = {};
            const usedOriginals = new Set<number>();
            shuffledOptions.forEach((opt, shuffledIdx) => {
              let originalIdx = -1;
              for (let oi = 0; oi < originalOptions.length; oi++) {
                if (originalOptions[oi] === opt && !usedOriginals.has(oi)) {
                  originalIdx = oi;
                  break;
                }
              }
              if (originalIdx === -1) originalIdx = originalOptions.indexOf(opt);
              usedOriginals.add(originalIdx);
              indexMap[shuffledIdx] = originalIdx;
            });
            shuffleMap[question.index] = indexMap;
            return { ...question, options: shuffledOptions };
          }),
        };
        setOptionShuffleMap(shuffleMap);
      }

      setQuiz(q);
      startedAtRef.current = new Date().toISOString();

      // Restore persisted state
      const timerKey = `quiz_timer_${quizId}`;
      const answersKey = `quiz_answers_${quizId}`;
      const reviewKey = `quiz_review_${quizId}`;
      const savedTimer = sessionStorage.getItem(timerKey);
      const savedAnswers = sessionStorage.getItem(answersKey);
      const savedReview = sessionStorage.getItem(reviewKey);
      const durationSecs = parseDurationMinutes(q.duration) * 60;
      setTimeLeftSeconds(savedTimer ? Math.min(parseInt(savedTimer, 10), durationSecs) : durationSecs);

      if (savedAnswers) {
        try { setAnswers(JSON.parse(savedAnswers) as Record<number, number>); } catch { /* ignore */ }
      }
      if (savedReview) {
        try { setMarkedForReview(new Set(JSON.parse(savedReview) as number[])); } catch { /* ignore */ }
      }

      // If timer or answers already exist, skip instructions (resuming)
      if (savedTimer || savedAnswers) {
        setShowInstructions(false);
      }

      setCameraGranted(q.surveillanceSettings.cameraRequired ? null : true);
      setIsLoading(false);
    };
    void load();
  }, [quizId, router]);

  // Camera
  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraGranted(true);
    } catch {
      setCameraGranted(false);
    }
  }, []);

  // Submit attempt
  const submitAttempt = useCallback(async (extraViolations?: string[]) => {
    if (!quiz || isSubmitting || isSubmitted || submitGuardRef.current) return;
    submitGuardRef.current = true;
    setIsSubmitting(true);
    setShowConfirm(false);

    const formattedAnswers = quiz.questions.map((q) => {
      const shuffledIdx = answers[q.index] ?? null;
      // Map back to original index if options were shuffled
      let originalIdx = shuffledIdx;
      if (shuffledIdx !== null && optionShuffleMap[q.index]) {
        originalIdx = optionShuffleMap[q.index][shuffledIdx] ?? shuffledIdx;
      }
      return {
        questionIndex: q.index,
        selectedAnswer: originalIdx,
      };
    });

    const timeTakenSeconds = parseDurationMinutes(quiz.duration) * 60 - timeLeftSeconds;
    const violationCount = (extraViolations ?? violations).length;

    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          answers: formattedAnswers,
          timeTakenSeconds,
          violationCount,
          startedAt: startedAtRef.current,
        }),
      });
      const data = await res.json() as { success: boolean; attempt?: { id: string }; message?: string };

      if (data.success && data.attempt?.id) {
        setIsSubmitted(true);
        sessionStorage.removeItem(`quiz_timer_${quizId}`);
        sessionStorage.removeItem(`quiz_answers_${quizId}`);
        sessionStorage.removeItem(`quiz_review_${quizId}`);

        // ── Cleanup: Stop camera, exit fullscreen ──
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }

        router.replace(`/results/${data.attempt.id}`);
      } else {
        showToast(data.message ?? "Submission failed. Please try again.", "error");
        setIsSubmitting(false);
        submitGuardRef.current = false;
      }
    } catch {
      showToast("Network error. Your answers are saved locally. Retrying...", "error");
      setIsSubmitting(false);
      submitGuardRef.current = false;
      // Auto-retry in 5s
      setTimeout(() => void submitAttempt(extraViolations), 5000);
    }
  }, [quiz, isSubmitting, isSubmitted, answers, timeLeftSeconds, violations, quizId, router, showToast, optionShuffleMap]);

  // Countdown timer
  useEffect(() => {
    if (!quiz || cameraGranted !== true || showInstructions || isLocked || isSubmitted || isSubmitting) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        const next = prev - 1;
        sessionStorage.setItem(`quiz_timer_${quizId}`, String(next));
        if (next <= 0) { clearInterval(interval); void submitAttempt(); }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, cameraGranted, showInstructions, isLocked, isSubmitted, isSubmitting, quizId]);

  // Auto-save answers + review markers to sessionStorage
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem(`quiz_answers_${quizId}`, JSON.stringify(answers));
    }
  }, [answers, quizId]);

  useEffect(() => {
    if (markedForReview.size > 0) {
      sessionStorage.setItem(`quiz_review_${quizId}`, JSON.stringify([...markedForReview]));
    }
  }, [markedForReview, quizId]);

  // Auto-submit when locked
  useEffect(() => {
    if (isLocked && !isSubmitted && !isSubmitting) void submitAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  // Tab-switch / fullscreen-exit detection
  useEffect(() => {
    if (!quiz?.surveillanceSettings.screenLocked || showInstructions) return;
    const addViolation = (reason: string) => {
      if (isSubmitted) return;
      setViolations((prev) => {
        const updated = [...prev, `${reason} at ${new Date().toLocaleTimeString()}`];
        if (updated.length >= 3) setIsLocked(true);
        return updated;
      });
    };
    const onVisibility = () => { if (document.hidden) addViolation("Tab switch"); };
    const onFullscreen = () => { if (!document.fullscreenElement) addViolation("Fullscreen exit"); };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [quiz, isSubmitted, showInstructions]);

  // Context-menu / print block
  useEffect(() => {
    if (!quiz?.surveillanceSettings.screenshotBlocked) return;
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    const blockKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || (e.ctrlKey && e.key === "p")) e.preventDefault();
    };
    document.addEventListener("contextmenu", blockCtx);
    document.addEventListener("keydown", blockKey);
    return () => {
      document.removeEventListener("contextmenu", blockCtx);
      document.removeEventListener("keydown", blockKey);
    };
  }, [quiz]);

  // Enter fullscreen
  useEffect(() => {
    if (cameraGranted === true && !showInstructions && quiz?.surveillanceSettings.screenLocked) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [cameraGranted, showInstructions, quiz]);

  // Keyboard navigation (Arrow keys, 1-4 for options)
  useEffect(() => {
    if (!quiz || isLocked || isSubmitted || isSubmitting || showInstructions) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(quiz.questions.length - 1, i + 1));
      } else if (e.key >= "1" && e.key <= "4") {
        const optIdx = parseInt(e.key, 10) - 1;
        const q = quiz.questions[currentIndex];
        if (q && optIdx < q.options.length) {
          setAnswers((prev) => ({ ...prev, [q.index]: optIdx }));
          showToast("Answer saved ✓");
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [quiz, isLocked, isSubmitted, isSubmitting, showInstructions, currentIndex, showToast]);

  // Warn before closing browser/tab
  useEffect(() => {
    if (!quiz || isSubmitted) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [quiz, isSubmitted]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <AppShell>
      <div className="page-shell"><p className="section-copy">Loading quiz...</p></div>
    </AppShell>
  );

  if (loadError || !quiz) return (
    <AppShell>
      <div className="page-shell">
        <p className="section-copy" style={{ color: "var(--color-accent)" }}>{loadError || "Quiz not found."}</p>
        <Link href="/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>
    </AppShell>
  );

  // Camera gate
  if (cameraGranted !== true) return (
    <AppShell>
      <div className="page-shell">
        <video ref={videoRef} style={{ display: "none" }} muted playsInline />
        <CameraGate onGrant={() => void requestCamera()} denied={cameraGranted === false} />
      </div>
    </AppShell>
  );

  // Instructions screen
  if (showInstructions) return (
    <AppShell>
      <div className="page-shell">
        <QuizInstructions quiz={quiz} onStart={() => setShowInstructions(false)} />
      </div>
    </AppShell>
  );

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <AppShell>
      {!isOnline && <NetworkBanner />}
      {toastMessage && <Toast message={toastMessage.text} type={toastMessage.type} />}

      {showConfirm && (
        <ConfirmSubmitDialog
          answeredCount={answeredCount}
          totalQuestions={quiz.questions.length}
          markedCount={markedForReview.size}
          onConfirm={() => void submitAttempt()}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {quiz.surveillanceSettings.cameraRequired && (
        <video
          ref={videoRef} muted playsInline
          style={{ position: "fixed", bottom: "1rem", right: "1rem", width: "120px", height: "90px", border: "2px solid var(--color-ink)", zIndex: 1000, objectFit: "cover" }}
        />
      )}

      <div className="page-shell">
        <QuizHeader
          quizLabel={quiz.id}
          title={quiz.title}
          currentQuestion={currentIndex + 1}
          totalQuestions={quiz.questions.length}
          answeredCount={answeredCount}
          timeRemaining={formatTime(timeLeftSeconds)}
          violationCount={violations.length}
          isFullscreenActive={Boolean(document.fullscreenElement)}
        />

        {quiz.negativeMarking && (
          <div style={{ padding: "0.5rem 1rem", background: "var(--color-accent)", color: "var(--color-paper)", fontSize: "0.82rem", marginBottom: "1rem" }}>
            ⚠ Negative marking: {quiz.negativeMarkValue ?? 0.25}× deduction | Unanswered = no penalty
          </div>
        )}

        {violations.length > 0 && (
          <SecurityWarning violations={violations} isLocked={isLocked} isSubmitted={isSubmitted} />
        )}

        <div className="quiz-layout">
          <div>
            {/* Marks badge */}
            {currentQuestion.marks > 1 && (
              <div style={{ fontSize: "0.78rem", fontFamily: "var(--font-label), monospace", marginBottom: "0.5rem", color: "var(--color-muted)" }}>
                This question carries {currentQuestion.marks} marks
              </div>
            )}

            <QuestionCard
              question={currentQuestion}
              selectedAnswer={answers[currentQuestion.index]}
              isInteractionLocked={isLocked || isSubmitted || isSubmitting}
              onSelectAnswer={(oi) => {
                if (!isLocked && !isSubmitted) {
                  setAnswers((prev) => ({ ...prev, [currentQuestion.index]: oi }));
                  showToast("Answer saved ✓");
                }
              }}
            />

            <ActionBar
              isFirstQuestion={currentIndex === 0}
              isLastQuestion={currentIndex === quiz.questions.length - 1}
              answeredCount={answeredCount}
              totalQuestions={quiz.questions.length}
              isSubmitted={isSubmitted || isSubmitting}
              isLocked={isLocked}
              isMarkedForReview={markedForReview.has(currentQuestion.index)}
              onPrevious={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              onNext={() => setCurrentIndex((i) => Math.min(quiz.questions.length - 1, i + 1))}
              onSubmit={() => setShowConfirm(true)}
              onToggleReview={() => {
                setMarkedForReview((prev) => {
                  const next = new Set(prev);
                  if (next.has(currentQuestion.index)) next.delete(currentQuestion.index);
                  else next.add(currentQuestion.index);
                  return next;
                });
              }}
            />
          </div>

          <QuestionNavigator
            currentQuestionIndex={currentIndex}
            totalQuestions={quiz.questions.length}
            answeredAnswers={answers}
            markedForReview={markedForReview}
            timeRemaining={formatTime(timeLeftSeconds)}
            isLocked={isLocked}
            isSubmitted={isSubmitted}
            onJumpToQuestion={setCurrentIndex}
          />
        </div>
      </div>
    </AppShell>
  );
}
