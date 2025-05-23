// Flappy Cat: Adds always-visible SFX toggle button under pause (not shown/active in pause menu)

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
let pauseBtn = null;   // {x, y, w, h}
let audioBtn = null;   // {x, y, w, h}
let paused = false;
let pauseMenu = { show: false, resumeBtn: null, sfxToggleBtn: null };
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
  broomBaseInterval = Math.round(170 * scale);
  minBroomInterval = Math.round(120 * scale);
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

// --- Draw Pause Button (top right, toggles between pause/play icon) ---
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

// --- Draw Audio Button (mute/volume, under pauseBtn) ---
function drawAudioBtn() {
  const btnSize = 44 * scale;
  const margin = 16 * scale;
  const gap = 12 * scale;
  const x = width - btnSize - margin;
  const y = margin + btnSize + gap;
  audioBtn = { x, y, w: btnSize, h: btnSize };

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
  ctx.strokeStyle = "#ba0e19";
  ctx.fillStyle = "#ba0e19";

  // Draw icon: muted ("mute", X or slash) if sfxEnabled is false, else "volume on"
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = "round";
  if (sfxEnabled) {
    // "Mute" symbol: speaker with "slash"
    // Speaker
    ctx.save();
    ctx.beginPath();
    const sx = x + btnSize*0.34, sy = y + btnSize*0.47, sw = btnSize*0.16, sh = btnSize*0.18;
    ctx.moveTo(sx + sw, sy - sh/2); // front tip
    ctx.lineTo(sx, sy - sh/2);      // top left
    ctx.lineTo(sx, sy + sh/2);      // bottom left
    ctx.lineTo(sx + sw, sy + sh/2); // back bottom
    ctx.closePath();
    ctx.fill();
    // Sound waves
    ctx.beginPath();
    ctx.arc(x + btnSize*0.65, y + btnSize*0.5, btnSize*0.09, -Math.PI/4, Math.PI/4, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + btnSize*0.65, y + btnSize*0.5, btnSize*0.18, -Math.PI/4, Math.PI/4, false);
    ctx.stroke();
    ctx.restore();
    // Slash line (mute)
    ctx.save();
    ctx.strokeStyle = "#ba0e19";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(x + btnSize*0.68, y + btnSize*0.32);
    ctx.lineTo(x + btnSize*0.32, y + btnSize*0.68);
    ctx.stroke();
    ctx.restore();
  } else {
    // "Volume" symbol: speaker with two sound waves
    // Speaker
    ctx.save();
    ctx.beginPath();
    const sx = x + btnSize*0.34, sy = y + btnSize*0.47, sw = btnSize*0.16, sh = btnSize*0.18;
    ctx.moveTo(sx + sw, sy - sh/2); // front tip
    ctx.lineTo(sx, sy - sh/2);      // top left
    ctx.lineTo(sx, sy + sh/2);      // bottom left
    ctx.lineTo(sx + sw, sy + sh/2); // back bottom
    ctx.closePath();
    ctx.fill();
    // Sound waves
    ctx.beginPath();
    ctx.arc(x + btnSize*0.65, y + btnSize*0.5, btnSize*0.09, -Math.PI/4, Math.PI/4, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + btnSize*0.65, y + btnSize*0.5, btnSize*0.18, -Math.PI/4, Math.PI/4, false);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ... (all your other functions remain unchanged, including drawPauseMenu, drawUnlockPopup, drawFaceSelector, etc.) ...

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

  // Pause menu
  if (pauseMenu.show) {
    drawPauseMenu();
    drawPauseBtn();
    drawUnlockPopup();
    return requestAnimationFrame(() => update(1/60));
  }

  // Pause countdown
  if (pauseCountdown.running) {
    drawBrooms();
    drawCatFace(catX, catY, selectedFace, 1);
    drawScore();
    drawPauseBtn();
    drawAudioBtn();
    drawUnlockPopup();
    drawPauseCountdown();
    pauseCountdown.timer -= dt;
    if (pauseCountdown.timer <= 0) {
      pauseCountdown.num--;
      if (pauseCountdown.num > 0) {
        pauseCountdown.timer = 1;
      } else {
        pauseCountdown.running = false;
        paused = false;
      }
    }
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
    drawFaceSelector();
    drawPauseBtn();
    drawAudioBtn();
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
    drawAudioBtn();
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
    drawFaceSelector();
    drawPauseBtn();
    drawAudioBtn();
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
function tryAudioToggle(mx, my) {
  if (audioBtn && !pauseMenu.show) {
    if (
      mx >= audioBtn.x &&
      mx <= audioBtn.x + audioBtn.w &&
      my >= audioBtn.y &&
      my <= audioBtn.y + audioBtn.h
    ) {
      sfxEnabled = !sfxEnabled;
      return true;
    }
  }
  return false;
}
function tryPauseTouch(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
  return tryPause(mx, my);
}
function tryAudioToggleTouch(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
  return tryAudioToggle(mx, my);
}

function handlePauseMenuClick(mx, my) {
  if (pauseMenu.resumeBtn &&
    mx >= pauseMenu.resumeBtn.x && mx <= pauseMenu.resumeBtn.x + pauseMenu.resumeBtn.w &&
    my >= pauseMenu.resumeBtn.y && my <= pauseMenu.resumeBtn.y + pauseMenu.resumeBtn.h
  ) {
    pauseMenu.show = false;
    pauseCountdown.running = true;
    pauseCountdown.num = 3;
    pauseCountdown.timer = 1;
    paused = true;
    return;
  }
  if (pauseMenu.sfxToggleBtn &&
    mx >= pauseMenu.sfxToggleBtn.x && mx <= pauseMenu.sfxToggleBtn.x + pauseMenu.sfxToggleBtn.w &&
    my >= pauseMenu.sfxToggleBtn.y && my <= pauseMenu.sfxToggleBtn.y + pauseMenu.sfxToggleBtn.h
  ) {
    sfxEnabled = !sfxEnabled;
    return;
  }
}

// ... (other handlers for restart button, selector, drag, touch, keyboard remain unchanged) ...

canvas.addEventListener('mousedown', function (e) {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (pauseMenu.show) {
    handlePauseMenuClick(mx, my);
    return;
  }
  if (pauseCountdown.running) return;
  if (tryPause(mx, my)) return;
  if (tryAudioToggle(mx, my)) return;
  if (gameOver) {
    if (handleSelectorClick(mx, my)) return;
    handleRestartBtnClick(mx, my);
  } else if (!gameStarted && !gameOver) {
    if (!handleSelectorClick(mx, my)) triggerFlap();
  } else if (gameStarted && !gameOver && !paused) {
    triggerFlap();
  }
});
canvas.addEventListener('touchstart', function (e) {
  if (pauseMenu.show) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
    handlePauseMenuClick(mx, my);
    e.preventDefault();
    return;
  }
  if (pauseCountdown.running) { e.preventDefault(); return; }
  if (tryPauseTouch(e)) { e.preventDefault(); return; }
  if (tryAudioToggleTouch(e)) { e.preventDefault(); return; }
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const my = (touch.clientY - rect.top) * (canvas.height / rect.height);

  if (gameOver) {
    if (handleSelectorClick(mx, my)) { e.preventDefault(); return; }
    handleRestartBtnClick(mx, my);
  } else if (!gameStarted && !gameOver) {
    if (!handleSelectorClick(mx, my)) triggerFlap();
  } else if (gameStarted && !gameOver && !paused) {
    triggerFlap();
  }
  e.preventDefault();
});

// ... (rest of drag and keyboard handlers are unchanged) ...

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