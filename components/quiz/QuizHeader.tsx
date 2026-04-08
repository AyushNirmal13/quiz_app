interface QuizHeaderProps {
  quizLabel: string;
  title: string;
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
  timeRemaining: string;
  violationCount: number;
  isFullscreenActive: boolean;
}

export function QuizHeader({
  quizLabel,
  title,
  currentQuestion,
  totalQuestions,
  answeredCount,
  timeRemaining,
  violationCount,
  isFullscreenActive,
}: QuizHeaderProps) {
  return (
    <section className="content-card">
      <header className="content-card__header">
        <p className="eyebrow">{quizLabel}</p>
        <h1 className="content-card__title">{title}</h1>
        <p className="content-card__copy">
          Move through the quiz questions, keep an eye on the timer, and submit when you are ready.
        </p>
      </header>

      <div className="content-card__body">
        <div className="quiz-card__stats">
          <span className="quiz-card__stat">Timer {timeRemaining}</span>
          <span className="quiz-card__stat">
            Question {currentQuestion} of {totalQuestions}
          </span>
          <span className="quiz-card__stat">{answeredCount} answered</span>
          <span className="quiz-card__stat">{isFullscreenActive ? "Fullscreen active" : "Fullscreen off"}</span>
          <span className="quiz-card__stat">{violationCount} warnings</span>
        </div>

        <div className="progress-block">
          <progress className="progress-track" value={Math.max(currentQuestion, answeredCount)} max={totalQuestions}>
            {Math.max(currentQuestion, answeredCount)}/{totalQuestions}
          </progress>
          <div className="progress-copy">
            <span>Progress visible at a glance</span>
            <span>{totalQuestions - answeredCount} remaining</span>
          </div>
        </div>
      </div>
    </section>
  );
}
