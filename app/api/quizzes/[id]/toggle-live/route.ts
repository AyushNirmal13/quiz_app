import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { serializeQuizSummary } from "@/lib/quiz-utils";
import Quiz from "@/models/Quiz";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await params;
    await dbConnect();

    const quiz = await Quiz.findOne({ $or: [{ slug: id }, { quizCode: id }] });
    if (!quiz) {
      return NextResponse.json({ success: false, message: "Quiz not found." }, { status: 404 });
    }

    if (quiz.createdBy !== payload.userId) {
      return NextResponse.json(
        { success: false, message: "You can only modify your own quizzes." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const isLive = body.isLive !== undefined ? Boolean(body.isLive) : !quiz.isLive;
    const status = isLive ? "published" : "draft";

    const updated = await Quiz.findByIdAndUpdate(
      quiz._id,
      { isLive, status, ...(body.startTime ? { startTime: new Date(body.startTime as string) } : {}), ...(body.endTime ? { endTime: new Date(body.endTime as string) } : {}) },
      { new: true },
    );

    return NextResponse.json({
      success: true,
      isLive: updated?.isLive,
      quiz: updated ? serializeQuizSummary(updated) : null,
    });
  } catch (error) {
    console.error("toggle-live error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update quiz status." },
      { status: 500 },
    );
  }
}
