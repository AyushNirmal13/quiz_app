import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import Attempt from "@/models/Attempt";
import Quiz from "@/models/Quiz";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    await dbConnect();

    const url = new URL(request.url);
    const quizCode = url.searchParams.get("quizId");

    // Get teacher's quizzes
    const query = quizCode
      ? { createdBy: payload.userId, quizCode }
      : { createdBy: payload.userId };
    const quizzes = await Quiz.find(query).select("quizCode title");
    const codes = quizzes.map((q) => q.quizCode);

    if (codes.length === 0) {
      return new NextResponse("No quizzes found.", { status: 404 });
    }

    const attempts = await Attempt.find({ quizId: { $in: codes } })
      .sort({ quizId: 1, submittedAt: -1 })
      .lean();

    // Build CSV
    const headers = [
      "Quiz Code",
      "Quiz Title",
      "Student Name",
      "Student Email",
      "Student ID",
      "Score (%)",
      "Scored Marks",
      "Total Marks",
      "Correct",
      "Wrong",
      "Total Questions",
      "Time Taken (s)",
      "Violations",
      "Submitted At",
    ];

    const rows = attempts.map((a) => {
      const quiz = quizzes.find((q) => q.quizCode === a.quizId);
      return [
        a.quizId,
        `"${(quiz?.title ?? a.quizTitle ?? "").replace(/"/g, '""')}"`,
        `"${(a.studentName ?? "").replace(/"/g, '""')}"`,
        a.studentEmail ?? "",
        a.userId,
        a.score,
        a.scoredMarks ?? a.correctAnswers,
        a.totalMarks ?? a.totalQuestions,
        a.correctAnswers,
        a.totalQuestions - a.correctAnswers,
        a.totalQuestions,
        a.timeTakenSeconds,
        a.violationCount ?? 0,
        a.submittedAt ? new Date(a.submittedAt).toISOString() : "",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const fileName = quizCode ? `results_${quizCode}.csv` : "results_all.csv";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to export results." },
      { status: 500 },
    );
  }
}
