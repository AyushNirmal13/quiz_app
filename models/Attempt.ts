import mongoose, { Schema, type Model } from "mongoose";

export interface IWrongAnswer {
  questionIndex: number;
  questionPrompt: string;
  selectedAnswer: number;
  correctAnswer: number;
  options: string[];
}

export interface IAttempt extends mongoose.Document {
  userId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  totalMarks: number;
  scoredMarks: number;
  correctAnswers: number;
  wrongAnswers: IWrongAnswer[];
  timeTakenSeconds: number;
  startedAt: Date;
  violationCount: number;
  submittedAt: Date;
  studentName: string;
  studentEmail: string;
}

const wrongAnswerSchema = new Schema<IWrongAnswer>(
  {
    questionIndex: { type: Number, required: true },
    questionPrompt: { type: String, required: true },
    selectedAnswer: { type: Number, required: true },
    correctAnswer: { type: Number, required: true },
    options: { type: [String], default: [] },
  },
  { _id: false },
);

const attemptSchema = new Schema<IAttempt>(
  {
    userId: { type: String, required: true, index: true },
    quizId: { type: String, required: true, index: true },
    quizTitle: { type: String, default: "" },
    score: { type: Number, required: true, min: 0, max: 100 },
    totalQuestions: { type: Number, required: true },
    totalMarks: { type: Number, default: 0 },
    scoredMarks: { type: Number, default: 0 },
    correctAnswers: { type: Number, required: true },
    wrongAnswers: { type: [wrongAnswerSchema], default: [] },
    timeTakenSeconds: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    violationCount: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    studentName: { type: String, default: "" },
    studentEmail: { type: String, default: "" },
  },
  { timestamps: false },
);

attemptSchema.index({ userId: 1, submittedAt: -1 });
attemptSchema.index({ quizId: 1, submittedAt: -1 });
attemptSchema.index({ userId: 1, quizId: 1 });

const Attempt =
  (mongoose.models.Attempt as Model<IAttempt>) ||
  mongoose.model<IAttempt>("Attempt", attemptSchema);

export default Attempt;
