export interface AttemptResultSummary {
  quizId: string;
  quizTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number;
  wrongAnswers: Array<{
    question: string;
    yourAnswer: string;
    correctAnswer: string;
  }>;
  submissionReason: string;
}

interface ResultSummaryProps {
  result: AttemptResultSummary;
}

export function ResultSummary({ result }: ResultSummaryProps) {
  return (
    <>
      <section className="content-card">
        <header className="content-card__header">
          <p className="eyebrow">{result.quizId}</p>
          <h2 className="content-card__title">{result.quizTitle}</h2>
          <p className="content-card__copy">Detailed scoring is loaded from saved attempt records and ready for review.</p>
        </header>

        <div className="content-card__body">
          <div className="quiz-card__stats">
            <span className="quiz-card__stat">Score {result.score}%</span>
            <span className="quiz-card__stat">Correct {result.correctAnswers}</span>
            <span className="quiz-card__stat">Incorrect {result.incorrectAnswers}</span>
            <span className="quiz-card__stat">{result.submissionReason}</span>
          </div>

          <dl className="detail-list">
            <div className="detail-list__row">
              <dt>Total questions</dt>
              <dd>{result.totalQuestions}</dd>
            </div>
            <div className="detail-list__row">
              <dt>Correct</dt>
              <dd>{result.correctAnswers}</dd>
            </div>
            <div className="detail-list__row">
              <dt>Incorrect</dt>
              <dd>{result.incorrectAnswers}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="content-card">
        <header className="content-card__header">
          <p className="eyebrow">Wrong answers</p>
          <h2 className="content-card__title">Review the misses and move forward.</h2>
        </header>

        <div className="content-card__body">
          {result.wrongAnswers.length > 0 ? (
            <ul className="link-list">
              {result.wrongAnswers.map((item) => (
                <li key={item.question} className="link-list__item">
                  <strong>{item.question}</strong>
                  <span>Your answer: {item.yourAnswer}</span>
                  <span>Correct answer: {item.correctAnswer}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="section-copy">No wrong answers were recorded for this attempt.</p>
          )}
        </div>
      </section>
    </>
  );
}
