import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  createAuthTokenPayload,
  getAuthCookieSettings,
  hashPassword,
  isStrongPassword,
  normalizeEmail,
  sendOtp,
  serializeAuthUser,
  signAuthToken,
} from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { getValidationMessage, registerSchema } from "@/lib/validators";
import Otp from "@/models/Otp";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
    }

    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: getValidationMessage(validation.error) },
        { status: 400 },
      );
    }

    const { name, password } = validation.data;
    const email = normalizeEmail(validation.data.email);
    const isGoogle = Boolean(body.google);

    // Validate password strength ONLY if NOT a Google registration
    if (!isGoogle) {
      if (!password || !isStrongPassword(password)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Password must be at least 8 characters and include a number and special character.",
          },
          { status: 400 },
        );
      }
    }

    await dbConnect();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified) {
        return NextResponse.json(
          { success: false, message: "An account with this email already exists. Please sign in." },
          { status: 409 },
        );
      }
      // Resend OTP for unverified existing user
      await Otp.deleteMany({ email });
      await sendOtp(email);
      return NextResponse.json(
        { success: true, message: "OTP resent. Check your email to complete verification.", email },
        { status: 200 },
      );
    }

    const hashedPassword = password ? await hashPassword(password) : undefined;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: isGoogle, // Google users are pre-verified
    });

    if (isGoogle) {
      // For Google users, issue session immediately and skip OTP
      const authUser = serializeAuthUser(user);
      const token = signAuthToken(createAuthTokenPayload(authUser));
      const response = NextResponse.json({
        success: true,
        message: "Registration complete.",
        user: authUser,
      }, { status: 201 });
      
      response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieSettings());
      return response;
    }

    await sendOtp(email);
    return NextResponse.json(
      { success: true, message: "Account created. Check your email for the OTP.", email },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to register right now. Please try again." },
      { status: 500 },
    );
  }
}
