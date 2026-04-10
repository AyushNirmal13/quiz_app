interface SecurityWarningProps {
  violations: string[];
  isLocked: boolean;
  isSubmitted: boolean;
}

export function SecurityWarning({ violations, isLocked, isSubmitted }: SecurityWarningProps) {
  const latestWarnings = violations.slice(0, 3);

  return (
    <section className="content-card">
      <header className="content-card__header">
        <p className="eyebrow">{isLocked ? "Security lock" : violations.length > 0 ? "Security warning" : "Security monitor"}</p>
        <h2 className="content-card__title">
          {isLocked
            ? "Interaction is paused after repeated violations."
            : violations.length > 0
              ? "Return focus to the quiz and continue carefully."
              : "Quiz integrity checks are active."}
        </h2>
        <p className="content-card__copy">
          {isSubmitted
            ? "Monitoring has stopped because the attempt is already submitted."
            : "Tab switches, window blur, and fullscreen exit are all tracked during the active attempt."}
        </p>
      </header>

      <div className="content-card__body">
        <div className="quiz-card__stats">
          <span className="quiz-card__stat">{violations.length} warnings</span>
          <span className="quiz-card__stat">{isLocked ? "Locked" : isSubmitted ? "Submitted" : "Live monitoring"}</span>
        </div>

        {latestWarnings.length > 0 ? (
          <ul className="link-list">
            {latestWarnings.map((warning) => (
              <li key={warning} className="link-list__item">
                <strong>{warning}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="section-copy">No violations recorded in this session.</p>
        )}
      </div>
    </section>
  );
}
