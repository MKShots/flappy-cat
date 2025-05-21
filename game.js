const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIG ---
const ASPECT_W = 3, ASPECT_H = 4; // Portrait aspect ratio (e.g., 450x600)
const BASE_W = 360, BASE_H = 480; // Reference for scaling

// Game variables (to be set in resizeCanvas)
let width, height, scale;

// Cat geometry (will be set in resizeCanvas)
let catX, catY, catRadiusX, catRadiusY, earHeight, earWidth, eyeRX, eyeRY, noseSize, mouthW, mouthH;
let catHitboxY, catHitboxR;
let groundY, ceilingY, broomWidth, broomGap, broomMinGap, broomBaseGap, broomSpeed, broomBaseSpeed;
let brooms, broomTimer, broomInterval, broomBaseInterval, minBroomInterval;
let gravity, jumpPower;
let gameStarted, gameOver, score, catVY;

// --- Responsive scaling and geometry ---
function resizeCanvas() {
  // Maintain aspect ratio
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

  // Cat geometry: SMALLER, OVAL head, all features proportional
  catX = Math.round(width * 0.22);
  catRadiusX = Math.round(28 * scale); // width of head (smaller!)
  catRadiusY = Math.round(34 * scale); // height of head (oval)
  earHeight = Math.round(18 * scale);  // short, up-pointing
  earWidth = Math.round(16 * scale);   // narrow base

  catY = height / 2;
  // Hitbox: match the original pre-ear-adjustment size (just the oval head, no ears)
  catHitboxY = catY;
  catHitboxR = Math.max(catRadiusX, catRadiusY);

  eyeRX = Math.round(6.5 * scale); // oval eyes
  eyeRY = Math.round(8.2 * scale);
  noseSize = Math.round(6 * scale); // triangle side
  mouthW = Math.round(10 * scale);
  mouthH = Math.round(6 * scale);

  groundY = height - Math.round(25 * scale);
  ceilingY = Math.round(25 * scale);

  broomWidth = Math.round(44 * scale);
  broomBaseGap = Math.round(3.1 * catHitboxR); // wide gap
  broomMinGap = Math.round(2.2 * catHitboxR); // still wide
  broomGap = broomBaseGap;

  broomBaseSpeed = 2.0 * scale;
  broomSpeed = broomBaseSpeed;
  broomBaseInterval = Math.round(120 * scale);
  minBroomInterval = Math.round(70 * scale);
  broomInterval = broomBaseInterval;

  gravity = 0.54 * scale;
  jumpPower = -7 * scale;

  // If brooms already exist, adjust their positions proportionally
  if (brooms) {
    for (let broom of brooms) {
      broom.x = Math.round(broom.x * width / BASE_W);
    }
  }
}

// --- Cat face drawing with all adjustments ---
function drawCatFace(x, y) {
  // Ears (start further from center, more up, shorter, smaller)
  ctx.save();
  ctx.lineWidth = 2.1 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  // Left ear outer
  ctx.beginPath();
  ctx.moveTo(x - catRadiusX * 0.85, y - catRadiusY * 0.68); // base left
  ctx.lineTo(x - catRadiusX * 0.97, y - catRadiusY * 0.68 - earHeight); // tip, up
  ctx.lineTo(x - catRadiusX * 0.58, y - catRadiusY * 0.82); // base right
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Right ear outer
  ctx.beginPath();
  ctx.moveTo(x + catRadiusX * 0.85, y - catRadiusY * 0.68);
  ctx.lineTo(x + catRadiusX * 0.97, y - catRadiusY * 0.68 - earHeight);
  ctx.lineTo(x + catRadiusX * 0.58, y - catRadiusY * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Ears (inner pink triangles, fully inside outer, equivalent triangles)
  ctx.fillStyle = "#f7c8b3";
  // Left inner
  ctx.beginPath();
  ctx.moveTo(x - catRadiusX * 0.84, y - catRadiusY * 0.70); // base left
  ctx.lineTo(x - catRadiusX * 0.95, y - catRadiusY * 0.68 - earHeight + earHeight*0.18); // tip, up
  ctx.lineTo(x - catRadiusX * 0.62, y - catRadiusY * 0.81); // base right
  ctx.closePath();
  ctx.fill();
  // Right inner
  ctx.beginPath();
  ctx.moveTo(x + catRadiusX * 0.84, y - catRadiusY * 0.70);
  ctx.lineTo(x + catRadiusX * 0.95, y - catRadiusY * 0.68 - earHeight + earHeight*0.18);
  ctx.lineTo(x + catRadiusX * 0.62, y - catRadiusY * 0.81);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Head (oval)
  ctx.save();
  ctx.lineWidth = 2.1 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(x, y, catRadiusX, catRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Eyes: smaller, oval, higher on face, black only, no white
  ctx.save();
  ctx.fillStyle = "#111";
  // Left eye
  ctx.beginPath();
  ctx.ellipse(
    x - catRadiusX * 0.34, y - catRadiusY * 0.30, // higher up
    eyeRX, eyeRY, 0, 0, Math.PI * 2
  );
  ctx.fill();
  // Right eye
  ctx.beginPath();
  ctx.ellipse(
    x + catRadiusX * 0.34, y - catRadiusY * 0.30,
    eyeRX, eyeRY, 0, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  // Nose: triangle, further down, with black border
  ctx.save();
  ctx.lineWidth = 1.1 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#f7c8b3";
  let noseY = y + catRadiusY * 0.10;
  ctx.beginPath();
  ctx.moveTo(x, noseY);
  ctx.lineTo(x - noseSize/2, noseY + noseSize * 0.75);
  ctx.lineTo(x + noseSize/2, noseY + noseSize * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Whiskers: further down, relative to new nose position
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.1 * scale;
  let whiskerY = noseY + noseSize * 0.65;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x - catRadiusX * 0.18, whiskerY + i*scale*6);
    ctx.lineTo(x - catRadiusX * 0.67, whiskerY + i*scale*11);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + catRadiusX * 0.18, whiskerY + i*scale*6);
    ctx.lineTo(x + catRadiusX * 0.67, whiskerY + i*scale*11);
    ctx.stroke();
  }
  ctx.restore();

  // Mouth: even further down
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.4 * scale;
  let mouthY = whiskerY + catRadiusY * 0.18;
  ctx.beginPath();
  ctx.moveTo(x - mouthW/2, mouthY);
  ctx.bezierCurveTo(
    x - mouthW/2 + mouthW*0.20, mouthY + mouthH*0.25,
    x - mouthW*0.1, mouthY + mouthH*0.38,
    x, mouthY + mouthH*0.11
  );
  ctx.bezierCurveTo(
    x + mouthW*0.1, mouthY + mouthH*0.38,
    x + mouthW/2 - mouthW*0.2, mouthY + mouthH*0.25,
    x + mouthW/2, mouthY
  );
  ctx.stroke();
  ctx.restore();
}

// --- Collision uses oval hitbox (just the head, not ears/whiskers) ---
function catHitbox() {
  return {
    x: catX,
    y: catHitboxY,
    rx: catRadiusX,
    ry: catRadiusY
  };
}
function checkCollision() {
  let hit = catHitbox();
  for (let broom of brooms) {
    if (hit.x + hit.rx > broom.x && hit.x - hit.rx < broom.x + broomWidth) {
      // Oval-rect collision: check if any point on the rectangle edge is within the oval
      // We'll just check if cat's top or bottom is in the broom
      if (
        hit.y - hit.ry < broom.gapY - broom.gap/2 ||
        hit.y + hit.ry > broom.gapY + broom.gap/2
      ) {
        return true;
      }
    }
  }
  if (catY + catRadiusY > groundY) return true;
  return false;
}

// --- Drawing functions (score, UI, etc) ---
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
}
function updateBroomDifficulty() {
  let logScore = Math.log2(1 + score);
  broomGap = Math.max(broomBaseGap - (broomBaseGap - broomMinGap) * (logScore / 8), broomMinGap);
  broomSpeed = Math.min(broomBaseSpeed + (2.1 * scale) * (logScore / 10), broomBaseSpeed + 2.1 * scale);
  broomInterval = Math.max(broomBaseInterval - (broomBaseInterval - minBroomInterval) * (logScore / 10), minBroomInterval);
}
function update() {
  ctx.clearRect(0, 0, width, height);
  drawGround();

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
      if (!broom.passed && broom.x + broomWidth < catX - catRadiusX) {
        broom.passed = true;
        score++;
      }
    }
    drawBrooms();
    if (checkCollision()) gameOver = true;
  } else if (gameOver) {
    ctx.fillStyle = "#d32f2f";
    ctx.font = `bold ${Math.round(28*scale)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", width / 2, height / 2 - 32 * scale);
    wrapText(
      "Press SPACE, ENTER, or TAP to restart",
      width / 2,
      height / 2 + 20 * scale,
      width - 60 * scale,
      24 * scale,
      3,
      `${Math.round(17*scale)}px Arial`,
      "#d32f2f"
    );
    drawBrooms();
  }

  drawCatFace(catX, catY);
  drawScore();
  if (!gameStarted && !gameOver) {
    wrapText(
      "Press SPACE, ENTER, or TAP to start",
      width / 2,
      height / 2 + 80 * scale,
      width - 60 * scale,
      22 * scale,
      3,
      `${Math.round(15*scale)}px Arial`,
      "#333"
    );
  }
  requestAnimationFrame(update);
}

// --- Controls ---
function triggerFlap() {
  if (!gameStarted) {
    resetGame();
    gameStarted = true;
  }
  if (!gameOver) {
    catVY = jumpPower;
  } else {
    resetGame();
    gameStarted = true;
  }
}
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    triggerFlap();
  }
});
canvas.addEventListener('mousedown', function (e) {
  e.preventDefault();
  triggerFlap();
});
canvas.addEventListener('touchstart', function (e) {
  e.preventDefault();
  triggerFlap();
});
canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
});

// --- Init ---
window.addEventListener('resize', () => {
  resizeCanvas();
  if (!gameStarted) catY = height/2;
});
resizeCanvas();
resetGame();
update();