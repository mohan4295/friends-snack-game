// Friends Snack Dash - simple canvas game with obstacles, power-ups, speed boosts
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start');
const overlay = document.getElementById('overlay');
const scoreLabel = document.getElementById('score');
const livesLabel = document.getElementById('lives');
const bgm = document.getElementById('bgm');
const muteBtn = document.getElementById('mute');
const powerLabel = document.getElementById('power');

let W = canvas.width, H = canvas.height;
let keys = {}, touches = [];
let player = {x: W/2, y: H-80, w:48, h:48, speed: 4, vx:0};
let snacks = []; // collectibles (friends-themed snacks)
let obstacles = [];
let powerups = [];
let score = 0, lives = 3;
let lastTime = 0, spawnTimer = 0, spawnInterval = 900;
let power = 0, powerActive = false, powerTimer = 0;
let speedBoost = false, boostTimer = 0, boostCooldown = 0;
let gameRunning = false;
let spriteImages = {};

const ASSETS = [
  'assets/snack.png','assets/obstacle.png','assets/powerup.png','assets/boost.png','assets/bg_music.wav'
];

function loadAssets(cb){
  let remaining = ASSETS.length;
  ASSETS.forEach(src => {
    if(src.endsWith('.wav')){ remaining--; if(remaining===0) cb(); return; }
    let img = new Image();
    img.src = src;
    img.onload = ()=>{ spriteImages[src]=img; remaining--; if(remaining===0) cb(); };
    img.onerror = ()=>{ console.warn('image load failed',src); remaining--; if(remaining===0) cb(); };
  });
}

function resetGame(){
  snacks=[]; obstacles=[]; powerups=[];
  score=0; lives=3; power=0; powerActive=false; speedBoost=false;
  player.x=W/2; player.y=H-80; player.speed=4;
  spawnInterval=900;
  updateHUD();
}

function updateHUD(){
  scoreLabel.textContent = 'Score: '+score;
  livesLabel.textContent = 'Lives: '+lives;
  powerLabel.textContent = Math.floor(power);
}

function spawnWave(dt){
  spawnTimer += dt;
  if(spawnTimer > spawnInterval){
    spawnTimer = 0;
    // spawn snack
    const kind = Math.random();
    const x = 40 + Math.random()*(W-80);
    if(kind < 0.6){
      snacks.push({x,y:-40,w:40,h:40,vy:1.2+Math.random()*1.6,score:10});
    } else if(kind < 0.85){
      obstacles.push({x,y:-60,w:60,h:40,vy:2+Math.random()*1.5});
    } else {
      powerups.push({x,y:-36,w:36,h:36,vy:1.5,typ: Math.random()>0.5?'shield':'slow'});
    }
    // sometimes spawn speed boost icon for short-time boost
    if(Math.random() < 0.08) powerups.push({x:20+Math.random()*(W-40),y:-36,w:36,h:36,vy:2,typ:'boost'});
  }
}

function rectsCollide(a,b){
  return !(a.x+a.w < b.x || a.x > b.x+b.w || a.y+a.h < b.y || a.y > b.y+b.h);
}

function applyControls(){
  let s = player.speed * (speedBoost?1.8:1);
  if(keys.ArrowLeft || keys.a) player.x -= s;
  if(keys.ArrowRight|| keys.d) player.x += s;
  if(keys.ArrowUp || keys.w) player.y -= s;
  if(keys.ArrowDown|| keys.s) player.y += s;
  // bounds
  player.x = Math.max(8, Math.min(W-player.w-8, player.x));
  player.y = Math.max(8, Math.min(H-player.h-8, player.y));
}

function update(dt){
  if(!gameRunning) return;
  applyControls();
  spawnWave(dt);
  // update snacks
  snacks.forEach(s=>{ s.y += s.vy * (1 + score*0.0005); });
  obstacles.forEach(o=>{ o.y += o.vy * (1 + score*0.0006); });
  powerups.forEach(p=>{ p.y += p.vy; });
  // collisions
  for(let i=snacks.length-1;i>=0;i--){
    let s = snacks[i];
    if(rectsCollide(player,s)){
      score += s.score;
      power += 8;
      snacks.splice(i,1);
      updateHUD();
    } else if(s.y > H+50) snacks.splice(i,1);
  }
  for(let i=obstacles.length-1;i>=0;i--){
    let o = obstacles[i];
    if(rectsCollide(player,o)){
      if(powerActive){ // shield absorbs
        obstacles.splice(i,1);
        powerActive = false;
        power = 0;
      } else {
        lives -= 1;
        obstacles.splice(i,1);
        updateHUD();
        if(lives<=0) endGame();
      }
    } else if(o.y > H+100) obstacles.splice(i,1);
  }
  for(let i=powerups.length-1;i>=0;i--){
    let p = powerups[i];
    if(rectsCollide(player,p)){
      if(p.typ === 'shield'){ powerActive = true; power = 30; powerTimer = 0; }
      else if(p.typ === 'slow'){ // slow obstacles temporarily
        obstacles.forEach(o=> o.vy *= 0.5);
        setTimeout(()=> obstacles.forEach(o=> o.vy *= 2), 4000);
      } else if(p.typ === 'boost'){ speedBoost = true; boostTimer = 0; }
      powerups.splice(i,1);
    } else if(p.y > H+50) powerups.splice(i,1);
  }
  // power meter decay & power activation
  if(power >= 30 && !powerActive){
    powerActive = true;
    power = 30;
  }
  if(powerActive){
    powerTimer += dt;
    if(powerTimer > 6000){ // 6 seconds shield
      powerActive = false;
      powerTimer = 0;
      power = 0;
    }
  } else {
    // passive decay
    power = Math.max(0, power - dt*0.002);
  }
  if(speedBoost){
    boostTimer += dt;
    if(boostTimer > 3000){ speedBoost = false; boostTimer = 0; }
  }
  // small difficulty ramp
  if(score > 0 && score % 100 === 0) spawnInterval = Math.max(400, spawnInterval - 0.2*dt);
}

function draw(){
  // clear
  ctx.clearRect(0,0,W,H);
  // background playful friends-themed shapes
  for(let i=0;i<6;i++){
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc((i*140 + (Date.now()%500)/2)%W, 70 + (i*40)%H, 40,0,Math.PI*2);
    ctx.fill();
  }
  // draw player as snack with face
  if(spriteImages['assets/snack.png']){
    ctx.drawImage(spriteImages['assets/snack.png'], player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = '#ffd27f'; ctx.fillRect(player.x,player.y,player.w,player.h);
  }
  // draw snacks & obstacles & powerups
  snacks.forEach(s=>{
    if(spriteImages['assets/snack.png']) ctx.drawImage(spriteImages['assets/snack.png'], s.x, s.y, s.w, s.h);
    else { ctx.fillStyle='#ffeb99'; ctx.fillRect(s.x,s.y,s.w,s.h); }
  });
  obstacles.forEach(o=>{
    if(spriteImages['assets/obstacle.png']) ctx.drawImage(spriteImages['assets/obstacle.png'], o.x, o.y, o.w, o.h);
    else { ctx.fillStyle='#8b5a2b'; ctx.fillRect(o.x,o.y,o.w,o.h); }
  });
  powerups.forEach(p=>{
    if(spriteImages['assets/powerup.png']) ctx.drawImage(spriteImages['assets/powerup.png'], p.x, p.y, p.w, p.h);
    else { ctx.fillStyle='#77dd77'; ctx.fillRect(p.x,p.y,p.w,p.h); }
  });
  // HUD overlay for power
  if(powerActive){
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.strokeRect(player.x-4, player.y-4, player.w+8, player.h+8);
  }
}

function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = ts - lastTime;
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame(){
  resetGame();
  gameRunning = true;
  overlay.style.display = 'none';
  // try to play music (must be user gesture in many browsers)
  bgm.play().catch(()=>{});
  lastTime = 0;
}

function endGame(){
  gameRunning = false;
  overlay.style.display = 'flex';
  overlay.innerHTML = `<h2>Game Over</h2><p>Your score: ${score}</p><button id="start">Play Again</button>`;
  document.getElementById('start').addEventListener('click', ()=>{ overlay.innerHTML = ''; overlay.appendChild(startBtn); overlay.style.display='none'; startGame(); });
}

startBtn.addEventListener('click', ()=> startGame());
document.addEventListener('keydown',(e)=>{ keys[e.key]=true; if(e.key===' ') { /*space: temporary speed*/ speedBoost=true; boostTimer=0; } });
document.addEventListener('keyup',(e)=>{ keys[e.key]=false; if(e.key===' ') speedBoost=false; });
// touch controls for mobile
canvas.addEventListener('touchstart', (e)=>{ const t=e.touches[0]; const rect=canvas.getBoundingClientRect(); const x=(t.clientX-rect.left)*(canvas.width/rect.width); const y=(t.clientY-rect.top)*(canvas.height/rect.height); player.x = x-player.w/2; player.y = y-player.h/2; startGame(); }, {passive:true});
canvas.addEventListener('touchmove', (e)=>{ const t=e.touches[0]; const rect=canvas.getBoundingClientRect(); const x=(t.clientX-rect.left)*(canvas.width/rect.width); const y=(t.clientY-rect.top)*(canvas.height/rect.height); player.x = x-player.w/2; player.y = y-player.h/2; }, {passive:true});

muteBtn.addEventListener('click', ()=>{ if(bgm.paused){ bgm.play(); muteBtn.textContent='🔈'; } else { bgm.pause(); muteBtn.textContent='🔇'; } });

// responsiveness
function resize(){
  const ratio = canvas.width/canvas.height;
  const cw = Math.min(900, window.innerWidth-40);
  canvas.style.width = cw + 'px';
  canvas.style.height = Math.round(cw/ratio) + 'px';
}
window.addEventListener('resize', resize);
resize();

// register service worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').then(()=> console.log('SW registered'));
}

// load assets then start loop
loadAssets(()=>{ requestAnimationFrame(loop); });
