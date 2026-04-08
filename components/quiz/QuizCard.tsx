import Link from "next/link";

import type { QuizSummary } from "@/types/quiz";

interface QuizCardProps {
  quiz: QuizSummary;
}

export function QuizCard({ quiz }: QuizCardProps) {
  return (
    <article className="quiz-card">
      <header className="quiz-card__header">
        <span className="quiz-card__badge">{quiz.tag}</span>
        <span className="quiz-card__id">{quiz.id}</span>
      </header>

      <div className="quiz-card__visual" aria-hidden="true">
        <span className="quiz-card__visual-kicker">{quiz.difficulty}</span>
        <span className="quiz-card__visual-focus">{quiz.focus}</span>
        <span className="quiz-card__visual-index">{quiz.id}</span>
      </div>

      <div className="quiz-card__body">
        <h2 className="quiz-card__title">
          <Link href={`/quiz/${quiz.slug}`}>{quiz.title}</Link>
        </h2>
        <p className="quiz-card__description">{quiz.description}</p>
      </div>

      <footer className="quiz-card__footer">
        <div className="quiz-card__stats">
          <span className="quiz-card__stat">{quiz.questionCount} questions</span>
          <span className="quiz-card__stat">{quiz.duration}</span>
          <span className="quiz-card__stat">{quiz.difficulty}</span>
        </div>

        <Link href={`/quiz/${quiz.slug}`} className="btn-secondary">
          Open quiz
        </Link>
      </footer>
    </article>
  );
}
