import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";

import type { AuthTokenPayload, AuthUser } from "@/types/auth";
import { dbConnect } from "@/lib/dbConnect";
import Otp from "@/models/Otp";
import { sendOTP } from "@/lib/mailer";

const PASSWORD_SALT_ROUNDS = 10;
const OTP_SALT_ROUNDS = 10;
const AUTH_TOKEN_EXPIRY = "7d";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const AUTH_COOKIE_NAME = "quiz_auth_token";

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.AUTH_SECRET || "quiz-central-development-secret";
}

export function getAuthCookieSettings() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}



export function isStrongPassword(password: string) {
  return password.trim().length >= 8;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function comparePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(otp: string) {
  return bcrypt.hash(otp, OTP_SALT_ROUNDS);
}

export async function compareOtp(otp: string, hashedOtp: string) {
  return bcrypt.compare(otp, hashedOtp);
}

export function serializeAuthUser(user: {
  _id?: { toString(): string } | string;
  id?: string;
  name: string;
  email: string;
  isVerified?: boolean;
}): AuthUser {
  const id =
    typeof user.id === "string" && user.id
      ? user.id
      : typeof user._id === "string"
        ? user._id
        : user._id?.toString() ?? "";

  return {
    id,
    name: user.name,
    email: normalizeEmail(user.email),
    isVerified: Boolean(user.isVerified),
  };
}

export function createAuthTokenPayload(user: AuthUser): AuthTokenPayload {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
  };
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: AUTH_TOKEN_EXPIRY,
  });
}

export function verifyAuthToken(token: string) {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthTokenPayload & JwtPayload;
  } catch {
    return null;
  }
}

// Creates and stores OTP, then sends it via email
export async function sendOtp(email: string): Promise<void> {
  await dbConnect();
  const otp = generateOTP();
  const hashed = await hashOtp(otp);
  await Otp.create({ email: email.toLowerCase().trim(), otp: hashed });
  await sendOTP(email, otp);
}
