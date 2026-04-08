interface QuestionNavigatorProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredAnswers: Record<number, number>;
  markedForReview: Set<number>;
  timeRemaining: string;
  isLocked: boolean;
  isSubmitted: boolean;
  onJumpToQuestion: (questionIndex: number) => void;
}

export function QuestionNavigator({
  currentQuestionIndex,
  totalQuestions,
  answeredAnswers,
  markedForReview,
  timeRemaining,
  isLocked,
  isSubmitted,
  onJumpToQuestion,
}: QuestionNavigatorProps) {
  const answeredCount = Object.keys(answeredAnswers).length;
  const markedCount = markedForReview.size;
  const unansweredCount = totalQuestions - answeredCount;
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const panelStyle: React.CSSProperties = {
    display: "grid",
    gap: "1rem",
    border: "2px solid var(--color-ink)",
    padding: "1.25rem",
    background: "var(--color-panel)",
    position: "relative",
  };

  return (
    <aside style={panelStyle}>
      <div className="sidebar-panel__header">
        <p className="sidebar-panel__label">Question navigator</p>
        <h2 className="sidebar-panel__title">Jump between items</h2>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.35rem" }}>
          <span>{progressPct}% complete</span>
          <span>{answeredCount}/{totalQuestions}</span>
        </div>
        <div style={{ height: "6px", background: "var(--color-paper)", border: "1px solid var(--color-ink)" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--color-accent)", transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.72rem", fontFamily: "var(--font-label), monospace" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "12px", height: "12px", background: "var(--color-ink)", border: "1px solid var(--color-ink)", display: "inline-block" }} /> Current
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "12px", height: "12px", background: "var(--color-accent)", border: "1px solid var(--color-ink)", display: "inline-block" }} /> Answered
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "12px", height: "12px", background: "var(--color-paper)", border: "2px solid var(--color-accent)", display: "inline-block" }} /> Review
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "12px", height: "12px", background: "var(--color-paper)", border: "1px solid var(--color-ink)", display: "inline-block" }} /> Not visited
        </span>
      </div>

      <ol className="question-nav" aria-label="Question navigation">
        {Array.from({ length: totalQuestions }, (_, index) => {
          const questionIdx = index + 1;
          const isCurrent = index === currentQuestionIndex;
          const isAnswered = answeredAnswers[questionIdx] !== undefined;
          const isMarked = markedForReview.has(questionIdx);

          const btnStyle: React.CSSProperties = {
            minHeight: "42px",
            display: "grid",
            placeItems: "center",
            border: isMarked ? "2px solid var(--color-accent)" : "1px solid var(--color-ink)",
            fontFamily: "var(--font-label), monospace",
            fontSize: "0.76rem",
            cursor: isLocked || isSubmitted ? "default" : "pointer",
            background: isCurrent
              ? "var(--color-ink)"
              : isAnswered
                ? "var(--color-accent)"
                : "var(--color-paper)",
            color: isCurrent || isAnswered ? "var(--color-paper)" : "var(--color-ink)",
            width: "100%",
            position: "relative",
          };

          return (
            <li key={questionIdx}>
              <button
                type="button"
                style={btnStyle}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Question ${questionIdx}${isAnswered ? ", answered" : ""}${isMarked ? ", marked for review" : ""}`}
                disabled={isLocked || isSubmitted}
                onClick={() => onJumpToQuestion(index)}
              >
                {questionIdx}
                {isMarked && (
                  <span style={{ position: "absolute", top: "-4px", right: "-4px", fontSize: "0.6rem", lineHeight: 1 }}>🔖</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <dl className="detail-list">
        <div className="detail-list__row">
          <dt>Answered</dt>
          <dd style={{ color: "var(--color-olive)" }}>{answeredCount}/{totalQuestions}</dd>
        </div>
        <div className="detail-list__row">
          <dt>Unanswered</dt>
          <dd style={{ color: unansweredCount > 0 ? "var(--color-accent)" : "inherit" }}>{unansweredCount}</dd>
        </div>
        {markedCount > 0 && (
          <div className="detail-list__row">
            <dt>Marked for Review</dt>
            <dd style={{ color: "var(--color-accent)" }}>{markedCount}</dd>
          </div>
        )}
        <div className="detail-list__row">
          <dt>Timer</dt>
          <dd>{timeRemaining}</dd>
        </div>
        <div className="detail-list__row">
          <dt>Status</dt>
          <dd>{isSubmitted ? "Submitted" : isLocked ? "Locked" : "In progress"}</dd>
        </div>
      </dl>
    </aside>
  );
}
