interface ActionBarProps {
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  answeredCount: number;
  totalQuestions: number;
  isSubmitted: boolean;
  isLocked: boolean;
  isMarkedForReview: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onToggleReview: () => void;
}

export function ActionBar({
  isFirstQuestion,
  isLastQuestion,
  answeredCount,
  totalQuestions,
  isSubmitted,
  isLocked,
  isMarkedForReview,
  onPrevious,
  onNext,
  onSubmit,
  onToggleReview,
}: ActionBarProps) {
  return (
    <section className="content-card">
      <div className="content-card__body">
        <div className="quiz-card__stats">
          <span className="quiz-card__stat">
            {answeredCount}/{totalQuestions} answered
          </span>
          <span className="quiz-card__stat">{isLastQuestion ? "Final question" : "Continue through the set"}</span>
        </div>

        <div className="panel-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={isFirstQuestion || isSubmitted || isLocked}
            onClick={onPrevious}
          >
            ← Previous
          </button>

          <button
            type="button"
            className="btn-secondary"
            disabled={isSubmitted || isLocked}
            onClick={onToggleReview}
            style={{
              borderColor: isMarkedForReview ? "var(--color-accent)" : undefined,
              color: isMarkedForReview ? "var(--color-accent)" : undefined,
            }}
          >
            {isMarkedForReview ? "🔖 Unmark" : "🔖 Mark for Review"}
          </button>

          <button
            type="button"
            className="btn-secondary"
            disabled={isLastQuestion || isSubmitted || isLocked}
            onClick={onNext}
          >
            Next →
          </button>

          <button type="button" className="btn-primary" disabled={isSubmitted} onClick={onSubmit}>
            {isSubmitted ? "Submitted" : "Submit attempt"}
          </button>
        </div>
      </div>
    </section>
  );
}
