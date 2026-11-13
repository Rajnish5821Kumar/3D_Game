import * as THREE from "three";

export function getCompassTarget(shards, homePosition, playerPosition, hasAllShards) {
  if (hasAllShards) return { position: homePosition, label: "HOME BEACON" };

  let closestShard = null;
  let closestDistanceSquared = Infinity;

  for (const shard of shards) {
    if (shard.collected) continue;
    const dx = shard.group.position.x - playerPosition.x;
    const dz = shard.group.position.z - playerPosition.z;
    const distanceSquared = dx * dx + dz * dz;

    if (distanceSquared < closestDistanceSquared) {
      closestShard = shard;
      closestDistanceSquared = distanceSquared;
    }
  }

  if (!closestShard) return { position: homePosition, label: "HOME BEACON" };
  return { position: closestShard.group.position, label: "NEAREST LIGHT" };
}

export function getCompassBearing(targetPosition, playerPosition, camera) {
  camera.updateMatrixWorld(true);
  const direction = targetPosition
    .clone()
    .sub(playerPosition)
    .setY(0)
    .normalize()
    .applyQuaternion(camera.quaternion.clone().invert());
  return THREE.MathUtils.radToDeg(Math.atan2(direction.x, direction.y));
}
