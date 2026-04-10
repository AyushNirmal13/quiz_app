import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import StudyMaterial from "@/models/StudyMaterial";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

// Force Node.js runtime
export const runtime = "nodejs";

interface Question {
  prompt: string;
  context: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation: string;
}

/**
 * Build difficulty-specific instructions for the AI prompt.
 */
function getDifficultyRules(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return `DIFFICULTY: EASY
- Ask direct factual recall questions
- Test definitions, dates, names, basic concepts
- Options should have one clearly correct answer
- Avoid tricky wording or multi-step reasoning`;

    case "hard":
      return `DIFFICULTY: HARD
- Ask analytical, application-based, and inference questions
- Test ability to apply concepts to new scenarios
- Include "which of the following is NOT" style questions
- Require multi-step reasoning or comparison between concepts
- Distractors should be highly plausible`;

    case "mixed":
      return `DIFFICULTY: MIXED
- Distribute questions evenly across Easy, Medium, and Hard
- First third: factual recall (Easy)
- Middle third: conceptual understanding (Medium)  
- Final third: analytical/application (Hard)`;

    default: // "medium" / "intermediate"
      return `DIFFICULTY: MEDIUM
- Ask conceptual understanding questions
- Test "why" and "how" rather than just "what"
- Require understanding of relationships between concepts
- Distractors should be plausible but distinguishable with proper understanding`;
  }
}

/** Model names to try, in priority order */
const MODEL_NAMES = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro"];

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json(
        { status: "error", message: "Authentication required." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body?.materialId) {
      return NextResponse.json(
        { status: "error", message: "materialId is required." },
        { status: 400 },
      );
    }

    const questionCount = Math.min(Math.max(Number(body.questionCount ?? 10), 3), 50);
    const difficulty = String(body.difficulty ?? "Intermediate");
    const topicFocus = typeof body.topicFocus === "string" ? body.topicFocus.trim() : "";

    await dbConnect();

    const material = await StudyMaterial.findById(body.materialId);
    if (!material || String(material.uploadedBy) !== String(payload.userId)) {
      return NextResponse.json(
        { status: "error", message: "Study material not found." },
        { status: 404 },
      );
    }

    // ── Collect API keys ──────────────────────────────────────────────────
    const keysEnv = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const apiKeys = keysEnv
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (apiKeys.length === 0) {
      return NextResponse.json(
        { status: "error", message: "AI service is not configured. Set GEMINI_API_KEYS in .env.local." },
        { status: 503 },
      );
    }

    // ── Build the comprehensive prompt ────────────────────────────────────
    const topicInstruction = topicFocus
      ? `\nTOPIC FOCUS: "${topicFocus}" — Prioritize questions from this specific topic within the document. At least 70% of questions should relate to this topic.\n`
      : "";

    const difficultyRules = getDifficultyRules(difficulty);

    const systemPrompt = `You are an expert educational quiz generator for university/college examinations.
Your goal is to transform document content into a high-quality, exam-ready quiz that tests UNDERSTANDING, not memorization.

${difficultyRules}
${topicInstruction}
STRICT RULES:
1. Generate EXACTLY ${questionCount} multiple-choice questions. It is absolutely CRITICAL that you generate no more and no less than ${questionCount} questions.
2. Each question MUST have exactly 4 options (A, B, C, D).
3. Do NOT copy sentences directly from the document. Rephrase and test understanding.
4. Make distractors plausible but clearly wrong to someone who understands the material.
5. Each question must test a DIFFERENT concept — no duplicate or overlapping questions.
6. Avoid ambiguous wording — each question should have one unambiguous correct answer.
7. Keep language simple, clear, and professional.

OUTPUT FORMAT — Return ONLY a valid JSON object with EXACTLY this structure:
{
  "status": "success",
  "total_questions": ${questionCount},
  "questions": [
    {
      "prompt": "Clear, concise question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct..."
    }
  ]
}

CRITICAL FORMATTING INSTRUCTIONS:
- The "correctAnswer" field MUST be an integer between 0 and 3 representing the index of the correct option.
- Output ONLY valid JSON — no markdown, no code fences, no extra text.
- No trailing commas in JSON.`;

    // ── Trim document to fit token limits ─────────────────────────────────
    const maxChars = 40000;
    const documentText = (material.contentText as string).slice(0, maxChars);

    const userMessage = `Generate exactly ${questionCount} MCQ questions from the following study material:\n\n---\n${documentText}\n---`;

    let finalQuestions: Question[] = [];
    let success = false;
    let lastError: unknown = null;

    // ── Try each API key until one succeeds ──────────────────────────────
    for (const key of apiKeys) {
      // For each key, try multiple model names in case one is unavailable
      for (const modelName of MODEL_NAMES) {
        try {
          console.log(`Trying model "${modelName}" with key ending ...${key.slice(-6)}`);

          const ai = new GoogleGenAI({ apiKey: key });

          const response = await ai.models.generateContent({
            model: modelName,
            contents: `${systemPrompt}\n\n${userMessage}`,
            config: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          });

          let text = response.text ?? "";
          if (!text) throw new Error("Empty response from Gemini.");

          // Clean markdown backticks if present
          text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

          const parsed = JSON.parse(text);

          // Validation: must be an object with a questions array
          if (!parsed || Array.isArray(parsed) || !parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("Invalid format: Root is not an object with a 'questions' array.");
          }

          const questions = parsed.questions;

          if (questions.length !== questionCount) {
            throw new Error(
              `Count mismatch: Expected exactly ${questionCount} questions but got ${questions.length}.`,
            );
          }

          // Validate each question structure & deduplicate
          const seen = new Set<string>();
          const deduplicated: Question[] = [];

          for (const q of questions) {
            if (
              typeof q.prompt === "string" &&
              q.prompt.trim().length > 0 &&
              Array.isArray(q.options) &&
              q.options.length === 4 &&
              q.options.every((o: unknown) => typeof o === "string" && (o as string).trim().length > 0) &&
              typeof q.correctAnswer === "number" &&
              q.correctAnswer >= 0 &&
              q.correctAnswer <= 3
            ) {
              const keyStr = q.prompt.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
              if (!seen.has(keyStr)) {
                seen.add(keyStr);
                deduplicated.push({
                  prompt: q.prompt.trim(),
                  context: "",
                  options: q.options.map((o: string) => o.trim()) as [string, string, string, string],
                  correctAnswer: q.correctAnswer as 0 | 1 | 2 | 3,
                  explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
                });
              }
            }
          }

          if (deduplicated.length !== questionCount) {
            throw new Error(
              `Validation/Deduplication failed: Expected ${questionCount} valid unique questions, got ${deduplicated.length}.`,
            );
          }

          // All checks passed!
          finalQuestions = deduplicated;
          success = true;
          console.log(`✅ Successfully generated ${questionCount} questions using model "${modelName}".`);
          break;
        } catch (error: unknown) {
          lastError = error;
          const msg = error instanceof Error ? error.message : String(error);

          // If model not found (404), overloaded (503), or rate-limited (429), try the next model name with this same key
          if (
            msg.includes("404") || 
            msg.includes("not found") || 
            msg.includes("not_found") || 
            msg.includes("503") || 
            msg.includes("high demand") || 
            msg.includes("overloaded") ||
            msg.includes("UNAVAILABLE") ||
            msg.includes("429") ||
            msg.includes("RESOURCE_EXHAUSTED") ||
            msg.includes("quota") ||
            msg.includes("Rate limit")
          ) {
            console.warn(`Model "${modelName}" unavailable/rate-limited (404/503/429), trying next model...`);
            continue;
          }

          // For other errors (quota, rate limit, parse failures), break to try next KEY
          console.warn(`Model "${modelName}" failed: ${msg}. Switching to next API key...`);
          break;
        }
      }

      if (success) break;
    }

    // ── FALLBACK: Try Groq if Gemini completely failed ────────────────────
    if (!success) {
      if (process.env.GROQ_API_KEY) {
        console.warn("Gemini exhausted, falling back to Groq...");
        try {
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
          const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 8192,
            response_format: { type: "json_object" },
          });

          let text = response.choices[0]?.message?.content ?? "";
          text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
            const questions = parsed.questions;
            const seen = new Set<string>();
            const deduplicated: Question[] = [];

            for (const q of questions) {
               if (
                  typeof q.prompt === "string" &&
                  q.prompt.trim().length > 0 &&
                  Array.isArray(q.options) &&
                  q.options.length === 4 &&
                  q.options.every((o: unknown) => typeof o === "string" && (o as string).trim().length > 0) &&
                  typeof q.correctAnswer === "number" &&
                  q.correctAnswer >= 0 &&
                  q.correctAnswer <= 3
               ) {
                  const keyStr = q.prompt.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
                  if (!seen.has(keyStr)) {
                     seen.add(keyStr);
                     deduplicated.push({
                        prompt: q.prompt.trim(),
                        context: "",
                        options: q.options.map((o: string) => o.trim()) as [string, string, string, string],
                        correctAnswer: q.correctAnswer as 0 | 1 | 2 | 3,
                        explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
                     });
                  }
               }
            }

            if (deduplicated.length === questionCount) {
               finalQuestions = deduplicated;
               success = true;
               console.log(`✅ Successfully generated ${questionCount} questions using Groq.`);
            } else {
               throw new Error(`Groq validation failed: Expected ${questionCount} valid questions, got ${deduplicated.length}.`);
            }
          }
        } catch (groqErr) {
          console.error("Groq fallback also failed:", groqErr instanceof Error ? groqErr.message : String(groqErr));
        }
      }

      if (!success) {
        console.error(
          "All Gemini API keys exhausted or generation repeatedly failed. Last Error:",
          lastError,
        );
        return NextResponse.json(
          {
            status: "error",
            message: "All API keys exhausted or generation failed",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      status: "success",
      total_questions: finalQuestions.length,
      questions: finalQuestions,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/study-material/generate error:", errMsg);
    return NextResponse.json(
      {
        status: "error",
        message: "All API keys exhausted or generation failed",
      },
      { status: 500 },
    );
  }
}