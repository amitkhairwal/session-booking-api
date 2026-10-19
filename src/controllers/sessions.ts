import { RequestHandler } from "express";
import { Session, SessionStatus } from "../models/session";
import { Teacher } from "../models/teacher";
import { User } from "../models/user";
import { HttpError, parseDate, parseId } from "../middleware/errors";

const DAY_MS = 24 * 60 * 60 * 1000;

export const createSession: RequestHandler = async (req, res) => {
  const body = req.body ?? {};
  const teacherId = parseId(body.teacherId, "teacherId");
  const startTime = parseDate(body.startTime, "startTime");
  const endTime = parseDate(body.endTime, "endTime");

  if (endTime <= startTime) throw new HttpError(400, "endTime must be after startTime");
  if (!(await Teacher.exists({ _id: teacherId }))) throw new HttpError(404, "Teacher not found");

  const session = await Session.create({ teacherId, startTime, endTime });
  res.status(201).json(session);
};

export const getAvailableSessions: RequestHandler = async (req, res) => {
  const raw = req.query.dateTimestamp;
  // accept epoch millis ("1767225600000") or anything Date can parse
  const ts = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
  const date = parseDate(ts, "dateTimestamp");

  // The "date" is the UTC calendar day the timestamp falls on.
  const dayStart = new Date(Math.floor(date.getTime() / DAY_MS) * DAY_MS);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  const sessions = await Session.aggregate([
    {
      $match: {
        status: SessionStatus.AVAILABLE,
        startTime: { $gte: dayStart, $lt: dayEnd },
      },
    },
    { $sort: { startTime: 1 } },
    { $lookup: { from: "teachers", localField: "teacherId", foreignField: "_id", as: "teacher" } },
    { $unwind: "$teacher" },
    { $project: { teacherId: 0, userId: 0, "teacher.__v": 0 } },
  ]);

  res.json(sessions);
};

export const bookSession: RequestHandler = async (req, res) => {
  const sessionId = parseId(req.params.id, "session id");
  const userId = parseId(req.body?.userId, "userId");

  if (!(await User.exists({ _id: userId }))) throw new HttpError(404, "User not found");

  // Status check and write happen in one atomic op, so two people
  // booking the same slot can't both win.
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, status: SessionStatus.AVAILABLE },
    { status: SessionStatus.BOOKED, userId },
    { returnDocument: "after" }
  );
  if (session) return void res.json(session);

  if (!(await Session.exists({ _id: sessionId }))) throw new HttpError(404, "Session not found");
  throw new HttpError(409, "Session is not available for booking");
};

export const completeSession: RequestHandler = async (req, res) => {
  const sessionId = parseId(req.params.id, "session id");

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, status: SessionStatus.BOOKED },
    { status: SessionStatus.COMPLETED, completedAt: new Date() },
    { returnDocument: "after" }
  );
  if (session) return void res.json(session);

  if (!(await Session.exists({ _id: sessionId }))) throw new HttpError(404, "Session not found");
  throw new HttpError(409, "Only booked sessions can be completed");
};
