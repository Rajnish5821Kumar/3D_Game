import * as THREE from "three";
import { SHARD_TOTAL } from "./constants.js";
import { GameState } from "./game-state.js";
import { Player } from "./player.js";
import { animateWorld, createWorld } from "./world.js";

const KEY_DIRECTIONS = new Map([
  ["KeyW", [0, -1]],
  ["ArrowUp", [0, -1]],
  ["KeyS", [0, 1]],
  ["ArrowDown", [0, 1]],
  ["KeyA", [-1, 0]],
  ["ArrowLeft", [-1, 0]],
  ["KeyD", [1, 0]],
  ["ArrowRight", [1, 0]],
]);

const formatTime = (seconds) => {
  const wholeSeconds = Math.ceil(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

function setHidden(element, hidden) {
  element.classList.toggle("hidden", hidden);
  element.setAttribute("aria-hidden", String(hidden));
}

export class Game {
  constructor() {
    this.root = document.querySelector("#game-root");
    this.canvas = document.querySelector("#game-canvas");
    this.elements = {
      startScreen: document.querySelector("#start-screen"),
      endScreen: document.querySelector("#end-screen"),
      startButton: document.querySelector("#start-button"),
      restartButton: document.querySelector("#restart-button"),
      endEyebrow: document.querySelector("#end-eyebrow"),
      endTitle: document.querySelector("#end-title"),
      endCopy: document.querySelector("#end-copy"),
      finalScore: document.querySelector("#final-score"),
      timer: document.querySelector("#timer"),
      shardCount: document.querySelector("#shard-count"),
      shardMeterFill: document.querySelector("#shard-meter-fill"),
      lives: document.querySelector("#lives"),
      hint: document.querySelector("#hint"),
      soundToggle: document.querySelector("#sound-toggle"),
      dashButton: document.querySelector("#dash-button"),
    };

    this.state = new GameState();
    this.keys = new Set();
    this.lastTime = 0;
    this.elapsed = 0;
    this.frame = 0;
    this.hintTimer = 0;
    this.hasAllShards = false;
    this.soundEnabled = true;
    this.context = null;
    this.callbacks = [];
    this.tmpPosition = new THREE.Vector3();
    this.cameraTarget = new THREE.Vector3();
    this.cameraGoal = new THREE.Vector3();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10131d);
    this.scene.fog = new THREE.FogExp2(0x10131d, 0.0105);
    this.camera = new THREE.PerspectiveCamera(39, 1, 0.1, 145);
    this.camera.position.set(0, 32, 33);
    this.camera.lookAt(0, 0, 0);

    this.buildLighting();
    this.world = createWorld(this.scene);
    this.player = new Player(this.scene);
    this.resize();
    this.bindEvents();
    this.tick = this.tick.bind(this);
    this.requestFrame = window.requestAnimationFrame(this.tick);
  }

  buildLighting() {
    this.scene.add(new THREE.HemisphereLight(0xe4ddca, 0x383b4c, 2.15));

    const moon = new THREE.DirectionalLight(0xf0e3c9, 2.4);
    moon.position.set(-12, 24, 9);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = -34;
    moon.shadow.camera.right = 34;
    moon.shadow.camera.top = 34;
    moon.shadow.camera.bottom = -34;
    moon.shadow.bias = -0.0004;
    this.scene.add(moon);

    const fill = new THREE.DirectionalLight(0x9daccb, 0.75);
    fill.position.set(15, 11, -16);
    this.scene.add(fill);

    const floorGlow = new THREE.PointLight(0x8580b1, 8, 44, 2);
    floorGlow.position.set(-4, 9, 7);
    this.scene.add(floorGlow);
  }

  bindEvents() {
    this.listen(document, "keydown", (event) => {
      if (event.code === "Space" || KEY_DIRECTIONS.has(event.code)) event.preventDefault();
      if (event.code === "Space" && !event.repeat) this.dash();
      this.keys.add(event.code);
    });
    this.listen(document, "keyup", (event) => this.keys.delete(event.code));
    this.listen(window, "blur", () => this.clearKeys());
    this.listen(document, "visibilitychange", () => {
      if (document.hidden) this.clearKeys();
    });
    this.listen(window, "resize", () => this.resize());
    this.listen(this.elements.startButton, "click", () => this.start());
    this.listen(this.elements.restartButton, "click", () => this.restart());
    this.listen(this.elements.dashButton, "pointerdown", (event) => {
      event.preventDefault();
      this.dash();
    });
    this.listen(this.elements.soundToggle, "click", () => {
      this.soundEnabled = !this.soundEnabled;
      this.elements.soundToggle.classList.toggle("sound-off", !this.soundEnabled);
      this.elements.soundToggle.setAttribute("aria-pressed", String(this.soundEnabled));
      this.playSound("tap");
    });

    for (const button of document.querySelectorAll(".touch-key")) {
      const key = button.dataset.key;
      this.listen(button, "pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.keys.add(key);
        button.classList.add("pressed");
      });
      const release = () => {
        this.keys.delete(key);
        button.classList.remove("pressed");
      };
      this.listen(button, "pointerup", release);
      this.listen(button, "pointercancel", release);
      this.listen(button, "lostpointercapture", release);
      this.listen(button, "contextmenu", (event) => event.preventDefault());
    }
  }

  listen(target, event, callback) {
    target.addEventListener(event, callback);
    this.callbacks.push(() => target.removeEventListener(event, callback));
  }

  clearKeys() {
    this.keys.clear();
    for (const button of document.querySelectorAll(".touch-key")) button.classList.remove("pressed");
  }

  resize() {
    const { width, height } = this.root.getBoundingClientRect();
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    this.renderer.setSize(safeWidth, safeHeight, false);
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (!this.state.start()) return;
    this.elapsed = 0;
    this.lastTime = 0;
    this.clearKeys();
    this.elements.timer.classList.remove("timer-warning");
    setHidden(this.elements.startScreen, true);
    setHidden(this.elements.endScreen, true);
    this.elements.hint.classList.remove("hint-hidden");
    this.hintTimer = 7;
    this.ensureAudio();
    this.playSound("start");
  }

  restart() {
    this.state.reset();
    this.player.reset();
    for (const shard of this.world.shards) {
      shard.collected = false;
      shard.group.visible = true;
    }
    this.elapsed = 0;
    this.lastTime = 0;
    this.hasAllShards = false;
    this.updateHud();
    setHidden(this.elements.endScreen, true);
    setHidden(this.elements.startScreen, false);
    this.elements.hint.classList.remove("hint-hidden");
    this.clearKeys();
  }

  dash() {
    if (this.state.phase !== "playing") return;
    if (this.player.startDash()) this.playSound("dash");
  }

  readMovement() {
    let x = 0;
    let z = 0;
    for (const [key, [dx, dz]] of KEY_DIRECTIONS) {
      if (this.keys.has(key)) {
        x += dx;
        z += dz;
      }
    }
    this.player.setMoveInput(x, z);
  }

  tick(timestamp) {
    this.requestFrame = window.requestAnimationFrame(this.tick);
    const delta = this.lastTime === 0 ? 0 : Math.min((timestamp - this.lastTime) / 1000, 0.04);
    this.lastTime = timestamp;

    if (this.state.phase === "playing") {
      this.elapsed += delta;
      this.state.update(delta);
      this.readMovement();
      this.player.update(delta, this.elapsed);
      this.updateWorld(delta);
      this.checkCollisions();
      this.updateCamera(delta);
      this.hintTimer = Math.max(0, this.hintTimer - delta);
      if (this.hintTimer === 0) this.elements.hint.classList.add("hint-hidden");
      this.updateHud();
      this.finishIfNeeded();
    } else {
      this.elapsed += delta;
      this.player.update(delta, this.elapsed);
      this.updateWorld(delta);
      this.updateCamera(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateWorld(delta) {
    animateWorld(this.world, this.elapsed, this.hasAllShards, delta);
  }

  checkCollisions() {
    for (const shard of this.world.shards) {
      if (shard.collected) continue;
      const dx = this.player.position.x - shard.group.position.x;
      const dz = this.player.position.z - shard.group.position.z;
      if (dx * dx + dz * dz < 1.48) this.collectShard(shard);
    }

    for (const sentry of this.world.sentries) {
      const dx = this.player.position.x - sentry.group.position.x;
      const dz = this.player.position.z - sentry.group.position.z;
      if (dx * dx + dz * dz > 1.25 * 1.25) continue;
      if (!this.player.damage()) continue;
      this.state.takeHit();
      this.player.velocity.x -= dx * 3;
      this.player.velocity.z -= dz * 3;
      this.playSound("hurt");
      this.root.classList.remove("hit-flash");
      requestAnimationFrame(() => this.root.classList.add("hit-flash"));
      this.updateHud();
      break;
    }

    if (this.hasAllShards && Math.hypot(this.player.position.x, this.player.position.z) < 3.4) {
      this.state.enterHome();
    }
  }

  collectShard(shard) {
    if (!this.state.collectShard()) return;
    shard.collected = true;
    shard.group.visible = false;
    this.hasAllShards = this.state.shards >= SHARD_TOTAL;
    this.playSound("collect");
    this.root.classList.remove("collect-pop");
    requestAnimationFrame(() => this.root.classList.add("collect-pop"));
    this.updateHud();
  }

  updateHud() {
    this.elements.timer.textContent = formatTime(this.state.timeLeft);
    this.elements.timer.classList.toggle("timer-warning", this.state.timeLeft <= 20);
    this.elements.shardCount.textContent = String(this.state.shards).padStart(2, "0");
    this.elements.shardMeterFill.style.width = `${(this.state.shards / SHARD_TOTAL) * 100}%`;
    this.elements.lives.textContent = `${"♥ ".repeat(Math.max(0, this.state.lives))}${"♡ ".repeat(
      Math.max(0, 3 - this.state.lives),
    )}`.trim();
    this.elements.lives.setAttribute("aria-label", `${this.state.lives} of 3 lives remaining`);
    this.root.classList.toggle("all-shards-found", this.hasAllShards);
  }

  updateCamera(delta) {
    const radius = this.cameraDistance();
    this.cameraGoal.set(
      this.player.position.x + this.player.facing.x * 2.6,
      radius * 0.78,
      this.player.position.z + this.player.facing.z * 2.6 + radius * 0.58,
    );
    const smoothing = 1 - Math.exp(-4.3 * delta);
    this.camera.position.lerp(this.cameraGoal, smoothing);
    this.cameraTarget.set(this.player.position.x, 0.5, this.player.position.z);
    this.camera.lookAt(this.cameraTarget);
  }

  cameraDistance() {
    return window.innerWidth < 600 ? 43 : 36;
  }

  finishIfNeeded() {
    if (this.state.phase !== "won" && this.state.phase !== "lost") return;
    this.clearKeys();
    const won = this.state.phase === "won";
    this.elements.endEyebrow.innerHTML = won
      ? '<span class="eyebrow-line"></span> HOME, AT LAST'
      : '<span class="eyebrow-line"></span> THE NIGHT CAN WAIT';
    this.elements.endTitle.innerHTML = won
      ? 'You found<br /><span>your way home.</span>'
      : 'Even little lights<br /><span>need a rest.</span>';
    this.elements.endCopy.textContent = won
      ? "Ten little lights, all back where they belong. What a lovely walk."
      : `You brought ${this.state.shards} of ${SHARD_TOTAL} little lights home. There’s always another night.`;
    this.elements.finalScore.textContent = won
      ? `${this.state.shards} / ${SHARD_TOTAL} · ${this.state.score.toLocaleString()} points`
      : `${this.state.shards} / ${SHARD_TOTAL}`;
    setHidden(this.elements.endScreen, false);
    this.playSound(won ? "win" : "lose");
  }

  ensureAudio() {
    if (this.context) {
      if (this.context.state === "suspended") void this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) this.context = new AudioContext();
  }

  playSound(type) {
    if (!this.soundEnabled || !this.context) return;
    const notes = {
      tap: [440, 0.06, "sine"],
      start: [392, 0.19, "sine"],
      dash: [245, 0.1, "triangle"],
      collect: [660 + this.state.shards * 26, 0.16, "sine"],
      hurt: [145, 0.18, "sawtooth"],
      win: [523, 0.5, "sine"],
      lose: [180, 0.42, "triangle"],
    };
    const [frequency, duration, waveform] = notes[type];
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (type === "win") oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  dispose() {
    cancelAnimationFrame(this.requestFrame);
    this.callbacks.forEach((removeListener) => removeListener());
    this.renderer.dispose();
    this.context?.close();
  }
}
