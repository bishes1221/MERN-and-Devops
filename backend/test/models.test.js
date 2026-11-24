import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Gem from "../src/models/Gem.js";
import User from "../src/models/User.js";
import Upvote from "../src/models/Upvote.js";
import Bookmark from "../src/models/Bookmark.js";
import Review from "../src/models/Review.js";
import CuratorProfile from "../src/models/CuratorProfile.js";
import BucketList from "../src/models/BucketList.js";
import GemClaim from "../src/models/GemClaim.js";
import GemUpdate from "../src/models/GemUpdate.js";

test("core models declare timestamps and required uniqueness/geo indexes", () => {
  for (const model of [User, Gem, Upvote, Bookmark, Review, CuratorProfile, BucketList, GemClaim, GemUpdate]) {
    assert.equal(model.schema.options.timestamps, true, `${model.modelName} timestamps`);
  }
  assert.ok(Gem.schema.indexes().some(([index]) => index.location === "2dsphere"));
  for (const model of [Upvote, Bookmark, Review]) {
    assert.ok(model.schema.indexes().some(([index, options]) => index.user === 1 && index.gem === 1 && options.unique));
  }
  assert.ok(CuratorProfile.schema.indexes().some(([index, options]) => index.user === 1 && options.unique));
  assert.ok(BucketList.schema.indexes().some(([index, options]) => index.user === 1 && index.title === 1 && options.unique));
  assert.ok(GemClaim.schema.indexes().some(([index, options]) => index.gem === 1 && index.status === 1 && options.unique && options.partialFilterExpression.status === "pending"));
});

test("BucketList validates title length and gem limit", async () => {
  const list = new BucketList({ user: new mongoose.Types.ObjectId(), title: "x", gems: Array(101).fill(new mongoose.Types.ObjectId()) });
  await assert.rejects(list.validate(), (error) => {
    assert.ok(error.errors.title);
    assert.match(error.errors.gems.message, /at most 100 gems/);
    return true;
  });

  test("GemUpdate requires either a note or opening-hours information", async () => {
    const update = new GemUpdate({ gem: new mongoose.Types.ObjectId(), curator: new mongoose.Types.ObjectId() });
    await assert.rejects(update.validate(), /An update note or opening hours are required/);
  });
});

test("Gem rejects invalid GeoJSON coordinate values", async () => {
  const gem = new Gem({
    title: "Test place",
    description: "A sufficiently long description for validation.",
    category: "cafe",
    address: "Kathmandu",
    createdBy: new mongoose.Types.ObjectId(),
    location: { type: "Point", coordinates: [200, 95] },
  });
  await assert.rejects(gem.validate(), /Coordinates must be/);
});

test("Gem rejects a price level outside the supported range", async () => {
  const gem = new Gem({
    title: "Test place",
    description: "A sufficiently long description for validation.",
    category: "cafe",
    address: "Kathmandu",
    createdBy: new mongoose.Types.ObjectId(),
    location: { type: "Point", coordinates: [85.324, 27.7172] },
    priceLevel: 4,
  });
  await assert.rejects(gem.validate(), /maximum allowed value \(3\)/);
});

test("User hides password from normal queries", () => {
  assert.equal(User.schema.path("password").options.select, false);
});
