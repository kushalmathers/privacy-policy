import * as THREE from "./lib/three.module.js";

// SCENES injected by build.mjs: [{id,start,duration,audioStart}]
const SCENES = window.__SCENES;
const W = 1920, H = 1080;

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(32, W / H, 0.01, 5000);

// --- textures (NASA Blue Marble set from the three.js examples)
const loader = new THREE.TextureLoader();
const tex = (f, srgb = true) => new Promise((res, rej) => loader.load(`assets/${f}`, (t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
const [earthMap, earthNormal, earthSpec, cloudMap, moonMap, lightsMap] = await Promise.all([
  tex("earth_atmos_2048.jpg"), tex("earth_normal_2048.jpg", false), tex("earth_specular_2048.jpg", false),
  tex("earth_clouds_1024.png"), tex("moon_1024.jpg"), tex("earth_lights_2048.png"),
]);

// --- sun: one strong directional key, faint fill so the night side is not pure black
const sun = new THREE.DirectionalLight(0xfff4e0, 3.2); sun.position.set(30, 10, 40); scene.add(sun);
scene.add(new THREE.AmbientLight(0x223355, 0.12));
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
sunDisc.position.copy(sun.position).normalize().multiplyScalar(1800); scene.add(sunDisc);

// --- stars: seeded point cloud
const STARS = 6000;
const sp = new Float32Array(STARS * 3), sc = new Float32Array(STARS * 3);
for (let i = 0; i < STARS; i++) {
  const th = hash(i) * Math.PI * 2, ph = Math.acos(2 * hash(i + 7000) - 1), r = 1500;
  sp.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3);
  const b = 0.35 + hash(i + 9000) * 0.65, warm = hash(i + 11000);
  sc.set([b, b * (0.85 + warm * 0.15), b * (0.8 + (1 - warm) * 0.2)], i * 3);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
starGeo.setAttribute("color", new THREE.BufferAttribute(sc, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, sizeAttenuation: false })));

// --- Earth: tilted axis group so spin and tilt are separate controls
const R = 6.371;
const earthTilt = new THREE.Group(); scene.add(earthTilt);
const earthSpin = new THREE.Group(); earthTilt.add(earthSpin);
const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), new THREE.MeshPhongMaterial({
  map: earthMap, normalMap: earthNormal, normalScale: new THREE.Vector2(0.85, 0.85),
  specularMap: earthSpec, specular: new THREE.Color(0x334455), shininess: 18,
  emissiveMap: lightsMap, emissive: new THREE.Color(0xffd9a0), emissiveIntensity: 1.0,
}));
earthSpin.add(earth);
const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.006, 96, 48), new THREE.MeshLambertMaterial({ map: cloudMap, transparent: true, opacity: 0.9, depthWrite: false }));
earthSpin.add(clouds);
// atmosphere: additive fresnel shell
const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 96, 48), new THREE.ShaderMaterial({
  transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
  uniforms: { uSun: { value: sun.position.clone().normalize() }, uStrength: { value: 1.0 } },
  vertexShader: `varying vec3 vN; varying vec3 vWP; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 wp = modelMatrix*vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `varying vec3 vN; varying vec3 vWP; uniform vec3 uSun; uniform float uStrength;
    void main(){ vec3 V = normalize(cameraPosition - vWP); float rim = pow(clamp(1.0 - dot(V, -vN), 0.0, 1.0), 3.2);
      float day = clamp(dot(vN, uSun) * 1.4 + 0.35, 0.0, 1.0);
      vec3 col = mix(vec3(0.05,0.12,0.35), vec3(0.35,0.62,1.0), day);
      gl_FragColor = vec4(col * rim * uStrength * 1.6, rim * uStrength); }`
}));
earthTilt.add(atmo);
earthTilt.rotation.z = THREE.MathUtils.degToRad(-23.4);

// --- Moon
const MOON_D = 36; // compressed for the frame; the real ratio would push it off screen
const moonPivot = new THREE.Group(); scene.add(moonPivot);
const moon = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2727, 96, 48), new THREE.MeshStandardMaterial({ map: moonMap, roughness: 0.95, metalness: 0 }));
moon.position.set(MOON_D, 0, 0); moonPivot.add(moon);
moonPivot.rotation.x = THREE.MathUtils.degToRad(5);
// vanish ring: expanding dim shockwave of light at the moon's position
const ring = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
moonPivot.add(ring);

// --- tide bulge: subtle ocean stretch along the moon axis, scaled down as the moon goes
// implemented as a non-uniform scale of the earth group along x (moon direction)

// --- helpers
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const v = (x, y, z) => new THREE.Vector3(x, y, z);
function lookFrom(from, to) { camera.position.copy(from); camera.lookAt(to); }
function sceneLocal(t) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start) return { i, u: t - SCENES[i].start, d: SCENES[i].duration };
  return { i: 0, u: 0, d: SCENES[0].duration };
}
const tGone = () => SCENES[1].start + 2.4; // moment the moon vanishes

function renderAt(t) {
  const { i, u, d } = sceneLocal(t);
  const p = clamp01(u / d);

  // continuous state: spin, moon orbit, vanish
  earthSpin.rotation.y = t * 0.045;
  clouds.rotation.y = t * 0.012;
  moonPivot.rotation.y = 0.35 + t * 0.004;
  const gone = clamp01((t - tGone()) / 0.9);
  moon.scale.setScalar(lerp(1, 0.001, easeInOut(gone)));
  moon.material.opacity = 1; moon.visible = gone < 1;
  ring.position.copy(moon.position); ring.lookAt(camera.position);
  const ringK = clamp01((t - tGone()) / 2.2);
  ring.scale.setScalar(lerp(0.5, 40, ringK)); ring.material.opacity = ringK > 0 ? (1 - ringK) * 0.6 : 0;

  // tides: bulge along the moon axis fades after the moon is gone
  const bulge = lerp(0.035, 0.008, clamp01((t - tGone()) / 6));
  const mdir = new THREE.Vector3(Math.cos(moonPivot.rotation.y), 0, -Math.sin(moonPivot.rotation.y));
  earthSpin.scale.set(1 + bulge * Math.abs(mdir.x), 1, 1 + bulge * Math.abs(mdir.z));

  // axial tilt: steady 23.4 degrees until the wobble scene, then wandering
  let tilt = -23.4;
  if (i >= 3) {
    const w = clamp01((t - SCENES[3].start - 0.8) / (SCENES[3].duration - 1.5));
    tilt = -23.4 + Math.sin(w * Math.PI * 1.5) * 42 * smooth(w) - w * 10;
  }
  earthTilt.rotation.z = THREE.MathUtils.degToRad(tilt);
  atmo.material.uniforms.uStrength.value = 1.0;

  // camera per scene
  if (i === 0) {
    // wide establishing: earth left, moon right, slow push in
    const k = smooth(p);
    lookFrom(v(lerp(2, 0, k), lerp(9, 7, k), lerp(62, 54, k)), v(12, 2, 0));
  } else if (i === 1) {
    // hold on the moon, it vanishes, camera drifts back to earth
    const k = easeInOut((u - 3.0) / (d - 3.0));
    const mp = moon.getWorldPosition(new THREE.Vector3());
    const from = v(mp.x + 8, 3, mp.z + 14), to = v(mp.x * 0.4, 0, mp.z * 0.4);
    lookFrom(from.lerp(v(-2, 6, 40), k), to.lerp(v(0, 0, 0), k));
  } else if (i === 2) {
    // low orbit over the ocean limb, terminator in view
    const k = smooth(p);
    const ang = lerp(0.4, 0.95, k);
    lookFrom(v(Math.cos(ang) * 9.6, 1.8 + k * 1.2, Math.sin(ang) * 9.6), v(0, 0.6, 0));
  } else if (i === 3) {
    // pull back and watch the axis swing
    const k = smooth(p);
    lookFrom(v(lerp(6, -10, k), lerp(4, 7, k), lerp(26, 34, k)), v(0, 0, 0));
  } else {
    // night side: city lights only, slow drift, final pull-out
    const k = easeInOut(p);
    const sdir = sun.position.clone().normalize();
    const from = sdir.clone().multiplyScalar(-1).multiplyScalar(lerp(16, 48, k)).add(v(lerp(4, -6, k), lerp(3, 8, k), 0));
    lookFrom(from, v(0, 0, 0));
  }
  renderer.render(scene, camera);
}

window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady["three"] = renderer.compileAsync(scene, camera).then(() => renderAt(0));
