import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { serializeQuizDetail, serializeQuizForStudent, serializeQuizSummary } from "@/lib/quiz-utils";
import Quiz from "@/models/Quiz";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();

    const quiz = await Quiz.findOne({
      $or: [{ slug: id }, { quizCode: id }],
    });

    if (!quiz) {
      return NextResponse.json({ success: false, message: "Quiz not found." }, { status: 404 });
    }

    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    // Creators get full detail with correctAnswers
    if (payload?.userId === quiz.createdBy) {
      return NextResponse.json({ success: true, quiz: serializeQuizDetail(quiz) });
    }

    // Participants NEVER get correctAnswer — critical security measure
    return NextResponse.json({ success: true, quiz: serializeQuizForStudent(quiz) });
  } catch (error) {
    console.error("GET /api/quizzes/[id] error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch quiz." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 },
      );
    }

    await dbConnect();

    const quiz = await Quiz.findOne({ $or: [{ slug: id }, { quizCode: id }] });
    if (!quiz) {
      return NextResponse.json({ success: false, message: "Quiz not found." }, { status: 404 });
    }

    if (quiz.createdBy !== payload.userId) {
      return NextResponse.json(
        { success: false, message: "You can only edit your own quizzes." },
        { status: 403 },
      );
    }

    const updates: Record<string, unknown> = {};
    const allowed = [
      "title", "description", "duration", "difficulty", "focus",
      "tag", "isLive", "status", "startTime", "endTime", "surveillanceSettings", "questions",
      "shuffleQuestions", "shuffleOptions", "negativeMarking", "negativeMarkValue", "maxAttempts",
    ];

    for (const key of allowed) {
      if (key in body) {
        if (key === "questions" && Array.isArray(body.questions)) {
          updates.questions = (body.questions as Array<Record<string, unknown>>).map((q, i) => ({
            index: i + 1,
            prompt: String(q.prompt ?? ""),
            context: String(q.context ?? ""),
            options: Array.isArray(q.options) ? q.options.map(String) : [],
            correctAnswer: Number(q.correctAnswer ?? 0),
            marks: Number(q.marks ?? 1),
            explanation: String(q.explanation ?? ""),
          }));
        } else {
          updates[key] = body[key];
        }
      }
    }

    // Sync isLive with status
    if ("isLive" in updates) {
      updates.status = updates.isLive ? "published" : "draft";
    }

    const updated = await Quiz.findByIdAndUpdate(quiz._id, updates, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, message: "Update failed." }, { status: 500 });
    }

    return NextResponse.json({ success: true, quiz: serializeQuizSummary(updated) });
  } catch (error) {
    console.error("PUT /api/quizzes/[id] error:", error);
    return NextResponse.json({ success: false, message: "Failed to update quiz." }, { status: 500 });
  }
}

export async function DELETE(
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
        { success: false, message: "You can only delete your own quizzes." },
        { status: 403 },
      );
    }

    await Quiz.findByIdAndDelete(quiz._id);
    return NextResponse.json({ success: true, message: "Quiz deleted." });
  } catch (error) {
    console.error("DELETE /api/quizzes/[id] error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete quiz." }, { status: 500 });
  }
}
