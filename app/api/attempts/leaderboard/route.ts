import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import Attempt from "@/models/Attempt";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(request.url);
    const quizId = url.searchParams.get("quizId");

    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "quizId is required." },
        { status: 400 },
      );
    }

    // Get best attempt per student for this quiz (highest score, then fastest time)
    const attempts = await Attempt.find({ quizId })
      .sort({ score: -1, timeTakenSeconds: 1 })
      .lean();

    // Keep only the best attempt per student
    const bestByStudent = new Map<string, {
      rank: number;
      studentName: string;
      studentEmail: string;
      userId: string;
      score: number;
      scoredMarks: number;
      totalMarks: number;
      timeTakenSeconds: number;
      submittedAt: string;
      isCurrentUser: boolean;
    }>();

    for (const a of attempts) {
      if (!bestByStudent.has(a.userId)) {
        bestByStudent.set(a.userId, {
          rank: 0,
          studentName: a.studentName ?? "",
          studentEmail: a.studentEmail ?? "",
          userId: a.userId,
          score: a.score,
          scoredMarks: a.scoredMarks ?? a.correctAnswers,
          totalMarks: a.totalMarks ?? a.totalQuestions,
          timeTakenSeconds: a.timeTakenSeconds,
          submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : "",
          isCurrentUser: a.userId === payload.userId,
        });
      }
    }

    // Sort by score desc, then time asc
    const leaderboard = Array.from(bestByStudent.values())
      .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return NextResponse.json({ success: true, leaderboard });
  } catch (error) {
    console.error("GET /api/attempts/leaderboard error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch leaderboard." },
      { status: 500 },
    );
  }
}
