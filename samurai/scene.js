import * as THREE from "./lib/three.module.js";

// SCENES is injected by build.mjs: [{id,start,duration,audioStart}]
const SCENES = window.__SCENES;
const W = 1920, H = 1080;

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120407);
scene.fog = new THREE.FogExp2(0x2a0a0e, 0.035);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 200);

// warm key from the sun, cool rim, dim ambient
const key = new THREE.DirectionalLight(0xff6a3d, 2.4); key.position.set(-6, 4, -10); scene.add(key);
const rim = new THREE.DirectionalLight(0x4a6cff, 1.2); rim.position.set(6, 6, 8); scene.add(rim);
scene.add(new THREE.AmbientLight(0x3a1a22, 1.2));

// sky dome + sun
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(120, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uRise: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vP; uniform float uRise;
      void main(){ float h = normalize(vP).y;
        vec3 top = vec3(0.05,0.01,0.04); vec3 hor = mix(vec3(0.45,0.08,0.10), vec3(0.95,0.35,0.15), uRise);
        vec3 c = mix(hor, top, smoothstep(-0.05, 0.6, h)); gl_FragColor = vec4(c,1.0);}`
  }));
scene.add(sky);
const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshBasicMaterial({ color: 0xff2a1a, fog: false }));
sun.position.set(-18, 6, -95); sun.lookAt(0, 0, 0); scene.add(sun);
const sunGlow = new THREE.Mesh(new THREE.CircleGeometry(24, 64), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.25, fog: false }));
sunGlow.position.copy(sun.position).add(new THREE.Vector3(0, 0, -1)); sunGlow.lookAt(0, 0, 0); scene.add(sunGlow);

// ground + distant hills
const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x1a0c0e, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const hillMat = new THREE.MeshBasicMaterial({ color: 0x1b060a });
for (let i = 0; i < 7; i++) {
  const h = new THREE.Mesh(new THREE.SphereGeometry(18 + hash(i) * 14, 24, 12), hillMat);
  h.position.set(-60 + i * 20 + hash(i + 9) * 8, -14 + hash(i + 3) * 6, -70 - hash(i + 5) * 15);
  h.scale.set(1, 0.5, 1); scene.add(h);
}

// procedural samurai: dark armor with a coloured lacing accent
function buildSamurai(accent) {
  const g = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0x14080a, roughness: 0.55, metalness: 0.5 });
  const acc = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.6, emissive: accent, emissiveIntensity: 0.15 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe6f0, roughness: 0.25, metalness: 1.0 });
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  add(new THREE.CylinderGeometry(0.42, 0.62, 1.3, 12), armor, 0, 0.65, 0); // hakama
  add(new THREE.CylinderGeometry(0.18, 0.2, 0.5, 8), armor, -0.25, 0.25, 0);
  add(new THREE.CylinderGeometry(0.18, 0.2, 0.5, 8), armor, 0.25, 0.25, 0);
  add(new THREE.BoxGeometry(0.9, 1.1, 0.55), armor, 0, 1.8, 0); // do
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.92, 0.05, 0.57), acc, 0, 1.4 + i * 0.25, 0);
  add(new THREE.BoxGeometry(0.4, 0.5, 0.6), armor, -0.65, 2.1, 0).rotation.z = 0.35; // sode
  add(new THREE.BoxGeometry(0.4, 0.5, 0.6), armor, 0.65, 2.1, 0).rotation.z = -0.35;
  const armL = new THREE.Group(); armL.position.set(-0.55, 2.2, 0); g.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.55, 2.2, 0); g.add(armR);
  add(new THREE.CylinderGeometry(0.11, 0.1, 0.9, 8), armor, 0, -0.45, 0, armL);
  add(new THREE.CylinderGeometry(0.11, 0.1, 0.9, 8), armor, 0, -0.45, 0, armR);
  add(new THREE.SphereGeometry(0.27, 16, 12), armor, 0, 2.75, 0); // head
  add(new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), armor, 0, 2.75, 0); // kabuto
  add(new THREE.CylinderGeometry(0.5, 0.34, 0.12, 16), armor, 0, 2.75, 0);
  const crest = add(new THREE.TorusGeometry(0.28, 0.035, 8, 24, Math.PI), acc, 0, 3.0, 0.02);
  crest.scale.set(1.4, 1.6, 1);
  const sword = new THREE.Group(); sword.position.set(0, -0.9, 0); armR.add(sword); // pivot at the hand
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), acc, 0, 0, 0, sword);
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), acc, 0, 0.17, 0, sword);
  add(new THREE.BoxGeometry(0.035, 1.25, 0.1), steel, 0, 0.82, 0, sword);
  const saya = add(new THREE.CylinderGeometry(0.06, 0.05, 1.4, 8), armor, -0.35, 1.1, 0.1);
  saya.rotation.z = 0.25; saya.rotation.x = 0.3;
  return { g, armL, armR, sword };
}
const hero = buildSamurai(0xd4a24c); scene.add(hero.g);
const foe = buildSamurai(0xb0142a); scene.add(foe.g);

// falling petals: seeded instances, position is a pure function of t
const PETALS = 500;
const petals = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(0.09, 0.14),
  new THREE.MeshBasicMaterial({ color: 0xff8fa3, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
  PETALS);
scene.add(petals);
const dummy = new THREE.Object3D();
function updatePetals(t) {
  for (let i = 0; i < PETALS; i++) {
    const r1 = hash(i), r2 = hash(i + 1000), r3 = hash(i + 2000), r4 = hash(i + 3000);
    const speed = 0.6 + r3 * 0.9, span = 14;
    const y = span - (((t * speed) + r2 * span) % span);
    dummy.position.set(-14 + r1 * 28 + Math.sin(t * 0.8 + r4 * 6.28) * 0.8, y - 1, -6 + r4 * 12);
    dummy.rotation.set(t * 2 + r1 * 6, t * 1.5 + r2 * 6, r3 * 6);
    dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
  }
  petals.instanceMatrix.needsUpdate = true;
}

const flash = new THREE.PointLight(0xffffff, 0, 12); flash.position.set(2.25, 2.3, 0.3); scene.add(flash);

function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;
const v = (x, y, z) => new THREE.Vector3(x, y, z);
function lookFrom(from, to) { camera.position.copy(from); camera.lookAt(to); }
function sceneLocal(t) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start) return { i, u: t - SCENES[i].start, d: SCENES[i].duration };
  return { i: 0, u: 0, d: SCENES[0].duration };
}

// everything below is derived from t alone; frames render out of order
function renderAt(t) {
  const { i, u, d } = sceneLocal(t);
  const p = clamp01(u / d);
  updatePetals(t);
  sky.material.uniforms.uRise.value = clamp01((t - SCENES[1].start) / (SCENES[1].duration * 0.8));
  sun.position.y = lerp(2, 9, sky.material.uniforms.uRise.value); sunGlow.position.y = sun.position.y;

  hero.g.position.set(0, 0, 0); hero.g.rotation.set(0, 0, 0);
  hero.armR.rotation.set(0.15, 0, 0.1); hero.armL.rotation.set(0.1, 0, -0.08); hero.sword.rotation.set(0, 0, 0);
  foe.g.visible = i >= 2; foe.g.position.set(4.5, 0, 0); foe.g.rotation.set(0, Math.PI, 0);
  foe.armR.rotation.set(0.15, 0, 0.1); foe.armL.rotation.set(0.1, 0, -0.08); foe.sword.rotation.set(0, 0, 0);
  flash.intensity = 0;

  if (i === 0) {
    // wide reveal, slow dolly in
    hero.armR.rotation.set(0.25, 0, 0.12);
    const k = ease(p);
    lookFrom(v(lerp(-14, -6, k), lerp(5, 2.4, k), lerp(22, 11, k)), v(0, 1.8, 0));
  } else if (i === 1) {
    // the draw: blade rises over the shoulder, then settles into guard
    const draw = ease((u - 1.2) / 1.6), settle = ease((u - 3.2) / 1.0);
    hero.armR.rotation.set(lerp(0.15, -2.4, draw) + lerp(0, 0.9, settle), 0, lerp(0.1, -0.4, draw));
    hero.armL.rotation.set(lerp(0.1, -1.4, settle), 0, lerp(-0.08, 0.5, settle));
    hero.sword.rotation.set(lerp(0, 0.4, draw), 0, lerp(0, -0.3, settle));
    hero.g.rotation.y = -0.4;
    const k = easeOut(p);
    lookFrom(v(lerp(3.5, 2.6, k), lerp(1.2, 2.2, k), lerp(5.5, 4.2, k)), v(0.2, 2.1, 0));
  } else if (i === 2) {
    // the duel: close distance, repeated strikes, flash on each hit
    const approach = ease((u - 0.4) / 1.4), cycle = 1.1;
    hero.g.position.x = lerp(0, 1.3, approach); foe.g.position.x = lerp(4.5, 3.2, approach);
    const swingPhase = u >= 1.8 ? ((u - 1.8) % cycle) / cycle : 0;
    const swing = Math.sin(swingPhase * Math.PI);
    hero.armR.rotation.set(lerp(-1.5, -0.3, swing), 0, -0.3);
    hero.armL.rotation.set(-1.4, 0, 0.5);
    hero.sword.rotation.set(0.3, 0, -0.5 + swing * 0.3);
    foe.armR.rotation.set(lerp(-1.5, -0.3, swing), 0, 0.3);
    foe.armL.rotation.set(-1.4, 0, -0.5);
    foe.sword.rotation.set(0.3, 0, 0.5 - swing * 0.3);
    const hit = u >= 1.8 ? Math.max(0, 1 - Math.abs(swingPhase - 0.5) * 12) : 0;
    flash.intensity = hit * 40;
    const a = lerp(-0.9, 0.9, p);
    lookFrom(v(2.25 + Math.sin(a) * 7.5, 2.0 + p * 0.6, Math.cos(a) * 7.5), v(2.25, 1.9, 0));
  } else {
    // aftermath: foe kneels, hero lowers the blade, camera pulls back toward the sun
    const fall = ease((u - 0.3) / 1.4), lower = ease((u - 1.5) / 1.5);
    hero.g.position.x = 1.3; foe.g.position.x = 3.2;
    foe.g.rotation.x = lerp(0, 1.2, fall); foe.g.position.y = lerp(0, -0.4, fall);
    hero.armR.rotation.set(lerp(-1.5, 0.3, lower), 0, lerp(-0.3, 0.1, lower));
    hero.armL.rotation.set(lerp(-1.4, 0.1, lower), 0, lerp(0.5, -0.08, lower));
    hero.sword.rotation.set(lerp(0.3, 0, lower), 0, lerp(-0.5, 0, lower));
    hero.g.rotation.y = lerp(0, -0.8, lower);
    const k = ease(p);
    lookFrom(v(lerp(-2, -4, k), lerp(1.6, 3.5, k), lerp(6, 20, k)), v(1.3, lerp(1.8, 2.5, k), 0));
  }
  renderer.render(scene, camera);
}

window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady["three"] = renderer.compileAsync(scene, camera).then(() => renderAt(0));
