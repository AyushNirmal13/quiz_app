import mongoose, { Schema } from "mongoose";

export interface IQuizSurveillance {
  cameraRequired: boolean;
  screenLocked: boolean;
  screenshotBlocked: boolean;
}

export interface IQuizQuestion {
  index: number;
  prompt: string;
  context: string;
  options: string[];
  correctAnswer: number;
  marks: number;
  explanation: string;
}

export interface IQuiz {
  quizCode: string;
  slug: string;
  tag: string;
  title: string;
  description: string;
  duration: string;
  difficulty: string;
  focus: string;
  questions: IQuizQuestion[];
  createdBy: string;
  isLive: boolean;
  status: "draft" | "published" | "completed";
  startTime?: Date;
  endTime?: Date;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: boolean;
  negativeMarkValue: number;
  maxAttempts: number;
  surveillanceSettings: IQuizSurveillance;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    index: { type: Number, required: true },
    prompt: { type: String, required: true },
    context: { type: String, default: "" },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length >= 2 && v.length <= 6,
        message: "Questions must have between 2 and 6 options.",
      },
    },
    correctAnswer: { type: Number, required: true },
    marks: { type: Number, default: 1 },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const SurveillanceSchema = new Schema<IQuizSurveillance>(
  {
    cameraRequired: { type: Boolean, default: false },
    screenLocked: { type: Boolean, default: false },
    screenshotBlocked: { type: Boolean, default: false },
  },
  { _id: false },
);

const QuizSchema = new Schema<IQuiz>(
  {
    quizCode: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    tag: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    duration: { type: String, required: true },
    difficulty: { type: String, required: true },
    focus: { type: String, default: "" },
    questions: { type: [QuizQuestionSchema], required: true },
    createdBy: { type: String, required: true, index: true },
    isLive: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published", "completed"], default: "draft" },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    negativeMarking: { type: Boolean, default: false },
    negativeMarkValue: { type: Number, default: 0.25 },
    maxAttempts: { type: Number, default: 1 },
    surveillanceSettings: { type: SurveillanceSchema, default: () => ({}) },
  },
  { timestamps: true },
);

const Quiz =
  (mongoose.models.Quiz as mongoose.Model<IQuiz>) ||
  mongoose.model<IQuiz>("Quiz", QuizSchema);

export default Quiz;
