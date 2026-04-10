import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/models/User";

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
    const users = await User.find({}).select(
      "name email isVerified createdAt",
    );

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users." },
      { status: 500 },
    );
  }
}
