export interface QuizSurveillanceSettings {
  cameraRequired: boolean;
  screenLocked: boolean;
  screenshotBlocked: boolean;
}

export interface QuizSummary {
  slug: string;
  id: string;
  tag: string;
  title: string;
  description: string;
  questionCount: number;
  duration: string;
  difficulty: string;
  focus: string;
  createdBy: string;
  isLive: boolean;
  status: "draft" | "published" | "completed";
  startTime?: string;
  endTime?: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: boolean;
  negativeMarkValue: number;
  maxAttempts: number;
  surveillanceSettings: QuizSurveillanceSettings;
  createdAt: string;
}

export interface QuizQuestion {
  index: number;
  prompt: string;
  context: string;
  options: string[];
  marks: number;
}

/** Teacher-only view includes correctAnswer */
export interface QuizQuestionWithAnswer extends QuizQuestion {
  correctAnswer: number;
}

export interface QuizDetail extends Omit<QuizSummary, "questionCount"> {
  questions: QuizQuestion[];
}

export interface QuizDetailTeacher extends Omit<QuizSummary, "questionCount"> {
  questions: QuizQuestionWithAnswer[];
}

export interface AttemptAnswer {
  questionIndex: number;
  selectedAnswer: number | null;
  isCorrect: boolean;
}

export interface WrongAnswer {
  questionIndex: number;
  questionPrompt: string;
  selectedAnswer: number;
  correctAnswer: number;
  options: string[];
}

export interface AttemptRecord {
  id: string;
  quizId: string;
  quizTitle?: string;
  userId: string;
  studentName?: string;
  studentEmail?: string;
  score: number;
  totalQuestions: number;
  totalMarks: number;
  scoredMarks: number;
  correctAnswers: number;
  wrongAnswers: WrongAnswer[];
  timeTakenSeconds: number;
  submittedAt: string;
  violationCount?: number;
}

export interface DashboardMetrics {
  totalQuizzes: number;
  totalAttempts: number;
  avgScore: number;
  completionRate: number;
}

export interface ActiveSession {
  label: string;
  title: string;
  quizId: string;
  slug: string;
  progress: number;
  answered: number;
  totalQuestions: number;
  timeLeft: string;
  securityMode: string;
  checkpoint: string;
}

export interface HeaderStat {
  label: string;
  value: string;
}

export interface FilterGroup {
  name: string;
  label: string;
  options: string[];
}

export interface FilterState {
  category: string;
  difficulty: string;
  search: string;
}
