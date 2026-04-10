import type { IQuiz, IQuizQuestion } from "@/models/Quiz";
import type { AttemptRecord, QuizDetail, QuizDetailTeacher, QuizSummary, WrongAnswer } from "@/types/quiz";

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function serializeQuizSummary(quiz: IQuiz & { _id: unknown; createdAt: Date }): QuizSummary {
  return {
    slug: quiz.slug,
    id: quiz.quizCode,
    tag: quiz.tag,
    title: quiz.title,
    description: quiz.description,
    questionCount: quiz.questions.length,
    duration: quiz.duration,
    difficulty: quiz.difficulty,
    focus: quiz.focus ?? "",
    createdBy: quiz.createdBy ?? "",
    isLive: quiz.isLive ?? false,
    status: quiz.status ?? "draft",
    startTime: quiz.startTime?.toISOString(),
    endTime: quiz.endTime?.toISOString(),
    shuffleQuestions: quiz.shuffleQuestions ?? false,
    shuffleOptions: quiz.shuffleOptions ?? false,
    negativeMarking: quiz.negativeMarking ?? false,
    negativeMarkValue: quiz.negativeMarkValue ?? 0.25,
    maxAttempts: quiz.maxAttempts ?? 1,
    surveillanceSettings: quiz.surveillanceSettings ?? {
      cameraRequired: false,
      screenLocked: false,
      screenshotBlocked: false,
    },
    createdAt: quiz.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/** Student view — NO correctAnswer exposed */
function serializeQuestionForStudent(question: IQuizQuestion): {
  index: number; prompt: string; context: string; options: string[]; marks: number;
} {
  return {
    index: question.index,
    prompt: question.prompt,
    context: question.context,
    options: question.options,
    marks: question.marks ?? 1,
  };
}

/** Teacher view — includes correctAnswer + explanation */
function serializeQuestionForTeacher(question: IQuizQuestion): {
  index: number; prompt: string; context: string; options: string[]; marks: number; correctAnswer: number; explanation: string;
} {
  return {
    index: question.index,
    prompt: question.prompt,
    context: question.context,
    options: question.options,
    marks: question.marks ?? 1,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation ?? "",
  };
}

/** For students — correctAnswer is NEVER sent */
export function serializeQuizForStudent(quiz: IQuiz & { _id: unknown; createdAt: Date }): QuizDetail {
  return {
    ...serializeQuizSummary(quiz),
    questions: quiz.questions.map(serializeQuestionForStudent),
  };
}

/** For teachers — includes correctAnswer */
export function serializeQuizDetail(quiz: IQuiz & { _id: unknown; createdAt: Date }): QuizDetailTeacher {
  return {
    ...serializeQuizSummary(quiz),
    questions: quiz.questions.map(serializeQuestionForTeacher),
  };
}

export function serializeAttempt(
  attempt: {
    _id: unknown;
    quizId: string;
    quizTitle?: string;
    userId: string;
    studentName?: string;
    studentEmail?: string;
    score: number;
    totalQuestions: number;
    totalMarks?: number;
    scoredMarks?: number;
    correctAnswers: number;
    wrongAnswers: WrongAnswer[];
    timeTakenSeconds: number;
    submittedAt: Date;
    violationCount?: number;
  },
): AttemptRecord {
  return {
    id: String(attempt._id),
    quizId: attempt.quizId,
    quizTitle: attempt.quizTitle ?? "",
    userId: attempt.userId,
    studentName: attempt.studentName ?? "",
    studentEmail: attempt.studentEmail ?? "",
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    totalMarks: attempt.totalMarks ?? attempt.totalQuestions,
    scoredMarks: attempt.scoredMarks ?? attempt.correctAnswers,
    correctAnswers: attempt.correctAnswers,
    wrongAnswers: attempt.wrongAnswers,
    timeTakenSeconds: attempt.timeTakenSeconds,
    submittedAt: attempt.submittedAt.toISOString(),
    violationCount: attempt.violationCount ?? 0,
  };
}

export function parseDurationMinutes(duration: string): number {
  const match = /(\d+)/.exec(duration);
  return match ? parseInt(match[1], 10) : 30;
}

/** Seeded shuffle — deterministic per student for consistent order */
export function seededShuffle<T>(array: T[], seed: string): T[] {
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
