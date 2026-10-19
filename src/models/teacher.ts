import { Schema, model } from "mongoose";

const teacherSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0 }, // years
  },
  { timestamps: true }
);

export const Teacher = model("Teacher", teacherSchema);
