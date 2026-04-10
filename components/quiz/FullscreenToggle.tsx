interface FullscreenToggleProps {
  isFullscreenActive: boolean;
  isSubmitted: boolean;
  isLocked: boolean;
  onEnterFullscreen: () => void;
}

export function FullscreenToggle({
  isFullscreenActive,
  isSubmitted,
  isLocked,
  onEnterFullscreen,
}: FullscreenToggleProps) {
  return (
    <section className="content-card">
      <header className="content-card__header">
        <p className="eyebrow">Fullscreen mode</p>
        <h2 className="content-card__title">Keep the quiz in a focused workspace.</h2>
        <p className="content-card__copy">
          Leaving fullscreen during an active attempt triggers a warning in the security panel.
        </p>
      </header>

      <div className="content-card__body">
        <div className="quiz-card__stats">
          <span className="quiz-card__stat">{isFullscreenActive ? "Fullscreen active" : "Standard window"}</span>
        </div>

        <div className="panel-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={isFullscreenActive || isSubmitted || isLocked}
            onClick={onEnterFullscreen}
          >
            {isFullscreenActive ? "Fullscreen active" : "Enter fullscreen"}
          </button>
        </div>
      </div>
    </section>
  );
}
