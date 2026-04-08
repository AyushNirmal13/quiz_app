import mongoose, { Schema, type Model } from "mongoose";

export interface IOtp extends mongoose.Document {
  email: string;
  otp: string;
  attempts: number;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      select: false,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600,
    },
  },
  {
    versionKey: false,
  },
);

const Otp = (mongoose.models.Otp as Model<IOtp>) || mongoose.model<IOtp>("Otp", otpSchema);

export default Otp;
