const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIG ---
const ASPECT_W = 3, ASPECT_H = 4; // Portrait aspect ratio
const BASE_W = 360, BASE_H = 480; // Reference for scaling

// Game variables (to be set in resizeCanvas)
let width, height, scale;

// Cat geometry (will be set in resizeCanvas)
let catX, catY, catRadiusX, catRadiusY, earHeight, earWidth, eyeRX, eyeRY, noseSize, mouthW, mouthH;
let catHitboxY, catHitboxRX, catHitboxRY;
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

  // Cat geometry: SMALLER, HORIZONTALLY OVAL head, all features proportional
  catX = Math.round(width * 0.22);
  catRadiusX = Math.round(19 * scale); // width of head (much smaller!)
  catRadiusY = Math.round(14 * scale); // height of head (flatter oval)
  earHeight = Math.round(12 * scale);  // small, up-pointing
  earWidth = Math.round(10 * scale);   // narrow base

  catY = height / 2;
  // Hitbox: just the oval head, no ears, and small as requested
  catHitboxY = catY;
  catHitboxRX = catRadiusX;
  catHitboxRY = catRadiusY;

  eyeRX = Math.round(catRadiusX * 0.5); // half the circle size, oval
  eyeRY = Math.round(catRadiusY * 0.55);

  noseSize = Math.round(4.5 * scale); // triangle side
  mouthW = Math.round(7 * scale);
  mouthH = Math.round(3 * scale);

  groundY = height - Math.round(25 * scale);
  ceilingY = Math.round(25 * scale);

  broomWidth = Math.round(38 * scale);

  // --- Brooms: much easier early, slow gradual progression ---
  broomBaseGap = Math.round(5 * catRadiusY); // VERY large gap early on
  broomMinGap = Math.round(2.2 * catRadiusY); // Still wide even at hardest
  broomGap = broomBaseGap;

  broomBaseSpeed = 1.5 * scale; // slow start
  broomSpeed = broomBaseSpeed;
  broomBaseInterval = Math.round(140 * scale); // fewer brooms early
  minBroomInterval = Math.round(80 * scale);
  broomInterval = broomBaseInterval;

  gravity = 0.45 * scale;
  jumpPower = -5 * scale;

  // If brooms already exist, adjust their positions proportionally
  if (brooms) {
    for (let broom of brooms) {
      broom.x = Math.round(broom.x * width / BASE_W);
    }
  }
}

// --- Cat face drawing with all adjustments ---
function drawCatFace(x, y) {
  // Ears: farther out, more up, less pink, more black border
  ctx.save();
  ctx.lineWidth = 1.7 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  // Left ear outer
  ctx.beginPath();
  ctx.moveTo(x - catRadiusX * 0.98, y - catRadiusY * 0.65);
  ctx.lineTo(x - catRadiusX * 1.12, y - catRadiusY * 0.65 - earHeight);
  ctx.lineTo(x - catRadiusX * 0.60, y - catRadiusY * 0.77);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Right ear outer
  ctx.beginPath();
  ctx.moveTo(x + catRadiusX * 0.98, y - catRadiusY * 0.65);
  ctx.lineTo(x + catRadiusX * 1.12, y - catRadiusY * 0.65 - earHeight);
  ctx.lineTo(x + catRadiusX * 0.60, y - catRadiusY * 0.77);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Ears (inner pink triangles, small pink, more border)
  ctx.fillStyle = "#f7c8b3";
  // Left inner
  ctx.beginPath();
  ctx.moveTo(x - catRadiusX * 0.96, y - catRadiusY * 0.67);
  ctx.lineTo(x - catRadiusX * 1.10, y - catRadiusY * 0.65 - earHeight + earHeight*0.42);
  ctx.lineTo(x - catRadiusX * 0.65, y - catRadiusY * 0.76);
  ctx.closePath();
  ctx.fill();
  // Right inner
  ctx.beginPath();
  ctx.moveTo(x + catRadiusX * 0.96, y - catRadiusY * 0.67);
  ctx.lineTo(x + catRadiusX * 1.10, y - catRadiusY * 0.65 - earHeight + earHeight*0.42);
  ctx.lineTo(x + catRadiusX * 0.65, y - catRadiusY * 0.76);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Head: horizontally oval, small
  ctx.save();
  ctx.lineWidth = 1.7 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(x, y, catRadiusX, catRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Eyes: smaller, oval, higher, black only
  ctx.save();
  ctx.fillStyle = "#111";
  // Left eye
  ctx.beginPath();
  ctx.ellipse(
    x - catRadiusX * 0.44, y - catRadiusY * 0.24, // higher up, oval
    eyeRX, eyeRY, 0, 0, Math.PI * 2
  );
  ctx.fill();
  // Right eye
  ctx.beginPath();
  ctx.ellipse(
    x + catRadiusX * 0.44, y - catRadiusY * 0.24,
    eyeRX, eyeRY, 0, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  // Nose: triangle, further down, with black border
  ctx.save();
  ctx.lineWidth = 0.9 * scale;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#f7c8b3";
  let noseY = y + catRadiusY * 0.01;
  ctx.beginPath();
  ctx.moveTo(x, noseY);
  ctx.lineTo(x - noseSize/2, noseY + noseSize * 0.75);
  ctx.lineTo(x + noseSize/2, noseY + noseSize * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Whiskers: very close together, at midline, starting at nose
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 0.9 * scale;
  let whiskerY = noseY + noseSize * 0.7;
  let whiskerGap = scale * 2; // very close together
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x - noseSize * 0.1, whiskerY + i*whiskerGap);
    ctx.lineTo(x - catRadiusX * 0.7, whiskerY + i*whiskerGap);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + noseSize * 0.1, whiskerY + i*whiskerGap);
    ctx.lineTo(x + catRadiusX * 0.7, whiskerY + i*whiskerGap);
    ctx.stroke();
  }
  ctx.restore();

  // Mouth: a little below whiskers
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.1 * scale;
  let mouthY = whiskerY + catRadiusY * 0.23;
  ctx.beginPath();
  ctx.moveTo(x - mouthW/2, mouthY);
  ctx.bezierCurveTo(
    x - mouthW/2 + mouthW*0.18, mouthY + mouthH*0.25,
    x - mouthW*0.1, mouthY + mouthH*0.45,
    x, mouthY + mouthH*0.11
  );
  ctx.bezierCurveTo(
    x + mouthW*0.1, mouthY + mouthH*0.45,
    x + mouthW/2 - mouthW*0.18, mouthY + mouthH*0.25,
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
  if (catY + catRadiusY > groundY) return true;
  return false;
}

// --- Drawing functions (score, UI, etc) ---
function drawScore() {
  ctx.fillStyle = "#333";
  ctx.font = `${Math.round(22 * scale)}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 14 * scale, 30 * scale);
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
  // Level 50 should still be easy: gap shrinks very slowly and only after level 50 does it start to approach min
  if (score <= 50) {
    broomGap = broomBaseGap;
    broomSpeed = broomBaseSpeed;
    broomInterval = broomBaseInterval;
  } else {
    // After level 50, very slow linear progression
    let prog = Math.min((score - 50) / 50, 1); // 0 to 1 as score goes from 50 to 100
    broomGap = broomBaseGap - (broomBaseGap - broomMinGap) * prog;
    broomSpeed = broomBaseSpeed + (2 * scale) * prog;
    broomInterval = broomBaseInterval - (broomBaseInterval - minBroomInterval) * prog;
  }
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
    ctx.font = `bold ${Math.round(18*scale)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", width / 2, height / 2 - 32 * scale);
    wrapText(
      "Press SPACE, ENTER, or TAP to restart",
      width / 2,
      height / 2 + 20 * scale,
      width - 60 * scale,
      18 * scale,
      3,
      `${Math.round(13*scale)}px Arial`,
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
      height / 2 + 60 * scale,
      width - 60 * scale,
      13 * scale,
      3,
      `${Math.round(11*scale)}px Arial`,
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