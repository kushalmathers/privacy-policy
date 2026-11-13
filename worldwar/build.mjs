import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const meta = JSON.parse(readFileSync("audio/meta.json", "utf8"));
const sourceDuration = meta.line.duration;
const voiceDuration = 8.8;
// Keep the full sentence inside the ten-second cut even if synthesis runs long.
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", "audio/line.wav", "-af", `atempo=${(sourceDuration / voiceDuration).toFixed(5)},apad=pad_dur=10`, "-t", "10", "audio/voice.wav"]);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
  #root { position: relative; width: 1920px; height: 1080px; }
  #gl { position: absolute; inset: 0; width: 1920px; height: 1080px; display: block; }
  #vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.55) 100%); pointer-events: none; }
  .bar { position: absolute; left: 0; right: 0; height: 70px; background: #050707; z-index: 3; }
  #top { top: 0; } #bottom { bottom: 0; }
  #date { position: absolute; left: 90px; top: 112px; color: #e6dfcb; font: 600 24px Inter, sans-serif; letter-spacing: .28em; text-shadow: 0 2px 12px #000; opacity: 0; }
  #title { position: absolute; left: 86px; top: 148px; color: #fff; font: 700 64px "Barlow Condensed", sans-serif; letter-spacing: .08em; text-shadow: 0 3px 20px #000; opacity: 0; }
  #mission { position: absolute; right: 90px; bottom: 105px; color: #e8e2d1; text-align: right; font: 500 24px "Barlow Condensed", sans-serif; letter-spacing: .24em; text-shadow: 0 2px 10px #000; opacity: 0; }
  #caption { position: absolute; left: 300px; right: 300px; bottom: 105px; text-align: center; color: white; font: 400 30px Inter, sans-serif; line-height: 1.35; text-shadow: 0 2px 8px #000, 0 0 18px #000; opacity: 0; }
</style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="10" data-width="1920" data-height="1080">
    <canvas id="gl" width="1920" height="1080" class="clip" data-start="0" data-duration="10" data-track-index="0"></canvas>
    <div id="vignette"></div><div id="top" class="bar"></div><div id="bottom" class="bar"></div>
    <div id="date" class="clip" data-start="0" data-duration="10" data-track-index="2">18 APRIL 1942 · USS HORNET</div>
    <div id="title" class="clip" data-start="0" data-duration="10" data-track-index="2">THE DOOLITTLE RAID</div>
    <div id="mission" class="clip" data-start="0" data-duration="10" data-track-index="2">16 BOMBERS · ONE IMPOSSIBLE MISSION</div>
    <div id="caption" class="clip" data-start="0" data-duration="10" data-track-index="2">${meta.line.text}</div>
    <audio id="voice" src="audio/voice.wav" data-start="0.55" data-duration="8.8" data-track-index="1" data-volume="1"></audio>
  </div>
  <script type="module" src="scene.js"></script>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#date", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: .7 }, .25);
    tl.fromTo("#title", { opacity: 0, x: -25 }, { opacity: 1, x: 0, duration: .8 }, .45);
    tl.to("#date, #title", { opacity: 0, duration: .55 }, 3.1);
    tl.fromTo("#caption", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45 }, .6);
    tl.to("#caption", { opacity: 0, duration: .4 }, 8.85);
    tl.fromTo("#mission", { opacity: 0 }, { opacity: 1, duration: .8 }, 7.4);
    tl.set({}, {}, 10);
    window.__timelines["main"] = tl; tl.seek(0);
  </script>
</body>
</html>`;
writeFileSync("index.html", html);
console.log(`Narration ${sourceDuration}s compressed to ${voiceDuration}s; timeline 10s`);
