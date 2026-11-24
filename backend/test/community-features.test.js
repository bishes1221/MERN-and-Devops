import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Gem from "../src/models/Gem.js";
import CuratorProfile from "../src/models/CuratorProfile.js";
import BucketList from "../src/models/BucketList.js";
import Bookmark from "../src/models/Bookmark.js";

let mongo;
let server;
let baseUrl;
const secret = "test-jwt-secret-that-is-long-enough-for-auth";

before(async () => {
  process.env.JWT_SECRET = secret;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri("hidden-gems-tests"));
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo?.stop();
});

async function createUser(name, role = "explorer") {
  return User.create({
    name,
    email: `${name.toLowerCase().replaceAll(" ", ".")}-${new mongoose.Types.ObjectId()}@example.test`,
    password: "integration-test-password",
    role,
  });
}

function tokenFor(user) {
  return jwt.sign({ sub: String(user._id) }, secret);
}

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, data: response.status === 204 ? null : await response.json() };
}

async function createApprovedGem(createdBy, title = "A quiet courtyard") {
  return Gem.create({
    title,
    description: "A peaceful place tucked behind a busy neighborhood street.",
    category: "heritage-courtyards",
    address: "Patan, Kathmandu",
    location: { type: "Point", coordinates: [85.324, 27.7172] },
    createdBy: createdBy._id,
    status: "approved",
  });
}

test("bucket lists are owner-scoped and accept only approved gems", async () => {
  const owner = await createUser("List Owner");
  const otherUser = await createUser("Other Explorer");
  const submitter = await createUser("Gem Submitter");
  const gem = await createApprovedGem(submitter);
  const pendingGem = await Gem.create({
    title: "Pending courtyard",
    description: "A peaceful place tucked behind a busy neighborhood street.",
    category: "heritage-courtyards",
    address: "Patan, Kathmandu",
    location: { type: "Point", coordinates: [85.325, 27.718] },
    createdBy: submitter._id,
  });
  const ownerToken = tokenFor(owner);

  const created = await request("/bucket-lists", {
    token: ownerToken,
    method: "POST",
    body: { title: "Slow afternoons", description: "Quiet corners for the weekend." },
  });
  assert.equal(created.response.status, 201);
  const listId = created.data.list._id;

  const added = await request(`/bucket-lists/${listId}/gems/${gem._id}`, { token: ownerToken, method: "PUT" });
  assert.equal(added.response.status, 200);
  const duplicateAdd = await request(`/bucket-lists/${listId}/gems/${gem._id}`, { token: ownerToken, method: "PUT" });
  assert.equal(duplicateAdd.response.status, 200);
  const listing = await request(`/bucket-lists/${listId}`, { token: ownerToken });
  assert.equal(listing.data.list.gems.length, 1);
  assert.equal(listing.data.list.gems[0]._id, String(gem._id));

  const pendingAdd = await request(`/bucket-lists/${listId}/gems/${pendingGem._id}`, { token: ownerToken, method: "PUT" });
  assert.equal(pendingAdd.response.status, 404);
  const privateList = await request(`/bucket-lists/${listId}`, { token: tokenFor(otherUser) });
  assert.equal(privateList.response.status, 404);
  const updated = await request(`/bucket-lists/${listId}`, {
    token: ownerToken,
    method: "PATCH",
    body: { title: "Slow weekends" },
  });
  assert.equal(updated.data.list.title, "Slow weekends");
  const deleted = await request(`/bucket-lists/${listId}`, { token: ownerToken, method: "DELETE" });
  assert.equal(deleted.response.status, 204);
  assert.equal((await request(`/bucket-lists/${listId}`, { token: ownerToken })).response.status, 404);
});

test("curator claims require admin approval and enable updates and engagement metrics", async () => {
  const curatorUser = await createUser("Valley Curator", "curator");
  const submitter = await createUser("Neighborhood Explorer");
  const admin = await createUser("Community Admin", "admin");
  const profile = await CuratorProfile.create({
    user: curatorUser._id,
    bio: "A local guide to the quiet corners and food stalls of Patan.",
    status: "approved",
  });
  const gem = await createApprovedGem(submitter, "A tucked-away tea house");
  const curatorToken = tokenFor(curatorUser);
  const adminToken = tokenFor(admin);

  const claimResponse = await request("/curators/claims", {
    token: curatorToken,
    method: "POST",
    body: { gemId: String(gem._id), details: "I manage this tea house and can keep its details accurate." },
  });
  assert.equal(claimResponse.response.status, 201);
  const claimId = claimResponse.data.claim._id;
  const approved = await request(`/admin/claims/${claimId}`, {
    token: adminToken,
    method: "PATCH",
    body: { status: "approved" },
  });
  assert.equal(approved.response.status, 200);
  assert.equal(String((await Gem.findById(gem._id)).curator), String(profile._id));
  const savedBy = await createUser("Bucket List Explorer");
  await Bookmark.create({ user: savedBy._id, gem: gem._id });
  await BucketList.create({ user: savedBy._id, title: "Future visits", gems: [gem._id] });
  await Gem.updateOne({ _id: gem._id }, { $set: { upvoteCount: 3 } });

  const update = await request(`/curators/gems/${gem._id}/updates`, {
    token: curatorToken,
    method: "POST",
    body: { message: "The courtyard is especially quiet before noon.", openingHours: "Daily, 9 am–6 pm" },
  });
  assert.equal(update.response.status, 201);
  const detail = await request(`/gems/${gem._id}`);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.data.gem.curatorUpdates[0].message, "The courtyard is especially quiet before noon.");
  assert.equal(detail.data.gem.viewCount, 1);
  assert.equal(detail.data.gem.openingHours, "Daily, 9 am–6 pm");

  const metrics = await request("/curators/me/metrics", { token: curatorToken });
  assert.equal(metrics.response.status, 200);
  assert.deepEqual(metrics.data.metrics, { gemCount: 1, views: 1, upvotes: 3, saves: 2 });
  const publicStats = await request("/public/stats");
  assert.equal(publicStats.response.status, 200);
  assert.ok(publicStats.data.stats.gemsMapped >= 1);
  assert.ok(publicStats.data.featuredCurators.some((item) => String(item._id) === String(profile._id)));

  const secondGem = await createApprovedGem(submitter, "A tucked-away book shop");
  const rejectedClaim = await request("/curators/claims", {
    token: curatorToken,
    method: "POST",
    body: { gemId: String(secondGem._id), details: "I have detailed local knowledge of this independent book shop." },
  });
  const rejected = await request(`/admin/claims/${rejectedClaim.data.claim._id}`, {
    token: adminToken,
    method: "PATCH",
    body: { status: "rejected" },
  });
  assert.equal(rejected.response.status, 200);
  assert.equal((await Gem.findById(secondGem._id)).curator, undefined);
});

test("explorer badges reflect approved contribution thresholds", async () => {
  const explorer = await createUser("Valley Mapper");
  for (let index = 0; index < 5; index += 1) {
    await Gem.create({
      title: `Local momo stop ${index + 1}`,
      description: "A neighborhood place with a friendly local story.",
      category: "street-food-momo",
      address: "Patan, Kathmandu",
      location: { type: "Point", coordinates: [85.32 + index / 1000, 27.71 + index / 1000] },
      createdBy: explorer._id,
      status: "approved",
      upvoteCount: 5,
    });
  }
  const profile = await request(`/users/${explorer._id}`);
  assert.equal(profile.response.status, 200);
  assert.deepEqual(profile.data.user.badges.map((badge) => badge.name), ["Momo Hunter", "Valley Explorer", "Top Contributor"]);
  const dashboard = await request("/dashboard", { token: tokenFor(explorer) });
  assert.equal(dashboard.response.status, 200);
  assert.equal(dashboard.data.dashboard.badges.length, 3);
});
