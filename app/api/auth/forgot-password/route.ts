import { NextResponse } from "next/server";

import { generateOTP, hashOtp, normalizeEmail } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { sendPasswordResetEmail } from "@/lib/mailer";
import Otp from "@/models/Otp";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(body.email);
    await dbConnect();

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a reset code has been sent.",
      });
    }

    // Delete any existing OTPs and create a new one
    await Otp.deleteMany({ email });
    const otp = generateOTP();
    const hashed = await hashOtp(otp);
    await Otp.create({ email, otp: hashed });

    await sendPasswordResetEmail(email, otp);

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to process request." },
      { status: 500 },
    );
  }
}
