import * as THREE from "three";
import {
  ARENA_RADIUS,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  PLAYER_RADIUS,
  PLAYER_SPEED,
} from "./constants.js";

const BODY_COLOR = 0xf0eee4;
const ACCENT_COLOR = 0xa5d6c6;

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...options });
}

function makeSphere(radius, material) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 16), material);
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0);
    this.position = this.group.position;
    this.velocity = new THREE.Vector3();
    this.moveInput = new THREE.Vector2();
    this.facing = new THREE.Vector3(0, 0, -1);
    this.dashDirection = new THREE.Vector3();
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.animationClock = 0;
    this.damagedTimer = 0;
    this.flashMaterial = makeMaterial(BODY_COLOR, { emissive: 0x000000 });
    this.accentMaterial = makeMaterial(ACCENT_COLOR, { emissive: ACCENT_COLOR, emissiveIntensity: 0.17 });
    this.buildAvatar();
    scene.add(this.group);
  }

  buildAvatar() {
    const suit = this.flashMaterial;
    const dark = makeMaterial(0x45495a, { metalness: 0.28 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x718f9e,
      roughness: 0.23,
      metalness: 0.4,
      emissive: 0x233d48,
      emissiveIntensity: 0.45,
    });

    this.torso = new THREE.Group();
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.38, 22, 16), suit);
    chest.scale.set(0.84, 1, 0.7);
    chest.position.y = 0.83;
    this.torso.add(chest);

    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.43, 0.22), dark);
    pack.position.set(0, 0.9, 0.3);
    this.torso.add(pack);

    const chestLight = makeSphere(0.075, this.accentMaterial);
    chestLight.position.set(0, 0.88, -0.265);
    this.torso.add(chestLight);

    this.head = new THREE.Group();
    const helmet = makeSphere(0.29, suit);
    helmet.position.y = 1.37;
    this.head.add(helmet);

    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), glass);
    visor.scale.set(1, 0.73, 0.5);
    visor.position.set(0, 1.39, -0.15);
    this.head.add(visor);

    const eyeMaterial = makeMaterial(0xfaf8eb, { emissive: 0xffffff, emissiveIntensity: 0.9 });
    const leftEye = makeSphere(0.026, eyeMaterial);
    const rightEye = makeSphere(0.026, eyeMaterial);
    leftEye.position.set(-0.055, 1.39, -0.237);
    rightEye.position.set(0.055, 1.39, -0.237);
    this.head.add(leftEye, rightEye);

    this.leftArm = this.makeLimb(suit, 0.12, 0.38);
    this.rightArm = this.makeLimb(suit, 0.12, 0.38);
    this.leftArm.position.set(-0.39, 0.84, 0);
    this.rightArm.position.set(0.39, 0.84, 0);
    this.leftArm.rotation.z = -0.18;
    this.rightArm.rotation.z = 0.18;

    this.leftLeg = this.makeLimb(dark, 0.15, 0.38);
    this.rightLeg = this.makeLimb(dark, 0.15, 0.38);
    this.leftLeg.position.set(-0.15, 0.35, 0);
    this.rightLeg.position.set(0.15, 0.35, 0);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.56, 28),
      new THREE.MeshBasicMaterial({ color: 0x10131d, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.025;

    this.group.add(
      this.torso,
      this.head,
      this.leftArm,
      this.rightArm,
      this.leftLeg,
      this.rightLeg,
      this.shadow,
    );
    this.group.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
    });
  }

  makeLimb(material, radius, length) {
    const pivot = new THREE.Group();
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length * 0.55, 4, 8), material);
    limb.position.y = -length * 0.18;
    pivot.add(limb);
    return pivot;
  }

  setMoveInput(x, z) {
    this.moveInput.set(x, z);
    if (this.moveInput.lengthSq() > 1) this.moveInput.normalize();
  }

  startDash() {
    if (this.dashCooldown > 0) return false;
    if (this.moveInput.lengthSq() > 0) {
      this.dashDirection.set(this.moveInput.x, 0, this.moveInput.y).normalize();
    } else {
      this.dashDirection.copy(this.facing);
    }
    this.dashTimer = DASH_DURATION;
    this.dashCooldown = DASH_COOLDOWN;
    return true;
  }

  update(delta, elapsed) {
    this.animationClock = elapsed;
    this.dashTimer = Math.max(0, this.dashTimer - delta);
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    this.damagedTimer = Math.max(0, this.damagedTimer - delta);

    const moving = this.moveInput.lengthSq() > 0;
    const direction = new THREE.Vector3(this.moveInput.x, 0, this.moveInput.y);
    if (moving) {
      this.facing.copy(direction).normalize();
      this.group.rotation.y = Math.atan2(this.facing.x, this.facing.z);
    }

    const speed = this.dashTimer > 0 ? DASH_SPEED : moving ? PLAYER_SPEED : 0;
    const travelDirection = this.dashTimer > 0 ? this.dashDirection : direction;
    const drag = Math.exp(-8 * delta);
    this.velocity.multiplyScalar(drag);
    if (speed > 0) this.velocity.addScaledVector(travelDirection, speed * (1 - drag));

    this.position.addScaledVector(this.velocity, delta);
    const distance = Math.hypot(this.position.x, this.position.z);
    const safeRadius = ARENA_RADIUS - PLAYER_RADIUS;
    if (distance > safeRadius) {
      this.position.x *= safeRadius / distance;
      this.position.z *= safeRadius / distance;
      const outward = new THREE.Vector3(this.position.x, 0, this.position.z).normalize();
      const outwardSpeed = this.velocity.dot(outward);
      if (outwardSpeed > 0) this.velocity.addScaledVector(outward, -outwardSpeed);
    }

    const bob = moving ? Math.abs(Math.sin(elapsed * 10)) * 0.055 : Math.sin(elapsed * 2.2) * 0.025;
    this.group.position.y = bob + (this.dashTimer > 0 ? 0.11 : 0);
    this.torso.rotation.z = moving ? Math.sin(elapsed * 5) * 0.045 : 0;
    this.leftLeg.rotation.x = moving ? Math.sin(elapsed * 10) * 0.42 : 0;
    this.rightLeg.rotation.x = moving ? Math.sin(elapsed * 10 + Math.PI) * 0.42 : 0;
    this.leftArm.rotation.x = moving ? Math.sin(elapsed * 10 + Math.PI) * 0.28 : 0;
    this.rightArm.rotation.x = moving ? Math.sin(elapsed * 10) * 0.28 : 0;
    this.flashMaterial.emissive.setHex(this.damagedTimer > 0 ? 0xc84456 : 0x000000);
    this.flashMaterial.emissiveIntensity = this.damagedTimer > 0 ? 0.75 : 0;
  }

  damage() {
    if (this.damagedTimer > 0) return false;
    this.damagedTimer = 1.3;
    return true;
  }

  reset() {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.moveInput.set(0, 0);
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.damagedTimer = 0;
  }
}
