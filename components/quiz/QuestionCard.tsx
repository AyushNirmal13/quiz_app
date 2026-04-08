import type { QuizQuestion } from "@/types/quiz";

import { OptionItem } from "@/components/quiz/OptionItem";

interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswer?: number;
  isInteractionLocked: boolean;
  onSelectAnswer: (optionIndex: number) => void;
}

export function QuestionCard({
  question,
  selectedAnswer,
  isInteractionLocked,
  onSelectAnswer,
}: QuestionCardProps) {
  return (
    <section className="content-card">
      <header className="content-card__header">
        <p className="eyebrow">Question {question.index}</p>
        <h2 className="content-card__title">{question.prompt}</h2>
        <p className="content-card__copy">{question.context}</p>
      </header>

      <ol className="question-options">
        {question.options.map((option, index) => (
          <OptionItem
            key={option}
            optionIndex={index}
            optionText={option}
            isSelected={selectedAnswer === index}
            isDisabled={isInteractionLocked}
            onSelect={onSelectAnswer}
          />
        ))}
      </ol>
    </section>
  );
}
