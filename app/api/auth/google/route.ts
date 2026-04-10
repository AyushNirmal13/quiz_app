import { NextRequest, NextResponse } from "next/server";

import { OAuth2Client } from "google-auth-library";

import {
  AUTH_COOKIE_NAME,
  createAuthTokenPayload,
  getAuthCookieSettings,
  normalizeEmail,
  serializeAuthUser,
  signAuthToken,
} from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import User from "@/models/User";

// Force Node.js runtime (google-auth-library needs Node crypto)
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { credential?: string } | null;

    if (!body?.credential) {
      return NextResponse.json(
        { success: false, message: "No Google credential provided." },
        { status: 400 },
      );
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "Google sign-in is not configured on this server." },
        { status: 503 },
      );
    }

    // Verify the Google ID token
    const oauthClient = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await oauthClient.verifyIdToken({
        idToken: body.credential,
        audience: clientId,
      });
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid Google credential. Please try again." },
        { status: 401 },
      );
    }

    const googlePayload = ticket.getPayload();
    if (!googlePayload?.email) {
      return NextResponse.json(
        { success: false, message: "Could not read email from Google account." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(googlePayload.email);
    const name = googlePayload.name ?? googlePayload.email.split("@")[0] ?? "User";

    await dbConnect();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        isVerified: true,
      });
    }

    // ── Existing user — issue session ──────────────────────────────────────
    // Mark user as verified if they sign in with Google (email ownership is proven)
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const authUser = serializeAuthUser(user);
    const token = signAuthToken(createAuthTokenPayload(authUser));

    const response = NextResponse.json({ success: true, user: authUser });
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieSettings());
    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { success: false, message: "Google sign-in failed. Please try again." },
      { status: 500 },
    );
  }
}
