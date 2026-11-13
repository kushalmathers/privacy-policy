import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const meta = JSON.parse(readFileSync("audio/meta.json", "utf8"));
const lines = JSON.parse(readFileSync("lines.json", "utf8"));
const r2 = (x) => Math.round(x * 100) / 100;
const chapters = {
  intro: ["THE DOOLITTLE RAID", "AMERICA STRIKES BACK"], taskforce: ["01 · THE TASK FORCE", "80 AIRMEN · 16 B-25 BOMBERS"],
  spotted: ["02 · SPOTTED", "≈650 MILES FROM JAPAN"], launch: ["03 · THE LAUNCH", "USS HORNET · 18 APRIL 1942"],
  strike: ["04 · OVER JAPAN", "TOKYO · YOKOHAMA · NAGOYA · KOBE"], escape: ["05 · NO WAY HOME", "15 AIRCRAFT DOWN IN OR NEAR CHINA"],
  legacy: ["06 · THE LEGACY", "80 VOLUNTEERS CHANGED THE MOMENTUM"]
};
let t = 0; const scenes = [];
for (const [id] of lines) {
  const duration = r2(meta[id].duration + (id === "legacy" ? 3.5 : 2.2));
  scenes.push({ id, start: t, duration, audioStart: r2(t + (id === "launch" ? .55 : .75)), audioDuration: meta[id].duration, text: meta[id].text });
  t = r2(t + duration);
}
const total = t;
const launch = scenes.find(s => s.id === "launch");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", "assets/launch.mp4", "-vf", `setpts=${(launch.duration / 10).toFixed(5)}*PTS,fps=30`, "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "assets/launch-slow.mp4"]);

// Original, synthesized score and effects: no third-party music or footage.
function wav(path, seconds, sample) {
  const rate=32000,n=Math.floor(rate*seconds),data=Buffer.alloc(n*4);
  for(let i=0;i<n;i++){const time=i/rate,[l,r]=sample(time,i);data.writeInt16LE(Math.max(-1,Math.min(1,l))*32767,i*4);data.writeInt16LE(Math.max(-1,Math.min(1,r))*32767,i*4+2);}
  const h=Buffer.alloc(44);h.write("RIFF");h.writeUInt32LE(36+data.length,4);h.write("WAVEfmt ",8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*4,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write("data",36);h.writeUInt32LE(data.length,40);writeFileSync(path,Buffer.concat([h,data]));
}
wav("audio/score.wav",total,(time)=>{const fade=Math.min(1,time/3,(total-time)/4);const pulse=Math.pow(Math.max(0,Math.sin(time*Math.PI)),12);const drone=.12*Math.sin(time*Math.PI*2*55)+.06*Math.sin(time*Math.PI*2*82.41)+.035*Math.sin(time*Math.PI*2*110);const swell=.03*Math.sin(time*Math.PI*2*220)*Math.sin(time*.21);return[(drone+pulse*.05+swell)*fade,(drone+pulse*.045-swell)*fade];});
wav("audio/engine.wav",launch.duration,(time)=>{const fade=Math.min(1,time/1.2,(launch.duration-time)/1.5);const e=(.2*Math.sin(time*Math.PI*2*62)+.1*Math.sin(time*Math.PI*2*124)+.05*Math.sin(time*Math.PI*2*186))*(.8+.2*Math.sin(time*19));return[e*fade,e*.93*fade];});
const strike=scenes.find(s=>s.id==="strike");
wav("audio/impacts.wav",strike.duration,(time)=>{let out=0;for(const at of [2.5,3.8,5.1,6.4,7.7,9]){const a=time-at;if(a>0&&a<3)out+=Math.sin(a*Math.PI*2*48)*Math.exp(-a*2)*.45;}return[out,out*.92];});

const audio = scenes.map(s=>`    <audio id="vo-${s.id}" src="audio/${s.id}.wav" data-start="${s.audioStart}" data-duration="${s.audioDuration}" data-track-index="1" data-volume="1"></audio>`).join("\n");
const captionNodes=scenes.map(s=>`      <p class="caption clip" id="caption-${s.id}" data-start="${s.start}" data-duration="${s.duration}" data-track-index="3">${s.text}</p>`).join("\n");
const chapterNodes=scenes.map(s=>`      <div class="chapter clip" id="chapter-${s.id}" data-start="${s.start}" data-duration="${s.duration}" data-track-index="3"><span>${chapters[s.id][0]}</span><b>${chapters[s.id][1]}</b></div>`).join("\n");
const tweens=scenes.flatMap(s=>[
  `  tl.fromTo("#chapter-${s.id}",{opacity:0,x:-20},{opacity:1,x:0,duration:.65,ease:"power3.out"},${r2(s.start+.3)});`,
  `  tl.to("#chapter-${s.id}",{opacity:0,duration:.45},${r2(s.start+s.duration-.55)});`,
  `  tl.fromTo("#caption-${s.id}",{opacity:0,y:12},{opacity:1,y:0,duration:.45},${s.audioStart});`,
  `  tl.to("#caption-${s.id}",{opacity:0,duration:.4},${r2(s.start+s.duration-.65)});`
]).join("\n");

const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920, height=1080"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:#080d10}#root{position:relative;width:1920px;height:1080px}#gl,#launch{position:absolute;inset:0;width:1920px;height:1080px;display:block}#launch{object-fit:cover;z-index:1}#vignette{position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at center,transparent 52%,rgba(0,0,0,.52) 100%);pointer-events:none}.chapter{position:absolute;left:86px;top:82px;z-index:3;color:#fff;text-shadow:0 2px 16px #000;opacity:0}.chapter span{display:block;font:600 24px Inter,sans-serif;letter-spacing:.24em;color:#e0b574;margin-bottom:13px}.chapter b{display:block;font:700 54px "Barlow Condensed",sans-serif;letter-spacing:.055em}.caption{position:absolute;left:300px;right:300px;bottom:86px;z-index:3;text-align:center;color:#fff;font:400 31px/1.38 Inter,sans-serif;text-shadow:0 2px 9px #000,0 0 18px #000;opacity:0}#brand{position:absolute;right:76px;top:82px;z-index:3;text-align:right;color:#d6dde0;font:500 19px Inter,sans-serif;letter-spacing:.25em;text-shadow:0 2px 12px #000}#end{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,10,13,.34);opacity:0}#end h1{font:700 92px "Barlow Condensed",sans-serif;letter-spacing:.09em;color:#fff;text-shadow:0 3px 24px #000}#end p{margin-top:22px;font:500 23px Inter,sans-serif;letter-spacing:.2em;color:#efd1a4}#sources{position:absolute;bottom:34px;left:0;right:0;z-index:3;text-align:center;color:#c5ced2;font:400 15px Inter,sans-serif;letter-spacing:.08em;opacity:0}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
<canvas id="gl" width="1920" height="1080" class="clip" data-start="0" data-duration="${total}" data-track-index="0"></canvas>
<video id="launch" class="clip" src="assets/launch-slow.mp4" muted playsinline data-start="${launch.start}" data-duration="${launch.duration}" data-track-index="0"></video>
<div id="vignette"></div><div id="brand">PACIFIC WAR · 1942</div>${chapterNodes}<div id="captions">${captionNodes}</div>
<div id="end" class="clip" data-start="0" data-duration="${total}" data-track-index="4"><h1>THE DOOLITTLE RAID</h1><p>COURAGE · SACRIFICE · A TURNING POINT</p></div>
<div id="sources" class="clip" data-start="0" data-duration="${total}" data-track-index="4">ORIGINAL 3D RECREATION · NARRATION: QWEN3-TTS · HISTORICAL SUMMARY</div>
${audio}
<audio id="score" src="audio/score.wav" data-start="0" data-duration="${total}" data-track-index="5" data-volume=".32"></audio>
<audio id="engine" src="audio/engine.wav" data-start="${launch.start}" data-duration="${launch.duration}" data-track-index="5" data-volume=".3"></audio>
<audio id="impacts" src="audio/impacts.wav" data-start="${strike.start}" data-duration="${strike.duration}" data-track-index="5" data-volume=".32"></audio>
</div><script>window.__SCENES=${JSON.stringify(scenes.map(({id,start,duration,audioStart})=>({id,start,duration,audioStart})))};</script><script type="module" src="scene.js"></script>
<script>const tl=gsap.timeline({paused:true});${tweens}
tl.fromTo("#end",{opacity:0},{opacity:1,duration:1.2},${r2(total-5)});tl.fromTo("#sources",{opacity:0},{opacity:1,duration:1},${r2(total-3.5)});tl.set({},{},${total});window.__timelines["main"]=tl;tl.seek(0);</script></body></html>`;
writeFileSync("index.html",html);
writeFileSync("upload-copy.txt",`TITLE\nThe Doolittle Raid: America's First Strike Back | WWII Animated Documentary\n\nDESCRIPTION\nApril 18, 1942: sixteen B-25 Mitchell bombers launched from USS Hornet on a mission never attempted before. This original 3D documentary recap follows the Doolittle Raid from the task force's detection and dramatic carrier launch to the strikes over Japan, the crews' escape, and the raid's lasting impact.\n\nCHAPTERS\n${scenes.map(s=>`${String(Math.floor(s.start/60)).padStart(2,"0")}:${String(Math.floor(s.start%60)).padStart(2,"0")} ${chapters[s.id][0].replace(/^\d+ · /,"")}`).join("\n")}\n\nThis is an original animated historical summary, not archival footage. Visuals were created with Three.js and HyperFrames; narration was synthesized with Qwen3-TTS.\n\nHistorical references: National WWII Museum; US Naval History and Heritage Command; Air Force historical accounts of the Doolittle Raid.\n\n#DoolittleRaid #WWII #History #Documentary #B25 #USNavy\n`);
console.log(`Built ${scenes.length} chapters, ${total.toFixed(2)} seconds`);
