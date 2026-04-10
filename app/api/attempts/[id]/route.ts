import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { serializeAttempt } from "@/lib/quiz-utils";
import Attempt from "@/models/Attempt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return NextResponse.json({ success: false, message: "Attempt not found." }, { status: 404 });
    }

    // Access check: User must be either the one who took the quiz OR the one who created it.
    const isAttempter = attempt.userId === payload.userId;
    
    const Quiz = (await import("@/models/Quiz")).default;
    const quiz = await Quiz.findOne({ quizCode: attempt.quizId });
    const isQuizCreator = quiz?.createdBy === payload.userId;

    if (!isAttempter && !isQuizCreator) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    return NextResponse.json({ success: true, attempt: serializeAttempt(attempt) });
  } catch (error) {
    console.error("GET /api/attempts/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch attempt." },
      { status: 500 },
    );
  }
}
