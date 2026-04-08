import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  compareOtp,
  createAuthTokenPayload,
  getAuthCookieSettings,
  normalizeEmail,
  serializeAuthUser,
  signAuthToken,
} from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { getValidationMessage, verifyOtpSchema } from "@/lib/validators";
import Otp from "@/models/Otp";
import User from "@/models/User";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

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

    const validation = verifyOtpSchema.safeParse(body);

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
    const { otp } = validation.data;

    await dbConnect();

    const otpRecord = await Otp.findOne({ email }).select("+otp");
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 },
      );
    }

    if (user.isVerified) {
      await Otp.deleteMany({ email });

      return NextResponse.json(
        {
          success: false,
          message: "This email is already verified. Please sign in.",
        },
        { status: 409 },
      );
    }

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP expired or not found.",
        },
        { status: 410 },
      );
    }

    const isExpired = Date.now() - otpRecord.createdAt.getTime() > OTP_EXPIRY_MS;

    if (isExpired) {
      await Otp.deleteMany({ email });

      return NextResponse.json(
        {
          success: false,
          message: "OTP has expired. Register again to get a new code.",
        },
        { status: 410 },
      );
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteMany({ email });

      return NextResponse.json(
        {
          success: false,
          message: "Too many OTP attempts. Register again to request a new code.",
        },
        { status: 429 },
      );
    }

    const isOtpValid = await compareOtp(otp, otpRecord.otp);

    if (!isOtpValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        await Otp.deleteMany({ email });

        return NextResponse.json(
          {
            success: false,
            message: "Too many OTP attempts. Register again to request a new code.",
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - otpRecord.attempts} attempt(s) remaining.`,
        },
        { status: 401 },
      );
    }

    user.isVerified = true;
    await user.save();
    await Otp.deleteMany({ email });

    const authUser = serializeAuthUser(user);
    const token = signAuthToken(createAuthTokenPayload(authUser));
    const response = NextResponse.json({
      success: true,
      message: "Email verified successfully.",
      user: authUser,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieSettings());

    return response;
  } catch (error) {
    console.error("Verify OTP API error", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to verify OTP right now.",
      },
      { status: 500 },
    );
  }
}
