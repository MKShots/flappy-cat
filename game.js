// --- Flappy Cat Game: Improved Title & Button Style, UI Draw Order Fixes, Simpler Button & Return to Start ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CAT_FACE_PATHS = [
  "assets/cat_faces/cat_face_1.png",
  // Add more faces here
];
let unlockedFaces = [true];
let selectedFace = 0;
let catImages = CAT_FACE_PATHS.map(path => {
  let img = new Image();
  img.src = path;
  return img;
});

// --- Game Variables ---
const ASPECT_W = 3, ASPECT_H = 4;
const BASE_W = 360, BASE_H = 480;

let width, height, scale;
let catX, catY, catHitboxRX, catHitboxRY;
let groundY, ceilingY, broomWidth, broomGap, broomBaseGap, broomMinGap, maxBroomGap, minBroomGap, broomSpeed, broomBaseSpeed;
let brooms, broomTimer, broomInterval, broomBaseInterval, minBroomInterval;
let gravity, jumpPower;
let gameStarted, gameOver, score, catVY;
let tryAgainBtn = null; // For restart button

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

  // --- Broom gap progression remains unchanged, but easier difficulty settings below ---
  maxBroomGap = 7 * catHitboxRY;
  minBroomGap = 1.5 * catHitboxRY;
  broomBaseGap = maxBroomGap;
  broomMinGap = minBroomGap;
  broomGap = broomBaseGap;

  // Easier difficulty: slower broom speed, fewer brooms, gentler gravity/jump
  broomBaseSpeed = 1.2 * scale; // slower!
  broomSpeed = broomBaseSpeed;
  broomBaseInterval = Math.round(170 * scale); // fewer brooms
  minBroomInterval = Math.round(120 * scale);
  broomInterval = broomBaseInterval;

  gravity = 0.13 * scale;   // much gentler fall
  jumpPower = -4.2 * scale;  // gentle, but enough lift

  if (brooms) {
    for (let broom of brooms) {
      broom.x = Math.round(broom.x * width / BASE_W);
    }
  }
}

// --- Draw Cat Face PNG, fit to hitbox, with thin border ---
function drawCatFace(x, y) {
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, catHitboxRX, catHitboxRY, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  let img = catImages[selectedFace];
  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.drawImage(
      img,
      x - catHitboxRX,
      y - catHitboxRY,
      catHitboxRX * 2,
      catHitboxRY * 2
    );
    ctx.restore();
  }
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
  // Collision with brooms
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
  // Collision with ground
  if (catY + catHitboxRY > groundY) return true;
  // Collision with ceiling (optional; add if you want)
  // if (catY - catHitboxRY < ceilingY) return true;
  return false;
}

// --- Drawing functions ---
function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = `${Math.round(28 * scale)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20 * scale, 44 * scale);
}
function wrapText(text, x, y, maxWidth, lineHeight, maxLines, font, color, align="center") {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  let words = text.split(' ');
  let line = '';
  let lines = [];
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + ' ';
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
      if (lines.length === maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  ctx.restore();
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

// --- Fancy 3D Title text on start screen ---
function drawTitle() {
  // Lower the title and make it fancier and more distinct
  const titleY = 128 * scale;
  const fontSize = Math.round(46 * scale);
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial Black, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // 3D shadow effect
  for (let i = 7; i > 0; i--) {
    ctx.fillStyle = `rgba(80,0,0,${0.12 + i*0.04})`;
    ctx.fillText("Flappy Cat", width/2 + i, titleY + i);
  }
  // Main gradient text
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

  // Gloss highlight
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(width/2, titleY + fontSize*0.45, fontSize*1.2, fontSize*0.32, 0, Math.PI*0.1, Math.PI*0.9, false);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --- Simpler Try Again Button ---
function drawTryAgainBtn() {
  let btnW = 150 * scale, btnH = 45 * scale; // 0.75x previous size
  let btnX = width/2 - btnW/2;
  let btnY = height/2 + 65 * scale;
  tryAgainBtn = {x: btnX, y: btnY, w: btnW, h: btnH};

  ctx.save();
  // Blue gradient, soft shadow, rounded rectangle
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
  // Button text, bold and blue
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

// --- Game logic ---
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
}

function updateBroomDifficulty() {
  // Gap shrinks linearly from maxBroomGap to minBroomGap by level 300
  let level = score + 1;
  let t = Math.min(level, 300) / 300;
  broomGap = maxBroomGap - (maxBroomGap - minBroomGap) * t;
}

function startGame() {
  // Place first broom at the right edge, then delay next broom as usual
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

function update() {
  ctx.clearRect(0, 0, width, height);
  drawGround();

  if (!gameStarted && !gameOver) {
    drawTitle();
    drawCatFace(catX, catY);
    wrapText(
      "Press SPACE, ENTER, or TAP to start",
      width / 2,
      height / 2 + 110 * scale,
      width - 60 * scale,
      22 * scale,
      3,
      `${Math.round(17*scale)}px Arial`,
      "#333"
    );
    drawScore();
    requestAnimationFrame(update);
    return;
  }

  // --- Physics & Gameplay ---
  if (gameStarted && !gameOver) {
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
      }
    }
    // --- Collision detection ---
    if (checkCollision()) {
      gameOver = true;
    }
  }

  // --- Draw world ---
  drawBrooms();
  drawCatFace(catX, catY);

  // --- UI (drawn last, always on top) ---
  if (gameStarted && !gameOver) {
    drawScore();
  } else if (gameOver) {
    // Draw Game Over UI (always on top)
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
  }

  requestAnimationFrame(update);
}

// --- Controls ---
function triggerFlap() {
  if (!gameStarted && !gameOver) {
    startGame();
  }
  if (gameStarted && !gameOver) {
    catVY = jumpPower;
  }
}

// Only allow restart via button, and after button: return to start screen, not start game immediately
function handleRestartBtnClick(mx, my) {
  if (tryAgainBtn) {
    if (
      mx >= tryAgainBtn.x &&
      mx <= tryAgainBtn.x + tryAgainBtn.w &&
      my >= tryAgainBtn.y &&
      my <= tryAgainBtn.y + tryAgainBtn.h
    ) {
      resetGame();
      // Do not call startGame(); return to start screen instead
    }
  }
}

document.addEventListener('keydown', function (e) {
  if (!gameStarted && !gameOver && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    triggerFlap();
  }
  if (gameStarted && !gameOver && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    triggerFlap();
  }
  // Do NOT allow restart with space/enter if game over
});

canvas.addEventListener('mousedown', function (e) {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (!gameStarted && !gameOver) {
    triggerFlap();
  } else if (gameOver) {
    handleRestartBtnClick(mx, my);
  } else if (gameStarted && !gameOver) {
    triggerFlap();
  }
});
canvas.addEventListener('touchstart', function (e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
  if (!gameStarted && !gameOver) {
    triggerFlap();
  } else if (gameOver) {
    handleRestartBtnClick(mx, my);
  } else if (gameStarted && !gameOver) {
    triggerFlap();
  }
  e.preventDefault();
});
canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
});

// --- Init ---
window.addEventListener('resize', () => {
  resizeCanvas();
  if (!gameStarted) catY = height/2;
});
catImages[0].onload = function() {
  update();
};
resizeCanvas();
resetGame();
update();