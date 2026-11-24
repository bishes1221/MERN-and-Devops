import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

test("health endpoint reports readiness without a database connection", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, "degraded");
  assert.equal(typeof body.databaseReady, "boolean");
  assert.equal(body.database, "disconnected");
});

test("database-backed API routes fail fast while MongoDB is disconnected", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/gems`);
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error.message, "Database is unavailable. Try again shortly.");
});

test("anonymous session lookup succeeds without a database", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/me`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.user, null);
});

test("unknown API routes still return 404 while MongoDB is disconnected", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/not-a-resource`);
  assert.equal(response.status, 404);
});

test("logout remains available while MongoDB is disconnected", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/logout`, { method: "POST" });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.message, "Logged out.");
  assert.match(response.headers.get("set-cookie") || "", /token=/);
});
