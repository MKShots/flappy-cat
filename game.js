// Flappy Cat: Improved pause, try again button, and mobile broom fix
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Cat Faces ---
const CAT_FACE_PATHS = [];
for (let i = 1; i <= 19; i++) {
  CAT_FACE_PATHS.push(`assets/cat_faces/cat_face_${i}.png`);
}
let unlockedFaces = [];
let selectedFace = 0;
let catImages = CAT_FACE_PATHS.map(path => {
  let img = new Image();
  img.src = path;
  return img;
});

// --- Sound Effects ---
const unlockSound = new Audio('assets/audio/unlock.mp3');
const deathSound = new Audio('assets/audio/death.mp3');

let sfxEnabled = true;

// --- Platform detection ---
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
}
const MOBILE = isMobile();

// --- Game Variables ---
const ASPECT_W = 3, ASPECT_H = 4;
const BASE_W = 360, BASE_H = 480;

let width, height, scale;
let catX, catY, catHitboxRX, catHitboxRY;
let groundY, ceilingY, broomWidth, broomGap, broomBaseGap, broomMinGap, maxBroomGap, minBroomGap, broomSpeed, broomBaseSpeed;
let brooms, broomTimer, broomInterval, broomBaseInterval, minBroomInterval;
let gravity, jumpPower;
let gameStarted, gameOver, score, catVY;
let tryAgainBtn = null;

// --- Pause Button/Menu/Countdown State ---
let pauseBtn = null;
let paused = false;
let pauseMenu = { show: false, resumeBtn: null };
let pauseCountdown = { running: false, timer: 0, num: 3 };

// --- Unlock popup state ---
let unlockPopup = {
  show: false,
  faceIdx: 0,
  timer: 0
};

// --- Selector state ---
let selectorScrollX = 0;
let selectorDragging = false;
let selectorDragStartX = 0;
let selectorScrollStart = 0;

// --- Persistent unlocked faces for this session
function initUnlockedFaces() {
  if (!window._flappyCatUnlocked) {
    window._flappyCatUnlocked = Array(CAT_FACE_PATHS.length).fill(false);
    window._flappyCatUnlocked[0] = true;
  }
  unlockedFaces = window._flappyCatUnlocked.slice();
}
function persistUnlockedFaces() {
  window._flappyCatUnlocked = unlockedFaces.slice();
}
function playSound(audioClip) {
  if (audioClip && sfxEnabled) {
    audioClip.currentTime = 0;
    audioClip.play();
  }
}
function unlockFace(idx) {
  if (!unlockedFaces[idx]) {
    unlockedFaces[idx] = true;
    persistUnlockedFaces();
    unlockPopup.show = true;
    unlockPopup.faceIdx = idx;
    unlockPopup.timer = 3.0;
    playSound(unlockSound);
  }
}

function resizeCanvas() {
  let ww = window.innerWidth, wh = window.innerHeight;
  let ar = ASPECT_W / ASPECT_H;
  if (ww / wh > ar) {
    height = Math.floor(wh * 0.98);
    width = Math.floor(height * ar);
  } else {
    width = Math.floor(ww * 0.98);
    height = Math.floor(width / ar);
  }
  canvas.width = width;
  canvas.height = height;
  scale = width / BASE_W;

  catX = Math.round(width * 0.22);
  catY = height / 2;
  catHitboxRX = Math.round(28 * scale);
  catHitboxRY = Math.round(34 * scale);

  groundY = height - Math.round(25 * scale);
  ceilingY = Math.round(25 * scale);

  broomWidth = Math.round(44 * scale);

  maxBroomGap = 7 * catHitboxRY;
  minBroomGap = 1.5 * catHitboxRY;
  broomBaseGap = maxBroomGap;
  broomMinGap = minBroomGap;
  broomGap = broomBaseGap;

  broomBaseSpeed = 1.2 * scale;
  broomSpeed = broomBaseSpeed;

  // --- PLATFORM-SPECIFIC BROOM INTERVAL ---
  if (MOBILE) {
    broomBaseInterval = 100; // Much closer brooms for mobile (not scaled)
  } else {
    broomBaseInterval = Math.round(120 * scale); // Desktop/laptop
  }
  minBroomInterval = Math.round(100 * scale);
  broomInterval = broomBaseInterval;

  gravity = 0.13 * scale;
  jumpPower = -4.2 * scale;

  if (brooms) {
    for (let broom of brooms) {
      broom.x = Math.round(broom.x * width / BASE_W);
    }
  }
}

// --- Draw Cat Face PNG, fit to hitbox, with NO border ---
function drawCatFace(x, y, faceIdx = selectedFace, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  let img = catImages[faceIdx];
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(
      img,
      x - catHitboxRX,
      y - catHitboxRY,
      catHitboxRX * 2,
      catHitboxRY * 2
    );
  }
  ctx.restore();
}

// --- Draw Pause Button ---
function drawPauseBtn() {
  const btnSize = 44 * scale;
  const margin = 16 * scale;
  const x = width - btnSize - margin;
  const y = margin;
  pauseBtn = { x, y, w: btnSize, h: btnSize };
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.arc(x + btnSize/2, y + btnSize/2, btnSize/2, 0, Math.PI*2);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 4*scale;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Draw icon: pause (||) or play (►)
  ctx.strokeStyle = "#ba0e19";
  ctx.fillStyle = "#ba0e19";
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = "round";
  if (!paused && !pauseMenu.show && !pauseCountdown.running) {
    // Pause icon (||)
    ctx.beginPath();
    ctx.moveTo(x + btnSize*0.38, y + btnSize*0.28);
    ctx.lineTo(x + btnSize*0.38, y + btnSize*0.72);
    ctx.moveTo(x + btnSize*0.62, y + btnSize*0.28);
    ctx.lineTo(x + btnSize*0.62, y + btnSize*0.72);
    ctx.stroke();
  } else {
    // Play icon (►)
    ctx.beginPath();
    const px = x + btnSize*0.40;
    const py = y + btnSize*0.30;
    const triangleW = btnSize*0.28;
    const triangleH = btnSize*0.40;
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + triangleH);
    ctx.lineTo(px + triangleW, py + triangleH/2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// --- Draw Pause Menu (centered window with Resume button) ---
function drawPauseMenu() {
  const winW = 260 * scale, winH = 160 * scale;
  const winX = (width - winW) / 2, winY = height/2 - winH/2;

  // Overlay
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  // Pause window
  ctx.save();
  ctx.shadowColor = "#ba0e19";
  ctx.shadowBlur = 18 * scale;
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, winH, 22*scale);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#ba0e19";
  ctx.lineWidth = 3*scale;
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // "Paused"
  ctx.font = `bold ${Math.round(28*scale)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = "#ba0e19";
  ctx.textAlign = "center";
  ctx.fillText("Paused", width/2, winY + 38*scale);

  // Resume Button
  const btnW = winW * 0.85, btnH = 40*scale, btnX = width/2 - btnW/2, btnY = winY + 70*scale;
  pauseMenu.resumeBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  ctx.save();
  ctx.shadowColor = "#1faaff";
  ctx.shadowBlur = 10*scale;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 13*scale);
  ctx.fillStyle = "#4ecbff";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#1faaff";
  ctx.stroke();
  ctx.font = `bold ${Math.round(20*scale)}px Arial Black, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#124a89";
  ctx.fillText("Resume", btnX + btnW/2, btnY + btnH/2 + 6*scale);
  ctx.restore();
  ctx.restore();
}

function catHitbox() {
  return {
    x: catX,
    y: catY,
    rx: catHitboxRX,
    ry: catHitboxRY
  };
}

function checkCollision() {
  let hit = catHitbox();
  for (let broom of brooms) {
    if (hit.x + hit.rx > broom.x && hit.x - hit.rx < broom.x + broomWidth) {
      if (
        hit.y - hit.ry < broom.gapY - broom.gap/2 ||
        hit.y + hit.ry > broom.gapY + broom.gap/2
      ) {
        return true;
      }
    }
  }
  if (catY + catHitboxRY > groundY) return true;
  return false;
}

function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = `${Math.round(28 * scale)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20 * scale, 44 * scale);
}
function drawBrooms() {
  ctx.fillStyle = "#c28d60";
  for (let broom of brooms) {
    ctx.fillRect(broom.x, 0, broomWidth, broom.gapY - broom.gap / 2);
    ctx.fillRect(broom.x, broom.gapY + broom.gap / 2, broomWidth, height - (broom.gapY + broom.gap / 2));
  }
}
function drawGround() {
  ctx.fillStyle = "#c6b79b";
  ctx.fillRect(0, groundY, width, height-groundY);
}

function drawTitle() {
  const titleY = 128 * scale;
  const fontSize = Math.round(46 * scale);
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial Black, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 7; i > 0; i--) {
    ctx.fillStyle = `rgba(80,0,0,${0.12 + i*0.04})`;
    ctx.fillText("Flappy Cat", width/2 + i, titleY + i);
  }
  let grad = ctx.createLinearGradient(width/2 - 80*scale, titleY, width/2 + 80*scale, titleY + fontSize);
  grad.addColorStop(0, "#990000");
  grad.addColorStop(0.4, "#c1272d");
  grad.addColorStop(0.6, "#ed1c24");
  grad.addColorStop(1, "#ff6767");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3 * scale;
  ctx.strokeText("Flappy Cat", width/2, titleY);
  ctx.fillText("Flappy Cat", width/2, titleY);

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(width/2, titleY + fontSize*0.45, fontSize*1.2, fontSize*0.32, 0, Math.PI*0.1, Math.PI*0.9, false);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawTryAgainBtn() {
  let btnW = 150 * scale, btnH = 45 * scale;
  let btnX = width/2 - btnW/2;
  let btnY = height/2 + 65 * scale;
  tryAgainBtn = {x: btnX, y: btnY, w: btnW, h: btnH};

  ctx.save();
  ctx.shadowColor = "#1faaff";
  ctx.shadowBlur = 12 * scale;

  let grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY+btnH);
  grad.addColorStop(0, "#4ecbff");
  grad.addColorStop(0.7, "#1faaff");
  grad.addColorStop(1, "#267cc1");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2 * scale;

  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 14 * scale);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.round(22*scale)}px Arial Black, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.3*scale;
  ctx.strokeText("Try again", width/2, btnY + btnH/2);
  ctx.fillStyle = "#124a89";
  ctx.fillText("Try again", width/2, btnY + btnH/2);

  ctx.restore();
}

function resetGame() {
  catY = height / 2;
  catVY = 0;
  broomGap = broomBaseGap;
  broomSpeed = broomBaseSpeed;
  broomInterval = broomBaseInterval;
  brooms = [];
  broomTimer = 0;
  score = 0;
  gameOver = false;
  gameStarted = false;
  tryAgainBtn = null;
  initUnlockedFaces();
  paused = false;
  pauseMenu.show = false;
  pauseCountdown.running = false;
}

function updateBroomDifficulty() {
  let level = score + 1;
  let t = Math.min(level, 300) / 300;
  broomGap = maxBroomGap - (maxBroomGap - minBroomGap) * t;
}

function startGame() {
  brooms = [];
  broomTimer = 0;
  const gapY = ceilingY + broomGap/2 + Math.random() * (groundY - ceilingY - broomGap);
  brooms.push({ x: width, gapY, gap: broomGap, passed: false });
  gameStarted = true;
  gameOver = false;
  score = 0;
  catY = height / 2;
  catVY = 0;
}

// --- Main update loop ---
function update(dt = 1/60) {
  ctx.clearRect(0, 0, width, height);
  drawGround();

  // Unlock popup update
  if (unlockPopup.show) {
    unlockPopup.timer -= dt;
    if (unlockPopup.timer <= 0) {
      unlockPopup.show = false;
    }
  }

  if (pauseMenu.show) {
    drawBrooms();
    drawCatFace(catX, catY, selectedFace, 1);
    drawScore();
    drawPauseBtn();
    drawUnlockPopup();
    drawPauseMenu();
    return requestAnimationFrame(() => update(1/60));
  }

  if (!gameStarted && !gameOver) {
    drawTitle();
    drawCatFace(catX, catY, selectedFace, 1);
    ctx.save();
    ctx.font = `${Math.round(17*scale)}px Arial`;
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText("To Start:", width/2, height/2 + 110 * scale);
    ctx.fillText("Tap / Space Bar", width/2, height/2 + 134 * scale);
    ctx.restore();
    drawScore();
    drawPauseBtn();
    drawUnlockPopup();
    requestAnimationFrame(() => update(1/60));
    return;
  }

  // --- Physics & Gameplay ---
  if (gameStarted && !gameOver && !paused) {
    catVY += gravity;
    catY += catVY;
    updateBroomDifficulty();
    broomTimer++;
    if (broomTimer >= broomInterval) {
      broomTimer = 0;
      const gapY = ceilingY + broomGap/2 + Math.random() * (groundY - ceilingY - broomGap);
      brooms.push({ x: width, gapY, gap: broomGap, passed: false });
    }
    for (let broom of brooms) {
      broom.x -= broomSpeed;
    }
    brooms = brooms.filter(broom => broom.x + broomWidth > 0);
    for (let broom of brooms) {
      if (!broom.passed && broom.x + broomWidth < catX - catHitboxRX) {
        broom.passed = true;
        score++;
        if (score % 10 === 0 && score / 10 < CAT_FACE_PATHS.length && score > 0) {
          unlockFace(score / 10);
        }
      }
    }
    if (checkCollision()) {
      gameOver = true;
      playSound(deathSound);
    }
  }

  // --- Draw world ---
  drawBrooms();
  drawCatFace(catX, catY, selectedFace, 1);

  // --- UI (drawn last, always on top) ---
  if (gameStarted && !gameOver) {
    drawScore();
    drawPauseBtn();
    drawUnlockPopup();
  } else if (gameOver) {
    ctx.save();
    ctx.shadowColor = "#f44336";
    ctx.shadowBlur = 18 * scale;
    ctx.font = `bold ${Math.round(38*scale)}px Arial Black, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ba0e19";
    ctx.fillText("Game Over!", width / 2, height / 2 - 48 * scale);
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.round(28*scale)}px Arial Black, Arial, sans-serif`;
    ctx.fillStyle = "#222";
    ctx.fillText(`Score: ${score}`, width / 2, height / 2 - 10 * scale);
    ctx.restore();

    drawTryAgainBtn();
    drawPauseBtn();
    drawUnlockPopup();
  }

  requestAnimationFrame(() => update(1/60));
}

// --- Controls ---
function triggerFlap() {
  if (!gameStarted && !gameOver && !paused && !pauseMenu.show && !pauseCountdown.running) {
    startGame();
  }
  if (gameStarted && !gameOver && !paused && !pauseMenu.show && !pauseCountdown.running) {
    catVY = jumpPower;
  }
}

function tryPause(mx, my) {
  if (pauseBtn) {
    if (
      mx >= pauseBtn.x &&
      mx <= pauseBtn.x + pauseBtn.w &&
      my >= pauseBtn.y &&
      my <= pauseBtn.y + pauseBtn.h
    ) {
      if (!paused && !pauseCountdown.running && !pauseMenu.show && gameStarted && !gameOver) {
        pauseMenu.show = true;
      }
      return true;
    }
  }
  return false;
}

function handleResumeBtn(mx, my) {
  if (pauseMenu.resumeBtn) {
    let btn = pauseMenu.resumeBtn;
    if (
      mx >= btn.x && mx <= btn.x + btn.w &&
      my >= btn.y && my <= btn.y + btn.h
    ) {
      pauseMenu.show = false;
      paused = false;
      return true;
    }
  }
  return false;
}

function handleTryAgainBtn(mx, my) {
  if (tryAgainBtn) {
    if (
      mx >= tryAgainBtn.x && mx <= tryAgainBtn.x + tryAgainBtn.w &&
      my >= tryAgainBtn.y && my <= tryAgainBtn.y + tryAgainBtn.h
    ) {
      resetGame();
      return true;
    }
  }
  return false;
}

canvas.addEventListener('mousedown', function (e) {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (pauseMenu.show) {
    if (handleResumeBtn(mx, my)) return;
    return;
  }

  if (tryPause(mx, my)) return;

  if (gameOver) {
    if (handleTryAgainBtn(mx, my)) return;
  } else if (!gameStarted && !gameOver) {
    triggerFlap();
  } else if (gameStarted && !gameOver && !paused) {
    triggerFlap();
  }
});
canvas.addEventListener('touchstart', function (e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const my = (touch.clientY - rect.top) * (canvas.height / rect.height);

  if (pauseMenu.show) {
    if (handleResumeBtn(mx, my)) { e.preventDefault(); return; }
    return;
  }

  if (tryPause(mx, my)) { e.preventDefault(); return; }

  if (gameOver) {
    if (handleTryAgainBtn(mx, my)) { e.preventDefault(); return; }
  } else if (!gameStarted && !gameOver) {
    triggerFlap();
  } else if (gameStarted && !gameOver && !paused) {
    triggerFlap();
  }
  e.preventDefault();
});

document.addEventListener('keydown', function (e) {
  if (pauseMenu.show || pauseCountdown.running) return;
  if ((e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    triggerFlap();
  }
});

window.addEventListener('resize', () => {
  resizeCanvas();
  if (!gameStarted) catY = height/2;
});
catImages[0].onload = function() {
  update();
};
initUnlockedFaces();
resizeCanvas();
resetGame();
update();