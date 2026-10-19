import { RequestHandler } from "express";
import { Types } from "mongoose";
import { User } from "../models/user";
import { Session, SessionStatus } from "../models/session";
import { HttpError, parseId } from "../middleware/errors";

export const createUser: RequestHandler = async (req, res) => {
  const { fullName, email, phone } = req.body ?? {};
  const user = await User.create({ fullName, email, phone });
  res.status(201).json(user);
};

export const getUserSessions: RequestHandler = async (req, res) => {
  const userId = new Types.ObjectId(parseId(req.params.id, "user id"));
  if (!(await User.exists({ _id: userId }))) throw new HttpError(404, "User not found");

  // One pass over the user's sessions, split into the two buckets with $facet.
  const teacherJoin = [
    { $sort: { startTime: 1 as const } },
    { $lookup: { from: "teachers", localField: "teacherId", foreignField: "_id", as: "teacher" } },
    { $unwind: "$teacher" },
    { $project: { teacherId: 0, "teacher.__v": 0 } },
  ];

  const [result] = await Session.aggregate([
    { $match: { userId } },
    {
      $facet: {
        upcomingSessions: [{ $match: { status: SessionStatus.BOOKED } }, ...teacherJoin],
        completedSessions: [{ $match: { status: SessionStatus.COMPLETED } }, ...teacherJoin],
      },
    },
  ]);

  res.json(result);
};
