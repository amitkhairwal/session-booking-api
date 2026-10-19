# Session Booking API

REST API where users book sessions with teachers. Node.js, TypeScript, Express 5, MongoDB, Mongoose.

## Setup

You need Node 18+ and a running MongoDB.

```bash
npm install
cp .env.example .env     # then edit MONGODB_URI if needed
npm run dev              # watch mode
# or: npm run build && npm start
```

`npm test` runs an end-to-end smoke test against an in-memory MongoDB (the binary is downloaded on first run, so Mongo doesn't need to be running).

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/users` | `{ fullName, email, phone }`. Duplicate email gives 409. |
| POST | `/teachers` | `{ fullName, email, specialization, experience }`. Extra endpoint, needed to have a teacher to attach sessions to. |
| POST | `/sessions` | `{ teacherId, startTime, endTime }`. 404 if the teacher is missing, 400 if `endTime <= startTime`. |
| GET | `/sessions/available?dateTimestamp=` | Aggregation pipeline. AVAILABLE sessions starting on that day, with teacher details. |
| POST | `/sessions/:id/book` | `{ userId }`. 404 if user or session is missing, 409 if the session isn't AVAILABLE. |
| PATCH | `/sessions/:id/complete` | 404 if missing, 409 unless the session is BOOKED. |
| GET | `/users/:id/sessions` | Aggregation pipeline. Returns `{ upcomingSessions, completedSessions }`. |

Errors come back as `{ "error": "message" }` with 400 (bad input), 404, 409 (state conflict) or 500.

## Decisions worth knowing

- `dateTimestamp` is epoch milliseconds (an ISO date string also works). "The date" means the UTC calendar day of that timestamp.
- "Upcoming" means status BOOKED; "completed" means status COMPLETED.
- Booking and completing use a single conditional `findOneAndUpdate`, so concurrent requests can't double-book a session.

## Deploy on Render

1. Create a free MongoDB Atlas cluster. Add a database user and allow network access from `0.0.0.0/0` (Render's free tier has no fixed IP). Copy the connection string.
2. Push this repo to GitHub.
3. In Render: New > Blueprint, pick the repo. It reads `render.yaml`.
4. Set `MONGODB_URI` to the Atlas string when prompted. Render supplies `PORT` itself.
5. Once live, set the Postman `baseUrl` to the `https://...onrender.com` URL. Free instances sleep after idle time, so the first request can take about a minute.

## Postman

Import `postman_collection.json`. Requests save the ids they create (`userId`, `teacherId`, `sessionId`) as collection variables, so run them top to bottom. Set `baseUrl` if you're not on port 3000.
