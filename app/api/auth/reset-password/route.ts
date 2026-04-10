import { NextResponse } from "next/server";

import { compareOtp, hashPassword, normalizeEmail } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import Otp from "@/models/Otp";
import User from "@/models/User";

const OTP_EXPIRY_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.email || !body?.otp || !body?.newPassword) {
      return NextResponse.json(
        { success: false, message: "Email, OTP, and new password are required." },
        { status: 400 },
      );
    }

    if (String(body.newPassword).trim().length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(body.email);
    await dbConnect();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or OTP." },
        { status: 400 },
      );
    }

    const otpRecord = await Otp.findOne({ email }).select("+otp");
    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "OTP expired or not found. Request a new code." },
        { status: 410 },
      );
    }

    const isExpired = Date.now() - otpRecord.createdAt.getTime() > OTP_EXPIRY_MS;
    if (isExpired) {
      await Otp.deleteMany({ email });
      return NextResponse.json(
        { success: false, message: "OTP has expired. Request a new code." },
        { status: 410 },
      );
    }

    const isValid = await compareOtp(String(body.otp), otpRecord.otp);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP." },
        { status: 401 },
      );
    }

    // Update password
    const hashed = await hashPassword(String(body.newPassword));
    user.password = hashed;
    await user.save();

    // Clean up OTPs
    await Otp.deleteMany({ email });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to reset password." },
      { status: 500 },
    );
  }
}
