import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, serializeAuthUser, verifyAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/models/User";

function createUnauthorizedResponse() {
  const response = NextResponse.json(
    {
      user: null,
    },
    { status: 401 },
  );

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return createUnauthorizedResponse();
    }

    const payload = verifyAuthToken(token);

    if (!payload?.userId) {
      return createUnauthorizedResponse();
    }

    await dbConnect();

    const user = await User.findById(payload.userId);

    if (!user || !user.isVerified) {
      return createUnauthorizedResponse();
    }

    return NextResponse.json({
      user: serializeAuthUser(user),
    });
  } catch (error) {
    console.error("Current user API error", error);
    return createUnauthorizedResponse();
  }
}
