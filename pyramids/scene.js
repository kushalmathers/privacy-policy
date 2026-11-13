import * as THREE from "./lib/three.module.js";

const SCENES=window.__SCENES,W=1920,H=1080;
const canvas=document.getElementById("gl");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc99455);scene.fog=new THREE.Fog(0xd5aa73,90,650);
const camera=new THREE.PerspectiveCamera(42,W/H,.1,1800);
const hemi=new THREE.HemisphereLight(0xffe2b2,0x6b4a2d,2.25);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffd39a,3.6);sun.position.set(-110,140,-160);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-150;sun.shadow.camera.right=150;sun.shadow.camera.top=150;sun.shadow.camera.bottom=-150;sun.shadow.camera.far=550;scene.add(sun);
const rim=new THREE.DirectionalLight(0x9bc4d5,.75);rim.position.set(120,60,100);scene.add(rim);
const clamp01=x=>Math.min(1,Math.max(0,x)),lerp=(a,b,k)=>a+(b-a)*k,smooth=x=>{x=clamp01(x);return x*x*(3-2*x);};
function hash(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
function mesh(geo,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
const sand=new THREE.MeshStandardMaterial({color:0xb88b54,roughness:1});
const sandLight=new THREE.MeshStandardMaterial({color:0xd0a46c,roughness:1});
const limestone=new THREE.MeshStandardMaterial({color:0xc9b486,roughness:.92});
const limestoneLight=new THREE.MeshStandardMaterial({color:0xead9ae,roughness:.8});
const limestoneDark=new THREE.MeshStandardMaterial({color:0x9e845c,roughness:1});
const wood=new THREE.MeshStandardMaterial({color:0x5c3822,roughness:1});
const ropeMat=new THREE.MeshStandardMaterial({color:0x8c744b,roughness:1});
const copper=new THREE.MeshStandardMaterial({color:0x8b5836,roughness:.55,metalness:.55});
const skin=new THREE.MeshStandardMaterial({color:0x865333,roughness:1});
const linen=new THREE.MeshStandardMaterial({color:0xded1ae,roughness:1});
const hair=new THREE.MeshStandardMaterial({color:0x201912,roughness:1});
const waterMat=new THREE.MeshStandardMaterial({color:0x356f77,roughness:.3,metalness:.25,transparent:true,opacity:.9});

// Procedural stone detail keeps every surface local and reproducible.
function stoneTexture(){const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d"),im=x.createImageData(256,256);for(let j=0;j<256;j++)for(let i=0;i<256;i++){const n=hash(i*257+j*97),b=178+n*48;const k=(j*256+i)*4;im.data[k]=b;im.data[k+1]=b*.94;im.data[k+2]=b*.8;im.data[k+3]=255;}x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;}
const stoneTex=stoneTexture();limestone.map=stoneTex;limestoneLight.map=stoneTex;

const sky=new THREE.Mesh(new THREE.SphereGeometry(900,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{uDawn:{value:0}},
 vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 p;uniform float uDawn;void main(){float h=normalize(p).y;vec3 low=vec3(.88,.59,.31),top=mix(vec3(.25,.48,.66),vec3(.12,.24,.39),uDawn);vec3 c=mix(low,top,smoothstep(-.05,.75,h));float glow=pow(max(0.,dot(normalize(p),normalize(vec3(-.55,.25,-.7)))),28.);gl_FragColor=vec4(c+vec3(.5,.27,.1)*glow,1.);}`
}));scene.add(sky);
const sunDisc=mesh(new THREE.CircleGeometry(32,64),new THREE.MeshBasicMaterial({color:0xffd598,fog:false}),scene,-330,95,-650);sunDisc.lookAt(0,20,0);

function dunes(parent,extent=900){const geo=new THREE.PlaneGeometry(extent,extent,100,100),p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),d=Math.sin(x*.013+y*.006)*3+Math.cos(y*.018)*2+Math.sin(x*.004-y*.008)*5;p.setZ(i,d);}geo.computeVertexNormals();const ground=mesh(geo,sand,parent,0,-2,0);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;return ground;}

function pyramidGeometry(side,height,courses,partial=1){const positions=[],normals=[],uv=[];const half=side/2,step=height/courses;
 function quad(a,b,c,d){for(const p of [a,b,d,b,c,d]){positions.push(...p);uv.push(0,0,1,0,0,1);}}
 for(let level=0;level<courses;level++){const f=(level+1)/courses;if(f>partial)continue;const y=level*step,bot=half*(1-level/courses),top=half*(1-(level+1)/courses);const s=Math.max(.15,step*.96);
  // Horizontal ledge, then the four slightly inset vertical block faces.
  quad([-bot,y,-bot],[bot,y,-bot],[bot,y,bot],[-bot,y,bot]);
  const yTop=y+s,b=bot,t=top;
  quad([-b,y,-b],[b,y,-b],[t,yTop,-t],[-t,yTop,-t]);quad([b,y,b],[-b,y,b],[-t,yTop,t],[t,yTop,t]);
  quad([-b,y,b],[-b,y,-b],[-t,yTop,-t],[-t,yTop,t]);quad([b,y,-b],[b,y,b],[t,yTop,t],[t,yTop,-t]);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return geo;}
function blockCourses(parent,side,height,courses,visible=1){const g=new THREE.Group();parent.add(g);const step=height/courses;for(let l=0;l<courses;l++){if((l+1)/courses>visible)continue;const size=side*(1-l/courses),n=Math.max(1,Math.round(size/(side/18))),unit=size/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i!==0&&j!==0&&i!==n-1&&j!==n-1)continue;const b=mesh(new THREE.BoxGeometry(unit*.97,step*.93,unit*.97),l%3===0?limestoneLight:limestone,g,-size/2+(i+.5)*unit,(l+.5)*step,-size/2+(j+.5)*unit);b.castShadow=l>courses-5;b.receiveShadow=true;}}return g;}
function capGeometry(side,height){const h=side/2;return new THREE.BufferGeometry().setFromPoints([]);}
function smoothPyramid(parent,side,height){const h=side/2;const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute([-h,0,-h,h,0,-h,0,height,0,h,0,-h,h,0,h,0,height,0,h,0,h,-h,0,h,0,height,0,-h,0,h,-h,0,-h,0,height,0],3));geo.computeVertexNormals();const m=mesh(geo,limestoneLight,parent);m.castShadow=true;return m;}

function worker(parent,x,y,z,scale=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);mesh(new THREE.CylinderGeometry(.16,.21,.72,7),linen,g,0,1.02,0);mesh(new THREE.SphereGeometry(.16,8,6),skin,g,0,1.55,0);mesh(new THREE.SphereGeometry(.165,8,4,0,Math.PI*2,0,Math.PI/2),hair,g,0,1.58,0);const arms=[];for(const side of [-1,1]){const a=new THREE.Group();a.position.set(side*.2,1.27,0);g.add(a);const limb=mesh(new THREE.CylinderGeometry(.055,.065,.55,6),skin,a,0,-.23,0);limb.rotation.z=side*.18;mesh(new THREE.CylinderGeometry(.06,.07,.65,6),skin,g,side*.1,.42,0);arms.push(a);}g.userData.arms=arms;return g;}
function sledge(parent,x,y,z,scale=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);for(const sx of [-.75,.75])mesh(new THREE.BoxGeometry(.16,.16,3.4),wood,g,sx,0,0);for(let zz=-1;zz<=1;zz+=.5)mesh(new THREE.BoxGeometry(1.9,.1,.22),wood,g,0,.14,zz);const b=mesh(new THREE.BoxGeometry(1.7,1.35,1.8),limestoneLight,g,0,.85,0);b.castShadow=true;for(const sx of [-.55,.55]){const rope=mesh(new THREE.CylinderGeometry(.018,.018,8,5),ropeMat,g,sx,.3,-5);rope.rotation.x=Math.PI/2;}return g;}
function team(parent,count,z0,spacing,scale=1){const crew=[];for(let i=0;i<count;i++){const w=worker(parent,(i%2?1:-1)*.65*scale,0,z0-Math.floor(i/2)*spacing,scale);w.rotation.y=Math.PI;crew.push(w);}return crew;}

// Chapter 1: the completed monument, with Khafre in the distance.
const intro=new THREE.Group();scene.add(intro);dunes(intro);const mainPyramid=new THREE.Group();intro.add(mainPyramid);blockCourses(mainPyramid,126,84,44,1);smoothPyramid(mainPyramid,127,84.8);const distant=new THREE.Group();distant.position.set(-180,0,-230);distant.scale.setScalar(.7);intro.add(distant);blockCourses(distant,120,82,36,1);for(let i=0;i<8;i++){const g=new THREE.Group();g.position.set(65+i*16,-2,-40-i*20);intro.add(g);mesh(new THREE.BoxGeometry(12,3,9),limestoneDark,g,0,1.5,0);}

// Chapter 2: quarry terraces, partially freed blocks, wedges and workers.
const quarry=new THREE.Group();scene.add(quarry);dunes(quarry);for(let level=0;level<5;level++){const wall=mesh(new THREE.BoxGeometry(150,8,24),level%2?limestone:limestoneDark,quarry,0,level*7+2,45+level*18);wall.receiveShadow=true;for(let x=-65;x<70;x+=7)mesh(new THREE.BoxGeometry(.12,7.8,.06),wood,quarry,x,level*7+2,32.96+level*18);}
for(let i=0;i<20;i++){const x=(hash(i)-.5)*85,z=-45+hash(i+40)*65,b=mesh(new THREE.BoxGeometry(4+hash(i+60)*3,2.5+hash(i+70)*2,4+hash(i+80)*3),i%3?limestone:limestoneLight,quarry,x,1,z);b.rotation.y=(hash(i+90)-.5)*.2;}
const cutBlock=mesh(new THREE.BoxGeometry(8,4,6),limestoneLight,quarry,-10,2,-2);for(let x=-13;x<-6;x+=1.2)mesh(new THREE.BoxGeometry(.16,1,.22),copper,quarry,x,4.25,0);
const quarryWorkers=[];for(let i=0;i<9;i++){const w=worker(quarry,-22+i*5,0,-8-(i%3)*8,1.35);w.rotation.y=i%2?.5:-.5;quarryWorkers.push(w);if(i%3===0){const tool=mesh(new THREE.CylinderGeometry(.025,.035,1.4,6),copper,w,.4,1,-.15);tool.rotation.z=-.65;}}

// Chapter 3: hauled sledge, rope teams and a Nile cargo boat.
const transport=new THREE.Group();scene.add(transport);dunes(transport);const river=mesh(new THREE.PlaneGeometry(70,500),waterMat,transport,65,-.7,0);river.rotation.x=-Math.PI/2;const sledges=[],haulers=[];for(let k=0;k<2;k++){const s=sledge(transport,-18+k*17,0,4+k*22,1.5);sledges.push(s);haulers.push(team(s,12,-5,1.4,1.1));}
const boat=new THREE.Group();boat.position.set(64,0,-38);transport.add(boat);const hull=mesh(new THREE.CylinderGeometry(2.3,1.2,23,12),wood,boat);hull.rotation.x=Math.PI/2;hull.scale.y=.45;mesh(new THREE.BoxGeometry(3.2,.35,18),wood,boat,0,.65,0);for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(2.5,1.5,2.6),limestoneLight,boat,0,1.5,-5+i*3.5);for(let i=0;i<4;i++)worker(boat,i%2?1.3:-1.3,.8,-7+i*4,.9);

// Chapter 4: stepped core, rising ramp, block trains and survey lines.
const ramps=new THREE.Group();scene.add(ramps);dunes(ramps);const construction=new THREE.Group();ramps.add(construction);blockCourses(construction,110,76,32,.68);const ramp=mesh(new THREE.BoxGeometry(18,3,130),sandLight,ramps,55,13,30);ramp.rotation.x=-.16;const movingBlocks=[],rampCrews=[];for(let k=0;k<4;k++){const s=sledge(ramps,55,0,0,.85);movingBlocks.push(s);rampCrews.push(team(s,6,-3,1.2,.8));}for(let i=0;i<18;i++){const x=-50+(i%6)*12,z=35+Math.floor(i/6)*9;worker(ramps,x,0,z,1.15);}const surveyMat=new THREE.LineBasicMaterial({color:0xf2d8a2,transparent:true,opacity:.8});for(const x of [-45,45]){const geo=new THREE.BufferGeometry().setFromPoints([v(x,1,-45),v(x,1,45)]);ramps.add(new THREE.Line(geo,surveyMat));}

// Chapter 5: completed casing with a construction cutaway and pyramidion.
const casing=new THREE.Group();scene.add(casing);dunes(casing);const core=new THREE.Group();casing.add(core);blockCourses(core,120,82,40,1);const smoothCasing=smoothPyramid(casing,121,82.5);const pyramidion=mesh(new THREE.ConeGeometry(3.4,5,4),new THREE.MeshStandardMaterial({color:0xd6b66c,roughness:.35,metalness:.55,emissive:0x6f4714,emissiveIntensity:.25}),casing,0,85,0);pyramidion.rotation.y=Math.PI/4;

// Chapter 6: organized labor in front of the monument, workshops and supply lines.
const workers=new THREE.Group();scene.add(workers);dunes(workers);const endPyramid=new THREE.Group();endPyramid.position.set(-48,0,-100);endPyramid.scale.setScalar(.75);workers.add(endPyramid);smoothPyramid(endPyramid,120,82);for(let i=0;i<14;i++){const x=-45+(i%7)*15,z=10+Math.floor(i/7)*16;const w=worker(workers,x,0,z,1.35);w.rotation.y=(hash(i)-.5)*1.5;}for(let i=0;i<5;i++){const hut=new THREE.Group();hut.position.set(55+i*13,0,-5-i*12);workers.add(hut);mesh(new THREE.BoxGeometry(9,4,7),limestoneDark,hut,0,2,0);mesh(new THREE.ConeGeometry(6.5,2.8,4),sandLight,hut,0,5.2,0).rotation.y=Math.PI/4;}const finalSledge=sledge(workers,-10,0,25,1.2);team(finalSledge,8,-4,1.2,1);

const groups=[intro,quarry,transport,ramps,casing,workers];
function localScene(t){for(let i=SCENES.length-1;i>=0;i--)if(t>=SCENES[i].start)return{...SCENES[i],i,u:t-SCENES[i].start};return{...SCENES[0],i:0,u:0};}
function look(pos,target){camera.position.copy(pos);camera.lookAt(target);}
function animateCrew(group,t){group.traverse(o=>{if(o.userData.arms)o.userData.arms.forEach((a,j)=>a.rotation.x=Math.sin(t*4+j)*.28-.35);});}
function renderAt(t){const s=localScene(t),u=s.u,p=clamp01(u/s.duration);groups.forEach(g=>g.visible=false);sky.material.uniforms.uDawn.value=s.id==="intro"?.5:0;sunDisc.visible=s.id!=="quarry";
 if(s.id==="intro"){intro.visible=true;const k=smooth(p);look(v(lerp(155,125,k),lerp(70,58,k),lerp(190,165,k)),v(0,32,0));}
 else if(s.id==="quarry"){quarry.visible=true;animateCrew(quarry,t);look(v(lerp(-48,-30,p),lerp(28,23,p),lerp(-72,-58,p)),v(-3,8,4));}
 else if(s.id==="transport"){transport.visible=true;animateCrew(transport,t);sledges.forEach((g,i)=>g.position.z=4+i*22-u*(1.5+i*.25));boat.position.z=-38-u*1.5;look(v(lerp(-65,-45,p),lerp(40,34,p),lerp(75,55,p)),v(5,2,-10));}
 else if(s.id==="ramps"){ramps.visible=true;animateCrew(ramps,t);movingBlocks.forEach((g,i)=>{const q=(u*.055+i*.25)%1;g.position.z=88-q*112;g.position.y=2+(88-g.position.z)*.16;});look(v(lerp(130,112,p),lerp(85,76,p),lerp(160,142,p)),v(0,25,10));}
 else if(s.id==="casing"){casing.visible=true;const reveal=smooth(p);smoothCasing.material.transparent=true;smoothCasing.material.opacity=.18+reveal*.82;pyramidion.rotation.y=Math.PI/4+u*.12;look(v(lerp(140,125,p),lerp(52,66,p),lerp(175,160,p)),v(0,37,0));}
 else{workers.visible=true;animateCrew(workers,t);finalSledge.position.z=25-u*.7;look(v(lerp(105,90,p),lerp(42,34,p),lerp(115,95,p)),v(-15,16,-35));}
 renderer.render(scene,camera);
}
window.addEventListener("hf-seek",e=>renderAt(e.detail.time));window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};window.__hf.buildReady["three"]=renderer.compileAsync(scene,camera).then(()=>renderAt(0));
