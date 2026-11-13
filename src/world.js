import * as THREE from "three";
import { ARENA_RADIUS, SHARD_TOTAL } from "./constants.js";

const shardSpots = [
  [-17, -8],
  [-13, 7],
  [-8, -18],
  [-4, 13],
  [2, -11],
  [7, 17],
  [11, -4],
  [16, 8],
  [19, -11],
  [0, 22],
];

const sentryPaths = [
  { centerX: -11, centerZ: -1, radius: 4.2, speed: 0.63, phase: 0.8, color: 0xc69cef },
  { centerX: 9, centerZ: 5, radius: 5, speed: -0.48, phase: 2.3, color: 0xffc686 },
  { centerX: 3, centerZ: -17, radius: 2.9, speed: 0.8, phase: 4.5, color: 0xf29aab },
];

function standard(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...options });
}

function makeRing(radius, tube, color, opacity = 1) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 8, 84),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }),
  );
  ring.rotation.x = Math.PI / 2;
  return ring;
}

function createShard(scene, x, z, index) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0xe7fff0,
    emissive: 0x8be4c0,
    emissiveIntensity: 1.15,
    metalness: 0.2,
    roughness: 0.18,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.39, 0), crystalMaterial);
  crystal.scale.set(0.74, 1.3, 0.74);
  crystal.castShadow = true;
  group.add(crystal);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.018, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0xbaf3d9, transparent: true, opacity: 0.63 }),
  );
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  const light = new THREE.PointLight(0x8be4c0, 1, 3.5, 2);
  light.position.y = 0.35;
  group.add(light);
  scene.add(group);
  return { group, crystal, halo, light, baseY: 0.82, phase: index * 0.75, collected: false };
}

function createSentry(scene, { centerX, centerZ, radius, speed, phase, color }) {
  const group = new THREE.Group();
  const glowMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.92,
    roughness: 0.28,
    metalness: 0.13,
  });
  const darkMaterial = standard(0x292b3a, { metalness: 0.36, roughness: 0.42 });

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), glowMaterial);
  core.castShadow = true;
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.055, 8, 32),
    darkMaterial,
  );
  ring.rotation.x = 0.6;
  group.add(ring);

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff5dc }),
  );
  dot.position.set(0, 0.7, 0);
  group.add(dot);

  const light = new THREE.PointLight(color, 0.8, 3.7, 2);
  group.add(light);

  scene.add(group);
  return { group, core, ring, centerX, centerZ, radius, speed, phase, light };
}

function addDecoration(scene, random) {
  const stone = standard(0x444555, { roughness: 0.92 });
  const paleStone = standard(0x737080, { roughness: 0.82 });
  for (let index = 0; index < 38; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 6 + random() * 20.5;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const height = 0.2 + random() * 0.65;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.35 + random() * 0.6, 0),
      random() > 0.45 ? stone : paleStone,
    );
    rock.position.set(x, height / 2, z);
    rock.rotation.set(random(), random(), random());
    rock.scale.set(1 + random() * 0.55, height, 0.7 + random() * 0.5);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  const pillarMaterial = standard(0x393948, { metalness: 0.2 });
  const pillarGlow = new THREE.MeshStandardMaterial({
    color: 0xe5cc92,
    emissive: 0xd9b972,
    emissiveIntensity: 0.66,
    roughness: 0.38,
  });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(angle) * (ARENA_RADIUS - 1.2);
    const z = Math.sin(angle) * (ARENA_RADIUS - 1.2);
    const pillar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.4, 7), pillarMaterial);
    base.position.y = 0.2;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.25, 7), pillarMaterial);
    column.position.y = 1.025;
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), pillarGlow);
    cap.position.y = 1.88;
    const postLight = new THREE.PointLight(0xe6cc91, 0.24, 6);
    postLight.position.y = 1.9;
    pillar.add(base, column, cap, postLight);
    pillar.position.set(x, 0, z);
    pillar.castShadow = true;
    scene.add(pillar);
  }
}

function createHome(scene) {
  const home = new THREE.Group();
  home.position.set(0, 0, 0);

  const platformMaterial = standard(0x67636a, { roughness: 0.68, metalness: 0.12 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.0, 0.34, 48), platformMaterial);
  base.position.y = 0.17;
  base.castShadow = true;
  base.receiveShadow = true;
  home.add(base, makeRing(2.7, 0.055, 0xe8c584, 0.8), makeRing(1.95, 0.025, 0xa5d6c6, 0.7));

  const beaconMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5c88c,
    emissive: 0x987143,
    emissiveIntensity: 0.45,
    roughness: 0.45,
  });
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.78, 0), beaconMaterial);
  beacon.position.y = 1.25;
  beacon.scale.set(1, 1.3, 1);
  beacon.castShadow = true;
  home.add(beacon);

  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.06, 8, 42),
    new THREE.MeshStandardMaterial({
      color: 0xd8bd83,
      emissive: 0x9b8057,
      emissiveIntensity: 0.25,
      roughness: 0.4,
    }),
  );
  hoop.position.y = 1.15;
  hoop.rotation.x = Math.PI / 2;
  home.add(hoop);

  const light = new THREE.PointLight(0xeac88b, 1.5, 13, 2);
  light.position.y = 2.1;
  home.add(light);
  scene.add(home);
  return { group: home, beacon, hoop, light, baseMaterial: beaconMaterial };
}

function addStars(scene) {
  const positions = new Float32Array(360 * 3);
  let seed = 98431;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let index = 0; index < 360; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 38 + random() * 30;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 15 + random() * 45;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xfff3d9,
    size: 0.13,
    transparent: true,
    opacity: 0.78,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(geometry, material));
}

export function createWorld(scene) {
  const random = () => {
    const value = Math.sin(createWorld.seed++) * 43758.5453;
    return value - Math.floor(value);
  };
  createWorld.seed = 34;

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x77717a,
    roughness: 0.93,
    metalness: 0,
  });
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS, 0.8, 72), groundMaterial);
  ground.position.y = -0.4;
  ground.receiveShadow = true;
  ground.castShadow = true;
  scene.add(ground);

  scene.add(makeRing(ARENA_RADIUS - 0.04, 0.13, 0x393541));
  scene.add(makeRing(ARENA_RADIUS - 0.38, 0.04, 0xc0ad8e, 0.48));
  scene.add(makeRing(8.7, 0.026, 0xa89780, 0.32));
  scene.add(makeRing(18.8, 0.024, 0xa89780, 0.27));

  addDecoration(scene, random);
  addStars(scene);
  const home = createHome(scene);
  const shards = shardSpots.slice(0, SHARD_TOTAL).map(([x, z], index) => createShard(scene, x, z, index));
  const sentries = sentryPaths.map((path) => createSentry(scene, path));

  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(160 * 3);
  for (let index = 0; index < 160; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = random() * (ARENA_RADIUS - 2);
    dustPositions[index * 3] = Math.cos(angle) * distance;
    dustPositions[index * 3 + 1] = 0.18 + random() * 0.42;
    dustPositions[index * 3 + 2] = Math.sin(angle) * distance;
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({ color: 0xf7e5c4, size: 0.055, transparent: true, opacity: 0.5 }),
  );
  scene.add(dust);

  return { ground, home, shards, sentries, dust };
}

export function animateWorld(world, elapsed, hasAllShards, delta) {
  for (const shard of world.shards) {
    if (shard.collected) continue;
    shard.group.position.y = shard.baseY + Math.sin(elapsed * 1.6 + shard.phase) * 0.17;
    shard.crystal.rotation.y = elapsed * 0.72 + shard.phase;
    shard.crystal.rotation.z = Math.sin(elapsed + shard.phase) * 0.12;
    shard.halo.rotation.z = -elapsed * 0.55;
    shard.light.intensity = 0.74 + Math.sin(elapsed * 2 + shard.phase) * 0.24;
  }

  for (const sentry of world.sentries) {
    const angle = elapsed * sentry.speed + sentry.phase;
    sentry.group.position.set(
      sentry.centerX + Math.cos(angle) * sentry.radius,
      1.2 + Math.sin(elapsed * 1.8 + sentry.phase) * 0.16,
      sentry.centerZ + Math.sin(angle) * sentry.radius * 0.72,
    );
    sentry.core.rotation.set(elapsed * 0.53, elapsed * 0.76, elapsed * -0.38);
    sentry.ring.rotation.y += delta * 0.45;
    sentry.ring.rotation.z += delta * 0.25;
  }

  const homeReady = hasAllShards;
  const glow = homeReady ? 0.8 + Math.sin(elapsed * 3) * 0.24 : 0;
  world.home.baseMaterial.emissive.setHex(homeReady ? 0x6da98c : 0x987143);
  world.home.baseMaterial.emissiveIntensity = homeReady ? glow : 0.45;
  world.home.beacon.rotation.y = elapsed * (homeReady ? 0.62 : 0.24);
  world.home.beacon.position.y = 1.25 + Math.sin(elapsed * 1.8) * 0.12;
  world.home.hoop.rotation.z = elapsed * 0.32;
  world.home.hoop.material.color.setHex(homeReady ? 0xa5d6c6 : 0xd8bd83);
  world.home.light.intensity = homeReady ? 2 + Math.sin(elapsed * 3) * 0.5 : 1.3;
  world.dust.rotation.y = elapsed * 0.018;
}
