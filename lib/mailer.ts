import nodemailer from "nodemailer";

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Missing EMAIL credentials");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendOTP(email: string, otp: string) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Quiz Central" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your email — Quiz Central",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;border:1px solid #e5e5e5">
        <h2 style="margin:0 0 1rem">Email Verification</h2>
        <p>Your OTP code is:</p>
        <div style="font-size:2rem;font-weight:700;letter-spacing:0.2em;padding:1rem;background:#f5f5f5;text-align:center;border-radius:8px;margin:1rem 0">${otp}</div>
        <p style="color:#666;font-size:0.85rem">This code expires in 10 minutes. Do not share it with anyone.</p>
        <p style="color:#999;font-size:0.75rem;margin-top:2rem">— Quiz Central</p>
      </div>
    `,
  });
  console.log("OTP sent to:", email);
}

export async function sendPasswordResetEmail(email: string, otp: string) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Quiz Central" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset — Quiz Central",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;border:1px solid #e5e5e5">
        <h2 style="margin:0 0 1rem">Password Reset</h2>
        <p>You requested a password reset. Use this code to set a new password:</p>
        <div style="font-size:2rem;font-weight:700;letter-spacing:0.2em;padding:1rem;background:#f5f5f5;text-align:center;border-radius:8px;margin:1rem 0">${otp}</div>
        <p style="color:#666;font-size:0.85rem">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        <p style="color:#999;font-size:0.75rem;margin-top:2rem">— Quiz Central</p>
      </div>
    `,
  });
  console.log("Password reset OTP sent to:", email);
}