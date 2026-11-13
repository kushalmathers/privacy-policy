import * as THREE from "./lib/three.module.js";

const W = 1920, H = 1080, DURATION = 10;
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x89969a);
scene.fog = new THREE.FogExp2(0x9ba6a7, 0.0045);
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1800);

const hemi = new THREE.HemisphereLight(0xc8d7df, 0x26363d, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 3.2);
sun.position.set(-45, 65, -70);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
sun.shadow.camera.far = 250;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x8fc4e8, 1.4);
rim.position.set(50, 20, 30); scene.add(rim);

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeIn = (x) => Math.pow(clamp01(x), 2.2);
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const v = (x, y, z) => new THREE.Vector3(x, y, z);

// Layered morning sky, deliberately desaturated like historical action films.
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec3 p;
    void main(){float h=normalize(p).y; vec3 low=vec3(.58,.63,.63), high=vec3(.15,.23,.29);
      vec3 c=mix(low,high,smoothstep(-.05,.75,h));
      float glow=pow(max(0.,dot(normalize(p),normalize(vec3(-.45,.35,-.7)))),18.);
      gl_FragColor=vec4(c+vec3(.42,.30,.16)*glow,1.);}`
}));
scene.add(sky);

// Ocean geometry and lighting are evaluated from absolute time for seek-safe rendering.
const oceanMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSun: { value: sun.position.clone().normalize() } },
  vertexShader: `uniform float uTime; varying vec3 wp; varying float wave;
    void main(){vec3 p=position;
      float w=sin(p.x*.16+uTime*1.7)*.65+sin(p.y*.23-uTime*1.25)*.48+sin((p.x+p.y)*.08+uTime)*.5;
      p.z+=w; wave=w; vec4 world=modelMatrix*vec4(p,1.);wp=world.xyz;
      gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader: `uniform float uTime; uniform vec3 uSun; varying vec3 wp; varying float wave;
    void main(){vec3 V=normalize(cameraPosition-wp);
      float rip=sin(wp.x*2.4+wp.z*1.3+uTime*2.)*sin(wp.z*2.8-uTime*1.6);
      vec3 N=normalize(vec3(rip*.15,1.,cos(wp.x*1.7+wp.z*2.+uTime)*.16));
      float fres=pow(clamp(1.-max(0.,dot(V,N)),0.,1.),3.);
      float spec=pow(max(0.,dot(reflect(-uSun,N),V)),90.);
      float foam=smoothstep(.85,1.5,wave+rip*.18);
      vec3 deep=vec3(.018,.085,.11), shallow=vec3(.12,.25,.28);
      vec3 c=mix(deep,shallow,fres)+spec*vec3(1.,.83,.58)*1.5+foam*vec3(.34,.40,.40);
      gl_FragColor=vec4(c,1.);}`
});
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 180, 180), oceanMat);
ocean.rotation.x = -Math.PI / 2; ocean.position.y = -6.2; scene.add(ocean);

const metal = new THREE.MeshStandardMaterial({ color: 0x657064, roughness: 0.52, metalness: 0.62 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x171c1c, roughness: 0.65, metalness: 0.5 });
const black = new THREE.MeshStandardMaterial({ color: 0x090b0b, roughness: 0.82 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x7395a2, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.58 });
const aluminum = new THREE.MeshStandardMaterial({ color: 0xb2b7ae, roughness: 0.34, metalness: 0.85 });
const deckMat = new THREE.MeshStandardMaterial({ color: 0x3b4548, roughness: 0.9, metalness: 0.15 });
const deckLine = new THREE.MeshBasicMaterial({ color: 0xd5d3b6 });
const yellow = new THREE.MeshBasicMaterial({ color: 0xd8b840 });

function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
}

// USS Hornet flight deck and island.
const carrier = new THREE.Group(); scene.add(carrier);
const deck = mesh(new THREE.BoxGeometry(25, 1.4, 118), deckMat, carrier, 0, -0.8, 0);
deck.receiveShadow = true;
mesh(new THREE.BoxGeometry(23, 6.5, 108), darkMetal, carrier, 0, -4.5, 3);
mesh(new THREE.BoxGeometry(0.16, 0.025, 105), deckLine, carrier, -7.8, -0.085, 0);
mesh(new THREE.BoxGeometry(0.16, 0.025, 105), deckLine, carrier, 7.8, -0.085, 0);
for (let z = -48; z < 54; z += 5) mesh(new THREE.BoxGeometry(0.24, 0.03, 2.8), yellow, carrier, 0, -0.07, z);
for (let z = -48; z < 54; z += 8) {
  mesh(new THREE.BoxGeometry(24, 0.025, 0.09), darkMetal, carrier, 0, -0.06, z);
}
const island = new THREE.Group(); island.position.set(15.2, 0, 15); carrier.add(island);
mesh(new THREE.BoxGeometry(6, 5, 17), deckMat, island, 0, 2.5, 0);
mesh(new THREE.BoxGeometry(5, 3.2, 11), aluminum, island, 0, 6.3, -1);
for (let z = -5; z <= 3; z += 2) mesh(new THREE.BoxGeometry(5.08, 0.85, 1.2), glass, island, 0, 6.6, z);
mesh(new THREE.CylinderGeometry(0.16, 0.24, 13, 8), darkMetal, island, 0, 14, 1);
mesh(new THREE.BoxGeometry(7, 0.18, 0.18), darkMetal, island, 0, 16, 1);
mesh(new THREE.BoxGeometry(0.18, 0.18, 6), darkMetal, island, 0, 13, 1);

// Deck crew silhouettes, kept clear of the bomber's path.
const crewMat = new THREE.MeshStandardMaterial({ color: 0x263239, roughness: 1 });
for (let i = 0; i < 26; i++) {
  const person = new THREE.Group();
  const side = i % 2 ? 1 : -1;
  person.position.set(side * (9.2 + hash(i) * 1.8), 0, -40 + i * 3.4);
  mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.15, 7), crewMat, person, 0, 1.05, 0);
  mesh(new THREE.SphereGeometry(0.22, 8, 6), crewMat, person, 0, 1.85, 0);
  person.rotation.y = side * Math.PI / 2;
  carrier.add(person);
}

function insigniaTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#233e62"; x.fillRect(0, 0, 256, 256);
  x.fillStyle = "#f0eee1"; x.beginPath(); x.arc(128, 128, 78, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#233e62"; x.beginPath(); x.arc(128, 128, 66, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#fff"; x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 26 : 64;
    const px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const insignia = new THREE.MeshBasicMaterial({ map: insigniaTexture() });

function buildB25() {
  const g = new THREE.Group();
  // Fuselage: lathed profile, nose at negative Z.
  const pts = [
    [0.05, -4.8], [0.55, -4.5], [0.86, -3.8], [0.98, -2.5], [1.0, -0.5],
    [0.9, 2.3], [0.58, 4.1], [0.18, 5.2], [0.04, 5.5]
  ].map(([r, z]) => new THREE.Vector2(r, z));
  const body = mesh(new THREE.LatheGeometry(pts, 24), metal, g);
  body.rotation.x = Math.PI / 2; body.castShadow = true;
  const nose = mesh(new THREE.SphereGeometry(0.78, 20, 12), glass, g, 0, 0.1, -4.05);
  nose.scale.set(1, 0.92, 1.25);
  // Cockpit glazing and frames.
  const cockpit = mesh(new THREE.BoxGeometry(1.35, 0.72, 1.5), glass, g, 0, 0.82, -2.5);
  cockpit.rotation.x = -0.12;
  for (const x of [-0.68, 0, 0.68]) mesh(new THREE.BoxGeometry(0.045, 0.78, 1.55), darkMetal, g, x, 0.83, -2.5);
  // Main wing and tailplane use thin extruded planforms.
  const wingShape = new THREE.Shape();
  wingShape.moveTo(-9.2, 0.4); wingShape.lineTo(-8.8, -0.5); wingShape.lineTo(-1.0, -1.5);
  wingShape.lineTo(1.0, -1.5); wingShape.lineTo(8.8, -0.5); wingShape.lineTo(9.2, 0.4);
  wingShape.lineTo(1.0, 1.0); wingShape.lineTo(-1.0, 1.0); wingShape.closePath();
  const wing = mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.16, bevelEnabled: false }), metal, g, 0, 0.35, 0);
  wing.rotation.x = Math.PI / 2; wing.castShadow = true;
  const tail = mesh(new THREE.BoxGeometry(6.4, 0.16, 1.4), metal, g, 0, 0.55, 4.2);
  tail.castShadow = true;
  for (const x of [-1.8, 1.8]) {
    const fin = mesh(new THREE.BoxGeometry(0.14, 1.8, 1.45), metal, g, x, 1.35, 4.15);
    fin.rotation.x = -0.18;
  }
  const props = [];
  for (const x of [-2.9, 2.9]) {
    const nacelle = mesh(new THREE.CylinderGeometry(0.72, 0.57, 3.1, 20), metal, g, x, 0.05, -0.45);
    nacelle.rotation.x = Math.PI / 2; nacelle.castShadow = true;
    const cowling = mesh(new THREE.TorusGeometry(0.62, 0.15, 10, 24), aluminum, g, x, 0.05, -2.02);
    for (let j = 0; j < 9; j++) {
      const a = j / 9 * Math.PI * 2;
      const cyl = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.28, 6), darkMetal, g,
        x + Math.cos(a) * 0.4, 0.05 + Math.sin(a) * 0.4, -2.0);
      cyl.rotation.x = Math.PI / 2;
    }
    const prop = new THREE.Group(); prop.position.set(x, 0.05, -2.24); g.add(prop); props.push(prop);
    mesh(new THREE.SphereGeometry(0.19, 10, 8), aluminum, prop);
    for (let j = 0; j < 3; j++) {
      const blade = mesh(new THREE.BoxGeometry(0.13, 1.85, 0.045), black, prop, 0, 0.85, 0);
      blade.rotation.z = j * Math.PI * 2 / 3;
      blade.position.set(-Math.sin(blade.rotation.z) * 0.85, Math.cos(blade.rotation.z) * 0.85, 0);
    }
    const disc = mesh(new THREE.CircleGeometry(1.75, 48), new THREE.MeshBasicMaterial({ color: 0xc9d3d0, transparent: true, opacity: 0.075, side: THREE.DoubleSide, depthWrite: false }), prop, 0, 0, 0.03);
    disc.renderOrder = 2;
    // Main landing gear, retracted after the deck run.
    const gear = new THREE.Group(); gear.name = "gear"; g.add(gear);
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.35, 8), darkMetal, gear, x, -0.85, 0.15);
    const wheel = mesh(new THREE.TorusGeometry(0.34, 0.14, 8, 16), black, gear, x, -1.48, 0.15);
    wheel.rotation.y = Math.PI / 2;
  }
  const noseWheel = mesh(new THREE.TorusGeometry(0.25, 0.11, 8, 16), black, g, 0, -1.45, -3.2);
  noseWheel.name = "noseGear"; noseWheel.rotation.y = Math.PI / 2;
  // Star insignia on both upper wings.
  for (const x of [-6.6, 6.6]) {
    const badge = mesh(new THREE.PlaneGeometry(1.45, 1.45), insignia, g, x, 0.53, 0);
    badge.rotation.x = -Math.PI / 2;
  }
  // Dorsal turret and antenna.
  mesh(new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass, g, 0, 0.82, 0.65);
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 6), darkMetal, g, 0, 1.5, 1.9);
  return { g, props };
}

const bomber = buildB25(); scene.add(bomber.g);
// Two waiting bombers make the deck feel occupied without crowding the hero shot.
for (let i = 0; i < 2; i++) {
  const parked = buildB25().g;
  parked.scale.setScalar(0.92); parked.position.set(i ? 5.3 : -5.3, 1.55, 38 + i * 13);
  scene.add(parked);
}

// Spray particles at the bow, and deck-level mist behind the propellers.
const SPRAY = 700;
const sprayGeo = new THREE.BufferGeometry();
const sprayPos = new Float32Array(SPRAY * 3);
sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPos, 3));
const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: 0xd7e0df, size: 0.22, transparent: true, opacity: 0.68, depthWrite: false }));
scene.add(spray);
function updateSpray(t, planeZ) {
  for (let i = 0; i < SPRAY; i++) {
    const r = hash(i), r2 = hash(i + 1000), r3 = hash(i + 2000), r4 = hash(i + 3000);
    const bow = i < 420;
    const life = (t * (0.65 + r3) + r4 * 4) % 2.2;
    const z = bow ? -55 + r * 7 : planeZ + 4 + r * 18;
    sprayPos[i * 3] = (r2 - 0.5) * (bow ? 30 : 12);
    sprayPos[i * 3 + 1] = bow ? -5 + Math.sin(life / 2.2 * Math.PI) * (3 + r3 * 6) : 0.1 + life * (0.2 + r3);
    sprayPos[i * 3 + 2] = z + life * (bow ? 2.5 : 5.5);
  }
  sprayGeo.attributes.position.needsUpdate = true;
}

// Low cloud banks assembled from soft transparent sprites.
const cloudCanvas = document.createElement("canvas"); cloudCanvas.width = cloudCanvas.height = 128;
const cx = cloudCanvas.getContext("2d");
const grad = cx.createRadialGradient(64, 64, 5, 64, 64, 62);
grad.addColorStop(0, "rgba(230,233,229,.7)"); grad.addColorStop(0.55, "rgba(205,212,211,.35)"); grad.addColorStop(1, "rgba(190,200,201,0)");
cx.fillStyle = grad; cx.fillRect(0, 0, 128, 128);
const cloudTex = new THREE.CanvasTexture(cloudCanvas);
for (let i = 0; i < 45; i++) {
  const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.35 + hash(i) * 0.3, depthWrite: false, fog: true });
  const s = new THREE.Sprite(mat);
  s.position.set((hash(i + 50) - 0.5) * 700, 25 + hash(i + 80) * 70, -150 - hash(i + 120) * 500);
  s.scale.set(70 + hash(i + 200) * 120, 22 + hash(i + 250) * 35, 1); scene.add(s);
}

function planeState(t) {
  // Brakes release at 1.3 s; bow crossing at 6.3 s; shallow dip then climb.
  const run = Math.max(0, t - 1.3);
  let z = 29 - 0.5 * 3.25 * run * run;
  let y = 1.55;
  if (z < -55) {
    const flight = (-55 - z) / 25;
    y = 1.55 - Math.sin(Math.min(1, flight) * Math.PI) * 1.1 + Math.max(0, flight - 0.25) * 3.0;
  }
  const pitch = z > -50 ? -0.015 : lerp(-0.03, 0.13, clamp01((-50 - z) / 35));
  return { z, y, pitch };
}

function renderAt(t) {
  t = Math.min(DURATION, Math.max(0, t));
  const state = planeState(t);
  const deckBob = Math.sin(t * 0.72) * 0.22;
  carrier.position.y = deckBob;
  bomber.g.position.set(0, state.y + (state.z > -55 ? deckBob : 0), state.z);
  bomber.g.rotation.set(state.pitch, 0, Math.sin(t * 0.8) * 0.008);
  bomber.props.forEach((p, i) => { p.rotation.z = t * (72 + i * 2); });
  bomber.g.traverse((o) => {
    if (o.name === "gear" || o.name === "noseGear") o.visible = state.z > -58;
  });
  oceanMat.uniforms.uTime.value = t;
  updateSpray(t, state.z);

  // One continuous shot: front three-quarter track, then a wide climb reveal.
  const launch = smooth((t - 5.7) / 3.4);
  const shake = t < 6 ? Math.sin(t * 37) * 0.025 + Math.sin(t * 23) * 0.018 : 0;
  const close = v(9.2 + Math.sin(t * 0.35) * 1.2, 4.2 + shake, state.z - 14.5);
  const wide = v(24, 10 + launch * 8, state.z + 8);
  camera.position.copy(close.lerp(wide, launch));
  const target = v(0, state.y + 0.2, state.z - lerp(0.8, 3.0, launch));
  camera.lookAt(target);
  camera.fov = lerp(42, 48, launch); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady["three"] = renderer.compileAsync(scene, camera).then(() => renderAt(0));
