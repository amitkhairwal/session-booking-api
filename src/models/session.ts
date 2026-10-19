import { Schema, model } from "mongoose";

export const SessionStatus = {
  AVAILABLE: "AVAILABLE",
  BOOKED: "BOOKED",
  COMPLETED: "COMPLETED",
} as const;

const sessionSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.AVAILABLE,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// serves the date lookup in /sessions/available
sessionSchema.index({ status: 1, startTime: 1 });
// serves the per-user history
sessionSchema.index({ userId: 1, status: 1 });

export const Session = model("Session", sessionSchema);
