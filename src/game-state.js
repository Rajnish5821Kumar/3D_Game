import { MAX_LIVES, ROUND_SECONDS, SHARD_TOTAL } from "./constants.js";

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = "ready";
    this.elapsed = 0;
    this.shards = 0;
    this.lives = MAX_LIVES;
    this.timeBonus = 0;
  }

  start() {
    if (this.phase !== "ready") return false;
    this.phase = "playing";
    return true;
  }

  update(delta) {
    if (this.phase !== "playing") return;
    this.elapsed += Math.max(delta, 0);
    if (this.timeLeft <= 0) this.phase = "lost";
  }

  collectShard() {
    if (this.phase !== "playing" || this.shards >= SHARD_TOTAL) return false;
    this.shards += 1;
    if (this.shards % 5 === 0) this.timeBonus += 5;
    return true;
  }

  takeHit() {
    if (this.phase !== "playing") return false;
    this.lives -= 1;
    if (this.lives <= 0) this.phase = "lost";
    return true;
  }

  enterHome() {
    if (this.phase !== "playing" || this.shards < SHARD_TOTAL) return false;
    this.phase = "won";
    return true;
  }

  get timeLeft() {
    return Math.max(0, ROUND_SECONDS - this.elapsed + this.timeBonus);
  }

  get score() {
    return this.shards * 100 + this.lives * 50 + Math.floor(this.timeLeft) * 2;
  }
}
