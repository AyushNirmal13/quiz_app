import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { parseDurationMinutes, serializeAttempt } from "@/lib/quiz-utils";
import Attempt from "@/models/Attempt";
import Quiz from "@/models/Quiz";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    await dbConnect();

    const myQuizzes = await Quiz.find({ createdBy: payload.userId }).select("quizCode");
    const myCodes = myQuizzes.map((q) => q.quizCode);
    const attempts = await Attempt.find({
      $or: [
        { userId: payload.userId },
        { quizId: { $in: myCodes } }
      ]
    }).sort({ submittedAt: -1 });
    return NextResponse.json({ success: true, attempts: attempts.map(serializeAttempt) });
  } catch (error) {
    console.error("GET /api/attempts error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch attempts." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.quizId) {
      return NextResponse.json(
        { success: false, message: "Missing quizId in request." },
        { status: 400 },
      );
    }

    await dbConnect();

    // Find quiz by code or slug
    const quiz = await Quiz.findOne({
      $or: [{ quizCode: body.quizId }, { slug: body.quizId }],
    });

    if (!quiz) {
      return NextResponse.json({ success: false, message: "Quiz not found." }, { status: 404 });
    }

    const userId = payload.userId; // Always from JWT — never trust body

    // ── Attempt limit check ──────────────────────────────────────────
    const existingAttempts = await Attempt.countDocuments({ userId, quizId: quiz.quizCode });
    const maxAttempts = quiz.maxAttempts ?? 1;
    if (existingAttempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, message: `Maximum ${maxAttempts} attempt(s) allowed. You have already used all attempts.` },
        { status: 409 },
      );
    }

    // ── Server-side timer validation ─────────────────────────────────
    const maxDurationSeconds = parseDurationMinutes(quiz.duration) * 60;
    const clientTimeTaken = typeof body.timeTakenSeconds === "number" ? body.timeTakenSeconds : 0;
    // Allow 15-second grace period for network latency
    const timeTakenSeconds = Math.min(Math.max(clientTimeTaken, 0), maxDurationSeconds + 15);

    const violationCount = typeof body.violationCount === "number" ? body.violationCount : 0;

    const answers = Array.isArray(body.answers)
      ? (body.answers as Array<{ questionIndex: number; selectedAnswer: number | null }>)
      : [];

    // ── Scoring with marks + negative marking ────────────────────────
    let correctCount = 0;
    let scoredMarks = 0;
    let totalMarks = 0;
    const wrongAnswers: Array<{
      questionIndex: number;
      questionPrompt: string;
      selectedAnswer: number;
      correctAnswer: number;
      options: string[];
    }> = [];

    quiz.questions.forEach((question) => {
      const qMarks = question.marks ?? 1;
      totalMarks += qMarks;
      const answer = answers.find((a) => a.questionIndex === question.index);
      const selected = answer?.selectedAnswer ?? -1;

      if (selected === question.correctAnswer) {
        correctCount++;
        scoredMarks += qMarks;
      } else if (selected !== -1 && selected !== null) {
        // Wrong answer
        wrongAnswers.push({
          questionIndex: question.index,
          questionPrompt: question.prompt,
          selectedAnswer: selected,
          correctAnswer: question.correctAnswer,
          options: question.options,
        });
        // Apply negative marking if enabled
        if (quiz.negativeMarking) {
          scoredMarks -= (quiz.negativeMarkValue ?? 0.25) * qMarks;
        }
      }
      // Unanswered questions: no marks, no penalty
    });

    // Ensure scored marks doesn't go below 0
    scoredMarks = Math.max(0, scoredMarks);
    const score = totalMarks > 0 ? Math.round((scoredMarks / totalMarks) * 100) : 0;

    // Get student info for analytics/CSV export
    const student = await User.findById(userId).select("name email");

    const attempt = await Attempt.create({
      quizId: quiz.quizCode,
      quizTitle: quiz.title,
      userId,
      studentName: student?.name ?? payload.name ?? "",
      studentEmail: student?.email ?? payload.email ?? "",
      score,
      totalQuestions: quiz.questions.length,
      totalMarks,
      scoredMarks,
      correctAnswers: correctCount,
      wrongAnswers,
      timeTakenSeconds,
      startedAt: body.startedAt ? new Date(body.startedAt as string) : new Date(Date.now() - timeTakenSeconds * 1000),
      violationCount,
      submittedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        attempt: serializeAttempt(attempt),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/attempts error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit attempt." },
      { status: 500 },
    );
  }
}
