import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { getCompassBearing, getCompassTarget } from "./compass.js";

test("the compass selects the nearest uncollected light", () => {
  const playerPosition = new THREE.Vector3(0, 0, 0);
  const shards = [
    { group: { position: new THREE.Vector3(4, 0, 0) }, collected: false },
    { group: { position: new THREE.Vector3(0, 0, 2) }, collected: false },
    { group: { position: new THREE.Vector3(0, 0, 1) }, collected: true },
  ];
  const homePosition = new THREE.Vector3(0, 0, 0);

  const target = getCompassTarget(shards, homePosition, playerPosition, false);

  assert.equal(target.label, "NEAREST LIGHT");
  assert.strictEqual(target.position, shards[1].group.position);
});

test("the compass points home after every light is collected", () => {
  const homePosition = new THREE.Vector3(0, 0, 0);
  const target = getCompassTarget([], homePosition, new THREE.Vector3(4, 0, 0), true);

  assert.equal(target.label, "HOME BEACON");
  assert.strictEqual(target.position, homePosition);
});

test("bearing follows the target direction relative to the camera", () => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);
  const playerPosition = new THREE.Vector3(0, 0, 0);

  const ahead = getCompassBearing(new THREE.Vector3(0, 0, -5), playerPosition, camera);
  const right = getCompassBearing(new THREE.Vector3(5, 0, 0), playerPosition, camera);
  const left = getCompassBearing(new THREE.Vector3(-5, 0, 0), playerPosition, camera);

  assert.ok(Math.abs(ahead) < 0.001);
  assert.ok(right > 0);
  assert.ok(left < 0);
  assert.ok(Math.abs(right + left) < 0.001);
});
