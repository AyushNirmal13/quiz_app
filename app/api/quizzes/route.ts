import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { generateSlug, serializeQuizSummary } from "@/lib/quiz-utils";
import Quiz from "@/models/Quiz";

function generateQuizCode(): string {
  return "QC-" + Math.floor(1000 + Math.random() * 9000).toString();
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;
  while (await Quiz.exists({ slug })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
  return slug;
}

async function ensureUniqueCode(): Promise<string> {
  let code = generateQuizCode();
  while (await Quiz.exists({ quizCode: code })) {
    code = generateQuizCode();
  }
  return code;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    await dbConnect();

    // Only return quizzes the user created — other quizzes are accessed via access code
    const quizzes = await Quiz.find({
      createdBy: payload.userId,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, quizzes: quizzes.map(serializeQuizSummary) });
  } catch (error) {
    console.error("GET /api/quizzes error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch quizzes." },
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
    if (!body || !body.title || !Array.isArray(body.questions)) {
      return NextResponse.json(
        { success: false, message: "Title and questions are required." },
        { status: 400 },
      );
    }

    if (body.questions.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one question is required." },
        { status: 400 },
      );
    }

    await dbConnect();

    const baseSlug = generateSlug(body.title as string);
    const slug = await ensureUniqueSlug(baseSlug);
    const quizCode = await ensureUniqueCode();

    const questions = (body.questions as Array<Record<string, unknown>>).map((q, i) => ({
      index: i + 1,
      prompt: String(q.prompt ?? ""),
      context: String(q.context ?? ""),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correctAnswer: Number(q.correctAnswer ?? 0),
      marks: Number(q.marks ?? 1),
      explanation: String(q.explanation ?? ""),
    }));

    const isLive = Boolean(body.isLive ?? false);

    const quiz = await Quiz.create({
      quizCode,
      slug,
      tag: String(body.tag ?? "General"),
      title: String(body.title),
      description: String(body.description ?? ""),
      duration: String(body.duration ?? "30 min"),
      difficulty: String(body.difficulty ?? "Intermediate"),
      focus: String(body.focus ?? ""),
      questions,
      createdBy: payload.userId,
      isLive,
      status: isLive ? "published" : "draft",
      startTime: body.startTime ? new Date(body.startTime as string) : undefined,
      endTime: body.endTime ? new Date(body.endTime as string) : undefined,
      shuffleQuestions: Boolean(body.shuffleQuestions ?? false),
      shuffleOptions: Boolean(body.shuffleOptions ?? false),
      negativeMarking: Boolean(body.negativeMarking ?? false),
      negativeMarkValue: Number(body.negativeMarkValue ?? 0.25),
      maxAttempts: Math.max(1, Number(body.maxAttempts ?? 1)),
      surveillanceSettings: {
        cameraRequired: Boolean(body.surveillanceSettings?.cameraRequired ?? false),
        screenLocked: Boolean(body.surveillanceSettings?.screenLocked ?? false),
        screenshotBlocked: Boolean(body.surveillanceSettings?.screenshotBlocked ?? false),
      },
    });

    return NextResponse.json(
      { success: true, quiz: serializeQuizSummary(quiz) },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/quizzes error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create quiz." },
      { status: 500 },
    );
  }
}
