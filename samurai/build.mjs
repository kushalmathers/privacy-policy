// Generates index.html with scene timings derived from the Qwen3-TTS narration lengths.
import { readFileSync, writeFileSync } from "node:fs";

const meta = JSON.parse(readFileSync("audio/meta.json", "utf8"));
const order = ["intro", "dawn", "duel", "end"];
const LEAD = 0.8, TAIL = 1.4;
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
  `  tl.fromTo("#cap-${s.id}", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${s.audioStart});
  tl.to("#cap-${s.id}", { opacity: 0, duration: 0.5, ease: "power2.in" }, ${r2(s.start + s.duration - 0.6)});`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Cormorant+Garamond:ital,wght@1,500&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #120407; }
  #root { position: relative; width: 1920px; height: 1080px; }
  #gl { position: absolute; inset: 0; width: 1920px; height: 1080px; display: block; }
  #vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%); pointer-events: none; }
  #title { position: absolute; left: 0; right: 0; top: 150px; text-align: center; font-family: Cinzel, serif; font-size: 128px; letter-spacing: 0.32em; color: #f3d9a4; text-shadow: 0 0 40px rgba(255,80,40,0.5); opacity: 0; }
  #kanji { position: absolute; right: 120px; top: 120px; font-family: serif; font-size: 160px; color: rgba(243,217,164,0.85); writing-mode: vertical-rl; letter-spacing: 0.2em; opacity: 0; }
  #caps { position: absolute; left: 0; right: 0; bottom: 110px; }
  .cap { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 54px; color: #f6e9d2; text-shadow: 0 2px 24px rgba(0,0,0,0.9); opacity: 0; padding: 0 240px; }
  #credit { position: absolute; left: 0; right: 0; bottom: 50px; text-align: center; font-family: Cinzel, serif; font-size: 26px; letter-spacing: 0.4em; color: #c9a46a; opacity: 0; }
</style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
    <canvas id="gl" width="1920" height="1080" class="clip" data-start="0" data-duration="${total}" data-track-index="0"></canvas>
    <div id="vignette"></div>
    <h1 id="title" class="clip" data-start="0" data-duration="${total}" data-track-index="3">BUSHIDO</h1>
    <div id="kanji" class="clip" data-start="0" data-duration="${total}" data-track-index="3">武士道</div>
    <div id="caps">
${caps}
    </div>
    <div id="credit" class="clip" data-start="0" data-duration="${total}" data-track-index="3">THREE.JS · HYPERFRAMES · VOICE BY QWEN3-TTS 1.7B</div>
${audio}
  </div>
  <script>window.__SCENES = ${JSON.stringify(scenes.map(({ id, start, duration, audioStart }) => ({ id, start, duration, audioStart })))};</script>
  <script type="module" src="scene.js"></script>
  <script>
  const tl = gsap.timeline({ paused: true });
  tl.fromTo("#title", { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 1.6, ease: "power3.out" }, 0.3);
  tl.to("#title", { opacity: 0, duration: 0.8, ease: "power2.in" }, ${r2(scenes[0].start + scenes[0].duration - 1.0)});
  tl.fromTo("#kanji", { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }, ${scenes[1].start});
  tl.to("#kanji", { opacity: 0, duration: 0.6 }, ${r2(scenes[2].start - 0.6)});
${capTweens}
  tl.fromTo("#credit", { opacity: 0 }, { opacity: 1, duration: 1.0 }, ${r2(total - 3.0)});
  tl.set({}, {}, ${total});
  window.__timelines["main"] = tl;
  tl.seek(0);
  </script>
</body>
</html>
`;
writeFileSync("index.html", html);
console.log("scenes", scenes.map((s) => `${s.id}@${s.start}+${s.duration}`).join(" "), "total", total);
