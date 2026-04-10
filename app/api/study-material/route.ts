import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { uploadToS3 } from "@/lib/s3";
import StudyMaterial from "@/models/StudyMaterial";

// Force Node.js runtime — pdf-parse uses fs and Buffer
export const runtime = "nodejs";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided." },
        { status: 400 },
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "File too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    if (fileName.endsWith(".pdf")) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buf: Buffer, opts?: Record<string, unknown>) => Promise<{ text: string; numpages: number }>;
        const pdfData = await pdfParse(buffer, { max: 0 });
        extractedText = pdfData.text;
        if (!extractedText || extractedText.trim().length < 50) {
          return NextResponse.json(
            { success: false, message: "This PDF appears to be scanned (image-only) or has no extractable text. Please use a text-based PDF or paste content into a .txt file." },
            { status: 422 },
          );
        }
      } catch (pdfErr) {
        const msg = String(pdfErr);
        console.error("PDF Parsing error:", pdfErr);
        
        let reason = "The file may be corrupted or image-only.";
        if (msg.includes("encrypt")) reason = "This PDF is password-protected and cannot be read.";
        if (msg.includes("Invalid PDF structure")) reason = "The PDF structure is invalid or corrupt.";
        
        return NextResponse.json(
          { 
            success: false, 
            message: `Failed to extract text: ${reason} Try exporting it as a .txt or .docx file instead.` 
          },
          { status: 422 },
        );
      }
    } else if (fileName.endsWith(".docx")) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require("mammoth") as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        if (!extractedText || extractedText.trim().length < 50) {
          return NextResponse.json(
            { success: false, message: "This DOCX file has no extractable text content." },
            { status: 422 },
          );
        }
      } catch (docxErr) {
        const msg = docxErr instanceof Error ? docxErr.message : "";
        return NextResponse.json(
          { success: false, message: `Failed to read DOCX. ${msg || "The file may be corrupted."}` },
          { status: 422 },
        );
      }
    } else if (fileName.endsWith(".txt")) {
      extractedText = new TextDecoder().decode(buffer);
    } else {
      return NextResponse.json(
        { success: false, message: "Only PDF, DOCX, and TXT files are supported." },
        { status: 400 },
      );
    }

    if (extractedText.trim().length < 100) {
      return NextResponse.json(
        { success: false, message: "File content is too short to generate questions from." },
        { status: 422 },
      );
    }

    await dbConnect();

    let s3Key = undefined;
    let fileUrl = undefined;

    try {
      if (process.env.AWS_S3_BUCKET_NAME) {
        const mimeType = file.type || "application/octet-stream";
        const s3Data = await uploadToS3(buffer, file.name, mimeType);
        s3Key = s3Data.s3Key;
        fileUrl = s3Data.fileUrl;
      }
    } catch (s3Error) {
      console.error("S3 Upload Failed. Falling back to local/text DB storage.", s3Error);
    }

    const material = await StudyMaterial.create({
      uploadedBy: payload.userId,
      fileName: file.name,
      contentText: extractedText.slice(0, 50000),
      fileUrl,
      s3Key
    });

    return NextResponse.json({
      success: true,
      materialId: String(material._id),
      fileName: file.name,
      previewText: extractedText.slice(0, 500),
      totalChars: extractedText.length,
    });
  } catch (error) {
    console.error("POST /api/study-material error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process file." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("quiz_auth_token")?.value ?? "";
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    await dbConnect();
    const materials = await StudyMaterial.find({ uploadedBy: payload.userId })
      .select("fileName createdAt quizId")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, materials });
  } catch (error) {
    console.error("GET /api/study-material error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch materials." }, { status: 500 });
  }
}
