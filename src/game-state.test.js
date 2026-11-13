import assert from "node:assert/strict";
import test from "node:test";
import { GameState } from "./game-state.js";
import { ROUND_SECONDS, SHARD_TOTAL } from "./constants.js";

test("the round must be started before game progress counts", () => {
  const state = new GameState();
  state.update(4);
  assert.equal(state.timeLeft, ROUND_SECONDS);
  assert.equal(state.collectShard(), false);
  assert.equal(state.start(), true);
  assert.equal(state.start(), false);
  state.update(4);
  assert.equal(state.timeLeft, ROUND_SECONDS - 4);
});

test("every fifth collected shard grants a little extra time", () => {
  const state = new GameState();
  state.start();
  state.update(12);

  for (let index = 0; index < 5; index += 1) assert.equal(state.collectShard(), true);
  assert.equal(state.shards, 5);
  assert.equal(state.timeLeft, ROUND_SECONDS - 7);
  for (let index = 5; index < SHARD_TOTAL; index += 1) assert.equal(state.collectShard(), true);
  assert.equal(state.timeLeft, ROUND_SECONDS - 2);
  assert.equal(state.collectShard(), false);
});

test("home can only be reached after all ten shards have been found", () => {
  const state = new GameState();
  state.start();
  assert.equal(state.enterHome(), false);
  for (let index = 0; index < SHARD_TOTAL - 1; index += 1) state.collectShard();
  assert.equal(state.enterHome(), false);
  assert.equal(state.collectShard(), true);
  assert.equal(state.enterHome(), true);
  assert.equal(state.phase, "won");
  assert.equal(state.collectShard(), false);
});

test("three hits or running out of time ends the round", () => {
  const hurtState = new GameState();
  hurtState.start();
  assert.equal(hurtState.takeHit(), true);
  assert.equal(hurtState.takeHit(), true);
  assert.equal(hurtState.takeHit(), true);
  assert.equal(hurtState.lives, 0);
  assert.equal(hurtState.phase, "lost");
  assert.equal(hurtState.takeHit(), false);

  const timerState = new GameState();
  timerState.start();
  timerState.update(ROUND_SECONDS);
  assert.equal(timerState.timeLeft, 0);
  assert.equal(timerState.phase, "lost");
});
