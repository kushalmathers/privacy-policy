import * as THREE from "./lib/three.module.js";

const SCENES = window.__SCENES;
const W = 1920, H = 1080;
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17242d);
scene.fog = new THREE.FogExp2(0x65747b, 0.0045);
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1800);

const hemi = new THREE.HemisphereLight(0xbdd1df, 0x172026, 1.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd6a1, 3.0); sun.position.set(-50, 70, -80); scene.add(sun);
const rim = new THREE.DirectionalLight(0x86b9d8, 1.1); rim.position.set(50, 25, 40); scene.add(rim);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const v = (x, y, z) => new THREE.Vector3(x, y, z);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }

const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uWarm: { value: 0 }, uTop: { value: new THREE.Color(0x1a2c38) } },
  vertexShader: `varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec3 p; uniform float uWarm; uniform vec3 uTop;
    void main(){float h=normalize(p).y; vec3 low=mix(vec3(.48,.56,.59),vec3(.75,.35,.17),uWarm);
      vec3 c=mix(low,uTop,smoothstep(-.05,.75,h));
      float glow=pow(max(0.,dot(normalize(p),normalize(vec3(-.45,.28,-.7)))),24.);
      gl_FragColor=vec4(c+vec3(.42,.28,.14)*glow,1.);}`
})); scene.add(sky);

const oceanMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSun: { value: sun.position.clone().normalize() }, uWarm: { value: 0 } },
  vertexShader: `uniform float uTime; varying vec3 wp; varying float wave;
    void main(){vec3 p=position;float w=sin(p.x*.16+uTime*1.7)*.65+sin(p.y*.23-uTime*1.25)*.48+sin((p.x+p.y)*.08+uTime)*.5;
      p.z+=w;wave=w;vec4 world=modelMatrix*vec4(p,1.);wp=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader: `uniform float uTime;uniform vec3 uSun;uniform float uWarm;varying vec3 wp;varying float wave;
    void main(){vec3 V=normalize(cameraPosition-wp);float rip=sin(wp.x*2.4+wp.z*1.3+uTime*2.)*sin(wp.z*2.8-uTime*1.6);
      vec3 N=normalize(vec3(rip*.15,1.,cos(wp.x*1.7+wp.z*2.+uTime)*.16));float fres=pow(clamp(1.-dot(V,N),0.,1.),3.);
      float spec=pow(max(0.,dot(reflect(-uSun,N),V)),90.);float foam=smoothstep(.85,1.5,wave+rip*.18);
      vec3 c=mix(vec3(.018,.065,.09),vec3(.10,.21,.25),fres)+spec*mix(vec3(.7,.85,1.),vec3(1.,.65,.3),uWarm)*.75+foam*vec3(.24,.29,.30);
      gl_FragColor=vec4(c,1.);}`
}));
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 150, 150), oceanMat);
ocean.rotation.x = -Math.PI / 2; ocean.position.y = -6.2; scene.add(ocean);

const metal = new THREE.MeshStandardMaterial({ color: 0x798172, roughness: 0.48, metalness: 0.58 });
const navy = new THREE.MeshStandardMaterial({ color: 0x35444a, roughness: 0.78, metalness: 0.3 });
const dark = new THREE.MeshStandardMaterial({ color: 0x11191c, roughness: 0.75, metalness: 0.45 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x6d929e, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.65 });
const aluminum = new THREE.MeshStandardMaterial({ color: 0xabb4b0, roughness: 0.36, metalness: 0.8 });
const deckMat = new THREE.MeshStandardMaterial({ color: 0x414b4c, roughness: 0.92, metalness: 0.15 });
const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8cf9d });

function buildPlane(scale = 1) {
  const g = new THREE.Group(); g.scale.setScalar(scale);
  const pts = [[.05,-4.8],[.55,-4.5],[.86,-3.8],[1,-2.5],[1,-.5],[.9,2.3],[.58,4.1],[.04,5.5]].map(([r,z]) => new THREE.Vector2(r,z));
  const body = mesh(new THREE.LatheGeometry(pts, 20), metal, g); body.rotation.x = Math.PI / 2;
  const nose = mesh(new THREE.SphereGeometry(.76, 16, 10), glass, g, 0, .1, -4.05); nose.scale.z = 1.25;
  mesh(new THREE.BoxGeometry(1.35,.72,1.5), glass, g, 0,.82,-2.5);
  const shape = new THREE.Shape(); shape.moveTo(-9.2,.4);shape.lineTo(-8.8,-.5);shape.lineTo(-1,-1.5);shape.lineTo(1,-1.5);shape.lineTo(8.8,-.5);shape.lineTo(9.2,.4);shape.lineTo(1,1);shape.lineTo(-1,1);shape.closePath();
  const wing = mesh(new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false}),metal,g,0,.35,0); wing.rotation.x=Math.PI/2;
  mesh(new THREE.BoxGeometry(6.4,.16,1.4),metal,g,0,.55,4.2);
  for (const x of [-1.8,1.8]) mesh(new THREE.BoxGeometry(.14,1.8,1.45),metal,g,x,1.35,4.15);
  const props=[];
  for (const x of [-2.9,2.9]) {
    const nac=mesh(new THREE.CylinderGeometry(.72,.57,3.1,16),metal,g,x,.05,-.45);nac.rotation.x=Math.PI/2;
    mesh(new THREE.TorusGeometry(.62,.15,8,20),aluminum,g,x,.05,-2.02);
    const prop=new THREE.Group();prop.position.set(x,.05,-2.24);g.add(prop);props.push(prop);
    mesh(new THREE.SphereGeometry(.19,8,6),aluminum,prop);
    for(let j=0;j<3;j++){const b=mesh(new THREE.BoxGeometry(.13,1.85,.045),dark,prop);b.rotation.z=j*Math.PI*2/3;b.position.set(-Math.sin(b.rotation.z)*.85,Math.cos(b.rotation.z)*.85,0);}
    mesh(new THREE.CircleGeometry(1.75,36),new THREE.MeshBasicMaterial({color:0xc9d3d0,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false}),prop,0,0,.03);
  }
  mesh(new THREE.SphereGeometry(.55,12,8,0,Math.PI*2,0,Math.PI/2),glass,g,0,.82,.65);
  g.userData.props=props; return g;
}

function buildCarrier(withPlanes = false) {
  const g=new THREE.Group();
  mesh(new THREE.BoxGeometry(25,1.4,118),deckMat,g,0,-.8,0);
  mesh(new THREE.BoxGeometry(23,6.5,108),navy,g,0,-4.5,3);
  for(const x of [-7.8,7.8])mesh(new THREE.BoxGeometry(.16,.025,105),lineMat,g,x,-.085,0);
  for(let z=-48;z<54;z+=5)mesh(new THREE.BoxGeometry(.24,.03,2.8),lineMat,g,0,-.07,z);
  mesh(new THREE.BoxGeometry(6,5,17),navy,g,15.2,2.5,15);
  mesh(new THREE.BoxGeometry(5,3.2,11),aluminum,g,15.2,6.3,14);
  for(let z=9;z<19;z+=2)mesh(new THREE.BoxGeometry(5.08,.85,1.2),glass,g,15.2,6.6,z);
  mesh(new THREE.CylinderGeometry(.16,.24,13,8),dark,g,15.2,14,16);
  mesh(new THREE.BoxGeometry(7,.18,.18),dark,g,15.2,16,16);
  if(withPlanes){for(let i=0;i<12;i++){const p=buildPlane(.55);p.position.set(i%2?4.2:-4.2,1.05,38-Math.floor(i/2)*12);g.add(p);}}
  return g;
}

const intro = new THREE.Group(); scene.add(intro);
const introCarrier=buildCarrier(false);intro.add(introCarrier);
const introPlane=buildPlane(1);introPlane.position.set(0,1.55,-10);intro.add(introPlane);
for(let i=0;i<3;i++){const p=buildPlane(.8);p.position.set(i%2?5:-5,1.3,18+i*14);intro.add(p);}

const fleet = new THREE.Group(); scene.add(fleet);
const fleetCarrier=buildCarrier(true);fleet.add(fleetCarrier);
for(let i=0;i<4;i++){const escort=buildCarrier(false);escort.scale.set(.24,.38,.36);escort.position.set(i%2?65:-65,0,-70+i*52);fleet.add(escort);}

function buildShip(){const g=new THREE.Group();mesh(new THREE.BoxGeometry(7,2.4,30),navy,g,0,-2,0);mesh(new THREE.BoxGeometry(5,2,8),deckMat,g,0,0,2);mesh(new THREE.BoxGeometry(3,2,5),aluminum,g,0,1.8,3);mesh(new THREE.CylinderGeometry(.1,.16,10,8),dark,g,0,7,2);mesh(new THREE.BoxGeometry(5,.12,.12),dark,g,0,10,2);return g;}
const picket=new THREE.Group();scene.add(picket);const picketShip=buildShip();picketShip.scale.setScalar(.7);picket.add(picketShip);
const radioRings=[];for(let i=0;i<4;i++){const r=mesh(new THREE.TorusGeometry(1,0.045,6,64),new THREE.MeshBasicMaterial({color:0xf0b467,transparent:true,opacity:.5,depthWrite:false}),picket,0,9,0);r.rotation.x=Math.PI/2;radioRings.push(r);}

// Tokyo: abstracted city blocks, streets and military-industrial targets.
const strike=new THREE.Group();scene.add(strike);
const cityGround=mesh(new THREE.PlaneGeometry(320,320),new THREE.MeshStandardMaterial({color:0x303736,roughness:1}),strike,0,-.2,0);cityGround.rotation.x=-Math.PI/2;
const cityMats=[0x505653,0x62635c,0x454c4b,0x6c655a].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.9}));
for(let x=-140;x<=140;x+=14)for(let z=-140;z<=140;z+=14){if(Math.abs(x%42)<5||Math.abs(z%42)<5)continue;const h=2+hash(x*7+z*13)*8;mesh(new THREE.BoxGeometry(8,h,8),cityMats[Math.floor(hash(x+z)*4)],strike,x,h/2,z);}
const streetMat=new THREE.MeshBasicMaterial({color:0x918268,transparent:true,opacity:.28});
for(let i=-126;i<=126;i+=42){const a=mesh(new THREE.PlaneGeometry(1.2,280),streetMat,strike,i,.01,0);a.rotation.x=-Math.PI/2;const b=mesh(new THREE.PlaneGeometry(280,1.2),streetMat,strike,0,.01,i);b.rotation.x=-Math.PI/2;}
const strikePlanes=[];for(let i=0;i<3;i++){const p=buildPlane(.72);p.position.set((i-1)*18,13+i*2,20+i*18);strike.add(p);strikePlanes.push(p);}
const impacts=[];for(let i=0;i<6;i++){const g=new THREE.Group();g.position.set(-55+i*22,0,-30-i*9);strike.add(g);const fire=mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xff9b38,transparent:true,opacity:0}),g,0,1,0);const light=new THREE.PointLight(0xff6b22,0,45);light.position.y=4;g.add(light);const smoke=[];for(let j=0;j<9;j++){const s=mesh(new THREE.SphereGeometry(1,10,7),new THREE.MeshLambertMaterial({color:0x252a29,transparent:true,opacity:.7,depthWrite:false}),g);smoke.push(s);}impacts.push({g,fire,light,smoke,start:2.5+i*1.3});}

// Mountain valley and descending crew for the escape chapter.
const escape=new THREE.Group();scene.add(escape);
const terrainGeo=new THREE.PlaneGeometry(300,300,70,70);const pos=terrainGeo.attributes.position;
for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);const h=Math.abs(Math.sin(x*.045)+Math.cos(y*.05))*12+Math.sin((x+y)*.1)*3;pos.setZ(i,h);}terrainGeo.computeVertexNormals();
const terrain=mesh(terrainGeo,new THREE.MeshStandardMaterial({color:0x364d3b,roughness:1,flatShading:true}),escape,0,-10,0);terrain.rotation.x=-Math.PI/2;
for(let i=0;i<18;i++){const x=(hash(i)-.5)*260,z=(hash(i+50)-.5)*260;const h=25+hash(i+90)*35;mesh(new THREE.ConeGeometry(12+hash(i+120)*14,h,7),new THREE.MeshStandardMaterial({color:0x46574a,roughness:1,flatShading:true}),escape,x,h/2-7,z);if(h>42)mesh(new THREE.ConeGeometry(5+hash(i+140)*6,h*.22,7),new THREE.MeshStandardMaterial({color:0xc5cec6,roughness:1}),escape,x,h-7-h*.11,z);}
const escapePlane=buildPlane(.8);escape.add(escapePlane);
const parachutes=[];for(let i=0;i<8;i++){const g=new THREE.Group();escape.add(g);const canopy=mesh(new THREE.SphereGeometry(1.6,16,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xe4dfce,side:THREE.DoubleSide,roughness:1}),g,0,2,0);for(const x of [-.8,.8]){const line=mesh(new THREE.CylinderGeometry(.012,.012,2.4,4),dark,g,x*.5,.7,0);line.rotation.z=x*.35;}mesh(new THREE.CylinderGeometry(.12,.17,.7,6),dark,g,0,-.8,0);parachutes.push(g);}

const legacy=new THREE.Group();scene.add(legacy);
const sunDisc=mesh(new THREE.CircleGeometry(36,64),new THREE.MeshBasicMaterial({color:0xffb55f,fog:false}),legacy,-130,35,-420);sunDisc.lookAt(0,10,0);
const legacyPlanes=[];for(let i=0;i<16;i++){const p=buildPlane(.32);const row=Math.floor(i/4),col=i%4;p.position.set((col-1.5)*24+(row%2)*10,10+row*5,-row*35);legacy.add(p);legacyPlanes.push(p);}

const allGroups=[intro,fleet,picket,strike,escape,legacy];
function localScene(t){for(let i=SCENES.length-1;i>=0;i--)if(t>=SCENES[i].start)return{...SCENES[i],i,u:t-SCENES[i].start};return{...SCENES[0],i:0,u:0};}
function animatePlanes(group,t){group.traverse(o=>{if(o.userData.props)o.userData.props.forEach((p,j)=>p.rotation.z=t*(70+j));});}
function look(pos,target){camera.position.copy(pos);camera.lookAt(target);}

function renderAt(t){
  const s=localScene(t),u=s.u,d=s.duration,p=clamp01(u/d);
  allGroups.forEach(g=>g.visible=false);ocean.visible=!["strike","escape"].includes(s.id);
  oceanMat.uniforms.uTime.value=t;oceanMat.uniforms.uWarm.value=s.id==="legacy"?1:0;
  sky.material.uniforms.uWarm.value=s.id==="legacy"?1:s.id==="intro"?.3:0;
  scene.fog.color.set(s.id==="strike"?0x68716c:s.id==="escape"?0x8b9b90:s.id==="legacy"?0xb07953:0x65747b);
  scene.fog.density=s.id==="escape"?.009:s.id==="strike"?.006:.0045;
  sun.color.set(s.id==="legacy"?0xffa24c:0xffd6a1);
  if(s.id==="intro"){
    intro.visible=true;animatePlanes(intro,t);const k=smooth(p);
    introPlane.rotation.y=-.18;introCarrier.position.y=Math.sin(t*.7)*.2;
    look(v(lerp(11,7,k),lerp(5.5,3.8,k),lerp(-29,-23,k)),v(0,1.5,-8));
  }else if(s.id==="taskforce"){
    fleet.visible=true;animatePlanes(fleet,t);fleet.position.y=Math.sin(t*.65)*.25;
    const a=lerp(-.35,.25,smooth(p));look(v(Math.sin(a)*135,lerp(80,60,p),Math.cos(a)*135),v(0,0,0));
  }else if(s.id==="spotted"){
    picket.visible=true;picket.position.y=Math.sin(t*.9)*.35;picket.rotation.z=Math.sin(t*.75)*.035;
    radioRings.forEach((r,i)=>{const k=((u*.35+i*.25)%1);r.scale.setScalar(1+k*18);r.material.opacity=(1-k)*.55;});
    look(v(lerp(15,11,p),lerp(4,6,p),lerp(-28,-22,p)),v(0,2,1));
  }else if(s.id==="strike"){
    strike.visible=true;animatePlanes(strike,t);
    strikePlanes.forEach((pl,i)=>{pl.position.z=45-u*16+i*16;pl.position.x=(i-1)*18+Math.sin(u*.4+i)*2;pl.rotation.x=.03;});
    impacts.forEach(im=>{const age=u-im.start;if(age<0){im.fire.material.opacity=0;im.light.intensity=0;im.smoke.forEach(x=>x.visible=false);return;}const burst=clamp01(age/.7);im.fire.material.opacity=Math.max(0,1-age/2.2);im.fire.scale.setScalar(1+burst*6);im.fire.position.y=1+burst*4;im.light.intensity=Math.max(0,35-age*12);im.smoke.forEach((m,j)=>{m.visible=true;const a=Math.max(0,age-j*.08);m.position.set((hash(j+im.start*10)-.5)*a*2,2+a*(1.4+j*.13),(hash(j+70)-.5)*a);m.scale.setScalar(.8+a*.65);m.material.opacity=clamp01(a)*.65;});});
    look(v(lerp(-18,8,p),lerp(28,22,p),lerp(75,45,p)),v(0,8,lerp(0,-35,p)));
  }else if(s.id==="escape"){
    escape.visible=true;animatePlanes(escape,t);escapePlane.position.set(-25+u*3.5,22+Math.sin(u*.4)*2,-25-u*9);escapePlane.rotation.z=-.08;
    parachutes.forEach((g,i)=>{const a=Math.max(0,u-2-i*.35);g.visible=a>0;g.position.set(-18+i*6+Math.sin(a*.5+i)*2,35-a*1.1,-30-i*5);g.rotation.y=a*.15;});
    look(v(lerp(35,20,p),lerp(38,28,p),lerp(40,5,p)),v(0,lerp(16,12,p),lerp(-35,-65,p)));
  }else if(s.id==="legacy"){
    legacy.visible=true;animatePlanes(legacy,t);legacyPlanes.forEach((pl,i)=>{pl.position.z=-Math.floor(i/4)*35+u*2.5;pl.position.y=10+Math.floor(i/4)*5+Math.sin(u*.5+i)*.4;});
    look(v(lerp(-20,5,p),lerp(18,25,p),lerp(95,120,p)),v(0,15,-55));
  }else{
    // The rendered launch clip covers this frame; keep a deterministic ocean behind it.
    intro.visible=true;look(v(20,12,40),v(0,0,0));
  }
  renderer.render(scene,camera);
}
window.addEventListener("hf-seek",e=>renderAt(e.detail.time));
window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};
window.__hf.buildReady["three"]=renderer.compileAsync(scene,camera).then(()=>renderAt(0));
