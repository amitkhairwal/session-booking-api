import { Router } from "express";
import { createUser, getUserSessions } from "../controllers/users";
import { createTeacher } from "../controllers/teachers";
import {
  bookSession,
  completeSession,
  createSession,
  getAvailableSessions,
} from "../controllers/sessions";

const router = Router();

router.post("/users", createUser);
router.get("/users/:id/sessions", getUserSessions);

router.post("/teachers", createTeacher);

router.post("/sessions", createSession);
// must stay above any "/sessions/:id" GET route
router.get("/sessions/available", getAvailableSessions);
router.post("/sessions/:id/book", bookSession);
router.patch("/sessions/:id/complete", completeSession);

export default router;
