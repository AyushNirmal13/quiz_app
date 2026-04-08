import mongoose, { Schema } from "mongoose";

export interface IStudyMaterial {
  uploadedBy: string;
  fileName: string;
  contentText: string;
  quizId?: string;
  createdAt: Date;
}

const StudyMaterialSchema = new Schema<IStudyMaterial>(
  {
    uploadedBy: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    contentText: { type: String, required: true },
    quizId: { type: String, default: null },
  },
  { timestamps: true },
);

const StudyMaterial =
  (mongoose.models.StudyMaterial as mongoose.Model<IStudyMaterial>) ||
  mongoose.model<IStudyMaterial>("StudyMaterial", StudyMaterialSchema);

export default StudyMaterial;
