import { RequestHandler } from "express";
import { Teacher } from "../models/teacher";

// Not in the brief, but sessions need a teacher to point at.
export const createTeacher: RequestHandler = async (req, res) => {
  const { fullName, email, specialization, experience } = req.body ?? {};
  const teacher = await Teacher.create({ fullName, email, specialization, experience });
  res.status(201).json(teacher);
};
