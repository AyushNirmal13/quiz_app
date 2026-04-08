import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  comparePassword,
  createAuthTokenPayload,
  getAuthCookieSettings,
  normalizeEmail,
  serializeAuthUser,
  signAuthToken,
} from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { getValidationMessage, loginSchema } from "@/lib/validators";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: getValidationMessage(validation.error),
        },
        { status: 400 },
      );
    }

    const email = normalizeEmail(validation.data.email);
    const { password } = validation.data;

    await dbConnect();

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    const isPasswordCorrect = await comparePassword(password, user.password as string);

    if (!isPasswordCorrect) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Verify your email before signing in.",
        },
        { status: 403 },
      );
    }

    const authUser = serializeAuthUser(user);
    const token = signAuthToken(createAuthTokenPayload(authUser));
    const response = NextResponse.json({
      success: true,
      user: authUser,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieSettings());

    return response;
  } catch (error) {
    console.error("Login API error", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to sign in right now.",
      },
      { status: 500 },
    );
  }
}
