import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app";
import { Session } from "../src/models/session";

async function main() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Session.init();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as any).port}`;

  const call = async (method: string, path: string, body?: object) => {
    const res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json" },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  const ghost = "64b000000000000000000000";

  try {
    // users
    const u = await call("POST", "/users", { fullName: "Asha", email: "asha@x.com", phone: "123" });
    assert.equal(u.status, 201);
    assert.equal((await call("POST", "/users", { fullName: "B", email: "ASHA@x.com", phone: "1" })).status, 409);
    assert.equal((await call("POST", "/users", { fullName: "B" })).status, 400);

    // sessions
    const t = await call("POST", "/teachers", { fullName: "Ravi", email: "r@x.com", specialization: "Math", experience: 5 });
    assert.equal(t.status, 201);
    const day = Date.UTC(2030, 0, 15);
    const mk = (startH: number, endH: number, teacherId = t.body._id) =>
      call("POST", "/sessions", {
        teacherId,
        startTime: new Date(day + startH * 36e5).toISOString(),
        endTime: new Date(day + endH * 36e5).toISOString(),
      });

    const s1 = await mk(10, 11);
    assert.equal(s1.status, 201);
    assert.equal(s1.body.status, "AVAILABLE");
    assert.equal(s1.body.userId, null);
    assert.equal((await mk(11, 10)).status, 400);
    assert.equal((await mk(10, 11, ghost)).status, 404);
    assert.equal((await mk(10, 11, "nope")).status, 400);
    const s2 = await mk(8, 9);
    await mk(24 + 8, 24 + 9); // next day, must not show up

    // available (aggregation)
    const av = await call("GET", `/sessions/available?dateTimestamp=${day + 5 * 36e5}`);
    assert.equal(av.status, 200);
    assert.equal(av.body.length, 2);
    assert.equal(av.body[0]._id, s2.body._id); // sorted by startTime
    assert.equal(av.body[0].teacher.fullName, "Ravi");
    assert.equal((await call("GET", "/sessions/available")).status, 400);
    assert.equal((await call("GET", "/sessions/available?dateTimestamp=abc")).status, 400);

    // book
    const id = s1.body._id;
    assert.equal((await call("POST", `/sessions/${id}/book`, { userId: ghost })).status, 404);
    assert.equal((await call("POST", `/sessions/${ghost}/book`, { userId: u.body._id })).status, 404);
    const booked = await call("POST", `/sessions/${id}/book`, { userId: u.body._id });
    assert.equal(booked.status, 200);
    assert.equal(booked.body.status, "BOOKED");
    assert.equal(booked.body.userId, u.body._id);
    assert.equal((await call("POST", `/sessions/${id}/book`, { userId: u.body._id })).status, 409);
    assert.equal((await call("GET", `/sessions/available?dateTimestamp=${day}`)).body.length, 1);

    // concurrent booking: exactly one winner
    const s3 = await mk(14, 15);
    const racers = await Promise.all(
      Array.from({ length: 5 }, () => call("POST", `/sessions/${s3.body._id}/book`, { userId: u.body._id }))
    );
    assert.equal(racers.filter((r) => r.status === 200).length, 1);

    // complete
    assert.equal((await call("PATCH", `/sessions/${s2.body._id}/complete`)).status, 409); // still AVAILABLE
    assert.equal((await call("PATCH", `/sessions/${ghost}/complete`)).status, 404);
    const done = await call("PATCH", `/sessions/${id}/complete`);
    assert.equal(done.status, 200);
    assert.equal(done.body.status, "COMPLETED");
    assert.ok(done.body.completedAt);
    assert.equal((await call("PATCH", `/sessions/${id}/complete`)).status, 409);

    // user history (aggregation)
    const hist = await call("GET", `/users/${u.body._id}/sessions`);
    assert.equal(hist.status, 200);
    assert.equal(hist.body.completedSessions.length, 1);
    assert.equal(hist.body.upcomingSessions.length, 1); // s3
    assert.equal(hist.body.completedSessions[0]._id, id);
    assert.equal(hist.body.upcomingSessions[0].teacher.fullName, "Ravi");
    assert.equal((await call("GET", `/users/${ghost}/sessions`)).status, 404);
    assert.equal((await call("GET", "/users/bad/sessions")).status, 400);

    assert.equal((await call("GET", "/nope")).status, 404);
    console.log("pass: all smoke checks");
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
