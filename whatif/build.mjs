// Generates index.html with scene timings derived from the Qwen3-TTS narration lengths.
import { readFileSync, writeFileSync } from "node:fs";

const meta = JSON.parse(readFileSync("audio/meta.json", "utf8"));
const order = JSON.parse(readFileSync("lines.json", "utf8")).map(([id]) => id);
const LEAD = 0.9, TAIL = 1.6;
const r2 = (x) => Math.round(x * 100) / 100;

let t = 0; const scenes = [];
for (const id of order) {
  const duration = r2(LEAD + meta[id].duration + TAIL);
  scenes.push({ id, start: t, duration, audioStart: r2(t + LEAD), audioDuration: meta[id].duration, text: meta[id].text });
  t = r2(t + duration);
}
const total = t;

const audio = scenes.map((s) =>
  `    <audio id="vo-${s.id}" src="audio/${s.id}.wav" data-start="${s.audioStart}" data-duration="${s.audioDuration}" data-track-index="1" data-volume="1"></audio>`).join("\n");
const caps = scenes.map((s) =>
  `      <p class="cap clip" id="cap-${s.id}" data-start="${s.start}" data-duration="${s.duration}" data-track-index="2">${s.text}</p>`).join("\n");
const capTweens = scenes.map((s) =>
  `  tl.fromTo("#cap-${s.id}", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, ${s.audioStart});
  tl.to("#cap-${s.id}", { opacity: 0, duration: 0.6, ease: "power2.in" }, ${r2(s.start + s.duration - 0.7)});`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;600&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
  #root { position: relative; width: 1920px; height: 1080px; }
  #gl { position: absolute; inset: 0; width: 1920px; height: 1080px; display: block; }
  #grain { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%); pointer-events: none; }
  #eyebrow { position: absolute; right: 160px; top: 150px; text-align: right; font-family: Inter, sans-serif; font-weight: 300; font-size: 34px; letter-spacing: 0.5em; color: #9fb7d8; opacity: 0; }
  #title { position: absolute; right: 160px; top: 200px; text-align: right; font-family: Inter, sans-serif; font-weight: 600; font-size: 118px; line-height: 1.05; letter-spacing: -0.02em; color: #ffffff; max-width: 1100px; opacity: 0; }
  #stat { position: absolute; right: 160px; top: 170px; text-align: right; font-family: Inter, sans-serif; color: #fff; opacity: 0; }
  #stat b { display: block; font-weight: 600; font-size: 150px; line-height: 1; }
  #stat span { display: block; font-weight: 300; font-size: 30px; letter-spacing: 0.2em; color: #9fb7d8; margin-top: 12px; }
  #caps { position: absolute; left: 0; right: 0; bottom: 120px; }
  .cap { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-family: Inter, sans-serif; font-weight: 300; font-size: 44px; line-height: 1.35; color: #eef3ff; text-shadow: 0 2px 20px rgba(0,0,0,0.9); opacity: 0; padding: 0 260px; }
  #credit { position: absolute; left: 0; right: 0; bottom: 50px; text-align: center; font-family: Inter, sans-serif; font-weight: 300; font-size: 22px; letter-spacing: 0.4em; color: #7f93b3; opacity: 0; }
</style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
    <canvas id="gl" width="1920" height="1080" class="clip" data-start="0" data-duration="${total}" data-track-index="0"></canvas>
    <div id="grain"></div>
    <div id="eyebrow" class="clip" data-start="0" data-duration="${total}" data-track-index="3">WHAT IF</div>
    <h1 id="title" class="clip" data-start="0" data-duration="${total}" data-track-index="3">The Moon disappeared?</h1>
    <div id="stat" class="clip" data-start="0" data-duration="${total}" data-track-index="3"><b>−66%</b><span>TIDAL RANGE</span></div>
    <div id="caps">
${caps}
    </div>
    <div id="credit" class="clip" data-start="0" data-duration="${total}" data-track-index="3">THREE.JS · HYPERFRAMES · VOICE BY QWEN3-TTS 1.7B · NASA BLUE MARBLE TEXTURES</div>
${audio}
  </div>
  <script>window.__SCENES = ${JSON.stringify(scenes.map(({ id, start, duration, audioStart }) => ({ id, start, duration, audioStart })))};</script>
  <script type="module" src="scene.js"></script>
  <script>
  const tl = gsap.timeline({ paused: true });
  tl.fromTo("#eyebrow", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 1.0, ease: "power3.out" }, 0.4);
  tl.fromTo("#title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }, 0.9);
  tl.to("#eyebrow, #title", { opacity: 0, duration: 0.7, ease: "power2.in" }, ${r2(scenes[0].start + scenes[0].duration - 0.9)});
  tl.fromTo("#stat", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, ${r2(scenes[2].start + 2.2)});
  tl.to("#stat", { opacity: 0, duration: 0.6 }, ${r2(scenes[2].start + scenes[2].duration - 0.8)});
${capTweens}
  tl.fromTo("#credit", { opacity: 0 }, { opacity: 1, duration: 1.0 }, ${r2(total - 3.2)});
  tl.set({}, {}, ${total});
  window.__timelines["main"] = tl;
  tl.seek(0);
  </script>
</body>
</html>
`;
writeFileSync("index.html", html);
console.log("scenes", scenes.map((s) => `${s.id}@${s.start}+${s.duration}`).join(" "), "total", total);
